# Task 112 — "Before you install": the contents panel answers the questions a person asks

**Status:** in progress.
**ADR:** `0182`.
**Rules:** `code.md`, `ui.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`. No atom, triple or contract.

## Why

The user, 2026-11-10, on `github.com/heygen-com/hyperframes?skill=hyperframes`: task 96's Contains panel
said "Not read: 6 files" (six `.woff2` fonts, skipped as binary), "Keys: BEARING, CENTER, CHROME,
COUNTRIES, DUR, FPS +16" (22 settings in alphabetical order, the three real keys behind the `+16`) and
"Programs: node" for a skill that renders video with a headless Chrome and ffmpeg. It sat low in the
facts column. His words: « pas assez complet, très mal placé, je veux un document utile ».

Then, the same day, the agent page: its Identity, Contains and x402 Trust Index cards must answer what
a visitor needs before calling or hiring an agent, without repeating one another, placed so the page's
arrangement holds (« on doit avoir un agencement qui n'est pas cassé »).

## The questions, and where each answer comes from

A skill, before it is installed. Each answer is read from the skill's own files; facts, never a verdict.

| Question | Row | Read from |
| --- | --- | --- |
| What will it ask me for? | **Asks for** | names shaped like a secret (`…_API_KEY`, `…_KEY`, `…_TOKEN`, `…_SECRET`, `…_PASSWORD`, `…_CREDENTIALS`) found outside its tests, and names its SKILL.md tells you to set (`export X=`). Every other setting is one muted count |
| Does it cost money? | **Paid services** | a committed table of services that bill by use (`packages/protocol/src/before-install.ts`), matched on a host the files name or a key's prefix (`GEMINI_API_KEY` → Google Gemini) |
| What must I have installed? | **Needs** | SKILL.md's declared and run commands, a script's interpreter, what a script probes for, a program a script runs (`execFileSync("ffmpeg"`, `subprocess.run(["x"`), a package that drives one (`puppeteer-core` → Chrome), and a line that says it is needed (`Needs … ffmpeg, a Chrome`) |
| What does it do on my machine? | **Runs** | the number of scripts it ships, listed on demand; code fetched and run is the first line when present |
| Where does it send data? | **Sends to** | API hosts by name; fonts, CDNs and map tiles as one count; other sites named as one count |
| Anything hidden? | **Hidden** | only when present |
| — | **Not read** | only text files the reading skipped, with why (too large, over the file limit, not fetched). A font, an image or a sound is not a file anybody reads |

A one-line summary leads ("3 keys · 2 paid services · needs Chrome, ffmpeg, ffprobe, node · 6 scripts").
The same structure is what the agent is given before an install (task 98's hook, `arp_pulse`,
`arp_get_skill` and its dialog), through `contentsLines`.

## The agent page: proposal

**Before**, from `apps/web/src/pages/AgentTrustPanel.tsx`: the header (eyebrow, sigil and name, the
contexts its lines name); then a grid. Left: the description, then the tabs (Capabilities,
Endpoints, Ratings, Not read). Right, across both rows: **Identity** (Owner, Registration file as an
unlinked summary, CAIP-19, Registry, Token id, Intuition, URL), **x402 Trust Index** (rendered only
when x402 Doctor's reading covered one of its hosts, so the card under it moved), **Contains**
(Endpoints, Protocols, x402, Auth, Answers). Then the market, the declaration card, Relations.

What was wrong with it:

- Contains repeated the Endpoints tab and the Trust Index, under a skill's word: an agent is called,
  not installed.
- The Trust Index card appeared or did not, and moved what was under it.
- Identity put "who operates it" at the weight of the plumbing, and its registration file, the one
  document everything else is read from, was not a link.

**After**, two cards, no third:

1. **Before you call**, in the left column, under the name and before the description, as the skill
   page's Before you install. A visitor about to call or hire an agent asks: can I reach it, does it
   speak my protocol, did it answer when somebody checked, what does it ask for (payment, auth). One
   summary line ("3 endpoints · A2A, MCP · x402 payment asked · no auth named · answered", the reading's
   date beside the label), then the rows **Endpoints**
   (count and hosts; the per-endpoint detail stays in the Endpoints tab), **Speaks**, **Answered**,
   **Payment** (x402 declared or not, and x402 Doctor's verdict on its endpoints when its reading
   covered them, one line that opens on the verdicts and the credit) and **Auth**. Every row is there
   from the first paint ("…" while loading, "—" with no document), so
   nothing moves when a reading arrives or covers nothing.
2. **Identity**, alone in the right column: who is this agent and who operates it. **Operator** (the
   owner wallet, linked; it is the wallet that may declare for the agent) and **Registration file** (the
   document every answer is read from, linked) lead; **Registered** (chain, registry and token id in one
   line), **Intuition**
   and **URL** follow, CAIP-19 last.

The x402 Trust Index card goes: its rows are the Payment row. What the agent declares about itself
stays the sigil and the Capabilities tab, which neither card repeats.

Why the left column: ui.md puts content left and facts right. What a visitor decides on before calling
or installing is content; who registered it and where are facts (ADR `0182`). On a phone the order is
the name, Before you call, the description, Identity, then the tabs.

## Deliverables

1. `packages/protocol/src/skill-needs.ts` (file readings: keys with their line, programs a script runs,
   packages that drive a program, lines that say a program is needed) and
   `packages/protocol/src/before-install.ts` (the service and host tables, the question view, the
   summary, `contentsLines`), tested.
2. `skill-contents.ts`: `keys`, programs with where they were found, "too large" kept apart from "not
   fetched".
3. Web: `BeforeInstall` on the skill page (left column, before the description) and on `/pulse`; the
   facts column loses Contains. Agent page as proposed above.
4. A new dated reading (`scripts/measure/skill-contents.ts`) and the bundle rebuilt.
5. `packaging/` regenerated.

## Do not do in this task

Touch `apps/hook/src/worked.ts` or `apps/cli/src/install/edits.ts` (task 109); fix the false programs
task 110 fixes; block an install; deploy, publish or push.

## Gates

`packages/protocol` test and lint; `apps/mcp` test and lint; `apps/hook` test and lint; `apps/web`
`bunx tsc -b`, `bun run lint`, `bun run test`, `bun run check:tokens`; `apps/cli` test, `check:node`,
`packages --check`; root `bun run check` and `bun run test:scripts`. `ui-reviewer` (skill and agent
pages at 1280 and 390 px) before `task-verifier`.
