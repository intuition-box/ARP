# The agent sieve feed

The rung of [the 8004 sieve](/docs/the-sieve) each ERC-8004 agent in ARP's directory reached, in one file a registry can read beside its own listing: which agents have a file, which declare an address, which answer, which speak MCP or A2A.

## Where it is

`/feeds/agent-sieve.json` on this site. It is a dated snapshot of one walk: `checked_from` and `checked_to` say when the agents were read, and `source` names the committed measurement. It is rebuilt by `scripts/build/build-agent-sieve-feed.ts` from `data/catalogue/agent-sieve-13579.json`. Any origin can read it.

The walk of 2026-11-09 holds 283 agents: 244 on Base 8453, 31 on testnet 13579 (ARP's own test identities), 5 on BNB 56 and 3 on X Layer 196. Per chain, see [the sieve](/docs/the-sieve); the feed's `by_rung` adds them together, so read it as a count of records, not of one chain.

## What a record holds

```json
{
  "agent": "eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432:2340",
  "rung": 4,
  "could_not_say": false,
  "proof_url": "https://clawn.ch/api/a2a",
  "kinds": ["a2a"],
  "checked_at": "2026-11-09T18:02:01.721Z"
}
```

- `agent` is the chain, the ERC-8004 registry and the token id, in one key.
- `rung` is 0 shell, 1 described, 2 declares an address, 3 answers, 4 speaks, 5 used. The names are in the file's `rungs`.
- `could_not_say` is true when a failure that is not a verdict (a timeout, a DNS or TLS error, a `429`) left the agent on the rung below. Read it again before acting on it.
- `proof_url` is the endpoint that proves the rung, when one does.
- `kinds` are the protocols that answered: `mcp`, `a2a`.

Beside the records: `rungs`, `by_rung`, `note` and `skipped`. The schema is `arp.agent-sieve/1`.

## What it leaves out

The agent's name and description. They are text the owner typed, and a registry already holds them. The feed carries only what a request established.

## What a rung does not say

Whether the agent does its job. Rung 4 means one request got the protocol it declares back; whether the agent then handles a task is not checked. No rung is a score.

## How to check a record

Each rung is one request anyone can send again: the commands are in [the sieve](/docs/the-sieve), under "Run it again". The proof for rung 4 on an MCP endpoint is an `initialize` that the endpoint answers as MCP.
