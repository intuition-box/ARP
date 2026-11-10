# Task 102 — Be read where agents already are

**Status:** verified 2026-11-10, `task-verifier` PASS, commits `45400db`..HEAD on `feat/102-be-read-where-agents-are` (not pushed), post-mortem `.claude/learning/91-be-read-where-agents-are.md`. Publishing, submitting and deploying are the user's (§2).
**ADR:** `0171`.
**Rules:** `code.md`, `portability.md`, `claims.md`, `workflow.md`; `ui.md` for the two docs pages.
**Required skills:** `arp-contributing`.

## Why

Feature E of the user's list of 2026-11-10. ARP's data is read in ARP's own surfaces. A registry, a
marketplace or the `skills` CLI shows its own listing and reads nothing of ARP's except
`/feeds/x402-outcomes.json`, which holds no record. This task adds the files such a reader would
read, prepares the listings, and writes down how `npx skills` could show ARP's data before install.
It is mostly preparation. **Nothing is deployed, published, submitted or sent**: every step below
that does so is the user's.

## Do not do in this task

- Publish to npm, to the MCP Registry, to any directory; push; open a PR or an issue anywhere; send
  or submit anything. Contacts stay drafts.
- Touch `apps/hook`, `apps/cli/src/install` or `packaging/` (tasks 98 to 101 run in parallel).
- Change `docs/30`.
- Put any text a person typed into a feed.

## Deliverables

### 1. Two feeds (done)

| feed | URL path | schema, doc | built by | size, 2026-11-10 |
| --- | --- | --- | --- | --- |
| skill lines | `/feeds/skill-lines.json` | `arp.skill-lines/1`, `apps/web/public/docs/skill-lines-feed.md` | `scripts/build/build-skill-lines-feed.ts` (reads 13579, no key) | 8,332 bytes: 10 skills, 10 lines, 5 with an outcome, all `arp_test`; 36 skipped (33 edges a payer created, 3 domains outside the tree) |
| agent sieve | `/feeds/agent-sieve.json` | `arp.agent-sieve/1`, `apps/web/public/docs/agent-sieve-feed.md` | `scripts/build/build-agent-sieve-feed.ts` (no network) | 55,070 bytes: 283 agents of the walk of 2026-11-09, counted per chain in `by_chain` (Base 8453: 33 / 121 / 50 / 0 / 40 / 0 from rung 0 to 5) |

Shapers, pure and tested: `packages/protocol/src/skill-lines-feed.ts`, `packages/protocol/src/agent-sieve-feed.ts`,
`packages/protocol/test/skill-lines-feed.test.ts`. `apps/web/nginx.conf`'s `location /feeds/` already
serves any file there with CORS `*`; nothing in it changed. Both pages are in `apps/web/src/docs/manifest.ts`,
so `/llms.txt` lists them. Cross-links: `x402-feed.md`, `the-sieve.md`, `lines.md`, `developers.md`,
`docs/23` §7.1.

Refresh: `bun run scripts/build/build-skill-lines-feed.ts`; for the sieve, rerun the walk and
`build-agent-sieve.ts` first (`/docs/the-sieve`, "Run it again"), then `build-agent-sieve-feed.ts`.

### 2. Listings, prepared

> **Amended 2026-11-10 by task 105** (ADR `0175`): the name is `io.github.Wieedze/arp`, not
> `io.github.intuition-box/arp` below — the user is a member, not an owner, of `intuition-box`. `mcpName` is
> set and `server.json` names 0.0.3. The release steps are in `docs/tasks/105-cli-0.0.3.md`.

Each one: the file, then the user's steps in order. Read 2026-11-10.

**a. The official MCP Registry** — `server.json` at the repository root (schema
`https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`, checked against it:
0 errors). Name `io.github.intuition-box/arp`, the npm package `@arp-protocol/cli` over stdio with
`mcp` as its argument, `ARP_TARGET=testnet` and `ARP_TOOLS=read`, as the plugin runs it.

