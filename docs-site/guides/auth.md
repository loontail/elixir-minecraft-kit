# Authentication

The kit ships a Microsoft OAuth 2.0 device-code flow that produces a Minecraft `accessToken`
ready to drop into `kit.launch.compose`. Token storage is the caller's job — the kit returns
session objects, never persists them.

::: tip Stateless by design
`kit.auth.login()` returns a `MojangSession` with the Minecraft profile *and* the
refresh token. Hand that to your launcher's storage layer; on next start, call
`kit.auth.refresh(refreshToken)` to mint a fresh access token.
:::

## Prerequisites

You need an Azure AD application id (Application/Client ID). Register one at
[https://portal.azure.com](https://portal.azure.com):

1. **Supported account types:** "Personal Microsoft accounts only" or "Accounts in any
   organisational directory and personal Microsoft accounts".
2. **Authentication → Allow public client flows:** Yes.
3. Apply for Minecraft API access at
   [https://aka.ms/mce-reviewappid](https://aka.ms/mce-reviewappid) — without this,
   `login_with_xbox` rejects the token with `AUTH_MINECRAFT_FAILED`.

Pass the client id either explicitly or via the `MINECRAFT_KIT_MSA_CLIENT_ID` env var. The
kit refuses to ship a default — pinning your launcher to a single client id is a security
posture decision.

## Full sign-in

```ts
import { MinecraftKit } from "@loontail/minecraft-kit";

const kit = new MinecraftKit();

const session = await kit.auth.login({
  clientId: process.env.MINECRAFT_KIT_MSA_CLIENT_ID,
  onPrompt: async (prompt) => {
    // prompt.verificationUri  → "https://microsoft.com/link"
    // prompt.userCode         → "ABCD-EFGH"
    // prompt.message          → Microsoft's human-readable instruction
    // prompt.expiresIn        → seconds before the code expires (~900)
    console.log(`Open ${prompt.verificationUri} and enter ${prompt.userCode}`);
  },
  onPoll: ({ nextDelayMs, expiresAt }) => {
    // Optional. Useful for a "still waiting…" UI.
  },
  signal: abortController.signal,
});

console.log(session.minecraft.username);    // "Steve"
console.log(session.minecraft.uuid);        // dashed UUID
console.log(session.minecraft.accessToken); // → kit.launch.compose
console.log(session.microsoft.refreshToken); // ← persist this
console.log(session.microsoft.clientId);     // ← persist this too
```

The promise resolves only after the user finishes signing in (or rejects on abort, decline,
or timeout — see [error codes](./errors)).

## Refresh

```ts
const refreshed = await kit.auth.refresh(savedRefreshToken, {
  clientId: savedClientId,
  signal: abortController.signal,
});
```

Microsoft may rotate the refresh token; check `refreshed.microsoft.refreshToken` against the
saved value and overwrite if changed.

## Lower-level: decoupled prompt + poll

`MojangAuthApi.deviceCode.start()` and `.poll()` let you decouple "render the prompt" from
"block on poll" — useful when the prompt UI is a dismissible modal in a GUI.

```ts
const { prompt, state } = await kit.auth.deviceCode.start({ clientId });
// render(prompt); kick off your modal; user copies the code, opens the browser
const session = await kit.auth.deviceCode.poll(state, {
  signal,
  onTick: ({ nextDelayMs }) => { /* heartbeat */ },
});
```

## Plugging into launch

```ts
import { AuthModes, toOnlineAuth } from "@loontail/minecraft-kit";

const composition = await kit.launch.compose(target, {
  auth: toOnlineAuth(session),
});
const minecraft = kit.launch.run(composition);
```

`toOnlineAuth(session)` projects the session into the `OnlineAuth` shape with
`mode: AuthModes.ONLINE`, the player's uuid + username, the Mojang access token, the
client id, and the XUID extracted from the JWT.

## Tracing

Pass a `Logger` to the kit constructor and the auth modules will emit `debug`-level
trace lines through `scopedLogger(logger, "auth")`. For a one-off CLI run without wiring
a logger:

```bash
MINECRAFT_KIT_AUTH_DEBUG=1 mckit
```

This routes auth trace to `consoleLogger` (stderr).

## Error taxonomy

See the [errors guide](./errors#authentication) for the full list. The common ones:

- `AUTH_MISSING_CLIENT_ID` — set the env var or pass `clientId`.
- `AUTH_DEVICE_CODE_FAILED` with `AADSTS7000218` in the message — flip "Allow public client
  flows" to Yes in Azure portal.
- `AUTH_MINECRAFT_FAILED` mentioning `aka.ms/mce-reviewappid` — apply for Minecraft API
  access for this Azure AD app.
- `AUTH_NO_GAME_OWNERSHIP` — the Microsoft account does not own Java Edition (or the wrong
  account is signed into the browser).
- `AUTH_XSTS_FAILED` with `xerr === 2148916233` — the account never used Xbox Live; sign in
  once at [https://www.xbox.com](https://www.xbox.com) and retry.
