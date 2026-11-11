import type {GraphqlTransport} from "@arp-protocol/graphql";
import {BaseError, ContractFunctionRevertedError, multicall3Abi} from "viem";
import {describe, expect, it} from "vitest";

import {ChainUnreadableError, isContractRevert, isTransactionAbsent} from "../src/chain-errors.js";
import {domainInText, resolveDomain, suggestNodes, type DomainWords} from "../src/domain-words.js";
import {getTermLabels} from "../src/term-labels.js";
import {
    assertPublishableToolUrl,
    publishableToolUrl,
    ToolUrlCarriesValuesError,
} from "../src/tool-url-values.js";
import {INTUITION_URL} from "./helpers.js";

describe("getTermLabels", () => {
    it("asks nothing for no ids", async () => {
        let asked = 0;
        const transport: GraphqlTransport = {
            async request() {
                asked += 1;
                return {};
            },
        };
        expect((await getTermLabels([], {graphqlUrl: INTUITION_URL, transport})).size).toBe(0);
        expect(asked).toBe(0);
    });

    it("names atoms and complete triples, deduping ids case-insensitively and skipping the rest", async () => {
        const seen: unknown[] = [];
        const transport: GraphqlTransport = {
            async request(_query, variables) {
                seen.push(variables["ids"]);
                return {
                    terms: [
                        "junk",
                        {atom: {label: "no id"}},
                        {id: "0xA", atom: {label: " slither "}},
                        {
                            id: "0xB",
                            atom: {},
                            triple: {
                                subject: {label: " a "},
                                predicate: {label: "uses"},
                                object: {label: "b "},
                            },
                        },
                        {
                            id: "0xC",
                            triple: {subject: {label: "a"}, predicate: null, object: {label: "b"}},
                        },
                        {id: "0xD"},
                    ],
                };
            },
        };
        const labels = await getTermLabels(["0xA", "0xa", "0xB", "0xC", "0xD"], {
            graphqlUrl: INTUITION_URL,
            transport,
        });
        expect(seen).toEqual([["0xa", "0xb", "0xc", "0xd"]]);
        expect([...labels.entries()]).toEqual([
            ["0xa", {kind: "atom", label: "slither"}],
            ["0xb", {kind: "triple", subject: "a", predicate: "uses", object: "b"}],
        ]);
    });

    it("survives an answer with no terms list", async () => {
        const transport: GraphqlTransport = {request: async () => ({terms: null})};
        expect((await getTermLabels(["0xa"], {graphqlUrl: INTUITION_URL, transport})).size).toBe(0);
    });
});

describe("publishableToolUrl, the remaining refusals", () => {
    it("refuses a GitHub URL with a fragment and offers it without", () => {
        expect(publishableToolUrl("https://github.com/a/b#readme")).toMatchObject({
            ok: false,
            listable: "https://github.com/a/b",
        });
    });

    it("refuses a URL that cannot be an endpoint, with nothing to list instead", () => {
        expect(publishableToolUrl("ftp://x")).toMatchObject({ok: false, listable: null});
    });

    it("names a fragment, a personal path segment, and a bare flag", () => {
        expect(publishableToolUrl("https://example.com/mcp?a=1#f")).toEqual({
            ok: false,
            why: "it carries a value for a and a fragment",
            listable: "https://example.com/mcp?a=",
        });
        expect(
            publishableToolUrl("https://example.com/u/0123456789abcdef0123456789abcdef"),
        ).toMatchObject({
            ok: false,
            why: "it carries a path segment or name that looks personal",
        });
        expect(publishableToolUrl("https://example.com/mcp?flag")).toMatchObject({
            ok: false,
            why: "it carries a value",
        });
    });

    it("throws without echoing the URL, and with nothing to list when there is none", () => {
        expect(() => assertPublishableToolUrl("https://example.com/mcp")).not.toThrow();
        try {
            assertPublishableToolUrl("ftp://secret-host");
            expect.unreachable();
        } catch (error) {
            expect(error).toBeInstanceOf(ToolUrlCarriesValuesError);
            expect(error instanceof ToolUrlCarriesValuesError && error.listable).toBeNull();
            expect(error instanceof Error && error.message.endsWith("remove it.")).toBe(true);
        }
    });
});

describe("chain-errors", () => {
    it("reads a viem revert error as a revert", () => {
        const revert = new ContractFunctionRevertedError({
            abi: multicall3Abi,
            functionName: "aggregate3",
        });
        const wrapped = new BaseError("call failed", {cause: revert});
        expect(isContractRevert(wrapped)).toBe(true);
    });

    it("reads a plain execution-reverted message as a revert, down the cause chain", () => {
        expect(isContractRevert(new Error("outer", {cause: new Error("execution reverted")}))).toBe(
            true,
        );
        expect(isContractRevert(new BaseError("timeout"))).toBe(false);
        expect(isContractRevert("execution reverted")).toBe(false);
    });

    it("does not read an arbitrary error as a missing transaction", () => {
        expect(isTransactionAbsent(new Error("x"))).toBe(false);
        expect(isTransactionAbsent(new BaseError("x"))).toBe(false);
    });

    it("keeps only the first line of an Error cause and stringifies anything else", () => {
        expect(new ChainUnreadableError("a receipt", new Error("refused\nstack")).message).toBe(
            "could not read a receipt: refused",
        );
        const odd = new ChainUnreadableError("a receipt", 42);
        expect(odd.message).toBe("could not read a receipt: 42");
        expect(odd.cause).toBe(42);
        expect(odd.name).toBe("ChainUnreadableError");
    });
});

describe("domain-words", () => {
    const words: DomainWords = {
        labels: ["presentation authoring", "payment", "card payment", "data"],
        aliases: {
            slides: "presentation authoring",
            "card checkout": "card payment",
            ghost: "not a node",
        },
    };

    it("resolves a label, an alias, and suggests for an unknown word", () => {
        expect(resolveDomain("Payment", words)).toEqual({
            status: "node",
            label: "payment",
            via: "label",
        });
        expect(resolveDomain("slides", words)).toEqual({
            status: "node",
            label: "presentation authoring",
            via: "alias",
        });
        expect(resolveDomain("ghost", words)).toMatchObject({status: "unknown", word: "ghost"});
    });

    it("suggests nothing for a word with no tokens", () => {
        expect(suggestNodes("-", words)).toEqual([]);
    });

    it("ranks shared tokens first, an alias above a bare label, then shorter labels, then by name", () => {
        expect(suggestNodes("card", words)).toEqual(["card payment"]);
        expect(suggestNodes("payment", words)).toEqual(["payment", "card payment"]);
        expect(suggestNodes("checkout", words)).toEqual(["card payment"]);
        expect(suggestNodes("dat", words)).toEqual(["data"]);
        const tie: DomainWords = {labels: ["bb", "aa"], aliases: {}};
        expect(suggestNodes("aabb", tie)).toEqual(["aa", "bb"]);
    });

    it("finds a node in a sentence, the longest label first, else an alias, else nothing", () => {
        expect(domainInText("help with card payment please", words)).toBe("card payment");
        expect(domainInText("make my slides", words)).toBe("presentation authoring");
        expect(domainInText("a ghost story", words)).toBeNull();
    });
});
