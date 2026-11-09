import {
    BECAUSE_LABEL,
    getPulseUsage,
    githubPulseSource,
    HAS_OUTCOME_LABEL,
    listTools,
    multiVaultReads,
    readPulse,
    type PulseDeclaration,
    type PulseUsage,
    type ToolListing,
} from "@arp-protocol/core";
import {stringToHex, type Address, type Hex} from "viem";

import {LANDING_DOTS_PER_RING} from "../components/brand/galaxy-geometry";
import {parseToolLabel, primaryNameOf} from "../lib/tool-label";
import {truncateMiddle} from "./trust-format";

/**
 * What the landing's claim field draws: one real tool, its real claims, its latest line, and what
 * an agent reads in them (task 81, ADR `0152`).
 *
 * **Real or absent.** Every name, id and count here comes from the chain the reader chose, with
 * ARP's own test identities left out (`services/test-identities.ts`). A reading with nothing
 * behind it is left out, not invented; when no tool has a declaration the field is empty and the
 * page says so. The reference's samples (`8453:3107`, `video`, `missing-key`…) never reach here.
 */

export type FieldClaim = {
    key: string;
    /** 0 `used by`, 1 `in context of`, 2 `has outcome`. */
    ring: 0 | 1 | 2;
    label: string;
    /** True when the label is an id rather than a word, so it is set in mono. */
    isId: boolean;
    /**
     * How many stand behind it: positions on the `uses` edge for an agent, distinct wallets that
     * stand behind the level for a context or an outcome. `0` draws it hollow.
     */
    positions: number;
};

export type FieldRing = {name: string; total: number; claims: FieldClaim[]};

export type FieldLine = {
    agent: string;
    agentIsId: boolean;
    tool: string;
    context: string | null;
    outcome: string | null;
    /** The claim keys of the line's words, so the field can write them in order. */
    keys: {agent: string; context: string | null; outcome: string | null};
};

export type ReadingKind = "useful" | "for what" | "working" | "paid";

export type FieldReading = {kind: ReadingKind; text: string; claimKey: string};

export type LandingField = {
    tool: {atomId: string; name: string; label: string | null} | null;
    rings: FieldRing[];
    line: FieldLine | null;
    /** Distinct agents that declared the tool, after the hiding. */
    agents: number;
    readings: FieldReading[];
};

export const EMPTY_FIELD: LandingField = {
    tool: null,
    rings: [],
    line: null,
    agents: 0,
    readings: [],
};

const lower = (value: string) => value.toLowerCase();

/** The tool most identified agents declared, ARP's tests left out. `null` when none has one. */
export function mostDeclaredTool(
    tools: readonly ToolListing[],
    hidden: ReadonlySet<string>,
): {listing: ToolListing; declarers: number} | null {
    let best: {listing: ToolListing; declarers: number} | null = null;
    for (const listing of tools) {
        const declarers = listing.declarers.filter((id) => !hidden.has(lower(id))).length;
        if (declarers === 0) continue;
        if (best === null || declarers > best.declarers) best = {listing, declarers};
    }
    return best;
}

function agentName(agent: {atomId: string; label: string | null}): {label: string; isId: boolean} {
    if (agent.label !== null && agent.label.trim().length > 0)
        return {label: agent.label, isId: false};
    return {label: truncateMiddle(agent.atomId, 6, 4), isId: true};
}

