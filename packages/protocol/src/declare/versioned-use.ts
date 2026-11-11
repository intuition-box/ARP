import {stringToHex, type Hex} from "viem";

import {versionAtomLabel} from "../skill-version.js";
import {VERSION} from "../sources/intuition/terms.js";
import {encodeCreateAtom, encodeCreateTriple, type MultiVaultReads} from "./multivault.js";
import type {PreparedCall} from "./types.js";

/**
 * What a `uses` edge is about once the version is known (task 127, ADR `0192`): `V = (skill, version,
 * sha256:<digest>)`, created if it is not on chain, so that `T1 = (agent, uses, V)`. Signs and sends nothing.
 *
 * `V` is a fact about the skill's files, not anybody's claim, so no agent is asked to hold a position on it (its payer
 * holds the `minDeposit` it is created with): the positions that say "I used this" are on T1 and below.
 */
export type VersionedUsePlan = {
    /** The `sha256:<digest>` atom. */
    digestAtomId: Hex;
    /** `V`, the object T1 points at. */
    versionTripleId: Hex;
    /** The calls that create what is missing of the two, in order. Empty when both exist. */
    calls: PreparedCall[];
    totalValue: bigint;
};

export async function planVersionedUse(params: {tool: Hex; digest: string; reads: MultiVaultReads}): Promise<VersionedUsePlan> {
    const {reads} = params;
    const label = versionAtomLabel(params.digest);
    const data = stringToHex(label);
    const digestAtomId = await reads.atomId(data);
    const versionTripleId = await reads.tripleId(params.tool, VERSION, digestAtomId);
    const [atomOn, tripleOn, atomCost, tripleCost, minDeposit] = await Promise.all([
        reads.termExists(digestAtomId),
        reads.termExists(versionTripleId),
        reads.atomCost(),
        reads.tripleCost(),
        reads.minDeposit(),
    ]);
    const calls: PreparedCall[] = [];
    if (!atomOn) {
        const value = atomCost + minDeposit;
        calls.push({kind: "create-atom", chainId: reads.chainId, to: reads.address, value, data: encodeCreateAtom(data, value), why: `the version ${label}`});
    }
    if (!tripleOn) {
        const value = tripleCost + minDeposit;
        calls.push({
            kind: "create-triple",
            chainId: reads.chainId,
            to: reads.address,
            value,
            data: encodeCreateTriple(params.tool, VERSION, digestAtomId, value),
            why: `the skill has version ${label}`,
        });
    }
    return {digestAtomId, versionTripleId, calls, totalValue: calls.reduce((sum, call) => sum + call.value, 0n)};
}
