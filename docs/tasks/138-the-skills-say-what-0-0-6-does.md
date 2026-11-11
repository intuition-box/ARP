# Task 138 — The skills say what CLI 0.0.4 to 0.0.6 does

**Status:** done 2026-11-11 on a worktree branch from `origin/dev` (`af27f507`). `task-verifier` PASS
(second round; the first flagged three sentences, fixed), post-mortem
`.claude/learning/126-the-skills-say-what-0-0-6-does.md`. Task 138, post-mortem
`126`, no ADR: the version bump is ordinary semver and every sentence added restates a decision an
existing ADR holds (`0191`, `0192`, `0186`, `0189`, `0196`, `0110`).
**Rules:** `workflow.md`, `claims.md`, `code.md` (no code changed).
**Required skills:** `arp-contributing`.

## Why

Both ARP skills were written before CLI 0.0.4, 0.0.5 and 0.0.6 shipped on 2026-11-11
(`npm view @arp-protocol/cli time`: 0.0.4 15:03, 0.0.5 15:42, 0.0.6 17:49 UTC). An agent reading them
did not know that the hook may ask it to put a sharing question, that a line can now be about a
version of a skill, or what the sponsored tool set does. One read in the published skill had become
incomplete: its `uses` query filtered on `object_id`, so it would miss every versioned line.

## What changes

### `apps/cli/assets/plugin-skill.md` (version 0.1.0 → 0.2.0)

Shipped as the Claude Code plugin's `skills/arp/SKILL.md` and as Gemini's `ARP.md`
(`apps/cli/scripts/packages.ts`). The Desktop `.mcpb` ships no skill (`apps/cli/scripts/mcpb.ts`
stages `manifest.json`, `icon.png`, `server/`), so nothing here reaches Desktop.

- **When ARP's hook asks you something**: the closing `arp: <skill> worked|failed|unsure` line, and
  the one sharing question of ADR `0191`, worded from `shareQuestionFor()` (`apps/hook/src/share-ask.ts`):
  three choices, what would leave, wait for the person's own answer, never write `arp-share:` in the
  message that asks (the hook ignores it there), none if they did not answer. The `/arp:*` commands
  run only when the person types them (`disable-model-invocation: true`, checked by
  `apps/cli/test/cli.test.ts`). Gemini runs no hook, and the section says so.
- **What a shared line says**: the hosted sponsoring service, the version `(skill, version,
  sha256:<digest>)` written only at `HEAD` or from a receipt's digest, the `Skill` type, the content
  receipt as evidence and what it does not say, an x402 line's payment and URL without values, the
  terms being in the signed request the sponsoring service keeps, not on the line.
- Unchanged: the tool table and "Never query ARP's sources yourself" (task 113).

### `skills/arp/SKILL.md` (version 0.1.0 → 0.2.0)

- The connector row no longer says the server always holds no key: the sponsored mode holds one.
- A table of ARP's three hosted services, each on testnet 13579, with the CLI version that made each a
  default (`apps/cli/package.json` `config`, `apps/cli/CHANGELOG.md`).
- **The read query reads versioned lines** (`_or` on `object_term.triple`, the shape of
  `PULSE_VERSIONED_USES_QUERY`). Run 2026-11-11 against both indexers with the `pdf` skill's atom
  (`0x9b3a3cc6…a8ce`): no error on either, 3 rows on 13579, 0 on 1155.
- The `version` term id, and a pointer to `docs/34` §1 for the rest.
- **What a line says**: form B with the 0.0.6 levels, from `docs/34` §1, and how a reader weighs the
  version, the receipt, an x402 line and the plain-string words.
- Declaring yourself: a self-written line has no version path (ADR `0192`, last negative); a paid URL
  goes without its values (ADR `0186`).
- **In Claude Desktop, or with `arp init --sponsored`**: the tool set exactly as `servedTools({desktop:
  true})` serves it (task 135's `tools/list` read the same eight), what each tool does
  (`apps/mcp/src/tools.ts` `DESKTOP_TOOLS`, `desktop/loop.ts`), and when to call `arp_declare_used`:
  only for a skill actually used, when the person asks or it did the job, matching the server's own
  `DESKTOP_INSTRUCTIONS`. What it writes: `(agent, uses, skill)`, no version, no outcome. Desktop runs
  no hook and is never asked the sharing question.
- **When ARP's hook is installed**: the same two requests as in the plugin skill, short.
- Kept: every raw query and the declare procedure (ADR `0052`).

## Checked, 2026-11-11

- `bun run --cwd apps/cli packages` regenerated `packaging/claude/arp/skills/arp/SKILL.md` and
  `packaging/gemini/arp/ARP.md`; `packages --check`: "packaging/ matches this build".
- `bun run --cwd apps/cli test`: 89 pass, including the task-113 test (no GraphQL in the packaged
  skill, "Never query" present, the published skill keeps its GraphQL).
- `bun run --cwd apps/cli check:node`: PASS.
- Root `bun run check`: scripts typecheck, tokens, contrast clean. None of these gates reads a skill's
  prose; the claims in it were checked against the sources named above, by hand.
- `apps/mcp` not touched, so its tests were not run.

## Not done

- Desktop's agent reads the server's `DESKTOP_INSTRUCTIONS`, not a skill. They already say "never
  declare a skill you did not use"; they were not changed.
## Open

- **Should `arp_declare_used` ask the person first**, rather than follow "when it did the job"? The
  user's call, relayed by the orchestrator. Neither skill adds that rule today.

## Evidence ladder

Skill column, declared tier: the skills tell an agent how to write a line about a versioned skill and
to leave the sharing choice to the person. It does not move ARP up the ladder; it keeps the declared
tier's lines honest about which files they name and who agreed to send them.
