import {TRUST_INDEX_CREDIT, TRUST_INDEX_DATASET, TRUST_INDEX_LICENCE} from "@arp-protocol/core";

import {Hint} from "../brand/Hint";
import {useAgentEndpoints} from "../../hooks/use-agent-endpoints";
import {useOutsideSignals} from "../../hooks/use-outside-signals";
import {formatDay} from "../../lib/atom-page";
import {linkClass} from "../../lib/control-class";
import {endpointsOutsideOf, type EndpointOutsideView} from "../../services/outside-signals";

const steel = "text-[color:var(--color-steel)]";

/**
 * What x402 Doctor's Trust Index said about an agent's callable endpoints on the day of its scan
 * (task 101, ADR `0170`): somebody else's figure under CC BY 4.0, credited where it is shown as the
 * licence asks; never ARP's, never in an order.
 *
 * Inside Before you call's Payment row since task 112, as **one line whatever the reading says**: "…"
 * while it loads, "not in its reading" when none of the agent's hosts was asked about, or the count of
 * endpoints read, which opens on the verdicts and the credit. It was a card of its own that appeared
 * or not and moved what was below it; in the content column a line that grew would move the
 * description and the tabs.
 */
export function TrustIndexVerdicts({registrationFile}: {registrationFile: string | null}) {
    const endpoints = useAgentEndpoints(registrationFile);
    const file = useOutsideSignals();
    const read = endpoints.data;
    if (file === undefined || (read === undefined && !endpoints.isError))
        return <Line text="x402 Trust Index …" />;
    const urls =
        read?.status === "read"
            ? read.probeable.flatMap((endpoint) =>
                  endpoint.classification.status === "probeable"
                      ? [endpoint.classification.url]
                      : [],
              )
            : [];
    const rows = endpointsOutsideOf(file, urls);
    if (rows.length === 0) return <Line text="x402 Trust Index: not in its reading" />;
    const {scan, read: readOn} = file.sources.trustIndex;
    const day = scan ?? readOn;

    return (
        // The Hint sits beside the summary, not in it: a button inside `summary` would also toggle it.
        <div className="mt-1 flex items-start gap-2">
            <details className="min-w-0">
                <summary
                    className={`cursor-pointer ${steel} hover:text-[color:var(--color-silver)]`}
                >
                    {`x402 Trust Index: ${rows.length} ${rows.length === 1 ? "endpoint" : "endpoints"} read`}
                </summary>
                <ul className="m-0 mt-1.5 flex list-none flex-col p-0">
                    {rows.map((row) => (
                        <Row key={row.url} row={row} />
                    ))}
                </ul>
                <a
                    href={`https://${TRUST_INDEX_DATASET}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`text-[length:var(--text-label)] text-[color:var(--color-steel)]! ${linkClass}`}
                >
                    {`${day === null ? "" : `${formatDay(day)} · `}${TRUST_INDEX_CREDIT} · ${TRUST_INDEX_LICENCE} ↗`}
                </a>
            </details>
            <WhatItIs />
        </div>
    );
}

function WhatItIs() {
    return (
        <Hint label="What the x402 Trust Index is" align="right">
            x402 Doctor&apos;s daily check of listed x402 endpoints, made without paying: go,
            caution or no go, and the days it could be paid.
        </Hint>
    );
}

/** The one line the row holds while there are no verdicts to open. */
function Line({text}: {text: string}) {
    return (
        <span className={`mt-1 flex items-center gap-2 ${steel}`}>
            {text}
            <WhatItIs />
        </span>
    );
}

function Row({row}: {row: EndpointOutsideView}) {
    let said: string;
    if (row.found.kind === "endpoint") {
        const {verdict, daysPayable, daysChecked} = row.found.entry;
        said = `${verdict === "error" ? "unreachable" : verdict === "no_go" ? "no go" : verdict} · payable ${daysPayable}/${daysChecked} days`;
    } else if (row.found.kind === "host") {
        const {endpoints, go} = row.found.host;
        said = `not listed · its host ${go}/${endpoints} go`;
    } else {
        said = "not listed";
    }
    return (
        <li className="py-0.5 [overflow-wrap:anywhere]">
            {/* One line per endpoint: its address without the scheme, then the index's word on it. */}
            <span className={steel}>{`${row.url.replace(/^https?:\/\//, "")} `}</span>
            <a href={row.check} target="_blank" rel="noreferrer" className={linkClass}>
                {`${said} ↗`}
            </a>
        </li>
    );
}
