import {describe, expect, it} from "vitest";

import {isSharingOn} from "../src/share-failures.js";
import {choiceForAnswer, shareAnswerIn, sharingChoiceOf, sharingFileText} from "../src/sharing-state.js";

describe("sharingChoiceOf", () => {
    it("is undecided with no file, and off for a broken one", () => {
        expect(sharingChoiceOf(null)).toBeNull();
        expect(sharingChoiceOf("{not json")).toEqual({on: false, at: null, how: null});
        expect(sharingChoiceOf("[]")).toEqual({on: false, at: null, how: null});
    });

    it("reads a file older than task 126 as decided, with no date and no way known", () => {
        expect(sharingChoiceOf('{"failures":true}\n')).toEqual({on: true, at: null, how: null});
    });

    it("keeps the date and how it was chosen, and an unknown way is dropped", () => {
        const text = sharingFileText(true, "asked-always", new Date("2026-11-11T09:00:00.000Z"));
        expect(sharingChoiceOf(text)).toEqual({on: true, at: "2026-11-11T09:00:00.000Z", how: "asked-always"});
        expect(sharingChoiceOf('{"failures":false,"how":"agent"}')?.how).toBeNull();
    });

    it("reads the same as before for a reader older than task 126", () => {
        const at = new Date("2026-11-11T09:00:00.000Z");
        expect(isSharingOn(sharingFileText(true, "asked-always", at))).toBe(true);
        expect(isSharingOn(sharingFileText(false, "asked-once", at))).toBe(false);
    });
});

describe("choiceForAnswer", () => {
    it("turns sharing on only for always", () => {
        expect(choiceForAnswer("always")).toEqual({on: true, how: "asked-always"});
        expect(choiceForAnswer("once")).toEqual({on: false, how: "asked-once"});
        expect(choiceForAnswer("no")).toEqual({on: false, how: "asked-no"});
    });
});

describe("shareAnswerIn", () => {
    it("reads the closed line on its own line, in any case, with markdown around it", () => {
        expect(shareAnswerIn("Done.\n\narp-share: always")).toBe("always");
        expect(shareAnswerIn("- `arp-share: once`.")).toBe("once");
        expect(shareAnswerIn("ARP-SHARE: No")).toBe("no");
    });

    it("is no answer inside a sentence, with another word, or when two answers disagree", () => {
        expect(shareAnswerIn("I would write arp-share: always if you said so")).toBeNull();
        expect(shareAnswerIn("arp-share: sometimes")).toBeNull();
        expect(shareAnswerIn("arp-share: once\narp-share: always")).toBeNull();
        expect(shareAnswerIn("arp-share: no\narp-share: no")).toBe("no");
        expect(shareAnswerIn("arp: gadget worked")).toBeNull();
    });
});
