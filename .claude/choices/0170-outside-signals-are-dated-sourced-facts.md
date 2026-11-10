# 0170 — Outside signals are dated, sourced facts, never ARP's figure and never in an order

**Status:** Accepted
**Date:** 2026-11-10
**Triggered by:** `docs/tasks/101` (feature D, "don't start empty"); `FUTURE.md` "x402: check before
paying", point 2 ("Read the Trust Index as a dated fact").

## Context

A skill or an agent with no line on Intuition shows nothing ARP wrote, and most of them have none. Some
public figures already say something about them: whether GitHub holds the repository as archived or
not at all, whether its issues report failures, and, for a paid endpoint, whether x402 Doctor could pay
it. ARP already treats one such figure this way: the probe's "answered from Cloudflare at 14:10" is a
dated third-party fact, kept apart from the pulse (ADR `0093`). The question was how to carry three
more without letting them pass for ARP's evidence.

## Decision

1. **Three sources, each read at build time by a committed script**, kept as one dated file per run in
   `data/measurements/` (ADR `0064`), and bundled by `scripts/build/build-outside-signals.ts` into
   `data/catalogue/outside-signals.json`, which the MCP server and the site both read:

   | Source | Script | What is kept |
   | --- | --- | --- |
   | GitHub, `api.github.com/repos/{repo}` | `scripts/measure/repo-liveness.ts`, extended to every repository a skill page reads | archived, 404 |
   | GitHub search | `scripts/measure/repo-failure-issues.ts` | a count, an open count, the numbers, states and opening days of the newest five; for a repository of several skills, the numbers whose title names each |
   | x402 Doctor's Trust Index, `huggingface.co/datasets/x402Fizzl/x402-trust-index` | `scripts/measure/x402-trust-index.ts` | the rows for the endpoints ARP's directory declared and the catalogue's remote endpoints, by exact URL and by host |

2. **Every fact says who said it, the day it was read, and where to ask again**, as
   `{says, per, on, check}` in `arp_pulse`, `arp_find_tools` (full detail) and `arp_agent_endpoints`,
   and as a date beside the panel's label on the site with the caveat in a `Hint`
   (`packages/protocol/src/outside-signals.ts`, `repoFacts`, `endpointFacts`).
3. **Never an input to a score or an order.** `pulse-score.ts`, the pulse's order, `arp_find_tools`'
   order and the agent lists read none of it, under ADR `0143`: an order moves only from three wallets
   saying the same thing, and a figure ARP did not observe is not one of them. It is never written on
   chain either (ADR `0093`).
4. **Silence is not "nothing found".** A repository or a host the reading did not cover gets no fact,
   and the skill page says "not read"; an endpoint whose host was asked and is absent from the index
   gets "not listed".
5. **No issue text is copied.** The search reads titles only to match a skill's name and keeps
   numbers; the page links each issue and GitHub's own search, where the text stays. The query is
   titles only, five words (`error OR fail OR failed OR broken OR crash`), because the same words in a
   body match an error quoted in passing: on 2026-11-10, `repo:mattpocock/skills is:issue error OR fail
   OR failed OR broken OR crash` returned 255 of the repository's 1,037 issues, the same with
   `in:title` 28. Both are one GitHub search a reader can run again.
6. **The Trust Index is read from the dataset whose licence is stated.** The same files are on the
   `trust-data` branch of `Fizzl13/x402-doctor`, whose README states no licence and whose repository
   is AGPL-3.0. The Hugging Face dataset card says `license: cc-by-4.0` and asks for the credit
   "x402 Trust Index by x402 Doctor (fizzl.eu)". The script refuses to run if the card's licence
   changes, and the credit is shown as text on the panel and on every fact, not only in a hint.

## Alternatives considered

- **Doctor's live API (`/api/trust?url=`) from the MCP server.** Fresher, but every call would send an
  endpoint a user is looking at to a third party, and the posture of the probe is a dated reading. The
  live URL is given as `check`, for the agent or the person to ask themselves.
- **A failure count from issue bodies.** Rejected for the reason in point 5.
- **Folding archived and deleted into `repo-facts.json`.** That file's figures are bundled with
  skills.sh's installs and printed under one date; a second date in the same panel would misdate one of
  them. The new panel carries its own date.
- **The Coinbase Bazaar's paid-call counts.** Its terms of reuse were not read for this task, so it is
  not displayed; the same three-part shape takes it once they are.

## Consequences

**Positive:**
- A skill or agent with no line shows something checkable before anything is written about it.
- Each figure can be re-derived: the scripts, the dated measurements, and a `check` URL per fact.

**Negative:**
- The figures age. The page prints the day; nothing refreshes them until the scripts run again.
- Title matching is a keyword match. A title that says "error handling docs" counts. The `Hint` says a
  match does not confirm a failure.
- The x402 reading covers ARP's directory (the sieve's walk) and the catalogue's remote endpoints
  only, so most endpoints an agent asks about elsewhere get no fact.

**Neutral (worth knowing):**
- `verdict: "error"` is in the dataset and not on its card: it is an endpoint that did not answer, and
  is shown as "unreachable".

## References

- Related rule: `.claude/rules/claims.md` (checks 3 and 6), `.claude/rules/ui.md`
- Related ADR: `0064`, `0093`, `0143-the-ranking-moves-from-three-wallets`, `0165`
- Related doc: `FUTURE.md` "x402: check before paying"
