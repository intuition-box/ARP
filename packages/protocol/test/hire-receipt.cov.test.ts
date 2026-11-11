import {getAddress, type Address, type Hex} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {describe, expect, it} from "vitest";

import {
    hireDigest,
    hireReceiptIsFor,
    hireReceiptTypedData,
    signHireReceipt,
    verifyHireReceipt,
    type HireReceipt,
    type SignedHireReceipt,
} from "../src/hire-receipt.js";

// A fixed test key, generated for nothing and holding nothing.
const AGENT = privateKeyToAccount(`0x${"11".repeat(32)}`);
const VERIFIER: Address = getAddress("0x00000000000000000000000000000000000e4f04");

const receipt: HireReceipt = {
    version: 2,
    agentRegistry: "eip155:13579:0xC165A2ADc0000000000000000000000000000001",
    agentId: "2",
    requester: AGENT.address,
    payment: `0x${"ab".repeat(32)}`,
    paid: "1",
    requestHash: hireDigest({a: 1}),
    resultHash: hireDigest({b: 2}),
    issuedAt: 1_793_000_000,
    termId: `0x${"7e".repeat(32)}`,
    expiresAt: 1_793_086_400,
};

const signed = (): Promise<SignedHireReceipt> =>
    signHireReceipt(
        receipt,
        {chainId: 13579, verifyingContract: VERIFIER},
        {
            address: AGENT.address,
            signTypedData: (data: ReturnType<typeof hireReceiptTypedData>) =>
                AGENT.signTypedData(data),
        },
    );

describe("verifyHireReceipt, an envelope out of shape", () => {
    it.each([
        ["an agent that is not an address", {agent: "0x12" as Address}, /agent is not an address/], // deliberately not an address
        ["a signature that is not hex", {signature: "signed" as Hex}, /signature is not hex/], // deliberately not hex
        ["a chain id of zero", {chainId: 0}, /chainId/],
        ["a chain id that is not whole", {chainId: 1.5}, /chainId/],
    ])("%s is malformed", async (_name, change, reason) => {
        const verdict = await verifyHireReceipt({...(await signed()), ...change});
        expect(verdict.status === "malformed" && verdict.reason).toMatch(reason);
    });

    it.each([
        ["an agent id that is not decimal", {agentId: "two"}, /agentId is not a decimal/],
        ["a negative issue time", {issuedAt: -1}, /issuedAt/],
        ["a requester that is not an address", {requester: "nobody" as Address}, /requester/], // deliberately not an address
    ])("%s is malformed", async (_name, change, reason) => {
        const original = await signed();
        const verdict = await verifyHireReceipt({
            ...original,
            receipt: {...original.receipt, ...change},
        });
        expect(verdict.status === "malformed" && verdict.reason).toMatch(reason);
    });

    it("says malformed, with the reason, for a signature that cannot be recovered", async () => {
        const verdict = await verifyHireReceipt({...(await signed()), signature: "0x1234"});
        expect(verdict.status).toBe("malformed");
        expect(verdict.status === "malformed" && verdict.reason.length > 0).toBe(true);
    });
});

describe("hireReceiptIsFor, a verifier that is not an address", () => {
    it("refuses it", async () => {
        expect(hireReceiptIsFor(await signed(), "0x12" as Address, receipt.issuedAt)).toEqual({
            ok: false,
            reason: "verifyingContract is not an address",
        }); // deliberately not an address
    });
});
