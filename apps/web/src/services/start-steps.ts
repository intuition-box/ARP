/**
 * The steps of each `/start/<profile>` path, and which of them ARP can see done (task 53b).
 *
 * A step ticks itself only from something a program recorded: the local feed is reachable, a skill
 * was served with a receipt, the hook recorded a call, a declaration was sent. Nothing ticks
 * because the visitor clicked. A step nothing can observe carries `done: null` and shows no tick.
 *
 * No React: the page owns the feed's lifecycle and passes what it reads.
 */
import type {ActivityEvent} from "@arp-protocol/core";

import type {StartProfile} from "../lib/start-paths";
import type {FeedStatus} from "./agent-feed";

export type StartStep = {
    id: string;
    title: string;
    /** `null` when nothing ARP reads can show the step done. */
    done: boolean | null;
    /** Shell commands, run in order. */
    commands?: readonly string[];
    /** Words to say to Claude, not a shell command. */
    prompt?: string;
    link?: {to: string; label: string};
    hint?: string;
};

export type StartSignals = {
    feed: FeedStatus;
    events: readonly ActivityEvent[];
};

/**
 * An everyday need the catalogue covers, from the demo plan (`docs/26` §3), with ARP named: the
 * agent reaches for ARP when it is named, and asked only for the task it may do the task alone
 * (the user's decision, 2026-11-09, task 74).
 */
export const EXAMPLE_PROMPT = "Find me a skill for a YouTube thumbnail with ARP.";

/** The published CLI (task 74). Nothing on this page needs ARP's sponsor, which is not hosted. */
const CLI = "npx -y @arp-protocol/cli";

// No "Free for now" step: it read as a selling point the user does not want to push yet
// (2026-11-03, task 62). The Claude path still carries no chain word (task 45).

export function stepsFor(profile: StartProfile, signals: StartSignals): StartStep[] {
    // With no local feed configured nothing can see a step done, so none shows "to do" forever:
    // the hosted site has no feed (task 74).
    const observed = (done: boolean) => (signals.feed === "off" ? null : done);
    const live = signals.feed === "live";
    const has = (source: ActivityEvent["source"]) =>
        signals.events.some((event) => event.source === source);

    switch (profile) {
        case "claude":
            return [
                {
                    id: "connect",
                    title: "Add ARP to Claude Code",
                    done: observed(live),
                    commands: [
                        "claude plugin marketplace add intuition-box/ARP",
                        "claude plugin install arp@arp",
                    ],
                    hint: "Needs Node 22. No Claude Desktop extension is published yet.",
                },
                {
                    id: "ask",
                    title: "Name ARP when you ask",
                    done: observed(has("receipt")),
                    prompt: EXAMPLE_PROMPT,
                    hint: "Claude reaches for ARP when you name it. Asked only for the task, it may do the task without ARP.",
                },
            ];
        case "agent":
            return [
                {
                    id: "init",
                    title: "Add ARP to your runtime",
                    done: observed(live),
                    commands: [`${CLI} init`],
                    hint: "Needs Node 22. Finds Claude Code, Cursor, Gemini, Codex, Copilot and Grok, and wires each one it finds.",
                },
                {
                    id: "run",
                    title: "Run your agent. The hook records each skill and MCP call on your machine.",
                    done: observed(has("session")),
                },
                {
                    id: "doctor",
                    title: "Check what is installed, and that the server answers",
                    done: null,
                    commands: [`${CLI} doctor`],
                },
            ];
        case "tool":
            return [
                {
                    id: "find",
                    title: "Find your tool by its URL",
                    // Submitting leaves this page for `/search`, so nothing here can see it done.
                    done: null,
                },
                {
                    id: "add",
                    title: "Not listed yet? Add it",
                    // The form answers in place (task 53c); the step itself observes nothing.
                    done: null,
                },
            ];
    }
}
