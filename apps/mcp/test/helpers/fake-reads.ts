import {encodePacked, keccak256, type Address, type Hex} from "viem";

import type {MultiVaultReads, ToolAtomCandidate, ToolAtomLookup} from "@arp-protocol/core";

/** The MultiVault the fake answers for. Every prepared call is addressed to it. */
export const FAKE_MULTI_VAULT: Address = "0x00000000000000000000000000000000000000aa";

export type FakeState = {
    /** Term ids the fake chain says exist, lower case. */
    existing?: Set<string>;
    /** Every term exists, which is what a fully written line looks like. */
    allExist?: boolean;
    /** `sharesOf` answer for every account and term. */
    shares?: bigint;
    chainId?: number;
};

/**
 * A MultiVault reader with no transport: ids are hashes of their inputs, costs are fixed, and a
 * term exists when the test put it in `existing`. It stands where the RPC would.
 */
export function fakeReads(state: FakeState = {}): MultiVaultReads {
    const existing = state.existing ?? new Set<string>();
    return {
        address: FAKE_MULTI_VAULT,
        chainId: state.chainId ?? 13579,
        atomId: async (data: Hex) => keccak256(data),
        tripleId: async (s: Hex, p: Hex, o: Hex) => keccak256(encodePacked(["bytes32", "bytes32", "bytes32"], [s, p, o])),
        counterTripleId: async (t: Hex) => keccak256(t),
        termExists: async (id: Hex) => state.allExist === true || existing.has(id.toLowerCase()),
        atomCost: async () => 1_000n,
        tripleCost: async () => 2_000n,
        defaultCurveId: async () => 1n,
        sharesOf: async () => state.shares ?? 0n,
        previewRedeem: async (_t: Hex, _c: bigint, shares: bigint) => ({assetsAfterFees: shares / 2n, sharesUsed: shares}),
        minDeposit: async () => 100n,
        previewAtomCreate: async (_t: Hex, assets: bigint) => ({shares: assets, assetsAfterFixedFees: assets, assetsAfterFees: assets}),
        previewTripleCreate: async (_t: Hex, assets: bigint) => ({shares: assets, assetsAfterFixedFees: assets, assetsAfterFees: assets}),
        previewDeposit: async (_t: Hex, _c: bigint, assets: bigint) => ({shares: assets, assetsAfterFees: assets}),
    };
}

/** A tool-atom lookup that knows no atom, or the ones a test hands it. */
export function fakeLookup(found: Record<string, ToolAtomCandidate[]> = {}): ToolAtomLookup {
    return {findByUrl: async (url: string) => found[url] ?? []};
}

/** The JSON a tool's text content carries, as `rpc.ts`'s `text` writes it. */
export async function answerOf(response: Response): Promise<Record<string, unknown>> {
    const body = (await response.json()) as {result?: {content?: {text: string}[]}; error?: unknown}; // the JSON-RPC envelope
    if (body.error !== undefined) return {error: body.error};
    return JSON.parse(body.result?.content?.[0]?.text ?? "{}") as Record<string, unknown>; // the server's own JSON
}

/** The JSON-RPC error a refused call carries. */
export async function errorOf(response: Response): Promise<{code: number; message: string}> {
    const body = (await response.json()) as {error?: {code: number; message: string}}; // the JSON-RPC envelope
    if (body.error === undefined) throw new Error("expected an error, got a result");
    return body.error;
}
