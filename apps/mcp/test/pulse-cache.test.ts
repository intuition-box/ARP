import {mkdtempSync, readdirSync, statSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {describe, expect, it} from "vitest";

import {diskListingCache, memoryFileCache} from "../src/pulse-cache.js";

const listing = (files = 1) => ({
    rootTreeId: "root",
    files: Array.from({length: files}, (_, n) => ({path: `f${n}`, sha: `s${n}`, size: n})),
    trees: new Map([["dir", "tree"]]),
    truncated: false,
});

describe("a repository's file list on disk", () => {
    it("is kept a day, private to this user, and read back with the date it was read", async () => {
        const dir = join(mkdtempSync(join(tmpdir(), "arp-listing-")), "cache");
        let now = Date.parse("2026-11-11T00:00:00Z");
        const cache = diskListingCache(dir, () => now);
        await cache.set("a/b", listing());
        expect(statSync(dir).mode & 0o777).toBe(0o700);
        const [file] = readdirSync(dir);
        expect(statSync(join(dir, file ?? "")).mode & 0o777).toBe(0o600);
        expect(await cache.get("a/b")).toMatchObject({rootTreeId: "root", trees: new Map([["dir", "tree"]]), readAt: "2026-11-11T00:00:00.000Z"});
        now += 86_400_000;
        expect(await cache.get("a/b")).toBeNull();
        now -= 2 * 86_400_000;
        expect(await cache.get("a/b")).toBeNull();
    });

    it("is not kept when it is too long to be worth it", async () => {
        const dir = join(mkdtempSync(join(tmpdir(), "arp-listing-")), "cache");
        const cache = diskListingCache(dir);
        await cache.set("a/big", listing(20_001));
        expect(await cache.get("a/big")).toBeNull();
    });

    it("is read as absent when the file is damaged or not its shape", async () => {
        const dir = mkdtempSync(join(tmpdir(), "arp-listing-"));
        const cache = diskListingCache(dir);
        await cache.set("x/y", listing());
        const [file] = readdirSync(dir);
        const path = join(dir, file ?? "");
        const good = {readAt: new Date().toISOString(), rootTreeId: "r", files: [{path: "p", sha: "s", size: 1}], trees: [], truncated: false};
        for (const stored of ["{half", "null", "3", {...good, files: [null]}, {...good, files: [{path: "p", sha: "s"}]}, {...good, truncated: "no"}]) {
            writeFileSync(path, typeof stored === "string" ? stored : JSON.stringify(stored));
            expect(await cache.get("x/y")).toBeNull();
        }
        writeFileSync(path, JSON.stringify(good));
        expect(await cache.get("x/y")).toMatchObject({rootTreeId: "r"});
    });
});

describe("files read this process", () => {
    it("are kept ten minutes, then read again", () => {
        let now = 0;
        const cache = memoryFileCache(() => now);
        expect(cache.get("k")).toBeUndefined();
        cache.set("k", "text");
        cache.set("absent", null);
        expect(cache.get("k")).toBe("text");
        expect(cache.get("absent")).toBeNull();
        now = 10 * 60_000;
        expect(cache.get("k")).toBeUndefined();
    });

    it("hold at most two thousand, dropping the oldest", () => {
        const cache = memoryFileCache(() => 0);
        for (let n = 0; n <= 2_000; n += 1) cache.set(`k${n}`, String(n));
        expect(cache.get("k0")).toBeUndefined();
        expect(cache.get("k1")).toBe("1");
        expect(cache.get("k2000")).toBe("2000");
    });
});
