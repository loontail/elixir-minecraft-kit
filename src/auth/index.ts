import { MinecraftKitError } from "../core/errors";
import { AuthModes, type DeviceCodePrompt, type DeviceCodeState } from "../types/auth";
import type { MojangSession, OnlineAuth } from "../types/auth";
import type { HttpClient } from "../types/http";
import {
  type MicrosoftToken,
  pollDeviceCode,
  refreshMicrosoftToken,
  startDeviceCode,
} from "./microsoft";
import { extractXuid, fetchMinecraftProfile, loginWithXbox } from "./minecraft";
import { authenticateXbl, authenticateXsts } from "./xbox";

/** Env var consulted when no explicit `clientId` is supplied. */
export const CLIENT_ID_ENV_VAR = "MINECRAFT_KIT_MSA_CLIENT_ID";

export { authDebug, DEBUG_ENV_VAR } from "./debug";

/** Options accepted by {@link MojangAuthApi.login}. */
export interface LoginOptions {
  /**
   * Azure AD application id. When omitted, the value of
   * `process.env.MINECRAFT_KIT_MSA_CLIENT_ID` is used. Throws `AUTH_MISSING_CLIENT_ID` if
   * neither is set — the library cannot ship a default client id.
   */
  readonly clientId?: string;
  /**
   * Called once with the URL + user code the user must enter in a browser. The promise
   * returned by `login` resolves only after the user finishes signing in (or rejects on
   * abort / decline / timeout).
   */
  readonly onPrompt: (prompt: DeviceCodePrompt) => void | Promise<void>;
  /** Called once per polling tick — useful for UI "still waiting" feedback. */
  readonly onPoll?: (info: { readonly nextDelayMs: number; readonly expiresAt: number }) => void;
  readonly signal?: AbortSignal;
}

/** Options accepted by {@link MojangAuthApi.refresh}. */
export interface RefreshOptions {
  /** As in {@link LoginOptions.clientId}. */
  readonly clientId?: string;
  readonly signal?: AbortSignal;
}

/** Options accepted by {@link MojangAuthApi.deviceCode.start}. */
export interface StartDeviceCodeOptions {
  readonly clientId?: string;
  readonly signal?: AbortSignal;
}

/** Options accepted by {@link MojangAuthApi.deviceCode.poll}. */
export interface PollDeviceCodeOptions {
  readonly signal?: AbortSignal;
  readonly onTick?: (info: { readonly nextDelayMs: number; readonly expiresAt: number }) => void;
}

/**
 * High-level Microsoft / Mojang auth surface attached to {@link import("../kit").MinecraftKit}
 * as `kit.auth`. Implements the standard 5-step flow:
 *
 * 1. Microsoft OAuth2 device-code grant against the `consumers` tenant.
 * 2. Xbox Live RPS exchange.
 * 3. XSTS token bound to `rp://api.minecraftservices.com/`.
 * 4. `login_with_xbox` to get a Minecraft bearer token.
 * 5. `minecraft/profile` to resolve the player UUID + display name.
 *
 * Returns a {@link MojangSession} carrying everything launch composition needs plus the
 * Microsoft refresh token. The library does NOT persist tokens — that's the launcher's job.
 */
