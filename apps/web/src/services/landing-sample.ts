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
 * Everything here is the design reference's sample (`docs/design/landing-galaxy/`): made-up
 * ERC-8004 ids, made-up counts, and `hyperframes`, a real catalogue entry, as the tool. None of it
 * is a claim about any real agent.
 */

/** A sample pulse row: who, what, and what for. */
export type SampleLine = {agent: string; tool: string; context: string};

export const SAMPLE_LINES: readonly SampleLine[] = [
    {agent: "8453:3107", tool: "hyperframes", context: "video"},
    {agent: "8453:5512", tool: "pptx", context: "document"},
    {agent: "13579:41", tool: "remotion-render", context: "video"},
    {agent: "8453:7720", tool: "frontend-design", context: "design"},
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
                agent("8453:3107", 3),
                agent("8453:5512", 2),
                agent("13579:41", 1),
                agent("8453:7720", 1),
                agent("8453:2418", 1),
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
        agent: "8453:3107",
        agentIsId: false,
        tool: "hyperframes",
        context: "video",
        outcome: "worked",
        keys: {agent: "agent:8453:3107", context: "context:video", outcome: "outcome:worked"},
    },
    agents: 5,
    readings: [
        {kind: "useful", claimKey: "agent:8453:5512", text: "8453:5512 uses it · one of 5 agents"},
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
