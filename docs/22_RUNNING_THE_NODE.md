# 22 — Running the MCP server, the node and the hook

**Date**: 2026-10-29. Split by program 2026-10-30 (ADR `0082`).
**For**: somebody deciding whether to install this beside their agent. Not a contributor — every
claim below points at a file and a line so you can check it rather than believe it.

---

## Three programs, installed separately

This document used to call the MCP server "the node". There are three programs, and they do not
share a trust surface, so each is described on its own and you install only the one you need.

|                | the MCP server — `apps/mcp`                           | the node — `apps/node`                               | the hook — `apps/hook`           |
| -------------- | ----------------------------------------------------- | ---------------------------------------------------- | -------------------------------- |
| launched by    | your MCP client, over stdio                           | you, as a server                                     | your runtime, on every tool call |
| reachable from | your machine (`127.0.0.1`)                            | `127.0.0.1`, and a tunnel you rent is the way in     | nowhere; it reads stdin          |
| key            | `~/.arp/receipt-key`, generated, signs content receipts | `~/.arp/node.key`, generated, or `AGENT_PRIVATE_KEY` | none                             |
| network        | the graph, the RPC, GitHub — counted below            | the RPC; the tunnel binary, if it starts one         | GitHub before a skills install; the graph when a skill fails — below |

Sections up to "If you want to verify" are about the **MCP server**. The node and the hook have a
section each after it.

## What the MCP server is

One process. It answers questions about tools and agents from a public knowledge graph, it fetches
a skill's file from the repository that publishes it, and it prepares transactions for you to sign
with your own key.

**It is not a service you depend on.** Unplug everything of ours and your agent still runs: the server
is code on your machine, the graph it reads is Intuition's, and the files it fetches come from
GitHub. That property is the whole of ADR `0045` and it is the reason this is installed rather than
hosted.

_Amended 2026-11-10 (ADR `0161`):_ ARP also runs this server, read-only, as a hosted endpoint, at
`https://mcp.arp.intuition.box/mcp` since 2026-11-11, for a caller who would rather point at a URL than install anything.
Nothing installed uses it. A caller who chooses it sends its tool arguments, the words of a search
among them, to ARP's server, which logs and keeps none of them, holds no key and reads testnet 13579
only (`ARP_HOSTED`, below). Everything else in this document is about the server on your machine.

```
bun run apps/mcp/src/server.ts --stdio    # for an MCP client to launch
ARP_TARGET=testnet bun run apps/mcp/src/server.ts
apps/mcp/dist/arp-server.js --stdio       # the same, as one file: cd apps/mcp && bun run build
arp mcp                                   # the same under Node 22: @arp-protocol/cli (apps/cli)
```

**In the Claude Code plugin** it is one file you can read, `bin/arp.js`, started as `node ${CLAUDE_PLUGIN_ROOT}/bin/arp.js mcp` from your project, with `ARP_TARGET=testnet` and `ARP_TOOLS=read`. Starting it downloads nothing, and it adds nothing of your project's to `PATH`. Only its search runs `npx`, described below. Its commands, such as `/arp:share`, run the same file when you type them.

`@arp-protocol/cli` holds the three programs behind one `arp` binary and runs on Node 22 without
Bun (ADR `0089`). It is built and checked (`cd apps/cli && bun run check:node`), and published on
npm as `@arp-protocol/cli` 0.0.1 since 2026-11-06 (`npm view @arp-protocol/cli version`). From a
checkout, `arp` is `node apps/cli/dist/cli.js`. _Amended 2026-11-09: this read "not yet published"._

## The three things that matter before you install anything

**It never signs a transaction.** Not a transfer, not a stake, not a contract call. The two planning
tools return unsigned calls and your runtime signs them with your key, in the order given. There is
no wallet client, no signer parameter and no send path in the package that builds them — ADR `0038`,
and `packages/protocol/src/declare/` is where to check it. The one key the server does hold is below
and it cannot move value.

**Except in the sponsored mode, which you opt into.** With `ARP_TOOLS=desktop`, set by the Claude
Desktop extension, or `ARP_TOOLS=sponsored`, set by `arp init --sponsored`, the server holds a local
agent key in `~/.arp/agent-key` (ADR `0110`). That key sends exactly two zero-value transactions on
testnet 13579, `register()` and one MultiVault approval, and refuses every other call before signing
(`apps/mcp/src/desktop/agent-key.ts`, `refusal`). It also signs two typed-data messages that move
nothing: the request a content receipt is issued to, and the request for a sponsored deposit. ARP's
sponsoring service pays everything that carries value.

**The commands `arp line` and `arp share send` do the same, on any install, when you run them.** They load or create that key, can send the same two transactions, sign a list-tool and a line request, and reach `ARP_SPONSOR`. The MCP server itself still holds no key in the read or full mode: without one of those two `ARP_TOOLS` values, and until you run one of those commands, the paragraph above holds.

**It executes no skill it fetches.** The one package it runs is below (`arp_pulse`). A skill's file is Markdown. It is returned with
`content-type: text/plain`, `x-content-type-options: nosniff` and
`content-disposition: attachment`, never rendered, never parsed, never written to disk by the server
(`apps/mcp/src/content.ts`, the response at the end of `serveContentRequest`). Your agent reads it;
the server does not. `GET /content/:atomId?bundle=1` returns the skill's whole directory, scripts included, as
JSON, and the server writes none of it (task 57).

**In the sponsored mode with `ARP_SKILLS_DIR`**, the server process that runs your MCP tools writes
a fetched skill's files, scripts included, under `<ARP_SKILLS_DIR>/<name>/`, after checking every
file against the receipt (task 57) **and only after you accept** (task 61, ADR `0127`). It asks you
through MCP elicitation: a dialog with the skill, a link to read every file on GitHub at the pinned
commit, and the counts. The model does not see the question and cannot answer it. Any answer but
an accept writes nothing and keeps nothing, and no ARP setting skips the question. It
runs none of the files. Your agent runtime may, as it would after `npx skills add`.

The bytes come from the commit each repository was pinned at when it was listed
(`data/catalogue/skill-pins-13579.json`), never from `HEAD`, and the receipt names that commit.

**It cannot be made to fetch somewhere else.** This is the one that would matter most if it were
wrong, so it is worth stating precisely. The only input to the content route is an atom id. That is
looked up in a catalogue shipped in this repository, which yields a URL; the URL yields
`owner/repo`; the path comes from the repository's own file listing. **No part of the request
reaches the outbound URL.** `packages/protocol/test/content-serve.test.ts` has a test called
"never lets the request choose where the fetch goes" that asserts the single URL fetched.

## Every file it creates

