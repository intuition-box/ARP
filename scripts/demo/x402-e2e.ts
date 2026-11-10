/** The x402 failure loop, end to end, on Base Sepolia and testnet 13579 (task 91).
 *
 *      bun run scripts/demo/x402-e2e.ts                                   # dry run: nothing signed on chain, nothing sent
 *      bun run scripts/demo/x402-e2e.ts --execute --agent 0xYourAgent     # pays 0.001 test USDC, writes the line, builds the feed
 *      bun run scripts/demo/x402-e2e.ts --execute --agent 0x… --payment-tx 0x…   # already paid: the line and the feed only
 *
 *  1. Base Sepolia and its USDC are added **by configuration** (`ARP_X402_NETWORKS`, ADR `0160`); the
 *     token is read on chain first (`symbol()`, `decimals()`).
 *  2. A fake seller (`x402-fake-seller.ts`) answers 402, takes the payment, and returns nothing.
 *  3. The agent's key (`~/.arp/agent-key`, or `ARP_HOME`) pays it: an EIP-3009 authorisation, signed
 *     in this process, submitted by the x402.org facilitator, which pays the gas. The key is never
 *     printed. Its address is checked against `--agent` before anything is signed with it.
 *  4. "Nothing usable" is detected: a 2xx with an empty body, or one that is not JSON.
 *  5. The line goes through the normal `arp line` path, `--reason no-delivery --payment-tx --network`,
 *     to the sponsoring service at `ARP_SPONSOR` (default `http://127.0.0.1:3200`), which writes on 13579.
 *  6. The feed is built with Base Sepolia enabled into `~/.arp/x402-e2e/feed.json` (not the site's
 *     copy), and the record is checked: payer = the agent, pay_to = the seller, amount = the price, and
 *     `endpoint` = the URL actually called (`http://127.0.0.1:…`), its canonical form beside it (task 93,
 *     ADR `0162`).
 *
 *  Every effect is appended to `~/.arp/x402-e2e.jsonl` (ADR `0037`: recorded where a later reader looks).
 *
 *  Guards, on top of `x402-payment.ts`: the agent signs only for `eip155:84532`, only USDC, only to the
 *  seller's `payTo`, only up to `PRICE_UNITS`. Base Sepolia is a test network and the token a test
 *  token; this script refuses any other network (ADR `0160`).
 *
 *  What the user does first (never this script): send the agent address test USDC on Base Sepolia,
 *  https://faucet.circle.com (network "Base Sepolia"). No Base Sepolia ETH is needed anywhere: the
 *  facilitator submits the transfer. The sponsoring service must run locally with its pinning key
 *  (`INTUITION_PIN_API_KEY`, for `/list-tool`) and the same `ARP_X402_NETWORKS` and `ARP_X402_RPC_84532`.
 */
import {spawnSync} from "node:child_process";
import {appendFileSync, mkdirSync, readFileSync} from "node:fs";
import {join} from "node:path";

import {decodePaymentRequiredHeader, decodePaymentResponseHeader} from "@x402/core/http";
import {x402Client, x402HTTPClient} from "@x402/core/client";
import type {PaymentRequirements} from "@x402/core/types";
import {registerExactEvmScheme} from "@x402/evm/exact/client";
import {wrapFetchWithPayment} from "@x402/fetch";
import {createPublicClient, formatEther, formatUnits, getAddress, http, isAddress, parseAbi, verifyTypedData, type Address, type Hex} from "viem";
import {generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount} from "viem/accounts";

import deployment from "../../data/deployments/13579.json";
import {X402_DEFAULT_NETWORKS} from "../../packages/protocol/src/arp/x402-networks.ts";
import {arpHome, readKeyFile} from "../../packages/protocol/src/node/local-state.ts";
import {normaliseToolUrl} from "../../packages/protocol/src/declare/tool-thing.ts";
import {checkX402Payment, x402NetworksFrom, x402Policy, x402TransferReads} from "../../packages/protocol/src/x402-payment.ts";
import {BASE_SEPOLIA, BASE_SEPOLIA_USDC, MAX_TIMEOUT_SECONDS, PRICE_UNITS, startFakeSeller} from "./x402-fake-seller.ts";

