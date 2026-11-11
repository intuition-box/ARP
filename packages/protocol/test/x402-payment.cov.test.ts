import {describe, expect, it} from "vitest";

import {X402_DEFAULT_NETWORKS} from "../src/arp/x402-networks.js";
import {checkX402Payment, x402NetworksFrom, x402Policy, x402Reading} from "../src/x402-payment.js";
import {FIXTURE, PAYER, recordedReads, TX, type Fixture} from "./x402-fixture.js";

const policy = x402Policy(X402_DEFAULT_NETWORKS);
const ref = {network: "eip155:8453", txHash: TX};

describe("checkX402Payment, what it refuses before and after reading", () => {
    it("refuses a hash that is not a transaction's, without asking the chain", async () => {
        const reads = {
            getTransactionReceipt: async () => {
                throw new Error("asked");
            },
            getBlock: async () => ({timestamp: 0n}),
        };
        expect(
            await checkX402Payment({ref: {...ref, txHash: "0x12"}, payers: [PAYER], policy, reads}),
        ).toEqual({
            status: "refused",
            reason: "0x12 is not a transaction hash",
        });
    });

    it("refuses a transfer that moves nothing", async () => {
        const zero: Fixture = {
            ...FIXTURE,
            receipt: {
                ...FIXTURE.receipt,
                logs: FIXTURE.receipt.logs.map((log) =>
                    log.data.length === 66 ? {...log, data: `0x${"0".repeat(64)}`} : log,
                ),
            },
        };
        expect(
            await checkX402Payment({ref, payers: [PAYER], policy, reads: recordedReads(zero)}),
        ).toEqual({status: "refused", reason: "the transfer moves nothing"});
    });

    it("says unreadable when the block cannot be read", async () => {
        const reads = {
            ...recordedReads(),
            getBlock: async () => {
                throw new Error("fetch failed");
            },
        };
        expect((await checkX402Payment({ref, payers: [PAYER], policy, reads})).status).toBe(
            "unreadable",
        );
    });

    it("refuses terms on another network", async () => {
        const terms = {network: "eip155:84532", asset: PAYER, payTo: PAYER, amount: 1n};
        expect(
            await checkX402Payment({ref, payers: [PAYER], policy, reads: recordedReads(), terms}),
        ).toEqual({
            status: "refused",
            reason: "the terms are on eip155:84532, the payment on eip155:8453",
        });
    });
});

describe("x402NetworksFrom, an added network", () => {
    it("takes the default RPC for a network it already knows, and keeps an asset it already has", () => {
        const [[network, entry]] = [...X402_DEFAULT_NETWORKS] as [
            [string, {assets: readonly string[]; rpcUrl: string}],
        ]; // the default table holds Base
        const table = x402NetworksFrom(X402_DEFAULT_NETWORKS, {
            ARP_X402_NETWORKS: `${network}=${entry.assets[0]}`,
        });
        expect(table.get(network)).toEqual({assets: [...entry.assets], rpcUrl: entry.rpcUrl});
    });
});

describe("x402Reading", () => {
    it("makes one client per network, takes an RPC from the environment, and refuses a network it does not have", () => {
        const reading = x402Reading(X402_DEFAULT_NETWORKS, {
            ARP_X402_RPC_8453: "http://127.0.0.1:8545",
        });
        const first = reading.readsFor("eip155:8453");
        expect(reading.readsFor("eip155:8453")).toBe(first);
        expect(() => reading.readsFor("eip155:1")).toThrow(/eip155:1 is not configured/);
        expect([...reading.policy.keys()]).toEqual(["eip155:8453"]);
    });
});