```
~/.arp/receipt-key     the signing key. Generated on first run, mode 0600
.arp/session.jsonl     what the hook recorded, if you wired the hook
~/.arp/failures.jsonl  a skill's failures the hook saw, or `arp backfill` read from old transcripts:
                       the skill, its source, the session, the date, a closed reason, and a domain:
                       the search's, else a category your request names, else the catalogue's keyword
                       table on the skill's name and description, which can be wrong. The source, with
                       no search, comes from ~/.agents/.skill-lock.json, the project's own
                       skills-lock.json or a receipt, when only one source is known for that name. Your words are read for that and not kept. Never
                       the command or its output. Stays on this machine unless you say yes to sharing.
                       A source still empty is looked up again by `arp share`, from the same files,
                       with the project it runs in as the project
~/.arp/asked.jsonl     when a skill loads, the skills the hook asked about: the session, the skill, its source, the date
~/.arp/outcomes.jsonl  on Stop, the model's closing line for each, `worked`, `failed` or `unsure`, with a domain
                       found as for a failure, and on a worked answer the `with` name an earlier failure
                       named, only when the skill's SKILL.md names it. Never the model's message
~/.arp/sharing.json    whether failures and worked answers may become public lines, with the date and how
                       it was chosen (init, command, desktop, asked-once, asked-always, asked-no).
                       Absent means undecided, which is off
~/.arp/share-question.json  the one sharing question the hook puts: the session, the skill, offered,
                       put or answered, and the answer. Never the person's words
~/.arp/share-once.jsonl  the result a "yes, this once" or "always" was about: the session and the skill.
                       Under "always", only that result and what is kept after the choice may go
~/.arp/share-log.jsonl   what each background send did: the date, sent, failed, the first error
~/.arp/share-send.lock   held while a send runs, so two sessions ending together send once
~/.arp/bin/send.json   with `arp init`: the command the hook runs for `arp share send --auto`
~/.arp/shared-failures.jsonl  what has been made public: a skill's public URL, `failed` and a closed reason or
                       `worked`, a domain if known, and a `needs` or `with` name
.arp/searches.jsonl    what `arp_pulse` answered, if you wired the hook: the session, the domain, the skills
                       found and their source. Never your query. Stays on this machine
.arp/receipts.jsonl    what you fetched through a server, and the receipts
.arp/skills/<name>/SKILL.md   files you fetched, if you used arp-fetch-skill.ts
~/.arp/skills-cli/     the search package's home, mode 0700, with npm's cache of that package.
                       Created by the first arp_pulse call with a query. npm runs with
                       --logs-max=0, so it keeps no log of a run and its argv, your query
                       (until 2026-11-09 it kept ten, under .npm/_logs). Safe to delete
~/.arp/pulse-listings/ the file lists of repositories your searches returned, one file per repository,
                       named by a hash, mode 0700. Read for a day, never deleted by ARP. Safe to delete
```

That is all of it. The key is in your home directory (`ARP_HOME` moves it), so it is one key
whatever directory your client starts the server in; the logs are in the working directory's
`.arp/`, which carries its own `.gitignore` of `*`. Nothing is written to your shell profile, your
git config or any system path.

**Until 2026-11-02 the key was `.arp/receipt-key` in the working directory** (ADR `0116`). A server
that finds one there and none in `~/.arp/` refuses to start and prints the `mv` to run, rather than
generating a new key: a new key is a new signer, and a sponsoring service that accepted the old one
would stop accepting your receipts.

**The sponsored mode writes more** (`ARP_TOOLS=desktop` or `sponsored`), and this is all of it:

```
~/.arp/agent-key              the agent's key, mode 0600, created on the first fetch, or by arp line or arp share send
                              once the domain is known and the sponsor answers, not before
~/.arp/agent.json             the agent's id and identity atom, once it is registered
~/.arp/receipts.jsonl         every skill served to the agent, with its receipt
<ARP_SKILLS_DIR>/<name>/**    the skill's files, scripts included, when ARP_SKILLS_DIR is set and you accepted
.arp/receipts.jsonl           a copy of the receipt for the hook, for each skill you accepted
```

## Every outbound connection

