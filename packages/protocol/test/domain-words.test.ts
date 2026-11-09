import {readFileSync} from "node:fs";

import {describe, expect, it} from "vitest";

import {normaliseCategoryLabel} from "../src/declare/category.js";
import {domainInText, resolveDomain, suggestNodes} from "../src/domain-words.js";

const oasf = JSON.parse(readFileSync(new URL("../../../data/catalogue/oasf-1.1.0-skills.json", import.meta.url), "utf8")) as {
    skills: {caption: string}[];
};
const table = JSON.parse(readFileSync(new URL("../../../data/catalogue/domain-aliases.json", import.meta.url), "utf8")) as {
    aliases: Record<string, string>;
};
const labels = [...oasf.skills.map((n) => normaliseCategoryLabel(n.caption)), "design"];
const words = {labels, aliases: table.aliases};

describe("the alias table", () => {
    it("points every alias at a node of the tree", () => {
        const dangling = Object.entries(table.aliases).filter(([, label]) => !labels.includes(label));
        expect(dangling).toEqual([]);
    });
});

describe("the aliases the testnet tree can answer", () => {
    it("counts those whose node is written on 13579, so the figure in ADR 0155 is printed, not kept by hand", () => {
        const written = new Set(
            (JSON.parse(readFileSync(new URL("../../../data/catalogue/skill-nodes-13579.json", import.meta.url), "utf8")) as {nodes: string[]}).nodes,
        );
        const reach = Object.values(table.aliases).filter((label) => written.has(label)).length;
        expect(reach).toBe(85);
        expect(Object.keys(table.aliases).length).toBe(106);
    });
});

describe("resolveDomain", () => {
    it("takes a node's own name, in any case", () => {
        expect(resolveDomain("Presentation Authoring", words)).toEqual({status: "node", label: "presentation authoring", via: "label"});
        expect(resolveDomain("video", words)).toMatchObject({status: "node", label: "video"});
    });

    it("takes a word people use for it", () => {
        expect(resolveDomain("slides", words)).toEqual({status: "node", label: "presentation authoring", via: "alias"});
        expect(resolveDomain("SEO", words)).toMatchObject({label: "search engine optimization"});
        expect(resolveDomain("ui", words)).toMatchObject({label: "design"});
    });

    it("refuses an unknown word with the nodes closest to it", () => {
        const answer = resolveDomain("presentation slides", words);
        expect(answer.status).toBe("unknown");
        if (answer.status === "unknown") expect(answer.suggestions).toContain("presentation authoring");
    });

    it("suggests nothing for a word that shares nothing", () => {
        expect(suggestNodes("zzzz", words)).toEqual([]);
    });
});

describe("domainInText", () => {
    it("finds a node, then an alias, in a sentence", () => {
        expect(domainInText("make a slide deck for the board", words)).toBe("presentation authoring");
        expect(domainInText("add subtitles to this clip", words)).toBe("video editing");
        expect(domainInText("text to speech for a podcast", words)).toBe("text to speech");
    });

    it("finds nothing in words that name no node", () => {
        expect(domainInText("hello there", words)).toBeNull();
    });
});
