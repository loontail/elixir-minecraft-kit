import { MAX_PROCESSOR_STDERR_LINES } from "../constants/defaults";
import { readJarMainClass } from "../core/archive";
import { MinecraftKitError } from "../core/errors";
import { sha1OfFile } from "../core/hash";
import type { ProgressListener } from "../types/events";
import type { RunForgeProcessorAction } from "../types/install";
import type { Spawner } from "../types/spawner";

/** Inputs to {@link runProcessor}. */
export interface RunProcessorInput {
  readonly action: RunForgeProcessorAction;
  readonly javaPath: string;
  readonly spawner: Spawner;
  readonly onEvent?: ProgressListener;
  readonly total: number;
}

/** Execute a single Forge processor and verify its declared outputs. */
export const runProcessor = async (input: RunProcessorInput): Promise<void> => {
  const startedAt = Date.now();
  const mainClass = await resolveProcessorMainClass(input.action);
  emit(input, { type: "forge:processor-started", index: input.action.index, mainClass });

  const exit = await spawnProcessor(input, mainClass);
  if (exit.code !== 0) {
    throw new MinecraftKitError(
      "FORGE_PROCESSOR_FAILED",
      `Forge processor exited with code ${exit.code ?? "(signal)"}: ${mainClass}`,
      {
        context: {
          mainClass,
          stderr: exit.stderr,
          ...(exit.code !== null ? { exitCode: exit.code } : {}),
        },
      },
    );
  }
  input.onEvent?.({
    type: "forge:processor-completed",
    processor: { index: input.action.index, mainClass },
    exitCode: exit.code ?? 0,
    durationMs: Date.now() - startedAt,
  });

  await verifyProcessorOutputs(input, mainClass);
};

const resolveProcessorMainClass = async (action: RunForgeProcessorAction): Promise<string> => {
  // Resolve Main-Class from the processor JAR (always classpath[0]) now that all
  // libraries have been downloaded. Deferring this from planning to runtime is what
  // lets newer Forge versions work, since their processor JARs ship as regular Maven
  // libraries instead of being bundled inside the installer.
  const processorJar = action.classpath[0];
  if (processorJar === undefined) {
    throw new MinecraftKitError(
      "FORGE_INSTALLER_INVALID",
      "Forge processor has an empty classpath",
      { context: { processorIndex: action.index } },
    );
  }
  const mainClass = await readJarMainClass(processorJar);
  if (!mainClass) {
    throw new MinecraftKitError(
      "FORGE_INSTALLER_INVALID",
      `Forge processor jar has no Main-Class: ${processorJar}`,
      { context: { filePath: processorJar } },
    );
  }
  return mainClass;
};

interface ProcessorExit {
  readonly code: number | null;
  readonly stderr: string;
}

const spawnProcessor = async (
  input: RunProcessorInput,
  mainClass: string,
): Promise<ProcessorExit> => {
  const classpathSeparator = process.platform === "win32" ? ";" : ":";
  const args = [
    "-cp",
    input.action.classpath.join(classpathSeparator),
    mainClass,
    ...input.action.args,
  ];
  const stderrTail: string[] = [];
  const child = input.spawner.spawn(input.javaPath, args, { cwd: process.cwd() });
  child.stdout.on("data", () => {
    // Forge processors print noisy progress to stdout; we don't surface it.
  });
  child.stderr.on("data", (line) => {
    if (stderrTail.length >= MAX_PROCESSOR_STDERR_LINES) stderrTail.shift();
    stderrTail.push(line);
  });
  const exit = await child.exited;
  return { code: exit.code, stderr: stderrTail.join("\n") };
};

const verifyProcessorOutputs = async (
  input: RunProcessorInput,
  mainClass: string,
): Promise<void> => {
  for (const [outputPath, expectedSha1] of Object.entries(input.action.outputs)) {
    const sha1 = await sha1OfFile(outputPath);
    if (sha1 !== expectedSha1) {
      throw new MinecraftKitError(
        "FORGE_PROCESSOR_FAILED",
        `Processor output hash mismatch: ${outputPath}`,
        { context: { filePath: outputPath, expectedHash: expectedSha1, actualHash: sha1 } },
      );
    }
    input.onEvent?.({
      type: "forge:processor-output-verified",
      processor: { index: input.action.index, mainClass },
      path: outputPath,
    });
  }
};

const emit = (
  input: RunProcessorInput,
  event: { type: "forge:processor-started"; index: number; mainClass: string },
): void => {
  input.onEvent?.({
    type: event.type,
    processor: { index: event.index, mainClass: event.mainClass },
    total: input.total,
  });
};
