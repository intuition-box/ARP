# 77 — Installs offer sharing

**Task:** `docs/tasks/88-share-at-install.md` (built as task 86, renumbered by the coordinating session)
**Completed:** 2026-11-09
**Commit:** `9b68596` on `feat/88-share-at-install` (on `origin/main` `d8bff52`, not pushed)
**Verifier verdict:** PASS (round 2)

## What shipped

- `packages/protocol/src/share-offer.ts` — the one offer text, no import: what leaves, who signs, what never
  leaves, that sending waits for the sponsoring service, how to change it.
- `apps/cli/src/install/commands.ts`, `env.ts` — `arp init` asks `[y/N]` after a successful, non-dry-run
  install when `sharing.json` is absent; `--share` / `--no-share`; `--yes`, `--no-input`, no TTY leave it off;
  `arpHome` honours `ARP_HOME`. 4 tests in `apps/cli/test/install.test.ts`.
- `apps/mcp/src/share-ask.ts`, `server.ts` — read mode (the plugin) adds the ask paragraph while no answer is on
  file; Desktop writes `ARP_SHARE` `true`/`false` at `initialize`, anything else leaves the file alone.
- `apps/web/src/components/onboarding/StepCommands.tsx` — unticked checkbox on `init` and `connect`, offer in a
  `Hint`; `Install` gains a `prompt` prop so `/arp:share-on` shows after `›` and copies exactly.
- `docs/tasks/88` — the `.mcpb` `user_config` snippet (the manifest is not built here).

## Surprises

- Round 1 failed on the consent text: a shared line's content was right, but `arp share send` signs with
  `~/.arp/agent-key` and registers it as an ERC-8004 agent, so every line carries one public, linkable address.
  "Exactly what leaves" has to include who signs, not only the payload.
- A slash command fed through the shell-command box rendered as `$ /arp:share-on (…)` and copied the note.

## Decisions made

- **Off unless the person agrees, in four forms, one text** — ADR `.claude/choices/0157-installs-offer-sharing-off-by-default.md`.
- **The plugin's answer is a command the model cannot invoke** — `share-on.md` / `share-off.md` carry
  `disable-model-invocation: true`.

## Rules touched

- `.claude/rules/claims.md` — sufficient; it caught the missing signer. Consent text is a claim.
- `.claude/rules/ui.md` — sufficient. `accent-color` on a ticked box counts as a selected state; the Hint holds
  five sentences where the rule says one, accepted for a consent text.

## Suggestions for future tasks

- For any "what leaves" text, trace the send path to the signature and the registration, not only the payload type.
- The MCPB boolean-to-`"true"` substitution is untested; check it when the `.mcpb` is next built (it fails safe: off).

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, toward corroborated: it puts the question to every installer so more independent wallets can write
failure lines once the sponsor is online; it adds no line today, so it does not move ARP up yet.
