import {
    getAgentLines,
    type AgentLines,
    type PulseDeclaration,
    type PulseUsageConfig,
} from "@arp-protocol/core";

import type {LineVocabulary} from "./landing-field";
import {truncateMiddle} from "./trust-format";

/**
 * The agent page's lines (task 95): who used this agent, and what it used, each with the domain and the
 * outcome its declarer wrote. ARP's own test identities are left out, as on every page.
 *
 * What a row says is what a wallet paid to write. It proves no use (`pulse-usage.ts`).
 */
export type AgentLinePart = {domain: string | null; outcome: string | null};

export type AgentLineRow = {
    key: string;
    atomId: string;
    name: string;
    nameIsId: boolean;
    parts: AgentLinePart[];
};

export type AgentLinesView = {
    usedBy: AgentLineRow[];
    used: AgentLineRow[];
    /** The domains named on either side, most named first. */
    contexts: string[];
    /** A read stopped at its limit: the lists are a floor. */
    truncated: boolean;
};

function nameOf(atom: {atomId: string; label: string | null}): {name: string; nameIsId: boolean} {
    const label = atom.label?.trim() ?? "";
    return label.length > 0
        ? {name: label, nameIsId: false}
        : {name: truncateMiddle(atom.atomId, 6, 4), nameIsId: true};
}

function outcomeWord(outcome: string, reasons: readonly string[]): string {
    return outcome === "failed" && reasons.length > 0 ? `failed: ${reasons.join(", ")}` : outcome;
}

/** One declaration's domains and outcomes, as the declarer wrote them. A domain with no outcome stays. */
function partsOf(declaration: PulseDeclaration): AgentLinePart[] {
    const parts: AgentLinePart[] = declaration.lines.map((line) => ({
        domain: line.domain,
        outcome: outcomeWord(line.outcome, line.reasons),
    }));
    for (const domain of declaration.domains) {
        if (!parts.some((part) => part.domain === domain)) parts.push({domain, outcome: null});
    }
    return parts;
}

function row(
    atom: {atomId: string; label: string | null},
    declaration: PulseDeclaration,
): AgentLineRow {
    return {
        key: `${declaration.tripleId}:${declaration.writer.toLowerCase()}`,
        atomId: atom.atomId,
        ...nameOf(atom),
        parts: partsOf(declaration),
    };
}

export function buildAgentLinesView(
    lines: AgentLines,
    hidden: ReadonlySet<string>,
): AgentLinesView {
    const visible = (atomId: string) => !hidden.has(atomId.toLowerCase());
    const usedBy = lines.usedBy.declarations
        .filter((declaration) => visible(declaration.agent.atomId))
        .map((declaration) => row(declaration.agent, declaration));
    const used = lines.used
        .filter((line) => visible(line.tool.atomId))
        .map((line) => row(line.tool, line.declaration));
    const counts = new Map<string, number>();
    for (const entry of [...usedBy, ...used]) {
        for (const domain of new Set(entry.parts.map((part) => part.domain))) {
            if (domain !== null) counts.set(domain, (counts.get(domain) ?? 0) + 1);
        }
    }
    const contexts = [...counts]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([domain]) => domain);
    return {usedBy, used, contexts, truncated: lines.truncated};
}

export type AgentLinesReads = {
    getAgentLines: typeof getAgentLines;
    hiddenAtomIds: (graphqlUrl: string) => Promise<ReadonlySet<string>>;
    vocabularyIds: (vocabulary: LineVocabulary) => Promise<{hasOutcome: string; because: string}>;
};

export async function loadAgentLines(
    atomId: string,
    chain: {graphqlUrl: string},
    vocabulary: LineVocabulary,
    reads: AgentLinesReads,
): Promise<AgentLinesView> {
    const [ids, hidden] = await Promise.all([
        reads.vocabularyIds(vocabulary),
        reads.hiddenAtomIds(chain.graphqlUrl),
    ]);
    const config: PulseUsageConfig = {
        graphqlUrl: chain.graphqlUrl,
        inContextOf: vocabulary.inContextOf,
        hasOutcome: ids.hasOutcome,
        because: ids.because,
        payers: vocabulary.payers,
    };
    return buildAgentLinesView(await reads.getAgentLines(atomId, config), hidden);
}
