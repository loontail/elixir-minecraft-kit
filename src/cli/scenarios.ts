/**
 * Public surface for CLI scenarios. Each entry point is implemented in `./scenarios/<file>.ts`;
 * this barrel keeps the import paths used by `main.ts` and the test suite stable.
 */
export type { ScenarioContext, ScenarioOutcome } from "./scenarios/types";
export { scenarioInstallMinecraft, scenarioInstallRuntime } from "./scenarios/install";
export { scenarioVerify, scenarioRepair } from "./scenarios/verify-repair";
export { scenarioLaunch } from "./scenarios/launch";
export { scenarioInspect } from "./scenarios/inspect";
