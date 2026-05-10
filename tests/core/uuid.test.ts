import { describe, expect, it } from "vitest";
import { offlineUuidFor, stripUuidDashes } from "../../src/core/uuid";

describe("uuid", () => {
  it("derives stable UUIDs for the same name", () => {
    const a = offlineUuidFor("Notch");
    const b = offlineUuidFor("Notch");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("derives different UUIDs for different names", () => {
    expect(offlineUuidFor("a")).not.toBe(offlineUuidFor("b"));
  });

  it("strips dashes", () => {
    expect(stripUuidDashes("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe(
      "aaaaaaaabbbbccccddddeeeeeeeeeeee",
    );
  });
});
