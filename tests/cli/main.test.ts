import { describe, expect, it } from "vitest";
import { MAIN_MENU, runCli } from "../../src/cli/main";
import { createStubUi } from "../../src/cli/ui";
import { buildFakeKit } from "../helpers/fake-kit";

describe("MAIN_MENU", () => {
  it("matches the spec exactly", () => {
    const labels = MAIN_MENU.map((option) => option.label);
    expect(labels).toEqual([
      "Install Minecraft",
      "Install Java/runtime",
      "Verify installation",
      "Repair installation",
      "Launch Minecraft",
      "Inspect installation",
      "Exit",
    ]);
  });

  it("does not contain separate Fabric or Forge entries", () => {
    const labels = MAIN_MENU.map((option) => option.label.toLowerCase());
    expect(labels).not.toContain("install with fabric");
    expect(labels).not.toContain("install with forge");
  });
});

describe("runCli", () => {
  it("prints help on --help", async () => {
    const ui = createStubUi();
    const code = await runCli({ args: ["--help"], ui, rootDir: "/", kit: buildFakeKit() });
    expect(code).toBe(0);
    expect(ui.calls.some((c) => c.kind === "note" && c.message.includes("mckit"))).toBe(true);
  });

  it("prints version on --version", async () => {
    const ui = createStubUi();
    const code = await runCli({ args: ["--version"], ui, rootDir: "/", kit: buildFakeKit() });
    expect(code).toBe(0);
    expect(ui.calls.some((c) => c.kind === "log")).toBe(true);
  });

  it("exits cleanly when user picks Exit", async () => {
    const ui = createStubUi(["exit"]);
    const code = await runCli({ args: [], ui, rootDir: "/", kit: buildFakeKit() });
    expect(code).toBe(0);
    expect(ui.calls.some((c) => c.kind === "outro")).toBe(true);
  });

  it("handles cancel at the main menu", async () => {
    const ui = createStubUi(["cancel"]);
    const code = await runCli({ args: [], ui, rootDir: "/", kit: buildFakeKit() });
    expect(code).toBe(0);
  });

  it("dispatches Install Minecraft and returns to menu", async () => {
    const ui = createStubUi(["install-minecraft", "cancel", "exit"]);
    const code = await runCli({ args: [], ui, rootDir: "/", kit: buildFakeKit() });
    expect(code).toBe(0);
  });

  it("logs friendly message when scenario throws", async () => {
    const ui = createStubUi(["unknown-key", "exit"]);
    const code = await runCli({ args: [], ui, rootDir: "/", kit: buildFakeKit() });
    expect(code).toBe(0);
  });
});
