<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../../docs/design/brand/arp-lockup-dark.svg" />
  <img src="../../docs/design/brand/arp-lockup-light.svg" height="40" alt="ARP" />
</picture>

# ARP API

A Cloudflare Worker that puts a cache in front of GitHub, skills.sh and nohumans.directory. It gives
the web app each tool's stars, activity and installs, without every visitor hitting GitHub's rate
limit, and an x402 endpoint's last purchase by nohumans.directory.

## Schedule

```
cron   */10 * * * *   one slice of the refresh cycle while one is running, nothing otherwise
```

One cycle reads every catalogued repository, every skill repository's file tree and every skill's
page on skills.sh, about 750 requests in all. It runs in slices to stay under the Worker's limits,
then waits `REFRESH_EVERY_HOURS` (24 by default) before the next one. When a read fails, the
previous value is kept along with its date.

## Endpoints

| route           | returns                                                          |
| --------------- | ---------------------------------------------------------------- |
| `GET /facts`    | every repository's and skill's figures, each dated and sourced   |
| `GET /x402/last-purchase?url=<endpoint>` | nohumans.directory's last purchase of that endpoint: delivered or not, its failure code, the day, the settlement transaction, with the source and its licence (CC BY 4.0) |
| `GET /healthz`  | where the refresh cycle is                                       |
| `POST /refresh` | run a slice now. Off unless `REFRESH_SECRET` is set              |

`/x402/last-purchase` is read on demand, not on the schedule: the first request for an endpoint
reads `api.nohumans.directory/v1/resolve?url=`, a free route. A listed endpoint's answer is kept six hours, about 100 new ones a UTC day (a soft cap, ADR `0187`); an
endpoint not listed there is not stored, so made-up URLs cost no KV write. Only
the endpoint's public URL is sent. The paid routes there are never called.

## What it is not

It is not a source of truth. Every value is someone else's number, served with where it was read
and when, so anyone can check it. No chain data passes through here: the web app reads the graph
directly.

`GITHUB_TOKEN` is a token with no scopes, so it can read public data and nothing else. It stays in
the Worker and never reaches a browser.

## Run it

Local only for now. Facts are stored in Workers KV.

```bash
bun run dev     # wrangler dev, with the cron testable
bun test
```
