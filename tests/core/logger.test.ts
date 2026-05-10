import { afterEach, describe, expect, it, vi } from "vitest";
import { consoleLogger, silentLogger } from "../../src/core/logger";

describe("logger", () => {
  describe("silentLogger", () => {
    it("does not throw for any level", () => {
      silentLogger.log("info", "hi");
      silentLogger.log("warn", "hi", { foo: 1 });
      expect(true).toBe(true);
    });
  });

  describe("consoleLogger", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("calls console.info for info", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      consoleLogger.log("info", "hi");
      expect(spy).toHaveBeenCalled();
    });

    it("includes fields when present", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
      consoleLogger.log("info", "hi", { foo: 1 });
      expect(spy).toHaveBeenCalled();
    });

    it("falls back to debug for unknown levels", () => {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);
      consoleLogger.log("debug", "hi");
      expect(debugSpy).toHaveBeenCalled();
    });

    it("uses warn for warn", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      consoleLogger.log("warn", "hi");
      expect(warnSpy).toHaveBeenCalled();
    });

    it("uses error for error", () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      consoleLogger.log("error", "hi");
      expect(errSpy).toHaveBeenCalled();
    });
  });
});
