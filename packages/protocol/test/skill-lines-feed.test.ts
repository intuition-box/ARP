import {describe, expect, it} from "vitest";

import {buildAgentSieveFeed, type AgentSieveRow} from "../src/agent-sieve-feed.js";
import type {PulseDeclaration, PulseUsage} from "../src/pulse-usage.js";
import {buildSkillLinesFeed, SKILL_LINES_SCHEMA, type SkillLinesInput} from "../src/skill-lines-feed.js";

const ATOM = "0xAA";
const ARP = "0x906f3A52ec089f8D4E9127F91C6bE5Ae0d18f91f";
const SPONSOR = "0x77939A4c276f3E549276CEB3A09CDa1fF58b7ec9";
const OTHER = "0x2222222222222222222222222222222222222222";

const declaration = (writer: string, label: string | null, rest: Partial<PulseDeclaration> = {}): PulseDeclaration => ({
    tripleId: "0x01",
    agent: {atomId: "0xagent", label},
    writer,
    declaredAt: "2026-11-09T20:00:00.000Z",
    domains: [],
    outcomes: [],
    lines: [],
    ...rest,
});

const usage = (declarations: PulseDeclaration[], truncated = false): PulseUsage => ({
    declarations,
    agents: 1,
    wallets: 1,
    byDomain: {},
    byOutcome: {},
    byReason: {},
    byOthers: [],
    truncated,
});

const input = (declarations: PulseDeclaration[], extra: Partial<SkillLinesInput> = {}): SkillLinesInput => ({
    tools: [{atomId: ATOM, url: "https://github.com/anthropics/skills?skill=pptx"}],
    usage: new Map([[ATOM.toLowerCase(), usage(declarations)]]),
    domains: new Set(["tool", "presentation"]),
    arpWallets: [ARP],
    payers: [SPONSOR],
    testAgents: {chainId: 13579, from: 1, to: 38},
    trace: {chain: "eip155:13579", graphql: "https://testnet.intuition.sh/v1/graphql"},
    generatedAt: "2026-11-10T00:00:00.000Z",
    ...extra,
});

describe("buildSkillLinesFeed", () => {
    it("writes one record per line, with outcome, reasons, needs and with", () => {
        const feed = buildSkillLinesFeed(
            input([
                declaration(OTHER, "Agent 8453:2340", {
                    lines: [
                        {domain: "presentation", outcome: "failed", reasons: ["missing-program"], form: "nested", needs: ["libreoffice"]},
                        {domain: "presentation", outcome: "worked", reasons: [], form: "nested", with: ["python3"]},
                    ],
                }),
            ]),
        );
        expect(feed.schema).toBe(SKILL_LINES_SCHEMA);
        const [skill] = feed.skills;
        expect(skill?.repo).toBe("anthropics/skills");
        expect(skill?.skill).toBe("pptx");
        expect(skill?.lines).toHaveLength(2);
        expect(skill?.lines[0]).toMatchObject({writer: OTHER, agent: "Agent 8453:2340", domain: "presentation", outcome: "failed", needs: ["libreoffice"], arp_test: false});
        expect(skill?.by_outcome).toEqual({failed: 1, worked: 1});
        expect(skill?.by_need).toEqual({libreoffice: 1});
        expect(skill?.by_with).toEqual({python3: 1});
        expect(skill?.wallets_outside_arp).toBe(1);
    });

    it("marks ARP's own wallets and test identities as arp_test", () => {
        const feed = buildSkillLinesFeed(input([declaration(ARP.toLowerCase(), "Agent 8453:1"), declaration(OTHER, "Agent 13579:12")]));
        const lines = feed.skills[0]?.lines ?? [];
        expect(lines.map((line) => line.arp_test)).toEqual([true, true]);
        expect(feed.skills[0]?.wallets).toBe(2);
        expect(feed.skills[0]?.wallets_outside_arp).toBe(0);
    });

    it("never carries free text: a domain outside the tree and a typed agent label become null", () => {
        const feed = buildSkillLinesFeed(
            input([declaration(OTHER, "my secret project notes", {domains: ["call me at 555"]})]),
        );
        const line = feed.skills[0]?.lines[0];
        expect(line).toMatchObject({agent: null, domain: null, outcome: null});
        expect(JSON.stringify(feed)).not.toContain("secret");
        expect(JSON.stringify(feed)).not.toContain("555");
        expect(feed.skipped.count).toBe(2);
    });

    it("leaves out a skill nobody wrote about, and a URL that is not a skill", () => {
        const feed = buildSkillLinesFeed(
            input([], {tools: [{atomId: ATOM, url: "https://github.com/a/b?skill=c"}, {atomId: "0xbb", url: "https://api.example.com/x402"}]}),
        );
        expect(feed.skills).toEqual([]);
        expect(feed.skipped.reasons).toEqual({"not a skill URL": 1});
    });

    it("leaves out the row of a payer, which created the edge and said nothing", () => {
        const feed = buildSkillLinesFeed(input([declaration(SPONSOR, "Agent 13579:12")]));
        expect(feed.skills).toEqual([]);
        expect(feed.skipped.reasons).toEqual({"an edge a payer created, which says nothing": 1});
    });

    it("says when the read was cut", () => {
        const feed = buildSkillLinesFeed({...input([]), usage: new Map([[ATOM.toLowerCase(), usage([declaration(OTHER, null)], true)]])});
        expect(feed.truncated).toBe(true);
    });
});

const sieveRow = (tokenId: string, rung: number, extra: Partial<AgentSieveRow> = {}): AgentSieveRow => ({
    chainId: 8453,
    registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    tokenId,
    rung,
    couldNotSay: false,
    proofUrl: "https://example.com/mcp",
    kinds: ["mcp"],
    at: "2026-11-09T18:02:01.721Z",
    ...extra,
});

describe("buildAgentSieveFeed", () => {
    const build = (rows: AgentSieveRow[]) =>
        buildAgentSieveFeed({rows, checkedFrom: "a", checkedTo: "b", source: "data/x.jsonl", generatedAt: "2026-11-10T00:00:00.000Z"});

    it("keys each agent by chain, registry and token, highest rung first, and counts by rung", () => {
        const feed = build([sieveRow("10", 1, {proofUrl: null, kinds: []}), sieveRow("2", 4), sieveRow("3", 4)]);
        expect(feed.agents.map((agent) => agent.agent.split(":").at(-1))).toEqual(["2", "3", "10"]);
        expect(feed.agents[0]?.agent).toBe("eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432:2");
        expect(feed.by_chain).toEqual({"eip155:8453": {0: 0, 1: 1, 2: 0, 3: 0, 4: 2, 5: 0}});
    });

    it("keeps no text beside the URL: a malformed row is skipped, a non-URL proof and an unknown kind dropped", () => {
        const feed = build([sieveRow("x", 4), sieveRow("5", 9), sieveRow("6", 3, {proofUrl: "hello world", kinds: ["mcp", "free text"]})]);
        expect(feed.skipped.count).toBe(2);
        expect(feed.agents[0]).toMatchObject({proof_url: null, kinds: ["mcp"]});
    });
});
