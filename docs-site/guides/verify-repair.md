# Verify and repair

Verification and repair share an aspect-based shape: `minecraft`, `fabric`, `forge`,
`runtime`. You run only the aspects that apply to your target.

## Verify

```ts
const minecraft = await kit.verify.minecraft.run(target);
const runtime = await kit.verify.runtime.run(target);

if (!minecraft.isValid) {
  for (const issue of minecraft.issues) {
    console.warn(`${issue.status}: ${issue.path}`);
  }
}
```

Each call returns a `VerificationResult`:

```ts
interface VerificationResult {
  readonly targetId: string;
  readonly kind: "minecraft" | "fabric" | "forge" | "runtime";
  readonly isValid: boolean;
  readonly issues: readonly VerificationFileResult[];
  readonly checkedFiles: number;
  readonly durationMs: number;
}
```

Each issue carries `status` (`missing`, `corrupt`, `wrong-size`), `category` (`client-jar`,
`library`, `asset`, `asset-index`, `native`, `loader-library`, `runtime-file`,
`logging-config`), and — when known — `expectedSha1`, `actualSha1`, `expectedSize`,
`actualSize`, and `url` (where to re-download from).

Pass `onEvent` to receive a `verify:file-checked` event per file.

Aspect verifiers that require a specific loader throw `INVALID_INPUT` when called on the
wrong loader (`verify.fabric.run` on a vanilla target, etc.).

## Repair

```ts
const plan = await kit.repair.minecraft.plan(target, { from: minecraft });
await kit.repair.minecraft.run(plan, {
  onEvent: (event) => console.log(event.type),
});
```

`plan` intersects the install plan with the verification issues so only broken / missing
files get touched. The install runner executes the repair — there is no separate runner to
drift apart from install behaviour, and `actionsSkipped` in the resulting report tells you
how many files were already correct.

`from` accepts a single `VerificationResult` *or* an array — useful if you ran more than one
aspect verifier:

```ts
const plan = await kit.repair.minecraft.plan(target, {
  from: [minecraft, await kit.verify.runtime.run(target)],
});
```

## Repair semantics

- **`DOWNLOAD_FILE` actions** are included when the target path has *any* non-`native` issue
  recorded. A `native`-only issue at the JAR path means "re-extract", not "re-download".
- **`WRITE_VERSION_JSON` actions** are included when the destination path has any issue
  recorded.
- **`EXTRACT_NATIVE` actions** are included when the source JAR has any issue recorded.
- **Forge processors** are normally not in a repair plan, since they only need to fire on a
  fresh install. When the Forge version JSON is missing entirely the planner adds every
  forge-library plus all processors as a defensive sweep — `downloadFile` skips files that
  are already correct, so the cost is bounded.
