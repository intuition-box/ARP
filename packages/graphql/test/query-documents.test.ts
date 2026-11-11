import {describe, expect, it} from "vitest";

import * as graphql from "../src/index.js";
import {backerBreadthQuery, termActivityQuery} from "../src/queries/term-shape.js";

/**
 * Every query document the package exports, by its export name. A document is a string an indexer
 * parses, so what a caller can rely on without a live endpoint is its shape: one operation,
 * balanced delimiters, and variables that match what the operation declares — an undeclared or
 * unused variable is a validation error on any GraphQL server.
 */
const documents: [string, string][] = Object.entries(graphql).filter(
    (entry): entry is [string, string] => entry[0].endsWith("_QUERY") && typeof entry[1] === "string",
);

function declaredVariables(document: string): Set<string> {
    const open = document.indexOf("(");
    const brace = document.indexOf("{");
    if (open === -1 || open > brace) return new Set();
    const header = document.slice(open, document.indexOf(")", open));
    return new Set([...header.matchAll(/\$(\w+)\s*:/g)].map((match) => match[1] ?? ""));
}

function usedVariables(document: string): Set<string> {
    const body = document.slice(document.indexOf("{"));
    return new Set([...body.matchAll(/\$(\w+)/g)].map((match) => match[1] ?? ""));
}

function balanced(document: string): boolean {
    const pairs: Record<string, string> = {"}": "{", ")": "(", "]": "["};
    const stack: string[] = [];
    let inString = false;
    for (const char of document) {
        if (char === '"') inString = !inString;
        if (inString) continue;
        if (char === "{" || char === "(" || char === "[") stack.push(char);
        else if (char in pairs && stack.pop() !== pairs[char]) return false;
    }
    return stack.length === 0 && !inString;
}

/**
 * Variables a document uses and leaves for its caller to declare. `RECENT_QUERY`'s `$curveId` is
 * spliced into the header by `packages/protocol/src/recent.ts` (the `RECENT_QUERY.replace` call),
 * so the document as exported is a template and not yet a valid operation.
 */
const CALLER_DECLARED: Record<string, string[]> = {RECENT_QUERY: ["curveId"]};

function checkShape(document: string, callerDeclared: string[] = []): void {
    expect(document.trim()).toMatch(/^query\b/);
    expect(balanced(document)).toBe(true);
    expect([...usedVariables(document)].sort()).toEqual(
        [...declaredVariables(document), ...callerDeclared].sort(),
    );
}

describe("every exported query document", () => {
    it("is found", () => {
        expect(documents.length).toBeGreaterThan(30);
    });

    it.each(documents)("%s is one well-formed operation whose variables match its declaration", (name, document) => {
        checkShape(document, CALLER_DECLARED[name]);
    });
});

describe("backerBreadthQuery", () => {
    it("binds one alias to one variable per account", () => {
        const document = backerBreadthQuery(3);
        checkShape(document);
        expect([...declaredVariables(document)]).toEqual(["a0", "a1", "a2"]);
        for (const index of [0, 1, 2]) {
            expect(document).toContain(
                `a${index}: positions_aggregate(where: {account_id: {_eq: $a${index}}})`,
            );
        }
    });
});

describe("termActivityQuery", () => {
    it("reads the named stats table under the alias rows", () => {
        const document = termActivityQuery("signal_stats_daily");
        checkShape(document);
        expect(document).toContain("rows: signal_stats_daily(");
    });
});
