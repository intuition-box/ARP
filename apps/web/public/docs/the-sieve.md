# The 8004 sieve

ERC-8004 registers agents by the hundred thousand, and most of them cannot be called. The sieve sorts them: each agent gets the highest rung it reaches, and each rung is checked by one request that anyone can send again.

## The rungs

| rung | means | checked by |
| --- | --- | --- |
| 0 · shell | no registration file, or one that does not resolve | `tokenURI` on the registry |
| 1 · described | a registration file that parses | one GET of that file |
| 2 · declares an address | at least one endpoint another agent could call: MCP, A2A or an API | the file |
| 3 · answers | one of those answered | one request to it |
| 4 · speaks | one served the protocol it declares: an MCP `initialize`, or an A2A agent card | one request to it |
| 5 · used | a line in ARP names the agent, from a wallet that is neither its owner's nor ARP's | the graph |

A web site, an X account, an npm page or a docs link answers a GET too, and none of them is an agent you can call. So rungs 2 to 4 read only endpoints declared as MCP, A2A or an API.

A failure that says nothing about the agent leaves it on the rung below, marked **could not say**, to be read again: a timeout on our side, a DNS or TLS error, a `429`, an answer the probe did not recognise. "Speaks A2A" means the card was served; whether the agent then handles a task is not checked.

No rung is a score. It is how far one request got.

## ARP's directory, 2026-11-09

The agents ARP's directory lists on testnet 13579, walked from 18:01 to 18:27 UTC: 283 with an identity that resolves, read on each one's own chain. Every agent was read, so these are counts, not estimates. One chain per line, never added together.

| identity chain | agents | speak MCP or A2A (4) | declare an address, did not answer (2) | described only (1) | shells (0) | of these, could not say |
| --- | --- | --- | --- | --- | --- | --- |
| Base 8453 | 244 | 40 | 50 | 121 | 33 | 43 |
| testnet 13579 | 31 | 0 | 0 | 1 | 30 | 0 |
| BNB 56 | 5 | 0 | 0 | 5 | 0 | 0 |
| X Layer 196 | 3 | 0 | 2 | 1 | 0 | 2 |

On Base, the 40 that speak are served by 36 hosts and 39 owners; no host serves more than 4. The 31 on 13579 are ARP's own test identities: 30 were minted with no registration file, and one (13579/8) has a file that declares no endpoint. "Could not say" is counted inside the rung columns, not beside them. No agent in the directory reaches rung 5.

`/agents` opens on these, highest rung first, and `arp_find_agents` returns them with `order: answers-now`. A registry can read the same reading as one file: [the agent sieve feed](/docs/agent-sieve-feed).

## A sample of all of Base, 2026-11-09

Base's registry had a highest minted id of 1,175,637 at 18:39 UTC, after the sample was drawn (`agent-sieve.ts --highest --chain 8453`); ids run from 1, so that is the number registered if none was burned. 500 token ids were drawn uniformly from it (the largest drawn was 1,171,620). Here the figures are estimates, given with their 95% interval.

| | of 500 |
| --- | --- |
| speak MCP or A2A (4) | 452, 87.5% to 92.7% |
| of which, cards served by **one host**, centralcity.ai, each under its own owner | 451 |
| everything else | 49, of which 1 speaks: 0.4% to 10.7% |
| shells (0) | 11 |

So a share of Base is, today, mostly a share of one platform's agents. A figure about Base without that line says something about centralcity.ai, not about the agents of Base.

## Feedback beside the rung

ERC-8004 feedback is counted by reviewer and split in two, never summed into one figure: reviewers whose address has sent at most three transactions on that chain (a wallet with no life outside the feedback it left) and the rest. It is a rough proxy, not the method of the study below, and it misses a farm of old wallets. In the directory's Base agents, 176 of 1,711 sampled reviewers were that fresh.

## Somebody else's measurements

Cited, never merged with the figures above, because each measures something else on another date:

- arXiv [2606.26028](https://arxiv.org/abs/2606.26028), data to 2026-05-13: a valid registration file with at least one live endpoint for 3% of Ethereum, 4% of BNB and 15% of Base agents, and 90.6% of Base reviewers coordinated.
- ARP's own earlier sample, 2026-10-16: 3 of 122 parsed Base documents answered a handshake, 0.8% to 7.0%.

## Run it again

```
bun run scripts/measure/agent-sieve.ts --population directory
bun run scripts/measure/agent-sieve.ts --population registry --chain 8453 --count 500
bun run scripts/measure/agent-sieve.ts --summary data/measurements/agent-sieve-directory-2026-11-09T2000.jsonl
```

Each row of the output holds the request that proves its rung, as a `curl`. The walk signs nothing and writes nothing on chain; requests are paced per host, and a host that asks to wait is left alone until it says so.
