import {describe, expect, it} from "vitest";

import {readRequires} from "../src/skill-requires.js";

const doc = (front: string[], body: string[]): string =>
    ["---", ...front, "---", ...body].join("\n");

describe("readRequires, the frontmatter", () => {
    it("reads nothing from a file with no frontmatter, or one never closed", () => {
        expect(readRequires("# Title\nplain text")).toEqual({
            cli: [],
            runs: [],
            login: null,
            description: null,
        });
        expect(readRequires("---\nbins: [lark]\nno closing line").cli).toEqual([]);
    });

    it("reads bins written inline, quoted, and skips an empty entry", () => {
        expect(readRequires(doc(['bins: ["lark-slides", \'web2md\', ""]'], [])).cli).toEqual([
            "lark-slides",
            "web2md",
        ]);
    });

    it("reads bins written as a list, stopping at the first line that is not an item", () => {
        const markdown = doc(
            ["metadata:", "  requires:", "    bins:", "      - lark", '      - "belt"', "name: x"],
            [],
        );
        expect(readRequires(markdown).cli).toEqual(["lark", "belt"]);
    });

    it("reads a bins key with nothing under it as none", () => {
        expect(readRequires(doc(["bins:"], [])).cli).toEqual([]);
    });

    it("reads Bash tools from allowed-tools and ignores other tools", () => {
        expect(
            readRequires(doc(["allowed-tools: Read, Bash(belt *), Bash( gh:*), Bash"], [])).cli,
        ).toEqual(["belt", "gh"]);
    });

    it("reads a one-name requires line, and merges the three sources without repeats", () => {
        expect(
            readRequires(doc(["requires: 'clueso-mcp'", "bins: [clueso-mcp, other]"], [])).cli,
        ).toEqual(["clueso-mcp", "other"]);
    });

    it("reads a description inline, quoted, as a folded block, and an empty one as none", () => {
        expect(readRequires(doc(['description: "Makes slides: fast"'], [])).description).toBe(
            "Makes slides: fast",
        );
        expect(
            readRequires(
                doc(["description: >-", "  Makes slides", "  from a brief", "name: x"], []),
            ).description,
        ).toBe("Makes slides from a brief");
        expect(readRequires(doc(["description: |", "name: x"], [])).description).toBeNull();
        expect(readRequires(doc(["description: ''"], [])).description).toBeNull();
        expect(readRequires(doc(["name: x"], [])).description).toBeNull();
    });
});

describe("readRequires, what the body runs", () => {
    it("reads the commands of a shell fence, leaving common ones and declared ones out", () => {
        const markdown = doc(
            ["bins: [lark]"],
            [
                "```bash",
                '$ web2md https://example.com | grep -E "lorem|ipsum"',
                "lark slides create",
                "FOO=1 sudo render-cli --out x && cat out",
                "# a comment; runs nothing",
                "",
                "```",
            ],
        );
        expect(readRequires(markdown).runs).toEqual(["web2md", "render-cli"]);
    });

    it("ignores a fence that is not shell, and a fence left open", () => {
        expect(
            readRequires(doc([], ["```python", "pyrun x", "```", "```sh", "never-closed"])).runs,
        ).toEqual([]);
        expect(readRequires(doc([], ["~~~", "plain-tool x", "~~~"])).runs).toEqual([]);
    });

    it("does not count a heredoc's body, a quoted string left open, or a continued line", () => {
        const markdown = doc(
            [],
            [
                "```sh",
                "cat <<'EOF' > file",
                "inside-heredoc arg",
                "EOF",
                'echo "an open string',
                "still-quoted text",
                'closed"',
                "tool-a --flag \\",
                "  continued-arg",
                "tool-b x # the new slide's path",
                "after-comment y",
                "```",
            ],
        );
        expect(readRequires(markdown).runs).toEqual(["tool-a", "tool-b", "after-comment"]);
    });

    it("reads past an escaped character, and skips a first word that is not a command", () => {
        const markdown = doc(
            [],
            [
                "```console",
                'echo \\"x\\" \\| tr-not-run',
                "Uppercase-Tool y",
                "./local.sh",
                "probe-me ok",
                "```",
            ],
        );
        expect(readRequires(markdown).runs).toEqual(["probe-me"]);
    });

    it("reads only probes and install lines from inline code", () => {
        const markdown = doc(
            [],
            [
                "Run `command -v web2md` first, then `npm install -g @scope/cli-tool`.",
                "Or `brew install ripgrep`, or `which jq`; `render` is a subcommand.",
                "`pipx install`",
            ],
        );
        expect(readRequires(markdown).runs).toEqual(["web2md", "@scope/cli-tool", "ripgrep", "jq"]);
    });
});

describe("readRequires, a login", () => {
    it("quotes the first body line that mentions a login, with its line number", () => {
        const markdown = doc(
            ["description: no api key here"],
            ["intro", "  Set your API_KEY before use.  ", "log in again"],
        );
        expect(readRequires(markdown).login).toEqual({
            line: 5,
            text: "Set your API_KEY before use.",
        });
    });

    it("cuts a long line at 160 characters, and finds none when nothing mentions one", () => {
        const long = `sign up ${"x".repeat(300)}`;
        expect(readRequires(`${long}`).login?.text.length).toBe(160);
        expect(readRequires(doc([], ["nothing to see"])).login).toBeNull();
    });
});
