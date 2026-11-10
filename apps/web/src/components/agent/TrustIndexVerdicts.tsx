import {TRUST_INDEX_CREDIT, TRUST_INDEX_DATASET, TRUST_INDEX_LICENCE} from "@arp-protocol/core";

import {Hint} from "../brand/Hint";
import {Panel} from "../atom/AtomPageParts";
import {useAgentEndpoints} from "../../hooks/use-agent-endpoints";
import {useOutsideSignals} from "../../hooks/use-outside-signals";
import {formatDay} from "../../lib/atom-page";
import {linkClass} from "../../lib/control-class";
import {endpointsOutsideOf, type EndpointOutsideView} from "../../services/outside-signals";

/**
 * What x402 Doctor's Trust Index said about an agent's callable endpoints on the day of its scan
 * (task 101, ADR `0170`), in the agent page's facts column. Somebody else's figure under CC BY 4.0,
 * credited on the panel as the licence asks; never ARP's, never in an order.
 *
 * Absent when the reading did not ask about any of the agent's hosts: "not read" is not "not listed",
 * and a panel saying "not read" on most agent pages would be noise.
 */
export function AgentTrustIndex({registrationFile}: {registrationFile: string | null}) {
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
        <Panel
            label="x402 Trust Index"
            aside={
                <>
                    <Hint label="What the x402 Trust Index is" align="right">
                        x402 Doctor&apos;s daily check of listed x402 endpoints, made without paying: go,
                        caution or no go, and the days it could be paid.
                    </Hint>
                    {day === null ? null : (
                        <span className="ml-auto normal-case tracking-[0.04em] text-[color:var(--color-steel)]">
                            {formatDay(day)}
                        </span>
                    )}
                </>
            }
        >
            <ul className="m-0 flex list-none flex-col p-0">
                {rows.map((row) => (
                    <Row key={row.url} row={row} />
                ))}
            </ul>
            <a
                href={`https://${TRUST_INDEX_DATASET}`}
                target="_blank"
                rel="noreferrer"
                className={`font-mono text-[length:var(--text-label)] ${linkClass}`}
            >
                {`${TRUST_INDEX_CREDIT} · ${TRUST_INDEX_LICENCE} ↗`}
            </a>
        </Panel>
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
        <li className="flex flex-col gap-0.5 border-t border-[color:var(--color-rule)] py-[7px] first:border-t-0">
            <span className="font-mono text-[12px] text-[color:var(--color-steel)] [overflow-wrap:anywhere]">
                {row.url}
            </span>
            <a href={row.check} target="_blank" rel="noreferrer" className={`font-mono text-[13px] ${linkClass}`}>
                {`${said} ↗`}
            </a>
        </li>
    );
}
