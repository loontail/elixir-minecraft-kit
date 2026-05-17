import { describe, expect, it } from "vitest";
import { authenticateXbl, authenticateXsts } from "../../src/auth/xbox";
import { isErrorCode } from "../../src/core/errors";
import { FakeHttpClient } from "../helpers/fake-http";

const XBL_URL = "https://user.auth.xboxlive.com/user/authenticate";
const XSTS_URL = "https://xsts.auth.xboxlive.com/xsts/authorize";

describe("authenticateXbl", () => {
  it("returns the XBL token + user hash on success", async () => {
    const http = new FakeHttpClient().on(XBL_URL, {
      body: JSON.stringify({
        Token: "xbl-token",
        DisplayClaims: { xui: [{ uhs: "user-hash-1" }] },
      }),
    });
    const result = await authenticateXbl({ http, accessToken: "MSA-AT" });
    expect(result).toEqual({ token: "xbl-token", userHash: "user-hash-1" });
  });

  it("throws AUTH_XBOX_FAILED when the response is missing user hash", async () => {
    const http = new FakeHttpClient().on(XBL_URL, {
      body: JSON.stringify({ Token: "xbl-token" }),
    });
    try {
      await authenticateXbl({ http, accessToken: "MSA-AT" });
      expect.fail("expected throw");
    } catch (error) {
      expect(isErrorCode(error, "AUTH_XBOX_FAILED")).toBe(true);
    }
  });
});

describe("authenticateXsts", () => {
  it("returns the XSTS token + user hash on success", async () => {
    const http = new FakeHttpClient().on(XSTS_URL, {
      body: JSON.stringify({
        Token: "xsts-token",
        DisplayClaims: { xui: [{ uhs: "user-hash-2" }] },
      }),
    });
    const result = await authenticateXsts({ http, xblToken: "XBL-T" });
    expect(result).toEqual({ token: "xsts-token", userHash: "user-hash-2" });
  });

  it("explains XErr 2148916233 (no Xbox profile)", async () => {
    const http = new FakeHttpClient().on(XSTS_URL, {
      status: 401,
      body: JSON.stringify({ XErr: 2148916233 }),
    });
    try {
      await authenticateXsts({ http, xblToken: "XBL-T" });
      expect.fail("expected throw");
    } catch (error) {
      expect(isErrorCode(error, "AUTH_XSTS_FAILED")).toBe(true);
      const err = error as Error;
      expect(err.message).toMatch(/no Xbox profile/i);
    }
  });

  it("explains XErr 2148916238 (child account)", async () => {
    const http = new FakeHttpClient().on(XSTS_URL, {
      status: 401,
      body: JSON.stringify({ XErr: 2148916238 }),
    });
    try {
      await authenticateXsts({ http, xblToken: "XBL-T" });
      expect.fail("expected throw");
    } catch (error) {
      expect(isErrorCode(error, "AUTH_XSTS_FAILED")).toBe(true);
      expect((error as Error).message).toMatch(/child account/i);
    }
  });

  it("falls back to a generic message for non-401 failures", async () => {
    const http = new FakeHttpClient().on(XSTS_URL, {
      status: 503,
      body: "",
    });
    try {
      await authenticateXsts({ http, xblToken: "XBL-T" });
      expect.fail("expected throw");
    } catch (error) {
      expect(isErrorCode(error, "AUTH_XSTS_FAILED")).toBe(true);
      expect((error as Error).message).toMatch(/HTTP 503/);
    }
  });
});
