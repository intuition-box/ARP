import {BECAUSE_LABEL, HAS_OUTCOME_LABEL, multiVaultReads} from "@arp-protocol/core";
import {stringToHex, type Address, type Hex} from "viem";

/**
 * The shape the landing's claim field draws (task 81, ADR `0152`), and ARP's line vocabulary.
 *
 * **The landing reads nothing** (task 133, ADR `0197`, the user, 2026-11-11): its one field is
 * `landing-sample.ts`'s, a static illustration, and this module only types it. The vocabulary read
 * below is the agent page's (`hooks/use-agent-lines.ts`), which kept it when the landing's reads
 * were removed.
 */

/**
 * The most dots drawn on one ring of the landing's field. **Fewer is the point** (the user:
 * « on n'a pas besoin d'autant de points ») — the panel states the rest, as `ClaimField` states
 * what `MAX_DOTS_PER_RING` leaves out.
 */
export const LANDING_DOTS_PER_RING = 6;

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
    /** How many agents declared the tool. */
    agents: number;
    readings: FieldReading[];
};

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
