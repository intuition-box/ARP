# Future

Asked for, deliberately not built yet. `rules/workflow.md`: an idea that would expand the current
task's scope goes here rather than into the task.

Nothing in this file is a commitment. It is a record of what the user asked for and when, so the ask
does not get lost and does not get smuggled into an unrelated change.

---

## A profile page

**Asked 2026-10-21.** _« une page profile avec dedans le récap de mes stake via ARP, ainsi qu'une
partie avec les tools et agent que j'ai register ou autre, la possibilité d'avoir le nœud et les
différentes config de compte possible »_ — behind a connected wallet.

Four things on one screen:

1. the stakes this account holds through ARP, both sides of each claim;
2. the tools and agents this account registered;
3. the node — how to get it and how to run it;
4. account configuration.

**What it needs first.** (1) is a read nothing in the app does today: positions are per vault and
`getShares(account, termId, curveId)` answers one at a time, so a per-account view needs either an
indexer query over the account's positions or a list of the terms to ask about. (2) has no source at
all — ARP stores nothing (ADR `0051`), so "what I registered" has to be derived from on-chain history
or from the account's own positions, and those are different sets. Decide which before building.

Explicitly ordered after the agent surface: _« mais en plus de ça je veux d'abord qu'on finisse toute
la partie agent »_.

## Register ARP's own skill and MCP as tools

**Asked 2026-10-21.** Register `skills/arp/SKILL.md` and the ARP MCP server as the first two tools,
once the register screen exists.

**The decision that has to come first, because it is permanent.** Under ADR `0054` the atom id is a
pure function of the normalised URL, so the URL chosen _is_ the identity, forever. The user's own
measured example: `sofia.intuition.box` carries 30 atoms across 28 distinct URLs under 21 names.

Settled in conversation:

- **the repo root, not a subpath.** A `/tree/main/...` URL depends on the branch name and on the path
  never moving, and this repo has already been reorganised twice (ADR `0041`).
- **two atoms, not one.** The skill and the MCP are different things; one URL for both merges them.
- **a GitHub organisation**, `arp-protocol`, matching the package scope already in use. A transfer
  installs a redirect so the pointer keeps resolving, but the atom's name is frozen at whatever it
  was created with, and the redirect dies if anyone later recreates the old name.
- **separate repos for the URL, not a separate source of truth.** The skill cites figures produced by
  this repo's scripts, and ADR `0052` makes the procedure the product — publish to the separate repos
  by a sync script rather than moving the source.
- **testnet does not count.** `rules/portability.md`: the testnet is a rehearsal, its atoms are
  disposable. The decision binds at the first mainnet `createAtoms`.

Still open: the MCP is a **stdio** server, so its URL can only ever be a source location, never an
address a reader can call. If it should one day be callable, the atom has to carry a domain the user
controls rather than a GitHub URL — and that choice is permanent too.

## A "How it works" tab

**Noted in the nav since 2026-10-20**, `apps/web/src/components/Layout.tsx`. Its own comment says why it
is not built: _"its content is a decision, not a layout."_

## One screen for register and declare

**Asked 2026-10-21.** Paste a URL; the screen says whether an atom exists for it; then offer to
create it or to take a position on it.

Half of it is now possible and half is not. `normaliseToolUrl` + `toolAtomUri` give the id with no
credential and no network, and `intuitionToolAtomLookup` answers "does it exist" — so the read half
is a function call. The write half needs the subject: a `uses` edge carries the **agent's** identity
atom (ADR `0032`), and a human pasting a URL is not an agent. Decide whose claim the screen writes
before building it.

`/modules/new` is the current register page and still writes to `ModuleRegistry`, which ADR `0051`
classes as legacy.

## A gate for the Tailwind utility that does not exist

**Found 2026-10-28, while closing `docs/tasks/29`.** Not asked for — it goes here because it is a scope
expansion on a task about motion, and `rules/workflow.md` says that is this file's job.

`rules/ui.md` §Gates names two failure classes no static check sees, and the first one is **a
Tailwind utility that does not exist**: v4 emits nothing, silently, so a typo and a real utility
both pass `tsc`, `eslint` and `check:tokens`. `check:tokens` is explicit that it does not cover it
— _"It reads `var()` references, not class names."_

**It is checkable, and the measurement is committed**: `scripts/measure/emitted-utilities.ts`.
Tailwind writes one rule per utility it recognises, so a utility that emitted nothing is simply
absent from the built stylesheet; strip the CSS escaping and a selector reads exactly like the class
it came from. Measured 2026-10-28, after `cd apps/web && bun run build`: **351 utility tokens across
`apps/web/src`, every one with a rule.** Pass paths to narrow the population.

**Three things to decide before making it a gate**, all of them in the script's own docstring:

1. It needs `bun run build` first, so it is slow — it belongs next to the build, not in the
   four-gate list.
