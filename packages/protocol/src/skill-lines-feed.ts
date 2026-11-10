/**
 * The skill lines feed (task 102, ADR `0171`): what agents wrote about each skill, shaped for a registry
 * or a marketplace that reads it beside its own listing. Pure: it shapes a usage read
 * (`pulse-usage.ts`) and touches no network.
 *
 * **No free text reaches the file.** Every field is an address, an id, a word from a closed list, a
 * name that passed its shape check (ADR `0166`), or a domain that is a node of ARP's tree. A domain
 * outside the tree is written `null` and counted, an agent label not of the form `Agent <chain>:<id>`
 * is written `null`, so a label somebody typed on chain never travels through this file.
 *
 * **A line is a declaration, not a proof of use** (`docs/28`, `docs/30`). The feed says who wrote what
 * and leaves the counting to the reader.
 */
import {skillRefFromUrl} from "./content-path.js";
import type {PulseUsage} from "./pulse-usage.js";

export const SKILL_LINES_SCHEMA = "arp.skill-lines/1";

export const SKILL_LINES_NOTE =
    "Each line is one wallet's public declaration about one skill, written on Intuition. It is the writer's word: " +
    "nothing in it proves the use happened. ARP's own ranking counts an outcome only once 3 distinct wallets say it " +
    "(ADR 0143); this feed lists every line and leaves the counting to the reader. Lines marked arp_test are ARP's own rehearsals.";

export type SkillLineRecord = {
    /** The wallet that declared, never one of the payers. */
    writer: string;
    /** The subject's atom: the agent the line is about. */
    agent_atom: string;
    /** `Agent <chain>:<id>` when the subject reads so, else `null`. */
    agent: string | null;
    /** A node of ARP's domain tree, or `null`. */
    domain: string | null;
    /** `null` when the wallet named a use, or a domain, and no outcome. */
    outcome: "worked" | "failed" | null;
    reasons: string[];
    needs: string[];
    with: string[];
    declared_at: string | null;
    /** The writer is one of ARP's own wallets, or the agent one of its test identities. */
    arp_test: boolean;
};

export type SkillLinesEntry = {
    url: string;
    repo: string;
    skill: string;
    atom_id: string;
    /** Distinct writers, and those outside ARP's own tests. Not a count of people. */
    wallets: number;
    wallets_outside_arp: number;
    by_outcome: Record<string, number>;
    by_reason: Record<string, number>;
    by_need: Record<string, number>;
    by_with: Record<string, number>;
    lines: SkillLineRecord[];
};

export type SkillLinesFeed = {
    schema: typeof SKILL_LINES_SCHEMA;
    generated_at: string;
    trace: {chain: string; graphql: string};
    note: string;
    skills: SkillLinesEntry[];
    skipped: {count: number; reasons: Record<string, number>};
    truncated: boolean;
};

export type SkillLinesInput = {
    /** Each skill atom read, with the URL it names. */
    tools: readonly {atomId: string; url: string}[];
    /** `getPulseUsage`'s answer, keyed by lower-cased atom id. */
    usage: ReadonlyMap<string, PulseUsage>;
    /** Every node of ARP's domain tree. */
    domains: ReadonlySet<string>;
    /** ARP's own wallets: the deployer, the operator, the sponsor, its test wallets. */
    arpWallets: readonly string[];
    /**
     * Wallets that pay for a line and say nothing by it (ADR `0144`). `getPulseUsage` keeps their row
     * because they did create the edge; here it is not a line, so it is left out and counted.
     */
    payers: readonly string[];
    /** ARP's test identities on the chain the lines are on: `Agent <chain>:<id>` with id in `from..to`. */
    testAgents: {chainId: number; from: number; to: number};
    trace: {chain: string; graphql: string};
    generatedAt: string;
};

const AGENT_LABEL = /^Agent ([0-9]{1,10}):([0-9]{1,20})$/;

