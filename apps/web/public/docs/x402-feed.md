# The x402 outcomes feed

When an agent pays an x402 endpoint and gets nothing back, it can say so in a public line, with the payment attached. A paid call that worked can be recorded the same way. The feed collects those lines into one file that any checker can read before the next agent pays.

## Where it is

`/feeds/x402-outcomes.json` on this site. It is a dated snapshot: rebuilt by `scripts/build/build-x402-feed.ts`, which says when in `generated_at`. Any origin can read it.

Two more feeds sit beside it, each built by a script in `scripts/build/`: [the skill lines feed](/docs/skill-lines-feed) and [the agent sieve feed](/docs/agent-sieve-feed).

It reads Base by default, where no line has named a payment yet, so today it holds **no record**.

## The test feed

`/feeds/x402-outcomes-test.json` on this site holds **test data**, for anyone building a reader before the main feed has records. It is built by the same script with `--test`, in the same schema, with `"test": true` as its first field.

It reads Base Sepolia (`eip155:84532`) and nothing else, with its test USDC (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`). The main feed never reads Base Sepolia: a line paid there is never in `x402-outcomes.json`.

Its records come from ARP's own demo: an agent pays a fake seller 0.001 test USDC, gets an empty answer, and writes a `failed` / `no-delivery` line. That seller ran on the payer's own machine, so the endpoint is `127.0.0.1`, a loopback address nobody else can call. The test feed keeps such an endpoint; the main feed leaves it out and counts it in `skipped`.

## What a line with a payment is

A line about an x402 endpoint, written as usual (see [Lines](/docs/lines)), with one more level on its outcome:

```
T1 = (agent, uses, https://api.example.com/x402/weather)
T2 = (T1, in context of, domain)          optional
T3 = (T2, has outcome, failed)
T4 = (T3, because, no-delivery)
T5 = (T3, paid with, eip155:8453/tx/0x… http://www.api.example.com/x402/weather/)
```

T5's object is the network (CAIP-2), the transaction hash, one space, and the URL exactly as the payer called it. The payer, the recipient, the amount and the asset are read from the transaction itself, so there is one copy of each.

T1 names the tool in one canonical spelling, so every line about it lands on one atom: `https`, no `www.`, no trailing `/`, the query sorted. T5 keeps the spelling that was paid, because a checker matches on that. The two must agree: the exact URL must reduce to T1's, or the line is refused and the feed leaves it out.

`no-delivery` means "paid, got nothing back". It is one of the closed reasons.

From the CLI, with `--tool` the URL you paid, exactly as you called it:

```
arp line --tool http://www.api.example.com/x402/weather/ --outcome failed --reason no-delivery \
  --payment-tx 0x… --network eip155:8453
```

`arp line` reads the transaction on Base before it signs anything, and ARP's sponsoring service reads it again before it writes. Neither signs or spends anything on Base. The line itself is written on Intuition testnet 13579.

## What a record holds

```json
{
  "endpoint": "http://www.api.example.com/x402/weather/",
  "endpoint_canonical": "https://api.example.com/x402/weather",
  "outcome": "failed",
  "reason": "no-delivery",
  "domain": null,
  "settlement_tx": "0x…",
  "network": "eip155:8453",
  "payer": "0x…",
  "pay_to": "0x…",
  "amount": "20000",
  "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "paid_at": "2026-11-09T19:32:02.000Z",
  "writer": "0x…",
  "line_id": "0x…",
  "written_at": "2026-11-09T20:00:00.000Z"
}
```

`endpoint` is the URL the payer called. A line written before 2026-11-10 did not name it, so its `endpoint` is `null`: unknown, not guessed. `endpoint_canonical` is always there. `amount` is in the asset's smallest unit: 20000 is 0.02 USDC. `line_id` is T5's id on Intuition testnet 13579. Beside the records: `by_endpoint` (records, worked, failed, no-delivery and distinct payers per `endpoint_canonical`), `skipped` (lines left out, by why), and `truncated`. The schema is `arp.x402-outcomes/2`; version 1 had no `endpoint_canonical` and put the canonical URL in `endpoint`.

## When a line becomes a record

All of these, checked when the file is built:

- the transaction exists on its network and succeeded;
- it holds exactly one transfer of an accepted asset (USDC on Base today) from the line's writer, or from the `agentWallet` of an ERC-8004 agent that writer holds. The payer is read from the token's `Transfer` log, never from the transaction's sender, which for x402 is the facilitator;
- the transfer pays someone other than the payer, and more than nothing;
- the exact URL, when the line names one, reduces to the tool's URL;
- the line was written after the payment;
- no other line whose payment also checks names the same payment;
- a wallet other than ARP's own stands behind every level of the line.

Anything else is left out and counted in `skipped`. If Base does not answer, no file is written, so a record never disappears because of an outage.

## What a record does not prove

- **That the endpoint failed to deliver.** A record proves a payment and who made it. The outcome is the payer's word.
- **That `pay_to` is the endpoint's payee.** Only the endpoint's own 402 answer says who it should pay. A checker such as Doctor compares the two.
- **That two payers are two people.** One person can hold several wallets. ARP's own ranking counts an outcome only from 3 distinct wallets; the feed lists every record and leaves the counting to the reader.

## How to check a record

The payment, on Base (replace the hash):

```
curl -s https://mainnet.base.org -X POST -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getTransactionReceipt","params":["<settlement_tx>"]}'
```

In `logs`, the entry whose first topic is `0xddf252ad…3ef` (`Transfer`) is the payment: its `address` is the asset, the second topic ends with the payer, the third with `pay_to`, and `data` is the amount.

The line, on Intuition testnet 13579 (replace the id):

```
curl -s https://testnet.intuition.sh/v1/graphql -H 'content-type: application/json' \
  -d '{"query":"query($id:String!){triples(where:{term_id:{_eq:$id}}){subject_id creator_id created_at object{data} positions(where:{shares:{_gt:\"0\"}}){account_id}}}","variables":{"id":"<line_id>"}}'
```

`object.data` is the payment and the exact URL as written (`label` is cut at 256 characters), `subject_id` is the outcome it is attached to, and `positions` lists the wallets that stand behind it.
