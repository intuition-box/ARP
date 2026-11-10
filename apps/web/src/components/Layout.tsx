import {type ReactNode} from "react";
import {useLocation} from "react-router-dom";

import {useSearchShortcut} from "../hooks/use-search-shortcut";
import {useChainChoice} from "../lib/chain-choice";

import {ActivityLog} from "./brand/ActivityLog";
import {ChainToggle} from "./brand/ChainToggle";
import {NavCoin, NavTrailProvider} from "./brand/NavCoin";
import {SideGalaxy} from "./brand/SideGalaxy";
import {useOnboarding} from "./onboarding/onboarding-context";
import {SiteFooterLinks} from "./site/SiteFooter";
import {WalletConnect} from "./WalletConnect";

/**
 * Layout shell. The header is the coin (`NavCoin`, ADR `0151`): the Source mark in a circle at the
 * bar's left, the tabs centred, Get started, the chain and the wallet at the end, and the path line
 * a deep page sets under it. It replaced ADR `0057` §3's centred mark. The footer is one line of
 * links on a solid ground across the whole width; the giant wordmark that ended it was removed by
 * the user on 2026-11-10.
 *
 * Max content width is **1320px**, which is the reference's `.wrap`, not the 1080 this shell used.
 * The listing pages are eight-column tables and 1080 squeezed them; the user's complaint that the
 * agent index was badly laid out started there (2026-10-27).
 *
 * The app spans two networks: ARP's own contracts on Intuition testnet, and the ERC-8004 cohort
 * plus its vaults on Intuition mainnet (ADR 0017).
 *
 * **Both network banners are gone** — the shell's testnet strip and the per-page `MainnetNotice`
 * (ADR `0058`, user decision). The warning that matters is the one at the moment a wallet opens,
 * and `StakeControl` and `WithdrawControl` both carry it in their confirmation step, which is where
 * ADR `0029` said it belonged. `readsMainnet` survives for the footer's network label, which is a
 * fact about where the data came from rather than a warning about it.
 */

const NAV_TABS = [
    {to: "/agents", label: "Agents"},
    {to: "/tools", label: "Tools"},
    // The agent's calls, declarations and stakes, and every transaction this browser sent.
    {to: "/activity", label: "Activity"},
    // Both indexes from one field; `/` opens it from anywhere (task 48).
    {to: "/search", label: "Search"},
    {to: "/docs", label: "Docs"},
] as const;

export function Layout({children}: {children: ReactNode}) {
    const chain = useChainChoice();
    const onboarding = useOnboarding();
    useSearchShortcut();
    // The landing draws its own galaxy; every other page gets the faint one at its sides.
    const {pathname} = useLocation();

    return (
        /* `min-h-screen flex flex-col` is what makes `flex-1` on `<main>` mean anything. This was
           a fragment, so the footer sat directly under whatever the page rendered — on a short
           page or a loading one it rode up the screen and then jumped back down when the content
           arrived (user, 2026-10-27). */
        /* The footer's `pb-16` holds the collapsed activity bar's height on its own solid ground, so the fixed bar never sits on the links and no star shows under it (2026-11-10). */
        <NavTrailProvider>
            {pathname === "/" ? null : <SideGalaxy />}
            <div className="arp-page flex min-h-screen flex-col">
                {/* Agents, Tools, Activity, Search, Docs: `/` is the landing and the coin leads to
                    it. Get started opens the onboarding panel, the one door for putting an agent
                    or a tool into ARP (task 62, ADR `0125`), and is lit on the `/start/<profile>`
                    pages it leads to. The chain and the wallet are state rather than
                    destinations, so they sit at the end. `/profile` is gone; the account page is
                    reached from the wallet menu (`docs/tasks/35` §0). */}
                <NavCoin
                    tabs={NAV_TABS}
                    start={{label: "Get started", section: "/start", onClick: onboarding.open}}
                    end={
                        <>
                            <ChainToggle />
                            <WalletConnect />
                        </>
                    }
                />

                <main className="flex-1 mx-auto w-full max-w-[1320px] px-6 py-10">{children}</main>

                {/* Solid ground, edge to edge, so the side galaxy never shows through it (the
                    user, 2026-11-10). */}
                <footer className="mt-24 border-t border-[color:var(--color-rule)] bg-[color:var(--color-ground)] px-6 pt-7 pb-16">
                    <div className="mx-auto w-full max-w-[1320px] flex flex-wrap items-center justify-between gap-3 text-[length:var(--text-label)] uppercase tracking-wider text-[color:var(--color-steel)]">
                        <span>
                            Agent Reputation Protocol —{" "}
                            <span className="text-[color:var(--color-steel)]">
                                {chain.chain.name}
                            </span>
                        </span>
                        {/* `ModuleRegistry` used to be the first link here. The contract is retired
                            (ADR `0051`, `0055`) and the three pages that used it are deleted, so
                            the link advertised a surface the product no longer has. */}
                        <SiteFooterLinks />
                    </div>
                </footer>
                <ActivityLog />
            </div>
        </NavTrailProvider>
    );
}
