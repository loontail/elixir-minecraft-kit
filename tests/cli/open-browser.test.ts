import { describe, expect, it } from "vitest";
import { openBrowser } from "../../src/cli/open-browser";

describe("openBrowser", () => {
  it("rejects unparseable URLs without spawning", async () => {
    expect(await openBrowser("not a url")).toBe(false);
  });

  it("rejects non-http(s) schemes", async () => {
    expect(await openBrowser("file:///etc/passwd")).toBe(false);
    expect(await openBrowser("data:text/html,<script>")).toBe(false);
    expect(await openBrowser("javascript:alert(1)")).toBe(false);
  });
});
