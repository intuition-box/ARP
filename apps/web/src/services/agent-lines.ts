import {
    getAgentLines,
    type AgentLines,
    type PulseDeclaration,
    type PulseUsageConfig,
} from "@arp-protocol/core";

import type {ClaimView, EdgeRow, GroupView} from "./atom-standing-view";
import type {LineVocabulary} from "./landing-field";
import {truncateMiddle} from "./trust-format";

/**
 * An agent's lines (task 95): who used it, and what it used, each with the domain and the outcome its
 * declarer wrote. They are read into the agent page's claim field, so the loupe says what a use was for
 * and how it went (the user, 2026-11-10: the field, not a second list). ARP's own test identities are
 * left out, as on every page.
 *
 * What a line says is what a wallet paid to write. It proves no use (`pulse-usage.ts`).
 */
export type AgentLinePart = {domain: string | null; outcome: string | null};

/** One `uses` edge and every line its declarers stand behind. */
export type AgentLineRow = {
    tripleId: string;
    atomId: string;
    /** The atom's raw label. */
    label: string | null;
    name: string;
    nameIsId: boolean;
    /** Wallets holding a position on the edge, as the index returned them. */
    positions: number;
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

/**
 * One row per edge. `getPulseUsage` gives one declaration per wallet, and the sponsoring service that
 * created a sponsored edge is one of them with nothing to say (ADR `0144`), so its row would read as a
 * second, empty use of the same thing.
 */
function rowsByEdge(
    entries: readonly {
        atom: {atomId: string; label: string | null};
        declaration: PulseDeclaration;
    }[],
): AgentLineRow[] {
    const byEdge = new Map<string, AgentLineRow>();
    for (const {atom, declaration} of entries) {
        const key = declaration.tripleId.toLowerCase();
        const row = byEdge.get(key) ?? {
            tripleId: declaration.tripleId,
            atomId: atom.atomId,
            label: atom.label,
            ...nameOf(atom),
            positions: declaration.holders?.length ?? 0,
            parts: [],
        };
        for (const part of partsOf(declaration)) {
            if (!row.parts.some((p) => p.domain === part.domain && p.outcome === part.outcome)) {
                row.parts.push(part);
            }
        }
        byEdge.set(key, row);
    }
    return [...byEdge.values()];
}

export function buildAgentLinesView(
    lines: AgentLines,
    hidden: ReadonlySet<string>,
): AgentLinesView {
    const visible = (atomId: string) => !hidden.has(atomId.toLowerCase());
    const usedBy = rowsByEdge(
        lines.usedBy.declarations
            .filter((declaration) => visible(declaration.agent.atomId))
            .map((declaration) => ({atom: declaration.agent, declaration})),
    );
    const used = rowsByEdge(
        lines.used
            .filter((line) => visible(line.tool.atomId))
            .map((line) => ({atom: line.tool, declaration: line.declaration})),
    );
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

/** What the loupe's card prints under the figure: `presentation · worked`, several joined. */
export function lineText(parts: readonly AgentLinePart[]): string | null {
    const words = parts
        .map((part) =>
            part.domain !== null && part.outcome !== null
                ? `${part.domain} · ${part.outcome}`
                : (part.domain ?? part.outcome),
        )
        .filter((word): word is string => word !== null);
    return words.length === 0 ? null : words.join(", ");
}

/**
 * The claim field's groups with the lines in them: each incoming `uses` dot carries its line, the ring
 * reads "used by", and a ring of what the agent used is added, read from this page's side.
 *
 * The outgoing ring's figure comes from the agent's own claims (`AtomView.claims`), so a dot is filled
 * only when that read shows something behind the edge.
 */
export function fieldGroups(
    groups: readonly GroupView[],
    claims: readonly ClaimView[],
    lines: AgentLinesView | undefined,
    usesId: string,
): GroupView[] {
    const isUses = (id: string) => id.toLowerCase() === usesId.toLowerCase();
    const lineOf = new Map(
        (lines?.usedBy ?? []).map((row) => [row.tripleId.toLowerCase(), lineText(row.parts)]),
    );
    const incoming = groups.map((group) =>
        isUses(group.predicateAtomId)
            ? {
                  ...group,
                  inverse: "used by",
                  rows: group.rows.map((row) => ({
                      ...row,
                      line: lineOf.get(row.tripleId.toLowerCase()) ?? null,
                  })),
              }
            : group,
    );
    const used = lines?.used ?? [];
    if (used.length === 0) return incoming;
    const backingOf = new Map(claims.map((claim) => [claim.tripleId.toLowerCase(), claim.backing]));
    const rows: EdgeRow[] = used.map((row) => {
        const backing = backingOf.get(row.tripleId.toLowerCase()) ?? null;
        return {
            tripleId: row.tripleId,
            name: row.name,
            nameIsId: row.nameIsId,
            subjectAtomId: row.atomId,
            label: row.label,
            backing,
            positions: backing === null ? 0 : row.positions,
            opposition: null,
            line: lineText(row.parts),
        };
    });
    return [
        ...incoming,
        {
            predicateAtomId: `${usesId}:out`,
            label: "uses",
            labelIsId: false,
            inverse: "uses",
            direction: "out",
            rows,
            backing: null,
            positions: 0,
        },
    ];
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
