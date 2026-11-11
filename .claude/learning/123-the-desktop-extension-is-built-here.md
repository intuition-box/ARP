# 123 — The Claude Desktop extension is built here

**Task:** `docs/tasks/135-the-desktop-extension-is-built-here.md`
**Completed:** 2026-11-11
**Commit:** `4b516906` (branch `feat/135-desktop-extension`)
**Verifier verdict:** PASS

## What shipped

- `apps/cli/scripts/mcpb.ts` — `bun run --cwd apps/cli mcpb` copies the plugin's `bin/arp.js` byte for byte, writes a 0.3 manifest (`ARP_TOOLS=desktop`, `ARP_TARGET=testnet`, `ARP_SHARE` from `share_failures`, default false), validates and packs `dist-mcpb/arp-0.0.6.mcpb` (4 files, 672.0 kB).
- `apps/cli/test/mcpb.test.ts` — mode, env, the setting's default, the official validator.
- `apps/cli/package.json`, `bun.lock` — `@anthropic-ai/mcpb` 2.1.2 exact, devDependency only; `npm pack --dry-run` lists 32 files, none of them mcpb.
- `apps/web/src/data/arp-test-identities.json` and its tests — agent 13579:44 hidden; `ownerOf(44)` = `0x0B2b…3C7d`, `ownerOf(45)` reverts (re-read 2026-11-11).

## Surprises

- Desktop runs no hook, and only the hook writes `failures.jsonl` or starts `arp share send`. So in Desktop the `share_failures` box only writes `~/.arp/sharing.json`, at each `initialize`. That file is shared with Claude Code on the same machine, so the default `false` overwrites an `arp share on` made there, every time Desktop starts. Task 88 decided this behaviour; this task is the first to ship it.
- The server's `serverInfo.version` is still a hard-coded `0.2.0` while `--version` and the manifest say 0.0.6 (written before this task).

## Decisions made

- **One bundle for plugin and extension** — the `.mcpb` copies `packaging/claude/arp/bin/arp.js` rather than building its own, so the two cannot drift. No ADR (ADR `0110`, task 88 cover it).

## Rules touched

- `.claude/rules/claims.md` — sufficient; the ownerOf reads and the container run reproduced as written.
- `.claude/rules/code.md` — `mcpb.ts` keeps `packages.ts`'s uncommented `JSON.parse(...) as {…}`; the rule asks for a comment on every cast.

## Suggestions for future tasks

- Before the Release: decide whether the Desktop box should overwrite a Claude Code sharing choice, and add a checklist step that checks `~/.arp/sharing.json` after install.
- In the Desktop checklist, remove an older ARP entry (step 2) before installing (step 1).

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, observed tier: the extension gives a Desktop user the content server's signed receipt and a declaration paid against it, with nothing to sign. It moves ARP up only once released, toward observed skill lines from a new population.
