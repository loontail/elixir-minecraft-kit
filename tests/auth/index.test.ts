import { describe, expect, it } from "vitest";
import { MojangAuthApi, toOnlineAuth } from "../../src/auth/index";
import { isErrorCode } from "../../src/core/errors";
import { AuthModes, type MojangSession } from "../../src/types/auth";
import { FakeHttpClient } from "../helpers/fake-http";

const DEVICE_CODE_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode";
const TOKEN_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const XBL_URL = "https://user.auth.xboxlive.com/user/authenticate";
const XSTS_URL = "https://xsts.auth.xboxlive.com/xsts/authorize";
const MC_LOGIN_URL = "https://api.minecraftservices.com/authentication/login_with_xbox";
const MC_PROFILE_URL = "https://api.minecraftservices.com/minecraft/profile";

// Build a JWT-ish access token whose middle segment decodes to JSON. The Minecraft auth
// flow plucks `xuid` out of this segment, so a realistic shape avoids "" xuid noise.
function buildAccessToken(payload: Record<string, unknown>): string {
  const b64 = (s: string): string =>
    Buffer.from(s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${b64("hdr")}.${b64(JSON.stringify(payload))}.${b64("sig")}`;
}

describe("MojangAuthApi.login", () => {
  it("runs the full 5-step flow end-to-end", async () => {
    const accessToken = buildAccessToken({ xuid: "xbox-uid-1" });
    const http = new FakeHttpClient()
      .on(DEVICE_CODE_URL, {
        body: JSON.stringify({
          device_code: "DEV",
          user_code: "CODE",
          verification_uri: "https://x",
          message: "m",
          expires_in: 900,
          interval: 0,
        }),
      })
      .on(TOKEN_URL, {
        body: JSON.stringify({
          token_type: "Bearer",
          scope: "X",
          expires_in: 3600,
          access_token: "MS-AT",
          refresh_token: "MS-RT",
        }),
      })
      .on(XBL_URL, {
        body: JSON.stringify({
          Token: "XBL-T",
          DisplayClaims: { xui: [{ uhs: "uhs-1" }] },
        }),
      })
      .on(XSTS_URL, {
        body: JSON.stringify({
          Token: "XSTS-T",
          DisplayClaims: { xui: [{ uhs: "uhs-1" }] },
        }),
      })
      .on(MC_LOGIN_URL, {
        body: JSON.stringify({ access_token: accessToken, expires_in: 86400 }),
      })
      .on(MC_PROFILE_URL, {
        body: JSON.stringify({
          id: "12345678123412341234123456789012",
          name: "Steve",
        }),
      });

    const api = new MojangAuthApi(http);
    let promptSeen = false;
    const session = await api.login({
      clientId: "client-1",
      onPrompt: (prompt) => {
        expect(prompt.userCode).toBe("CODE");
        promptSeen = true;
      },
    });
    expect(promptSeen).toBe(true);
    expect(session.minecraft.username).toBe("Steve");
    expect(session.minecraft.uuid).toBe("12345678-1234-1234-1234-123456789012");
    expect(session.minecraft.accessToken).toBe(accessToken);
    expect(session.minecraft.xuid).toBe("xbox-uid-1");
    expect(session.microsoft.refreshToken).toBe("MS-RT");
    expect(session.microsoft.clientId).toBe("client-1");
  });

  it("throws AUTH_MISSING_CLIENT_ID when neither option nor env is set", async () => {
    const http = new FakeHttpClient();
    const api = new MojangAuthApi(http);
    const previous = process.env.MINECRAFT_KIT_MSA_CLIENT_ID;
    process.env.MINECRAFT_KIT_MSA_CLIENT_ID = "";
    try {
      await api.login({ onPrompt: () => undefined });
      expect.fail("expected throw");
    } catch (error) {
      expect(isErrorCode(error, "AUTH_MISSING_CLIENT_ID")).toBe(true);
    } finally {
      if (previous !== undefined) {
        process.env.MINECRAFT_KIT_MSA_CLIENT_ID = previous;
      } else {
        process.env.MINECRAFT_KIT_MSA_CLIENT_ID = "";
      }
    }
  });
});

describe("MojangAuthApi.refresh", () => {
  it("uses the refresh token to fetch a fresh Minecraft session", async () => {
    const accessToken = buildAccessToken({ xuid: "xbox-uid-1" });
    const http = new FakeHttpClient()
      .on(TOKEN_URL, {
        body: JSON.stringify({
          token_type: "Bearer",
          scope: "X",
          expires_in: 3600,
          access_token: "MS-AT2",
          refresh_token: "MS-RT2",
        }),
      })
      .on(XBL_URL, {
        body: JSON.stringify({
          Token: "XBL-T",
          DisplayClaims: { xui: [{ uhs: "uhs-1" }] },
        }),
      })
      .on(XSTS_URL, {
        body: JSON.stringify({
          Token: "XSTS-T",
          DisplayClaims: { xui: [{ uhs: "uhs-1" }] },
        }),
      })
      .on(MC_LOGIN_URL, {
        body: JSON.stringify({ access_token: accessToken, expires_in: 86400 }),
      })
      .on(MC_PROFILE_URL, {
        body: JSON.stringify({
          id: "11111111111111111111111111111111",
          name: "Alex",
        }),
      });

    const api = new MojangAuthApi(http);
    const session = await api.refresh("RT-1", { clientId: "c" });
    expect(session.minecraft.username).toBe("Alex");
    expect(session.microsoft.refreshToken).toBe("MS-RT2");
  });
});

describe("toOnlineAuth", () => {
  it("projects a session into the launch-compose OnlineAuth shape", () => {
    const session: MojangSession = {
      minecraft: {
        username: "Steve",
        uuid: "uuid",
        accessToken: "at",
        expiresAt: 0,
        xuid: "xuid",
      },
      microsoft: { refreshToken: "rt", clientId: "c" },
    };
    const auth = toOnlineAuth(session);
    expect(auth.mode).toBe(AuthModes.ONLINE);
    expect(auth.userType).toBe("msa");
    expect(auth.username).toBe("Steve");
    expect(auth.clientId).toBe("c");
    expect(auth.xuid).toBe("xuid");
  });
});
