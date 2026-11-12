import {getAddress, isAddress, type Address} from "viem";

import {intuitionTestnet} from "./chains";

/**
 * The address ARP's sponsoring service deposits from on this chain, or `null`.
 *
 * What it sends to an agent is what `/tools` counts as _signals_ (ADR `0143`). The
 * service is testnet-only (`security.md`, the signing table), so mainnet has none whatever the
 * environment says: a mainnet figure read off a testnet key would be two chains in one
 * number.
 *
 * `configured` is `VITE_ARP_SPONSOR_ADDRESS`; unset or blank, `recorded`, the address in
 * `data/deployments/13579.json`, is used instead (task 58). Malformed, it is `null`, and `/tools`
 * has no Signals to show — never a guess.
 */
export function sponsorAddressFor(
    chainId: number,
    configured: string | undefined,
    recorded?: string,
): Address | null {
    // `.env.example` ships the key empty, and an empty value is not a choice of address.
    const raw = configured === undefined || configured.trim() === "" ? recorded : configured;
    if (chainId !== intuitionTestnet.id || raw === undefined) return null;
    const trimmed = raw.trim();
    return isAddress(trimmed, {strict: false}) ? trimmed : null;
}

/**
 * The wallets ARP pays from on this chain, whose own positions are not supports (task 144): the
 * sponsoring service opens one on every edge it creates, a deposit to itself. Its sending address
 * and the deployer, which sent for it until 2026-11-09 (`data/deployments/13579.json`), plus a
 * configured sponsoring address when it differs. Testnet only, like the service; empty elsewhere.
 */
export function arpPayersFor(
    chainId: number,
    configured: string | undefined,
    recorded: {deployer: string; sponsor: string},
): Address[] {
    if (chainId !== intuitionTestnet.id) return [];
    const sponsor = sponsorAddressFor(chainId, configured, recorded.sponsor);
    const payers: Address[] = [];
    for (const raw of [recorded.deployer, recorded.sponsor, sponsor]) {
        if (raw === null || !isAddress(raw.trim(), {strict: false})) continue;
        const address = getAddress(raw.trim());
        if (!payers.includes(address)) payers.push(address);
    }
    return payers;
}
