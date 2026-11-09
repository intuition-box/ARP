# The nav: the coin

**For:** Claude Code. **Replaces:** `app/src/components/brand/NavSplit.tsx` in `Layout.tsx`. **Reference:** `nav-coin-reference.html` (open it in a browser: the bar at the top is live, scroll down and up). **Code:** `code/`, built and tested on `feat/agent-panel-tabs` at `b5682d9`.

Chosen by the user on 2026-11-09 after an animated nav (rejected), three static proposals and two mixes. **It replaces ADR 0057 §3's centred mark**: write an ADR that records why (the centred mark split the bar into two unequal halves).

---

## 1. What it is

```
 ╭──╮──────────────────────────────────────────────────────────────────────╮
 │◉ │        [● Agents | Tools | Activity | Search | Docs]     [Get started] [TESTNET] │
 ╰──╯──────────────────────────────────────────────────────────────────────╯
                       Agents / Base 8453 / vault-auditor · agent
```

| part | what |
|---|---|
| **the coin** | The Source mark in a circle set into the bar's left corner, a little taller than the bar. Same background and border as the bar; its outline runs straight into the bar's (one shape). It links home |
| **the track** | Agents, Tools, Activity, Search, Docs, in one segmented track **centred in the bar**. The current tab is the filled segment with the Saffron dot |
| **the end** | Get started (outlined button) and the chain toggle, at the right end |
| **the path line** | Under the bar, centred, mono: where you are in the graph (`Agents / Base 8453 / vault-auditor · agent`). Each page fills it; a page that does not shows none |

**No animation**, except one: the retract on scroll below.

## 2. Measurements

| | desktop | phone (component under 860px wide) |
|---|---|---|
| header padding | 20 22 14 26 | 16 12 12 18 |
| bar | height 58, radius 14, padding-left 64, border `--color-rule-strong`, background `--color-bg`, max width 1320 | height 52, padding-left 54 |
| coin | 80 × 80, left −14, vertically centred, same border and background | 64 × 64, left −10 |
| mark | `SourceMark size={56}` (two rings) scaled to **76 px** | scaled to **61 px** |
| seam | top 11, left 39, 44 × 56, background `--color-bg` | top 6, left 31, 33 × 50 |
| track | gap 10, padding 4 6, radius 10, background `--color-ground`, border `--color-rule` | folds to the current tab only |
| tab | height 32, padding 0 18, radius 7, 13.5 px / 500, `--color-steel`; hover `--color-fg`; current `--color-raised-2` + `--color-fg` + 6 px Saffron dot | height 30, padding 0 10 |
| Get started | height 40, padding 0 14, radius 9, border `--color-rule`, `--color-silver`; hover border `--color-rule-strong`, `--color-fg` | in the menu |
| path line | mono 11.5 px, padding-top 18, centred; links `--color-silver`, current `--color-fg` 500, separators `--color-grey` | left aligned, one line, clipped |

**The seam** is a block of the bar's background inside the coin, under the mark, that hides the coin's right arc between the bar's top and bottom edges. Its box is measured against the sizes above (the bar's edges cross the 80 px circle at y = 11 and y = 69). Change a size, re-measure the seam.

## 3. Behaviour

- **Retract on scroll down.** Past 140 px, scrolling down folds the bar back into the coin (width transition 380 ms, `--ease-out-quart`), hides the track, the end and the sheet, and fades the seam so the circle closes. Scrolling up expands it. Pressing the coin while retracted expands it instead of going home (its label becomes "Show the navigation"). Jitters under 6 px are ignored. **The path line is hidden with `visibility`, never `display: none`**: a header that changes height shifts the scroll position, which reads as a scroll up and expands the bar again, in a loop.
- **Phone.** The track shows only the current tab; Get started and the chain fold into a **Menu** button. The sheet under the bar lists the five tabs, Get started, then the chain. It opens without motion, moves focus to the current tab, closes on Escape (focus back to Menu) and on any route change.
- **Current tab** uses the existing `SECTION_PATHS` rule from `NavSplit.tsx`: `/agent/8453/6649` belongs to Agents, `/agent` and `/agent/import` to "Your agent".
- **Reduced motion:** the retract switches without transition.
- **Keyboard:** every tab, the coin, Get started, the chain and Menu are real links or buttons; `aria-current="page"` on the current tab, `aria-current="location"` on the last step of the path line.

## 4. The code (`code/`)

| file | what |
|---|---|
| `app/src/components/brand/NavCoin.tsx` | `NavCoin` and `NavTrailProvider` |
| `app/src/components/brand/nav-coin.ts` | `isCurrentSection`, `useRetractOnScroll`, `RETRACT_AFTER_PX` |
| `app/src/components/brand/nav-trail.ts` | `useNavTrail(steps, kind?)` for pages, `TrailContext` |
| `app/src/components/brand/__tests__/nav-coin.test.tsx` | current tab, the sheet and Escape, the path line, retract and expand |
| `app/src/index.css` | the `.arp-coin*` block (also as `files/nav-coin.css`), inserted before the manifesto section |

`git apply code/nav-coin.patch` from the repo root, or copy `code/files/`. On `b5682d9`: `tsc -b`, `eslint`, `prettier --check`, `check:tokens` and the full suite (516 tests) pass, and the component was rendered in Chromium at 1280 and 390 px, expanded and retracted.

## 5. Wiring it (your repo is ahead of `b5682d9`, so do this against the current `Layout.tsx`)

```tsx
<NavTrailProvider>
    <div className="flex min-h-screen flex-col">
        <NavCoin
            tabs={[
                {to: "/agents", label: "Agents"},
                {to: "/tools", label: "Tools"},
                {to: "/activity", label: "Activity"},
                {to: "/search", label: "Search"},
                {to: "/docs", label: "Docs"},
            ]}
            start={{to: "/start", label: "Get started"}}   // the real route
            end={<ChainToggle />}
        />
        <main>…</main>
    </div>
</NavTrailProvider>
```

Then, in each deep page, one line, for example on an agent:

```tsx
useNavTrail([{label: "Agents", to: "/agents"}, {label: `Base ${chainId}`}, {label: name}], "agent");
```

and on a skill: `[{label: "Tools", to: "/tools"}, {label: domain, to: domainHref}, {label: skillName}]`, `"skill"`.

## 6. To check in your current repo

- **The wallet.** Your screenshot has no Connect button, so `end` holds only the chain. If the wallet stays somewhere, `WalletConnect` goes in `end` after the chain.
- **`NavSplit.tsx`** is still imported for `SECTION_PATHS`. When nothing else uses `NavSplit`, move `SECTION_PATHS` into `nav-coin.ts` and delete the old component and its notes, keeping `nav-sections.test.ts`.
- **The ADR**: record that the mark left the centre, and why.
