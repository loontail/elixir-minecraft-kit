import path from "node:path";
import { Loaders, VersionPreference } from "../../types/loader";
import {
  type MinecraftChannel,
  MinecraftChannels,
  type MinecraftVersionSummary,
} from "../../types/minecraft";
import type { DiscoveredTarget, Target } from "../../types/target";
import { formatUserError } from "../error-format";
import type { SelectOption, Ui, WizardOutcome } from "../ui";
import { CHANNEL_OPTIONS, type InstallType, type ScenarioContext } from "./types";

export async function pickChannel(
  ui: Ui,
): Promise<WizardOutcome<MinecraftChannel | "old" | "all">> {
  return ui.select({
    message: "Select Minecraft channel",
    options: CHANNEL_OPTIONS,
    allowCancel: true,
  });
}

export async function pickMinecraftVersion(
  ctx: ScenarioContext,
  channel: MinecraftChannel | "old" | "all",
): Promise<WizardOutcome<MinecraftVersionSummary>> {
  const spinner = ctx.ui.spinner();
  spinner.start("Loading Minecraft versions…");
  let versions: readonly MinecraftVersionSummary[];
  try {
    versions = await ctx.kit.versions.minecraft.list();
    spinner.stop(`${versions.length} versions loaded.`);
  } catch (error) {
    spinner.stop("Failed to load versions.");
    ctx.ui.log("error", formatUserError(error));
    return { kind: "back" };
  }
  const filtered = filterVersionsByChannel(versions, channel);
  if (filtered.length === 0) {
    ctx.ui.log("warn", "No versions in that channel.");
    return { kind: "back" };
  }
  const seen = new Set<string>();
  const unique: MinecraftVersionSummary[] = [];
  for (const v of filtered) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    unique.push(v);
  }
  const sorted = [...unique].sort((a, b) =>
    (b.releaseTime ?? "").localeCompare(a.releaseTime ?? ""),
  );
  const options: SelectOption<MinecraftVersionSummary>[] = sorted.map((v) => ({
    label: v.id,
    value: v,
    hint: `${v.type} · ${(v.releaseTime ?? "").slice(0, 10)}`,
  }));
  return ctx.ui.searchableSelect({
    message: "Select Minecraft version",
    options,
    allowBack: true,
    allowCancel: true,
  });
}

export async function pickRuntime(ctx: ScenarioContext): Promise<WizardOutcome<string | null>> {
  const initial = await ctx.ui.select<"auto" | "specific">({
    message: "Select Java/runtime",
    options: [
      {
        label: "Use recommended",
        value: "auto",
        hint: "use the runtime declared by the version manifest",
      },
      {
        label: "Pick specific component…",
        value: "specific",
        hint: "choose from Mojang's published runtimes",
      },
    ],
    allowBack: true,
    allowCancel: true,
  });
  if (initial.kind !== "ok") return initial;
  if (initial.value === "auto") return { kind: "ok", value: null };

  const spinner = ctx.ui.spinner();
  spinner.start("Loading runtime components…");
  try {
    const list = await ctx.kit.versions.runtime.list({
      system: ctx.kit.targets.system,
    });
    spinner.stop(
      `${list.length} runtime entr${list.length === 1 ? "y" : "ies"} for your platform.`,
    );
    if (list.length === 0) {
      ctx.ui.log("warn", "No published runtimes for this platform — falling back to auto-detect.");
      return { kind: "ok", value: null };
    }
    const seen = new Set<string>();
    const components: { component: string; versionName: string }[] = [];
    for (const entry of list) {
      if (seen.has(entry.component)) continue;
      seen.add(entry.component);
      components.push({
        component: entry.component,
        versionName: entry.versionName,
      });
    }
    const choice = await ctx.ui.select<string>({
      message: "Select runtime component",
      options: components.map((c) => ({
        label: c.component,
        value: c.component,
        hint: c.versionName,
      })),
      allowBack: true,
      allowCancel: true,
    });
    if (choice.kind !== "ok") return choice;
    return { kind: "ok", value: choice.value };
  } catch (error) {
    spinner.stop("Failed to load runtimes.");
    ctx.ui.log("warn", `${formatUserError(error)} Falling back to auto-detect.`);
    return { kind: "ok", value: null };
  }
}

