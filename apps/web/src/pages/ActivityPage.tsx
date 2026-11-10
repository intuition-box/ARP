import {useState} from "react";
import {Link} from "react-router-dom";
import type {Hex} from "viem";

import {NoActivityYet} from "../components/brand/NoActivityYet";
import {Segmented} from "../components/tool/ToolCatalogControls";
import {useChainFacts, type ChainReads} from "../hooks/use-chain-facts";
import {useChainChoice} from "../lib/chain-choice";
import {amountOf, explorerTxUrl} from "../lib/chain-amounts";
import {parseToolLabel, primaryNameOf, sourceOf} from "../lib/tool-label";
import {FACT_FILTERS, factsOfKind, type ChainFact} from "../services/chain-facts-view";

const short = (value: string) => `${value.slice(0, 10)}…`;

function clock(at: string): string {
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return "—";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** `30 Oct 13:17:27`, local: the chain list spans days, so the clock alone is not enough. */
function stamp(at: string): string {
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return "—";
    return `${d.toLocaleDateString("en-GB", {day: "2-digit", month: "short"})} ${clock(at)}`;
}

function Fact({label, children}: {label: string; children: React.ReactNode}) {
    return (
        <div className="flex min-w-[7.5rem] flex-col gap-1.5 px-5 py-3.5 [&+&]:border-l [&+&]:border-l-[color:var(--color-rule)]">
            <dt className="font-mono text-[length:var(--text-label)] uppercase tracking-[0.06em] text-[color:var(--color-steel)]">
                {label}
            </dt>
            <dd className="type-face text-[26px] leading-none tabular-nums">{children}</dd>
        </div>
    );
}

function TxLink({chainId, hash}: {chainId: number; hash: Hex | null}) {
    if (hash === null) return <span className="text-[color:var(--color-steel)]">dry run</span>;
    return (
        <a
            href={explorerTxUrl(chainId, hash)}
            target="_blank"
            rel="noreferrer"
            aria-label={`Transaction ${hash} on the explorer, opens in a new tab`}
            className="tabular-nums"
        >
            {short(hash)} <span aria-hidden="true">↗</span>
        </a>
    );
}

const LABEL =
    "font-mono text-[length:var(--text-label)] uppercase tracking-[0.06em] text-[color:var(--color-steel)]";
const CELL = "font-mono text-[length:var(--text-body-sm)] leading-[1.6]";
const TH = `${LABEL} pb-2 pr-4 text-left font-normal`;
const TD = `${CELL} border-t border-[color:var(--color-rule)] py-2 pr-4 align-top`;

const VERB: Record<ChainFact["kind"], string> = {
    declared: "declared",
    deposit: "supported",
    redeem: "withdrew",
};

/**
 * A tool as the rest of the app names it: the skill or `owner/repo`, with the repository under a
 * skill, and a link to its page. It printed the whole URL, `github.com/obra/superpowers?skill=…`,
 * and was not a link (task 48).
 */
function ToolName({label, atomId}: {label: string; atomId: string}) {
    const parsed = parseToolLabel(label);
    const source = sourceOf(parsed);
    // Banged: the unlayered `a { color; text-decoration }` in `index.css` beats an unbanged colour
    // or underline utility, which rendered these names silver with no hover mark.
    return (
        <Link
            to={`/atom/${atomId}`}
            className="block text-[color:var(--color-fg)]! hover:underline! underline-offset-4"
        >
            <span className="break-all">{primaryNameOf(parsed)}</span>
            {source === null ? null : (
                <span className="block text-[length:var(--text-label)] text-[color:var(--color-steel)]">
                    {source}
                </span>
            )}
        </Link>
    );
}

function ChainLine({fact, chainId}: {fact: ChainFact; chainId: number}) {
    return (
        <tr>
            <td className={`${TD} whitespace-nowrap text-[color:var(--color-steel)] tabular-nums`}>
                {stamp(fact.at)}
            </td>
            <td className={TD}>
                {/* Banged for the same reason as `ToolName`'s link. */}
                <Link
                    to={`/atom/${fact.agentAtomId}`}
                    className="text-[color:var(--color-fg)]! hover:underline! underline-offset-4"
                >
                    {fact.agent}
                </Link>
            </td>
            <td className={`${TD} text-[color:var(--color-silver)]`}>
                {VERB[fact.kind]}
                {fact.assets === null ? null : (
                    <span className="tabular-nums">{` ${amountOf(fact.assets, chainId)}`}</span>
                )}
                {fact.account === null ? null : (
                    <span className="block text-[color:var(--color-steel)]" title={fact.account}>
                        {`by ${fact.account.slice(0, 6)}…${fact.account.slice(-4)}`}
                    </span>
                )}
            </td>
            <td className={TD}>
                <ToolName label={fact.tool} atomId={fact.toolAtomId} />
            </td>
            <td className={`${TD} text-right`}>
                {fact.tx === null ? null : <TxLink chainId={chainId} hash={fact.tx} />}
            </td>
        </tr>
    );
}

/** The public rows. */
function FactsTable({
    facts,
    chainId,
    labelledBy,
}: {
    facts: readonly ChainFact[];
    chainId: number;
    labelledBy: string;
}) {
    return (
        <table aria-labelledby={labelledBy} className="w-full border-collapse">
            <thead>
                <tr>
                    <th scope="col" className={`${TH} w-[9.5rem]`}>
                        Time
                    </th>
                    <th scope="col" className={`${TH} w-[12rem]`}>
                        Agent
                    </th>
                    <th scope="col" className={`${TH} w-[14rem]`}>
                        Did
                    </th>
                    <th scope="col" className={TH}>
                        On
                    </th>
                    <th scope="col" className={`${TH} w-[8rem] text-right`}>
                        Transaction
                    </th>
                </tr>
            </thead>
            <tbody>
                {facts.map((fact) => (
                    <ChainLine key={fact.key} fact={fact} chainId={chainId} />
                ))}
            </tbody>
        </table>
    );
}

type FactFilter = (typeof FACT_FILTERS)[number]["id"];

/**
 * What happens on ARP, live: every identified agent's declarations and the support on them, read
 * from the indexer and re-read every fifteen seconds, the same for every visitor, newest first.
 *
 * It had a second view, **Yours** (task 46c): the wallet's positions, its own public rows and the
 * local runtime's feed. The user removed it on 2026-11-10, with `/account`.
 */
export function ActivityPage({reads}: {reads?: ChainReads} = {}) {
    const chain = useChainChoice();
    const onChain = useChainFacts(reads);
    const [kind, setKind] = useState<FactFilter>("all");
    const shown = factsOfKind(onChain.facts, kind);

    return (
        <section>
            <header className="grid items-end gap-x-8 gap-y-6 pt-14 pb-10 md:grid-cols-[minmax(0,1fr)_auto]">
                <h1 className="type-display">Activity</h1>
                <dl className="flex overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--color-rule)]">
                    <Fact label="Chain">
                        <span className="text-[18px]">{chain.label}</span>
                    </Fact>
                    <Fact label="Rows">
                        {onChain.status === "pending" ? "—" : onChain.facts.length}
                    </Fact>
                </dl>
            </header>

            <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-[color:var(--color-rule)] py-3.5">
                <Segmented label="Show" selected={kind} onChange={setKind} options={FACT_FILTERS} />
            </div>

            <h2 className={`${LABEL} mb-2`} id="activity-chain">
                {`Public · every agent${
                    onChain.status === "error" && onChain.facts.length > 0
                        ? " · incomplete, one read failed"
                        : ""
                }`}
            </h2>
            {shown.length === 0 && onChain.status === "success" && kind === "all" ? (
                <div className={`${CELL} border-t border-[color:var(--color-rule)] py-3`}>
                    <NoActivityYet />
                </div>
            ) : shown.length === 0 ? (
                <p
                    className={`${CELL} border-t border-[color:var(--color-rule)] py-3 text-[color:var(--color-steel)]`}
                >
                    {onChain.status === "pending"
                        ? "Reading the indexer"
                        : onChain.status === "error" && onChain.facts.length === 0
                          ? "The indexer did not answer. It is asked again every 15 seconds."
                          : "None of this kind among the latest public rows."}
                </p>
            ) : (
                <FactsTable facts={shown} chainId={chain.chainId} labelledBy="activity-chain" />
            )}
        </section>
    );
}
