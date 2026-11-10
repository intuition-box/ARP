import {
    BECAUSE_LABEL,
    getPulseUsage,
    githubPulseSource,
    HAS_OUTCOME_LABEL,
    multiVaultReads,
    readPulse,
    toolAtomUri,
    type PulseUsage,
    type SkillPulse,
} from "@arp-protocol/core";
import {stringToHex, type Address, type Hex} from "viem";

import {entryOfContains, HEAD_REF, type SkillContentsEntry} from "./skill-contents";

export type PulseChain = {
    chainId: number;
    multiVault: Address;
    rpcUrl: string;
    graphqlUrl: string;
    inContextOf: Hex;
    /** The sponsoring service's wallet: it pays for a line and says nothing by it (ADR `0144`). */
    linePayers: readonly string[];
};

export type PulseView = {pulse: SkillPulse; atomId: Hex | null; usage: PulseUsage | null};

/**
 * What the pulse read of a skill's files, in the skill page's Contains shape (task 104). `null` when
 * no file was read: the page already says so, and "not read" twice is noise.
 */
export function pulseContentsEntry(pulse: SkillPulse): SkillContentsEntry | null {
    if (pulse.status !== "read" && pulse.status !== "read_file_only") return null;
    const slash = pulse.path.lastIndexOf("/");
    return entryOfContains(pulse.contains, slash === -1 ? "" : pulse.path.slice(0, slash), HEAD_REF);
}

/**
 * One skill's pulse: what GitHub shows of its files and what wallets wrote about it (task 63).
 *
 * The two reads fail apart. A chain or graph read that fails leaves `usage` null, which the page says
 * is unknown; it is never shown as "nobody declared", and it does not cost the file's facts.
 */
export async function loadPulse(source: string, skill: string, chain: PulseChain): Promise<PulseView> {
    const pulse = await readPulse(
        {source, skill, installs: null, installsText: null, url: null},
        githubPulseSource(),
    ).catch((): SkillPulse => ({source, skill, installs: null, installsText: null, url: null, status: "repository_unreachable"}));
    try {
        const reads = multiVaultReads({address: chain.multiVault, chainId: chain.chainId, rpcUrl: chain.rpcUrl});
        const url = `https://github.com/${source}?skill=${encodeURIComponent(skill)}`;
        const atomId = await reads.atomId(stringToHex(toolAtomUri(url)));
        const read = await getPulseUsage([atomId], {
            graphqlUrl: chain.graphqlUrl,
            inContextOf: chain.inContextOf,
            hasOutcome: await reads.atomId(stringToHex(HAS_OUTCOME_LABEL)),
            because: await reads.atomId(stringToHex(BECAUSE_LABEL)),
            payers: chain.linePayers,
        });
        return {pulse, atomId, usage: read.get(atomId.toLowerCase()) ?? null};
    } catch {
        return {pulse, atomId: null, usage: null};
    }
}
