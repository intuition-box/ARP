import {keccak256, stringToBytes, type Hex} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {describe, expect, it} from "vitest";

import {
    signListToolRequest,
    verifyListToolRequest,
    type ListToolRequest,
} from "../src/sponsor/list-tool.js";
import {
    signMintGasRequest,
    verifyMintGasRequest,
    type MintGasRequest,
} from "../src/sponsor/mint-gas.js";
import {
    SPONSOR_REQUEST_VERSION,
    signSponsorRequest,
    verifySponsorRequest,
    type SignedSponsorRequest,
    type SponsorRequest,
} from "../src/sponsor/request.js";

// A fixed test key, generated for nothing and holding nothing.
const HOLDER = privateKeyToAccount(`0x${"68".repeat(32)}`);
const NOW = 1_800_000_000;
const NONCE = keccak256(stringToBytes("nonce"));

type Fields = Record<string, unknown>;

/** What a verifier is sent over the wire: a signed request with some fields replaced. */
function tampered(signed: object, request: Fields, outer: Fields = {}): Fields {
    const original: Fields = {...signed};
    return {
        ...original,
        request: {...(typeof original.request === "object" ? original.request : {}), ...request},
        ...outer,
    };
}

describe("verifyMintGasRequest, a request out of shape", () => {
    const base: MintGasRequest = {address: HOLDER.address, nonce: NONCE, expiresAt: NOW + 600};

    it.each<[string, Fields, Fields, string]>([
        ["no request", {}, {request: null}, "no request"],
        ["an address that is not one", {address: "0x12"}, {}, "address is not an address"],
        ["a short nonce", {nonce: "0x1234"}, {}, "nonce is not bytes32"],
        ["a fractional expiry", {expiresAt: 1.5}, {}, "expiresAt is not a unix timestamp"],
        ["a negative expiry", {expiresAt: -1}, {}, "expiresAt is not a unix timestamp"],
        ["a chain id of zero", {}, {chainId: 0}, "chainId is not a chain id"],
        ["a chain id as a string", {}, {chainId: "13579"}, "chainId is not a chain id"],
        ["a signature that is not hex", {}, {signature: "signed"}, "signature is not hex"],
    ])("refuses %s", async (_name, request, outer, reason) => {
        const signed = await signMintGasRequest(base, 13579, HOLDER);
        expect(await verifyMintGasRequest(tampered(signed, request, outer), NOW)).toEqual({
            status: "malformed",
            reason,
        });
    });

    it("refuses a value that is not an object", async () => {
        expect(await verifyMintGasRequest("signed", NOW)).toEqual({
            status: "malformed",
            reason: "no request",
        });
    });

    it("says malformed, with a reason, for a signature that cannot be recovered", async () => {
        const signed = await signMintGasRequest(base, 13579, HOLDER);
        const verdict = await verifyMintGasRequest({...signed, signature: "0x1234"}, NOW);
        expect(verdict.status === "malformed" && verdict.reason.length > 0).toBe(true);
    });
});

describe("verifyListToolRequest, a request out of shape", () => {
    const base: ListToolRequest = {
        address: HOLDER.address,
        url: "https://github.com/o/r",
        nonce: NONCE,
        expiresAt: NOW + 600,
    };

    it.each<[string, Fields, Fields, string]>([
        ["no request", {}, {request: "x"}, "no request"],
        ["an address that is not one", {address: 7}, {}, "address is not an address"],
        ["an empty url", {url: ""}, {}, "url is not a string"],
        ["a url that is not a string", {url: 1}, {}, "url is not a string"],
        ["a nonce that is not hex", {nonce: "z".repeat(66)}, {}, "nonce is not bytes32"],
        [
            "an expiry that is not a number",
            {expiresAt: "soon"},
            {},
            "expiresAt is not a unix timestamp",
        ],
        ["a negative chain id", {}, {chainId: -1}, "chainId is not a chain id"],
        ["a missing signature", {}, {signature: undefined}, "signature is not hex"],
    ])("refuses %s", async (_name, request, outer, reason) => {
        const signed = await signListToolRequest(base, 13579, HOLDER);
        expect(await verifyListToolRequest(tampered(signed, request, outer), NOW)).toEqual({
            status: "malformed",
            reason,
        });
    });

    it("refuses null", async () => {
        expect(await verifyListToolRequest(null, NOW)).toEqual({
            status: "malformed",
            reason: "no request",
        });
    });

    it("says malformed, with a reason, for a signature that cannot be recovered", async () => {
        const signed = await signListToolRequest(base, 13579, HOLDER);
        const verdict = await verifyListToolRequest({...signed, signature: "0xdead"}, NOW);
        expect(verdict.status === "malformed" && verdict.reason.length > 0).toBe(true);
    });
});

describe("verifySponsorRequest, a request out of shape", () => {
    const base: SponsorRequest = {
        version: SPONSOR_REQUEST_VERSION,
        agent: HOLDER.address,
        agentRegistry: "eip155:13579:0xC165A2ADc0000000000000000000000000000001",
        agentId: "2",
        termId: keccak256(stringToBytes("term")),
        proof: keccak256(stringToBytes("proof")),
        nonce: NONCE,
        expiresAt: NOW + 600,
    };

    /** A verifier takes JSON from the network; this is that JSON, typed as what it claims to be. */
    const asSent = (value: Fields): SignedSponsorRequest =>
        // The verifier checks every field it reads; these tests send fields that fail those checks.
        value as unknown as SignedSponsorRequest;

    it.each<[string, Fields, Fields, string]>([
        ["no request", {}, {request: null}, "no request"],
        ["an unknown version", {version: 99}, {}, "unknown version 99"],
        ["an agent that is not an address", {agent: "agent"}, {}, "agent is not an address"],
        [
            "a registry not in CAIP form",
            {agentRegistry: "13579:0x1"},
            {},
            "agentRegistry is not eip155:<chainId>:<address>",
        ],
        [
            "an agent id that is not decimal",
            {agentId: "0x2"},
            {},
            "agentId is not a decimal integer",
        ],
        ["a short term id", {termId: "0x12"}, {}, "termId is not bytes32"],
        ["a proof that is not a string", {proof: 5}, {}, "proof is not bytes32"],
        ["a short nonce", {nonce: "0x"}, {}, "nonce is not bytes32"],
        ["a negative expiry", {expiresAt: -5}, {}, "expiresAt is not a unix timestamp"],
        ["a fractional chain id", {}, {chainId: 1.5}, "chainId is not a chain id"],
        ["a signature that is not hex", {}, {signature: "nope"}, "signature is not hex"],
    ])("refuses %s", async (_name, request, outer, reason) => {
        const signed = await signSponsorRequest(base, 13579, HOLDER);
        expect(await verifySponsorRequest(asSent(tampered(signed, request, outer)), NOW)).toEqual({
            status: "malformed",
            reason,
        });
    });

    it("says expired at the expiry, and malformed for a signature that cannot be recovered", async () => {
        const expired = await signSponsorRequest({...base, expiresAt: NOW}, 13579, HOLDER);
        expect(await verifySponsorRequest(expired, NOW)).toEqual({
            status: "expired",
            expiresAt: NOW,
        });
        const signed = await signSponsorRequest(base, 13579, HOLDER);
        const broken: Hex = "0xabcd";
        const verdict = await verifySponsorRequest({...signed, signature: broken}, NOW);
        expect(verdict.status === "malformed" && verdict.reason.length > 0).toBe(true);
    });
});