2. **It over-reports.** Tailwind scans source files as text, so a class-shaped string in a
   _comment_ emits a real rule. This repo shipped a dead `.z-15{z-index:15}` generated from the
   word `z-15` inside a docstring, which is `ui.md`'s "a string in a class name is a string to
   every other tool here" arriving from the other direction.
3. A naive extractor cries wolf: a first attempt reported 268 "missing" tokens, almost all of them
   utilities the app had shipped for weeks, because the regex stopped at the `:` inside
   `text-[color:var(--color-steel)]`. **A gate that cries wolf teaches people to silence it**,
   which is what `check-contrast.ts` is careful about in its own docstring.

**A claim made here that was false**, recorded because the correction is the useful part. `docs/tasks/29`
reported that `z-15` is "not on Tailwind's z-index scale of 0/10/20/30/40/50" and that `z-[15]` is
"the spelling that works". **Both halves are wrong.** Under this repo's Tailwind v4 the `z-<number>`
namespace is open: `.z-15{z-index:15}` was in the shipped stylesheet when the reviewer checked, and
`z-37` emits too. `z-[15]` is harmless and was never required; it is still what the code uses,
because changing it back now would be churn. The claim came from the default-scale documentation
plus a shell check whose quoting was broken — it printed "NOT EMITTED" for sixteen utilities that
all exist — and a reviewer disproved it with one command. `rules/claims.md`: **a correction is not
exempt from the rule it corrects**, and the earlier count was the same failure in miniature — the
same hand-check gave 119, then 140, then 165 from three different extractors over three different
file lists. One script now defines the population.

The second failure class — a utility **defeated by an unlayered rule** in `index.css` — stays
uncovered, and a comment at the call site is still the only defence.

## A script for the claim that exists at N sites and gets fixed at N−1

**Found 2026-10-28, across four verification rounds on `docs/tasks/29`.** Not asked for, and it is a
change to how this repo checks itself, so it belongs here and needs its own task and ADR rather
than being absorbed into a UI task.

Four rounds of verification on one task. The work passed every round; the **sentences about it**
failed every round. The items differed each time and the mechanism never did: **a figure or an
enumeration exists at N sites and gets corrected at N−1.** `rules/claims.md` §5 is entirely about
this and was being read each round, which is the point — attention is not the fix.

Worst instance, because it is a new failure mode: a correction _destroyed_ a site the stale
sentence already had. "five task files and two PR drafts" was replaced by a measured table that
listed one PR draft. **Grep before overwriting, not after.**

Three of the seven defects in the fourth round were mechanically detectable with no judgement at
all:

1. **A markdown table whose row count disagrees with the count asserted in the nearest sentence.**
   Twice in one round — "11 line sites across 9 files" over a 12-row table, and "those four lines"
   over five.
2. **A figure in a file's header and again in its body with different scope.** The 8px overflow was
   narrowed in the body and left unqualified in the header, 150 lines above it and the first thing a
   reader hits.
3. **"recorded N times" where a grep returns N+1.** `solhint` was "recorded three times"; it is
   four.

`scripts/measure/claim-sites.ts` — given a number, a phrase or a file list, print every site and
flag any enumeration whose length disagrees with the count asserted beside it — would have caught
four of the seven in one run.

**`rules/claims.md` says "commit the script, not the number", and the rule has never been applied
to itself.** That is the whole of the idea.

Two things to decide first. What counts as "the nearest asserted count" is a heuristic, and a
heuristic that cries wolf gets silenced — the same trap `check-contrast.ts` was careful about and
`scripts/measure/emitted-utilities.ts` documents. And the grep has to be over the **concept**, not
the sentence: the browser-premise sweep needed five different phrasings and 123 hits read by hand
before the count was right, which no single pattern would have found.

## An agent that arrives with no wallet

Asked 2026-10-28. **Decided 2026-10-30 — ADR `0085`.** Still not built; what changed is that the
shape is settled and the blocker is now a smaller question than it was.

