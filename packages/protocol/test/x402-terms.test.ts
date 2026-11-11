import {getAddress} from "viem";
import {describe, expect, it} from "vitest";

import {X402_DEFAULT_NETWORKS} from "../src/arp/x402-networks.js";
import {checkX402Payment, x402Policy} from "../src/x402-payment.js";
import {checkPayee, x402OffersOf, type X402Offer, type X402Terms, type X402TermsReading} from "../src/x402-terms.js";
import {PAYER, PAY_TO, recordedReads, TX} from "./x402-fixture.js";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE = "eip155:8453";
/** The recorded settlement: 20000 units of Base's USDC from `PAYER` to `PAY_TO`. */
const TERMS: X402Terms = {network: BASE, asset: USDC, payTo: PAY_TO, amount: 20_000n};
/** The payer's own second wallet, which the terms of the attack in the task file name. */
const OWN = getAddress(`0x${"0d".repeat(20)}`);
const policy = x402Policy(X402_DEFAULT_NETWORKS);
const check = (terms: X402Terms) => checkX402Payment({ref: {network: BASE, txHash: TX}, payers: [PAYER], policy, reads: recordedReads(), terms});

const offer = (over: Partial<X402Offer> = {}): X402Offer => ({network: BASE, asset: USDC, payTo: PAY_TO, amount: "20000", ...over});
const reading = (at: number, ...offers: X402Offer[]): X402TermsReading => ({at, offers});
const PAID_AT = 1_762_716_722;
const none = async () => null;

describe("the transfer must match the terms (step 2)", () => {
    it("passes a transfer to the payee for the price, and for less than it paid", async () => {
        expect((await check(TERMS)).status).toBe("paid");
        expect((await check({...TERMS, amount: 19_999n})).status).toBe("paid");
        // Case does not make two addresses.
        expect((await check({...TERMS, payTo: PAY_TO.toLowerCase(), asset: USDC.toLowerCase()})).status).toBe("paid");
    });

    it("refuses a transfer to another address, for less, of another asset, or on another network", async () => {
        expect(await check({...TERMS, payTo: OWN})).toMatchObject({status: "refused", reason: expect.stringContaining("the terms name")});
        expect(await check({...TERMS, amount: 20_001n})).toMatchObject({status: "refused", reason: expect.stringContaining("less than the terms'")});
        expect(await check({...TERMS, asset: `0x${"cd".repeat(20)}`})).toMatchObject({status: "refused"});
        expect(await check({...TERMS, network: "eip155:84532"})).toMatchObject({status: "refused", reason: expect.stringContaining("the terms are on")});
    });
});

describe("the terms must match a source the payer does not control (step 3)", () => {
    it("takes the probe's reading from before the payment when it agrees", async () => {
        expect(await checkPayee({terms: TERMS, paidAt: PAID_AT, probe: reading(PAID_AT - 3_600, offer()), live: none})).toEqual({
            status: "probe",
            checkedAt: PAID_AT - 3_600,
        });
    });

    it("refuses terms naming the payer's own wallet by the probe's reading, when the endpoint is dark", async () => {
        expect(await checkPayee({terms: {...TERMS, payTo: OWN}, paidAt: PAID_AT, probe: reading(PAID_AT - 60, offer()), live: none})).toMatchObject({
            status: "refused",
            reason: expect.stringContaining(`not ${OWN}`),
        });
    });

    it("refuses terms that name a price below the one the endpoint asked", async () => {
        const asked = reading(PAID_AT - 60, offer({amount: "1000000"}));
        expect(await checkPayee({terms: {...TERMS, amount: 1n}, paidAt: PAID_AT, probe: asked, live: none})).toMatchObject({
            status: "refused",
            reason: expect.stringContaining("asked 1000000"),
        });
    });

    it("gives unchecked with no probe reading and a dead endpoint, and ignores a reading from after the payment", async () => {
        expect(await checkPayee({terms: TERMS, paidAt: PAID_AT, probe: null, live: none})).toEqual({status: "unchecked", checkedAt: null});
        expect(await checkPayee({terms: TERMS, paidAt: PAID_AT, probe: reading(PAID_AT + 1, offer()), live: none})).toEqual({status: "unchecked", checkedAt: null});
    });

    it("reads the endpoint live when the probe has nothing, and lets it overrule a payee that rotated", async () => {
        const live = async () => reading(PAID_AT + 300, offer());
        expect(await checkPayee({terms: TERMS, paidAt: PAID_AT, probe: null, live})).toEqual({status: "live", checkedAt: PAID_AT + 300});
        const rotated = reading(PAID_AT - 86_400, offer({payTo: OWN}));
        expect(await checkPayee({terms: TERMS, paidAt: PAID_AT, probe: rotated, live})).toEqual({status: "live", checkedAt: PAID_AT + 300});
        // A live read that disagrees refuses, whatever the probe said.
        const elsewhere = async () => reading(PAID_AT + 300, offer({payTo: OWN}));
        expect((await checkPayee({terms: TERMS, paidAt: PAID_AT, probe: null, live: elsewhere})).status).toBe("refused");
    });

    it("finds the payee among several offers, and none on another network", async () => {
        const several = reading(PAID_AT - 60, offer({network: "eip155:84532"}), offer({amount: "30000"}), offer());
        expect((await checkPayee({terms: TERMS, paidAt: PAID_AT, probe: several, live: none})).status).toBe("probe");
        const elsewhere = reading(PAID_AT - 60, offer({network: "eip155:84532"}));
        expect(await checkPayee({terms: TERMS, paidAt: PAID_AT, probe: elsewhere, live: none})).toMatchObject({
            status: "refused",
            reason: expect.stringContaining("no payment in"),
        });
    });
});

describe("x402OffersOf, the offers of a 402", () => {
    const header = (value: string | null) => (name: string) => (name === "payment-required" ? value : null);
    const v2 = {x402Version: 2, resource: {url: "https://seller.example/x"}, accepts: [{scheme: "exact", ...offer(), maxTimeoutSeconds: 600, extra: {}}]};

    it("reads x402 v2's PAYMENT-REQUIRED header", () => {
        expect(x402OffersOf(402, header(btoa(JSON.stringify(v2))), "")).toEqual([offer()]);
    });

    it("reads x402 v1's body, its maxAmountRequired and its network's word", () => {
        const v1 = {x402Version: 1, accepts: [{scheme: "exact", network: "base", asset: USDC, payTo: PAY_TO, maxAmountRequired: "20000"}]};
        expect(x402OffersOf(402, header(null), JSON.stringify(v1))).toEqual([offer()]);
        const unknown = {x402Version: 1, accepts: [{scheme: "exact", network: "solana", asset: USDC, payTo: PAY_TO, maxAmountRequired: "1"}]};
        expect(x402OffersOf(402, header(null), JSON.stringify(unknown))).toEqual([]);
    });

    it("is null for anything that is not a 402 with payment requirements", () => {
        expect(x402OffersOf(200, header(btoa(JSON.stringify(v2))), "")).toBeNull();
        expect(x402OffersOf(402, header(null), "<html>pay</html>")).toBeNull();
        expect(x402OffersOf(402, header("not base64 !"), "")).toBeNull();
    });
});