const flag = (name: string) => {
    const at = process.argv.indexOf(`--${name}`);
    return at === -1 ? undefined : process.argv[at + 1];
};
const execute = process.argv.includes("--execute");
const resumeTx = flag("payment-tx");
const expectedAgent = flag("agent");
const payTo = getAddress(flag("pay-to") ?? "0x000000000000000000000000000000000000dEaD");
const domain = flag("domain");

// 1. The network, by configuration, the way an operator adds it. Children (`arp line`, the feed) inherit it.
process.env["ARP_X402_RPC_84532"] ??= "https://sepolia.base.org";
process.env["ARP_X402_NETWORKS"] ??= `${BASE_SEPOLIA}=${BASE_SEPOLIA_USDC}`;
const networks = x402NetworksFrom(X402_DEFAULT_NETWORKS, process.env);
const sepoliaRpc = networks.get(BASE_SEPOLIA)?.rpcUrl;
if (sepoliaRpc === undefined || !networks.get(BASE_SEPOLIA)?.assets.includes(BASE_SEPOLIA_USDC)) {
    throw new Error(`ARP_X402_NETWORKS must accept ${BASE_SEPOLIA_USDC} on ${BASE_SEPOLIA}`);
}
const home = arpHome();
const LOG = join(home, "x402-e2e.jsonl");
const record = (step: string, data: Record<string, unknown>) => {
    mkdirSync(home, {recursive: true, mode: 0o700});
    appendFileSync(LOG, `${JSON.stringify({at: new Date().toISOString(), step, ...data})}\n`);
};
const say = (line: string) => console.log(line);
function stop(message: string): never {
    console.error(`\nSTOPPED: ${message}`);
    process.exit(2);
}

const sepolia = createPublicClient({transport: http(sepoliaRpc, {timeout: 20_000})});
const erc20 = parseAbi(["function symbol() view returns (string)", "function decimals() view returns (uint8)", "function balanceOf(address) view returns (uint256)"]);
const chainId = await sepolia.getChainId();
if (chainId !== 84532) stop(`ARP_X402_RPC_84532 answers chain ${chainId}, not 84532`);
const [symbol, decimals] = await Promise.all([
    sepolia.readContract({address: BASE_SEPOLIA_USDC, abi: erc20, functionName: "symbol"}),
    sepolia.readContract({address: BASE_SEPOLIA_USDC, abi: erc20, functionName: "decimals"}),
]);
if (symbol !== "USDC" || decimals !== 6) stop(`${BASE_SEPOLIA_USDC} on 84532 answers ${symbol}/${decimals}, not USDC/6`);
// An authorisation's validity window is computed from this machine's clock and checked against the
// facilitator's: a clock far behind signs one that is already expired (measured 321 s behind under WSL).
const latest = await sepolia.getBlock();
const skew = Number(latest.timestamp) - Math.floor(Date.now() / 1000);
// `validAfter` is 0 and `validBefore` is this clock + the window, so only a clock behind matters.
if (skew > MAX_TIMEOUT_SECONDS - 120) stop(`this machine's clock is ${skew} s off Base Sepolia's; an authorisation would expire within two minutes; set it right first (WSL: \`sudo hwclock -s\` or \`wsl --shutdown\`)`);
say(`1. ${BASE_SEPOLIA} accepted by configuration; ${BASE_SEPOLIA_USDC} is ${symbol}, ${decimals} decimals (read now on ${sepoliaRpc}); this clock is ${skew} s off the chain's`);

