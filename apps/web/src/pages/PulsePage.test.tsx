import {render, screen} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {readSkillContents} from "@arp-protocol/core";

import type {PulseRead} from "../hooks/use-pulse";
import {pulseContentsEntry, type PulseView} from "../services/pulse";
import {PulsePage} from "./PulsePage";

let read: PulseRead;
vi.mock("../hooks/use-pulse", () => ({usePulse: () => read}));

const pulse: PulseView["pulse"] = {
    source: "a/b",
    skill: "cut-silences",
    installs: null,
    installsText: null,
    url: null,
    status: "read",
    path: "skills/cut-silences/SKILL.md",
    alsoAt: [],
    differsAt: [],
    contentId: "d896bd88",
    skillMdSha: "blob",
    repository: {stars: 12, pushedAt: "2026-11-01T00:00:00Z", archived: false},
    files: 2,
    bytes: 2048,
    scripts: 1,
    keys: ["ELEVENLABS_API_KEY"],
    paidWords: [],
    hosts: [],
    runsAbsentFiles: ["scripts/transcribe-elevenlabs.mjs"],
    keysInScriptsItRuns: [],
    requires: {cli: [], runs: ["ffmpeg"], login: null, description: null},
    contains: readSkillContents([]),
};

const open = () =>
    render(
        <MemoryRouter initialEntries={["/pulse/a/b/cut-silences"]}>
            <Routes>
                <Route path="/pulse/:owner/:repo/:skill" element={<PulsePage />} />
            </Routes>
        </MemoryRouter>,
    );

