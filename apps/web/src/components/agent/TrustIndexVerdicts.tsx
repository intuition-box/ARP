import {TRUST_INDEX_CREDIT, TRUST_INDEX_DATASET, TRUST_INDEX_LICENCE} from "@arp-protocol/core";

import {Hint} from "../brand/Hint";
import {useAgentEndpoints} from "../../hooks/use-agent-endpoints";
import {useOutsideSignals} from "../../hooks/use-outside-signals";
import {formatDay} from "../../lib/atom-page";
import {linkClass} from "../../lib/control-class";
import {endpointsOutsideOf, type EndpointOutsideView} from "../../services/outside-signals";

/**
 * What x402 Doctor's Trust Index said about an agent's callable endpoints on the day of its scan
 * (task 101, ADR `0170`): somebody else's figure under CC BY 4.0, credited where it is shown as the
 * licence asks; never ARP's, never in an order.
 *
 * Inside Before you call's Payment row since task 112: it answers "what does it ask for" and was a
 * card of its own that appeared or not under Identity and moved what was below it. Renders nothing
 * when the reading did not ask about any of the agent's hosts: "not read" is not "not listed".
 */
export function TrustIndexVerdicts({registrationFile}: {registrationFile: string | null}) {
    const endpoints = useAgentEndpoints(registrationFile);
    const file = useOutsideSignals();
    const read = endpoints.data;
    if (file === undefined || read === undefined || read.status !== "read") return null;
    const urls = read.probeable.flatMap((endpoint) =>
        endpoint.classification.status === "probeable" ? [endpoint.classification.url] : [],
    );
    const rows = endpointsOutsideOf(file, urls);
    if (rows.length === 0) return null;
    const {scan, read: readOn} = file.sources.trustIndex;
    const day = scan ?? readOn;

    return (
        <div className="mt-2 flex flex-col gap-1">
            <span className="inline-flex items-center gap-2 text-[color:var(--color-steel)]">
                {`x402 Trust Index${day === null ? "" : `, ${formatDay(day)}`}`}
                <Hint label="What the x402 Trust Index is" align="right">
                    x402 Doctor&apos;s daily check of listed x402 endpoints, made without paying: go,
                    caution or no go, and the days it could be paid.
                </Hint>
            </span>
            <ul className="m-0 flex list-none flex-col p-0">
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
                {`${TRUST_INDEX_CREDIT} · ${TRUST_INDEX_LICENCE} ↗`}
            </a>
        </div>
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
            <span className="text-[color:var(--color-steel)]">{`${row.url.replace(/^https?:\/\//, "")} `}</span>
            <a href={row.check} target="_blank" rel="noreferrer" className={linkClass}>
                {`${said} ↗`}
            </a>
        </li>
    );
}