Seven fixed hosts, the first two configurable, and agents' own signed addresses. The sponsored mode also reaches two more, both
configurable: ARP's content server (`ARP_CONTENT`) and ARP's sponsoring service (`ARP_SPONSOR`),
both local by default. `arp line` and `arp share send` reach the sponsoring service too, and so does
`arp share send --auto`, which the hook starts detached when a session ends with sharing on or a
"yes, this once" from that session; the hook itself does not connect. The hook
reaches `api.github.com` and `raw.githubusercontent.com` before a skills install, and at no other
time ([The hook](#the-hook--appshook)). `arp_pulse` reaches up to ten agents' signed addresses on a search with words: `GET /`, with none of your words, though each node sees your IP and the time.

```
the Intuition graph    reads. Set by ARP_TARGET, or INTUITION_GRAPHQL_URL
the Intuition RPC      reads. Set by ARP_TARGET, or INTUITION_RPC_URL
api.github.com         one file listing per repository, cached ten minutes on the content route and a
                       day for `arp_pulse`, in ~/.arp/pulse-listings. With no token, no repository figures,
                       and only as many results read as you asked for, so fewer copies are seen.
                       A skill ARP catalogues is answered from a dated reading bundled with the server
                       (`data/catalogue/pulse-readings.json`, task 113) and asks GitHub nothing
raw.githubusercontent.com   the skill's own bytes: passed through on the content route, never cached; for
                       `arp_pulse`, kept in memory ten minutes, never on disk
gateway.pinata.cloud   a pinned document: an agent's registration file when it published an
                       `ipfs://` one, a proof the index does not hold, or a skill atom's document
ipfs.io                the same, when Pinata does not serve it
skills.sh              one `GET /api/search?q=skill` when a search on `arp_pulse` comes back empty, with none
                       of your words, to tell "nothing exists" from "the service is down". And
                       `arp_find_tools` sends **your search words** in one `GET /api/search` per new
                       query, kept a minute, to search skills.sh's whole index beside ARP's catalogue
                       (task 82). `ARP_SKILLS_INDEX_URL=off` stops it
the signed addresses   `arp_agent_endpoints` asks `/` of an agent's three newest signed addresses, and
                       `arp_pulse` the newest of up to ten agents on every search with words:
                       somebody else's servers, through the same guard as any probe. Your words stay here,
                       unless you chose ARP's hosted endpoint instead of this server (ADR 0161)
```

The hook, a separate program, reaches two of these too: GitHub before a skills install, with the repository and skill names the command holds (ADR `0167`), and the Intuition graph once when a skill's command fails, with the skill's atom and nothing of yours (ADR `0168`). Its section below has both.

**`arp_pulse` runs somebody else's package, and you should decide about that.** Called with a `query`,
it runs `npx --yes skills@1.7.6 find <query>` with a short fetch limit, from its private directory rather than your project, and without a project's `node_modules/.bin` on `PATH`: the pinned npm package executes on your machine, as your
OS user, so it can read what that user can read. It gets four environment variables (`PATH`, `HOME` set to
the private directory `skills-cli` in `ARP_HOME`, and two that turn off telemetry and colour), none of your secrets, and the query as
one argument with no shell. **Your search words reach skills.sh**, and `npx` reaches the npm registry when the package is not in its cache.
A `node_modules/.bin` in your home folder or a parent of it, or in a project holding `ARP_HOME`, is **not** covered: a program there ran through this `npx`, tried 2026-11-06. `ARP_PULSE_SEARCH=off` stops it, and it never runs in `desktop` or `sponsored`, which keep an agent key on
the machine. An agent can always pass the command's text as `search_output`, which runs nothing. Either way
the tool asks `api.github.com` for each repository's listing and, with `GITHUB_TOKEN`, also its figures.

One search answers within 50 s, whatever does not answer, because an MCP client gives up at 60 (`PULSE_BUDGET`, `handlers/pulse.ts`). The package gets 25 s, each GitHub read 10 s. What did not answer is named in the reply: `search: "unavailable"` with its `detail`, `phrases_failed`, `files_not_all_read`, `public_record`. Only `nothing_found` says that nothing exists. The package runs in its own process group, killed when its time is up, when the call is cancelled, when your client closes the server's stdin, and on SIGTERM, SIGINT or SIGHUP. A server killed with SIGKILL runs no code, so a search open at that moment is left running.

**And two that are not fixed, which you should know about before you install this.** Both exist for
the same reason and ADR `0045` is explicit about it: ARP can **verify** another agent's endpoint and
cannot **provide** one. Verifying means connecting to a host somebody else chose.

```
arp_probe_endpoint     fetches a URL the caller passes directly
arp_agent_endpoints    fetches the `registrationFile` out of an ERC-8004 `tokenURI` — read from
                       a registry whose ADDRESS the caller supplies, so the URL is reachable
                       through two hops rather than one
```

Both now refuse a private target. The second one did not until this document was written: naming
every outbound connection is what found it, which is the argument for writing such a section at
all.

An earlier draft of this document said there were four hosts, that the probe was the only unfixed
fetch, and that the four were "the only literals in the code" — a sentence that invited the grep
that disproves it. All three were wrong. The first version of this section is also what changed the
code:

> `Bun.serve` binds **every interface** when it is given no hostname. So an installed server listened
> on the local network, and anything that could reach the port could ask it to fetch
> `http://127.0.0.1:…/admin` or `http://169.254.169.254/latest/meta-data/` and read the answer. An
> open proxy into the operator's own machine, by accident, in two unrelated correct decisions.

Both halves are fixed, 2026-10-29:

- **The server binds `127.0.0.1` by default.** `ARP_HOST=0.0.0.0` opens it, for somebody who meant
  to. The startup line says which, every time.
- **Both caller-steerable fetches refuse a private target.** Loopback, `10/8`, `172.16/12`,
  `192.168/16`, `169.254/16`, `0/8`, IPv6 loopback and unique-local, `localhost`, `.internal`,
  `.local`. `ARP_ALLOW_PRIVATE_PROBE=1` if you are probing your own rig. The guard is
  `privateProbeTarget` in `packages/protocol/src/verify/probe.ts` and its boundaries are tested:
  `172.15` and `172.32` are public and only `172.16`–`172.31` are not, and `10.example.com` is a
  real host that an earlier version of the guard refused.

**What that guard does not cover, said plainly.** A hostname that _resolves_ to a private address —
`example.com` pointing at `127.0.0.1` — got through until 2026-11-03. The MCP server now resolves
every hop's name first, through the system resolver, and refuses it when any address it resolves to
is private (`apps/mcp/src/host-guard.ts`, tested with a stub resolver in
`apps/mcp/test/host-guard.test.ts`); `ARP_ALLOW_PRIVATE_PROBE=1` turns that off with the rest.
**DNS rebinding still gets through**: `fetch` resolves the name again when it connects, and an
answer that changes between the two lookups is not seen. Closing it needs connecting to the
resolved address, which `fetch` does not let you do. So it is a guard against the common case and
not a boundary.

**A redirect was the other way through, and it needed no DNS at all.** `fetch` follows redirects by
itself, so a caller-controlled **public** host answering
`302 Location: http://169.254.169.254/latest/meta-data/` got the private body back. Measured
2026-10-29, with a local stand-in: the body came through, and nothing in the first-hop check could
have stopped it. **A guard on hop one is not a guard.**

```
arp_agent_endpoints    fixed. Redirects are followed by hand, every hop through the same
                       check, at most three hops
arp_probe_endpoint     fixed the same way since task 60 (both go through `guardedFetchText`
                       in packages/protocol/src/verify/probe.ts). A refused hop is
                       `inconclusive` with code `refused`: never a verdict about the agent
```

The probe was the open hole in this document until task 60. Its vocabulary is deliberate — "a
timeout is an answer about the agent, a TLS or DNS failure is not, because it could equally be us"
— and a refusal is this server's decision, not the agent's answer, so it lands in `inconclusive`
(`refusedOutcome` in `probe.ts`).

**And "do not open `ARP_HOST`" does not cover the registration route.** That advice bounds a caller
who has to reach you over the network; `arp_agent_endpoints` is called by a process on your own
machine by design. The chain is the one named at the bottom of this document: a stranger's
`SKILL.md` telling your agent to call it with an attacker's registry. That is why that route is
fixed in code and not merely disclosed.

**And what it covers better than that caveat suggests**, because a caveat that undersells is a wrong
claim too: `http://2130706433/`, `http://127.1/` and `http://0177.0.0.1/` are all refused — `URL`
normalises those shorthands to a dotted quad before the guard sees them — and so is
`http://[::ffff:127.0.0.1]/`, an IPv4-mapped IPv6 address, which **passed until 2026-10-29**. It
arrives as `::ffff:7f00:1` in hex groups rather than the dotted form it was written in, so the first
version of the unwrap matched nothing; its own test caught that. All four are asserted in
`packages/protocol/test/probe-private.test.ts`.

**A scheme other than http, https or ipfs is refused outright.** That is separate from the address
check and it was missing until the same day: `file:///etc/passwd` walked through the private-address
guard and Bun's `fetch` read it — 200, and the file's contents handed back to the caller. The
registration path was the exposed one, because `privateProbeTarget` assigns the scheme check to its
caller and that caller did not do it. `fetchableDocumentUrl` is now both halves in one place with
the tests, and `ARP_ALLOW_PRIVATE_PROBE` is about addresses only — it is not a licence to read the
disk.

**Nothing is sent to us.** No telemetry, no analytics, no phone-home, no reporting endpoint.

**Do not believe that, and do not believe a `grep` I hand you either.** Run the enumeration — and
read what it does **not** cover first: a viem `http()` transport opens a connection that is neither
a host literal nor a `fetch` call, which is how the Intuition RPC reaches the network. It is named
twice above as a configurable fixed host and it will not appear in the script's output.

```
bun run scripts/measure/node-outbound.ts
```

It reads the modules a running server actually loads, named in a list, and prints every host literal with its line, every `fetch` call site **labelled `outbound`, `inbound` or `definition`**, and whether any host is ours. On 2026-11-05, `data/measurements/node-outbound-2026-11-05T2329.json`: **19 modules, 10 host literals, 16 call sites of which 9 are labelled outbound, 0 of the hosts ours.** It exits non-zero if that last number is ever not zero. (It counts `guardedFetchText` since that date, so the earlier runs of 2026-10-29 and 2026-10-30, with 6 outbound over fewer modules, are not comparable.)

Seven of the nine leave the machine: a signed address (`handlers/agents.ts`), a registration document (`registration-document.ts`), a repository listing and a skill's bytes (`content.ts`), the probe (`probe.ts:514`), a pinned document (`readIpfsJson`, `probe.ts:882`), and the shared transport every graph read funnels through (`http.ts`). The other two are the classifier's over-count: `serveFetch` starts this server's listener, and the line in `agent-pulse.ts` passes a fetch to the transport. The script also omits what is not called `fetch`: `arp_pulse`'s package, described above, its reads through a fetch passed in (GitHub, and the check on skills.sh), and viem's RPC transport.

This is a script rather than a sentence because the sentence was **wrong twice**. One draft said
four hosts and "the only literals in the code"; the next said six literals and offered a grep over
`scripts/` that returns 116 lines across 31 hosts, because its scope was a directory and the claim's
scope was three files. Different sentences, identical failure — a security claim offered with a
check whose scope does not match it. The script's scope is a named list, which is the one thing it
cannot check for itself, and it says so.

Three things it shows that a count alone would hide:

- Two of the ten literals (`localhost:`, `stdio`) are in **log lines** and fetched by nobody,
  `github.com` is in the probe's **user-agent**, which identifies the server and sends nothing, and in the URI `arp_pulse` builds for a skill's atom, which it fetches nowhere, and two
  (`127.0.0.1:3002`, `127.0.0.1:3200`) are local defaults of the sponsored mode. Five are destinations:
  `api.github.com`, `raw.githubusercontent.com`, `gateway.pinata.cloud`, `ipfs.io` and `skills.sh`.
- The Intuition graph and RPC are **absent from the literals and present in the server** — they come
  from `data/deployments/<chainId>.json` at startup. Absence from a literal list is not absence from the
  server, which is the trap a literal count sets.
- `fetchCallSites` is deliberately **over-inclusive and labelled**: a definition and the stdio
  loop's call to the server's own inbound handler are in it, marked as such. A site it lists and
  should not is a reader's minute; a site it misses is the claim being false. The labels exist
  because an over-inclusive count with no labels cannot be compared against anything — and the
  first version of the classifier called that self-dispatch `outbound`, which is the over-count
  the labels were added to make visible.

## Every environment variable it reads

```
PORT                   which port to listen on. Default 3002
ARP_HOST               which interface. Default 127.0.0.1 — loopback only
ARP_ALLOWED_HOSTS      comma-separated host:port values the HTTP transport also answers to, besides
                       its loopback forms and ARP_HOST. Needed only with ARP_HOST=0.0.0.0
ARP_ALLOW_PRIVATE_PROBE  set to 1 to let the probe reach a private address
ARP_TARGET             testnet | mainnet. Picks the chain, the graph and the RPC
ARP_TRANSPORT          stdio, for an MCP client
INTUITION_GRAPHQL_URL  override the graph
INTUITION_RPC_URL      override the RPC
ARP_MULTI_VAULT        override the contract address
ARP_DOMAIN_ATTESTOR    whose domain tags to read, one address or several comma-separated (default: ARP's two). A property of the server, never a request parameter
GITHUB_TOKEN           optional. Keeps the whole window and the repository's figures, and raises GitHub's 60-requests-an-hour limit on file listings.
                       The hook reads it too, or GH_TOKEN when it is unset, for the check before a skills install
ARP_HOME               where the receipt key and the sponsored mode's state live. Default ~/.arp
ARP_RECEIPT_KEY        a key you manage, instead of the generated one. Never a funded one
ARP_NO_RECEIPTS        set to 1 to run with no key at all
ARP_ACCEPTED_SIGNERS   comma-separated. Which receipt signers THIS server's reader accepts
ARP_CHAIN_ID           which chain's catalogue apps/mcp/src/session-log.ts reads
ARP_PROJECT_DIR        set by the launch through npx, which starts from /: the project that relative paths below mean. The Claude Code plugin does not set it, as it starts in the project
ARP_SESSION_LOG        where the hook writes. Default .arp/session.jsonl
ARP_FAILURE_LINES      off: the hook reads nothing from the graph when a skill fails (ADR 0168). It also
                       reads INTUITION_GRAPHQL_URL, and otherwise testnet 13579's graph
ARP_SHARE_AUTO         off: the hook neither puts the sharing question nor starts the background send
                       at SessionEnd (ADR 0191). `arp share send` still works
ARP_CLI                the CLI script the hook runs as `arp share send --auto`. Default: the arp.js or
                       cli.js beside the hook, then ~/.arp/bin/send.json
ARP_RECEIPTS           where fetches are recorded. Default .arp/receipts.jsonl
ARP_PULSE_SEARCH       off: arp_pulse runs no package, and takes search_output only
ARP_SKILLS_INDEX_URL   off: arp_find_tools searches ARP's catalogue alone and sends your words nowhere.
                       Another base URL is read instead of https://skills.sh
ARP_TOOLS              read: the plugin's set, arp_pulse, arp_agent_endpoints and arp_tool_reputation, and
                       arp_agent_endpoints asks agents' signed addresses. desktop or sponsored: the reads plus arp_get_skill
                       and arp_declare_used, with a local agent key in ~/.arp/agent-key (ADR 0110),
                       over stdio only: the server refuses to start them over HTTP (ADR 0116).
                       Unset: every tool
ARP_SKILLS_DIR         also read by the hook, to find a skill's SKILL.md and decide whether a failed
                       command is one that skill asks for.
                       desktop/sponsored only, set by `arp init --sponsored`: once you accept the
                       install question, arp_get_skill writes <dir>/<name>/**, relative to the
                       working directory, refusing (and writing nothing) when a different file is
                       already at one of those paths, and appends the receipt to ARP_RECEIPTS
ARP_CONTENT            desktop/sponsored only: the content server. Default http://127.0.0.1:3002
ARP_SPONSOR            desktop/sponsored, arp line, arp share send: the sponsoring service. Default https://sponsor.arp.intuition.box since 0.0.4
                       (http://127.0.0.1:3200 in 0.0.3 and from a checkout)
ARP_ACTIVITY_DIR       session-log.ts --serve only: the directory it tails. Default .arp
ARP_ACTIVITY_PORT      session-log.ts --serve only: its port. Default 3003, on 127.0.0.1
ARP_ACTIVITY_ORIGINS   session-log.ts --serve only: comma-separated origins added to the CORS list
ARP_HOSTED             1: ARP's hosted endpoint (apps/mcp/Dockerfile, ADR 0161). Refuses to start unless
                       ARP_TOOLS=read, ARP_TARGET=testnet and ARP_PUBLIC_HOST are set, with no
                       ARP_RECEIPT_KEY, ARP_AGENT_PRIVATE_KEY or ARP_ALLOW_PRIVATE_PROBE, and over HTTP
                       only. Makes no receipt key, and logs a failed call's tool and error class only
ARP_PUBLIC_HOST        with ARP_HOSTED=1 only: the public name it answers, as Host and as https origin
```

`GITHUB_TOKEN` is the only one that is a credential (with `GH_TOKEN`, which only the hook reads), it
is read server-side or by the hook only, and it is sent to `api.github.com` and nowhere else. It needs **no scopes** — public repository listings are public.
Give it none.

**`session-log.ts --serve` opens a second listener**, and only when asked: the activity feed the web
app's activity bar reads (ADR `0091`). It binds `127.0.0.1:3003`, reads `.arp/session.jsonl`,
`receipts.jsonl` and `sent.jsonl`, and writes nothing. It makes no outbound connection. CORS
answers only for the web app's origins (Vite's ports on `localhost` and `127.0.0.1`, plus
`ARP_ACTIVITY_ORIGINS`). A request whose `Host` is not `127.0.0.1:<port>` or `localhost:<port>`
gets 403, which is what stops a DNS-rebinding page that CORS alone would let through. What it
serves is your agent's record: skill and MCP names, receipts, transaction hashes, the signer's
address. Run it only while you want a browser to see that.

## The key, and what losing it would cost you

The server generates `~/.arp/receipt-key` on first run so you have nothing to configure. It signs one
thing: a **content receipt**, an EIP-712 statement that this server served these exact bytes to this
caller at this time.

```
it is not a wallet              it holds no funds and no token
it is not an identity           your ERC-8004 identity is yours and is not this
it cannot sign a transaction    it signs EIP-712 structs, and the only struct it is handed
                                is a receipt (packages/protocol/src/receipt.ts)
it cannot move value            ADR 0080 constraint 3, and the plan path has no key at all
```

**If somebody steals it**, they can forge receipts in this server's name. They cannot spend anything.
A reader who stops accepting that signer is back to the declaration they already had — which is the
property that makes a receipt able only to _add_. Delete the file and restart to rotate; the server
publishes its current signer at `GET /` so anyone can see which key they are being offered.

`ARP_NO_RECEIPTS=1` runs with no key. The content route still serves bytes; what you lose is the
corroboration.

**Every key file follows one rule** (ADR `0116`): the receipt key, the sponsored mode's agent key,
the node key and the sponsoring service's key are each refused, and the program stops, when anyone
but their owner can read them — `chmod 600` and start again. A generated one is created 0600 in a
0700 directory. Windows has no POSIX mode, so the check does not run there. The node's
`AGENT_PRIVATE_KEY` and this server's `ARP_RECEIPT_KEY` are the two keys that may come from the
environment instead; both are documented here and both are your choice.

**`ARP_RECEIPT_KEY` is your own risk and the code cannot check it.** Nothing here can tell a funded
key from an empty one — that would need a balance read on every chain it might hold value on — so
it warns on stderr and carries on. Do not hand this process a key that holds funds. ADR `0080`
constraint 3 is a convention the code states and does not enforce, and an earlier draft of this
document said it did.

## What a receipt proves, and what it does not

**Access, not use.** It says the bytes left this server and reached that caller. Whether they changed
what the agent did is not observable by anything, and no mechanism here pretends otherwise.
`docs/14` is the long version.

And the part worth knowing before you put weight on one: **a receipt signed by a server you run
yourself is your own word in a second place.** One hand holds both keys. That is not a defect — it
pins the bytes, so you can re-derive what your agent actually held — but it is not corroboration to
a stranger.

**And nothing in the receipt can tell the two apart.** Your server generates its own key, so its
address differs from your agent's while you hold both. A reader therefore has to say which signers
it accepts — `ARP_ACCEPTED_SIGNERS`, and **empty is the default**, which makes an unrecognised
signer read as `unknown-signer`: not corroborated, not dismissed. `corroborationOf` in
`packages/protocol/src/receipt.ts` is that comparison and it reports rather than refuses (ADR
`0080`). Its first version called every locally-served receipt a second party, which was the
strongest verdict for the weakest case.

Anyone can check a receipt without asking us anything:

```
sha256sum SKILL.md          # compare to the digest in the receipt
```

That is why the digest is sha256 and not keccak256. The signature half is
`verifyContentReceipt`, and the path the receipt names is the path to re-fetch.

## It only knows the chain it is pointed at

The catalogue is a **per-chain record**: an atom id is a pure function of a tool's URL, so the same
tool has a different recorded id on each chain, and `data/catalogue/skills-<chainId>.json` is the record
for one of them.

Today only 13579 has one. `ARP_TARGET` still defaults to **mainnet**, so a default-run server holds
**zero** catalogued skills and says so at `GET /` — `catalogued_skills: 0` — and refuses a testnet
atom id with the reason rather than serving it. Point it at testnet to use the content path:

```
ARP_TARGET=testnet bun run apps/mcp/src/server.ts
```

That mattered more than it looks. Before this was per-chain, the catalogue was imported at module
scope from the 13579 file while the chain was configurable, so a default server served testnet atom
ids and stamped **1155** into every receipt's domain — for atoms that do not exist there, and where
a create pair costs 0.22 TRUST against 0.004. Measured 2026-10-29.

## What it refuses, so you can tell a bug from an answer

Nine refusals, each with its own status and sentence. Three of them are facts about the world and
not failures:

```
404 unknown-atom    not a catalogued tool
404 not-a-file      catalogued, but there is no file — every MCP server is this
404 unpinned        the repository has no pinned commit, so there is no listed version to serve
404 absent          the repository has no such skill at its pinned commit. 139 of 662 are here
409 ambiguous       several paths, contents differ. 2 of 662. It refuses rather than pick
400 bad-atom-id     not 0x + 64 hex
413 too-large       over the 1 MiB cap
502 upstream        the origin answered something else
500 unsafe-path     the listing named a path outside the repository
```

`absent` is worth a sentence: 139 of the 662 catalogued skills have no file the resolver can find in
the repository the catalogue points at, at the commit it was pinned at. That is a measurement
(`scripts/measure/skill-paths-at-pin.ts`, `data/measurements/skill-paths-at-pin-2026-11-03.json`:
521 resolved, 139 absent, 2 ambiguous), the same counts as at `HEAD` on 2026-10-29
(`data/measurements/skill-layouts-2026-10-29T2200.json`), re-derivable with one listing request per
repository, and it is the server telling you the truth rather than failing.

**A listing it could not read is not an empty repository.** If GitHub rate-limits us the server
throws rather than answering `absent`, because serving `absent` off our own quota would publish a
claim about somebody's repository on the strength of our limits.

## What this does not protect you from

Stated because a security note that lists only its strengths is marketing.

- **The skill's content.** A `SKILL.md` is instructions for a language model, written by a stranger.
  The server proves which bytes you got; it says nothing about whether those bytes are safe to follow.
  That is prompt injection and it is the real risk in this whole area. Read what you install.
- **Your model installing something itself.** The install question governs what ARP writes. A model
  with a shell can copy any file into `.claude/skills/` on its own, and no server can stop that.
- **An editor that does not show the question.** Claude Code in VS Code (2.1.317) declares MCP
  elicitation and answers no without showing it (`anthropics/claude-code#98256`, tested 2026-11-03).
  Nothing is installed there; ask again from a terminal, where the dialog shows.
- **A hook you install yourself.** Claude Code lets a user's `Elicitation` hook answer the dialog.
  ARP has no setting that skips the question; a hook of yours can.
- **The catalogue's judgement.** 662 skills are listed because they crossed an install-count
  threshold on skills.sh (`data/measurements/catalogue-sources-2026-10-28.json`). That is a popularity
  figure, it is somebody else's number, and ARP publishes no score (ADR `0046`). A listing is not a
  recommendation.
- **A dishonest declaration.** An agent can declare a use it did not make. It costs the price of the
  claim and earns a reputation on a tool it never used, which is worth nothing when somebody picks
  an agent by that reputation — but nothing here prevents it. What the graph gives a reader instead
  is **who** declared, how many distinct addresses, and whether the declarer and the tool share one.
- **Your own key.** The planners hand you unsigned calls with a `why` on each one. Read them. A plan
  you cannot explain to yourself is a plan to refuse.
- **A caller you let reach the port.** The server answers whoever can talk to it, and it has no
  authentication. On loopback that is the processes on your machine, which is the intended
  deployment. Open `ARP_HOST` and it is whoever can route to you. What it does refuse, since ADR
  `0116`, is a **web page**: a request whose `Host` is not this server's (`127.0.0.1:<port>`,
  `localhost:<port>`, `ARP_HOST`, `ARP_ALLOWED_HOSTS`) or whose browser `Origin` is another site's
  gets a `403`, and a `POST` that is not `application/json` gets a `415` — the content type a page
  can send cross-origin without the browser asking first. `apps/mcp/test/server.test.ts`, "a
  request from a web page", sends all three.

