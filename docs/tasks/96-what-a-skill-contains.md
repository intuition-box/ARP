# Task 96 — show what a skill contains, before install and on the site

**Status:** verified 2026-11-10, post-mortem `.claude/learning/85-what-a-skill-contains.md`, ADR `0165`.
**ADR:** `0165`.
**Rules:** `code.md`, `ui.md`, `security.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`. No atom or triple, so no `intuition-integrator`.

## Why

The user, 2026-11-10: agents act on their own, so a person must see what is inside a skill before
letting the agent install it. `FUTURE.md` "`/list-tool` refuses what is not a tool, and a skill is read
before it is installed", point 2, is this task. Anyone can write to the graph, so the defence is where
an agent is about to install. **Facts, never a verdict; nothing blocks an install.**

## Deliverables

1. **A pure reader**, `packages/protocol/src/skill-contents.ts` (`readSkillContents`, `contentsLines`):
   given a skill's files, the programs it declares, runs, interprets its scripts with or probes for; the
   packages it installs; the environment variables it reads or tells you to set (names only); its
   scripts and whether `SKILL.md` names each; lines that fetch code and run it (`curl … | sh`,
   `bash <(curl …)`, `iex (irm …)`, `pip install` of a URL, `npx -y`, `pnpm dlx`, `uvx`, `pipx run`,
   `deno run https://…`); the domains named in URLs; and in Markdown, invisible or direction-changing
   characters (Unicode tags spelled out), long base64 blocks and data URIs, HTML comments of four words
   or more, and sentences saying to ignore instructions or not to tell the person. No network, no
   clock; every list bounded (200 files, 512 KB a file, 40 items, 160 characters a line) and sorted.
   Tested in `packages/protocol/test/skill-contents.test.ts`, false positives included.
2. **Before install, in the agent's conversation.** `arp_pulse` gives every read result a `contains`
   block, from the `SKILL.md` and the scripts it already fetched (no request added; other scripts in
   the directory are named as not fetched). `arp_get_skill` (Claude Desktop extension) returns
   `contains` before `skill_md`, and the install dialog the person answers carries the same lines.
   Both tool descriptions tell the agent to show the lines to the person as they are. All of it runs
   where the MCP server runs, on the skill's public files; in hosted read mode (ADR `0161`) that is
   ARP's server, which logs no argument.
3. **On the site**, a `Contains` panel in the skill page's facts column
   (`apps/web/src/components/atom/SkillContains.tsx`): Programs, Keys, Scripts, Fetch and run,
   Domains, Hidden text, each "none found" when the files named nothing, "not read" for a skill the
   reading did not cover; every match links to its line at the commit read; the date beside the label
   and the caveat in a `Hint`. A browser cannot list a skill's directory (GitHub's API, 60 an hour per
   visitor), so `scripts/measure/skill-contents.ts` reads every skill in `skill-paths.json` at a pinned
   commit and `scripts/build/build-skill-contents.ts` bundles it as `apps/web/src/data/skill-contents.json`,
   loaded on demand.
4. **The agent side, ready for the agent page and not on it.** `packages/protocol/src/agent-contents.ts`
   (`readAgentContents`): endpoints declared with their host or why a probe cannot reach them, MCP and
   A2A, x402 declared, auth schemes named, and the sieve's dated answer.
   `apps/web/src/services/agent-contents.ts` (`readAgentContentsOf`) reads the registration document
   the way `agent-endpoints.ts` does (that file now exports `readRegistrationDocument`) and joins the
   agent's row of `data/catalogue/agent-sieve-13579.json`; `apps/web/src/hooks/use-agent-contents.ts`
   (`useAgentContents({registrationFile, chainId, tokenId})`) is the hook.

## For the agent page's owner (branch `feat/95-agent-lines`)

Drop `useAgentContents({registrationFile, chainId, tokenId})` into the agent page and render its
`contents` the way `SkillContains` renders a skill's: one `ClsRow` each for Endpoints (name and host,
or the `notCheckable` code), Protocols, x402 (`declared` / `not declared`), Auth (scheme names, or
"none named": silence is not "open") and Answers (`answered` with `speaks` and the date, `no answer`
with `couldNotSay`, `not read`). `status: "unreadable"` keeps its `href`, as `useAgentEndpoints`'
reader does. Nothing here was added to an agent page.

## Do not do in this task

Blocking an install, scoring, any network fetch from the user's machine beyond what the install path
already does, changing what is listed, editing agent pages, deploying, publishing, pushing, touching
task 97's files (`apps/hook`, `usage-context.ts`, the sponsor's line route, `arp line`).

## Gates

`packages/protocol` test and lint; `apps/mcp` test and lint; `apps/web` `bunx tsc -b`, `bun run lint`,
`bun run test`, `bun run check:tokens`; `apps/cli` test, `packages --check`, `check:node`; root
`bun run check` and `bun run test:scripts`. `ui-reviewer` before `task-verifier`.