// 2. The seller, and its 402.
const seller = await startFakeSeller({payTo, ...(flag("facilitator") === undefined ? {} : {facilitatorUrl: flag("facilitator")})});
try {
    const unpaid = await fetch(seller.url);
    const header = unpaid.headers.get("PAYMENT-REQUIRED");
    if (unpaid.status !== 402 || header === null) stop(`the seller answered ${unpaid.status} without PAYMENT-REQUIRED`);
    const required = decodePaymentRequiredHeader(header);
    const offer = required.accepts[0] as PaymentRequirements | undefined;
    if (
        offer === undefined ||
        offer.scheme !== "exact" ||
        offer.network !== BASE_SEPOLIA ||
        getAddress(offer.asset) !== BASE_SEPOLIA_USDC ||
        BigInt(offer.amount) !== PRICE_UNITS ||
        getAddress(offer.payTo) !== payTo
    ) {
        stop(`the 402 is not the offer expected: ${JSON.stringify(offer)}`);
    }
    say(`2. ${seller.url} answers 402, x402 v${required.x402Version}: exact, ${offer.network}, ${formatUnits(BigInt(offer.amount), 6)} USDC to ${offer.payTo}`);

    // The guard every signature here goes through: this offer, and nothing wider.
    const onlyThisOffer = (_version: number, offers: PaymentRequirements[]): PaymentRequirements => {
        const match = offers.find(
            (o) => o.scheme === "exact" && o.network === BASE_SEPOLIA && getAddress(o.asset) === BASE_SEPOLIA_USDC && getAddress(o.payTo) === payTo && BigInt(o.amount) <= PRICE_UNITS,
        );
        if (match === undefined) throw new Error("no offer within this demo's guard (Base Sepolia, USDC, the seller, the price)");
        return match;
    };
    const payerFor = (account: PrivateKeyAccount) => {
        const client = new x402Client();
        registerExactEvmScheme(client, {signer: account, paymentRequirementsSelector: onlyThisOffer});
        return client;
    };

    // 3a. Dry run: a payload signed by a key made for this run alone, checked, and handed to the facilitator's
    // verification, which settles nothing. The agent's key is not used.
    const throwaway = privateKeyToAccount(generatePrivateKey());
    const payload = await new x402HTTPClient(payerFor(throwaway)).createPaymentPayload(required);
    const inner = payload.payload as {signature: Hex; authorization: {from: Address; to: Address; value: string; validAfter: string; validBefore: string; nonce: Hex}};
    const signed = await verifyTypedData({
        address: throwaway.address,
        domain: {name: "USDC", version: "2", chainId: 84532, verifyingContract: BASE_SEPOLIA_USDC},
        types: {
            TransferWithAuthorization: [
                {name: "from", type: "address"},
                {name: "to", type: "address"},
                {name: "value", type: "uint256"},
                {name: "validAfter", type: "uint256"},
                {name: "validBefore", type: "uint256"},
                {name: "nonce", type: "bytes32"},
            ],
        },
        primaryType: "TransferWithAuthorization",
        message: {
            ...inner.authorization,
            value: BigInt(inner.authorization.value),
            validAfter: BigInt(inner.authorization.validAfter),
            validBefore: BigInt(inner.authorization.validBefore),
        },
        signature: inner.signature,
    });
    if (!signed || getAddress(inner.authorization.to) !== payTo || BigInt(inner.authorization.value) !== PRICE_UNITS) {
        stop("the dry-run payload does not carry a valid EIP-3009 authorisation for this offer");
    }
    const verdict = await seller.verifyOnly(payload);
    say(
        `3. dry run: a valid EIP-3009 authorisation from a throwaway key (${throwaway.address}); the facilitator's verify says ` +
            `${verdict.isValid ? "valid" : `invalid (${verdict.invalidReason})`}, as it should for an empty wallet. Nothing settled.`,
    );

    // 3b. The agent: its address, its balance on Base Sepolia. Read only.
    const keyPath = join(home, "agent-key");
    let agent: PrivateKeyAccount;
    try {
        agent = privateKeyToAccount(readKeyFile(keyPath));
    } catch (error) {
        stop(`no agent key at ${keyPath} (${error instanceof Error ? error.message : String(error)}). Run \`arp line\` once, or set ARP_HOME`);
    }
    const [usdc, eth] = await Promise.all([
        sepolia.readContract({address: BASE_SEPOLIA_USDC, abi: erc20, functionName: "balanceOf", args: [agent.address]}),
        sepolia.getBalance({address: agent.address}),
    ]);
    say(`   agent ${agent.address} on Base Sepolia: ${formatUnits(usdc, 6)} USDC, ${formatEther(eth)} ETH (ETH is not needed)`);

    if (!execute) {
        say(`\nDry run done. To pay for real: fund ${agent.address} with test USDC on Base Sepolia, then add --execute --agent ${agent.address}`);
        process.exit(0);
    }
    if (expectedAgent === undefined || !isAddress(expectedAgent) || getAddress(expectedAgent) !== agent.address) {
        stop(`--agent ${expectedAgent ?? "(missing)"} is not the key's address; nothing was signed`);
    }

    // 4. Pay, unless a payment is named, and see what came back.
    let txHash: Hex;
    if (resumeTx !== undefined) {
        if (!/^0x[0-9a-fA-F]{64}$/.test(resumeTx)) stop("--payment-tx is a 32-byte transaction hash");
        txHash = resumeTx.toLowerCase() as Hex; // checked on the line above
        say(`4. paid before: ${txHash}`);
    } else {
        if (usdc < PRICE_UNITS) stop(`${agent.address} holds ${formatUnits(usdc, 6)} USDC on Base Sepolia; it needs ${formatUnits(PRICE_UNITS, 6)}. https://faucet.circle.com`);
        const paidFetch = wrapFetchWithPayment(fetch, payerFor(agent));
        const answer = await paidFetch(seller.url);
        const body = await answer.text();
        const settlementHeader = answer.headers.get("PAYMENT-RESPONSE");
        if (settlementHeader === null) stop(`the seller answered ${answer.status} with no settlement: ${body.slice(0, 200)}`);
        const settled = decodePaymentResponseHeader(settlementHeader);
        if (!settled.success) stop(`settlement failed: ${settled.errorReason ?? ""} ${settled.errorMessage ?? ""}`);
        txHash = settled.transaction.toLowerCase() as Hex; // the facilitator's settlement hash
        let usable = false;
        try {
            usable = answer.ok && body.trim() !== "" && JSON.parse(body) !== null;
        } catch {
            usable = false;
        }
        record("paid", {network: BASE_SEPOLIA, txHash, payer: agent.address, payTo, amount: PRICE_UNITS.toString(), status: answer.status, bodyBytes: body.length, usable});
        if (usable) stop(`the seller delivered something (${body.length} bytes); there is no no-delivery line to write`);
        say(`4. paid ${formatUnits(PRICE_UNITS, 6)} USDC, settlement ${txHash}; the answer was ${answer.status} with ${body.length} bytes: nothing usable`);
    }

    // The payment, read on its own chain the way the sponsor and the feed will read it.
    await sepolia.waitForTransactionReceipt({hash: txHash, timeout: 120_000});
    const checked = await checkX402Payment({
        ref: {network: BASE_SEPOLIA, txHash},
        payers: [agent.address],
        policy: x402Policy(networks),
        reads: x402TransferReads(sepoliaRpc),
    });
    if (checked.status !== "paid") stop(`the payment does not check: ${checked.reason}`);
    say(`   checked on 84532: ${checked.transfer.payer} paid ${checked.transfer.amount} units to ${checked.transfer.payTo}`);

    // 5. The sponsor, then the line through `arp line`.
    const sponsorUrl = process.env["ARP_SPONSOR"] ?? "http://127.0.0.1:3200";
    let sponsor: Address;
    try {
        const info = (await (await fetch(sponsorUrl, {signal: AbortSignal.timeout(10_000)})).json()) as {sponsor?: string};
        sponsor = getAddress(String(info.sponsor));
    } catch (error) {
        stop(
            `the sponsoring service does not answer at ${sponsorUrl} (${error instanceof Error ? error.message : String(error)}). ` +
                `Start it with ARP_X402_NETWORKS=${process.env["ARP_X402_NETWORKS"]} ARP_X402_RPC_84532=${sepoliaRpc} and INTUITION_PIN_API_KEY, then rerun with --payment-tx ${txHash}`,
        );
    }
    const ours = [deployment.arp.sponsor, deployment.arp.sponsorV1].map((a) => getAddress(a));
    if (!ours.includes(sponsor)) stop(`the service at ${sponsorUrl} sends from ${sponsor}, which is neither arp.sponsor nor arp.sponsorV1`);
    const testnet = createPublicClient({transport: http(deployment.chain.rpcUrl)});
    const sponsorBalance = await testnet.getBalance({address: sponsor});
    say(`5. sponsor ${sponsor}: ${formatEther(sponsorBalance)} tTRUST on 13579`);

    const lineArgs = ["run", "apps/cli/src/cli.ts", "line", "--tool", seller.url, "--outcome", "failed", "--reason", "no-delivery", "--payment-tx", txHash, "--network", BASE_SEPOLIA];
    if (domain !== undefined) lineArgs.push("--domain", domain);
    const line = spawnSync("bun", lineArgs, {encoding: "utf8", env: {...process.env, ARP_TARGET: "testnet", ARP_SPONSOR: sponsorUrl}, timeout: 600_000});
    if (line.status !== 0) stop(`arp line failed (${line.status}): ${line.stderr.trim()}. Rerun with --payment-tx ${txHash}`);
    const written = JSON.parse(line.stdout.trim().split("\n").at(-1) ?? "{}") as {toolUrl: string; termId: Hex; levels: Hex[]; transactions: Hex[]};
    record("line", {...written, payment: `${BASE_SEPOLIA}/tx/${txHash}`});
    say(`   line written on 13579: term ${written.termId}, ${written.levels.length} levels, transactions ${written.transactions.join(", ")}`);

    // 6. The feed, with Base Sepolia enabled, until the indexer has the line.
    const out = join(home, "x402-e2e", "feed.json");
    type Feed = {records: {settlement_tx: string; network: string; payer: string; pay_to: string; amount: string; endpoint: string | null; endpoint_canonical: string; reason: string | null}[]; skipped: {reasons: Record<string, number>}};
    let found: Feed["records"][number] | undefined;
    for (let attempt = 0; attempt < 12 && found === undefined; attempt += 1) {
        if (attempt > 0) await new Promise((done) => setTimeout(done, 10_000));
        const built = spawnSync("bun", ["run", "scripts/build/build-x402-feed.ts", "--out", out], {encoding: "utf8", env: process.env, timeout: 300_000});
        if (built.status !== 0) stop(`the feed build failed: ${built.stderr.trim()}`);
        const feed = JSON.parse(readFileSync(out, "utf8")) as Feed;
        found = feed.records.find((r) => r.settlement_tx.toLowerCase() === txHash);
        if (found === undefined) say(`   feed: not yet (${built.stdout.trim()}; skipped ${JSON.stringify(feed.skipped.reasons)})`);
    }
    if (found === undefined) stop(`the record is not in ${out} after 12 builds`);
    const right =
        found.network === BASE_SEPOLIA &&
        getAddress(found.payer) === agent.address &&
        getAddress(found.pay_to) === payTo &&
        found.amount === PRICE_UNITS.toString() &&
        found.reason === "no-delivery" &&
        found.endpoint === seller.url &&
        found.endpoint_canonical === normaliseToolUrl(seller.url);
    record("feed", {out, record: found, right});
    if (!right) stop(`the record is in the feed but wrong: ${JSON.stringify(found)}`);
    say(`6. the feed holds it: ${found.endpoint} (canonical ${found.endpoint_canonical}), payer ${found.payer}, pay_to ${found.pay_to}, ${found.amount} units, ${found.reason}. ${out}`);
} finally {
    seller.stop();
}
