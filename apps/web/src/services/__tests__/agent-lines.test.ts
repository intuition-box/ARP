import type {AgentLines, PulseDeclaration, PulseUsage} from "@arp-protocol/core";
import {describe, expect, it} from "vitest";

import type {ClaimView, GroupView} from "../atom-standing-view";
import {buildAgentLinesView, fieldGroups, lineText} from "../agent-lines";

const USES = "0xUSES";

const declaration = (
    agent: {atomId: string; label: string | null},
    over: Partial<PulseDeclaration> = {},
): PulseDeclaration => ({
    tripleId: `0xt-${agent.atomId}`,
    agent,
    writer: "0xW",
    holders: ["0xW"],
    declaredAt: null,
    domains: [],
    outcomes: [],
    lines: [],
    ...over,
});

const usage = (declarations: PulseDeclaration[]): PulseUsage => ({
    declarations,
    agents: declarations.length,
    wallets: declarations.length,
    byDomain: {},
    byOutcome: {},
    byReason: {},
    byOthers: [],
    truncated: false,
});

const lines = (usedBy: PulseDeclaration[], used: AgentLines["used"] = []): AgentLines => ({
    usedBy: usage(usedBy),
    used,
    truncated: false,
});

describe("buildAgentLinesView", () => {
    it("reads a line as its declarer wrote it: domain, then outcome, with a failure's reason", () => {
        const view = buildAgentLinesView(
            lines([
                declaration(
                    {atomId: "0xH", label: "hirer"},
                    {
                        domains: ["translation", "legal"],
                        lines: [
                            {
                                domain: "translation",
                                outcome: "failed",
                                reasons: ["no-delivery"],
                                form: "nested",
                            },
                        ],
                    },
                ),
            ]),
            new Set(),
        );
        expect(lineText(view.usedBy[0]?.parts ?? [])).toBe(
            "translation · failed: no-delivery, legal",
        );
    });

    it("gives one row per edge, so the sponsor that created it is not a second, empty use", () => {
        const tool = {atomId: "0xtool", label: "pptx"};
        const view = buildAgentLinesView(
            lines(
                [],
                [
                    {
                        tool,
                        declaration: declaration(
                            {atomId: "0xA", label: "me"},
                            {tripleId: "0xe", writer: "0xSponsor"},
                        ),
                    },
                    {
                        tool,
                        declaration: declaration(
                            {atomId: "0xA", label: "me"},
                            {
                                tripleId: "0xe",
                                lines: [
                                    {
                                        domain: "presentation",
                                        outcome: "worked",
                                        reasons: [],
                                        form: "nested",
                                    },
                                ],
                            },
                        ),
                    },
                ],
            ),
            new Set(),
        );
        expect(view.used).toHaveLength(1);
        expect(lineText(view.used[0]?.parts ?? [])).toBe("presentation · task done");
    });

    it("says an outcome written with no domain as the outcome alone", () => {
        expect(lineText([{domain: null, outcome: "failed: no-delivery"}])).toBe(
            "failed: no-delivery",
        );
        expect(lineText([])).toBeNull();
    });

    it("leaves ARP's own test identities out, on both sides", () => {
        const view = buildAgentLinesView(
            lines(
                [declaration({atomId: "0xTEST", label: "test"})],
                [
                    {
                        tool: {atomId: "0xtest2", label: "x"},
                        declaration: declaration({atomId: "0xA", label: null}),
                    },
                ],
            ),
            new Set(["0xtest", "0xtest2"]),
        );
        expect(view.usedBy).toEqual([]);
        expect(view.used).toEqual([]);
    });

    it("orders the contexts by how many edges name them", () => {
        const view = buildAgentLinesView(
            lines([
                declaration({atomId: "0x1", label: "a"}, {domains: ["video"]}),
                declaration({atomId: "0x2", label: "b"}, {domains: ["music", "video"]}),
            ]),
            new Set(),
        );
        expect(view.contexts).toEqual(["video", "music"]);
    });
});

describe("fieldGroups", () => {
    const usesGroup: GroupView = {
        predicateAtomId: USES,
        label: "uses",
        labelIsId: false,
        inverse: null,
        rows: [
            {
                tripleId: "0xT-0xH",
                name: "hirer",
                nameIsId: false,
                subjectAtomId: "0xH",
                label: "hirer",
                backing: null,
                positions: 0,
                opposition: null,
            },
        ],
        backing: null,
        positions: 0,
    };

    it("puts the line on the incoming dot and reads the ring as used by", () => {
        const view = buildAgentLinesView(
            lines([declaration({atomId: "0xH", label: "hirer"}, {domains: ["video"]})]),
            new Set(),
        );
        const [group] = fieldGroups([usesGroup], [], view, USES.toLowerCase());
        expect(group?.inverse).toBe("used by");
        expect(group?.rows[0]?.line).toBe("video");
    });

    it("adds a ring of what the agent used, filled only when its own claim shows backing", () => {
        const view = buildAgentLinesView(
            lines(
                [],
                [
                    {
                        tool: {atomId: "0xtool", label: "pptx"},
                        declaration: declaration(
                            {atomId: "0xA", label: "me"},
                            {tripleId: "0xE1", holders: ["a", "b"]},
                        ),
                    },
                ],
            ),
            new Set(),
        );
        const claims: ClaimView[] = [
            {
                tripleId: "0xe1",
                predicate: "uses",
                objectLabel: "pptx",
                object: "pptx",
                objectIsId: false,
                objectAtomId: "0xtool",
                backing: "0.002 tTRUST",
            },
        ];
        const out = fieldGroups([], claims, view, USES).at(-1);
        expect(out).toMatchObject({direction: "out", inverse: "uses"});
        expect(out?.rows[0]).toMatchObject({
            subjectAtomId: "0xtool",
            backing: "0.002 tTRUST",
            positions: 2,
        });
        expect(fieldGroups([], [], view, USES).at(-1)?.rows[0]?.positions).toBe(0);
    });

    it("leaves the groups alone when there are no lines", () => {
        expect(fieldGroups([usesGroup], [], undefined, USES)).toEqual([
            {...usesGroup, inverse: "used by", rows: [{...usesGroup.rows[0], line: null}]},
        ]);
    });
});
