import {keccak256, stringToBytes, type Hex} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {describe, expect, it} from "vitest";

import {lineRequestTypedData, signLineRequest, verifyLineRequest, type LineRequest} from "../src/sponsor/line.js";

// A fixed test key, generated for nothing and holding nothing.
const AGENT = privateKeyToAccount(`0x${"68".repeat(32)}`);
const NOW = 1_800_000_000;
const PAYMENT = `eip155:8453/tx/0x${"ef".repeat(32)}`;

const request = (over: Partial<LineRequest> = {}): LineRequest => ({
    agent: AGENT.address,
    agentRegistry: `eip155:13579:0x${"11".repeat(20)}`,
    agentId: "9",
    tool: `0x${"77".repeat(32)}` as Hex,
    domain: "",
    outcome: "failed",
    reason: "no-delivery",
    payment: PAYMENT,
    nonce: keccak256(stringToBytes("n")),
    expiresAt: NOW + 600,
    ...over,
});

describe("the line request, version 2 (ADR 0159)", () => {
    it("signs the payment it names", async () => {
        const signed = await signLineRequest(request(), 13579, AGENT);
        expect(await verifyLineRequest(signed, NOW)).toEqual({status: "valid", address: AGENT.address});
        const swapped = {...signed, request: {...signed.request, payment: `eip155:8453/tx/0x${"aa".repeat(32)}`}};
        expect((await verifyLineRequest(swapped, NOW)).status).toBe("mismatch");
        expect(lineRequestTypedData(request(), 13579).domain.version).toBe("2");
    });

    it("takes an empty payment, and refuses one in another spelling", async () => {
        expect((await verifyLineRequest(await signLineRequest(request({payment: ""}), 13579, AGENT), NOW)).status).toBe("valid");
        for (const payment of [PAYMENT.toUpperCase(), "eip155:8453 0xabc", "solana:mainnet/tx/abc"]) {
            expect(await verifyLineRequest(await signLineRequest(request({payment}), 13579, AGENT), NOW)).toMatchObject({status: "malformed"});
        }
    });
});
