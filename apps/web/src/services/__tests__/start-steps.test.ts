import type {ActivityEvent} from "@arp-protocol/core";
import {describe, expect, it} from "vitest";

import {stepsFor} from "../start-steps";

const SKILL = `0x${"c".repeat(64)}` as const;

const receipt: ActivityEvent = {
    source: "receipt",
    at: "2026-11-02T22:36:00Z",
    name: "youtube-thumbnail-design",
    url: null,
    atom: SKILL,
    signer: null,
    to: null,
};
const invoked: ActivityEvent = {
    source: "session",
    at: "2026-11-02T22:37:00Z",
    session: "s",
    call: "c",
    kind: "skill",
    name: "youtube-thumbnail-design",
    ref: SKILL,
    outcome: "ok",
    ms: 4,
};
const declaration = (status: "dry" | "success" | "reverted"): ActivityEvent => ({
    source: "sent",
    at: "2026-11-02T22:38:00Z",
    chainId: 13579,
    status,
    hash: null,
    signer: null,
    to: null,
    value: "0",
    gasUsed: null,
    kind: "create-triple",
    why: "declare",
    decoded: {fn: "createTriples", subjects: [SKILL], predicates: [SKILL], objects: [SKILL]},
});

const done = (steps: ReturnType<typeof stepsFor>) =>
    Object.fromEntries(steps.map((step) => [step.id, step.done]));

describe("start steps", () => {
    it("shows no tick at all when no local feed is configured, as on the hosted site", () => {
        expect(done(stepsFor("claude", {feed: "off", events: []}))).toEqual({
            connect: null,
            ask: null,
        });
    });

    it("ticks nothing before the agent is connected", () => {
        expect(done(stepsFor("claude", {feed: "offline", events: []}))).toEqual({
            connect: false,
            ask: false,
        });
    });

    it("ticks each Claude step from what the feed recorded", () => {
        const steps = stepsFor("claude", {feed: "live", events: [receipt, declaration("success")]});
        expect(done(steps)).toEqual({connect: true, ask: true});
    });

    it("gives a stranger commands that exist, none needing ARP's sponsor (task 74)", () => {
        const commands = [...stepsFor("claude", {feed: "off", events: []}), ...stepsFor("agent", {feed: "off", events: []})].flatMap(
            (step) => step.commands ?? [],
        );
        expect(commands).toEqual([
            "claude plugin marketplace add intuition-box/ARP",
            "claude plugin install arp@arp",
            "npx -y @arp-protocol/cli init",
            "npx -y @arp-protocol/cli doctor",
        ]);
        expect(commands.join(" ")).not.toMatch(/--sponsored|arp status/);
    });

    it("names ARP in the example prompt, because the agent reaches for it when named", () => {
        const ask = stepsFor("claude", {feed: "off", events: []}).find((step) => step.id === "ask");
        expect(ask?.prompt).toMatch(/with ARP/);
    });

    it("ticks the builder's run from the hook, and never claims the check was run", () => {
        const steps = stepsFor("agent", {feed: "live", events: [invoked]});
        expect(done(steps)).toEqual({init: true, run: true, doctor: null});
    });

    it("shows the tool path's steps without a tick it cannot observe", () => {
        expect(done(stepsFor("tool", {feed: "off", events: []}))).toEqual({
            find: null,
            add: null,
        });
    });
});
