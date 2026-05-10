import process from "node:process";
import { MinecraftKit } from "../kit";
import { formatUserError } from "./error-format";
import {
  type ScenarioContext,
  type ScenarioOutcome,
  scenarioInspect,
  scenarioInstallMinecraft,
  scenarioInstallRuntime,
  scenarioLaunch,
  scenarioRepair,
  scenarioVerify,
} from "./scenarios";
import { type Ui, createClackUi } from "./ui";

const SCENARIO_KEYS = {
  INSTALL_MC: "install-minecraft",
  INSTALL_RUNTIME: "install-runtime",
  VERIFY: "verify",
  REPAIR: "repair",
  LAUNCH: "launch",
  INSPECT: "inspect",
  EXIT: "exit",
} as const;

/** Inputs to {@link runCli}. */
export interface RunCliInput {
  readonly args: readonly string[];
  readonly ui: Ui;
  readonly rootDir: string;
  readonly kit?: MinecraftKit;
}

/** Programmatic CLI entrypoint, used by both the bin and the tests. */
export async function runCli(input: RunCliInput): Promise<number> {
  if (input.args.includes("--help") || input.args.includes("-h")) {
    input.ui.note(
      "emk — elixir-minecraft-kit CLI",
      "Run with no arguments for the interactive menu.\n--version, --help, --debug",
    );
    return 0;
  }
  if (input.args.includes("--version") || input.args.includes("-v")) {
    input.ui.log("info", "0.1.0");
    return 0;
  }
  const debug = input.args.includes("--debug");
  const kit = input.kit ?? new MinecraftKit();
  const ctx: ScenarioContext = { kit, ui: input.ui, rootDir: input.rootDir };
  input.ui.intro("emk — Minecraft launcher kit");
  while (true) {
    const choice = await input.ui.select<string>({
      message: "What would you like to do?",
      options: MAIN_MENU,
    });
    if (choice.kind !== "ok" || choice.value === SCENARIO_KEYS.EXIT) {
      input.ui.outro("Goodbye.");
      return 0;
    }
    try {
      const outcome = await dispatch(choice.value, ctx);
      if (outcome === "cancelled") {
        input.ui.log("info", "Operation cancelled.");
      }
    } catch (error) {
      if (debug) {
        input.ui.log("error", `${error instanceof Error ? error.stack : String(error)}`);
      } else {
        input.ui.log("error", formatUserError(error));
      }
    }
  }
}

/** Main-menu options exported so tests can assert their composition. */
export const MAIN_MENU: ReadonlyArray<{ label: string; value: string; hint?: string }> = [
  { label: "Install Minecraft", value: SCENARIO_KEYS.INSTALL_MC, hint: "Vanilla / Fabric / Forge" },
  { label: "Install Java/runtime", value: SCENARIO_KEYS.INSTALL_RUNTIME },
  { label: "Verify installation", value: SCENARIO_KEYS.VERIFY },
  { label: "Repair installation", value: SCENARIO_KEYS.REPAIR },
  { label: "Launch Minecraft", value: SCENARIO_KEYS.LAUNCH },
  { label: "Inspect installation", value: SCENARIO_KEYS.INSPECT },
  { label: "Exit", value: SCENARIO_KEYS.EXIT },
];

async function dispatch(choice: string, ctx: ScenarioContext): Promise<ScenarioOutcome> {
  switch (choice) {
    case SCENARIO_KEYS.INSTALL_MC:
      return scenarioInstallMinecraft(ctx);
    case SCENARIO_KEYS.INSTALL_RUNTIME:
      return scenarioInstallRuntime(ctx);
    case SCENARIO_KEYS.VERIFY:
      return scenarioVerify(ctx);
    case SCENARIO_KEYS.REPAIR:
      return scenarioRepair(ctx);
    case SCENARIO_KEYS.LAUNCH:
      return scenarioLaunch(ctx);
    case SCENARIO_KEYS.INSPECT:
      return scenarioInspect(ctx);
    default:
      ctx.ui.log("warn", `Unknown action: ${choice}`);
      return "cancelled";
  }
}

/** Bin entrypoint. */
export async function bin(): Promise<void> {
  const ui = await createClackUi();
  const code = await runCli({
    args: process.argv.slice(2),
    ui,
    rootDir: process.cwd(),
  });
  process.exit(code);
}
