import {describe, expect, it} from "vitest";

import {reachableReading, readingDay} from "./agents-reachable";

describe("reachableReading", () => {
    it("carries its date, the size of the index it was taken over, and well-formed agents", () => {
        const reading = reachableReading();
        expect(Number.isNaN(Date.parse(reading.measuredAt))).toBe(false);
        expect(Number.isInteger(reading.directoryChainId)).toBe(true);
        expect(reading.agents.length).toBeLessThanOrEqual(reading.listed);
        for (const agent of reading.agents) {
            expect(Number.isInteger(agent.chainId)).toBe(true);
            expect(agent.tokenId).toMatch(/^\d+$/);
            expect(agent.kinds.length).toBeGreaterThan(0);
        }
    });
});

describe("readingDay", () => {
    it("is the day of the reading", () => {
        expect(readingDay("2026-11-09T15:05:04.229Z")).toBe("2026-11-09");
    });
});
