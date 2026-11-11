import {Hint} from "../brand/Hint";
import {hasLastPurchaseSource, useLastPurchase} from "../../hooks/use-last-purchase";
import {formatDay} from "../../lib/atom-page";
import {linkClass} from "../../lib/control-class";
import {cardClass} from "../../lib/surface-class";
import {
    endpointOfLabel,
    lastPurchaseView,
    NOHUMANS_SOURCE,
    type LastPurchaseView,
} from "../../services/last-purchase";
import {truncateMiddle} from "../../services/trust-format";

const steel = "text-[color:var(--color-steel)]";

/**
 * nohumans.directory's last purchase of the endpoint a tool atom names (task 120, ADR `0187`):
 * whether it delivered, its failure code, the day, the settlement transaction, and the credit CC BY
 * 4.0 asks for. Somebody else's verdict, never an ARP line and in no ARP figure.
 *
 * Absent when the build has no API (`VITE_ARP_API_URL`), when the API serves no such route (its
 * `ARP_X402_LAST_PURCHASE` is off, ADR `0200`), or the atom is not an endpoint. Otherwise
 * **three lines in every state**, "…" while it loads included, so the column never moves under the
 * reader when the reading lands (the user's standing ask for these pages). One exception: with the
 * route off, "…" shows until the 404 lands, then the card goes.
 */
export function LastPurchase({label}: {label: string | null}) {
    const endpoint = endpointOfLabel(label);
    const query = useLastPurchase(hasLastPurchaseSource ? endpoint : null);
    if (!hasLastPurchaseSource || endpoint === null || query.data === null) return null;
    const view = lastPurchaseView(
        query.isError
            ? {status: "error"}
            : query.data === undefined
              ? {status: "pending"}
              : {status: "read", answer: query.data},
    );
    return <LastPurchaseCard view={view} />;
}

/** The card itself, apart from the read, so a test can hand it each state. */
export function LastPurchaseCard({view}: {view: LastPurchaseView}) {
    const said = [view.verdict, view.reason, view.delisted ? "delisted" : null]
        .filter((part) => part !== null)
        .join(" · ");
    return (
        <section
            aria-label="Last purchase, checked by nohumans.directory"
            className={`mt-6 ${cardClass} text-[length:var(--text-body-sm)]`}
        >
            <div className="flex items-center justify-between gap-2">
                <h2
                    className={`font-mono text-[length:var(--text-label)] uppercase tracking-[0.08em] ${steel}`}
                >
                    Last purchase
                </h2>
                <Hint label="What this purchase is" align="right">
                    nohumans.directory pays listed x402 endpoints in USDC on Base and checks what
                    comes back. Its record, not an ARP line, and in no ARP figure.
                </Hint>
            </div>
            {/* One line each, cut rather than wrapped: the card's height is the same in every state.
                Only these two are announced when the reading lands, not the heading and credit. */}
            <div aria-live="polite">
                <p className="mt-2 truncate font-mono" title={said}>
                    {said}
                </p>
                <p className={`mt-1 truncate font-mono ${steel}`}>
                    <Observed view={view} />
                </p>
            </div>
            <p className={`mt-3 font-mono text-[length:var(--text-label)] ${steel}`}>
                <a
                    href={NOHUMANS_SOURCE.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`text-[color:var(--color-steel)]! ${linkClass}`}
                >
                    {`${NOHUMANS_SOURCE.name} ↗`}
                </a>
                {" · "}
                <a
                    href={NOHUMANS_SOURCE.licenceUrl}
                    target="_blank"
                    rel="noreferrer license"
                    className={`text-[color:var(--color-steel)]! ${linkClass}`}
                >
                    {`${NOHUMANS_SOURCE.licence} ↗`}
                </a>
            </p>
        </section>
    );
}

/** The day it was observed and the transaction, or the record when there was no purchase. */
function Observed({view}: {view: LastPurchaseView}) {
    if (view.day === null) {
        if (view.listing === null) return <>{" "}</>;
        return (
            <a href={view.listing} target="_blank" rel="noreferrer" className={linkClass}>
                record ↗
            </a>
        );
    }
    const tx = view.tx;
    return (
        <>
            {formatDay(view.day)}
            {tx === null ? null : (
                <>
                    {" · "}
                    {tx.href === null ? (
                        <span>{truncateMiddle(tx.hash, 6, 4)}</span>
                    ) : (
                        <a
                            href={tx.href}
                            target="_blank"
                            rel="noreferrer"
                            className={linkClass}
                            aria-label={`Settlement transaction ${tx.hash}`}
                        >
                            {`${truncateMiddle(tx.hash, 6, 4)} ↗`}
                        </a>
                    )}
                </>
            )}
        </>
    );
}
