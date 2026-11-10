import {
    createGraphqlTransport,
    DEFAULT_TIMEOUT_MS,
    defaultFetch,
    isRecord,
    PULSE_SUBJECT_USES_QUERY,
    readRecord,
    readString,
} from "@arp-protocol/graphql";

import {getPulseUsage, type PulseDeclaration, type PulseUsage, type PulseUsageConfig} from "./pulse-usage.js";
import {USES} from "./sources/intuition/terms.js";

/**
 * An agent's lines, both ways (task 95): who used it, and what it used.
 *
 * Both sides go through `getPulseUsage`, so a domain or an outcome counts for a wallet only when that
 * wallet declared the use and stands behind it (ADR `0138`). This module only decides which edges to
 * read: the agent's atom as the object, and every object the agent's atom declared it used.
 *
 * It reads one atom, the one the caller names. An agent with several identity atoms has lines under each,
 * and the others are not read here.
 */
export type AgentUsedLine = {
    tool: {atomId: string; label: string | null};
    declaration: PulseDeclaration;
};

export type AgentLines = {
    /** `(other, uses, this agent)`: the agent as what was used. */
    usedBy: PulseUsage;
    /** `(this agent, uses, tool)`: what the agent declared it used, with the lines on each. */
    used: AgentUsedLine[];
    /** A read stopped at its limit, so both lists are a floor. */
    truncated: boolean;
};

/** Above the index's cap, a read could never say it was cut (`pulse-usage.ts`). */
const LIMIT = 250;

export async function getAgentLines(
    agentAtomId: string,
    config: PulseUsageConfig & {read?: typeof getPulseUsage},
): Promise<AgentLines> {
    const transport =
        config.transport ??
        createGraphqlTransport({
            url: config.graphqlUrl,
            fetch: config.fetch ?? defaultFetch(),
            timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        });
    const key = (id: string) => id.toLowerCase();
    const agent = key(agentAtomId);

    const data = await transport.request(PULSE_SUBJECT_USES_QUERY, {subject: agentAtomId, uses: USES, limit: LIMIT});
    const rows = Array.isArray(data["triples"]) ? data["triples"].filter(isRecord) : [];
    const tools = new Map<string, {atomId: string; label: string | null}>();
    for (const row of rows) {
        const object = readRecord(row, "object");
        const atomId = object === null ? null : readString(object, "term_id");
        if (object === null || atomId === null || key(atomId) === agent) continue;
        tools.set(key(atomId), {atomId, label: readString(object, "label")});
    }

    const read = config.read ?? getPulseUsage;
    const usage = await read([agentAtomId, ...[...tools.values()].map((tool) => tool.atomId)], {...config, transport});
    const usedBy = usage.get(agent);
    if (usedBy === undefined) throw new Error("the usage read left out the agent it was asked about");

    const used: AgentUsedLine[] = [];
    let truncated = rows.length >= LIMIT || usedBy.truncated;
    for (const [id, tool] of tools) {
        const lines = usage.get(id);
        if (lines === undefined) continue;
        truncated = truncated || lines.truncated;
        for (const declaration of lines.declarations) {
            if (key(declaration.agent.atomId) === agent) used.push({tool, declaration});
        }
    }
    return {usedBy, used, truncated};
}
