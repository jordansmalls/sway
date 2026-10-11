import { describe, expect, it } from "bun:test";
import { compareTimestamps, formatDuration } from "../src/lib/format";

describe("formatDuration", () => {
    it("never renders 60 seconds", () => {
        expect(formatDuration(119_600)).toBe("2:00");
        expect(formatDuration(59_500)).toBe("1:00");
    });

    it("pads seconds", () => {
        expect(formatDuration(65_000)).toBe("1:05");
        expect(formatDuration(0)).toBe("0:00");
    });
});

describe("compareTimestamps", () => {
    it("sorts a daytime event chronologically", () => {
        const played = ["2026-10-10T14:00:00Z", "2026-10-10T10:00:00Z", "2026-10-10T12:30:00Z", "2026-10-10T13:00:00Z"];
        expect([...played].sort(compareTimestamps)).toEqual([
            "2026-10-10T10:00:00Z", "2026-10-10T12:30:00Z", "2026-10-10T13:00:00Z", "2026-10-10T14:00:00Z",
        ]);
    });

    it("sorts across midnight", () => {
        const played = ["2026-10-11T01:15:00Z", "2026-10-10T23:45:00Z"];
        expect([...played].sort(compareTimestamps)).toEqual(["2026-10-10T23:45:00Z", "2026-10-11T01:15:00Z"]);
    });

    it("puts missing timestamps last", () => {
        expect([null, "2026-10-10T10:00:00Z", undefined].sort(compareTimestamps)).toEqual(["2026-10-10T10:00:00Z", null, undefined]);
    });
});