The loop assumes the agent's operator already has a funded key on 13579 and an ERC-8004
registration. **This entry used to say that opening it to an agent with neither "means a hosted
signer (Privy or equivalent) and probably a relayer".** The user rejected that premise in those
terms — _« pourquoi un agent arrivera sans wallet ? s'il n'en a pas peut-être faut-il lui en créer
un ? »_ — and chose the variant where **the agent generates its own key locally and ARP never holds
it**, with a funder covering the gas _« pour le moment »_. The local-key pattern already runs: the
node generates `~/.arp/receipt-key` at mode 0600 on first use (ADR `0080`; in the working
directory's `.arp/` until ADR `0116`).

**What is still owed before this is buildable is the funder's bound**, not the key design. Nothing
says how much, how often or to whom, and an unbounded funder reachable by a stranger is a faucet —
drawn, most likely, from the single attestor key the entry below already calls load-bearing. The
funder is testnet 13579 only; on mainnet the same mechanism is ARP's own funds signed automatically,
which `.claude/rules/security.md` forbids in its one canonical sentence.

It stays deferred for the reason it always had: the loop has to run end to end with a key the
operator holds before it is worth asking whether someone else can hold it. It now runs — one walk on
13579, 2026-10-29 — so the reason is weaker than it was, and the funder's bound is what replaces it.

## The attestor is one wallet, and one key

Asked 2026-10-28, the user's own framing: _« pour la suite on fera un safe multi sig ou autre
solution avec plusieurs wallet je ne sais pas mais on trouvera au moment venu, je veux d'abord
prouver mon idée »_.

ARP's domain index is the set of hierarchy and `has tag` triples that **one address** holds a
position on — `0x906f3A52…` on 13579, compiled into the MCP node as its default. Which makes that
key load-bearing infrastructure: **lose it and the index freezes in place.** No triple can be added
to it and none removed, for ever, because both operations are a position change signed by that
address. What is in stays in and what is out never gets in.

Acceptable on testnet, where the index is a rehearsal and the whole thing can be re-seeded under a
new address for about 0.23 tTRUST. Not acceptable the day the index means anything, and the fix is
not a code change — it is deciding what the attestor _is_: a Safe multisig, a threshold of named
curators, or something else.

Deliberately not built, and deliberately not next. The reason is the user's: the mechanism has to
be proven before the governance of it is worth designing. Note what it is **not** blocked on,
though — nothing in `packages/protocol/src/domains.ts` cares whether the attestor is an EOA or a
contract, because it only ever reads positions by address. So this is a key-management decision
with no refactor behind it.

## Record the 61 missing atom ids in the catalogue

Noted 2026-10-29, from `intuition-integrator`'s review of `docs/tasks/31`. **Not built, and the reviewer's
own argument is why it should not be built there:** task 31 writes nothing to a chain, and "while
we're at it, the catalogue could also record the other 61" is `workflow.md`'s first drift signal
verbatim.

`data/catalogue/skills-13579.json` carries a recorded atom id for 601 of its 662 rows. The other 61 have
`atom: null` and `untagged: true` — **the same 61 rows**, verified, so it is one gap seen from two
sides.

**Their atoms already exist on chain.** All 61, `isTermCreated` true, measured by
`scripts/measure/catalogue-atom-ids.ts` and recorded in
`data/measurements/catalogue-atom-ids-2026-10-29.json`, which prints the repo, the skill, the URL and the
derived id for each under `unrecordedOnChain`. So this is a **catalogue re-record, not an atom
creation**, and it costs nothing on chain.

What it would buy: those 61 skills become resolvable by atom id, so the content route can serve them
and `resolveInvocations` can name them. Today they are reported `unrecorded` — carrying the repo and
the URL, so a caller who can derive the id has everything it needs. The state is correctly named
rather than broken, which is why this is a convenience and not a defect.

**The question that blocks it is classification, not recording.** `counts.notTaggedButClassifiable`
is 0: the tagger **declined** these 61 rather than missing them. `docs/20` says a wrong tag is
permanent, and 203 `has tag` positions were already retired once because a keyword table matched
`blockchain` against design tokens. So whoever picks this up answers `docs/20`'s question first —
whether a skill with no keyword match gets a tag at all — and the recording run follows from that
answer rather than preceding it.

## Decide what a refused redirect means to the probe

**Done in task 60** (2026-11-03): the probe follows redirects by hand through `guardedFetchText`,
and a refused hop is `inconclusive` with code `refused` (`refusedOutcome`,
`packages/protocol/src/verify/probe.ts`). `docs/22` says so. Kept below as the record of the
question.

Noted 2026-10-29, from `task-verifier`'s fourth round on `docs/tasks/31`. **A known open hole, disclosed
in `docs/22` rather than fixed**, which is the one thing in that document that is a hole and not a
stated limit.

`fetch` follows redirects by itself, so a guard on the first hop is not a guard. Measured with a
local stand-in: a caller-controlled **public** host answering
`302 Location: http://169.254.169.254/latest/meta-data/` returned the private body, and nothing in
the first-hop check could have stopped it. No DNS control needed, so the "resolves to a private
address" caveat does not cover it.

`arp_agent_endpoints` **is fixed** — it follows redirects by hand, every hop through
`nextDocumentHop`, at most `MAX_DOCUMENT_HOPS`. That route had no design question attached: it
fetches a document, and a document that redirects to a private address is not one anybody published.

`arp_probe_endpoint` is **not**, and the reason is the decision this task would need. Its verdict
vocabulary is deliberate — `live`, `dead`, `serves-declared-protocol`, `inconclusive` — and
documented on the principle that _a timeout is an answer about the agent, a TLS or DNS failure is
not, because it could equally be us_. A refused redirect has to land somewhere in that vocabulary,
and the choice is not obvious: an endpoint that redirects to loopback is arguably misconfigured
(`dead`), arguably hostile, and arguably something we should decline to judge (`inconclusive`). The
wrong answer publishes a verdict about a stranger on the strength of our own refusal, which is the
failure `signature.ts` already guards against by never returning `mismatch` for a provider it has
not studied.

What the task is: pick the verdict, write the ADR, apply the same manual-redirect loop, and say in
`docs/22` that the hole is closed. The exposure meanwhile is bounded by the node binding loopback —
unlike the registration route, whose caller is a local process by design, which is exactly why that
one was fixed first.

## Smart contracts as modules — the web3 branch

**Asked 2026-11-02**, after reading pgmi's "Live Contract Risk Scoring with Intuition"
(https://atlas.discourse.group/t/live-contract-risk-scoring-with-intuition/989, an idea post from
2025-10-20, nothing built). _« ça pourrait être une branche d'ARP pour le web3 »_. The user's own
ordering: _« pour le moment je suis full orienté web2 »_. So this comes after the web2 surface.

**What the branch is.** The same mechanism as `docs/12`, with a different kind of module. A deployed
contract is registered in `ModuleRegistry` as a tool. An agent deposits TRUST on the contracts it
actually called. A contract's reputation is then how many distinct agents use it and put money on
it. That measures adoption, not safety.

**Why it is worth more than one more module type.** In web2, proving that a use happened is the hard
problem (`docs/14`). Here the proof is already on the chain: a transaction from the agent's account
to the contract can be checked with no oracle, which fits ADR `0094`'s proof-gated sponsored deposit
directly.

**What it is not, and the line this entry exists to hold.** The article's own mechanism is not it.
There, experts stake on risk claims ("this contract has a reentrancy") and are rewarded when they
turn out right. That needs a resolver, which is ground truth (ADR `0049`), and a published "94% Safe"
is a score (ADR `0046`). Both are drift signals in `docs/12`. A risk-scoring product could read ARP's
usage signal as an input. ARP does not become one.

**Open before building.** Which chain's transactions count as proof: the agents' chain and the
staking chain are not the same on mainnet (`rules/portability.md`, point 2). And whether one
contract is one module or one per deployment/version, since an upgrade behind a proxy keeps the
address but changes the code.

## Search by meaning, through skills.sh, with a copy kept for when it is down

**Asked 2026-11-02.** On the fallback: _« on peut faire des sauvegardes en cache ou bdd si le service
skills.sh est down ? »_. On the timing: _« pour un POC je trouve ça vraiment trop, écris-le dans
FUTURE »_.

**Why.** Task 45c (`data/measurements/discovery-eval-2026-11-02.jsonl`) measured the cost of
consulting ARP. Claude consulted it on the right prompts, but a run cost 3.14 times the tokens of
answering from memory, and the answer was judged worse 37 times out of 42. The main cause is that
the registry often has nothing that fits. ARP matches words: "card payments" finds nothing in the
catalogue. skills.sh's search runs by meaning: its own answer to `GET
https://skills.sh/api/search?q=card%20payments` says `"searchType":"semantic"`, and it returned
`payment-pci-security` and `integrate-midtrans-payments`. Its rows are tiny: an id, a name and
installs.

**Chosen 2026-11-02, for later.** The user first said _« on va fork tout skills.sh »_, then picked
this shape over the two alternatives. The first was a full copy of skills.sh's index, which depends
on its terms. The second was ARP's own crawl of GitHub, which has no install counts. The timing stays
"later". The argument behind it was sent to the business-plan session the same day: skills.sh
counts installs, and ARP adds evidence of use.

**What it would be.** `arp_find_tools` asks skills.sh's search for skills and keeps answering from
ARP's own catalogue and from the chain for everything else. Every answer skills.sh gives is kept in
a dated cache or database, so that a search still answers when skills.sh is down. The answer then
says the result is from the copy and gives its date.

**Write on first use, not up front** (the user, 2026-11-02, thinking about mainnet, where ARP has no
skill on chain). A skill's atom id is a pure function of its URL (ADR `0054`), so a skills.sh result
can carry its ARP id before anything is written. The first agent that declares using it causes the
write: the skill's atom, the `uses` triple, and the deposit. Only skills somebody used get paid for,
and each arrives with its first evidence of use.

Writing everything up front would cost at least 2,000 TRUST in mainnet fees, which do not come
back. That figure is the per-atom cost multiplied by a floor on the skill count:
- **The per-atom cost** is `getAtomCost()` on 1155: 0.100000000001 TRUST, read 2026-10-19
  (`rules/portability.md`). Re-read it before deciding.
- **The skill count is at least 20,000.** The skills.sh sitemap's two skill files each hold exactly
  10,000 entries, the size limit of a sitemap file, read 2026-11-02 (`curl -sL
  https://www.skills.sh/sitemap-skills-1.xml | grep -o '<loc>' | wc -l`, and the same for
  `-2`). `data/measurements/skills-installs-2026-10-29.json` reads 20,000 for the same reason. The
  search API gives no total, so the true count is unknown.

Three pieces are missing:
1. **The sponsor does not create a skill's atom.** `/deposit` creates a missing `uses` triple but
   answers 400 when the object atom does not exist.
2. **The content server resolves an atom only through ARP's catalogue** (`contentIndexFor`). For a
   skill found on skills.sh, it would have to take the URL.
3. The search with a cache, above.

On mainnet, who pays for the creation needs an ADR, together with the credits decision
(`docs/tasks/50` §3b).

**What it needs first.** It reverses one alternative ADR `0108` rejected: "a search that lived only
on a server", which ADR `0092`'s amendment forbids as a capability. The cache is what keeps it a
convenience rather than a capability, so it is part of the design, not an option. Decide in a new
ADR where the copy lives (`apps/api`, ADR `0084`, already caches skills.sh's figures) and how old it
may be. Re-run `scripts/measure/discovery-eval.ts` before and after.

The alternative left aside: a small local embedding model in the server (tens of MB in the
extension, an estimate, not measured). There is no third party, but it adds weight, and it does not add skills.sh's coverage.

## One install for Claude Desktop and Claude Code, with one agent

**Asked 2026-11-02**, as important: _« ça c'est important aussi »_, about the list of later items.

Today they are two packages: the `.mcpb` extension for Desktop Chat and the Claude Code plugin
installed by `arp init`. Each creates its own key, so the same person shows up as two agents. On the
user's machine, Desktop is agent #10, under `C:\Users\Max\.arp\`, and Claude Code would hold its own
key in WSL's `~/.arp/`. Claude Code does not load `.mcpb` extensions. Whether `claude mcp
add-from-claude-desktop` picks up an extension has not been checked.

**What it would be.** One installer that sets up both and shares one key. It needs a decision on
where that key lives when Desktop runs on Windows and Claude Code in WSL, because they do not share
a home directory.

## A demo where one agent pays another: evidence of an action

**Asked 2026-11-02**, as important (same message). `docs/26_DEMO_PLAN.md` §5.

The receipt proves a skill was served, and the hook proves it was invoked. Neither proves an
action. A payment the chain records does: one agent hires another and pays its node, and the paid
agent signs a hire receipt that `apps/sponsor` and `ReceiptEnforcer` verify (tasks 43 and 44,
ADRs `0083`, `0098`, `0101`). That path is built, but it is not wired into either demo. Check what
the node needs running end to end on testnet before planning it.

## Who may speak for an agent's identity

**Asked 2026-11-02**, deferred to the mainnet port: « intéressant mais inutile en démo ». A `same as`
cannot be deleted, so a stranger's mistaken or malicious edge must not block an agent for good. The
design is in ADR `0113`:
1. only `same as` edges written by the agent's owner or a trusted writer count;
2. an edge the market opposes is ignored;
3. the sponsor refuses only when two counted edges name two agents.

## Who pays on mainnet: a delegation, or the agent's own wallet

**Asked 2026-11-02**, left open: « on vera ». `/account` signs and revokes delegations, but no
runtime redeems one. `grep -rli delegation apps/mcp/src apps/node/src` finds only two comments, and
`packages/protocol/src/declare/delegated.ts` has no caller in either app. In sponsored mode
(ADR `0110`) the agent pays from its own wallet, so the operator's delegation is never used.

Sponsoring is testnet 13579 only (`rules/security.md`), so on mainnet the operator pays, in one of
two ways:
1. **The operator funds the agent's wallet.** It needs no page, and the loss is bounded by the
   balance.
2. **A delegation.** The funds stay on the operator's account, with a cap per period, allowed
   targets and methods, and a one-click revoke. `docs/12` point 5 names this as the guard rail.

Decide before the mainnet port. If (1), `/account` has no purpose and goes. If (2), the MCP server
has to redeem through `delegated.ts`.

## `/list-tool` records what it lists

A skill listed through the sponsoring service reaches the chain but not `data/catalogue/`, so the
content server answers `unknown-atom` and a search says `file_not_read` until someone re-runs the
measurements (ADR `0132`). Asked for implicitly by the usage demo, 2026-11-03; not built.

## `/list-tool` refuses what is not a tool, and a skill is read before it is installed

Asked for by the user, 2026-11-10: « empêcher de mettre n'importe quelle URL ». Before task 94 (ADR
`0123` step 6) a GitHub skill had to have a `SKILL.md` in a directory of its name, a GitHub repository
had to exist, and **any other URL was accepted unchecked**. Nobody reads a skill's content.

**Point 1 is built** (task 94, ADR `0163`, `apps/sponsor/README.md` "What `/list-tool` lists"). The
check runs inside the sponsor, not in `apps/probe`: each request connects only to the addresses it
resolved and checked, which closes the reason it was refused before. **Point 2 is built** (task 96,
ADR `0165`): it shows, it does not block.

Two separate things, and only the second protects anyone:

1. **A gate on what ARP pays to list.** _Built, task 94._ A GitHub repository is listed only if it holds something a
   runtime loads: a `SKILL.md`, a Claude plugin or Gemini extension, an MCP registry `server.json`,
   or a root manifest depending on an MCP SDK (the list is ADR `0163` §1). A non-GitHub URL is
   listed only if it answers as a tool (an MCP `initialize`, an A2A card, an x402 `402`), asked by
   the sponsor itself through a connection pinned to the public address it checked (ADR `0163` §3).
   This bounds ARP's spend and its index. It does not stop anyone else writing an atom on Intuition.
2. **A read before install.** _Built, task 96: `arp_pulse` and `arp_get_skill` return `contains`, the
   Desktop install dialog carries it, the skill page shows it._ Since anyone can write to the graph, the defence is where an agent is
   about to install: a local read of the skill that shows facts, never a verdict — the scripts it
   runs, a `curl | sh`, the domains it contacts, hidden or encoded text. Runs on the user's machine,
   so no text leaves it (ADR `0155`). Fits `docs/30`'s « check before your agent installs ».

Left from task 94: the web app's `listToolMessage` has no sentence for `not-a-tool`, `unreachable`
or `private-address` (it says "It could not be added."), and the task 91 seller passing the check is
untested until that demo runs again.

Not decided: whether the read before install blocks or only shows. The accepted manifests are
decided (ADR `0163`); a Python project declaring its MCP SDK only outside `[project] dependencies`
or Poetry's table, a `.mcp.json` alone and a Desktop extension's `manifest.json` are not among them.

## The delegation register, read side

**Left 2026-11-03**, when task 37 closed at 37b and 37c (`docs/tasks/37`). Publishing works on
testnet 13579: one delegation was published by the sponsor, triple `0xbfd4b091…`. Nothing reads it
back yet:
1. **37a**: find a delegation by its agent's address, in `packages/protocol`;
2. **37d**: `/account` lists the published delegations from the graph;
3. **37e**: the agent finds its own delegation;
4. the rest of the walk in `docs/tasks/37` §3: find it from a second browser and from `arp`,
   revoke it, see it marked disabled.

It depends on "Who pays on mainnet" above: if the operator funds the agent's wallet, nothing redeems
a delegation and this read has no user.

## A market on whether it worked

**Asked 2026-11-05.** _« worked c'est pas mal car propose aussi de se positionner sur oppose et donc
avoir un marché de worked ou pas et enfin une utilité pour les contre curve »_, then _« pour la
question du marché on verra plus tard, honnêtement c'est pas le focus, même si on peut l'écrire dans
futur »_ (spelling corrected).

`uses` is a fact, so its opposing side has little to say. `worked` is a judgement, so it can be
disputed. Neither `pulse-usage.ts` nor `pulse-score.ts` reads an opposing side today.

**The shape proposed, not decided.** One line is a poor market: only the two parties know what
happened, and a hire receipt holds hashes, so a third party has nothing to judge by. So two levels:

| Level | Triple | What it is |
| --- | --- | --- |
| The testimony | `((hirer uses agent, in context of, domain), has outcome, worked)` | One attributed use, backed by its receipt |
| The market | `(agent, works in, domain)` and its opposing side | A shared opinion, where the deposits gather |

`works in` is an example and does not exist. The first row is form B (`docs/28`, ADR `0138`, the one
on `feat/pulse`).

ADR `0138` also says the amount deposited never reaches the score, so a market would sit beside the
score, unless the user changes that.

**What stands against it.** Nothing ever settles the market, and `docs/12` forbids ARP from measuring
whether an agent was right, so a curve rewards being early and followed rather than being right. An
active opposing side is not a given: 1 of 185 `uses` declarations on mainnet 1155 had one on
2026-10-21. And it depends on the next entry.

## Sybil on receipts and on the score

**Asked 2026-11-05.** _« à faire une fois qu'on a réglé les autres choses »_. Deferred before that by
ADR `0138`.

A receipt that holds shows that two keys dealt with each other, not that they are two people. Task 65
passed every check with one operator on both sides. The score counts distinct wallets
(`pulse-score.ts`), so several wallets buy several votes.

Ordered after the effect on the search and the depth of the tree are established.

## x402: check before paying, and say what happened after

**Asked 2026-11-09**, as of strong interest: _« il nous faut des notes pour le futur pour x402 car
ça m'intéresse aussi énormément »_. It followed a reply from Fizzl's founder (x402 Doctor) to an
outreach email of 2026-11-05, which said the problem is larger on the "after paying" side than
the "before paying" side. The email is private and is not quoted here. Everything below comes
from Fizzl's public pages, read 2026-11-09, and none of it was run.

**What Fizzl publishes.**

| What | Where | Terms |
| --- | --- | --- |
| Preflight before paying: `go`, `caution` or `no_go`. It checks the price against the listing, whether the payout address can receive, the OFAC list, testnet-only offers and the 30-day record | `GET https://x402-doctor.fizzl.eu/api/v1/preflight?url=…&max_usd=…`, 0.001 USD over x402, in the OpenAPI at `/openapi.json` (v2.5.0) | Paid per call, no account |
| Signed receipt on every paid answer, EIP-191, tied to the on-chain payment through `payment.payer` and `nonce` | signer at `/.well-known/x402-doctor-signer.json`, free check at `POST /api/v1/verify` | |
| Trust Index: about 40,800 paid services checked daily against the CDP Bazaar, Circle's marketplace and five other lists | `GET /api/trust?url=…`, `POST /api/trust/batch`, daily dump on the `trust-data` branch of `github.com/Fizzl13/x402-doctor` and on Hugging Face `x402Fizzl/x402-trust-index` | Free, no key, rate-limited, CC BY 4.0 on the trust page; the terms say "free to use, as they are" (`fizzl.eu/terms`, 2026-10-23) |
| A refusal: the buyer that did not pay tells the seller why, using one of 12 fixed reasons, with no payer identity | Draft extension, `x402-foundation/x402#4087`; posted to the seller's `/.well-known/x402-refusal` | Draft 0.1, "no x402 buyer reports refusals to sellers yet" |
| 20 fraud classes, with what a check before paying catches: 8 caught, 10 partly, 2 not, by their count | `fizzl.eu/guides/agent-payment-fraud-classes/` | |
| Remote MCP server and a Claude Code plugin | `https://x402-doctor.fizzl.eu/mcp`; `/plugin marketplace add Fizzl13/x402-doctor` | |

**What was not found:** a public API for a buyer to report a failure after paying. The guide says an
endpoint turns `caution` once three or more payers report failures (`payments_fail_after_preflight`),
but no route for those reports is in the OpenAPI.

**Four ways it meets ARP. Ideas, not decided.**

1. **The "after" side is an ARP line.** A form B line (`docs/28`, ADR `0138`) with `failed` and a
   closed reason is a public, attributed, permanent outcome report. That is the half Fizzl's own
   API does not expose. Their three-payer rule matches ARP's three-wallet threshold (ADR `0143`).
   Fizzl collects the reports, and ARP adds a record that anyone can read again.
2. **Read the Trust Index as a dated fact.** For an x402 endpoint, `arp_agent_endpoints` or the
   probe could show "payable / no_go per Fizzl, on date D". It is never on chain, the same
   treatment as the probe (ADR `0093`). It is read-only, under CC BY, and the source is named.
3. **One vocabulary for "did not pay".** ARP's closed reasons could reuse the 12 refusal codes of
   #4087 for an x402 service, and ARP could comment on the issue.
4. **A Fizzl receipt as proof of a paid call.** It proves a payment happened and nothing about
   what was delivered. Accepting it is a new signature site, so it goes on the list in
   `security.md` before it ships.

**What blocks it today.**

- ARP's node is paid in native tTRUST, not x402 (`apps/node/src/task.ts`, `verifyPayment`), and
  x402 waits for the mainnet port (ADR `0102`, `docs/tasks/41`). So Doctor cannot preflight an ARP
  node yet.
- Task 65 §8 showed what a check before paying does not answer: whether the node holds the
  thing. Six of six runs paid, three of them for a note that did not exist. Fizzl's preflight
  checks that the endpoint can be paid, not that it holds the thing either.
- The placement note of 2026-11-05 pauses x402 behind the skills work.

**Update, 2026-11-09 (Frits Zwager's third reply, by e-mail).** Point 1 is settled the other way
round. Doctor's `POST /api/v1/outcome` accepts only reports carrying a preflight Doctor signed, so
ARP lines do not go there. Instead ARP publishes its failure records at a read endpoint (one URL
per endpoint, or one feed) and Doctor reads them before an agent pays. Doctor checks each
transaction on chain (payer, payTo, amount) itself and shows "N paid, M got nothing" beside its
verdict, as it does for nohumans.directory and PayAPI. Per record it needs: the endpoint URL, the
outcome, the settlement transaction, the network, and the date. Frits offers to wire it in once
the first version exists. So an x402 failure line must carry the settlement transaction, and the
networks Doctor reads are mainnets (Base, Solana and others, `openapi.json`, read 2026-11-09).

**When it is picked up:** start with the read feed above, the shape Frits asked for. **Built 2026-11-09 by task 89** (ADR `0159`): `/feeds/x402-outcomes.json`, empty until a line names a real payment. Since task 93 (ADR `0162`, schema `arp.x402-outcomes/2`) a record's `endpoint` is the URL the payer called, as typed, with `endpoint_canonical` beside it; a line written before then has `endpoint: null`. Then do point 2, which is the cheapest. Do 41b, the node
answering 402, with Doctor's `diagnose` as its test.

## x402 as a feature: who is actually paid, then what they delivered

Asked for by the user, 2026-11-10, as a lead, not a decision: rather than exploring ERC-8004
agents (on 13579's directory, 2026-11-09, 40 of 283 speak MCP or A2A and none was used by another
wallet, `data/catalogue/agent-sieve-13579.json`), look at who is paid over x402, then reach them.

- **Read the payments.** Settlements to an endpoint's `payTo` on Base, read the way
  `x402-payment.ts` already reads one (the token's `Transfer` log, never `tx.from`). ARP reads and
  never signs there.
- **Join a payment to an endpoint** through public x402 listings. Which ones exist and what they
  already show (volumes, payers) is to be checked before anything is built, so ARP does not
  re-publish someone else's figures as its own.
- **Add what a payment does not prove:** whether something was delivered — the `worked` and
  `failed` lines, and the feed Doctor reads (task 89, task 93).
- On `docs/32`'s ladder: the hire column, observed tier.

**Other registries, the same posture.** The user, 2026-11-10: also talk to other registries and
agent-marketplace providers. The model is the one with Doctor: ARP publishes a read feed (lines,
outcomes, the sieve's rung), and the registry or marketplace reads it beside its own listing; ARP
never asks them to write to Intuition. Targets and the problem each has are in the business-dev
repository's `outreach/drafts/agent-marketplaces-2026-11-09.md`; contacts stay drafts until the
user is back (2026-11-10).

## What was missing, beyond the sponsored path (task 97, ADR `0166`)

Task 97 put `needs` and `with` on a sponsored line. Three things it left, each a decision for the user:

1. **The direct path.** `arp_declare_used` takes an outcome and a reason, not a name: an agent paying
   its own TRUST cannot write `needs` yet. The planner would have to read the skill's SKILL.md itself
   before it plans the level, which no MCP planner does today.
2. ~~**`with` comes from the agent, never from the hook.**~~ Done in task 100 (ADR `0169`): on `Stop` the
   hook asks the model once per skill whether it did its job, and a `worked` answer after an earlier local
   `needs` record of that skill carries the name as `with`, still only when the SKILL.md names it.
3. **Names the skill's other files say.** The guard reads SKILL.md only, on both sides, because the
   service can verify one file with one tree read and one raw read. A program named only in a script
   the skill ships is left off the line, a false negative and never a leak.

## Left by the sweep (task 103, ADR `0172`, 2026-11-10)

Closed or excluded tasks that leave something a later task may want. Each task file keeps the detail.

- **Task 28's punch list.** The open items stay in `docs/tasks/28-coherence-audit.md`. Many are moot
  since the pages they name were deleted or rebuilt; an item still true comes back as a task of its own.
- **Task 61, deliverable B: figures per version** of a skill. Waits on someone asking for it, and on
  deciding what a version is beyond the pin.
- **Task 68, phase 5: a shorter `arp_pulse` answer** by default. It was to follow task 67's results,
  which do not exist yet.
- **Task 86's surfaces**: `arp check <skill>` in the terminal (task 98 exports `skillInstallOf` and
  `skillInstallReport` for it), a `SessionStart` line, the site's hero field and the onboarding
  example. Task 98 covers the install itself.
- **Task 67, the demonstration.** Excluded by the user on 2026-11-10. Its list is frozen and its runs
  were never made; a demonstration, when one is needed, starts from its file.

## Recipes: which tools worked together

**Asked 2026-11-10**, while thinking about what ARP could bring HOL beyond failures: _« pour réussir
une tâche avoir x + x + x + x et composer alors une tâche spécifique grâce à différents outils »_.

A skill is a composition its author wrote in advance, a promise. What does not exist is the composition
**observed**: for a task in a domain, the set of tools that agents who succeeded actually had together.

**What exists today.** On chain, a line is about one tool. `(agent, uses, tool)` has one id per agent
and tool, so every session of that agent on that tool lands in the same line, and nothing links two
tools (`docs/28`). The only grouping is per wallet, which says "this wallet used A and B", not "for the
same task". Locally, the hook records each call with its session id (`apps/hook/src/hook.ts`, the
`session` field of `.arp/session.jsonl`), so one machine already knows which skills served together.

**The proposed shape.** Extend the `with` level to a catalogued tool's atom: `(T3 worked, with, <atom
of skill B>)`, written by the hook when A and B were used in the same session and A worked. The
sentence stays the same across agents, so it aggregates; a recipe A + B + C reads as pairs repeated by
distinct wallets. Nothing leaves the machine but an atom that is already public.

**Not this:** a session id on chain. Each session would get its own line, agents could no longer be
compared, and a person's activity would be published.

**What it needs first.** An ADR: `with` is limited today to a program or an environment variable the
skill's own SKILL.md names (ADR `0166`). And data: on 2026-11-10 the skill-lines feed holds 10 skills
and 5 writing wallets, mostly ARP's own rehearsals (`apps/web/public/feeds/skill-lines.json`). A recipe
means nothing before testers write lines.
