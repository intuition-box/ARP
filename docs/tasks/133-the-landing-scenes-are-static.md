# Task 133 — The landing's scenes are static: they read nothing

**Status:** done 2026-11-11, branch `worktree-agent-a400dda2c7e5d6abc`. `ui-reviewer` PASS on
round 2, `task-verifier` PASS, post-mortem `.claude/learning/121-the-landing-scenes-are-static.md`.
Task 133, ADR `0197`, post-mortem `121`, allocated by the orchestrator.
**Rules:** `code.md`, `ui.md`, `claims.md`, `workflow.md`.
**Required skills:** `arp-contributing`.

## Why

On production on 2026-11-11 the landing's scene 1 showed a real line, « pdf used by Agent 13579:43 »,
from one of ARP's own test agents created that day. `apps/web/src/pages/Landing.tsx` showed the
sample (`services/landing-sample.ts`) only while the chain answered with nothing, and real data
replaced it panel by panel (ADR `0152` §6 and its 2026-11-10 amendment). The user had expected the
sample to stay. His decision, 2026-11-11: « je veux que tu vires ces variables, le front à cet
endroit est static, rien n'est lu ».

## What changes

- `pages/Landing.tsx`: every scene renders `landing-sample.ts` (`SAMPLE_LINES`, `SAMPLE_LINE`,
  `SAMPLE_READINGS`, `SAMPLE_TOOL`, `SAMPLE_FIELD` for the galaxy). No hook reads the chain; the
  "reading…", "The graph did not answer" and empty states are gone, with the real-data branches.
  The pulse head reads « Lines », with no chain.
- Deleted as dead: `hooks/use-landing-field.ts`; `GalaxyField`'s nullable field and its empty-field ring; `useRecentDeclarations` (its `recentQueryOptions`
  stays, for `/activity` and the bar); in `services/landing-field.ts` the loader, the builder, the
  paid-word read, `mostDeclaredTool`, `EMPTY_FIELD`, `linesFailed`, and their test file;
  `fieldOrSample`. The file keeps the field's types, `LANDING_DOTS_PER_RING` and
  `readVocabularyIds`, which the agent page uses.
- `Landing.test.tsx`: the sample in every scene on the first render, and no call to `fetch`,
  `getRecentDeclarations`, `listTools`, `getPulseUsage`, `readPulse` or `hiddenAtomIds`, on either
  chain.
- ADR `0197`; ADR `0152`'s header; `rules/ui.md`'s "How it works" bullet; comments in
  `GalaxyField.tsx`, `App.tsx`, `use-recent-declarations.ts`; a dated note on
  `docs/design/landing-galaxy/LANDING-GALAXY.md`'s "Data" section.

## Added in the same session: no link to the Agents part

The user, 2026-11-11, relayed by the orchestrator: the Agents part leaves the navigation for now
(« brouille notre proposition initiale »); `/agents` and `/agent/…` stay reachable by URL. The tab
left `Layout.tsx` on main. On the landing the two links to `/agents` go: the hero's « Open the agent
index » and the entry point « The agent index ». Each is replaced by the tool index (`/tools`,
« Open the tool index », « The tool index »), so the hero keeps a primary control and the landing
leads to Tools and Docs; the orchestrator's brief said remove, and the replacement is this task's
choice, flagged for the user. `Landing.test.tsx` asserts no link on the page goes to `/agents` or
`/agent/…`. No ADR: ADR `0139` (one search, two kinds of result) is about the search, which still
returns agents, so hiding a navigation entry reverses nothing in it.

## Outside the scenes, still reading on `/`

The app's chrome, on every page: the activity bar (`components/brand/ActivityLog.tsx`,
`useChainActivity`, only while it is opened). The chain toggle and the wallet control hold no query. Not touched; listed for the user.

## Do not do in this task

- Change the scenes' copy, visuals or motion, beyond the pulse head and the two Agents links above.
- Touch the chrome's reads (above) without the user's say.