export function buildSkillLinesFeed(input: SkillLinesInput): SkillLinesFeed {
    const ours = new Set(input.arpWallets.map((wallet) => wallet.toLowerCase()));
    const payers = new Set(input.payers.map((wallet) => wallet.toLowerCase()));
    const skipped: Record<string, number> = {};
    const skip = (why: string) => {
        skipped[why] = (skipped[why] ?? 0) + 1;
    };
    const isTestAgent = (label: string | null) => {
        const match = label === null ? null : AGENT_LABEL.exec(label);
        if (match === null) return false;
        const id = Number(match[2]);
        return Number(match[1]) === input.testAgents.chainId && id >= input.testAgents.from && id <= input.testAgents.to;
    };
    const inTree = (domain: string | null) => {
        if (domain === null) return null;
        if (input.domains.has(domain)) return domain;
        skip("domain outside ARP's tree, written null");
        return null;
    };
    let truncated = false;
    const skills: SkillLinesEntry[] = [];
    for (const tool of input.tools) {
        const ref = skillRefFromUrl(tool.url);
        if (ref === null) {
            skip("not a skill URL");
            continue;
        }
        const usage = input.usage.get(tool.atomId.toLowerCase());
        if (usage === undefined || usage.declarations.length === 0) continue;
        truncated = truncated || usage.truncated;
        const lines: SkillLineRecord[] = [];
        for (const declaration of usage.declarations) {
            if (payers.has(declaration.writer.toLowerCase())) {
                skip("an edge a payer created, which says nothing");
                continue;
            }
            const label = declaration.agent.label;
            const agent = label !== null && AGENT_LABEL.test(label) ? label : null;
            const base = {
                writer: declaration.writer,
                agent_atom: declaration.agent.atomId,
                agent,
                declared_at: declaration.declaredAt,
                arp_test: ours.has(declaration.writer.toLowerCase()) || isTestAgent(label),
            };
            if (declaration.lines.length > 0) {
                for (const line of declaration.lines) {
                    lines.push({
                        ...base,
                        domain: inTree(line.domain),
                        outcome: line.outcome,
                        reasons: [...line.reasons],
                        needs: [...(line.needs ?? [])],
                        with: [...(line.with ?? [])],
                    });
                }
            } else {
                const domains = declaration.domains.length > 0 ? declaration.domains : [null];
                for (const domain of domains) {
                    lines.push({...base, domain: inTree(domain), outcome: null, reasons: [], needs: [], with: []});
                }
            }
            if (agent === null && label !== null) skip("agent label not of the form Agent <chain>:<id>, written null");
        }
        if (lines.length === 0) continue;
        const count = (values: Iterable<string>) => {
            const out: Record<string, number> = {};
            for (const value of values) out[value] = (out[value] ?? 0) + 1;
            return out;
        };
        const writers = new Set(lines.map((line) => line.writer.toLowerCase()));
        const outside = new Set(lines.filter((line) => !line.arp_test).map((line) => line.writer.toLowerCase()));
        skills.push({
            url: `https://github.com/${ref.repo}?skill=${encodeURIComponent(ref.skill)}`,
            repo: ref.repo,
            skill: ref.skill,
            atom_id: tool.atomId,
            wallets: writers.size,
            wallets_outside_arp: outside.size,
            by_outcome: count(lines.flatMap((line) => (line.outcome === null ? [] : [line.outcome]))),
            by_reason: count(lines.flatMap((line) => line.reasons)),
            by_need: count(lines.flatMap((line) => line.needs)),
            by_with: count(lines.flatMap((line) => line.with)),
            lines,
        });
    }
    skills.sort((a, b) => a.url.localeCompare(b.url));
    return {
        schema: SKILL_LINES_SCHEMA,
        generated_at: input.generatedAt,
        trace: input.trace,
        note: SKILL_LINES_NOTE,
        skills,
        skipped: {count: Object.values(skipped).reduce((sum, n) => sum + n, 0), reasons: skipped},
        truncated,
    };
}