export async function pickInstallType(ui: Ui): Promise<WizardOutcome<InstallType>> {
  return ui.select<InstallType>({
    message: "Select installation type",
    options: [
      { label: "Vanilla", value: Loaders.VANILLA, hint: "no mod loader" },
      {
        label: "Fabric",
        value: Loaders.FABRIC,
        hint: "lightweight modern loader",
      },
      { label: "Forge", value: Loaders.FORGE, hint: "modern Forge (1.13+)" },
    ],
    allowBack: true,
    allowCancel: true,
  });
}

export type FabricLoaderOutcome = WizardOutcome<string> | { readonly kind: "incompatible" };

export async function pickFabricLoader(
  ctx: ScenarioContext,
  minecraftVersion: string,
): Promise<FabricLoaderOutcome> {
  const spinner = ctx.ui.spinner();
  spinner.start(`Loading Fabric loaders for ${minecraftVersion}…`);
  try {
    const loaders = await ctx.kit.versions.fabric.list({ minecraftVersion });
    spinner.stop(`${loaders.length} Fabric loader(s).`);
    if (loaders.length === 0) {
      return { kind: "incompatible" };
    }
    const options: SelectOption<string>[] = loaders.map((loader) => ({
      label: loader.version,
      value: loader.version,
      hint: loader.stable ? "stable" : "unstable",
    }));
    return await ctx.ui.searchableSelect({
      message: "Select Fabric loader",
      options,
      allowBack: true,
      allowCancel: true,
    });
  } catch (error) {
    spinner.stop("Failed to load Fabric loaders.");
    // Conflate network failure with "loader not available" — both block the wizard from
    // moving forward, and the warning surfaces the underlying error message either way.
    ctx.ui.log("warn", formatUserError(error));
    return { kind: "incompatible" };
  }
}

export type ForgeBuildOutcome =
  | { readonly kind: "ok"; readonly value: string; readonly label: string }
  | { readonly kind: "back" }
  | { readonly kind: "cancel" }
  | { readonly kind: "incompatible" };

export async function pickForgeBuild(
  ctx: ScenarioContext,
  minecraftVersion: string,
): Promise<ForgeBuildOutcome> {
  const spinner = ctx.ui.spinner();
  spinner.start(`Loading Forge builds for ${minecraftVersion}…`);
  try {
    const builds = await ctx.kit.versions.forge.list({ minecraftVersion });
    spinner.stop(`${builds.length} Forge build(s).`);
    if (builds.length === 0) {
      return { kind: "incompatible" };
    }
    const recommended = builds.find((b) => b.isRecommended);
    const latest = builds.find((b) => b.isLatest);
    const options: SelectOption<string>[] = [];
    if (recommended) {
      options.push({
        label: `Recommended (${recommended.forgeVersion})`,
        value: recommended.forgeVersion,
        hint: "promoted -recommended",
      });
    }
    if (latest && latest.forgeVersion !== recommended?.forgeVersion) {
      options.push({
        label: `Latest (${latest.forgeVersion})`,
        value: latest.forgeVersion,
        hint: "promoted -latest",
      });
    }
    for (const build of builds) {
      if (build.isRecommended || build.isLatest) continue;
      options.push({
        label: build.forgeVersion,
        value: build.forgeVersion,
        hint: build.fullVersion,
      });
    }
    const result = await ctx.ui.searchableSelect({
      message: "Select Forge build",
      options,
      allowBack: true,
      allowCancel: true,
    });
    if (result.kind !== "ok") return result;
    const matched = options.find((o) => o.value === result.value);
    return {
      kind: "ok",
      value: result.value,
      label: matched?.label ?? result.value,
    };
  } catch (error) {
    spinner.stop("Failed to load Forge builds.");
    ctx.ui.log("warn", formatUserError(error));
    return { kind: "incompatible" };
  }
}

