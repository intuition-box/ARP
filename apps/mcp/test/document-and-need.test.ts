import {afterEach, describe, expect, it, vi} from "vitest";

import {needOf, needProblemInSkill} from "../src/handlers/declare-need.js";
import {readRegistrationDocument} from "../src/registration-document.js";

/** An agent's registration document as the server reads it, the host a stubbed `fetch`; and a need checked against a skill's file. */
const open = {allowPrivate: true};

describe("an agent's registration document", () => {
    it("reads a data: URI, in base64 or percent-encoded", async () => {
        const json = JSON.stringify({name: "a"});
        expect(await readRegistrationDocument(`data:application/json;base64,${Buffer.from(json).toString("base64")}`)).toEqual({status: "read", document: {name: "a"}});
        expect(await readRegistrationDocument(`data:application/json,${encodeURIComponent(json)}`)).toEqual({status: "read", document: {name: "a"}});
    });

    it("asks the next IPFS gateway when one fails, and says why when none answers", async () => {
        const fetch = vi.fn().mockRejectedValueOnce(new Error("gateway down")).mockResolvedValue(Response.json({name: "b"}));
        expect(await readRegistrationDocument("ipfs://bafy", {fetch, guard: open})).toEqual({status: "read", document: {name: "b"}});
        const none = vi.fn(async () => new Response("no", {status: 504}));
        expect(await readRegistrationDocument("ipfs://bafy", {fetch: none, guard: open})).toEqual({status: "unreadable", reason: "the host answered 504"});
        const thrown = vi.fn(async () => {
            throw "offline";
        });
        expect(await readRegistrationDocument("ipfs://bafy", {fetch: thrown, guard: open})).toMatchObject({status: "unreadable"});
    });

    it("says a redirect with no Location is a broken origin", async () => {
        const fetch = vi.fn(async () => new Response(null, {status: 302}));
        expect(await readRegistrationDocument("https://agent.example/card.json", {fetch, guard: open})).toEqual({
            status: "unreadable",
            reason: "the host answered 302 with no Location header",
        });
    });

    it("refuses a private address through the guard", async () => {
        const fetch = vi.fn();
        const read = await readRegistrationDocument("http://127.0.0.1/card.json", {fetch, guard: {allowPrivate: false, resolveHost: async () => ["127.0.0.1"]}});
        expect(read.status).toBe("refused");
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe("a name checked against the skill's own file", () => {
    const listing = (files: {path: string}[] | "rate_limited" | "unreachable") => async () =>
        files === "rate_limited" || files === "unreachable" ? files : {rootTreeId: "t", files: files.map((file) => ({...file, sha: file.path, size: 1})), trees: new Map(), truncated: false};
    const SKILL = "https://github.com/acme/skills?skill=video";
    afterEach(() => vi.unstubAllEnvs());

    it("needs a skill URL", async () => {
        expect(await needProblemInSkill("https://example.com", "ffmpeg", undefined, {listing: listing([]), file: async () => null})).toContain("must be a skill URL");
    });

    it.each([
        ["rate_limited", "GitHub's hourly limit is reached"],
        ["unreachable", "could not be listed"],
    ] as const)("says GitHub %s is why it was not checked", async (state, message) => {
        expect(await needProblemInSkill(SKILL, "ffmpeg", undefined, {listing: listing(state), file: async () => null})).toContain(message);
    });

    it("needs one SKILL.md, and one it can read", async () => {
        expect(await needProblemInSkill(SKILL, "ffmpeg", undefined, {listing: listing([{path: "other/SKILL.md"}]), file: async () => null})).toContain("has no single SKILL.md");
        expect(await needProblemInSkill(SKILL, "ffmpeg", undefined, {listing: listing([{path: "video/SKILL.md"}]), file: async () => null})).toContain("could not be read");
    });

    it("reads the reason's kind of name", async () => {
        const file = async () => "Set OPENAI_API_KEY first.";
        expect(await needProblemInSkill(SKILL, "OPENAI_API_KEY", "missing-key", {listing: listing([{path: "video/SKILL.md"}]), file})).toBeNull();
    });

    it("refuses a with that is not a string, before anything is read", () => {
        expect(needOf({outcome: "worked", reason: undefined, needs: undefined, with: 3})).toEqual({problem: "with, when given, must be a name"});
    });
});
