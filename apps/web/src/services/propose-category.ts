/**
 * Ask the sponsor to tag a tool with an existing category (task 59, ADR `0124`). Only the tag is
 * written. A new category is added by a registered agent's signed request, never from here (task 73,
 * ADR `0146`). The sponsor decides; this reports what it answered.
 *
 * No React. Every IO is injected, so the test needs no server.
 */
export type CategoryRequest = {
    label: string;
    subjectId: string;
};

export type ProposeCategoryResult =
    | {status: "done"; label: string; newCategory: boolean; created: boolean}
    | {status: "refused"; rule: string | null; retry: boolean; httpStatus: number}
    | {status: "unavailable"};

export type ProposeCategoryDeps = {
    /** `undefined` when no sponsor is configured: nothing is sent. */
    endpoint: string | undefined;
    fetch: typeof fetch;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export async function proposeCategory(
    request: CategoryRequest,
    deps: ProposeCategoryDeps,
): Promise<ProposeCategoryResult> {
    if (deps.endpoint === undefined) return {status: "unavailable"};
    let response: Response;
    try {
        response = await deps.fetch(`${deps.endpoint}/propose-category`, {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify(request),
        });
    } catch {
        return {status: "unavailable"};
    }
    const body: unknown = await response.json().catch(() => null);
    if (response.ok && isRecord(body) && typeof body["label"] === "string") {
        return {
            status: "done",
            label: body["label"],
            newCategory: body["newCategory"] === true,
            created: body["created"] === true,
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
export function proposeCategoryMessage(result: ProposeCategoryResult): string {
    switch (result.status) {
        case "done":
            return result.created ? `Filed under “${result.label}”.` : `Already in “${result.label}”.`;
        case "unavailable":
            return "Categories are not available right now.";
        case "refused":
            switch (result.rule) {
                case "agent":
                    return "Pick a category from the list.";
                case "root":
                    return "Pick a category under tool, not tool itself.";
                case "limit":
                    return "Today's limit is reached. Try again tomorrow.";
                case "pending":
                    return "Already being filed. Try again in a minute.";
                case "changed":
                    return "The tree changed meanwhile. Try again.";
                case "skill":
                    return "That tool is not on the index yet. Try again in a minute.";
                case "config":
                    return "Categories are not available right now.";
                default:
                    return result.retry
                        ? "Not answered right now. Try again."
                        : "It could not be filed.";
            }
    }
}