export async function pickDirectory(
  ctx: ScenarioContext,
  suggestedId: string,
): Promise<WizardOutcome<string>> {
  const defaultPath = path.join(ctx.rootDir, suggestedId);
  const choice = await ctx.ui.select<"default" | "custom">({
    message: "Where should the installation live?",
    options: [
      { label: `Default: ${defaultPath}`, value: "default" },
      { label: "Custom path…", value: "custom" },
    ],
    allowBack: true,
    allowCancel: true,
  });
  if (choice.kind !== "ok") return choice;
  if (choice.value === "default") return { kind: "ok", value: defaultPath };
  const text = await ctx.ui.text({
    message: "Custom installation directory",
    placeholder: defaultPath,
    initial: defaultPath,
    validate: (s) => (s.trim().length === 0 ? "Path must be non-empty" : undefined),
    allowBack: true,
  });
  if (text.kind !== "ok") return text;
  return { kind: "ok", value: (text.value ?? "").trim() };
}

export async function confirmInstall(
  ctx: ScenarioContext,
  rows: readonly (readonly [string, string])[],
): Promise<WizardOutcome<boolean>> {
  ctx.ui.note("Summary", rows.map(([k, v]) => `${k.padEnd(11)} ${v}`).join("\n"));
  return ctx.ui.confirm({
    message: "Proceed with install?",
    initial: true,
    allowBack: true,
  });
}

export async function pickRuntimeComponent(
  ctx: ScenarioContext,
): Promise<WizardOutcome<{ readonly component: string; readonly versionName: string }>> {
  const spinner = ctx.ui.spinner();
  spinner.start("Loading runtime components…");
  let entries: Awaited<ReturnType<typeof ctx.kit.versions.runtime.list>>;
  try {
    entries = await ctx.kit.versions.runtime.list({
      system: ctx.kit.targets.system,
    });
    spinner.stop(
      `${entries.length} runtime entr${entries.length === 1 ? "y" : "ies"} for your platform.`,
    );
  } catch (error) {
    spinner.stop("Failed to load runtimes.");
    ctx.ui.log("error", formatUserError(error));
    return { kind: "cancel" };
  }
  if (entries.length === 0) {
    ctx.ui.log("warn", "No published runtimes for this platform.");
    return { kind: "cancel" };
  }
  // Mojang sometimes ships several entries per component (release history). Keep the first
  // (usually newest) per component for the picker.
  const seen = new Set<string>();
  const componentChoices: { component: string; versionName: string }[] = [];
  for (const entry of entries) {
    if (seen.has(entry.component)) continue;
    seen.add(entry.component);
    componentChoices.push({
      component: entry.component,
      versionName: entry.versionName,
    });
  }
  const choice = await ctx.ui.select<string>({
    message: "Select Java runtime component",
    options: componentChoices.map((c) => ({
      label: c.component,
      value: c.component,
      hint: c.versionName,
    })),
    allowBack: true,
    allowCancel: true,
  });
  if (choice.kind !== "ok") return choice;
  const picked = componentChoices.find((c) => c.component === choice.value);
  if (!picked) return { kind: "cancel" };
  return { kind: "ok", value: picked };
}

export async function pickRuntimeInstallRoot(
  ctx: ScenarioContext,
): Promise<WizardOutcome<string | null>> {
  const choice = await ctx.ui.select<"per-target" | "custom">({
    message: "Where should the runtime files live?",
    options: [
      {
        label: "Per-target (default)",
        value: "per-target",
        hint: "<directory>/runtime/<component>",
      },
      {
        label: "Custom shared install root…",
        value: "custom",
        hint: "absolute path containing component directories",
      },
    ],
    allowBack: true,
    allowCancel: true,
  });
  if (choice.kind !== "ok") return choice;
  if (choice.value === "per-target") return { kind: "ok", value: null };
  const text = await ctx.ui.text({
    message: "Custom runtime install root (absolute path)",
    placeholder: "C:\\shared\\jre",
    validate: (s) => (s.trim().length === 0 ? "Path must be non-empty" : undefined),
    allowBack: true,
  });
  if (text.kind !== "ok") return text;
  const trimmed = (text.value ?? "").trim();
  if (trimmed.length === 0) return { kind: "ok", value: null };
  return { kind: "ok", value: trimmed };
}

