import {describe, expect, it} from "vitest";

import {ARP_USAGE_SCHEMA, arpUsageScore, buildArpUsageFeed} from "../src/arp-usage.js";
import {SKILL_LINES_SCHEMA, type SkillLineRecord, type SkillLinesEntry, type SkillLinesFeed} from "../src/skill-lines-feed.js";

const line = (writer: string, rest: Partial<SkillLineRecord> = {}): SkillLineRecord => ({
    writer,
    agent_atom: "0xagent",
    agent: null,
    domain: null,
    outcome: "worked",
    reasons: [],
    needs: [],
    with: [],
    declared_at: "2026-11-10T10:00:00+00:00",
    arp_test: false,
    ...rest,
});

const entry = (lines: SkillLineRecord[]): SkillLinesEntry => ({
    url: "https://github.com/o/r?skill=s",
    repo: "o/r",
    skill: "s",
    atom_id: "0xatom",
    wallets: 0,
    wallets_outside_arp: 0,
    by_outcome: {},
    by_reason: {},
    by_need: {},
    by_with: {},
    lines,
});

const feed = (lines: SkillLineRecord[]): SkillLinesFeed => ({
    schema: SKILL_LINES_SCHEMA,
    generated_at: "2026-11-10T00:00:00Z",
    trace: {chain: "eip155:13579", graphql: "https://example/graphql"},
    note: "",
    skills: [entry(lines)],
    skipped: {count: 0, reasons: {}},
    truncated: false,
});

const only = (lines: SkillLineRecord[]) => {
    const record = buildArpUsageFeed(feed(lines), "2026-11-10T12:00:00Z").skills[0];
    if (record === undefined) throw new Error("no record");
    return record;
};

describe("arpUsageScore", () => {
    it("emits nothing below three wallets", () => {
        expect(arpUsageScore(2, 0)).toBeNull();
        expect(arpUsageScore(1, 1)).toBeNull();
    });

    it("stays near 50 on thin data and moves away as wallets agree", () => {
        const three = arpUsageScore(3, 0);
        const forty = arpUsageScore(40, 0);
        expect(three?.score).toBeCloseTo(100 * (0.5 + (1 - Math.exp(-3 / 20)) * (4 / 5 - 0.5)), 2);
        expect(three?.score).toBeGreaterThan(50);
        expect(three?.score).toBeLessThan(60);
        expect(forty?.score).toBeGreaterThan(80);
        expect(arpUsageScore(0, 40)?.score).toBeLessThan(20);
    });

    it("stays in [0, 100]", () => {
        for (const [w, f] of [[1000, 0], [0, 1000], [3, 3]] as const) {
            const score = arpUsageScore(w, f)?.score ?? -1;
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        }
    });
});

describe("buildArpUsageFeed", () => {
    it("names its schema and its source", () => {
        const out = buildArpUsageFeed(feed([]), "2026-11-10T12:00:00Z");
        expect(out.schema).toBe(ARP_USAGE_SCHEMA);
        expect(out.source.generated_at).toBe("2026-11-10T00:00:00Z");
        expect(out.adapter.contributionMode).toBe("conditional");
    });

    it("drops ARP's own test lines", () => {
        const record = only([line("0x1", {arp_test: true}), line("0x2", {arp_test: true}), line("0x3", {arp_test: true})]);
        expect(record.n).toBe(0);
        expect(record.score).toBeNull();
    });

    it("counts a wallet once, by its latest outcome", () => {
        const record = only([
            line("0x1", {outcome: "worked", declared_at: "2026-11-01T00:00:00+00:00"}),
            line("0x1", {outcome: "failed", reasons: ["not-the-right-tool"], declared_at: "2026-11-05T00:00:00+00:00"}),
            line("0x1", {outcome: "worked", declared_at: "2026-11-03T00:00:00+00:00"}),
            line("0x2"),
            line("0x3"),
        ]);
        expect(record).toMatchObject({worked: 2, failed: 1, n: 3});
        expect(record.score).not.toBeNull();
    });

    it("treats wallet addresses case-insensitively", () => {
        const record = only([line("0xAbC"), line("0xabc"), line("0xABC")]);
        expect(record.n).toBe(1);
    });

    it("does not hold a missing key, program or file against the skill", () => {
        const record = only([
            line("0x1"),
            line("0x2"),
            line("0x3"),
            line("0x4", {outcome: "failed", reasons: ["missing-key"], needs: ["OPENAI_API_KEY"]}),
            line("0x5", {outcome: "failed", reasons: ["missing-program"], needs: ["ffmpeg"]}),
        ]);
        expect(record).toMatchObject({worked: 3, failed: 0, needs_only: 2, n: 3});
        expect(record.needs).toEqual({OPENAI_API_KEY: 1, ffmpeg: 1});
    });

    it("ignores a line that names no outcome", () => {
        const record = only([line("0x1", {outcome: null}), line("0x2"), line("0x3")]);
        expect(record.n).toBe(2);
        expect(record.score).toBeNull();
    });

    it("keeps test lines' needs out of the metadata", () => {
        const record = only([line("0x1", {arp_test: true, outcome: "failed", reasons: ["missing-program"], needs: ["ffmpeg"]})]);
        expect(record.needs).toEqual({});
    });
});
