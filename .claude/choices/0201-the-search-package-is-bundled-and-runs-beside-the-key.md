# 0201 — The search package is bundled in the release, and runs beside an agent key

**Status:** Accepted
**Date:** 2026-11-12
**Triggered by:** the user's Claude Desktop test, 2026-11-12, and his choice of option 1 of 3, task 141
(`docs/tasks/141-the-search-package-is-bundled.md`)

Amends ADR `0134` point 5, the decision commit `ada72614` (2026-11-05) wrote there, in
`apps/mcp/src/handlers/pulse.ts` `canSearch` and in `docs/22`: "it does not run where an agent key is kept". It now runs there **only** as the
bundled copy below, never through `npx`.

## Context

`arp_pulse` runs the `skills` CLI's `find`. Since `ada72614` it ran as `npx --yes skills@1.7.6 find`, and
not at all in the modes that keep an agent key (`desktop`, `sponsored`, ADR `0110`): `npx` resolves the
package's dependencies, declared as ranges (`tar ^7.5.20`, `yaml ^2.8.3`), when it starts, so a dependency
published after our review would run as the same OS user as `~/.arp/agent-key`. In those modes the tool
asked the agent to run the search and pass its text. Claude Desktop has no terminal: on 2026-11-12 its
Claude ran `npx skills find` in its own sandbox, whose network is filtered, got nothing, and `arp_pulse`
answered nothing. The user chose to bundle the official CLI over calling skills.sh's API directly (its
`robots.txt` disallows `/api/`, the reason `ada72614` used the CLI) or dropping `arp_pulse` from Desktop.

## Decision

**The release carries `skills` 1.7.6, bundled with its dependencies at build time, as `skills-cli.js`
beside its entry, and `arp_pulse` runs it with the Node that runs ARP.** The plugin's `bin/`, the
Desktop extension's `server/` and the npm package's `dist/` each carry it. `canSearch` allows the
key-keeping modes when, and only when, that copy is present; from a source checkout there is none and
the search keeps `npx`, outside those modes.

- **What is bundled.** `skills@1.7.6`, npm integrity
  `sha512-dAee29yRGin7ub6VHwmifLEfHrysGD41yq4RkY0gg7QQh0wyQKWfhiORGb/r6uNpKWc9A1GY8yowV07Lh+4rCg==`
  (shasum `2c452adb00b7acb77b6fbea6fc9c64edd3bde2c3`), an exact devDependency of `apps/cli`, and the
  versions `bun.lock` resolves for its tree: `tar@7.5.23`, `yaml@2.9.1`, `minipass@7.1.3`,
  `chownr@3.0.0`, `minizlib@3.1.0`, `@isaacs/fs-minipass@4.0.1`, `yallist@5.0.0`, each with its integrity
  in `bun.lock`. `bun build node_modules/skills/dist/cli.mjs --target=node --format=esm` (bun 1.3.14)
  gives `skills-cli.js`, 955,525 bytes, sha256
  `66d35035ba2b33ff9b0e7f611ce41c50073c9d0266049a802148a324f15e5c84`, the same on two builds.
- **Licences.** MIT (`skills`, `minizlib`), ISC (`yaml`, `@isaacs/fs-minipass`), BlueOak-1.0.0 (`tar`,
  `minipass`, `chownr`, `yallist`). Each allows redistribution with its notice.
  `apps/cli/scripts/vendor-licenses.ts` writes every package's licence file, and `skills`' own
  `ThirdPartyNoticeText.txt`, to `skills-cli.LICENSE.txt` beside the bundle, in every place it ships.
- **What it reaches.** The bundle names eleven hosts (`skills.sh`, `www.skills.sh`, `github.com`,
  `api.github.com`, `raw.githubusercontent.com`, `gitlab.com`, `example.com`, `schemas.agentskills.io`,
  `notion.so`, `developers.notion.com`, `connectors-skills.zapier.com`); `find` reaches one. `find` with a query calls `searchSkillsAPI`, one `fetch` of `https://skills.sh/api/search?q=…`
  (`SKILLS_API_URL` is not in its environment), then `track()`, which returns at once when
  `DISABLE_TELEMETRY` is set. Checked by running it with every `fetch` and socket connect logged:
  `https://skills.sh/api/search` and `skills.sh:443`, nothing else; the same run without
  `DISABLE_TELEMETRY` added `https://www.skills.sh/tele/t` with the query, which is why it stays set.
