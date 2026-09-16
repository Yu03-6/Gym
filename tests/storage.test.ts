import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { readState, writeState } from "../src/lib/storage";
describe("IndexedDB transaction safety", () => {
  it("serializes concurrent updates without dropping records", async () => {
    await Promise.all([
      writeState((s) => {
        s.weights.push({
          id: "one",
          date: "2026-09-15",
          weight: 80,
          waist: null,
        });
      }),
      writeState((s) => {
        s.weights.push({
          id: "two",
          date: "2026-09-16",
          weight: 79,
          waist: null,
        });
      }),
    ]);
    const s = await readState();
    expect(s.weights).toHaveLength(2);
    expect(s.revision).toBe(2);
  });
  it("rolls back an invalid mutation", async () => {
    const before = await readState();
    await expect(
      writeState((s) => {
        s.weights.push({
          id: "invalid",
          date: "2026-09-17",
          weight: -1,
          waist: null,
        });
      }),
    ).rejects.toThrow();
    expect(await readState()).toEqual(before);
  });
});
