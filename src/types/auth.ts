/** Authentication modes accepted by the launch composer. */
export const AuthModes = {
  /** Offline-mode play with a chosen username and synthetic UUID. */
  OFFLINE: "offline",
  /** Pre-authenticated session — caller provides the access token and identity. */
  ONLINE: "online",
} as const;

/** Auth mode literal. */
export type AuthMode = (typeof AuthModes)[keyof typeof AuthModes];

/** Offline authentication. */
export interface OfflineAuth {
  readonly mode: typeof AuthModes.OFFLINE;
  readonly username: string;
  /** Optional explicit UUID. When omitted, a deterministic UUID is derived from the username. */
  readonly uuid?: string;
}

/** Online (token-based) authentication. */
export interface OnlineAuth {
  readonly mode: typeof AuthModes.ONLINE;
  readonly username: string;
  readonly uuid: string;
  readonly accessToken: string;
  readonly userType?: string;
  readonly clientId?: string;
  readonly xuid?: string;
}

/** Auth shape consumed by `kit.launch.compose`. */
export type LaunchAuth = OfflineAuth | OnlineAuth;

/**
 * Device-code prompt presented to the user. The caller renders these to the user, who then
 * visits {@link verificationUri} in a browser and enters {@link userCode}.
 */
export interface DeviceCodePrompt {
  /** Short alphanumeric code the user types on the verification page. */
  readonly userCode: string;
  /** URI the user opens to complete sign-in (typically `https://microsoft.com/link`). */
  readonly verificationUri: string;
  /** Human-readable instruction string suggested by Microsoft. */
  readonly message: string;
  /** Seconds before the device/user code pair becomes invalid. */
  readonly expiresIn: number;
  /** Recommended seconds between polling requests. */
  readonly interval: number;
}

/** Opaque state returned by `start()` and consumed by `poll()`. */
export interface DeviceCodeState {
  readonly deviceCode: string;
  readonly userCode: string;
  readonly verificationUri: string;
  readonly message: string;
  readonly expiresIn: number;
  readonly interval: number;
  readonly clientId: string;
  /** Wall-clock ms timestamp after which polling should stop. */
  readonly expiresAt: number;
}

/**
 * Combined Microsoft + Minecraft session returned by `kit.auth.login` and `kit.auth.refresh`.
 *
 * The fields under {@link minecraft} are everything {@link OnlineAuth} needs. The fields under
 * {@link microsoft} are needed only by the launcher to refresh the session later — persist them
 * to durable storage (encrypted) alongside the user's profile.
 */
export interface MojangSession {
  readonly minecraft: {
    /** Player display name. */
    readonly username: string;
    /** Player UUID, dashed (e.g. `f81d4fae-7dec-11d0-a765-00a0c91e6bf6`). */
    readonly uuid: string;
    /** Bearer token for `api.minecraftservices.com` and the game itself. */
    readonly accessToken: string;
    /** Wall-clock ms timestamp when {@link accessToken} expires. */
    readonly expiresAt: number;
    /** Xbox User ID (XUID) as a numeric string. */
    readonly xuid: string;
  };
  readonly microsoft: {
    /** Microsoft refresh token; used to obtain a fresh session without re-prompting. */
    readonly refreshToken: string;
    /** Azure AD application id used to mint the session. */
    readonly clientId: string;
  };
}
