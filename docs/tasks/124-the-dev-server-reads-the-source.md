# Task 124 — What runs from this checkout reads `packages/protocol/src`, not a stale `dist/`

**Status:** verified 2026-11-11, `task-verifier` PASS (round 1), implementation `8ca44008`, post-mortem `.claude/learning/112-the-dev-server-reads-the-source.md`; on the worktree branch, for the orchestrator to push.
**ADR:** none. The decision and its reasons are below; it is build configuration, and every consumer
that ships keeps its own build.
**Rules:** `code.md`, `workflow.md`, `claims.md`. Gates: `apps/web` `tsc -b`, lint, test, `check:tokens`;
root `bun run check` and `bun run test:scripts`; `apps/cli` test, `check:node`, `packages --check`;
`packages/protocol` test and lint; `apps/sponsor` and `apps/mcp` test.
**Required skills:** `arp-contributing`.

## Why

Twice on 2026-11-10/11 a change merged into `packages/protocol` was invisible to what ran it. Consumers
import `@arp-protocol/core`, whose `package.json` exports pointed only at `dist/`, and nothing rebuilds
`dist/` after a merge:

- the web dev server rendered `/atom/:id` black — "does not provide an export named `beforeInstall`";
- the sponsoring service, started as its README says (`bun run apps/sponsor/src/main.ts`, no build step
  in that command), failed on a missing `parsePaymentAtomLabel`.

Both were fixed by rebuilding `dist/` by hand.

## Do not do in this task

- Change how a shipped artefact is built: the site's `vite build`, the CLI bundle (`packaging/` must
  still match), the hook bundle.
- Change what the type checks read. `tsc` keeps reading `dist/*.d.ts`, and every gate that runs `tsc`
  already builds `dist/` first.

## What was done

Two export conditions on each workspace package, pointing at `src/`, ahead of `types` and `default`:

| package | condition | entry |
| --- | --- | --- |
| `packages/protocol` `.` | `arp-source`, `bun` | `./src/index.ts` |
| `packages/protocol` `./node` | `arp-source`, `bun` | `./src/node/index.ts` |
| `packages/graphql` `.` | `arp-source`, `bun` | `./src/index.ts` |

- **`bun`** is matched by the Bun runtime and `bun test` with no flag. So every documented command —
  `bun run apps/sponsor/src/main.ts`, `bun run apps/mcp/src/server.ts`, `bun run apps/node/src/node.ts`,
  the scripts — reads the source. That is why this condition and not a custom one alone: a custom
  condition needs `bun --conditions=…` on every documented command line — 32 lines on 2026-11-11, by
  `git grep -nE "bun run apps/(sponsor|mcp|node)/src" -- ':!docs/tasks' ':!.claude' ':!data' | wc -l` — and a command typed
  without it would read `dist/` again (checked: `bunfig.toml` has no setting for it; neither
  `conditions = […]` nor `[run] conditions` changes the resolution).
- **`arp-source`** is a name nothing else uses, for Vite. `apps/web/vite.config.ts` adds it to
  `resolve.conditions` (with Vite's `defaultClientConditions`) **for `vite` dev only** (`command ===
  'serve'`). Adding `bun` to Vite's conditions would also switch every dependency that has a `bun`
  export.
- `apps/web` `dev`, `apps/sponsor`, `apps/mcp` and `apps/node` `start` no longer build `dist/` first.
- `apps/sponsor/Dockerfile` and `apps/mcp/Dockerfile` no longer build `packages/protocol`: both images run
  under Bun, so they read `src/` too, which their `.dockerignore` allowlists already include.
- `files` in both packages now lists `src`, so a Bun consumer of a published package finds what its
  `bun` condition names.

### What still reads `dist/`

| what | why it is right |
| --- | --- |
| `vite build` (`apps/web` `build`, its Dockerfile) | builds `dist/` first, one shot |
| the CLI and hook bundles (`Bun.build --target=node`) | `node` matches neither condition; `packages --check` still matches |
| `vitest` in `apps/web`, `apps/mcp`, `packages/protocol` | each `test` script builds first, one shot |
| `tsc` everywhere, and an editor's types | reads `types`; every gate builds first. An editor can show stale types after a merge until a build; the running code is not affected |
| `apps/api` `dev` (`wrangler dev`) | esbuild's conditions match neither; its `dev` still builds first. **Not covered** for a `wrangler dev` left running across a merge |

`apps/mcp` `build` (`--target=bun`) now bundles from `src/`; that `dist/` is not committed.

## Verified

1. **The incident, reproduced and fixed** (2026-11-11). `packages/protocol` built, then `beforeInstall`
   and `beforeInstallSummary` removed from `dist/index.js` by hand — a stale `dist/`. `vite` dev, then
   `/atom/0xa448…a5f1` loaded in headless Chromium (playwright-core 1.48.2, chromium-1140), page errors
   and module requests recorded:
   - this task's `vite.config.ts`: modules from `packages/protocol/src` and `packages/graphql/src`,
     **0** module errors, `#root` has text;
   - `HEAD`'s `vite.config.ts` on the same stale `dist/`: modules from `dist/`, `#root` empty, one page
     error, `does not provide an export named 'beforeInstall'` — the incident.
2. **The sponsor**, `parsePaymentAtomLabel` removed from `dist/index.js` by hand: from `apps/sponsor`,
   `import {parsePaymentAtomLabel} from "@arp-protocol/core"` under `bun run` gives `function`. With no
   `dist/` at all, `bun run start` in `apps/sponsor` reaches its config check
   (`SPONSOR_DEPOSIT_WEI is required`) and `apps/mcp` starts.
3. **The images.** `docker build` of `apps/sponsor/Dockerfile` and `apps/mcp/Dockerfile` succeed. In the
   sponsor image, `@arp-protocol/core` resolves to `file:///repo/packages/protocol/src/index.ts` and
   `parsePaymentAtomLabel` is a function; the entrypoint refuses a missing key as before. The MCP image
   answers `GET /` 200 with `Host: mcp.example.org`. `apps/web/Dockerfile` is unchanged and
   `bun run --cwd apps/web build` passes.

## Gates, 2026-11-11

`packages/protocol` test (1410 passed, 4 skipped) and lint; `apps/web` `tsc -b`, lint, test (897 passed,
2 skipped), `check:tokens`; root `bun run check` and `bun run test:scripts` (46 pass); `apps/cli` test
(80 pass), `check:node` PASS, `packages --check` ("packaging/ matches this build"); `apps/sponsor` test
(189 pass) and lint; `apps/mcp` test (306 passed), lint and build; `apps/web` build. Each gate covers
its own package; none of them exercises the dev server, which is what step 1 above does.
