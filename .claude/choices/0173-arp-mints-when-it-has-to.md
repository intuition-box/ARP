# 0173 — ARP mints into the ERC-8004 registry when it has to

**Status:** Accepted
**Date:** 2026-11-10 (the user's decision of 2026-11-03, recorded)
**Triggered by:** `.claude/STATE.md` « To pick up next », item 2, and `docs/tasks/28` item 2, closed by
`docs/tasks/103-the-sweep.md`.

## Context

ADR `0033` (2026-10-17) set the hackathon surface aside and said ARP "does not need [an identity] for
itself to bootstrap, and does not mint one for anybody else". `STATE.md` repeated it as "ARP mints
nothing on anyone's behalf".

That was no longer what the product did. ADR `0110` (2026-11-02) has the sponsoring service pay a new
agent's mint gas on testnet 13579, and ADR `0027` already said where a mint goes: the canonical
registry `0x8004A169…A432`, with ARP's own deployment on 13579 as a demo fixture. On 2026-11-03 the
user decided: **ARP mints in the ERC-8004 registry when it has to**, not urgent, recorded when task 28
was picked up.

## Decision

ARP mints an ERC-8004 identity for an agent when the agent has none and a step needs one. It mints
into the canonical registry (ADR `0027`), or into the testnet fixture on 13579, and never into an
identity namespace of its own (`docs/12`, "Not a registry"). An agent that already has an identity
imports it.

This amends the clause of ADR `0033` quoted above. The rest of ADR `0033` stands.

## Alternatives considered

- **Keep "ARP mints nothing".** Rejected by the user: an agent with no identity could then write no
  line, and ADR `0110` already pays for that mint on testnet.

## Consequences

**Positive:**
- The record says what the sponsoring service already does.

**Negative:**
- None new. Who pays a mint on mainnet stays open (`FUTURE.md`, "Who pays on mainnet").

**Neutral (worth knowing):**
- `docs/tasks/28` item 7 (step 5's env blob) depended on this decision. That page was rebuilt since,
  and the item is closed with the rest of task 28.

## References

- Related doc: `docs/12_THE_IDEA.md` point 1, "What closes it"
- Related ADR: `0027`, `0033`, `0110`, `0172`
