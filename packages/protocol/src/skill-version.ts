/**
 * A skill's version, and where it hangs (task 127, ADR `0192`, amending ADR `0185`).
 *
 * The version is ADR `0185`'s: sha256 over the manifest of the skill's whole directory (`bundleManifest`), the
 * digest a content receipt already signs. It hangs from the skill, not from the line:
 *
 * ```
 * V  = (skill, version, sha256:<digest>)
 * T1 = (agent, uses, V)            when the version is known; (agent, uses, skill) otherwise
 * ```
 *
 * So every line on one version meets on one term, and a reader rolls it up to the skill through `V`'s subject.
 * A new digest starts at zero; lines on earlier versions stay where they are.
 *
 * **Pure and dependency-free**, so the runtime hook can import it by path (ADR `0145`).
 */

/** The prefix of a version's atom: the hash function named, so the label cannot be read as a term id. */
export const VERSION_LABEL_PREFIX = "sha256:";

const DIGEST = /^0x[0-9a-f]{64}$/;
const LABEL = /^sha256:([0-9a-f]{64})$/;

/** A directory digest as a line request carries it: `0x` and 64 lower-case hex characters. */
export function isVersionDigest(value: unknown): value is `0x${string}` {
    return typeof value === "string" && DIGEST.test(value);
}

/** The version atom's label for a digest: `sha256:<64 hex>`. Throws on anything but a lower-case digest. */
export function versionAtomLabel(digest: string): string {
    if (!isVersionDigest(digest)) throw new Error(`${digest} is not a sha256 digest, 0x and 64 lower-case hex`);
    return `${VERSION_LABEL_PREFIX}${digest.slice(2)}`;
}

/** The digest a version atom's label names, `0x`-prefixed, or `null` for any other label. */
export function digestOfVersionLabel(label: string | null | undefined): `0x${string}` | null {
    const match = label === null || label === undefined ? null : LABEL.exec(label);
    return match === null ? null : `0x${match[1]}`;
}

/** The directory's manifest, as `bundleManifest` writes it, from each file's path and sha256 in hex. */
export function manifestOfHashes(files: readonly {path: string; sha256: string}[]): string {
    return [...files]
        .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
        .map((file) => `${file.sha256}  ${file.path}\n`)
        .join("");
}