1. Decide the namespace. `io.github.intuition-box/*` needs an **Owner** of the `intuition-box` GitHub
   org, and the interactive `login github` cannot grant an org namespace today (registry issue #1468):
   use `mcp-publisher login github --token <PAT>` with `read:org`, or GitHub Actions OIDC. Otherwise
   `io.github.<your user>/arp`, and change `name` here and below.
2. Add `"mcpName": "io.github.intuition-box/arp"` to `apps/cli/package.json` (the same string as
   `name`). The registry reads it from npm, from the exact version listed.
3. Publish that version to npm (0.0.2 in `server.json`, the package's version today; npm has 0.0.1).
   If you publish another, set both `version` fields in `server.json` to it.
4. Install the publisher: `brew install mcp-publisher`, or the release archive from
   github.com/modelcontextprotocol/registry/releases (v1.8.8, 2026-11-06).
5. From the repository root: `mcp-publisher validate`, `mcp-publisher login github`, `mcp-publisher publish`.
6. Once the hosted endpoint is deployed (`apps/web/DEPLOY.md`, "The MCP endpoint"), add to
   `server.json`, bump `version`, and publish again:

   ```json
   "remotes": [{"type": "streamable-http", "url": "https://<ARP_PUBLIC_HOST>/mcp"}]
   ```

   A remote-only entry needs no npm package, so steps 2 and 3 can wait if the endpoint comes first.
   The registry does not check who controls the URL; DNS or HTTP login on the site's domain makes the
   name match it (`com.<domain>/arp`), which is optional.

Sources: the registry repo at `d39ac76b47`, `docs/modelcontextprotocol-io/{quickstart,authentication,remote-servers,package-types}.mdx`,
`docs/reference/cli/commands.md`, `internal/validators/registries/npm.go`.

**b. Claude Code** — `.claude-plugin/marketplace.json` exists and lists `packaging/claude/arp`.
`claude plugin validate .` passes on the marketplace and `claude plugin validate --strict packaging/claude/arp`
passes on the plugin (claude 2.1.318, 2026-11-10), with one directory warning: **no icon**.

- ARP's own marketplace is live as soon as the repository is public: `claude plugin marketplace add intuition-box/ARP`, then `claude plugin install arp@arp`. Nothing to submit.
- Anthropic's directory (claude.ai, Cowork, and Claude Code as `arp@synced`): from the developer portal
  at claude.ai/directory/manage, with a paid claude.ai plan. Before the first save there, add a square
  PNG icon, 512 to 2048 px, at `packaging/claude/arp/.claude-plugin/icon.png`: the portal takes the icon
  **only the first time** the plugin is saved. `packaging/` is generated, so the icon goes through
  `apps/cli/scripts/packages.ts` (not done here: tasks 98 to 101 own that area today). Run the
  pre-submission checklist at claude.com/docs/plugins/pre-submission-checklist. The same portal takes
  an MCP server as a **connector**: the hosted endpoint is a candidate once deployed.
- `claude-plugins-official` takes no submissions through the portal (code.claude.com/docs/en/plugins/publish).
  `docs/23` §7.1's form is the earlier route.

**c. Gemini CLI gallery** (`docs/tasks/33`, `38` §D) — no submission: the gallery crawls repositories
with the topic `gemini-cli-extension`, a `gemini-extension.json` at the **root**, and a tagged release
(`docs/23` §7.1, read 2026-10-30). ARP's is in `packaging/gemini/arp/`. Task 38 §D left the choice open:
a separate repository holding `packaging/gemini/arp/` at its root, or a release archive. Then add the
topic and tag a release. Untried: no `gemini` on this machine.

**d. Codex** (`docs/tasks/33` §2) — not built: the plugin and `.agents/plugins/marketplace.json` wait on
33's Codex sub-task. Nothing to prepare here.

**e. Smithery, Glama, mcp.so** — they read the official registry (`docs/23` §7.1). After (a), check each
lists ARP; claim the listing where it offers to.

**f. skills.sh** — not listed: `curl -s 'https://skills.sh/api/search?q=intuition-box'` returns one other
skill of the org, and `skills.sh/intuition-box/arp/arp` answers "arp isn't available in this repository"
(2026-11-10). skills.sh documents no submission; how a repository enters its index was not established
here. A first `npx skills add intuition-box/ARP --skill arp` once the repository is public is the cheap test.

### 3. `npx skills` shows ARP's data before install: a proposal

**What the CLI does today** (vercel-labs/skills at `26dc8e4`, 2026-11-10): after a skill is picked, and
only for a public GitHub repository, `skills add` asks `https://www.skills.sh/tele/audit` (3 s timeout,
skipped under `DISABLE_TELEMETRY`/`DO_NOT_TRACK`) and prints a "Security Risk Assessments" table with
three hardcoded partner columns, Gen, Socket and Snyk, before "Proceed with installation?"
(`src/telemetry.ts:4`, `:97-128`; `src/add.ts:178-222`, `:2703-2716`, `:3031-3060`). skills.sh's API
documents two more audit providers, Runlayer and ZeroLeaks (skills.sh/docs/api). The URL and the
columns have no override; `SKILLS_API_URL` swaps only `find`'s search, `SKILL.md` frontmatter beyond
`name`, `description` and `metadata.internal` is ignored, and there are no lifecycle hooks (asked in
open issues #755, #1155). How a provider becomes an audit partner is documented nowhere. Requests for a
pluggable scanner (#1292) and for surfacing audits (#476, PR #482) have no maintainer reply; an issue
pitching a third-party tool was closed (#1222).

**So there is no extension point today.** Three routes, in the order to try them:

1. **Ours, now, no one's permission.** The `skills` package exports `resolveSource` and `installSkills`,
   and documents "preview a source, ask the user, then install" (`docs/api.md:14-29`). ARP already shows
   its data before install where it runs: `arp_pulse`, `arp_get_skill`, the Desktop install dialog
   (task 96). It reaches only people who run ARP. Nothing to build for this proposal.
2. **A skills.sh audit provider.** The CLI's table and the skill pages already carry outside providers.
   ARP is not a security scanner, and a `pass`/`warn`/`fail` status is a verdict ARP does not give
   (ADR `0046`), so ARP would ask for an **informational** column, never a risk level. It needs a
   conversation with Vercel, which is the user's to open, after the tester round.
3. **A generic advisory provider in the CLI**, a PR to vercel-labs/skills: a URL from config, rendered
   beside the audit table, opt-in. Weak precedent (above). Only with route 2's agreement.

**What ARP would expose for routes 2 and 3**: one GET per skill, keyed like the CLI's audit call
(`source=<owner/repo>&skills=<name>`), answering facts only, each with its date and its count of
distinct wallets: lines that say worked and failed (from `skill-lines.json`, once a third party writes
any), the closed reasons, `needs`, and what the skill's files contain (task 96: programs, settings by
name, hosts, fetch-and-run lines). No score, no risk label. Until then the static
`/feeds/skill-lines.json` is the whole interface: a reader filters it by `repo` and `skill`.

No contact was made. This proposal is the user's to act on.

### 4. Outreach drafts (business-dev, uncommitted)

In `/home/max/Project/ARP-business-dev/outreach/drafts/`: `agent-marketplaces-2026-11-09.md` gets a
table of the three feeds and the hosted endpoint with what each holds today, offers C, D and H updated,
and links in the Apify, Nevermined, x402scan, Agentverse, AI Agent Store and Swarms texts;
`x402-payers-2026-11-09.md` no longer says the x402 line is unbuilt and links the feed. Links use
`{site}` and `{mcp-host}`: neither is online on 2026-11-10.

## Gates

- `cd packages/protocol && bunx vitest run test/skill-lines-feed.test.ts` and `bunx tsc --noEmit -p .`
- apps/web: `bunx tsc -b`, `bun run lint`, `bun run test`, `bun run check:tokens`
- root: `bun run check`, `bun run test:scripts`
- `ui-reviewer` (the docs manifest is in `apps/web/src`), then `task-verifier`.
