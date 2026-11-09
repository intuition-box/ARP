# 0157 — Every install offers sharing once, off unless the person agrees

**Status:** Accepted
**Date:** 2026-11-09
**Triggered by:** the user, 2026-11-09 (« il faut une check box à l'installation pour que ça propose d'activer le sharing »), task 88

## Context

Sharing a machine's skill failures as public lines (`arp share`, task 70) is off by default and was turned on
only by someone who knew the command. Nobody was asked. ARP has four ways in, and only some can show a checkbox.

## Decision

Each install offers it once, in its own form, with one text (`packages/protocol/src/share-offer.ts`) naming
exactly what leaves (the skill's public address, its category when known, `failed`, a closed reason, and the
machine's own ARP address that signs every line, created on the first send and the same on every line, so a
machine's lines can be linked), what never does (prompts, files, paths, code, keys), and that sending waits for
ARP's sponsoring service, not online yet.
Off unless the person agrees.

| Install | The offer |
| --- | --- |
| `arp init` | one `[y/N]` question after the install, only when no answer is on file; `--share` / `--no-share` answer up front; `--yes` alone leaves it off |
| The Claude Code plugin | no install screen exists, so the server's instructions ask the agent to put the question once while no answer is on file; the person answers with `/arp:share-on` or `/arp:share-off`, which the model cannot invoke |
| The Claude Desktop extension | a manifest checkbox passed as `ARP_SHARE`; the server writes it as the answer at each start |
| The web Get started page | an unticked checkbox on the install steps that changes the command shown (`init --share`, or `/arp:share-on` for the plugin); the page stores and sends nothing |

## Alternatives considered

- **On by default** — it publishes before anyone agreed.
- **The agent turns it on when the person says yes** — the choice should be the person's act; the plugin's
  commands are not model-invocable for that reason.

## Consequences

**Positive:** the person is asked, with the exact content, at the moment they install.

**Negative:** the Desktop extension's manifest is not built in this repository; the snippet is in
`docs/tasks/88`, and the checkbox appears only once a build includes it. Until the sponsoring service is
online, agreeing changes nothing that leaves the machine.
