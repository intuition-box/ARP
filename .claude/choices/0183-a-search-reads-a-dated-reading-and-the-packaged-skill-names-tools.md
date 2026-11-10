# 0183 — A search reads a dated reading for catalogued skills, caps what it reads, and the packaged skill names the tools

**Status:** Accepted
**Date:** 2026-11-10
**Triggered by:** `docs/tasks/113-fewer-requests-per-search.md`, the user's five approved points and his
"je ne veux pas voir les requêtes GraphQL dans mon terminal". Amends ADR `0052` (which skill a package ships).

## Context

One `arp_pulse` call with one phrase made 252 requests in 23.5 s (the coordinator's run, 2026-11-10,
cold cache), and 215 in this task's own baseline (`data/measurements/pulse-requests-2026-11-10T143830.json`,
173 of them `SKILL.md` files from raw.githubusercontent.com). Four phrasings made about a thousand. The
cause was `locate` in `packages/protocol/src/pulse.ts`: when a skill's directory does not carry its name,
it read every other `SKILL.md` in the repository, up to 200, and once found read the rest again.

Separately, the plugin shipped `skills/arp/SKILL.md`, the procedure for an agent with nothing installed
(ADR `0052`), whose raw GraphQL it calls "the source of truth, it replaces the other two". An agent that
also had the server's tools ran `curl` GraphQL in the user's terminal.

## Decision

1. **Catalogued skills are answered from a dated reading** (`data/catalogue/pulse-readings.json`, built by
   `scripts/build/build-pulse-readings.ts` from `scripts/measure/pulse-readings.ts`), which is `readPulse`'s
   own output for every skill in `apps/web/src/data/skill-paths.json`, read at `HEAD` on one date. The
   answer carries `dated_reading: {read_at, by}`. It is a separate reading from the site's
   `skill-contents.json` on purpose: that one reads every file of the directory, and `arp_pulse` must keep
   answering what its own reader returns, so nothing a person saw before is lost but the freshness.
2. **The name search reads at most 12 other `SKILL.md` files**, nearest the name first (words its path
   shares with the name), those sharing a word together, and a name not found among them is `incomplete`,
   never `absent`. A second copy is looked for among the files sharing a word only. Scripts are
   fetched within 5 files, 256 KB each and 512 KB in all, none under an examples or assets directory;
   the rest are named as not fetched.
3. **One read per file per call, and ten minutes per process** (`memoryFileCache`, memory only). The tree
   listing was already one per repository per call and a day on disk. The domain tree is read once per
   five minutes for searches (`apps/mcp/src/domain-tree.ts`); the paths that write under it read it fresh.
4. **The graph and the chain**: the four line predicates come from the `findToolAtoms` query the search
   already makes (no RPC); an agent's `has endpoint` proofs come in one aliased query, each claim its own
   field and limit (ADR `0095` §7 holds); `ownerOf` is asked once per token per read, and a signature is
   recovered locally before the chain is asked.
5. **The packaged skill is `apps/cli/assets/plugin-skill.md`**, for the Claude Code plugin and the Gemini
   extension: it names `arp_pulse`, `arp_tool_reputation`, `arp_agent_endpoints` and says never to query a
   source yourself. `packages.ts` refuses it if a GraphQL document appears in it. `skills/arp/SKILL.md`
   stays the published procedure, with one added paragraph: with the tools connected, use them.

## Alternatives considered

- **Bundle the site's `skill-contents.json` instead** — rejected: it lacks keys, paid words, hosts, size,
  `content_id` and the CLI declared, which `arp_pulse` shows today.
- **Bundle the catalogued skills' raw files, and run the reader at search time** — rejected on size (several
  MB of Markdown in the CLI) for a gain only when the reader changes, which a rerun of the measurement covers.
- **Keep reading every `SKILL.md`, in parallel** — the request count was the complaint, not the time.
- **Compute the predicate ids locally from MultiVault's `calculateAtomId`** — rejected: `failure-lines.ts`
  already reads them from the graph by data, and a copy of a contract's hash would be a second source.
- **A `.md` beside the published skill for the plugin** — rejected: `skills/arp/` is copied whole by the
  skills CLI, so a second file there would ship to every install of the published skill.

## Consequences

**Positive:**
- One phrase, cold, testnet 13579: 215 → 22 requests, 9.3 s → 6.8 s, the search package included
  (n = 1 each; `data/measurements/pulse-requests-2026-11-10T143830.json` and `…T154122.json`), with the
  same answer field for field. Queries that resolve a domain cost 26 to 38 after (n = 1 each, no before).
- The agent in a plugin is told to use the tools; the user sees no query in the terminal.

**Negative:**
- A catalogued skill's facts age until `scripts/measure/pulse-readings.ts` is rerun; a change after the
  reading date is not seen. With a token, a catalogued skill no longer shows its repository's figures
  (stars, last push), which the reading did not take without one.
- A skill whose `SKILL.md` sits in a directory sharing no word with its name, in a repository with more than
  12 other skill files, now reads `incomplete` where it was read before, and one absent from such a
  repository reads `incomplete` where it read `absent` (`openai/skills` `slides`, 44 skill files,
  2026-11-10). A second copy in a directory sharing no word with the name is not seen (`differsAt`,
  `alsoAt`).
- A script its instructions run, under `examples/` or `assets/`, or over the cap, is no longer read; its
  keys do not reach `keys_in_scripts_it_runs`.
- The CLI bundle grows by the reading: 468,504 bytes of JSON (`wc -c data/catalogue/pulse-readings.json`),
  carried in `packaging/claude/arp/bin/arp.js` (`wc -c` gives its size at any commit).
- The reading was taken before the name search's "files sharing a word together" refinement; for the
  catalogue it changes nothing: in all 518 read rows the directory carries the skill's name, so the name
  search never ran (checked over `data/measurements/pulse-readings-2026-11-10T1445.json`).

**Neutral (worth knowing):**
- After a change to what `readPulse` or `readSkillContents` returns (task 112), rerun the measurement and
  the build: `apps/mcp/test/pulse-readings.test.ts` fails until the bundle's fields match the reader's.

## References

- Related rule: `.claude/rules/claims.md`, `.claude/rules/portability.md`
- Related doc: `docs/22_RUNNING_THE_NODE.md` (outbound connections)
- Related ADR: `0052` (amended), `0095` §7, `0165`, `0167`