function outcomeWord(outcome: string, reasons: readonly string[]): string {
    return outcome === "failed" && reasons.length > 0 ? `failed: ${reasons[0]}` : outcome;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Build the field from the reads.
 *
 * @param usage the tool's lines (`getPulseUsage`), or `null` when that read failed: the agents
 *   then come from the listing alone, by id, and the other rings are left empty rather than
 *   guessed.
 * @param paidWords words the tool's own files use that name a paid service (`readPulse`), or `[]`.
 */
export function buildLandingField(input: {
    tool: ToolListing | null;
    usage: PulseUsage | null;
    hidden: ReadonlySet<string>;
    paidWords: readonly string[];
}): LandingField {
    const {tool, usage, hidden} = input;
    if (tool === null) return EMPTY_FIELD;
    const name = primaryNameOf(parseToolLabel(tool.label)) || truncateMiddle(tool.atomId, 6, 4);

    const declarations: PulseDeclaration[] = (usage?.declarations ?? []).filter(
        (row) => !hidden.has(lower(row.agent.atomId)),
    );

    // Ring 0: the agents, once each, with the positions on their `uses` edge.
    const agents = new Map<string, FieldClaim & {latest: string}>();
    for (const row of declarations) {
        const id = lower(row.agent.atomId);
        const known = agents.get(id);
        const positions = Math.max(
            known?.positions ?? 0,
            new Set((row.holders ?? []).map(lower)).size,
        );
        const {label, isId} = agentName(row.agent);
        agents.set(id, {
            key: `agent:${id}`,
            ring: 0,
            label,
            isId,
            positions,
            latest: [known?.latest ?? "", row.declaredAt ?? ""].sort().at(-1) ?? "",
        });
    }
    if (usage === null) {
        for (const id of tool.declarers) {
            if (hidden.has(lower(id))) continue;
            agents.set(lower(id), {
                key: `agent:${lower(id)}`,
                ring: 0,
                label: truncateMiddle(id, 6, 4),
                isId: true,
                positions: 0,
                latest: "",
            });
        }
    }

    // Rings 1 and 2: each word counted once per wallet that stands behind it (ADR `0138`).
    const contexts = new Map<string, Set<string>>();
    const outcomes = new Map<string, Set<string>>();
    for (const row of declarations) {
        const wallet = lower(row.writer);
        for (const domain of row.domains) {
            contexts.set(domain, (contexts.get(domain) ?? new Set()).add(wallet));
        }
        for (const line of row.lines) {
            const word = outcomeWord(line.outcome, line.reasons);
            outcomes.set(word, (outcomes.get(word) ?? new Set()).add(wallet));
        }
    }

    const byWeight = (a: FieldClaim, b: FieldClaim) =>
        b.positions - a.positions || a.label.localeCompare(b.label);
    const agentClaims = [...agents.values()].sort(byWeight);
    const contextClaims: FieldClaim[] = [...contexts.entries()]
        .map(([word, wallets]) => ({
            key: `context:${word}`,
            ring: 1 as const,
            label: word,
            isId: false,
            positions: wallets.size,
        }))
        .sort(byWeight);
    const outcomeClaims: FieldClaim[] = [...outcomes.entries()]
        .map(([word, wallets]) => ({
            key: `outcome:${word}`,
            ring: 2 as const,
            label: word,
            isId: false,
            positions: wallets.size,
        }))
        .sort(byWeight);
    // A word from the tool's own files: on the outer ring, hollow, because no position is behind it.
    const paid = input.paidWords[0];
    const paidClaim: FieldClaim | null =
        paid === undefined
            ? null
            : {key: `paid:${paid}`, ring: 2, label: paid, isId: false, positions: 0};

    // The latest line: the newest declaration, its nested line first.
    const newest = [...declarations].sort((a, b) =>
        (b.declaredAt ?? "").localeCompare(a.declaredAt ?? ""),
    )[0];
    let line: FieldLine | null = null;
    if (newest !== undefined) {
        const chosen = newest.lines.find((l) => l.form === "nested") ?? newest.lines[0];
        const context = chosen?.domain ?? newest.domains[0] ?? null;
        const outcome = chosen === undefined ? null : outcomeWord(chosen.outcome, chosen.reasons);
        const {label, isId} = agentName(newest.agent);
        line = {
            agent: label,
            agentIsId: isId,
            tool: name,
            context,
            outcome,
            keys: {
                agent: `agent:${lower(newest.agent.atomId)}`,
                context: context === null ? null : `context:${context}`,
                outcome: outcome === null ? null : `outcome:${outcome}`,
            },
        };
    }

    // The line's own words are always drawn, even past the cap: the sentence is written into them.
    const capped = (claims: FieldClaim[], keep: readonly (string | null)[]) => {
        const room =
            LANDING_DOTS_PER_RING - claims.filter((claim) => keep.includes(claim.key)).length;
        let others = 0;
        return claims.filter((claim) => {
            if (keep.includes(claim.key)) return true;
            others += 1;
            return others <= room;
        });
    };
    const keep = line === null ? [] : [line.keys.agent, line.keys.context, line.keys.outcome];
    const outer = paidClaim === null ? outcomeClaims : [...outcomeClaims, paidClaim];
    const rings: FieldRing[] = [
        {name: "used by", total: agentClaims.length, claims: capped(agentClaims, keep)},
        {name: "in context of", total: contextClaims.length, claims: capped(contextClaims, keep)},
        {name: "has outcome", total: outer.length, claims: capped(outer, keep)},
    ];

    const readings: FieldReading[] = [];
    const agentCount = agentClaims.length;
    const reader = agentClaims.find((claim) => claim.key !== line?.keys.agent) ?? agentClaims[0];
    if (reader !== undefined) {
        readings.push({
            kind: "useful",
            claimKey: reader.key,
            text: `${reader.label} uses it · ${agentCount === 1 ? "the one agent so far" : `one of ${agentCount} agents`}`,
        });
    }
    const context = contextClaims[0];
    if (context !== undefined) {
        readings.push({
            kind: "for what",
            claimKey: context.key,
            text: `in context of ${context.label} · ${plural(context.positions, "wallet", "wallets")}`,
        });
    }
    const failure = outcomeClaims.find((claim) => claim.label.startsWith("failed"));
    const working = failure ?? outcomeClaims[0];
    if (working !== undefined) {
        readings.push({
            kind: "working",
            claimKey: working.key,
            text: `${working.label} · ${plural(working.positions, "wallet", "wallets")}`,
        });
    }
    if (paidClaim !== null) {
        readings.push({
            kind: "paid",
            claimKey: paidClaim.key,
            text: `its files name ${paidClaim.label} · no position`,
        });
    }
    // Only a reading whose claim is drawn can be pointed at by the loupe.
    const drawn = new Set(rings.flatMap((ring) => ring.claims.map((claim) => claim.key)));

    return {
        tool: {atomId: tool.atomId, name, label: tool.label},
        rings,
        line,
        agents: agentCount,
        readings: readings.filter((reading) => drawn.has(reading.claimKey)),
    };
}

/* -------------------------------------------------------------------------- */
/* The reads                                                                  */
/* -------------------------------------------------------------------------- */

export type LandingFieldChain = {graphqlUrl: string};

/**
 * ARP's line vocabulary, read once. An atom's id is `calculateAtomId` of its data and does not
 * depend on the chain, so it is read from testnet 13579, where ARP's line words were made.
 */
export type LineVocabulary = {
    rpcUrl: string;
    chainId: number;
    multiVault: Address;
    inContextOf: Hex;
    payers: readonly string[];
};

export type LandingFieldReads = {
    listTools: typeof listTools;
    getPulseUsage: typeof getPulseUsage;
    hiddenAtomIds: (graphqlUrl: string) => Promise<ReadonlySet<string>>;
    vocabularyIds: (vocabulary: LineVocabulary) => Promise<{hasOutcome: string; because: string}>;
};

export async function readVocabularyIds(
    vocabulary: LineVocabulary,
): Promise<{hasOutcome: string; because: string}> {
    const reads = multiVaultReads({
        address: vocabulary.multiVault,
        chainId: vocabulary.chainId,
        rpcUrl: vocabulary.rpcUrl,
    });
    const [hasOutcome, because] = await Promise.all([
        reads.atomId(stringToHex(HAS_OUTCOME_LABEL)),
        reads.atomId(stringToHex(BECAUSE_LABEL)),
    ]);
    return {hasOutcome, because};
}

/**
 * The tool and its claims. **The listing or the hiding failing fails the whole read**, so the
 * page says "the graph did not answer" rather than drawing ARP's own tests; the lines failing
 * leaves the agents by id and nothing else.
 */
export async function loadLandingField(
    chain: LandingFieldChain,
    vocabulary: LineVocabulary,
    reads: LandingFieldReads,
): Promise<{tool: ToolListing | null; hidden: ReadonlySet<string>; usage: PulseUsage | null}> {
    const [page, hidden] = await Promise.all([
        reads.listTools({graphqlUrl: chain.graphqlUrl, order: "declarations"}),
        reads.hiddenAtomIds(chain.graphqlUrl),
    ]);
    const tool = mostDeclaredTool(page.tools, hidden)?.listing ?? null;
    if (tool === null) return {tool, hidden, usage: null};
    let usage: PulseUsage | null;
    try {
        const ids = await reads.vocabularyIds(vocabulary);
        const read = await reads.getPulseUsage([tool.atomId], {
            graphqlUrl: chain.graphqlUrl,
            inContextOf: vocabulary.inContextOf,
            hasOutcome: ids.hasOutcome,
            because: ids.because,
            payers: vocabulary.payers,
        });
        usage = read.get(lower(tool.atomId)) ?? null;
    } catch {
        usage = null;
    }
    return {tool, hidden, usage};
}

/**
 * Words naming a paid service in the skill's own `SKILL.md`, read from GitHub. `[]` for anything
 * that is not a skill, or when GitHub does not answer: the reading is left out, never guessed.
 */
export async function readPaidWords(label: string | null): Promise<string[]> {
    const parsed = parseToolLabel(label);
    if (parsed.kind !== "skill") return [];
    try {
        const pulse = await readPulse(
            {
                source: `${parsed.owner}/${parsed.repo}`,
                skill: parsed.skill,
                installs: null,
                installsText: null,
                url: null,
            },
            githubPulseSource(),
        );
        return "paidWords" in pulse ? pulse.paidWords : [];
    } catch {
        return [];
    }
}
