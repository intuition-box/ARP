# Task 88 — Installs offer sharing

**Status:** verified 2026-11-09, `task-verifier` PASS (round 2), commit `9b68596`, post-mortem `.claude/learning/77-share-at-install.md`; on `feat/88-share-at-install`, not pushed.
**ADR:** `0157`.
**Rules:** `code.md`, `ui.md`, `claims.md`, `workflow.md`.

## The user's request, 2026-11-09

A checkbox at install that offers to turn on sharing, in all four ways in: `arp init`, the Claude Desktop
extension, the web onboarding page, the Claude Code plugin.

## Deliverables

1. `packages/protocol/src/share-offer.ts`: the one text (what leaves, including the machine's own public ARP
   address that signs every line, what never does, that the sponsoring service is not online yet, how to change it).
2. `arp init`: a `[y/N]` question after a successful install when no answer is on file; `--share`,
   `--no-share`; `--yes`, `--no-input` and no terminal leave it off and say so; `--dry-run` asks nothing.
3. The plugin: `apps/mcp/src/share-ask.ts` adds one paragraph to the read-mode instructions while
   `~/.arp/sharing.json` is absent; the person answers with `/arp:share-on` or `/arp:share-off`.
4. Desktop: the server writes `ARP_SHARE` (`true`/`false`) as the answer at each `initialize`.
5. The web: `apps/web/src/components/onboarding/StepCommands.tsx`, an unticked checkbox on the `init` and
   `connect` steps, the offer in a `Hint`.

## The Desktop manifest, to add where the `.mcpb` is built

The `.mcpb` is not built in this repository (task 50 built it by hand). Its manifest needs:

```json
"user_config": {
  "share_failures": {
    "type": "boolean",
    "title": "Share this machine's skill failures as public lines",
    "description": "When a skill fails here, one public line on Intuition testnet: the skill's public address, its category when known, \"failed\" and a closed reason, signed by this machine's own public ARP address, the same on every line. Never your prompts, files, paths, code or keys. Sending waits for ARP's sponsoring service, not online yet.",
    "default": false
  }
},
"server": { "mcp_config": { "env": { "ARP_SHARE": "${user_config.share_failures}" } } }
```

## Do not do in this task

- Turn sharing on by default, or let the agent turn it on.
- Build the `.mcpb` pipeline.