## If you want to verify all of this rather than read it

```
bun run scripts/verify/verify-content-route.ts    # against a running server
```

It fetches a real skill, recovers the receipt's signer, re-hashes the bytes that arrived, and prints
whether each refusal is distinguishable. It exists because the unit tests inject every piece of IO
and so cannot see the one property that matters most — that a third party can re-derive the digest
with their own tools.

## The node — `apps/node`

```
AGENT_REGISTRY=eip155:13579:0xC165… AGENT_ID=2 \
  AGENT_NODE_PORT=3100 bun run apps/node/src/node.ts
curl -s localhost:3100/healthz
```

**Reached through a tunnel you rent** (task 39, ADR `0094`). The node listens on `127.0.0.1` only.
`cloudflared` or `ngrok`, found on `PATH`, is started as a child of the node and prints a public
`https://` URL, which the node prints in turn. With `cloudflared` that is a quick tunnel
(`cloudflared tunnel --url http://127.0.0.1:<port>`): no account, a `trycloudflare.com` address, and a
new address on every start, so a binding made over it holds until the node restarts and
`arp init --node` runs again after. A stable address — a named tunnel on your own Cloudflare account,
given as `ARP_NODE_PUBLIC_URL` — is a follow-up. ARP builds no relay and carries none of the traffic.

