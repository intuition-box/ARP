import {describe, expect, it} from "vitest";

import {hostOf, reachableReading, readingDay, readingOf} from "./agents-reachable";

describe("reachableReading", () => {
    it("reads the bundled sieve: its chain, its date, and only rung 3 and above", () => {
        const reading = reachableReading();
        expect(Number.isInteger(reading.directoryChainId)).toBe(true);
        expect(Number.isNaN(Date.parse(reading.measuredAt))).toBe(false);
        for (const agent of reading.agents) {
            expect(agent.rung).toBeGreaterThanOrEqual(3);
            expect(agent.tokenId).toMatch(/^\d+$/);
        }
    });
});

describe("readingOf", () => {
    it("orders highest rung first and keys the shells by chain and token", () => {
        const reading = readingOf({
            directoryChainId: 13579,
            checkedFrom: "2026-11-09T19:00:00Z",
            checkedTo: "2026-11-09T20:00:00Z",
            agents: [
                {chainId: 1, registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", tokenId: "1", name: "a", rung: 3, couldNotSay: false, proofUrl: null, kinds: [], at: ""},
                {chainId: 1, registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", tokenId: "2", name: "b", rung: 4, couldNotSay: false, proofUrl: null, kinds: [], at: ""},
                {chainId: 1, registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", tokenId: "3", name: "c", rung: 0, couldNotSay: false, proofUrl: null, kinds: [], at: ""},
                {chainId: 1, registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", tokenId: "4", name: "d", rung: 2, couldNotSay: true, proofUrl: null, kinds: [], at: ""},
            ],
        });
        expect(reading.agents.map((agent) => agent.tokenId)).toEqual(["2", "1"]);
        expect([...reading.shells]).toEqual(["1/3"]);
        expect(reading.measuredAt).toBe("2026-11-09T20:00:00Z");
    });
});

describe("readingDay and hostOf", () => {
    it("give the day and the host", () => {
        expect(readingDay("2026-11-09T15:05:04.229Z")).toBe("2026-11-09");
        expect(hostOf("https://a.example/mcp")).toBe("a.example");
        expect(hostOf("not a url")).toBeNull();
        expect(hostOf(null)).toBeNull();
    });
});
