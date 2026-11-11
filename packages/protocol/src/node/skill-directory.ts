import {createHash} from "node:crypto";
import {lstatSync, readdirSync, readFileSync} from "node:fs";
import {join} from "node:path";

import {manifestOfHashes} from "../skill-version.js";

/**
 * A skill's version where it is installed (task 127, ADR `0192`): the digest of its directory as ADR `0185` and
 * `bundleManifest` compute it, sha256 over one `<sha256 hex>  <path>` line per file, sorted by path, from the files
 * on this machine. The sponsor writes it only when it is a published one, so a local edit gets no version.
 *
 * **Node builtins only**, so the runtime hook imports it by path (ADR `0145`). Symbolic links and anything that is
 * not a regular file are left out, as GitHub's tree lists blobs. `null` past the content server's caps (300 files,
 * 8 MiB), or when the directory cannot be read: no version rather than a wrong one.
 */
const MAX_FILES = 300;
const MAX_TOTAL = 8 * 1_048_576;

export function skillDirectoryDigest(directory: string): `0x${string}` | null {
    const files: {path: string; sha256: string}[] = [];
    let total = 0;
    const walk = (dir: string, prefix: string): boolean => {
        for (const name of readdirSync(dir)) {
            const full = join(dir, name);
            const path = prefix === "" ? name : `${prefix}/${name}`;
            const stat = lstatSync(full);
            if (stat.isDirectory()) {
                if (!walk(full, path)) return false;
            } else if (stat.isFile()) {
                total += stat.size;
                if (files.length >= MAX_FILES || total > MAX_TOTAL) return false;
                files.push({path, sha256: createHash("sha256").update(readFileSync(full)).digest("hex")});
            }
        }
        return true;
    };
    try {
        if (!walk(directory, "")) return null;
    } catch {
        return null;
    }
    if (files.length === 0) return null;
    return `0x${createHash("sha256").update(manifestOfHashes(files)).digest("hex")}`;
}
