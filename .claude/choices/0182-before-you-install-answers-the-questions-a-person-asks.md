# 0182 — Before you install answers the questions a person asks, in the content column

**Status:** Accepted (the user approved the design, 2026-11-10)
**Date:** 2026-11-10
**Triggered by:** `docs/tasks/112-before-you-install.md`; the user on the hyperframes skill page,
2026-11-10: « pas assez complet, très mal placé, je veux un document utile »; then the agent page's
Identity, Contains and x402 Trust Index cards, the same day.

## Context

Task 96 (ADR `0165`) showed a skill's readings as they were computed: Programs, Keys, Scripts, Fetch
and run, Domains, Hidden text, Not read. On `heygen-com/hyperframes`'s `hyperframes` skill that read
"Not read: 6 files" (six fonts), "Keys: BEARING, CENTER, CHROME, COUNTRIES, DUR, FPS +16" (22
environment names, the three secrets behind the `+16`) and "Programs: node" for a skill whose scripts
drive a headless Chrome through `puppeteer-core` (`scripts/bake-basemap.mjs:43`) and run `ffmpeg`
(`:280`) and `ffprobe` (`scripts/locate.mjs:39`), at commit `b4c7f9c`. The panel was low in the facts
column. The agent page had the same reading as a third card beside Identity and a conditional x402
Trust Index card, which moved what was under it.

## Decision

1. **Organised by the question, not the reading.** What will it ask me for (secrets by their name, and
   names SKILL.md says to set; other settings one count); does it cost money (services that bill by
   use, from a committed table, matched on a host or a key's prefix); what must I have installed (now
   also a program a script runs, a package that drives one, and a line saying one is needed); what it
   runs (scripts, on demand; fetch-and-run first when present); where it sends data (API hosts named;
   fonts, CDNs and map tiles counted; other sites counted); anything hidden (only when present). Not
   read lists only skipped text files, with why. One summary line leads.
2. **One module says it everywhere.** `packages/protocol/src/before-install.ts` gives the site's panel,
   the hook's message before `npx skills add`, `arp_pulse` and `arp_get_skill` the same answers in the
   same order (`contentsLines`). Facts, never a verdict; a host or a service is one the files name, not
   one shown to be called.
3. **In the content column, under the name, before the description.** `ui.md` puts content left and
   facts right. What a person decides on before letting an agent install a skill, or before calling an
   agent, is content: it is the page's answer to why the reader came. Classification, outside signals
   and identity stay in the facts column. This placement is deliberate and is not a precedent for
   moving facts left.
4. **The agent page: two cards, not three.** "Before you call" leads the content column (endpoints,
   speaks, answered, payment, auth; x402 Doctor's verdicts inside the Payment row, credited with their
   licence). Identity alone in the right column says who the agent is and who operates it (operator,
   registration file linked, where it is registered, the graph, URL, CAIP-19). Every row is present
   from the first paint, holding "…" while loading and "—" or "not read" when there is no reading,
   and the x402 Trust Index is one line in the Payment row that opens on its verdicts, so the
   description and the tabs under the section do not move. A skill's optional rows (code fetched and
   run, hidden text, unread files) can only add to the height once the reading lands.
5. **Before an install, the hook reads the skill's directory.** `readPulse` takes a depth: a search
   still reads `SKILL.md` and the scripts it runs; before an install it also reads up to 80 text files
   of the skill's directory from `raw.githubusercontent.com` (not on the hourly quota), stopping 1.5 s
   before the six-second budget. Read without them, hyperframes answered "no keys · nothing to install
   named": the files the install is about to download anyway are where the answers are. What leaves
   the machine is unchanged: the repository and skill names, to the host the install uses.

## Alternatives considered

- **Keep the readings' order and fix each list** — the user rejected the order itself: a person asks
  what it costs and what it needs, not which regex matched.
- **Mark a service "paid" from the files' own words** (`pricing`, `credits`) — a word is not a bill;
  a committed table of services that bill by use can be checked line by line.
- **Keep the panel in the facts column, higher** — it is the longest card there and the first thing a
  person decides on; it reads as content.
- **Keep the x402 Trust Index as its own card, shown always** — "not read" on most agent pages is noise,
  and its one question is what the agent asks for, which the Payment row already answers.
- **Read the whole directory in `arp_pulse` too** — a search of five results would fetch hundreds of
  files from the user's machine; it says "N files not read" instead.

## Consequences

**Positive:**
- On hyperframes the line reads "3 keys · 2 paid services · needs Chrome, ffmpeg, ffprobe, node · 6
  scripts", each fact linked to its line.
- An agent and a person read the same answers, in the same order.

**Negative:**
- The service table and the program table are hand-kept: a service absent from it shows as a host.
- "Said to be needed" reads prose; a sentence a reader would not call a requirement can match, which is
  why each one carries its line.
- A search (`arp_pulse`) still covers less than an install check, and says so in its summary.

## References

- Related rules: `.claude/rules/ui.md` (layout, hints, no explanatory sentence), `.claude/rules/claims.md`
- Related ADRs: `0165` (the reading), `0167` (the hook before an install), `0170` (outside signals),
  `0164` (the agent page), `0104` (the skill page's columns)
