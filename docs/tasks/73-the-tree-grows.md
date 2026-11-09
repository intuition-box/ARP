# Task 73 — The domain tree grows from the agents

**Status:** **verified 2026-11-09** (`task-verifier` PASS, `.claude/learning/63-the-tree-grows.md`; `ui-reviewer` and `intuition-integrator` PASS), on `feat/73-tree-grows` (worktree `../ARP-tree`), not pushed. Merges after 72 and 74, rebased.
**ADR:** `0146`. Builds on task 59 (ADR `0115`, `0124`), whose last eight commits were archived
unmerged (`archive/feat/59-category-step`) and are replayed on this branch.
**Rules:** `code.md`, `security.md`, `portability.md`, `ui.md` (the web step), `claims.md`, `workflow.md`.

## The user's decisions, 2026-11-09

1. **The tree has to be able to grow by itself**: an agent that needs a domain the tree lacks can add it.
2. **Who adds a category: a registered agent.** The request is signed by the address that holds an
   ERC-8004 agent, as `/line` is (ADR `0144`), under a per-agent daily cap.
3. **Where: in the declaration.** `arp_declare_used` accepts a domain the tree lacks when it comes
   with a parent and a reason. `arp_file_category` (task 59) comes back for filing a skill outside a
   declaration.
4. **The web step files under an existing category only.** A person, often with no wallet, tags the
   tool they listed; creating a category is for agents.

## Deliverables

1. `packages/protocol/src/sponsor/category.ts` — the signed category request: EIP-712 type, sign,
   verify. Added to the signature-site list in `security.md`.
2. `apps/sponsor` `POST /propose-category` — signed: an agent held by the signer may add a category
   (atom, `is a sub-domain of`, tag), counted per agent and in the global cap; the nonce is spent once.
   Unsigned: a tag with an existing category only; a new category is refused with rule `agent`.
3. `apps/mcp` — sponsored mode: `arp_file_category` signs with the local agent key. Unsigned mode:
   `arp_declare_used` with an unknown `domain`, `domain_parent` and `domain_reason` returns the request
   to sign instead of calls; `arp_propose_category` sends the signed request; then the declaration is
   asked again.
4. `apps/web` — the category step offers existing categories only, and is hidden when no sponsor is
   configured (the public site has none — coordination with task 74).
5. `scripts/seed/file-categories.ts` — signs with the agent key, since unsigned creation is gone.

## Do not do in this task

- Mainnet. Everything here is testnet 13579 (ADR `0135`, `0144`).
- The `/line` path (`arp line`, `writeLine` in `desktop/loop.ts`): another session holds those files
  today. A domain created through `/line` waits for its merge. The one touch to `loop.ts` is
  `export` on `ensureAgent` and `registryRef`, which `arp_file_category` needs; the coordinating
  session was told (2026-11-09).
- Changing who the index reads (`ARP_DOMAIN_ATTESTORS`): an agent's own triples still do not count;
  the sponsor files them as ARP's attestor.
