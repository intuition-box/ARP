import {describe, expect, it} from "vitest";

import {LEGAL_SLUGS, legalDetailsFrom, legalDocs} from "../legal";

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

    it("with nothing set, identifies nobody, shows no blank, and sends contact to GitHub issues", () => {
        const text = JSON.stringify(legalDocs({}));
        expect(text).not.toMatch(/\[[^[\]"]*\]/);
        expect(text).not.toMatch(/@/);
        expect(text).not.toMatch(/"Host"/);
        expect(text).toContain("https://github.com/intuition-box/ARP/issues");
    });

    it("prints what was set, when it is set", () => {
        const text = JSON.stringify(legalDocs(legalDetailsFrom(FILLED)));
        for (const value of Object.values(FILLED)) expect(text).toContain(value);
    });

    it("counts an empty or blank variable as unset", () => {
        expect(legalDetailsFrom({...FILLED, VITE_LEGAL_HOST_PHONE: "  "}).hostPhone).toBeUndefined();
    });

    it("names no publisher", () => {
        const notice = JSON.stringify(legalDocs(legalDetailsFrom(FILLED))["legal-notice"]);
        expect(notice).toContain("a private individual, on a non-professional basis");
        expect(notice).not.toMatch(/Publication director/);
    });
});
