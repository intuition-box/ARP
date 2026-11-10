# apps/preview

One static page where people ask for preview access to ARP. No build, no dependency: `index.html`
is the whole thing. Sign-ups go to a Tally form embedded in the page; this repo stores none of them.

## The form

Tally form `laqJGN` (https://tally.so/r/laqJGN), dark theme, embedded in `index.html`. Its fields:

| field | type | required |
| --- | --- | --- |
| Email | email | yes |
| GitHub username | short text | yes |
| Which agent do you use most? | multiple choice: Claude Code, Cursor, Gemini CLI, Codex, other | yes |
| Operating system | multiple choice: macOS, Linux, Windows | yes |
| How often do you install skills or MCP servers? | multiple choice: weekly, monthly, rarely | no |
| I understand this is a preview on testnet, not a release, and that a line I write is public and permanent | checkbox | yes |

The answers live in Tally, under the account that owns the form. The page promises the list is
deleted when the round ends.

## Publish

`.github/workflows/preview-page.yml` uploads `apps/preview/` to GitHub Pages on every push to `main`
that touches it, or by hand from the Actions tab. Pages must be enabled once by a repository admin:
Settings, Pages, Source: GitHub Actions. The page is then at https://intuition-box.github.io/ARP/.
