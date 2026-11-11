/** A fake x402 seller that takes the payment and delivers nothing. For the demo of task 91 only.
 *
 *      bun run scripts/demo/x402-fake-seller.ts [--port 4021] [--pay-to 0x…]
 *
 *  Base Sepolia (`eip155:84532`) and its USDC only: a test network and a test token, never a mainnet.
 *  It answers `GET /x402-demo/no-delivery` with a 402 and x402 v2 payment requirements, and a paid
 *  request with **200 and an empty body**: the payment settles, nothing usable comes back. That is the
 *  `no-delivery` outcome ADR `0159` names, produced on purpose so the failure loop can be walked.
 *
 *  The x402 work is Coinbase's own packages, pinned (`@x402/core`, `@x402/evm` 2.28.0, root
 *  `devDependencies` only, never in an app): the requirements, the verification and the settlement are
 *  theirs. Settlement goes through a facilitator, `https://x402.org/facilitator` by default, which
 *  submits the payer's EIP-3009 authorisation and pays the gas. So this process holds no key and
 *  signs nothing. `payTo` is the address the caller names; the runbook defaults to `0x…dEaD` (ADR `0160`).
 *
 *  Hosted for task 118, so a test line can name a public URL rather than `127.0.0.1`: the image is
 *  `scripts/demo/x402-seller.Dockerfile`, and these settings make it public, each also a flag:
 *  `ARP_SELLER_PUBLIC_URL` (the origin it is reached at, `https://seller.arp.intuition.box`; the 402's
 *  resource URL and the URL printed are that origin plus `SELLER_PATH`), `ARP_SELLER_LISTEN` (the
 *  interface, `127.0.0.1` unless set; the image sets `0.0.0.0`), `PORT`, and `ARP_SELLER_PAY_TO` (the
 *  payee). Its refusals do not move with hosting: one network, one asset, one payee, one price.
 *
 *  Never shipped: nothing under `apps/` imports `scripts/` (CLAUDE.md).
 */
import {HTTPFacilitatorClient, x402ResourceServer} from "@x402/core/server";
import {decodePaymentSignatureHeader, encodePaymentRequiredHeader, encodePaymentResponseHeader} from "@x402/core/http";
import type {PaymentRequirements, SettleResponse} from "@x402/core/types";
import {registerExactEvmScheme} from "@x402/evm/exact/server";
import {getAddress, isAddress, type Address} from "viem";

/** Base Sepolia, CAIP-2. */
export const BASE_SEPOLIA = "eip155:84532";
/** USDC on Base Sepolia: `symbol()` USDC, `decimals()` 6, `version()` 2, read at https://sepolia.base.org on 2026-11-09. */
export const BASE_SEPOLIA_USDC: Address = getAddress("0x036CbD53842c5426634e7929541eC2318f3dCF7e");
/** The price, in USDC's 6-decimal units: 0.001 USDC. */
export const PRICE_UNITS = 1_000n;
export const DEFAULT_FACILITATOR = "https://x402.org/facilitator";
export const SELLER_PATH = "/x402-demo/no-delivery";
/** How long an authorisation stays valid. Wide, because a WSL clock was measured 321 s behind on 2026-11-09. */
export const MAX_TIMEOUT_SECONDS = 600;

export type FakeSeller = {
    url: string;
    payTo: Address;
    /** Every settlement this seller saw, in order. */
    settlements: SettleResponse[];
    /** The facilitator's own answer to a verification, for a dry run: nothing is settled. */
    verifyOnly(payload: ReturnType<typeof decodePaymentSignatureHeader>): Promise<{isValid: boolean; invalidReason?: string | undefined}>;
    stop(): void;
};

/** The one offer this seller makes, and a facilitator client to verify and settle it. Holds no key. */
async function offerOf(payTo: Address, facilitatorUrl: string | undefined): Promise<{server: x402ResourceServer; requirements: PaymentRequirements[]}> {
    const server = new x402ResourceServer(new HTTPFacilitatorClient({url: facilitatorUrl ?? DEFAULT_FACILITATOR}));
    registerExactEvmScheme(server);
    // Reads the facilitator's `/supported`: it must settle `exact` on Base Sepolia, or nothing here can.
    await server.initialize();
    const requirements: PaymentRequirements[] = await server.buildPaymentRequirements({
        scheme: "exact",
        network: BASE_SEPOLIA,
        payTo,
        price: {amount: PRICE_UNITS.toString(), asset: BASE_SEPOLIA_USDC, extra: {name: "USDC", version: "2"}},
        maxTimeoutSeconds: MAX_TIMEOUT_SECONDS,
    });
    return {server, requirements};
}

