import {readAgentContents, type AgentContents, type SieveReadingRow} from "@arp-protocol/core";

import reading from "../../../../data/catalogue/agent-sieve-13579.json";

import {readRegistrationDocument} from "./agent-endpoints";
import type {SieveReading} from "./agents-reachable";

/**
 * What an agent offers, for its page: the endpoints it declares, MCP or A2A, whether it says it takes
 * x402 payments, the auth schemes it names, and whether it answered in the sieve's dated reading
 * (task 96, `packages/protocol/src/agent-contents.ts`). The agent-side twin of a skill's "Contains".
 *
 * On the agent page since task 104, through `useAgentContents`; as `components/agent/BeforeYouCall.tsx` since task 112.
 *
 * The document is read the way `agent-endpoints.ts` reads it, in the browser; the sieve's row is the
 * bundled reading `/agents` already uses, so nothing here probes an agent.
 */
export type AgentContentsRead =
    | {status: "none"}
    | {status: "unreadable"; href: string | null; detail: string}
    | {status: "read"; url: string; contents: AgentContents};

export type AgentKey = {registrationFile: string | null; chainId: number; tokenId: string};

/** The agent's row in the sieve's reading, `null` when the walk did not reach it. */
export function sieveRowOf(sieve: SieveReading, chainId: number, tokenId: string): SieveReadingRow | null {
    return sieve.agents.find((agent) => agent.chainId === chainId && agent.tokenId === tokenId) ?? null;
}

export async function readAgentContentsOf(
    agent: AgentKey,
    // The shape `build-agent-sieve.ts` writes; checked by `agents-reachable.test.ts`.
    sieve: SieveReading = reading as SieveReading,
    fetchImpl: typeof fetch = fetch,
): Promise<AgentContentsRead> {
    const document = await readRegistrationDocument(agent.registrationFile, fetchImpl);
    if (document.status === "none") return {status: "none"};
    if (document.status === "unreadable") return {status: "unreadable", href: document.href, detail: document.detail};
    return {
        status: "read",
        url: document.url,
        contents: readAgentContents(document.document, sieveRowOf(sieve, agent.chainId, agent.tokenId)),
    };
}

/**
 * Before you call's one line (task 112, ADR `0182`): can it be reached, what it speaks, what it asks
 * for, and whether it answered, in that order. Facts from its document and the dated reading, whose
 * date the section's label already carries.
 */
export function beforeCallSummary(contents: AgentContents): string {
    const count = contents.endpoints.length;
    const answers = contents.answers;
    return [
        count === 0 ? "no endpoint declared" : `${count} ${count === 1 ? "endpoint" : "endpoints"}`,
        contents.protocols.length === 0
            ? "no MCP or A2A"
            : contents.protocols.map((protocol) => protocol.toUpperCase()).join(", "),
        contents.x402 === "declared" ? "x402 payment asked" : "no payment declared",
        contents.auth.length === 0 ? "no auth named" : `auth: ${contents.auth.join(", ")}`,
        answers === null || answers.status === "not read"
            ? "not checked"
            : answers.status === "answered"
              ? "answered"
              : answers.couldNotSay
                ? "no verdict"
                : "no answer",
    ].join(" · ");
}
