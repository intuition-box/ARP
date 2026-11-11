# Post-mortem index

**Generated** 2026-11-11 by `scripts/build/build-claude-index.ts`. Do not edit by hand — rerun the script.

121 entries, one per completed task. Written by `task-verifier` on a pass.

| # | task | verdict | entry |
| --- | --- | --- | --- |
| [01](01-project-setup.md) | `docs/tasks/01-project-setup.md` | PASS | # 01 — Project setup (post-pivot) |
| [02](02-contract-mvp.md) | `docs/tasks/02-contract-mvp.md` | PASS | # 02 — Module Registry contract |
| [03](03-caveat-enforcers.md) | `docs/tasks/02b-caveat-enforcers.md` | PASS | # 03 — Caveat enforcers (Task 02b) |
| [04](04-deploy-and-seed.md) | `docs/tasks/03-deploy-and-seed.md` | PASS (with notes | Deploy and seed (Task 03) |
| [05](05-smart-account-integration.md) | `docs/tasks/03b-smart-account-integration.md` | PASS | Smart Account + Delegation SDK Integration |
| [06](06-agent-identity-and-compose.md) | `docs/tasks/04b-agent-identity-and-compose.md` | PASS | Agent identity + tool composition UI |
| [07](07-agent-autonomous-positioning.md) | `docs/tasks/04c-agent-autonomous-positioning.md` | PASS | Agent autonomous positioning under bounded delegation |
| [08](08-pin-writes-server-side.md) | `docs/tasks/06-pin-writes-server-side.md` | PASS | Restore the Intuition write path, server-side only |
| [09](09-erc8004-connector.md) | `docs/tasks/07-erc8004-connector.md` | PASS | `@arp-protocol/erc8004`: the source-neutral ERC-8004 read connector |
| [10](10-agent-trust-panel.md) | `docs/tasks/08-agent-trust-panel.md` | PASS (second pass; first pass failed on dead surface) | The agent trust panel, with a live mainnet stake control |
| [11](11-agent-directory-full-cohort.md) | `docs/tasks/10-agent-directory-full-cohort.md` | PASS (second pass; first pass held on an open `ui-reviewer` gate, not on code) | The agent directory lists the whole cohort |
| [12](12-import-existing-erc8004-agent.md) | `docs/tasks/11-import-existing-erc8004-agent.md` | PASS | Import an existing ERC-8004 agent |
| [13](13-agent-panel-tabs.md) | `docs/tasks/12-agent-panel-tabs.md` | PASS (second pass; first pass held on an open `ui-reviewer` gate, not on code) | Tabs on the agent panel, one per provider |
| [14](14-strip-the-panel-copy.md) | `docs/tasks/15-strip-the-panel-copy.md` | PASS | Strip the panel's copy down |
| [15](15-strict-is-off-in-the-app.md) | `docs/tasks/18-strict-is-off-in-the-app.md` | PASS | `strict` is off in the app |
| [16](16-make-the-testnet-rig-faithful.md) | `docs/tasks/24-make-the-testnet-rig-faithful.md` | PASS | Make the testnet rig faithful |
| [17](17-the-agent-sdk.md) | `docs/tasks/16-the-agent-sdk.md` — half 1 only; half 2 split out to `docs/tasks/25` | PASS | The connector an agent declares through (half 1) |
| [18](18-the-tool-surface.md) | `docs/tasks/23-the-tool-surface.md` | PASS | The tool surface |
| [19](19-the-external-verifier.md) | `docs/tasks/17-the-external-verifier.md` | PASS | The external verifier |
| [20](20-arp-serves-the-content-and-signs-the-access.md) | `docs/tasks/31-arp-serves-the-content-and-signs-the-access.md` | PASS | ARP serves the content and signs the access |
| [21](21-two-apps-the-mcp-and-the-node.md) | `docs/tasks/32-two-apps-the-mcp-and-the-node.md` | PASS | Three apps over two packages: mcp, node, hook |
| [22](22-the-landing-is-a-scene-sequence.md) | `docs/tasks/29-the-landing-is-a-scene-sequence.md` | PASS | The landing is a scene sequence, not a long page |
| [23](23-one-installer-33a.md) | `docs/tasks/33-one-installer.md` (sub-task 33a only; 33b–33h not started) | PASS (second pass; the first failed on the three items under Surprises) | Task 33a: the hook sees what each runtime sends |
| [24](24-one-installer-33b.md) | `docs/tasks/33-one-installer.md` (sub-task 33b only; 33c–33h not started) | PASS (second pass; the first failed on five stale sentences, none in the code) | Task 33b: `@arp-protocol/cli`, built for Node |
| [25](25-the-activity-bar.md) | `docs/tasks/36-the-activity-bar.md` | PASS (second run; the first failed on 3 findings plus a missing STATE | The activity bar: what the agent triggered, and what it declared |
| [26](26-one-installer-33c.md) | `docs/tasks/33-one-installer.md` §4 33c | PASS, on the second pass | One installer, 33c: `arp init`, `arp uninstall`, `arp doctor` |
| [27](27-one-installer-33i-capture.md) | `docs/tasks/33-one-installer.md` §4 33i. Capture tooling only. Per-runtime adapters wait on real captures from the user. | PASS, on the second pass | One installer, 33i (first half): `arp hook --capture` and `arp init --capture` |
| [28](28-one-installer-33d-claude-gemini.md) | `docs/tasks/33-one-installer.md` §33d (first part; Codex deferred) | PASS (third pass) | One installer, 33d first part: Claude Code plugin and Gemini extension |
| [29](29-proven-and-declared.md) | `docs/tasks/42-proven-and-declared.md` | PASS (second pass) | Proven and declared: two figures, read from the sender of each deposit |
| [29](29-coherence-audit-28d.md) | `docs/tasks/28-coherence-audit.md` (entry 43) | PASS (second pass; the first draft's check did not print what the entry said) | Coherence audit, entry 43: `/agent` step 5 pointed at a deleted script |
| [30](30-the-activity-bar-verified.md) | `docs/tasks/36-the-activity-bar.md` (the "Review of `f5d1c84` and `79ad7ea`" section) | PASS | The activity bar, review of f5d1c84 and 79ad7ea (36v) |
| [31](31-the-receipt-enforcer.md) | `docs/tasks/43-the-receipt-enforcer.md` | PASS | The receipt enforcer: "no signed receipt, no deposit", held by a contract |
| [32](32-the-install-handshake.md) | `docs/tasks/39-the-install-handshake.md` | PASS (second pass; the first failed on ADR `0095` §7's griefing costs) | The install handshake: a rented tunnel, and the node bound to its ERC-8004 token |
| [32](32-the-sponsoring-service.md) | `docs/tasks/40-the-sponsoring-service.md` (built with `docs/tasks/37` 37b, 37c) | PASS (second pass) | The sponsoring service: a proven deposit, paid by ARP, owned by the agent |
| [33](33-the-account-page.md) | `docs/tasks/35-the-account-page.md` | PASS (second run; the first returned a five-item punch list) | The account page: delegations and settings |
| [34](34-hire-receipt-v2.md) | `docs/tasks/44-hire-receipt-v2.md` | PASS (second pass; the first returned a four-item punch list) | Hire receipt v2: the receipt names the contract that verifies it |
| [35](35-the-activity-bar-chain-facts.md) | `docs/tasks/36-the-activity-bar.md` (section "Amended 2026-11-02 — every agent, from the indexer") | PASS (second pass; first FAIL on 3 items) | The activity bar, amended: every agent, from the indexer (36, 2026-11-02) |
| [36](36-the-redesign-from-references.md) | `docs/tasks/46-the-redesign-from-references.md` (§3 only; 46b–46f proposed, not started) | PASS | The redesign from references, 46a: `/tools` pages its list |
| [37](37-the-redesign-from-references.md) | `docs/tasks/46-the-redesign-from-references.md` (row 46d in §4) | PASS (second pass; first FAIL on an unrecorded user choice) | The redesign from references, 46d: `/register` offers two tiles |
| [38](38-plain-words.md) | `docs/tasks/47-plain-words.md` | PASS (first pass; ui-reviewer FAIL round 1, PASS round 2) | Plain words: the operator does not read the chain's vocabulary (47) |
| [39](39-the-redesign-from-references.md) | `docs/tasks/46-the-redesign-from-references.md` (row 46b in §4) | PASS (first pass; `ui-reviewer` FAIL round 1 on 4 stale comments, PASS round 2) | The redesign from references, 46b: the agent page takes the skill page's layout |
| [40](40-the-redesign-from-references.md) | `docs/tasks/46-the-redesign-from-references.md` (row 46e in §4) | PASS (`ui-reviewer` PASS with 4 advisories, 2 acted on) | The redesign from references, 46e: the id lookup moves into the `/agents` search |
| [41](41-the-redesign-from-references.md) | `docs/tasks/46-the-redesign-from-references.md` (row 46c in §4) | PASS on round 2 (round 1 FAIL: a retraction landed in one place of two) | The redesign from references, 46c: `/activity` splits Yours from Everyone |
| [42](42-the-journeys.md) | `docs/tasks/48-the-journeys.md` | PASS on round 2 | The journeys: what a visitor meets, and the conventions they expect |
| [43](43-lean-search.md) | `docs/tasks/49-lean-search.md` | PASS on round 2 (round 1 FAIL: one live defect, three claim errors, one uncommented cast, vacuous tests) | Lean search: more tools found, fewer tokens spent |
| [44](44-the-installer-meets-real-runtimes.md) | `docs/tasks/38-the-installer-meets-real-runtimes.md` | PASS (second pass; first pass FAIL on the task file and two code nits) | The installer meets real runtimes (part A, Claude Code) |
| [45](45-discovery-without-a-command-45c.md) | `docs/tasks/45-discovery-without-a-command.md` §45c | PASS (second pass; first pass FAIL on three written claims and two uncommented casts) | Discovery without a command (45c, measure before promising) |
| [46](46-quiet-search.md) | `docs/tasks/51-quiet-search.md` | PASS on the second pass | A quieter search: every word must match |
| [47](47-when-memory-falls-short.md) | `docs/tasks/52-when-memory-falls-short.md` | PASS on round 2 | When memory falls short: does ARP find a skill Claude does not know? |
| [48](48-desktop-walks-the-loop.md) | `docs/tasks/50-desktop-walks-the-loop.md` | PASS on round 2 | Claude Desktop walks the loop, and an outside user pays nothing |
| [49](49-claude-code-demo.md) | `docs/tasks/55-claude-code-demo.md` | PASS (second pass; the first failed on four stale sites) | The Claude Code demo: a fetched skill the runtime can invoke, paid by the sponsor |
| [50](50-the-whole-skill.md) | `docs/tasks/57-the-whole-skill.md` | PASS (second pass | The whole skill: its directory, under one receipt, for a runtime that can run it |
| [51](51-what-a-skill-needs.md) | `docs/tasks/56-what-a-skill-needs.md` | PASS (second pass; first pass FAIL on claims) | What a skill needs, shown to the agent before it picks one |
| [52](52-audit-cleanup.md) | `docs/tasks/60-audit-cleanup.md` | PASS | the audit cleanup |
| [53](53-the-prose-pass-against-the-positioning.md) | `docs/tasks/27-strip-the-ai-slop.md` — step 1 re-run, steps 4 and 5; step 6 dropped | PASS on the second run | The prose pass, judged against the positioning |
| [54](54-one-path-per-profile.md) | `docs/tasks/53-one-path-per-profile.md` | PASS on the second pass | One path per profile, from the landing |
| [55](55-one-door.md) | `docs/tasks/62-one-door.md` | PASS (second pass; first FAIL on a misplaced docstring and an ADR sentence the redirect contradicted) | One door: Register folds into Get started |
| [56](56-review-before-install.md) | `docs/tasks/61-review-before-install.md` (A, C, D, E; B deferred by the user) | PASS (second round; round 1 FAIL) | Review before install: a pinned version, a page of facts, and a human who accepts |
| [56](56-the-pulse.md) | `docs/tasks/63-the-pulse.md` | PASS (fourth pass; the fourth checked only the third pass's three edits and the gates they touch) | The pulse: what a skill implies, and what agents wrote about it |
| [57](57-the-delegation-register.md) | `docs/tasks/37-the-delegation-register.md` (sub-task 37c only) | PASS | The delegation register, 37c turned on |
| [57](57-the-signal.md) | `docs/tasks/66-the-signal.md` | PASS (third pass; the second and third checked only the changed sites) | The signal: what a line on chain is worth to the next search |
| [58](58-usage-columns.md) | `docs/tasks/58-usage-columns.md` | PASS (second round; round 1 FAIL | /tools' Usage column filled, and a repository's skills shown on its row |
| [58](58-the-positioning.md) | `docs/tasks/69-the-positioning.md` | part 1, PASS on the fourth pass, which checked only the two edits the third pass asked for | The positioning, parts 1 and 2: what ARP says in public |
| [59](59-the-field-memory.md) | `docs/tasks/68-the-field-memory.md`, phases 1 to 4. Phases 5 and 6 are not started and are out of this close. | PASS on the fourth pass | The field memory: a failure the hook sees, read back at the next search |
| [60](60-the-agent-pulse.md) | `docs/tasks/65-the-agent-pulse.md` | PASS (second pass; the first failed on seven items, all closed), and PASS again on §§8 and 9 and the two merges of `feat/pulse` | The agent pulse: the same walk for agents, with a second party |
| [60](60-tools-page-sponsor-filter.md) | no task file; the spec is `.claude/choices/0143-tools-page-unknown-is-not-dead-and-most-used.md` | PASS, after earlier FAILs | /tools counts only what the sponsor deposited for an agent |
| [61](61-a-false-line.md) | `docs/tasks/71-a-false-line.md`, and `docs/tasks/70-the-local-package.md` items 1 and 3 | PASS (second pass; the first failed on six blocking and five minor items, all closed), and PASS on §5 at its second reading (the first failed on four blocking and two minor items, all closed) | A false line, and a line the plugin can write |
| [61](61-tools-page-signals-and-wallets.md) | no task file; the spec is `.claude/choices/0143-tools-page-unknown-is-not-dead-and-most-used.md` | PASS, after one FAIL of 12 items: stale wording, gate wording, test names, and no RepoPage wallets test | /tools says Signals, not Usage, and shows the wallets behind it |
| [62](62-the-local-package.md) | `docs/tasks/70-the-local-package.md` | PASS, at the second reading | The whole package, working locally |
| [63](63-the-docs.md) | `docs/tasks/72-the-docs.md` | PASS (second round; first round failed on one visible `docs/NN` link text) | The docs on the site |
| [64](64-the-tree-grows.md) | `docs/tasks/73-the-tree-grows.md` | PASS | The domain tree grows from the agents |
| [65](65-the-public-site.md) | `docs/tasks/74-the-public-site.md` | PASS (round 3) | The public site, and everything around it |
| [66](66-a-line-adds-its-domain.md) | `docs/tasks/75-a-line-adds-its-domain.md` | PASS | A line adds the domain it names |
| [67](67-the-ladder.md) | `docs/tasks/76-the-ladder.md` | PASS (round 2; round 1 FAIL on six claims items) | The evidence ladder, ordered by who produced the signal |
| [68](68-the-hire-loop.md) | `docs/tasks/77-the-hire-loop.md` | PASS (round 2; round 1 FAIL on two scope items and four claims items) | The hire loop, as a concept |
| [69](69-the-sponsor-hosted.md) | `docs/tasks/78-the-sponsor-hosted.md` | PASS (round 2) | The sponsor, hosted beside the site |
| [70](70-the-tree-on-oasf.md) | `docs/tasks/79-the-tree-on-oasf.md` | PASS (round 2; round 1 failed on six claims items) | The domain tree on OASF |
| [71](71-the-nav-coin.md) | `docs/tasks/80-the-nav-coin.md` | PASS (round 3; round 1 FAIL on unported tests, a stale README status, a duplicate CSS rule; round 2 FAIL on a numbering clash) | The nav: the coin |
| [72](72-the-landing-galaxy.md) | `docs/tasks/81-the-landing-galaxy.md` | PASS (round 3) | The landing: one camera through the registry |
| [73](73-enough-to-test.md) | `docs/tasks/82-enough-to-test.md` | PASS (round 2; round 1 FAIL on one claim and uncommented casts) | Enough to test |
| [74](74-the-8004-sieve.md) | `docs/tasks/87-the-8004-sieve.md` (written as task 83, renumbered at rebase) | PASS on round 2 | The 8004 sieve: separate the agents that exist from the ones that answer |
| [75](75-words-to-the-tree.md) | `docs/tasks/84-words-to-the-tree.md` | PASS (round 2) | Words to the tree |
| [76](76-no-limits-page.md) | `docs/tasks/85-no-limits-page.md` | PASS | The docs have no Limits page |
| [77](77-share-at-install.md) | `docs/tasks/88-share-at-install.md` (built as task 86, renumbered by the coordinating session) | PASS (round 2) | Installs offer sharing |
| [79](79-x402-failure-feed.md) | `docs/tasks/89-x402-failure-feed.md` | PASS | The x402 failure feed |
| [80](80-x402-end-to-end.md) | `docs/tasks/91-x402-end-to-end.md` | PASS | The x402 failure loop, end to end on Base Sepolia |
| [81](81-a-hosted-read-only-mcp-endpoint.md) | `docs/tasks/92-a-hosted-read-only-mcp-endpoint.md` | PASS (round 2; round 1 failed on one unqualified copy of the words claim) | A hosted read-only MCP endpoint |
| [82](82-x402-feed-exact-endpoint.md) | `docs/tasks/93-x402-feed-exact-endpoint.md` | PASS | The x402 feed names the endpoint exactly as it was paid |
| [83](83-list-tool-only-tools.md) | `docs/tasks/94-list-tool-lists-only-tools.md` | PASS (second pass; the first failed on two items, below) | `/list-tool` lists only what is a tool |
| [84](84-the-agent-page-reads-lines.md) | `docs/tasks/95-the-agent-page-reads-lines.md` | PASS (second run; the first failed on the task file, a missing ui re-review and untested loupe behaviour) | The agent page reads lines |
| [85](85-what-a-skill-contains.md) | `docs/tasks/96-what-a-skill-contains.md` | PASS (second pass; first failed on two ADR claims) | What a skill contains, shown before install and on the site |
| [86](86-a-line-names-what-was-missing.md) | `docs/tasks/97-a-line-names-what-was-missing.md` | PASS (first pass) | A line names what was missing, and what made it work |
| [87](87-a-check-before-a-skill-is-installed.md) | `docs/tasks/98-a-check-before-a-skill-is-installed.md` | PASS | a check before a skill is installed |
| [88](88-the-map-answers-at-failure-time.md) | `docs/tasks/99-the-map-answers-at-failure-time.md` | PASS (round 2; round 1 failed on two claims errors) | The map answers at failure time |
| [89](89-the-model-says-it-worked.md) | `docs/tasks/100-the-model-says-it-worked.md` | PASS (second run; the first failed on two stale inventories and one ADR wording) | The model says whether a skill worked |
| [90](90-outside-signals.md) | `docs/tasks/101-outside-signals.md` | PASS | Outside signals as dated, sourced facts |
| [91](91-be-read-where-agents-are.md) | `docs/tasks/102-be-read-where-agents-are.md` | PASS (first pass) | Be read where agents already are |
| [92](92-the-sweep.md) | `docs/tasks/103-the-sweep.md` | PASS (second pass; the first returned a six-item punch list) | The sweep: close or exclude every open task |
| [93](93-the-site-gaps.md) | `docs/tasks/104-the-site-gaps.md` | PASS (first pass) | The site's open gaps |
| [94](94-cli-0.0.3.md) | `docs/tasks/105-cli-0.0.3.md` | PASS | Prepare `@arp-protocol/cli` 0.0.3 |
| [96](96-small-leftovers.md) | `docs/tasks/107-small-leftovers.md` | PASS (first pass) | Small leftovers: the atom size limit, the plugin's icon, stale defect rows |
| [97](97-live-hook-defects.md) | `docs/tasks/108-live-hook-defects.md` | PASS (second pass; the first failed on one stale site, `docs/22:107`) | Two defects the live test found in the hook |
| [98](98-ask-during-the-task.md) | `docs/tasks/109-ask-during-the-task.md` | PASS | Ask whether a skill worked during the task, not at Stop |
| [99](99-two-defects-from-108.md) | `docs/tasks/110-two-defects-from-108.md` | PASS | Two defects task 108's live run found |
| [101](101-before-you-install.md) | `docs/tasks/112-before-you-install.md` | PASS | Before you install: the contents panel answers the questions a person asks |
| [102](102-fewer-requests-per-search.md) | `docs/tasks/113-fewer-requests-per-search.md` | PASS (second pass; the first failed on four claims, no code) | One search makes far too many requests |
| [103](103-every-install-route.md) | `docs/tasks/114-every-install-route.md` | PASS | Every way to install ARP, listed in one place |
| [104](104-the-hol-adapter.md) | `docs/tasks/115-the-hol-adapter.md` (A and B only; C, D, E wait for the user's return) | PASS (second pass; first failed on two one-line items) | The HOL adapter, deliverables A and B |
| [105](105-the-deploy.md) | `docs/tasks/117-the-deploy.md` | PASS (second round) | The deploy: site, sponsor, MCP endpoint and demo seller on Coolify |
| [106](106-x402-test-feed.md) | `docs/tasks/118-x402-test-feed.md` | PASS | A separate x402 test feed for Base Sepolia |
| [107](107-an-endpoint-url-without-its-values.md) | `docs/tasks/119-an-endpoint-url-without-its-values.md` | PASS | An x402 endpoint's URL is written without its values |
| [108](108-an-endpoints-last-purchase.md) | `docs/tasks/120-an-endpoints-last-purchase.md` | PASS (fourth pass | An endpoint's last purchase, checked by nohumans.directory, beside ARP's lines |
| [109](109-the-payer-signed-the-line.md) | `docs/tasks/121-the-payer-signed-the-line.md` | PASS (second round) | A reader can check that an x402 line was signed by the wallet that paid |
| [110](110-an-x402-payment-went-to-the-endpoint.md) | `docs/tasks/122-an-x402-payment-went-to-the-endpoint.md` | PASS (second round) | An x402 line's payment went to the endpoint, for its price |
| [111](111-a-tool-url-without-its-values.md) | `docs/tasks/123-a-tool-url-without-its-values.md` | PASS | A tool URL is never listed with a value in it |
| [112](112-the-dev-server-reads-the-source.md) | `docs/tasks/124-the-dev-server-reads-the-source.md` | PASS | What runs from the checkout reads `packages/protocol/src`, not a stale `dist/` |
| [113](113-a-402-is-not-a-refusal.md) | `docs/tasks/125-a-402-is-not-a-refusal.md` | PASS (second pass; the first failed on two doc sites) | The hook tells x402's first 402 from a refusal, and a refusal from paid with nothing back |
| [114](114-ask-once-to-share.md) | `docs/tasks/126-ask-once-to-share.md` | PASS (second pass; the first failed because "always" published every result already kept) | Ask once whether to share, with "always" |
| [116](116-the-agent-page-is-for-reading.md) | `docs/tasks/128-the-agent-page-is-for-reading.md` | PASS (round 2) | The agent page is for reading |
| [117](117-the-import-after-a-mint.md) | `docs/tasks/129-the-import-after-a-mint.md` | PASS (round 2; round 1 failed on missing tests and an uncited third-party claim) | The import after a mint |
| [118](118-load-on-the-hosted-surfaces.md) | `docs/tasks/130-load-on-the-hosted-surfaces.md` | PASS (second pass; the first failed on one claim and flagged one gate defect) | The hosted surfaces under a crowd |
