import { describe, expect, it } from "vitest";
import { throttleProgress } from "../../src/core/throttle";
import type { ProgressEvent } from "../../src/types/events";

const fileRef = { url: "u", target: "t" };

describe("throttleProgress", () => {
  it("passes through non-progress events", () => {
    const events: ProgressEvent[] = [];
    const throttled = throttleProgress((e) => events.push(e), 100);
    throttled({
      type: "download:started",
      file: fileRef,
      expectedSize: 0,
    });
    expect(events.length).toBe(1);
  });

  it("emits first progress event", () => {
    const now = 0;
    const events: ProgressEvent[] = [];
    const throttled = throttleProgress(
      (e) => events.push(e),
      100,
      () => now,
    );
    throttled({ type: "download:progress", file: fileRef, bytesDownloaded: 1, totalBytes: 10 });
    expect(events.length).toBe(1);
  });

  it("drops within-interval progress events", () => {
    let now = 0;
    const events: ProgressEvent[] = [];
    const throttled = throttleProgress(
      (e) => events.push(e),
      100,
      () => now,
    );
    throttled({ type: "download:progress", file: fileRef, bytesDownloaded: 1, totalBytes: 10 });
    now = 50;
    throttled({ type: "download:progress", file: fileRef, bytesDownloaded: 2, totalBytes: 10 });
    expect(events.length).toBe(1);
  });

  it("emits after interval elapses", () => {
    let now = 0;
    const events: ProgressEvent[] = [];
    const throttled = throttleProgress(
      (e) => events.push(e),
      100,
      () => now,
    );
    throttled({ type: "download:progress", file: fileRef, bytesDownloaded: 1, totalBytes: 10 });
    now = 200;
    throttled({ type: "download:progress", file: fileRef, bytesDownloaded: 2, totalBytes: 10 });
    expect(events.length).toBe(2);
  });

  it("tracks per-target", () => {
    const now = 0;
    const events: ProgressEvent[] = [];
    const throttled = throttleProgress(
      (e) => events.push(e),
      100,
      () => now,
    );
    throttled({
      type: "download:progress",
      file: { url: "a", target: "a" },
      bytesDownloaded: 1,
      totalBytes: 10,
    });
    throttled({
      type: "download:progress",
      file: { url: "b", target: "b" },
      bytesDownloaded: 1,
      totalBytes: 10,
    });
    expect(events.length).toBe(2);
  });
});
