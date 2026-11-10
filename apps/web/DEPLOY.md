# Deploying the site, the sponsor and the MCP endpoint on Coolify

One Coolify project, three applications: the web app, a static build served by nginx from
`apps/web/Dockerfile` (task 74), ARP's sponsoring service from `apps/sponsor/Dockerfile` (task
78, ADR `0149`), and the hosted read-only MCP endpoint from `apps/mcp/Dockerfile` (task 92, ADR
`0161`). The last two have their own sections, [The sponsor](#the-sponsor) and
[The MCP endpoint](#the-mcp-endpoint).

## Before it goes online

Nothing to fill. The legal pages identify nobody for now (the user, 2026-11-09): they say the site
is published by a private individual on a non-professional basis, and contact goes through GitHub
issues. The five `VITE_LEGAL_*` variables below are optional and never in git; one that is set adds
its line, one that is not leaves it out. No build is blocked by them.

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
| `VITE_PUBLIC_RELEASE` | **yes, `1`** for the public site | refuses the build while `VITE_SITE_URL` is unset | no check: fine locally |
| `VITE_LEGAL_HOST_NAME` | no | the host's name; with it, the legal notice adds a Host section and the LCEN anonymity sentence | no Host section |
| `VITE_LEGAL_HOST_ADDRESS` | no | the host's postal address, under its name | left out |
| `VITE_LEGAL_HOST_PHONE` | no | the host's phone number, under its name | left out |
| `VITE_LEGAL_CONTACT_EMAIL` | no | a contact e-mail, on the legal notice, privacy, accessibility and contact pages | contact goes through GitHub issues |
| `VITE_LEGAL_LOG_RETENTION` | no | how long the server keeps its request logs, as a phrase: `for 30 days` reads "It is kept for 30 days, then erased." | the sentence is left out |
| `VITE_SITE_URL` | **yes** | the site's address, `https://example.org`, no trailing slash. Writes `sitemap.xml`, the `Sitemap:` line of `robots.txt`, the canonical link and the Open Graph URL and image | no sitemap, no canonical, no `og:image` |
| `VITE_ALLOW_MAINNET` | no, leave unset | `1` brings back the switch to Intuition mainnet, where a deposit spends real TRUST | testnet only, and the header shows no chain control |
| `VITE_WALLETCONNECT_PROJECT_ID` | no, leave it unset | a WalletConnect (Reown) project id, for mobile wallets. This build does not ship `@walletconnect/ethereum-provider`, so the connector cannot load, and the privacy and cookies pages do not cover it: set it only after adding the package and re-checking both pages | browser-extension wallets only |
| `VITE_INTUITION_TESTNET_RPC_URL` | no | the testnet RPC | `https://testnet.rpc.intuition.systems/http` |
| `VITE_INTUITION_TESTNET_EXPLORER` | no | the testnet explorer | `https://testnet.explorer.intuition.systems` |
| `VITE_ARP_API_URL` | no | ARP's facts API (`apps/api`), for fresh install and star counts | the copy bundled with the build, dated |
| `VITE_ARP_ACTIVITY_URL` | no, leave unset | the local activity feed of one machine | no feed; the start steps show no tick |
| `VITE_ARP_SPONSOR_URL` | no; set it once the sponsor is up, `https://<SPONSOR_PUBLIC_HOST>` | ARP's sponsoring service, for adding a tool or a category without a wallet | the sponsored form is hidden; "Add it with a wallet" stays |
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

## The sponsor

ARP's sponsoring service pays the fees of an agent that starts with nothing, and writes a line in
its name. It holds **ARP's testnet treasury key** and signs with it automatically, so this section
is mostly about what bounds the loss. **Testnet 13579 only**: it refuses to start on any other chain.

### Its own key, never the deployer's

The hosted sponsor signs with **a key of its own, used for nothing else**. Not ARP's deployer key:
that one also deployed on mainnet 1155 and holds real TRUST there. Create the key on your machine;
the command writes it to a file of mode 600 and prints only its address:

```bash
cd apps/sponsor && bun -e "import {loadOrCreateKeyFile} from '@arp-protocol/core/node'; import {privateKeyToAccount} from 'viem/accounts'; const {key, created} = loadOrCreateKeyFile(process.env.HOME + '/.arp/sponsor-hosted.key'); console.log(created ? 'created' : 'exists', privateKeyToAccount(key).address)"
```

That address goes in two places, in the release that ships with it: `arp.sponsor` in
`data/deployments/13579.json`, and `ARP_DOMAIN_ATTESTORS` in `packages/protocol/src/arp/attestors.ts`
(the categories it files). The line payers follow: they are read from `arp.deployer` and
`arp.sponsor` together.

### Coolify settings

| Setting | Value |
| --- | --- |
| Source | the Git repository, branch `main` |
| Build pack | **Dockerfile** |
| Base directory | `/` |
| Dockerfile location | `/apps/sponsor/Dockerfile` |
| Ports exposes | `3200` |
| Domain | `https://<SPONSOR_PUBLIC_HOST>` |
| Health check | path `/`, port `3200` (the image has its own `HEALTHCHECK`) |
| **Consistent Container Names** | **on**. Coolify then stops the old container before it starts the new one. A rolling update would run two sponsors on one ledger for a moment, and the ledger's lock cannot see a process in another container |
| **Persistent storage, volume** | a volume mounted on **`/data`**. The ledger (`sponsor-ledger.jsonl`) and the category log live there. Without it every redeploy starts from an empty ledger, and an empty ledger sponsors every proof a second time |
| **Persistent storage, file mount** | destination `/run/secrets/sponsor.key`, content: the key file's one line. Never in the image, in git or in an environment variable |
| Replicas | one. Never scale it out |

The file mount's content is kept by Coolify, in its database and on the server's disk. That is the
exposure this key accepts; the next section is what bounds it. The service refuses a key file its
group or others can read, and a mounted file often is, so the entrypoint copies the key to
`/dev/shm` (memory) with mode 600 unless the mounted file is already 600 and owned by the
container's user. The mounted file must be readable by that user, uid 1000.

### Variables

Set at run time (not build variables). `SPONSOR_LISTEN=0.0.0.0` and `ARP_HOME=/data` are already set
by the image.

| Variable | Required | What it does |
| --- | --- | --- |
| `SPONSOR_KEY_FILE` | **yes**, `/run/secrets/sponsor.key` | where the mounted key is. The name of a file, never the key |
| `SPONSOR_PUBLIC_HOST` | **yes** | the sponsor's host name, `sponsor.example.org`: no scheme, no port. The service answers that `Host` and its loopback names, nothing else |
| `SPONSOR_DEPOSIT_WEI` | **yes** | one sponsored deposit, in wei. No default |
| `SPONSOR_APPROVAL_GAS_WEI` | **yes** | the gas sent for an agent's approval, in wei. No default |
| `SPONSOR_REGISTRIES` | **yes** | the ERC-8004 registries it accepts, `eip155:13579:0x…`, comma-separated |
| `SPONSOR_ALLOWED_ORIGINS` | yes, for the site | the site's origin, `https://example.org`, so its forms can call `/list-tool` and `/propose-category` |
| `SPONSOR_DAILY_BUDGET_WEI` | no | everything it pays in a UTC day; default 1 tTRUST (`10^18`) |
| `INTUITION_PIN_API_KEY` | no | turns on `/identity`, `/publish` and listings. A secret: tick "Is secret?" |
| `SPONSOR_MINT_GAS_WEI` | no | turns on `/mint-gas` for agents that start with nothing |
| `SPONSOR_CONTENT_SIGNERS` | no | the content servers whose receipts unlock a deposit |
| `GITHUB_TOKEN` | no | raises GitHub's limit of 60 requests an hour, for listing checks. A secret |

The per-address and per-day caps (`SPONSOR_LINES_PER_DAY` and the rest) keep their defaults;
`apps/sponsor/src/main.ts` lists them. `GET /` answers the address, the limits and what is on.

### What bounds a loss

| If… | the loss is bounded by |
| --- | --- |
| a request abuses the service, the key safe | the caps and the **daily budget**: 1 tTRUST a day by default, counted in the ledger on the volume |
| the server or Coolify is compromised, the key taken | **the address's balance, and nothing else**: the caps live in the service, a stolen key ignores them. Keep a few days of budget on it, 3 tTRUST or less, and top it up from a wallet that is not on the server |
| the key is taken | also: it can file categories as one of ARP's attestors until its address leaves `ARP_DOMAIN_ATTESTORS` |

### Rotating the key

When the key may have been seen, or on a schedule:

1. Create a new key with the command above, on your machine.
2. Put its address in `arp.sponsor` and `ARP_DOMAIN_ATTESTORS`. Leave the old address in the
   attestors only if it was not compromised: its categories stay in the index while it is listed.
3. Replace the file mount's content, fund the new address, redeploy. Keep the volume: the ledger is
   keyed by what was paid for, not by the key.
4. Move what is left on the old address to a wallet that is not on the server.

### Testers' plugin and CLI

The plugin, `arp line` and `arp share send` reach the sponsor at `ARP_SPONSOR`, and default to
`http://127.0.0.1:3200`. Until a release changes that default, a tester sets
`ARP_SPONSOR=https://<SPONSOR_PUBLIC_HOST>`.

## The MCP endpoint

ARP's MCP server, read-only, for a marketplace or an agent that points at a URL instead of installing
anything (task 92, ADR `0161`). It serves `arp_pulse`, `arp_tool_reputation` and `arp_agent_endpoints`
on **testnet 13579**, holds **no key** and signs nothing. The installed plugin and CLI never use it: only
a caller who chooses the URL sends words to it.

It receives the caller's words, so it keeps none: no request, no body and no tool argument is logged or
written, and a failed call's log line names the tool and the error's class only. Keep it that way in
Coolify too: the proxy's access log, when on, holds request lines (a path, never a body).

### Coolify settings

| Setting | Value |
| --- | --- |
| Source | the Git repository, branch `main` |
| Build pack | **Dockerfile** |
| Base directory | `/` |
| Dockerfile location | `/apps/mcp/Dockerfile` |
| Ports exposes | `3002` |
| Domain | `https://<ARP_PUBLIC_HOST>` |
| Health check | path `/`, port `3002` (the image has its own `HEALTHCHECK`) |
| Persistent storage | none. It keeps a day of GitHub file listings and the search package's cache in the container, and loses both on redeploy |

### Variables

Set at run time. The image already sets `ARP_HOSTED=1`, `ARP_TOOLS=read`, `ARP_TARGET=testnet`,
`ARP_HOST=0.0.0.0`, `PORT=3002` and `ARP_HOME=/home/node/.arp`; leave them. In hosted mode the server
refuses to start with any other tool set or chain, or with `ARP_RECEIPT_KEY`, `ARP_AGENT_PRIVATE_KEY`
or `ARP_ALLOW_PRIVATE_PROBE` set.

| Variable | Required | What it does |
| --- | --- | --- |
| `ARP_PUBLIC_HOST` | **yes** | the endpoint's host name, `mcp.example.org`: no scheme, no port. It answers that `Host`, the origin `https://<that name>` and its loopback names, nothing else |
| `GITHUB_TOKEN` | no | raises GitHub's limit of 60 requests an hour, which `arp_pulse` spends reading each result's files. Give it no scopes. A secret: tick "Is secret?" |

A caller connects to `https://<ARP_PUBLIC_HOST>/mcp` over HTTP. Check it once deployed:

```bash
curl -s https://<ARP_PUBLIC_HOST>/ | head -c 300
curl -s https://<ARP_PUBLIC_HOST>/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -c 300
```

Locally, from the repository root:

```bash
docker build -f apps/mcp/Dockerfile -t arp-mcp .
docker run --rm -p 3002:3002 -e ARP_PUBLIC_HOST=mcp.example.org arp-mcp
curl -s http://127.0.0.1:3002/ -H 'Host: mcp.example.org' | head -c 300
```

## What the site does not run

The content server and the activity feed run on one machine and are not hosted. Nothing on the site
needs them: steps that would are hidden while their variable is unset. The sponsor and the MCP
endpoint are above.
