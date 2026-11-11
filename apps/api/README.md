<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../../docs/design/brand/arp-lockup-dark.svg" />
  <img src="../../docs/design/brand/arp-lockup-light.svg" height="40" alt="ARP" />
</picture>

# ARP API

A cache in front of GitHub and skills.sh. It gives the web app each tool's stars, activity and
installs, without every visitor hitting GitHub's rate limit. It runs as a container on Coolify
(ADR `0200`; a Cloudflare Worker until then) and keeps its cache in one SQLite file.

## Schedule

```
every 10 min   one slice of the refresh cycle while one is running, nothing otherwise; one at a time
on start       one slice, so a restart resumes the cycle at its cursor
```

One cycle reads every catalogued repository, every skill repository's file tree and every skill's
page on skills.sh, about 770 requests in all (53 repositories, 41 trees, 673 pages on 2026-11-11). It
runs in slices of 40, then waits `REFRESH_EVERY_HOURS` (24 by default) before the next one. When a
read fails, the previous value is kept along with its date.

## Endpoints

| route           | returns                                                          |
| --------------- | ---------------------------------------------------------------- |
| `GET /facts`    | every repository's and skill's figures, each dated and sourced   |
| `GET /x402/last-purchase?url=<endpoint>` | **off unless `ARP_X402_LAST_PURCHASE=on`**, a 404 otherwise. nohumans.directory's last purchase of that endpoint: delivered or not, its failure code, the day, the settlement transaction, with the source and its licence (CC BY 4.0) |
| `GET /healthz`  | where the refresh cycle is                                       |
| `POST /refresh` | run a slice now. Off unless `REFRESH_SECRET` is set              |

`/x402/last-purchase`, when on, is read on demand, not on the schedule: the first request for an
endpoint reads `api.nohumans.directory/v1/resolve?url=`, a free route. A listed endpoint's answer is
kept six hours, about 100 new ones a UTC day (a soft cap, ADR `0187`); an endpoint not listed there
is not stored, so made-up URLs cost no write. Only the endpoint's public URL is sent. The paid routes
there are never called. Off, the route makes no outbound call at all.

## What it is not

It is not a source of truth. Every value is someone else's number, served with where it was read
and when, so anyone can check it. No chain data passes through here: the web app reads the graph
directly.

`GITHUB_TOKEN` is a token with no scopes, so it can read public data and nothing else. It stays in
the service and never reaches a browser.

## Run it

```bash
bun run start   # http://127.0.0.1:8787, its SQLite file in apps/api/.data/
bun test
```

| variable | what it does |
| --- | --- |
| `API_PORT`, `API_LISTEN`, `API_PUBLIC_HOST` | where it listens and the one public `Host` it answers; `0.0.0.0` needs a public host |
| `ARP_DATA_DIR` | where `api.sqlite` lives; `/data` in the image |
| `GITHUB_TOKEN` | optional, no scopes: 5,000 reads an hour instead of 60 |
| `REFRESH_SECRET`, `REFRESH_EVERY_HOURS` | `POST /refresh`, and the pause between cycles |
| `ARP_X402_LAST_PURCHASE` | `on` serves `/x402/last-purchase` |

Hosted: `apps/web/DEPLOY.md`, "The API".