**Bound to your agent once, by its owner** — `arp init --node`. The node sends the directory your
agent's id, its public key and its endpoint; the directory reads the token's owner and returns a
Sign-In with Ethereum message; the owner signs it in their own wallet and pastes the signature, and
the node key signs it too. `verifyEndpointBinding` (`@arp-protocol/core`) re-checks the result
against the registry with nothing from ARP, and a transfer of the token voids it (ADR `0095`). No
directory is hosted yet: `--directory` names one.

| variable                        | default                    | what it is                                                                                                                             |
| ------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENT_PRIVATE_KEY`             | unset                      | used instead of the node key file when set                                                                                             |
| `ARP_NODE_KEY_FILE`             | `~/.arp/node.key`          | the node key, created 0600 on first start; refused if others can read                                                                  |
| `ARP_HOME`                      | `~/.arp`                   | where the node key and the ledger live when their own variables are unset                                                              |
| `ARP_NODE_TUNNEL`               | `auto`                     | `auto`, `cloudflared`, `ngrok`, `configured` or `none` (localhost)                                                                     |
| `ARP_NODE_PUBLIC_URL`           | unset                      | the `https` URL of a tunnel you run; `auto` prefers it                                                                                 |
| `INTUITION_RPC_URL`             | required                   | the chain payments are read on — also the receipt's `chainId`                                                                          |
| `AGENT_REGISTRY` + `AGENT_ID`   | both unset                 | the agent as its ERC-8004 registration file names it; both or neither                                                                  |
| `AGENT_NODE_MIN_BUDGET`         | `0.001`                    | the smallest payment accepted, in the chain's native unit                                                                              |
| `AGENT_NODE_LEDGER`             | `~/.arp/node-payments.jsonl` | every payment already used, one line each                                                                                            |
| `AGENT_NODE_MAX_BODY_BYTES`     | `65536`                    | larger bodies are a `413`                                                                                                              |
| `AGENT_NODE_HANDLER_TIMEOUT_MS` | `60000`                    | a slower handler is a `504` and its `context.signal` is aborted; the payment is released once the handler settles |
| `AGENT_NODE_RATE_LIMIT`         | `30`                       | `POST /task` per client per minute, paid or not; then `429`. The client is `cf-connecting-ip` behind `cloudflared`, the right-most `x-forwarded-for` hop behind ngrok, the socket address otherwise |
| `AGENT_NODE_RECEIPT_TTL`        | `86400`                    | seconds a hire receipt stays usable: its signed `expiresAt` is `issuedAt` plus this                                                    |

What makes an agent reachable: it listens at the address the agent publishes in its ERC-8004
registration file, checks on chain that the requester paid it before doing any work, and returns a
receipt signed with the agent's key (ADR `0045`, format ADR `0083`). The work itself is yours — `ARP_NODE_HANDLER`
names a module exporting `handle(payload, context)`; without one it echoes. An optional `offer` export, three short strings (`description`, `input`, `output`), is served at `GET /` so a caller can read what it sells before paying. It is your word, unsigned.

**It signs receipts and never transactions.** The key signs because a hire receipt must be signed,
and a signature is not a spend. It is also the address a hirer pays, since the payment check below
requires the payment be sent to it. Its own outbound connection is the RPC it reads the payment
from; it starts at most one child, the tunnel binary, whose connection is to Cloudflare or ngrok; it
loads one module you name; and it writes two files — the node key on first start, and the ledger
below:

```
grep -nE "createPublicClient\(|writeFile|appendFile|mkdir|import\(|async fetch\(|spawnChild\(" apps/node/src/node.ts apps/node/src/task.ts apps/node/src/node-key.ts apps/node/src/tunnel.ts packages/protocol/src/node/local-state.ts
```

prints twelve lines on 2026-11-03. Since ADR `0116` the node's two writes go through
`@arp-protocol/core/node` (`packages/protocol/src/node/local-state.ts`), so that file is in the
command: its `node:fs` imports of `appendFileSync`, `mkdirSync` and `writeFileSync` (`:12`, `:16`,
`:21`), the key file's `mkdirSync` and `writeFileSync` (`:129`, `:130`), the ledger line's
`mkdirSync` and `appendFileSync` (`:138`, `:139`), and a lock file's `mkdirSync` (`:177`), which the
sponsoring service uses and the node does not. In the node itself: the server's own inbound
`fetch(request)` handler (`task.ts:251`), your handler's import (`node.ts:142`), the RPC client
(`node.ts:150`), and the tunnel's child process (`tunnel.ts:196`). `register.ts` is not in it: it
runs only under `arp init --node`, never in the node. It printed ten lines on 2026-11-02, before
the writes moved.

**It binds `127.0.0.1`**, like the MCP server: `serveFetch` in `main()` in `apps/node/src/node.ts`
passes `hostname: '127.0.0.1'`. Until 2026-10-30 it passed none and listened on every interface,
because it was the address the agent published; the tunnel is that address now.

**One payment buys one job.** Before any work the node checks that the payment is mined and did
not revert, was sent to this agent, came from the declared requester and paid at least
`AGENT_NODE_MIN_BUDGET` — and that it has not been used before. Every accepted payment is appended
to `AGENT_NODE_LEDGER` (`~/.arp/node-payments.jsonl` by default), read back at start, and a second
presentation is a `409`. Until 2026-11-02 the default was `.arp/` in the working directory, so a
node started from another directory read an empty ledger and accepted every payment again (ADR
`0116`); a node that finds the old file there and none in `~/.arp/` refuses to start and prints the
`mv` to run. A payment whose handler failed is released, so the
requester can retry with it. One whose handler ran past `AGENT_NODE_HANDLER_TIMEOUT_MS` is a `504`,
the handler's `context.signal` is aborted, and the payment stays claimed until the handler settles,
so a retry cannot start a second job beside one still running (ADR `0116`).

Until 2026-10-30 there was no ledger: on testnet 13579 one 0.001 payment (`0xf3649dbe…`) was
presented twice and served twice. After the fix the same payment against the built node answered
`200`, then `409`, then `409` again after a restart. **The ledger starts empty**, so a payment a
node accepted before it existed is accepted once more; and deleting the file forgets every payment
in it. Keep it where the node's state lives.

**The receipt is EIP-712, and a stranger checks it in three steps** (ADR `0083`; v2 since task 44,
ADR `0101`). `POST /task` takes `verifier` and `termId` beside the payment and the requester: the
one address the receipt is for (a `ReceiptEnforcer` deployment, or the sponsoring service's
`receiptVerifier`) and the term the requester will deposit on. Without either it is a `400`. The
node answers `{ result, receipt: { format: "eip712", receipt, chainId, verifyingContract, agent,
signature } }`, where `receipt` names the agent's ERC-8004 identity, the requester, the payment, the
amount, the hashes of the payload and of the result, the time, the term, and `expiresAt`
(`AGENT_NODE_RECEIPT_TTL` after issuance). The domain is `{ name: "ARP Hire Receipt", version: "2",
chainId, verifyingContract }`, with the payment's chain and the verifier asked for; a verifier
accepts only a receipt naming it. A v1 receipt, signed before task 44 with no verifier, still
verifies in step 1 and is accepted by no sponsoring path. The layout follows x402's signed receipt
and ERC-8004's identity string.

1. `verifyHireReceipt(receipt)` (`@arp-protocol/core`) recovers the signer.
2. That signer should be the agent's: either `getAgentWallet(agentId)` on the registry
   `agentRegistry` names, for a node run with `AGENT_PRIVATE_KEY` — on 2026-10-30, testnet 13579,
   agent 2's wallet was `0x9C985BEF…` and so was the recovered key — or the `nodeAddress` of an
   endpoint binding `verifyEndpointBinding` reads as `bound`, for a node with a generated key.
3. `getTransaction(payment)` on `chainId` should show `requester` paying the agent `paid`, and
   `hireReceiptMatches(receipt, payload, result)` should hold for the JSON you sent and received.

The hashes are keccak256 over RFC 8785 canonical JSON, so step 3 needs no library of ours.

## The hook — `apps/hook`

```
cd apps/hook && bun run build      # once: writes apps/hook/dist/arp-hook.js
```

`arp init` writes this for you (`@arp-protocol/cli`, `apps/cli`): it copies the hook to
`~/.arp/bin/hook.js`, writes `~/.arp/bin/send.json` beside it (the command for the background send),
registers it on its five events (below), and backs up `settings.json` first. `arp
uninstall` takes it out again. It leaves an MCP server named `arp` that it did not write, and says so. A run that had to leave a file out, one that is not valid JSON for instance, does the rest, names the file at the end and exits 6. By hand, it is:

<!-- prettier-ignore -->
```jsonc
// your runtime's .claude/settings.json — the path is absolute, because the hook runs in your
// project and not in this one
{"hooks": {
  "PostToolUse": [{"matcher": "^(?!Skill$)", "hooks": [
    {"type": "command", "command": "bun /path/to/ARP/apps/hook/dist/arp-hook.js", "async": true}
  ]}, {"matcher": "Skill", "hooks": [
    {"type": "command", "command": "bun /path/to/ARP/apps/hook/dist/arp-hook.js", "timeout": 5}
  ]}],
  "PostToolUseFailure": [{"matcher": "*", "hooks": [
    {"type": "command", "command": "bun /path/to/ARP/apps/hook/dist/arp-hook.js", "timeout": 10}
  ]}],
  "PreToolUse": [{"matcher": "Bash", "hooks": [
    {"type": "command", "command": "bun /path/to/ARP/apps/hook/dist/arp-hook.js",
     "if": "Bash(*skills*)", "timeout": 15}
  ]}],
  "Stop": [{"hooks": [
    {"type": "command", "command": "bun /path/to/ARP/apps/hook/dist/arp-hook.js", "timeout": 10}
  ]}],
  "SessionEnd": [{"hooks": [
    {"type": "command", "command": "bun /path/to/ARP/apps/hook/dist/arp-hook.js", "timeout": 5}
  ]}]
}}
```

Both `PostToolUse` events, because a failed call reaches only `PostToolUseFailure`. `PreToolUse` is
waited on, not `async`, because only a waited-on hook can answer before the command runs; its `if`
rule keeps every other `Bash` call from starting it at all. `PostToolUseFailure` is waited on
too, since task 99, so the hook can answer a skill's failure (below); any other failed call it
records and leaves at once. `PostToolUse` has two rows: every tool but `Skill` in the background,
and `Skill` waited on, because there the hook answers: once per skill in the session it asks the
model to end its final reply with one closed line, whether the skill did its job (an async answer
would reach the model a turn late). `Stop` reads that line and prints nothing, so it never continues
the turn; it is waited on so `claude -p` does not cancel it at exit (ADR `0169`, ADR `0179`). While
sharing is undecided, the first skill with a public source also carries one question for the person,
whether to share that result, and `Stop` reads the answer line, `arp-share: once|always|no`, from a
later message of the same session. `SessionEnd` starts `arp share send --auto` detached when sharing is
on or was agreed once that session, and returns at once; by hand, set `ARP_CLI` to the CLI's `cli.js`
so the hook can find it (task 126, ADR `0191`). Grok Build reads this same
file and sends camelCase keys, which the hook also reads (`apps/hook/src/payload.ts`).

It fires on every tool call and appends one line to `.arp/session.jsonl` (or `ARP_SESSION_LOG`)
for a skill or an MCP call, and nothing for anything else. It reads `.arp/receipts.jsonl` (or
`ARP_RECEIPTS`) to name the atom of a skill you fetched through an MCP server, the skills CLI's lock
files (`~/.agents/.skill-lock.json`, and `skills-lock.json` in your project) to name where a skill was
installed from, and your MCP
configuration (`~/.claude.json`, `.mcp.json`) to name an MCP server by its URL or its npm or PyPI
page. A script, a local path or localhost names nothing. **A configured URL can hold a key**, so
the hook drops its query, fragment and `user:pass@`, and keeps only the origin when a path segment
looks like a token (long, letters and digits mixed). The first time it creates `.arp/` it writes
`.arp/.gitignore` containing `*`, so your repository does not commit the log by accident.

Per call it writes the call id, an outcome (`ok`, `tool_error`, `auth`, `timeout`, `unreachable`,
`payment_required`, `payment_refused` or `paid_no_delivery`; the last three are x402's, and
`payment_required`, the ordinary first `402`, is not a failure; task 125), at most a status code such as `401`, the duration the runtime measured, and **the size
of the response, never its content, its arguments or the error's text**. A response can hold a key
or a file, and this log later feeds a declaration. A call you cancel is not written.

**Before a skills install it reads GitHub** (task 98, ADR `0167`). On `PreToolUse`, for a `Bash`
command that runs the `skills` CLI's `add` (`npx skills add`, `npx -y skills@<version> add`,
`bunx`, `pnpm dlx`, `yarn dlx`, `npm exec`, and the aliases `a`, `install`, `i`), it reads what the
install would take and shows it to you before the command runs, and to the agent beside the command's
result, in the order of the questions a person asks (task 112, ADR `0182`): what it asks for (keys),
the paid services it names, what must be installed, what it runs, the hosts it names and any hidden
text, from the skill's own files, as facts. It makes
no permission decision and blocks nothing. At most three skills are read, within six seconds, from
two hosts:

```
api.github.com              the repository's file list and its figures (stars, last push, archived).
                            Two requests per install, counted against GitHub's 60 an hour without a token