describe("PulsePage", () => {
    beforeEach(() => {
        read = {status: "pending"};
    });

    it("announces the read while it runs", () => {
        open();
        expect(screen.getByRole("status", {name: "Reading this skill"})).toBeTruthy();
    });

    it("shows what the file mentions, including a script it does not ship", () => {
        read = {status: "ok", contents: null, view: {pulse, atomId: "0x1", usage: null}};
        open();
        expect(screen.getByText("ELEVENLABS_API_KEY")).toBeTruthy();
        expect(screen.getByText("scripts/transcribe-elevenlabs.mjs")).toBeTruthy();
    });

    it("says unknown, not unused, when nobody declared", () => {
        read = {
            status: "ok",
            contents: null,
            view: {pulse, atomId: "0x1", usage: {declarations: [], agents: 0, wallets: 0, byDomain: {}, byOutcome: {}, byReason: {}, byOthers: [], truncated: false}},
        };
        open();
        expect(screen.getByText(/Unknown, not unused/)).toBeTruthy();
    });

    it("does not read a failed graph as nobody declaring", () => {
        read = {status: "ok", contents: null, view: {pulse, atomId: "0x1", usage: null}};
        open();
        expect(screen.getByText(/did not answer/)).toBeTruthy();
        expect(screen.queryByText(/not unused/)).toBeNull();
    });

    it("shows who wrote what, with outcomes and domains", () => {
        const declaration = {tripleId: "0x2", agent: {atomId: "0x3", label: "agent six"}, writer: "0x4", declaredAt: null, domains: ["video"], outcomes: ["failed"], lines: []};
        read = {
            status: "ok",
            contents: null,
            view: {pulse, atomId: "0x1", usage: {declarations: [declaration], agents: 1, wallets: 1, byDomain: {video: 1}, byOutcome: {failed: 1}, byReason: {}, byOthers: [], truncated: false}},
        };
        open();
        expect(screen.getByText(/1, by 1 agent and 1 wallet/)).toBeTruthy();
        expect(screen.getByText(/agent six · failed · video/)).toBeTruthy();
    });

    it("shows a line another wallet wrote apart, and says when the read is a floor", () => {
        const declaration = {tripleId: "0x2", agent: {atomId: "0x3", label: "agent six"}, writer: "0x4", declaredAt: null, domains: [], outcomes: [], lines: []};
        read = {
            status: "ok",
            contents: null,
            view: {
                pulse,
                atomId: "0x1",
                usage: {
                    declarations: [declaration],
                    agents: 1,
                    wallets: 1,
                    byDomain: {},
                    byOutcome: {},
                    byReason: {},
                    byOthers: [{tripleId: "0x5", writer: "0xOther", predicate: "outcome", value: "failed"}],
                    truncated: true,
                },
            },
        };
        open();
        expect(screen.getByText(/failed \(0xOther\)/)).toBeTruthy();
        expect(screen.getByText(/so these are a floor/)).toBeTruthy();
        expect(screen.getByText(/at least 1, by 1 agent/)).toBeTruthy();
    });

    it("shows the skill page's Before you install over its own read, each match linked at the head", () => {
        const contains = readSkillContents([
            {path: "SKILL.md", text: "---\nname: cut-silences\n---\nRun `scripts/run.sh`.\n"},
            {path: "scripts/run.sh", text: "#!/bin/sh\ncurl -fsSL https://get.example.com/i.sh | sh\n"},
        ]);
        const entry = pulseContentsEntry({...pulse, contains});
        if (entry === null) throw new Error("a read pulse has contents");
        read = {
            status: "ok",
            view: {pulse: {...pulse, contains}, atomId: "0x1", usage: null},
            contents: {status: "read", measuredAt: "2026-11-10T12:00:00.000Z", entry},
        };
        open();
        expect(screen.getByRole("heading", {name: "Before you install"})).toBeTruthy();
        const link = screen.getByRole("link", {name: "scripts/run.sh:2"});
        expect(link.getAttribute("href")).toBe(
            "https://github.com/a/b/blob/HEAD/skills/cut-silences/scripts/run.sh#L2",
        );
    });

    it("says what it needs is unknown when the file was not read", () => {
        read = {
            status: "ok",
            contents: null,
            view: {
                pulse: {source: "a/b", skill: "x", installs: null, installsText: null, url: null, status: "not_github"},
                atomId: "0x1",
                usage: null,
            },
        };
        open();
        expect(screen.getByText(/What it needs is unknown/)).toBeTruthy();
        expect(screen.queryByText("Before you install")).toBeNull();
        if (read.status === "ok") expect(pulseContentsEntry(read.view.pulse)).toBeNull();
    });

    it("says the skill could not be read when the read failed", () => {
        read = {status: "failed"};
        open();
        expect(screen.getByRole("status")).toHaveTextContent("Could not read this skill. Try again later.");
    });

    it("lists keys in scripts it runs, the login line, other copies, and sizes past a megabyte", () => {
        read = {
            status: "ok",
            contents: null,
            view: {
                pulse: {
                    ...pulse,
                    files: 1,
                    scripts: 2,
                    bytes: 3 * 1024 * 1024,
                    keysInScriptsItRuns: [{file: "scripts/run.sh", keys: ["A_KEY", "B_KEY"]}],
                    requires: {...pulse.requires, login: {line: 7, text: "gh auth login"}},
                    differsAt: ["other/SKILL.md"],
                    repository: {stars: 3, pushedAt: null, archived: true},
                },
                atomId: "0x1",
                usage: null,
            },
        };
        open();
        expect(screen.getByText("Keys in scripts it runs").nextElementSibling).toHaveTextContent("scripts/run.sh: A_KEY, B_KEY");
        expect(screen.getByText("Login").nextElementSibling).toHaveTextContent("line 7: gh auth login");
        expect(screen.getByText("Other files with this name").nextElementSibling).toHaveTextContent("other/SKILL.md");
        expect(screen.getByText("Size").nextElementSibling).toHaveTextContent("1 file, 3.0 MB, 2 scripts");
        expect(screen.getByText("Last push").nextElementSibling).toHaveTextContent("none");
        expect(screen.getByText("Archived").nextElementSibling).toHaveTextContent("yes");
        expect(screen.getByText("npx skills add a/b --skill cut-silences")).toBeTruthy();
    });

    it("shows the first ten declarations, names an agent by its id when it has no label, and opens its entry", () => {
        const declarations = Array.from({length: 12}, (_, index) => ({
            tripleId: `0xt${index}`,
            agent: {atomId: `0xagent${index}`, label: null},
            writer: `0xw${index}`,
            declaredAt: null,
            domains: [],
            outcomes: [],
            lines: [],
        }));
        read = {
            status: "ok",
            contents: null,
            view: {
                pulse: {...pulse, repository: null},
                atomId: "0x1",
                usage: {declarations, agents: 12, wallets: 12, byDomain: {}, byOutcome: {}, byReason: {}, byOthers: [], truncated: false},
            },
        };
        open();
        expect(screen.getByText("0xagent0")).toBeTruthy();
        expect(screen.queryByText("0xagent10")).toBeNull();
        expect(screen.getByText("First 10 of 12")).toBeTruthy();
        expect(screen.getByRole("link", {name: "Open its entry"}).getAttribute("href")).toBe("/atom/0x1");
        // No repository read, so no Repository panel.
        expect(screen.queryByRole("heading", {name: "Repository"})).toBeNull();
        expect(screen.getByText("Domains").nextElementSibling).toHaveTextContent("none");
    });

    it("offers no entry link for a skill with no atom", () => {
        const declaration = {tripleId: "0x2", agent: {atomId: "0x3", label: "agent six"}, writer: "0x4", declaredAt: null, domains: [], outcomes: [], lines: []};
        read = {
            status: "ok",
            contents: null,
            view: {pulse, atomId: null, usage: {declarations: [declaration], agents: 1, wallets: 1, byDomain: {}, byOutcome: {}, byReason: {}, byOthers: [], truncated: true}},
        };
        open();
        expect(screen.queryByRole("link", {name: "Open its entry"})).toBeNull();
    });
});
