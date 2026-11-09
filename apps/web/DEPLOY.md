# Deploying the site on Coolify

The web app is a static build served by nginx, from `apps/web/Dockerfile`. Task 74.

## Before it goes online

The legal pages hold `[… À COMPLÉTER]` placeholders (`src/services/legal.ts`): the editor's name,
address, phone and e-mail, the publication director, the host, and how long the host keeps its logs.
Fill them, then build with `VITE_PUBLIC_RELEASE=1`: that build **fails** while one placeholder is
left, or while `VITE_SITE_URL` is unset.

## Coolify settings

| Setting | Value |
| --- | --- |
| Source | the Git repository, branch `main` |
| Build pack | **Dockerfile** |
| Base directory | `/` (the repository root: the build reads `packages/` and `data/`) |
| Dockerfile location | `/apps/web/Dockerfile` |
| Ports exposes | `80` |
| Domain | your domain, `https://…` |
| Health check | path `/`, port `80` (the image also has its own `HEALTHCHECK`) |

The build context is the whole repository; `apps/web/Dockerfile.dockerignore` keeps it small
(no `node_modules`, no `contracts/lib`, no `.env`). BuildKit, Docker's default builder since Docker 23, reads that file.

## Variables

Every `VITE_*` value is read **at build time** and written into the bundle, so in Coolify each one
is a **build variable** ("Build Variable?" ticked), and changing one needs a rebuild. None is a
secret: everything here ends up in public JavaScript.

| Variable | Required | What it does | When unset |
| --- | --- | --- | --- |
| `VITE_PUBLIC_RELEASE` | **yes, `1`** for the public site | refuses the build while a legal placeholder is left or `VITE_SITE_URL` is unset | no check: fine locally, not for the public site |
| `VITE_SITE_URL` | **yes** | the site's address, `https://example.org`, no trailing slash. Writes `sitemap.xml`, the `Sitemap:` line of `robots.txt`, the canonical link and the Open Graph URL and image | no sitemap, no canonical, no `og:image` |
| `VITE_ALLOW_MAINNET` | no, leave unset | `1` brings back the switch to Intuition mainnet, where a deposit spends real TRUST | testnet only, and the header says "Testnet · test money" |
| `VITE_WALLETCONNECT_PROJECT_ID` | no, leave it unset | a WalletConnect (Reown) project id, for mobile wallets. This build does not ship `@walletconnect/ethereum-provider`, so the connector cannot load, and the privacy and cookies pages do not cover it: set it only after adding the package and re-checking both pages | browser-extension wallets only |
| `VITE_INTUITION_TESTNET_RPC_URL` | no | the testnet RPC | `https://testnet.rpc.intuition.systems/http` |
| `VITE_INTUITION_TESTNET_EXPLORER` | no | the testnet explorer | `https://testnet.explorer.intuition.systems` |
| `VITE_ARP_API_URL` | no | ARP's facts API (`apps/api`), for fresh install and star counts | the copy bundled with the build, dated |
| `VITE_ARP_ACTIVITY_URL` | no, leave unset | the local activity feed of one machine | no feed; the start steps show no tick |
| `VITE_ARP_SPONSOR_URL` | no, leave unset while the sponsor is not hosted | ARP's sponsoring service, for adding a tool without a wallet | the sponsored form is hidden; "Add it with a wallet" stays |
| `VITE_ARP_SPONSOR_ADDRESS` | no | the sponsor's address, to read Signals | the one in `data/deployments/13579.json` |
| `VITE_MAX_STAKE_TRUST` | no | the most one deposit from the site may send | 1 |

`VITE_INTUITION_TESTNET_CHAIN_ID` appears in `.env.example` and is read by nothing here.

## Check it locally

From the repository root:

```bash
docker build -f apps/web/Dockerfile -t arp-web --build-arg VITE_SITE_URL=http://localhost:8088 .
docker run --rm -p 8088:80 arp-web
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8088/agents     # 200: a deep link reloads
curl -s http://localhost:8088/robots.txt
```

Any address that is not a file gets `index.html`, so a reload on `/agents` or `/atom/0x…` opens the
app, and the app answers an unknown address with its own 404 page. A missing file under `/assets/`
is a real 404.

## What the site does not run

The sponsoring service, the content server and the activity feed run on one machine and are not
hosted (`docs/31_HOW_IT_WORKS.md`). Nothing on the site needs them: steps that would are hidden
while their variable is unset.
