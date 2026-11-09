import {describe, expect, it} from "vitest";

import {LEGAL_SLUGS, LEGAL_VARIABLES, legalDetailsFrom, legalDocs, remainingPlaceholders} from "../legal";

const FILLED = {
    VITE_LEGAL_HOST_NAME: "Example Host",
    VITE_LEGAL_HOST_ADDRESS: "1 Example Street, Example City",
    VITE_LEGAL_HOST_PHONE: "+00 0 00 00 00 00",
    VITE_LEGAL_CONTACT_EMAIL: "contact@example.org",
    VITE_LEGAL_LOG_RETENTION: "for 30 days",
};

describe("the legal pages (task 74)", () => {
    it("has one page per slug, each with a title and at least one section", () => {
        const docs = legalDocs({});
        for (const slug of LEGAL_SLUGS) {
            expect(docs[slug].title.length).toBeGreaterThan(0);
            expect(docs[slug].sections.length).toBeGreaterThan(0);
        }
    });

    it("is in English: no French accent left in any page", () => {
        expect(JSON.stringify(legalDocs({}))).not.toMatch(/[àâçéèêëîïôûùüÿœÀÉ]/);
    });

    it("prints one blank per unset variable, naming it, and that is what blocks a release build", () => {
        const left = new Set(remainingPlaceholders({}));
        expect([...left].sort()).toEqual(
            Object.values(LEGAL_VARIABLES)
                .map((name) => `[${name} TO BE COMPLETED]`)
                .sort(),
        );
    });

    it("has no blank left once every variable is set, and prints what was set", () => {
        const details = legalDetailsFrom(FILLED);
        expect(remainingPlaceholders(details)).toEqual([]);
        const text = JSON.stringify(legalDocs(details));
        for (const value of Object.values(FILLED)) expect(text).toContain(value);
    });

    it("counts an empty or blank variable as unset", () => {
        expect(legalDetailsFrom({...FILLED, VITE_LEGAL_HOST_PHONE: "  "}).hostPhone).toBeUndefined();
        expect(remainingPlaceholders(legalDetailsFrom({...FILLED, VITE_LEGAL_HOST_PHONE: ""}))).toEqual([
            "[VITE_LEGAL_HOST_PHONE TO BE COMPLETED]",
        ]);
    });

    it("misses no bracketed blank: every [ … ] in the text is one the release check sees", () => {
        // A blank worded so that the pattern skips it would go online printed as is.
        const text = JSON.stringify(legalDocs({}));
        const brackets = text.match(/\[[^[\]"]*\]/g) ?? [];
        expect([...brackets].sort()).toEqual([...remainingPlaceholders({})].sort());
    });

    it("names no publisher: the legal notice says the host holds the identity", () => {
        const notice = JSON.stringify(legalDocs(legalDetailsFrom(FILLED))["legal-notice"]);
        expect(notice).toContain("the publisher's identity is not shown here");
        expect(notice).not.toMatch(/Publication director/);
    });
});
