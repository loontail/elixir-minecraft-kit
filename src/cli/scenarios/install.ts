import path from "node:path";
import { Loaders } from "../../types/loader";
import type { MinecraftChannel, MinecraftVersionSummary } from "../../types/minecraft";
import { formatUserError } from "../error-format";
import {
  defaultIdFor,
  defaultIdFromSelection,
  previousFromDirectory,
  runInstallFromSelection,
  runStandaloneRuntimeInstallWithProgress,
  summaryRows,
} from "./install-helpers";
import {
  confirmInstall,
  pickChannel,
  pickDirectory,
  pickFabricLoader,
  pickForgeBuild,
  pickInstallType,
  pickMinecraftVersion,
  pickRuntime,
  pickRuntimeComponent,
  pickRuntimeInstallRoot,
} from "./pickers";
import type { InstallSelection, ScenarioContext, ScenarioOutcome } from "./types";

/** Unified install scenario: covers vanilla, Fabric, and Forge through a single wizard. */
export async function scenarioInstallMinecraft(ctx: ScenarioContext): Promise<ScenarioOutcome> {
  type Step =
    | "channel"
    | "version"
    | "runtime"
    | "install-type"
    | "fabric-loader"
    | "forge-build"
    | "directory"
    | "summary";
  const sel: InstallSelection = {
    channel: null,
    version: null,
    runtimeOverride: null,
    installType: null,
    fabricLoader: null,
    forgeBuild: null,
    forgeLabel: null,
    directory: null,
  };
  let step: Step = "channel";
  while (true) {
    if (step === "channel") {
      const r = await pickChannel(ctx.ui);
      if (r.kind !== "ok") return "cancelled";
      sel.channel = r.value;
      step = "version";
    } else if (step === "version") {
      const r = await pickMinecraftVersion(ctx, sel.channel as MinecraftChannel | "old" | "all");
      if (r.kind === "cancel") return "cancelled";
      if (r.kind === "back") {
        step = "channel";
        continue;
      }
      sel.version = r.value;
      step = "runtime";
    } else if (step === "runtime") {
      const r = await pickRuntime(ctx);
      if (r.kind === "cancel") return "cancelled";
      if (r.kind === "back") {
        step = "version";
        continue;
      }
      sel.runtimeOverride = r.value;
      step = "install-type";
    } else if (step === "install-type") {
      const r = await pickInstallType(ctx.ui);
      if (r.kind === "cancel") return "cancelled";
      if (r.kind === "back") {
        step = "runtime";
        continue;
      }
      sel.installType = r.value;
      if (r.value === Loaders.VANILLA) {
        step = "directory";
      } else if (r.value === Loaders.FABRIC) {
        step = "fabric-loader";
      } else {
        step = "forge-build";
      }
    } else if (step === "fabric-loader") {
      const r = await pickFabricLoader(ctx, (sel.version as MinecraftVersionSummary).id);
      if (r.kind === "cancel") return "cancelled";
      if (r.kind === "back") {
        step = "install-type";
        continue;
      }
      if (r.kind === "incompatible") {
        ctx.ui.log(
          "warn",
          `Fabric is not available for Minecraft ${(sel.version as MinecraftVersionSummary).id}. Pick another version or install type.`,
        );
        step = "install-type";
        continue;
      }
      sel.fabricLoader = r.value;
      step = "directory";
    } else if (step === "forge-build") {
      const r = await pickForgeBuild(ctx, (sel.version as MinecraftVersionSummary).id);
      if (r.kind === "cancel") return "cancelled";
      if (r.kind === "back") {
        step = "install-type";
        continue;
      }
      if (r.kind === "incompatible") {
        ctx.ui.log(
          "warn",
          `Forge is not available for Minecraft ${(sel.version as MinecraftVersionSummary).id}. Pick another version or install type.`,
        );
        step = "install-type";
        continue;
      }
      sel.forgeBuild = r.value;
      sel.forgeLabel = r.label;
      step = "directory";
    } else if (step === "directory") {
      const r = await pickDirectory(ctx, defaultIdFromSelection(sel));
      if (r.kind === "cancel") return "cancelled";
      if (r.kind === "back") {
        step = previousFromDirectory(sel);
        continue;
      }
      sel.directory = r.value;
      step = "summary";
    } else {
      const ok = await confirmInstall(ctx, summaryRows(sel));
      if (ok.kind === "cancel") return "cancelled";
      if (ok.kind === "back") {
        step = "directory";
        continue;
      }
      if (!ok.value) return "cancelled";
      const result = await runInstallFromSelection(ctx, sel);
      if (result === "ok") return "completed";
      step = result;
    }
  }
}

/**
 * Standalone: install a Mojang Java runtime directly, without going through a Minecraft
 * version. The user picks a runtime component, a destination directory, and an optional
 * shared install root — that's it.
 */
export async function scenarioInstallRuntime(ctx: ScenarioContext): Promise<ScenarioOutcome> {
  type Step = "component" | "directory" | "install-root" | "summary";
  let step: Step = "component";
  let component: string | null = null;
  let versionLabel: string | null = null;
  let directory: string | null = null;
  let installRoot: string | null = null;
  while (true) {
    if (step === "component") {
      const r = await pickRuntimeComponent(ctx);
      if (r.kind === "cancel") return "cancelled";
      if (r.kind === "back") return "cancelled";
      component = r.value.component;
      versionLabel = r.value.versionName;
      step = "directory";
    } else if (step === "directory") {
      const r = await pickDirectory(ctx, defaultIdFor("runtime", component ?? "java"));
      if (r.kind === "cancel") return "cancelled";
      if (r.kind === "back") {
        step = "component";
        continue;
      }
      directory = r.value;
      step = "install-root";
    } else if (step === "install-root") {
      const r = await pickRuntimeInstallRoot(ctx);
      if (r.kind === "cancel") return "cancelled";
      if (r.kind === "back") {
        step = "directory";
        continue;
      }
      installRoot = r.value;
      step = "summary";
    } else {
      const dir = directory as string;
      const comp = component as string;
      const ok = await confirmInstall(ctx, [
        ["Goal", "Install Mojang Java runtime"],
        ["Component", `${comp}${versionLabel ? ` (${versionLabel})` : ""}`],
        ["Directory", dir],
        ["Install root", installRoot ?? `${dir}/runtime (per-target)`],
      ]);
      if (ok.kind === "cancel") return "cancelled";
      if (ok.kind === "back") {
        step = "install-root";
        continue;
      }
      if (!ok.value) return "cancelled";
      try {
        const runtime = await ctx.kit.versions.runtime.resolve({
          system: ctx.kit.targets.system,
          component: comp,
        });
        const finalRuntime: typeof runtime =
          installRoot !== null ? { ...runtime, installRoot } : runtime;
        await runStandaloneRuntimeInstallWithProgress(ctx, {
          id: path.basename(dir),
          directory: dir,
          runtime: finalRuntime,
        });
        return "completed";
      } catch (error) {
        ctx.ui.log("error", formatUserError(error));
        step = "component";
      }
    }
  }
}
