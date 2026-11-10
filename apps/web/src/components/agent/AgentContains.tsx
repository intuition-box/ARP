import type {AgentContents} from "@arp-protocol/core";

import {Hint} from "../brand/Hint";
import {ClsRow, Panel} from "../atom/AtomPageParts";
import {Names} from "../atom/SkillContains";
import {useAgentContents} from "../../hooks/use-agent-contents";
import {formatDay} from "../../lib/atom-page";
import {linkClass} from "../../lib/control-class";
import type {AgentKey} from "../../services/agent-contents";

const steel = "text-[color:var(--color-steel)]";

/**
 * What an agent offers, in the agent page's facts column (task 104): the agent-side twin of the
 * skill page's Contains (task 96, ADR `0165`). Its registration document's endpoints, protocols, x402
 * and auth, and whether it answered in the sieve's dated reading. Facts, never a verdict.
 */
export function AgentContains({agent}: {agent: AgentKey}) {
    const query = useAgentContents(agent);
    const read = query.data;
    const at = read?.status === "read" && read.contents.answers !== null && read.contents.answers.status !== "not read"
        ? read.contents.answers.at
        : null;

    return (
        <Panel
            label="Contains"
            aside={
                <>
                    <Hint label="What Contains is read from" align="right">
                        What its registration document declares, and whether an endpoint answered in the
                        dated reading of the directory. Its own word, not shown to work. No verdict: the
                        reading failed in a way that says nothing about the agent.
                    </Hint>
                    {at === null ? null : (
                        <span className={`ml-auto normal-case tracking-[0.04em] ${steel}`}>{formatDay(at.slice(0, 10))}</span>
                    )}
                </>
            }
        >
            {read === undefined ? (
                <span className={`font-mono text-[13px] ${steel}`}>{query.isError ? "could not be read" : "…"}</span>
            ) : read.status === "none" ? (
                <span className={`font-mono text-[13px] ${steel}`}>no registration document</span>
            ) : read.status === "unreadable" ? (
                read.href === null ? (
                    <span className={`font-mono text-[13px] ${steel}`}>document unreadable</span>
                ) : (
                    <a href={read.href} target="_blank" rel="noreferrer" className={`font-mono text-[13px] ${linkClass}`}>
                        document unreadable ↗
                    </a>
                )
            ) : (
                <Rows contents={read.contents} />
            )}
        </Panel>
    );
}

function Rows({contents}: {contents: AgentContents}) {
    return (
        <dl className="m-0">
            <ClsRow term="Endpoints">
                <Names
                    names={contents.endpoints.map(
                        (endpoint) => `${endpoint.name ?? "unnamed"} ${endpoint.host ?? endpoint.notCheckable ?? ""}`.trim(),
                    )}
                    cut={false}
                    empty="none declared"
                />
            </ClsRow>
            <ClsRow term="Protocols">
                <Names names={contents.protocols} cut={false} empty="none" />
            </ClsRow>
            <ClsRow term="x402">
                <span className={contents.x402 === "declared" ? undefined : steel}>{contents.x402}</span>
            </ClsRow>
            <ClsRow term="Auth">
                <Names names={contents.auth} cut={false} empty="none named" />
            </ClsRow>
            <ClsRow term="Answers">
                <Answers answers={contents.answers} />
            </ClsRow>
        </dl>
    );
}

function Answers({answers}: {answers: AgentContents["answers"]}) {
    if (answers === null || answers.status === "not read") return <span className={steel}>not read</span>;
    if (answers.status === "no answer")
        return <span className={steel}>{answers.couldNotSay ? "no verdict" : "no answer"}</span>;
    const said = answers.speaks.length === 0 ? "answered" : `answered · ${answers.speaks.join(", ")}`;
    return answers.proofUrl === null ? (
        <span>{said}</span>
    ) : (
        <span className="[overflow-wrap:anywhere]">
            {said}{" "}
            <span className={steel}>{answers.proofUrl}</span>
        </span>
    );
}