- **How it runs.** `searchInvocation`: `process.execPath` with `[skills-cli.js, 'find', query]`, no
  shell, the query one argument, working directory the private `ARP_HOME/skills-cli`, and four
  variables: `PATH` (a project's `node_modules/.bin` removed), `HOME` (that private directory),
  `DISABLE_TELEMETRY=1`, `NO_COLOR=1`.
- **One behaviour changes.** The bundle reads the `package.json` beside its directory as its own version, so
  inside ARP's npm package it reports ARP's version (`v=0.0.6` in the telemetry URL a run without
  `DISABLE_TELEMETRY` built). With telemetry off nothing reads it.
- **Sizes.** Plugin `bin/`: 3,105,000 bytes on `dev` `eda9f36c`, 4,079,030 after. `.mcpb`: 688,320 bytes (built
  from `dev` `72a62f1c`, 2026-11-11), 898,515 after. npm package: 894.3 kB packed after (`npm pack --dry-run`).
- **Coverage of the new code.** `apps/cli/scripts/vendor-licenses.ts` 100% of functions, 93.55% of lines (the
  `import.meta.main` lines); the new functions in `pulse.ts` have no uncovered line under `bun test --coverage`.
  Branch coverage is not measurable with bun here; every new branch has a test. The bundled versions are
  asserted by `apps/cli/test/vendor-licenses.test.ts`, so a moved dependency tree fails the CLI's tests.
- **Tracked.** `packaging/claude/arp/bin/skills-cli.js` and its licence file are committed, because the
  plugin installs from the repository and `packaging/` is generated and committed (`packages --check`).
  `apps/cli/dist` and `apps/cli/dist-mcpb` are not.

## Alternatives considered

- **Call `skills.sh/api/search` from ARP's own code.** One request, no third-party code. Rejected by the
  user: `robots.txt` disallows `/api/`, which `ada72614` honoured by using the official CLI.
- **Drop `arp_pulse` from the Desktop mode.** Safe and immediate; Desktop would search ARP's listing only.
  The user preferred the full search.
- **Keep `npx` and allow it beside the key.** The range-resolved dependencies are what the rule was
  written against.

## Consequences

**Positive:**
- `arp_pulse` searches skills.sh in Claude Desktop and in the sponsored setup: 93 results for "video demo
  website" from the unpacked `.mcpb`, with `npm` and `npx` removed from the container, 2026-11-12.
- No release reaches the npm registry to search, and none needs `npx`.

**Negative:**
- Third-party code still runs beside the agent key, as the same OS user, and can read `~/.arp/agent-key` by its
  absolute path: the private `HOME` only stops a default path from resolving to it. What changed is that it is
  the code fixed at build, not what npm resolves at run time. "Checked" means what is listed above: the lockfile's
  integrity, a network trace of `find` and a count of the hosts it names, not a review of the bundle's 27,000
  lines. A flaw in `skills@1.7.6` or its tree is ours to ship until we rebuild.
- About +970 KB in the plugin and the npm package, +210 KB in the `.mcpb` (compressed). Updating the
  search package is now a release, with this ADR's figures re-taken.

**Neutral (worth knowing):**
- `SKILLS_CLI` still names `skills@1.7.6` for the `npx` path; the bundled version must stay the same, and
  `apps/cli/test/vendor-licenses.test.ts` asserts it.

## References

- Related ADR: `.claude/choices/0110-the-desktop-extension-holds-a-local-agent-key.md`
- Related commit: `ada72614` (the decision this amends)
- Related doc: `docs/22_RUNNING_THE_NODE.md`, `arp_pulse`
- Related rule: `.claude/rules/security.md`
