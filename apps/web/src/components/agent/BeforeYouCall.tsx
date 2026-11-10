import type {AgentContents} from "@arp-protocol/core";

import {Hint} from "../brand/Hint";
import {BeforeSection, Dated, OnDemand, PendingRows, QuestionRow, steel} from "../atom/BeforeParts";
import {TrustIndexVerdicts} from "./TrustIndexVerdicts";
import {useAgentContents} from "../../hooks/use-agent-contents";
import {formatDay} from "../../lib/atom-page";
import {linkClass} from "../../lib/control-class";
import {beforeCallSummary, type AgentKey} from "../../services/agent-contents";

/**
 * "Before you call", under the agent's name (task 112, ADR `0182`): the agent-side twin of a
 * skill's Before you install. An agent is called or hired, not installed, so the questions are
 * whether it can be reached, what it speaks, whether it answered when the directory was read, and
 * what it asks for: a payment (with x402 Doctor's word on its endpoints when its reading covered
 * them) and auth. From its registration document and the sieve's dated reading
 * (`packages/protocol/src/agent-contents.ts`). Facts, never a verdict.
 *
 * Every row is always there, from the first paint, holding "…" while the document loads and "—" when
 * there is none or it cannot be read; the x402 Trust Index is one line in the Payment row whatever it
 * says. So the description and the tabs below do not move. The endpoint-by-endpoint detail is the
 * Endpoints tab's; this names the hosts and stops.
 */
export function BeforeYouCall({agent}: {agent: AgentKey}) {
    const query = useAgentContents(agent);
    const read = query.data;
    const at =
        read?.status === "read" && read.contents.answers !== null && read.contents.answers.status !== "not read"
            ? read.contents.answers.at
            : null;

    return (
        <BeforeSection
            id="before-you-call"
            label="Before you call"
            aside={
                read === undefined ? null : (
                    <>
                        <Hint label="What Before you call is read from">
                            What its registration document declares, not shown to work, and whether an
                            endpoint answered in the dated reading of the directory.
                        </Hint>
                        {at === null ? null : <Dated day={formatDay(at.slice(0, 10))} />}
                    </>
                )
            }
            summary={
                read === undefined ? (
                    query.isError ? (
                        <span className={steel}>could not be read</span>
                    ) : null
                ) : read.status === "none" ? (
                    <span className={steel}>no registration document</span>
                ) : read.status === "unreadable" ? (
                    read.href === null ? (
                        <span className={steel}>document unreadable</span>
                    ) : (
                        <a href={read.href} target="_blank" rel="noreferrer" className={`${steel} ${linkClass}`}>
                            document unreadable ↗
                        </a>
                    )
                ) : (
                    beforeCallSummary(read.contents)
                )
            }
        >
            {read?.status === "read" ? (
                <Rows contents={read.contents} registrationFile={agent.registrationFile} />
            ) : (
                <PendingRows terms={ALWAYS} text={read === undefined && !query.isError ? "…" : "—"} />
            )}
        </BeforeSection>
    );
}

/** Every row a read document shows. */
const ALWAYS = ["Endpoints", "Speaks", "Answered", "Payment", "Auth"];

function Rows({contents, registrationFile}: {contents: AgentContents; registrationFile: string | null}) {
    const hosts = [...new Set(contents.endpoints.flatMap((endpoint) => (endpoint.host === null ? [] : [endpoint.host])))];
    const unreachable = contents.endpoints.filter((endpoint) => endpoint.host === null).length;
    return (
        <>
            <QuestionRow term="Endpoints">
                {contents.endpoints.length === 0 ? (
                    <span className={steel}>none declared</span>
                ) : (
                    <>
                        {hosts.length === 0 ? null : <span>{hosts.join(", ")}</span>}
                        {unreachable === 0 ? null : (
                            <OnDemand
                                count={`${unreachable} no probe can reach`}
                                items={contents.endpoints.flatMap((endpoint) =>
                                    endpoint.host === null
                                        ? [`${endpoint.name ?? "unnamed"} · ${endpoint.notCheckable ?? "not a URL"}`]
                                        : [],
                                )}
                            />
                        )}
                    </>
                )}
            </QuestionRow>
            <QuestionRow term="Speaks">
                {contents.protocols.length === 0 ? (
                    <span className={steel}>no MCP or A2A declared</span>
                ) : (
                    contents.protocols.map((protocol) => protocol.toUpperCase()).join(", ")
                )}
            </QuestionRow>
            <QuestionRow term="Answered">
                <Answers answers={contents.answers} />
            </QuestionRow>
            <QuestionRow term="Payment">
                <span className={contents.x402 === "declared" ? undefined : steel}>
                    {contents.x402 === "declared" ? "x402 asked" : "none declared"}
                </span>
                {/* Only where it asks for a payment: x402 Doctor reads x402 endpoints, and the
                    row's height is settled once the document is, which is when this renders. */}
                {contents.x402 === "declared" ? <TrustIndexVerdicts registrationFile={registrationFile} /> : null}
            </QuestionRow>
            <QuestionRow term="Auth">
                {contents.auth.length === 0 ? <span className={steel}>none named</span> : contents.auth.join(", ")}
            </QuestionRow>
        </>
    );
}

function Answers({answers}: {answers: AgentContents["answers"]}) {
    if (answers === null || answers.status === "not read") return <span className={steel}>not in the reading</span>;
    if (answers.status === "no answer")
        return answers.couldNotSay ? (
            <span className={`inline-flex items-center gap-2 ${steel}`}>
                no verdict
                <Hint label="What no verdict means" align="right">
                    The reading failed in a way that says nothing about the agent.
                </Hint>
            </span>
        ) : (
            <span className={steel}>no answer</span>
        );
    const said = answers.speaks.length === 0 ? "answered" : `answered · ${answers.speaks.join(", ")}`;
    return answers.proofUrl === null ? (
        <span>{said}</span>
    ) : (
        <span>
            {said} <span className={steel}>{answers.proofUrl}</span>
        </span>
    );
}
