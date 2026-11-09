import {getAddress, type Address} from "viem";

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
