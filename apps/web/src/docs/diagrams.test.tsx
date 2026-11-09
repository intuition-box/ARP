import {readFileSync} from "node:fs";
import {resolve} from "node:path";

import mermaid from "mermaid";
import {describe, expect, it} from "vitest";

import {DOC_ENTRIES} from "./manifest";

// `happy-dom` gives `import.meta.url` an http scheme, so the path is taken from the working directory.
const DIR = resolve(process.cwd(), "public/docs");

/** Every diagram on every page parses, so none falls back to its source on the site. */
describe("the docs' diagrams", () => {
    const blocks = DOC_ENTRIES.flatMap((entry) =>
        [...readFileSync(resolve(DIR, `${entry.slug}.md`), "utf8").matchAll(/```mermaid\n([\s\S]*?)```/g)].map(
            (match, index) => ({name: `${entry.slug} #${index + 1}`, source: match[1]!}),
        ),
    );

    it("has diagrams", () => {
        expect(blocks.length).toBeGreaterThan(10);
    });

    it.each(blocks)("$name parses", async ({source}) => {
        await expect(mermaid.parse(source)).resolves.toBeTruthy();
    });
});
