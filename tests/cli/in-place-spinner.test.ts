import { describe, expect, it } from "vitest";
import { createInPlaceSpinner } from "../../src/cli/ui";

interface FakeOut {
  readonly chunks: string[];
  readonly write: (chunk: string) => void;
  readonly isTTY: boolean;
}

const fakeTty = (): FakeOut => {
  const chunks: string[] = [];
  return { chunks, write: (c) => chunks.push(c), isTTY: true };
};

const fakeNonTty = (): FakeOut => {
  const chunks: string[] = [];
  return { chunks, write: (c) => chunks.push(c), isTTY: false };
};

const CR_ERASE = "\r\x1b[2K";

describe("createInPlaceSpinner (TTY)", () => {
  it("writes the initial message without a trailing newline", () => {
    const out = fakeTty();
    const sp = createInPlaceSpinner({ out });
    sp.start("starting");
    expect(out.chunks).toEqual(["starting"]);
  });

  it("overwrites the line with CR + erase escape on every message update", () => {
    const out = fakeTty();
    const sp = createInPlaceSpinner({ out });
    sp.start("starting");
    sp.message("step 1");
    sp.message("step 2");
    expect(out.chunks).toEqual(["starting", `${CR_ERASE}step 1`, `${CR_ERASE}step 2`]);
    // Critically: no chunk contains a newline — the spinner stays on a single line.
    for (const chunk of out.chunks) {
      expect(chunk).not.toContain("\n");
    }
  });

  it("dedupes consecutive identical messages", () => {
    const out = fakeTty();
    const sp = createInPlaceSpinner({ out });
    sp.start("starting");
    sp.message("step 1");
    sp.message("step 1");
    sp.message("step 1");
    expect(out.chunks.filter((c) => c.includes("step 1")).length).toBe(1);
  });

  it("ignores message() calls before start()", () => {
    const out = fakeTty();
    const sp = createInPlaceSpinner({ out });
    sp.message("ignored");
    expect(out.chunks).toEqual([]);
  });

  it("stop() commits the line with a trailing newline", () => {
    const out = fakeTty();
    const sp = createInPlaceSpinner({ out });
    sp.start("starting");
    sp.message("step 1");
    sp.stop("done");
    expect(out.chunks.at(-1)).toBe(`${CR_ERASE}done\n`);
  });

  it("treats a second start() as an in-place update", () => {
    const out = fakeTty();
    const sp = createInPlaceSpinner({ out });
    sp.start("first");
    sp.start("second");
    expect(out.chunks).toEqual(["first", `${CR_ERASE}second`]);
  });

  it("can be reused after stop()", () => {
    const out = fakeTty();
    const sp = createInPlaceSpinner({ out });
    sp.start("a");
    sp.stop("done a");
    sp.start("b");
    sp.stop("done b");
    expect(out.chunks).toEqual(["a", `${CR_ERASE}done a\n`, "b", `${CR_ERASE}done b\n`]);
  });
});

describe("createInPlaceSpinner (non-TTY)", () => {
  it("prints the start message on its own line and no in-flight updates", () => {
    const out = fakeNonTty();
    const sp = createInPlaceSpinner({ out });
    sp.start("starting");
    sp.message("step 1");
    sp.message("step 2");
    sp.stop("done");
    // start prints starting+\n, message calls are suppressed, stop prints done+\n.
    expect(out.chunks).toEqual(["starting\n", "done\n"]);
  });

  it("stop() with no prior start() still prints the final message once", () => {
    const out = fakeNonTty();
    const sp = createInPlaceSpinner({ out });
    sp.stop("only");
    expect(out.chunks).toEqual(["only\n"]);
  });
});
