import type {LandingField} from "./landing-field";

/**
 * The landing's sample, shown only while the chain has nothing to show (task 81, ADR `0152`).
 *
 * The user's decision of 2026-11-09, for the landing only: on testnet every real line comes from
 * ARP's own hidden test identities, so the page showed an empty field and no dot, and « on peut
 * faire des mock data, c'est pas grave ». So when a read **answers** with nothing, scenes 0 to 2
 * show this, and every panel that shows it says « Sample ». A read that **failed** still says it
 * failed; a sample never stands in for a failure. The moment the chain has a real line, it
 * replaces the sample, panel by panel, and a panel never mixes the two.
 *
 * The shape is the design reference's sample (`docs/design/landing-galaxy/`), with its counts and
 * `hyperframes`, a real catalogue entry, as the tool. **Its agent ids are not kept**: `8453:3107`,
 * `8453:5512`, `8453:7720` and `8453:2418` are real tokens on Base's ERC-8004 registry (`ownerOf`
 * answered for each on 2026-11-09), so the reference put uses in the mouths of real agents that
 * never declared them. The agents here are `agent 1` to `agent 5`: no chain prefix, so no reader
 * can take one for a token id on any chain.
 */

/** A sample pulse row: who, what, and what for. */
export type SampleLine = {agent: string; tool: string; context: string};

export const SAMPLE_LINES: readonly SampleLine[] = [
    {agent: "agent 1", tool: "hyperframes", context: "video"},
    {agent: "agent 2", tool: "pptx", context: "document"},
    {agent: "agent 3", tool: "remotion-render", context: "video"},
    {agent: "agent 4", tool: "frontend-design", context: "design"},
];

const agent = (id: string, positions: number) => ({
    key: `agent:${id}`,
    ring: 0 as const,
    label: id,
    isId: false,
    positions,
});
const context = (word: string, positions: number) => ({
    key: `context:${word}`,
    ring: 1 as const,
    label: word,
    isId: false,
    positions,
});
const outcome = (word: string, positions: number) => ({
    key: `outcome:${word}`,
    ring: 2 as const,
    label: word,
    isId: false,
    positions,
});

export const SAMPLE_FIELD: LandingField = {
    tool: {atomId: "sample:hyperframes", name: "hyperframes", label: null},
    rings: [
        {
            name: "used by",
            total: 5,
            claims: [
                agent("agent 1", 3),
                agent("agent 2", 2),
                agent("agent 3", 1),
                agent("agent 4", 1),
                agent("agent 5", 1),
            ],
        },
        {
            name: "in context of",
            total: 3,
            claims: [context("video", 4), context("marketing", 2), context("design", 1)],
        },
        {
            name: "has outcome",
            total: 3,
            claims: [
                outcome("worked", 4),
                outcome("failed: missing-key", 1),
                {
                    key: "paid:paid service",
                    ring: 2,
                    label: "paid service",
                    isId: false,
                    positions: 0,
                },
            ],
        },
    ],
    line: {
        agent: "agent 1",
        agentIsId: false,
        tool: "hyperframes",
        context: "video",
        outcome: "worked",
        keys: {agent: "agent:agent 1", context: "context:video", outcome: "outcome:worked"},
    },
    agents: 5,
    readings: [
        {kind: "useful", claimKey: "agent:agent 2", text: "agent 2 uses it · one of 5 agents"},
        {kind: "for what", claimKey: "context:video", text: "in context of video · 4 positions"},
        {
            kind: "working",
            claimKey: "outcome:failed: missing-key",
            text: "failed once: missing-key · you have one?",
        },
        {
            kind: "paid",
            claimKey: "paid:paid service",
            text: "its files name a paid service · no position",
        },
    ],
    linesFailed: false,
};

/** The chain answered and has no tool with a line: the field the landing shows instead. */
export function fieldOrSample(field: LandingField): {field: LandingField; sample: boolean} {
    return field.tool === null ? {field: SAMPLE_FIELD, sample: true} : {field, sample: false};
}
