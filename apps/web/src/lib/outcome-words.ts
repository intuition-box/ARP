/**
 * How an outcome reads on screen (the user, 2026-11-10, ADR `0164`). The chain keeps `worked`; a reader
 * took it as "the result is good", which no line says. So it shows as « task done »: the agent used the
 * tool for what it is for, and its task finished with it.
 */
export function outcomeLabel(outcome: string, reasons: readonly string[] = []): string {
    if (outcome === "worked") return "task done";
    return outcome === "failed" && reasons.length > 0 ? `failed: ${reasons.join(", ")}` : outcome;
}

export const TASK_DONE_HINT =
    "Task done: the agent used it for what it is for, and its task finished with it. Not a verdict on the result.";
