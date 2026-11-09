import {readFileSync, readdirSync} from "node:fs";

import {describe, expect, it} from "vitest";

import {headingId} from "../services/docs";

import {buildLlmsFull, buildLlmsIndex} from "./llms";
import {DOC_ENTRIES, DOC_SECTIONS} from "./manifest";

const DIR = new URL("../../public/docs/", import.meta.url);
const read = (slug: string) => readFileSync(new URL(`${slug}.md`, DIR), "utf8");

describe("the docs", () => {
    it("has one file per manifest entry, and no file the manifest does not list", () => {
        const files = readdirSync(DIR).filter((name) => name.endsWith(".md")).map((name) => name.slice(0, -3));
        expect(files.sort()).toEqual(DOC_ENTRIES.map((entry) => entry.slug).sort());
    });

    it("starts every page with its title", () => {
        for (const entry of DOC_ENTRIES) expect(read(entry.slug).split("\n")[0]).toBe(`# ${entry.title}`);
    });

    it("links only to pages that exist", () => {
        const slugs = new Set(DOC_ENTRIES.map((entry) => entry.slug));
        for (const entry of DOC_ENTRIES) {
            for (const match of read(entry.slug).matchAll(/\]\(\/docs\/([a-z-]+)/g)) {
                expect(slugs, `${entry.slug} links to /docs/${match[1]}`).toContain(match[1]);
            }
        }
    });
});

describe("the docs' section links", () => {
    /** A heading's text as the page renders it: no backticks, no link syntax. */
    const plain = (heading: string) => heading.replace(/`/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
    const ids = (slug: string) =>
        new Set([...read(slug).matchAll(/^#{2,3} (.+)$/gm)].map((match) => headingId(plain(match[1]!))));

    it("land on a heading that exists", () => {
        for (const entry of DOC_ENTRIES) {
            for (const match of read(entry.slug).matchAll(/\]\((?:\/docs\/([a-z-]+))?#([^)]+)\)/g)) {
                const target = match[1] ?? entry.slug;
                expect(ids(target), `${entry.slug} links to ${target}#${match[2]}`).toContain(match[2]);
            }
        }
    });
});

describe("llms.txt", () => {
    it("lists every page by its raw URL", () => {
        const index = buildLlmsIndex(DOC_SECTIONS);
        for (const entry of DOC_ENTRIES) expect(index).toContain(`(/docs/${entry.slug}.md)`);
    });

    it("holds every page's text in the full file", () => {
        const full = buildLlmsFull(DOC_SECTIONS, read);
        for (const entry of DOC_ENTRIES) expect(full).toContain(read(entry.slug).trim());
    });
});
