import {describe, expect, it} from "vitest";

import {answersIn, parseLocalOutcomes, type LocalOutcome} from "../src/local-outcomes.js";
import {decideShare, sharedLineKey} from "../src/share-failures.js";

describe("answersIn", () => {
    it("reads one closed answer per asked skill, and nothing else", () => {
        const text = [
            "Done. The deck is in slides/.",
            "arp: gadget worked",
            "- arp: vendor:cut failed",
            "`arp: other unsure`",
            "arp: stranger worked",
            "arp: gadget failed",
            "arp: gadget did fine",
            "I think arp: gadget worked was right",
        ].join("\n");
        expect(Object.fromEntries(answersIn(text, ["gadget", "vendor:cut", "other"]))).toEqual({
            gadget: "worked",
            "vendor:cut": "failed",
            other: "unsure",
        });
    });

    it("is empty when the model said nothing in the closed form", () => {
        expect(answersIn("It went well.", ["gadget"]).size).toBe(0);
        expect(answersIn("arp: gadget great", ["gadget"]).size).toBe(0);
    });
});

const row = (over: Record<string, unknown> = {}) =>
    JSON.stringify({at: "2026-11-10T10:00:00Z", session: "s", skill: "clip", source: "a/b", outcome: "worked", ...over});

describe("parseLocalOutcomes", () => {
    it("keeps a well-formed answer and skips what it cannot read", () => {
        const rows = parseLocalOutcomes([row(), "{half", row({outcome: "great"}), row({skill: 3}), row({session: null}), ""].join("\n"));
        expect(rows).toEqual([{at: "2026-11-10T10:00:00Z", session: "s", skill: "clip", source: "a/b", outcome: "worked"}]);
    });

    it("keeps `with` only on a worked answer and only in a name's shape", () => {
        expect(parseLocalOutcomes(row({with: "ffmpeg"}))[0]?.with).toBe("ffmpeg");
        expect(parseLocalOutcomes(row({with: "/home/me/bin/ffmpeg"}))[0]?.with).toBeUndefined();
        expect(parseLocalOutcomes(row({outcome: "failed", with: "ffmpeg"}))[0]?.with).toBeUndefined();
    });
});

const answer = (over: Partial<LocalOutcome> = {}): LocalOutcome => ({
    at: "2026-11-10T10:00:00Z",
    session: "s",
    skill: "clip",
    source: "a/b",
    outcome: "worked",
    ...over,
});

describe("decideShare with the model's answers", () => {
    it("offers a worked answer as a worked line, with what it worked with", () => {
        const decision = decideShare({
            on: true,
            failures: [],
            outcomes: [answer({domain: "video", with: "ffmpeg"})],
            installed: [],
            alreadyShared: new Set(),
        });
        expect(decision.lines).toEqual([
            {toolUrl: "https://github.com/a/b?skill=clip", outcome: "worked", domain: "video", need: "ffmpeg"},
        ]);
    });

    it("never offers a failed or unsure answer, and nothing at all with sharing off", () => {
        const outcomes = [answer({outcome: "failed"}), answer({outcome: "unsure"})];
        expect(decideShare({on: true, failures: [], outcomes, installed: [], alreadyShared: new Set()}).lines).toEqual([]);
        const off = decideShare({on: false, failures: [], outcomes: [answer()], installed: [], alreadyShared: new Set()});
        expect(off.lines).toEqual([]);
        expect(off.keptLocal).toEqual([{skill: "clip", why: "sharing_off"}]);
    });

    it("keeps a worked answer with no public source on this machine", () => {
        const decision = decideShare({on: true, failures: [], outcomes: [answer({source: null})], installed: [], alreadyShared: new Set()});
        expect(decision.lines).toEqual([]);
        expect(decision.keptLocal).toEqual([{skill: "clip", why: "no_public_source"}]);
    });

    it("does not offer a worked line twice, and its key never meets a failure's", () => {
        const worked = {toolUrl: "https://github.com/a/b?skill=clip", outcome: "worked" as const};
        const failed = {toolUrl: worked.toolUrl, outcome: "failed" as const, reason: "missing-key" as const};
        expect(sharedLineKey(worked)).not.toBe(sharedLineKey(failed));
        // A failure's key is the one it had before worked lines existed.
        expect(sharedLineKey(failed)).toBe(`${worked.toolUrl}\u0000\u0000missing-key`);
        const decision = decideShare({
            on: true,
            failures: [],
            outcomes: [answer(), answer({session: "t"})],
            installed: [],
            alreadyShared: new Set([sharedLineKey(worked)]),
        });
        expect(decision.lines).toEqual([]);
    });
});
