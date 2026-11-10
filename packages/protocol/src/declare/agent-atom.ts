import {sha256, toBytes, type Hex} from "viem";

import {thingDocument, thingUriOfDigest} from "./thing-cid.js";

/** Pure, in their own module so the runtime hook can build a CID without viem (ADR `0145`, task 99). */
export {thingDocument, thingUriOfDigest};

/**
 * The canonical ERC-8004 agent atom, computed locally — **no credential, no network**.
 *
 * Measured 2026-10-20 against agent 8453:6649, whose atom Intuition's own ingestion minted. Its
 * `data` is `ipfs://bafkreif6xwptjdsux2iwnhdbxyjom23bzzimhk62y574rreexdghi6hlbq`; that CID was
 * retrieved from a third-party IPFS gateway, the 171 bytes behind it reproduced from the recipe
 * below, and the CID recomputed from those bytes — all three match.
 *
 * Why it matters more than it looks: the atom's id is derived from the **string** `ipfs://<cid>`, and
 * that string is a pure function of the agent's identity. So an agent can compute its own atom id
 * with no pinning key, no partner API and no request. Pinning is still needed for the document to be
 * *readable* — Intuition's indexer resolves the Thing's `name`, which is what `RESOLVE_AGENT_QUERY`
 * filters on — but it is **not** needed to know the id, to plan, or to create the atom. Pinning the
 * same bytes anywhere yields the same CID, so the gated partner API (ADR `0016`) is one pinning
 * service and not a gate on the path.
 */

/** The four fields the recipe takes. Everything else in the document is fixed. */
export type AgentThing = {
    name: string;
    description: string;
    image: string;
    url: string;
};

/**
 * `docs/07` Step A, verbatim. The fallbacks are part of the frozen recipe, not defaults to improve:
 * one differing character yields a different CID and therefore a duplicate, permanent, fragmented
 * atom, and Intuition has no deletion.
 */
export function canonicalAgentThing(
    chainId: number,
    tokenId: string,
    registration?: {name?: string; description?: string; image?: string; webEndpoint?: string},
): AgentThing {
    const normalize = (value?: string | null): string | null => {
        if (typeof value !== "string") return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    };
    const agentKey = `${chainId}:${tokenId}`;
    return {
        name: normalize(registration?.name) ?? `Agent ${agentKey}`,
        description: normalize(registration?.description) ?? `ERC-8004 agent ${agentKey}`,
        image: normalize(registration?.image) ?? "",
        url:
            normalize(registration?.webEndpoint) ??
            `https://8004scan.io/agents/${chainId}/${tokenId}`,
    };
}

/**
 * The CAIP-19 external-identifier Thing — the **object** of the `same as` edge.
 *
 * Read off mainnet, not inferred: the description is a fixed sentence. `RESOLVE_AGENT_QUERY` filters
 * on `object.value.thing.name == <caip19>`, so a differing character makes the agent unresolvable
 * rather than merely untidy.
 */
export function canonicalCaipThing(caip19: string): AgentThing {
    return {
        name: caip19,
        description:
            "CAIP-style external identifier atom for linking an Intuition atom to an ERC-8004 registry identity.",
        image: "",
        url: "",
    };
}

/**
 * `ipfs://<cid>` for a Thing — CIDv1, raw codec, sha2-256, base32.
 *
 * The four-byte prefix is the CID header: `0x01` version 1, `0x55` raw codec, `0x12` sha2-256,
 * `0x20` digest length. A `bafkrei…` CID is exactly this, which is why the whole thing is a hash of
 * the document and nothing else.
 */
export function thingUri(thing: AgentThing): string {
    return thingUriOfDigest(toBytes(sha256(toBytes(thingDocument(thing))) as Hex));
}
