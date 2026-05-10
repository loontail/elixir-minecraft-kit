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