export async function pickInstalledTarget(ctx: ScenarioContext): Promise<Target | null> {
  let list: readonly DiscoveredTarget[];
  try {
    list = await ctx.kit.targets.list({ rootDir: ctx.rootDir });
  } catch (error) {
    ctx.ui.log("error", formatUserError(error));
    return null;
  }
  if (list.length === 0) {
    ctx.ui.log("warn", `No installations under ${ctx.rootDir}. Install one first.`);
    return null;
  }
  const choice = await ctx.ui.select<string>({
    message: "Pick an installation",
    options: list.map((entry) => ({
      label: entry.id,
      value: entry.id,
      hint: entry.minecraftVersions.join(", ") || "no versions",
    })),
    allowCancel: true,
  });
  if (choice.kind !== "ok") return null;
  const entry = list.find((e) => e.id === choice.value);
  if (!entry) return null;
  const mcVersion = await pickMinecraftVersionFromEntry(ctx, entry);
  if (!mcVersion) return null;
  const loaderHint = entry.loaders.find(
    (l) => !l.minecraftVersion || l.minecraftVersion === mcVersion,
  );
  try {
    return await ctx.kit.targets.resolve({
      id: entry.id,
      directory: entry.directory,
      minecraft: { version: mcVersion },
      loader: loaderHintToInput(loaderHint),
    });
  } catch (error) {
    ctx.ui.log("error", formatUserError(error));
    return null;
  }
}

export async function pickMinecraftVersionFromEntry(
  ctx: ScenarioContext,
  entry: DiscoveredTarget,
): Promise<string | null> {
  if (entry.minecraftVersions.length === 0) {
    ctx.ui.log("warn", "Installation has no Minecraft versions on disk.");
    return null;
  }
  if (entry.minecraftVersions.length === 1) {
    return entry.minecraftVersions[0] ?? null;
  }
  const choice = await ctx.ui.select<string>({
    message: "Multiple Minecraft versions on disk — pick one",
    options: entry.minecraftVersions.map((v) => ({ label: v, value: v })),
    allowCancel: true,
  });
  if (choice.kind !== "ok") return null;
  return choice.value;
}

function loaderHintToInput(hint: DiscoveredTarget["loaders"][number] | undefined): {
  readonly type: typeof Loaders.VANILLA | typeof Loaders.FABRIC | typeof Loaders.FORGE;
  readonly version?: string;
  readonly preference?: typeof VersionPreference.LATEST | typeof VersionPreference.RECOMMENDED;
} {
  if (!hint) return { type: Loaders.VANILLA };
  if (hint.type === Loaders.FABRIC) {
    return hint.version
      ? { type: Loaders.FABRIC, version: hint.version }
      : { type: Loaders.FABRIC, preference: VersionPreference.LATEST };
  }
  if (hint.type === Loaders.FORGE) {
    return hint.version
      ? { type: Loaders.FORGE, version: hint.version }
      : { type: Loaders.FORGE, preference: VersionPreference.RECOMMENDED };
  }
  return { type: Loaders.VANILLA };
}

function filterVersionsByChannel(
  versions: readonly MinecraftVersionSummary[],
  channel: MinecraftChannel | "old" | "all",
): readonly MinecraftVersionSummary[] {
  if (channel === "all") return versions;
  if (channel === "old") {
    return versions.filter(
      (v) => v.type === MinecraftChannels.OLD_BETA || v.type === MinecraftChannels.OLD_ALPHA,
    );
  }
  return versions.filter((v) => v.type === channel);
}
