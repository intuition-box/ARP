import type {AgentLines, PulseDeclaration, PulseUsage} from "@arp-protocol/core";
import {describe, expect, it} from "vitest";

import {buildAgentLinesView} from "../agent-lines";

const declaration = (
    agent: {atomId: string; label: string | null},
    over: Partial<PulseDeclaration> = {},
): PulseDeclaration => ({
    tripleId: `0xt-${agent.atomId}`,
    agent,
    writer: "0xW",
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
        expect(view.usedBy[0]).toMatchObject({
            name: "hirer",
            nameIsId: false,
            parts: [
                {domain: "translation", outcome: "failed: no-delivery"},
                {domain: "legal", outcome: null},
            ],
        });
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

    it("names an unlabelled atom by its id, marked as one", () => {
        const view = buildAgentLinesView(
            lines([declaration({atomId: "0x1234567890abcdef", label: null})]),
            new Set(),
        );
        expect(view.usedBy[0]?.nameIsId).toBe(true);
    });

    it("orders the contexts by how many lines name them", () => {
        const view = buildAgentLinesView(
            lines(
                [
                    declaration({atomId: "0x1", label: "a"}, {domains: ["video"]}),
                    declaration({atomId: "0x2", label: "b"}, {domains: ["music", "video"]}),
                ],
                [
                    {
                        tool: {atomId: "0xt", label: "tool"},
                        declaration: declaration(
                            {atomId: "0xA", label: "me"},
                            {domains: ["music", "video"]},
                        ),
                    },
                ],
            ),
            new Set(),
        );
        expect(view.contexts).toEqual(["video", "music"]);
        expect(view.used[0]?.name).toBe("tool");
    });
});
