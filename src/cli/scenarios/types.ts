import type { MinecraftKit } from "../../kit";
import type { LaunchAuth, MojangSession } from "../../types/auth";
import type { Loaders } from "../../types/loader";
import {
  type MinecraftChannel,
  MinecraftChannels,
  type MinecraftVersionSummary,
} from "../../types/minecraft";
import type { SelectOption, Ui } from "../ui";

/**
 * Mutable holder for the active session, shared by every scenario. Populated once at CLI
 * startup (see {@link import("../main").runCli}) and updated by the "Sign in / out" menu.
 */
export type AuthState = {
  /** Auth value passed straight to `kit.launch.compose`. Null until startup picks one. */
  current: LaunchAuth | null;
  /** Full Microsoft/Mojang session when {@link current} is online. */
  microsoftSession: MojangSession | null;
};

/** Inputs every scenario receives. */
export type ScenarioContext = {
  readonly kit: MinecraftKit;
  readonly ui: Ui;
  readonly rootDir: string;
  readonly auth: AuthState;
};

/** Outcome of a scenario — whether the user cancelled or completed. */
export type ScenarioOutcome = "completed" | "cancelled";

/** Loader kind selectable during the install wizard. */
export type InstallType = typeof Loaders.VANILLA | typeof Loaders.FABRIC | typeof Loaders.FORGE;

/** Selection state collected by the install wizard. */
export type InstallSelection = {
  channel: MinecraftChannel | "old" | "all" | null;
  version: MinecraftVersionSummary | null;
  runtimeOverride: string | null;
  installType: InstallType | null;
  fabricLoader: string | null;
  forgeBuild: string | null;
  forgeLabel: string | null;
  directory: string | null;
};

/** Channel picker options. Defined once so tests and the picker share the source. */
export const CHANNEL_OPTIONS: readonly SelectOption<MinecraftChannel | "old" | "all">[] = [
  { label: "Release", value: MinecraftChannels.RELEASE, hint: "stable releases (recommended)" },
  { label: "Snapshot", value: MinecraftChannels.SNAPSHOT, hint: "weekly development builds" },
  { label: "Old versions", value: "old", hint: "old_beta + old_alpha" },
  { label: "All", value: "all", hint: "every channel combined" },
];
