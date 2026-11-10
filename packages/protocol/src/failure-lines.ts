/**
 * What agents wrote about a skill, read at the moment it failed on this machine (task 99, ADR `0168`).
 *
 * The runtime hook records a failure locally first, then asks the index for that one skill's lines and
 * hands the agent the facts beside the error: how many wallets wrote `failed` and what they said was
 * missing, how many wrote `worked` and what they added. No verdict, and no score: the count of wallets
 * is what ARP orders on everywhere else (ADR `0135`), and a line is what a wallet paid to write.
 *
 * **What leaves the machine is the skill's identity and nothing else**: its atom URI, which is a hash
 * of its public GitHub URL, and the vocabulary's own words. Never the command, its output, a path or
 * the person's words. `apps/hook/test/failure-answer.test.ts` checks every request body for that.
 *
 * Imported **by path** by the hook, which ships with no dependency (ADR `0145`): every binding used
 * here must stay free of viem. The CID is built from a digest the caller computes for that reason.
 */
import {skillRefFromUrl} from "./content-path.js";
import {NEEDS_LABEL, WITH_LABEL} from "./declare/line-need.js";
import {thingDocument, thingUriOfDigest} from "./declare/thing-cid.js";
import {toolThing} from "./declare/tool-thing.js";
import {BECAUSE_LABEL, HAS_OUTCOME_LABEL} from "./declare/usage-words.js";
import {findToolAtoms, getPulseUsage, type PulseUsage, type PulseUsageConfig} from "./pulse-usage.js";

/** A skill's GitHub URL, as `arp_pulse` computes it (`toolUriOf`), or `null` when the source is not `owner/repo`. */
export function skillUrlOf(source: string, skill: string): string | null {
    if (!/^[\w.-]+\/[\w.-]+$/.test(source)) return null;
    const name = skill.split(":").pop() ?? skill;
    const url = `https://github.com/${source}?skill=${encodeURIComponent(name)}`;
    return skillRefFromUrl(url) === null ? null : url;
}

/**
 * The skill's atom URI (`toolAtomUri`), with the sha2-256 of a UTF-8 text the caller's runtime provides,
 * and its label as the index shows it.
 */
export function skillAtom(url: string, sha256: (text: string) => Uint8Array): {uri: string; label: string} {
    const thing = toolThing(url);
    return {uri: thingUriOfDigest(sha256(thingDocument(thing))), label: thing.name};
}

export type SkillLinesConfig = Pick<PulseUsageConfig, "graphqlUrl" | "inContextOf" | "payers" | "fetch" | "timeoutMs" | "transport">;

/**
 * The lines on one skill, or `null` when nothing can be read: the skill has no atom, or the chain has
 * no `has outcome` or `because` atom, so no line could exist. One query finds the skill's atom and the
 * four predicates by their data, which is what an atom's id hashes, so no chain read is needed.
 */
export async function readSkillLines(atomUri: string, config: SkillLinesConfig): Promise<PulseUsage | null> {
    const words = [HAS_OUTCOME_LABEL, BECAUSE_LABEL, NEEDS_LABEL, WITH_LABEL];
    const atoms = await findToolAtoms([atomUri, ...words], config);
    const tool = atoms.get(atomUri);
    const hasOutcome = atoms.get(HAS_OUTCOME_LABEL);
    const because = atoms.get(BECAUSE_LABEL);
    if (tool === undefined || hasOutcome === undefined || because === undefined) return null;
    const needs = atoms.get(NEEDS_LABEL);
    const withId = atoms.get(WITH_LABEL);
    const usage = await getPulseUsage([tool], {
        ...config,
        hasOutcome,
        because,
        ...(needs === undefined ? {} : {needs}),
        ...(withId === undefined ? {} : {with: withId}),
    });
    return usage.get(tool.toLowerCase()) ?? null;
}

/** `name (n)` for each entry, the largest first, ties by name. */
function counted(counts: Map<string, Set<string>>): string {
    return [...counts.entries()]
        .sort(([a, x], [b, y]) => y.size - x.size || a.localeCompare(b))
        .map(([name, wallets]) => `${name} (${wallets.size})`)
        .join(", ");
}

const plural = (n: number) => `${n} wallet${n === 1 ? "" : "s"}`;

/**
 * One sentence of facts for the agent, or `null` when no wallet wrote an outcome. Counts are distinct
 * wallets: a wallet that wrote about two agents counts once.
 *
 * ```
 * ARP, lines agents wrote on github.com/a/b?skill=gadget (Intuition testnet 13579): 3 wallets wrote
 * failed · because missing-program (2), missing-key (1) · needs ffmpeg (2); 2 wallets wrote worked · with ffmpeg (2).
 * ```
 */
export function linesSentence(usage: PulseUsage | null, label: string, where: string): string | null {
    if (usage === null) return null;
    const parts: string[] = [];
    for (const outcome of ["failed", "worked"] as const) {
        const wallets = new Set<string>();
        const because = new Map<string, Set<string>>();
        const named = new Map<string, Set<string>>();
        const add = (to: Map<string, Set<string>>, name: string, wallet: string) => to.set(name, (to.get(name) ?? new Set()).add(wallet));
        for (const row of usage.declarations) {
            const wallet = row.writer.toLowerCase();
            for (const line of row.lines) {
                if (line.outcome !== outcome) continue;
                wallets.add(wallet);
                for (const reason of line.reasons) add(because, reason, wallet);
                for (const name of (outcome === "failed" ? line.needs : line.with) ?? []) add(named, name, wallet);
            }
        }
        if (wallets.size === 0) continue;
        const detail = [
            ...(because.size === 0 ? [] : [`because ${counted(because)}`]),
            ...(named.size === 0 ? [] : [`${outcome === "failed" ? "needs" : "with"} ${counted(named)}`]),
        ];
        parts.push([`${usage.truncated ? "at least " : ""}${plural(wallets.size)} wrote ${outcome}`, ...detail].join(" · "));
    }
    if (parts.length === 0) return null;
    return `ARP, lines agents wrote on ${label} (${where}): ${parts.join("; ")}.`;
}
