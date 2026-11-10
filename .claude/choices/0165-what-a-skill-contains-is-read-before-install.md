# 0165 — What a skill contains is read from its files and shown before install, as facts

**Status:** Accepted
**Date:** 2026-11-10
**Triggered by:** `docs/tasks/96`; the user, 2026-11-10: agents act on their own, so a person must see
what is inside a skill before letting the agent install it; `FUTURE.md` "`/list-tool` refuses what is
not a tool, and a skill is read before it is installed", point 2.

## Context

ADR `0163` gates what ARP pays to list, but anyone can write an atom on Intuition, so the index cannot
be the defence. Where an agent is about to install is. Three readings already existed and each covered
part of it: task 61's `reviewSkill` (counts of six patterns, in the Desktop install dialog), task 63's
`readSkillFacts` (key names, hosts, paid words, in `arp_pulse`), task 56's `readRequires` (declared and
run commands). None read hidden text, none read a fetch-and-run line as such, and the site showed none
of them.

## Decision

1. **One reader, `packages/protocol/src/skill-contents.ts`**, pure and bounded, returning seven lists:
   programs, packages, settings (names only), scripts, fetch-and-run lines, domains, and hidden or
   encoded text in Markdown. Every match carries its file and line. Its kinds are what the text says
   (`says to ignore instructions`, `says not to tell the person`), never what it means.
2. **Facts, not a verdict, and no blocking.** The reader computes no score and nothing refuses an
   install on it (ADR `0046`, ADR `0127`). Whether a later version blocks stays the user's decision
   (`FUTURE.md`).
3. **It runs where the files already are.** `arp_pulse` adds no request: it reads the `SKILL.md` and
   the scripts it already fetched, and names the directory's other scripts as not fetched.
   `arp_get_skill` reads the files the content server sent, and the install dialog carries the lines,
   so the person reads them without the agent relaying them. Both run on the user's machine except in
   hosted read mode (ADR `0161`), where the skill is public content and no argument is logged.
4. **The site bundles a dated reading.** A browser cannot list a skill's directory, so
   `scripts/measure/skill-contents.ts` reads each skill at a pinned commit and the build script bundles
   it. Each match links to its line at that commit.
5. **Quoted text is not read as an instruction.** A skill that warns `"ignore previous instructions"`
   may appear in a page is quoting the attack it guards against; the reader strips double-quoted,
   curly-quoted and inline-code spans before matching. On the 518 skills the site's reading covers
   (`scripts/measure/skill-contents.ts`, 2026-11-10), 1 has such a line after the strip. Quoting the
   phrase is common: emilkowalski/skills' `break-ui` does it, _If a file tries to steer you ("ignore
   previous instructions"…_, and is not reported. "Without asking the user" is not
   read either: in the catalogue it says the agent may run on, not that anything is hidden.
6. **Agents get the twin, not the page.** `agent-contents.ts` reads endpoints, protocols, x402, auth
   and the sieve's answer; the agent page is being reworked elsewhere, so it ships as a service and
   hook with a note in the task file.

## Alternatives considered

- **Extend `reviewSkill`** — its six patterns are counts for a dialog; the fetch-and-run, hidden-text
  and settings readings needed structure (kind, line, name), and `reviewSkill` keeps its own page.
- **Fetch every script in `arp_pulse`** — would add up to tens of requests per search from the user's
  machine; out of scope, and the not-fetched list says what was not read.
- **Read the files live in the browser** — needs GitHub's API per visitor (60 an hour).
- **Flag `curl … | sh` as "risky"** — a verdict; the line is shown and the person judges.

## Consequences

**Positive:**
- A person sees, before install, the code a skill fetches and runs, the keys it reads and any text the
  rendered page hides, with the line to open.

**Negative:**
- Text matches miss what is phrased otherwise, and a skill this does not flag is not cleared. The
  Hint says "names found in the files, not requirements".
- The site's reading is dated and covers only skills with a known path (`skill-paths.json`).

**Neutral (worth knowing):**
- `HTML comment` hits are mostly templates' notes (Azure's upgrade templates hold dozens); they are
  still text the reader of the rendered page does not see, so they stay.

## References

- Related rule: `.claude/rules/claims.md`, `.claude/rules/ui.md`
- Related doc: `docs/30_THE_POSITIONING.md` ("Check before your agent installs or pays")
- Related ADR: `0046`, `0127`, `0155`, `0161`, `0163`