/** `https://host`, with no path, query or fragment, or a throw: the origin a hosted seller is reached at. */
export function sellerOrigin(publicUrl: string): string {
    const url = new URL(publicUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`${publicUrl} is not an http(s) origin`);
    if (url.pathname !== "/" || url.search !== "" || url.hash !== "") throw new Error(`${publicUrl} is an origin: no path, query or fragment`);
    return url.origin;
}

export async function startFakeSeller(options: {payTo: Address; port?: number; facilitatorUrl?: string | undefined; hostname?: string; publicUrl?: string | undefined}): Promise<FakeSeller> {
    const {server, requirements} = await offerOf(options.payTo, options.facilitatorUrl);
    const settlements: SettleResponse[] = [];
    const publicOrigin = options.publicUrl === undefined ? null : sellerOrigin(options.publicUrl);

    const http = Bun.serve({
        hostname: options.hostname ?? "127.0.0.1",
        port: options.port ?? 4021,
        async fetch(request) {
            const url = new URL(request.url);
            if (url.pathname !== SELLER_PATH) return new Response("not found", {status: 404});
            // Behind a proxy the request's own origin is the container's, not the one the payer called.
            const resource = {url: `${publicOrigin ?? url.origin}${SELLER_PATH}`, description: "ARP demo: takes the payment, delivers nothing", mimeType: "application/json"};
            const header = request.headers.get("PAYMENT-SIGNATURE") ?? request.headers.get("X-PAYMENT");
            if (header === null) {
                const required = await server.createPaymentRequiredResponse(requirements, resource);
                return Response.json(required, {status: 402, headers: {"PAYMENT-REQUIRED": encodePaymentRequiredHeader(required)}});
            }
            const payload = decodePaymentSignatureHeader(header);
            const accepted = requirements[0] as PaymentRequirements; // built above, one option
            const verified = await server.verifyPayment(payload, accepted);
            if (!verified.isValid) {
                const required = await server.createPaymentRequiredResponse(requirements, resource, verified.invalidReason ?? "invalid payment");
                return Response.json(required, {status: 402, headers: {"PAYMENT-REQUIRED": encodePaymentRequiredHeader(required)}});
            }
            const settled = await server.settlePayment(payload, accepted);
            settlements.push(settled);
            // The whole point: paid, and nothing usable in return.
            return new Response(null, {status: 200, headers: {"PAYMENT-RESPONSE": encodePaymentResponseHeader(settled)}});
        },
    });

    return {
        url: `${publicOrigin ?? `http://127.0.0.1:${http.port}`}${SELLER_PATH}`,
        payTo: options.payTo,
        settlements,
        async verifyOnly(payload) {
            const verified = await server.verifyPayment(payload, requirements[0] as PaymentRequirements); // built above
            return {isValid: verified.isValid, invalidReason: verified.invalidReason};
        },
        stop: () => http.stop(true),
    };
}

/**
 * A seller that runs elsewhere, at `url`, as the runbook sees it: the same offer is built here, so the
 * dry run's verification makes no call to the seller, and nothing is started or stopped.
 */
export async function remoteFakeSeller(options: {url: string; payTo: Address; facilitatorUrl?: string | undefined}): Promise<FakeSeller> {
    const {server, requirements} = await offerOf(options.payTo, options.facilitatorUrl);
    return {
        url: options.url,
        payTo: options.payTo,
        settlements: [],
        async verifyOnly(payload) {
            const verified = await server.verifyPayment(payload, requirements[0] as PaymentRequirements); // built above
            return {isValid: verified.isValid, invalidReason: verified.invalidReason};
        },
        stop: () => undefined,
    };
}

if (import.meta.main) {
    const flag = (name: string) => {
        const at = process.argv.indexOf(`--${name}`);
        return at === -1 ? undefined : process.argv[at + 1];
    };
    const env = (name: string) => (process.env[name] === "" ? undefined : process.env[name]);
    const payTo = flag("pay-to") ?? env("ARP_SELLER_PAY_TO");
    if (payTo === undefined || !isAddress(payTo)) {
        console.error("usage: --pay-to <address> [--port 4021] [--listen 127.0.0.1] [--public-url https://host] [--facilitator <url>]");
        process.exit(1);
    }
    const seller = await startFakeSeller({
        payTo: getAddress(payTo),
        port: Number(flag("port") ?? env("PORT") ?? 4021),
        hostname: flag("listen") ?? env("ARP_SELLER_LISTEN") ?? "127.0.0.1",
        facilitatorUrl: flag("facilitator") ?? env("ARP_SELLER_FACILITATOR"),
        publicUrl: flag("public-url") ?? env("ARP_SELLER_PUBLIC_URL"),
    });
    console.log(`fake x402 seller on ${seller.url}, ${BASE_SEPOLIA}, ${PRICE_UNITS} units of ${BASE_SEPOLIA_USDC} to ${seller.payTo}`);
}