raw.githubusercontent.com   the SKILL.md files that name the skill (up to 12 others, nearest its name first,
                            when its directory does not carry its name), up to five scripts it runs (256 KB
                            each, 512 KB in all, none under an examples or assets directory; task 113), and
                            since task 112 up to 80 other text files of the skill's directory (no font,
                            image or sound), at the default branch's HEAD, until 1.5 s before the six
                            seconds end
```

**What leaves your machine is the repository and skill names the command already carries**, sent to
GitHub, which the install itself is about to clone from. Not your words, not your files, and
nothing else of the command. `GITHUB_TOKEN`, or `GH_TOKEN` when it is unset, is sent to
`api.github.com` only. A GitLab, `git@`, local or direct-download source is named and not read, so
it makes no request. Every other command makes none, and so does every other event but one,
below.

**After a skill fails it reads the Intuition graph** (task 99, ADR `0168`). On
`PostToolUseFailure`, when a command a skill asked for fails for a closed reason (`missing-program`,
`missing-key`, `missing-file`) and the hook writes that failure to `~/.arp/failures.jsonl`, it then
reads that skill's lines from the Intuition graph of testnet 13579 (`INTUITION_GRAPHQL_URL`
overrides it) and hands them to the agent beside the error: how many wallets wrote `failed` and what
they named as missing, how many wrote `worked` and with what. It sends the skill's atom URI, a hash
of its public GitHub address, and the four words `has outcome`, `because`, `needs`, `with`: never the
command, its output, a path, the session or your words (`apps/hook/test/failure-answer.test.ts`
checks every request body). The graph sees your IP address, the time, and which skill that is, and
since the read happens only on a failure, it can infer that this skill just failed here, though
never why. At most once per session, skill and reason, within three seconds, and silent when it
fails. A skill with no `owner/repo` source is not read. `ARP_FAILURE_LINES=off` stops it.


The bundle has three request sites to those two hosts, and a command lists them:

```
cd apps/hook && bun run build && grep -oE "(get|fetch)\(\`https://[a-z0-9.-]+" dist/arp-hook.js | sort | uniq -c
```

prints `2 get(\`https://api.github.com` and `1 get(\`https://raw.githubusercontent.com` on
2026-11-10. `get` is `githubPulseSource`'s name for `fetch` (`packages/protocol/src/pulse.ts`),
which is why the check written here before task 98, `grep -cE "fetch\(|createPublicClient\("`,
no longer proves anything: it prints `1` on 2026-11-10, and that one hit is the graph client's
`globalThis.fetch`, the fourth request site, which only the read after a skill's failure reaches and
whose URL is the graph's, not a literal. A payload it cannot parse exits `0` and writes
nothing, so a hook never blocks the tool call it is watching.
