import {keccak256, stringToBytes, type Hex} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {describe, expect, it} from "vitest";

import {lineRequestTypedData, signLineRequest, verifyLineRequest, type LineRequest} from "../src/sponsor/line.js";

// A fixed test key, generated for nothing and holding nothing.
const AGENT = privateKeyToAccount(`0x${"68".repeat(32)}`);
const NOW = 1_800_000_000;
const PAYMENT = `eip155:8453/tx/0x${"ef".repeat(32)}`;
const CALLED = "http://www.seller.example/api/?b=2&a=1";

const request = (over: Partial<LineRequest> = {}): LineRequest => ({
    agent: AGENT.address,
    agentRegistry: `eip155:13579:0x${"11".repeat(20)}`,
    agentId: "9",
    tool: `0x${"77".repeat(32)}` as Hex,
    domain: "",
    outcome: "failed",
    reason: "no-delivery",
    payment: PAYMENT,
    endpoint: CALLED,
    nonce: keccak256(stringToBytes("n")),
    expiresAt: NOW + 600,
    ...over,
});

describe("the line request, version 3 (ADRs 0159, 0162)", () => {
    it("signs the payment it names", async () => {
        const signed = await signLineRequest(request(), 13579, AGENT);
        expect(await verifyLineRequest(signed, NOW)).toEqual({status: "valid", address: AGENT.address});
        const swapped = {...signed, request: {...signed.request, payment: `eip155:8453/tx/0x${"aa".repeat(32)}`}};
        expect((await verifyLineRequest(swapped, NOW)).status).toBe("mismatch");
        expect(lineRequestTypedData(request(), 13579).domain.version).toBe("3");
    });

    it("signs the exact URL called, as typed", async () => {
        const signed = await signLineRequest(request(), 13579, AGENT);
        const canonical = {...signed, request: {...signed.request, endpoint: "https://seller.example/api?a=1&b=2"}};
        expect((await verifyLineRequest(canonical, NOW)).status).toBe("mismatch");
    });

    it("asks a payment for its exact URL, and refuses an endpoint without a payment", async () => {
        for (const endpoint of ["", "seller.example/api", "ftp://seller.example", "http://seller.example/a b", `https://x.example/${"a".repeat(512)}`]) {
            expect(await verifyLineRequest(await signLineRequest(request({endpoint}), 13579, AGENT), NOW)).toMatchObject({status: "malformed"});
        }
        expect(await verifyLineRequest(await signLineRequest(request({payment: ""}), 13579, AGENT), NOW)).toMatchObject({
            status: "malformed",
            reason: "an endpoint only follows a payment",
        });
    });

    it("no longer verifies a version 2 request, which signed no endpoint", async () => {
        const {endpoint: _dropped, ...v2} = request();
        const data = lineRequestTypedData(request(), 13579);
        const signature = await AGENT.signTypedData({
            domain: {...data.domain, version: "2"},
            types: {LineRequest: data.types.LineRequest.filter((field) => field.name !== "endpoint")},
            primaryType: "LineRequest",
            message: {...v2, expiresAt: BigInt(v2.expiresAt)},
        });
        expect(await verifyLineRequest({request: v2, chainId: 13579, signature}, NOW)).toMatchObject({status: "malformed", reason: "endpoint"});
        const withEndpoint = {request: request(), chainId: 13579, signature};
        expect((await verifyLineRequest(withEndpoint, NOW)).status).toBe("mismatch");
    });

    it("takes an empty payment, and refuses one in another spelling", async () => {
        expect((await verifyLineRequest(await signLineRequest(request({payment: "", endpoint: ""}), 13579, AGENT), NOW)).status).toBe("valid");
        for (const payment of [PAYMENT.toUpperCase(), "eip155:8453 0xabc", "solana:mainnet/tx/abc"]) {
            expect(await verifyLineRequest(await signLineRequest(request({payment}), 13579, AGENT), NOW)).toMatchObject({status: "malformed"});
        }
    });
});
