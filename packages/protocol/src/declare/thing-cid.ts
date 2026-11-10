/**
 * A Thing's pinned bytes and its CID, with no dependency: the runtime hook ships without viem (ADR
 * `0145`) and builds a skill's atom URI from these with its own sha2-256 (task 99, ADR `0168`).
 * `agent-atom.ts` re-exports both and holds the recipe's doc.
 */
import type {AgentThing} from "./agent-atom.js";

/**
 * The exact bytes that get pinned: the schema.org wrapper, keys in **sorted** order, no whitespace.
 *
 * `JSON.stringify` is the reference implementation — it escapes the way the pinning API does, and it
 * leaves non-ASCII unescaped. A reimplementation in a language that escapes non-ASCII (Python's
 * `json.dumps` defaults to it) produces different bytes for a non-ASCII name and therefore a
 * different atom.
 */
export function thingDocument(thing: AgentThing): string {
    return JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Thing",
        description: thing.description,
        image: thing.image,
        name: thing.name,
        url: thing.url,
    });
}

/** RFC 4648 base32, lowercase, unpadded — the multibase `b` alphabet. Fifteen lines beats a dependency. */
function base32(bytes: Uint8Array): string {
    const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
    let bits = 0;
    let value = 0;
    let out = "";
    for (const byte of bytes) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
    return out;
}

/**
 * `agent-atom.ts`'s `thingUri` from the sha2-256 digest of {@link thingDocument}'s bytes, hashed by the caller. The
 * runtime hook ships without viem (ADR `0145`), so it hashes with `node:crypto` and gets the same CID.
 */
export function thingUriOfDigest(digest: Uint8Array): string {
    const cid = new Uint8Array(4 + digest.length);
    cid.set([0x01, 0x55, 0x12, 0x20]);
    cid.set(digest, 4);
    return `ipfs://b${base32(cid)}`;
}
