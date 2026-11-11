import {getAddress, type Address} from "viem";

import {x402NetworksFrom, type X402NetworkTable} from "../x402-payment.js";

/**
 * The paying networks an x402 line may name by default, with the asset accepted on each and a public
 * RPC to read it (task 89, ADR `0159`). Here because `rules/portability.md` lets `arp/` name a chain.
 *
 * Base, with native USDC, is what x402 sellers are paid in today and what x402 Doctor reads first
 * (`FUTURE.md`, x402 section). An operator adds a network by configuration, `ARP_X402_NETWORKS` with
 * `ARP_X402_RPC_<chain id>` (`x402NetworksFrom`, ADR `0160`); ARP **reads** these chains and never signs
 * or sends on them.
 *
 * USDC on Base: `symbol()` answered `USDC` at this address on `https://mainnet.base.org`, 2026-11-09.
 */
export const X402_DEFAULT_NETWORKS: ReadonlyMap<string, {assets: readonly Address[]; rpcUrl: string}> = new Map([
    [
        "eip155:8453",
        {assets: [getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")], rpcUrl: "https://mainnet.base.org"},
    ],
]);

/**
 * The one network the **test** feed reads (task 118): Base Sepolia, with its test USDC (`symbol()` USDC,
 * `decimals()` 6 at this address on `https://sepolia.base.org`, `docs/tasks/91`). A payment there is test
 * money, so it never enters the main feed, and the test feed reads nothing else.
 */
export const X402_TEST_NETWORKS: ReadonlyMap<string, {assets: readonly Address[]; rpcUrl: string}> = new Map([
    [
        "eip155:84532",
        {assets: [getAddress("0x036CbD53842c5426634e7929541eC2318f3dCF7e")], rpcUrl: "https://sepolia.base.org"},
    ],
]);

/**
 * The network table of one feed, `main` or `test`: its defaults plus the environment (`x402NetworksFrom`).
 * Throws when the environment adds a network that feed must not read, a test network to the main feed or
 * anything else to the test feed: refused loudly, not dropped, so a setting copied from one build to the
 * other is never half obeyed.
 */
export function x402FeedNetworks(feed: "main" | "test", env: Readonly<Record<string, string | undefined>>): X402NetworkTable {
    const table = x402NetworksFrom(feed === "main" ? X402_DEFAULT_NETWORKS : X402_TEST_NETWORKS, env);
    for (const network of table.keys()) {
        if (X402_TEST_NETWORKS.has(network) === (feed === "main")) {
            const why = feed === "main" ? "a test network goes in the test feed" : `it reads ${[...X402_TEST_NETWORKS.keys()].join(", ")} only`;
            throw new Error(`the ${feed} x402 feed does not read ${network}: ${why}`);
        }
    }
    return table;
}
