import {
    canonicalToolUrl,
    isToolUrl,
    publishableToolUrl,
    type SignedListToolRequest,
} from "@arp-protocol/core";

/**
 * Ask the sponsor to list a tool or a skill on testnet 13579 (task 53c, ADR `0123`).
 *
 * Signed when the caller can sign: a request signed by a wallet or the agent key gets that
 * address's own daily cap. Unsigned otherwise, counted against the shared anonymous cap (the
 * user's decision, 2026-11-03, `docs/tasks/53` §2).
 *
 * No React. Every IO is injected, so the test needs no server.
 */
export type ListToolResult =
    | {status: "listed"; atomId: string; created: boolean; transactions: readonly string[]}
    | {status: "refused"; rule: string | null; retry: boolean; httpStatus: number}
    | {status: "unavailable"}
    /** Not sent: the URL carries a value a listing would make public (task 123, ADR `0190`). */
    | {status: "private"; listable: string | null};

export type ListToolDeps = {
    /** `undefined` when no sponsor is configured: nothing is sent. */
    endpoint: string | undefined;
    fetch: typeof fetch;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

/**
 * What to sign and send for a pasted URL, decided before either (task 123, ADR `0190`): its canonical form,
 * so a GitHub URL's other parameters never leave the page, or the answer itself when the listed form would
 * carry a value (an `?api_key=…`, a token in the path). Refused rather than stripped, so the person who
 * pasted a key knows they did. A URL that is not a tool goes as typed, for the sponsor to refuse.
 */
export function listingRequest(url: string): {send: string} | {answer: ListToolResult} {
    if (!isToolUrl(url)) return {send: url};
    const canonical = canonicalToolUrl(url);
    const verdict = publishableToolUrl(canonical);
    return verdict.ok ? {send: canonical} : {answer: {status: "private", listable: verdict.listable}};
}

export async function listTool(
    url: string,
    deps: ListToolDeps,
    signed?: SignedListToolRequest,
): Promise<ListToolResult> {
    if (deps.endpoint === undefined) return {status: "unavailable"};
    let response: Response;
    try {
        response = await deps.fetch(`${deps.endpoint}/list-tool`, {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify(signed === undefined ? {url} : {url, request: signed}),
        });
    } catch {
        // The sponsor runs on the operator's machine (`docs/26` §2); not running is the usual cause.
        return {status: "unavailable"};
    }
    const body: unknown = await response.json().catch(() => null);
    if (response.ok && isRecord(body) && typeof body["atomId"] === "string") {
        const transactions = Array.isArray(body["transactions"])
            ? body["transactions"].filter((hash): hash is string => typeof hash === "string")
            : [];
        return {
            status: "listed",
            atomId: body["atomId"],
            created: body["created"] === true,
            transactions,
        };
    }
    return {
        status: "refused",
        rule: isRecord(body) && typeof body["rule"] === "string" ? body["rule"] : null,
        retry: isRecord(body) && body["retry"] === true,
        httpStatus: response.status,
    };
}

/** One short line for each outcome, in the page's plain words (ADR `0103`). */
export function listToolMessage(result: ListToolResult): string {
    switch (result.status) {
        case "listed":
            return result.created ? "Listed." : "Already listed.";
        case "unavailable":
            return "Adding is not available right now.";
        case "private":
            return result.listable === null
                ? "That URL carries a value, such as a key, and a listing is public for good. Remove it."
                : `That URL carries a value, such as a key, and a listing is public for good. Add ${result.listable} instead.`;
        case "refused":
            if (result.rule === "url") return "That is not a tool or skill URL.";
            if (result.rule === "resolves" && !result.retry)
                return "Nothing found at that URL on GitHub.";
            if (result.rule === "limit") return "Today's limit is reached. Try again tomorrow.";
            // 422s from the sponsor's check of what a URL is (task 94, ADR `0163`); nothing is spent.
            if (result.rule === "not-a-tool")
                return "No skill, plugin, MCP server, A2A agent or x402 endpoint found there.";
            if (result.rule === "unreachable") return "That URL did not answer.";
            if (result.rule === "private-address") return "That URL is not a public address.";
            if (result.rule === "endpoint-private")
                return "That URL carries a value, such as a key, and a listing is public for good. Remove it.";
            // 409 `pending`: a send of this same listing is not confirmed yet (ADR `0123`).
            if (result.rule === "pending") return "Already being added. Try again in a minute.";
            if (result.retry) return "Not answered right now. Try again.";
            return "It could not be added.";
    }
}