export class MojangAuthApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Run the full device-code flow end-to-end. The caller supplies an `onPrompt` callback to
   * render the URL + code to the user; this method polls until they finish.
   */
  async login(options: LoginOptions): Promise<MojangSession> {
    const clientId = resolveClientId(options.clientId);
    const { prompt, state } = await startDeviceCode({
      http: this.http,
      clientId,
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
    });
    await options.onPrompt(prompt);
    const pollOpts: Parameters<typeof pollDeviceCode>[0] = { http: this.http, state };
    if (options.signal !== undefined) {
      (pollOpts as { signal?: AbortSignal }).signal = options.signal;
    }
    if (options.onPoll !== undefined) {
      (pollOpts as { onTick?: typeof options.onPoll }).onTick = options.onPoll;
    }
    const msToken = await pollDeviceCode(pollOpts);
    return this.completeMicrosoftToken(msToken, clientId, options.signal);
  }

  /** Refresh a previously obtained session. The Microsoft refresh token may be rotated. */
  async refresh(refreshToken: string, options: RefreshOptions = {}): Promise<MojangSession> {
    const clientId = resolveClientId(options.clientId);
    const refreshArgs: Parameters<typeof refreshMicrosoftToken>[0] = {
      http: this.http,
      refreshToken,
      clientId,
    };
    if (options.signal !== undefined) {
      (refreshArgs as { signal?: AbortSignal }).signal = options.signal;
    }
    const msToken = await refreshMicrosoftToken(refreshArgs);
    return this.completeMicrosoftToken(msToken, clientId, options.signal);
  }

  /**
   * Lower-level device-code surface — exposed so callers can decouple "show prompt" from
   * "block on poll" (e.g. a GUI that lets the user dismiss the modal). Most callers should
   * use {@link login} instead.
   */
  readonly deviceCode = {
    start: (
      options: StartDeviceCodeOptions = {},
    ): Promise<{
      readonly prompt: DeviceCodePrompt;
      readonly state: DeviceCodeState;
    }> => {
      const clientId = resolveClientId(options.clientId);
      return startDeviceCode({
        http: this.http,
        clientId,
        ...(options.signal !== undefined ? { signal: options.signal } : {}),
      });
    },
    poll: async (
      state: DeviceCodeState,
      options: PollDeviceCodeOptions = {},
    ): Promise<MojangSession> => {
      const pollOpts: Parameters<typeof pollDeviceCode>[0] = { http: this.http, state };
      if (options.signal !== undefined) {
        (pollOpts as { signal?: AbortSignal }).signal = options.signal;
      }
      if (options.onTick !== undefined) {
        (pollOpts as { onTick?: typeof options.onTick }).onTick = options.onTick;
      }
      const msToken = await pollDeviceCode(pollOpts);
      return this.completeMicrosoftToken(msToken, state.clientId, options.signal);
    },
  };

  /** Steps 2 → 5: given a Microsoft access token, finish the flow. */
  private async completeMicrosoftToken(
    msToken: MicrosoftToken,
    clientId: string,
    signal: AbortSignal | undefined,
  ): Promise<MojangSession> {
    const xblArgs: Parameters<typeof authenticateXbl>[0] = {
      http: this.http,
      accessToken: msToken.accessToken,
    };
    if (signal !== undefined) (xblArgs as { signal?: AbortSignal }).signal = signal;
    const xbl = await authenticateXbl(xblArgs);

    const xstsArgs: Parameters<typeof authenticateXsts>[0] = {
      http: this.http,
      xblToken: xbl.token,
    };
    if (signal !== undefined) (xstsArgs as { signal?: AbortSignal }).signal = signal;
    const xsts = await authenticateXsts(xstsArgs);

    const loginArgs: Parameters<typeof loginWithXbox>[0] = {
      http: this.http,
      xstsToken: xsts.token,
      userHash: xsts.userHash,
    };
    if (signal !== undefined) (loginArgs as { signal?: AbortSignal }).signal = signal;
    const mc = await loginWithXbox(loginArgs);

    const profileArgs: Parameters<typeof fetchMinecraftProfile>[0] = {
      http: this.http,
      accessToken: mc.accessToken,
    };
    if (signal !== undefined) (profileArgs as { signal?: AbortSignal }).signal = signal;
    const profile = await fetchMinecraftProfile(profileArgs);

    return {
      minecraft: {
        username: profile.username,
        uuid: profile.uuid,
        accessToken: mc.accessToken,
        expiresAt: Date.now() + mc.expiresIn * 1000,
        xuid: extractXuid(mc.accessToken),
      },
      microsoft: {
        refreshToken: msToken.refreshToken,
        clientId,
      },
    };
  }
}

/**
 * Project a {@link MojangSession} into the {@link OnlineAuth} shape that `kit.launch.compose`
 * accepts.
 */
export function toOnlineAuth(session: MojangSession): OnlineAuth {
  return {
    mode: AuthModes.ONLINE,
    username: session.minecraft.username,
    uuid: session.minecraft.uuid,
    accessToken: session.minecraft.accessToken,
    userType: "msa",
    clientId: session.microsoft.clientId,
    xuid: session.minecraft.xuid,
  };
}

function resolveClientId(explicit: string | undefined): string {
  if (typeof explicit === "string" && explicit.trim().length > 0) return explicit.trim();
  const fromEnv = process.env[CLIENT_ID_ENV_VAR];
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) return fromEnv.trim();
  throw new MinecraftKitError(
    "AUTH_MISSING_CLIENT_ID",
    `No Azure AD client id supplied. Pass \`clientId\` explicitly or set ${CLIENT_ID_ENV_VAR}. Register an Azure AD application in the 'Personal Microsoft accounts' audience with XboxLive.signin + offline_access scopes to obtain one.`,
  );
}
