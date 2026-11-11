import {fireEvent, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {renderWithProviders} from "../../../test/render";
import {HEAD_REF, type SkillContentsEntry} from "../../../services/skill-contents";
import {BeforeInstall} from "../BeforeInstall";
import {BeforeSection} from "../BeforeParts";

const AT = "2026-11-10T09:00:00.000Z";

/** A skill with nothing in it, so each test adds only the shape it is about. */
const bare = (over: Partial<SkillContentsEntry> = {}): SkillContentsEntry => ({
    commit: "b4c7f9cf7c601b440fcc94a7a9c44658cb6b7cd6",
    directory: "",
    programs: [],
    packages: [],
    settings: [],
    keys: [],
    scripts: [],
    fetchAndRun: [],
    domains: [],
    hidden: [],
    skipped: [],
    cut: [],
    ...over,
});

const show = (entry: SkillContentsEntry, repo: string | null = "a/b") =>
    renderWithProviders(
        <BeforeInstall read={{status: "read", measuredAt: AT, entry}} repo={repo} />,
    );

function row(term: string): HTMLElement {
    const dt = screen.getByText(term, {selector: "dt"});
    if (dt.parentElement === null) throw new Error(`no row for ${term}`);
    return dt.parentElement;
}

describe("BeforeInstall, the other shapes a skill comes in", () => {
    it("answers every question with its empty word when the skill names nothing", () => {
        show(bare());
        expect(row("Asks for")).toHaveTextContent("no keys");
        expect(row("Paid services")).toHaveTextContent("none named");
        expect(row("Needs installed")).toHaveTextContent("none named");
        expect(row("Runs on your machine")).toHaveTextContent("no scripts");
        expect(row("Sends data to")).toHaveTextContent("no API host named");
    });

    it("says a key is one to set when SKILL.md says so, and counts one other setting", () => {
        show(
            bare({
                settings: ["MODE", "OUT_DIR"],
                keys: [{name: "MODE", why: "set in SKILL.md", file: "SKILL.md", line: 4}],
            }),
        );
        expect(row("Asks for")).toHaveTextContent("MODE to set, SKILL.md:4");
        expect(row("Asks for")).toHaveTextContent("1 other setting");
    });

    it("prints the line without a link when the repository is unknown", () => {
        show(bare({keys: [{name: "API_TOKEN", why: "secret", file: "SKILL.md", line: 9}]}), null);
        expect(row("Asks for")).toHaveTextContent("SKILL.md:9");
        expect(screen.queryByRole("link", {name: "SKILL.md:9"})).toBeNull();
    });

    it("says how a program was found when it has a line but neither a spawn nor a named package", () => {
        show(
            bare({
                programs: [
                    {name: "git", from: "named as needed", file: "SKILL.md", line: 2},
                    {name: "Chrome", from: "package", file: "run.mjs", line: 1},
                ],
            }),
        );
        expect(row("Needs installed")).toHaveTextContent("git said to be needed, SKILL.md:2");
        expect(row("Needs installed")).toHaveTextContent("Chrome via a package, run.mjs:1");
    });

    it("counts one script, and says when SKILL.md names it", () => {
        show(bare({scripts: [{path: "scripts/go.sh", namedInSkillMd: true}]}));
        fireEvent.click(screen.getByText("1 script"));
        expect(screen.getByText("scripts/go.sh · named in SKILL.md")).toBeInTheDocument();
    });

    it("lists hidden text, six at a time and the rest counted", () => {
        show(
            bare({
                hidden: Array.from({length: 7}, (_, i) => ({
                    kind: "HTML comment" as const,
                    file: "SKILL.md",
                    line: i + 1,
                    text: "<!-- -->",
                })),
            }),
        );
        expect(row("Hidden text")).toHaveTextContent("SKILL.md:6");
        expect(row("Hidden text")).not.toHaveTextContent("SKILL.md:7");
        expect(row("Hidden text")).toHaveTextContent("+1");
    });

    it("counts several unread files, and leaves a binary out", () => {
        show(
            bare({
                skipped: [
                    {path: "notes.md", why: "too large"},
                    {path: "more.md", why: "not fetched"},
                    {path: "logo.bin", why: "binary"},
                ],
            }),
        );
        expect(row("Not read")).toHaveTextContent("2 files");
        expect(screen.queryByText(/logo\.bin/)).toBeNull();
    });

    it("says it read the repository's head when the reading has no commit", async () => {
        show(bare({commit: HEAD_REF}));
        fireEvent.focus(screen.getByRole("button", {name: "What Before you install is read from"}));
        expect(await screen.findByRole("tooltip")).toHaveTextContent(
            "read at the repository's head",
        );
    });
});

describe("BeforeSection", () => {
    it("draws no list when it is given no rows", () => {
        const {container} = renderWithProviders(
            <BeforeSection id="s" label="Before you call" summary="nothing" />,
        );
        expect(screen.getByRole("heading", {name: "Before you call"})).toBeInTheDocument();
        expect(container.querySelector("dl")).toBeNull();
    });
});
