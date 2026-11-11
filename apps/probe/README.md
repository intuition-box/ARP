<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../../docs/design/brand/arp-lockup-dark.svg" />
  <img src="../../docs/design/brand/arp-lockup-light.svg" height="40" alt="ARP" />
</picture>

# ARP probe

A service that answers "is it me, or is it down for everyone?". Every five minutes it asks each
remote MCP server in the catalogue whether it answers, and reads each package's npm or PyPI record.
It runs as a container on Coolify (ADR `0200`; a Cloudflare Worker until then).

## Schedule

```
every 5 min   one cycle: every target in parallel, each with its own timeout; one at a time
on start      one cycle
```

The readings are kept in one SQLite file, append only. Its schema is `migrations/`.

## Endpoints

| route               | returns                                                 |
| ------------------- | ------------------------------------------------------- |
| `GET /probe`        | each target's latest reading, and its last 24 hours     |
| `GET /probe?days=7` | the same over 7 days (30 at most)                       |
| `GET /x402?target=<label>&before=<ISO>` | **off unless `ARP_PROBE_X402=on`**, a 404 otherwise. An x402 endpoint's offers (network, asset, payee, amount) from its latest `402` before then, or 404 (ADR `0189`) |
| `GET /healthz`      | how many targets, and when the last cycle ran           |

## What it is, and what it is not

A dated fact: "this server answered ARP at 14:10". It is **not** a score and it is never written
on chain. A server can answer the handshake and still fail every real call, so whether a tool
actually works comes from the agents that use it.

It holds no key and sends nothing but one `initialize` per endpoint and one registry read per
package. The targets come from [`data/catalogue/`](../../data/catalogue).

**It never reaches a private address.** An endpoint is asked through `pinnedAsk`
(`@arp-protocol/core/node`): the name is resolved once and refused when any address is private,
loopback or link-local, the connection goes to the checked addresses, and no redirect is followed.
Nothing here reads `ARP_ALLOW_PRIVATE_PROBE`.

## Run it

```bash
bun run start   # http://127.0.0.1:8788, its SQLite file in apps/probe/.data/
bun test
```

| variable | what it does |
| --- | --- |
| `PROBE_PORT`, `PROBE_LISTEN`, `PROBE_PUBLIC_HOST` | where it listens and the one public `Host` it answers; `0.0.0.0` needs a public host |
| `ARP_DATA_DIR` | where `probe.sqlite` lives; `/data` in the image |
| `ARP_PROBE_X402` | `on` keeps each `402`'s offers and serves `GET /x402` |

Hosted: `apps/web/DEPLOY.md`, "The probe".
