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

T5's object is the network (CAIP-2), the transaction hash, one space, and the URL as the payer called it, with its values removed. The payer, the recipient, the amount and the asset are read from the transaction itself, so there is one copy of each.

T1 names the tool in one canonical spelling, so every line about it lands on one atom: `https`, no `www.`, no trailing `/`, the query's names sorted. T5 keeps the spelling that was paid, because a checker matches on that. The two must agree: the URL must reduce to T1's, or the line is refused and the feed leaves it out.

## Values are removed before anything is signed

T1 and T5 are permanent and public, so a URL never carries what was asked: `arp line` removes it on your machine before it signs, and ARP's sponsoring service refuses a URL that still carries a value (`422`, rule `endpoint-private`). The rules are the same everywhere, so a checker that applies them to the URL it called gets the same key:

- scheme, host and port are kept as typed;
- a URL with `user:pass@` is refused;
- the fragment (`#…`) is removed;
- each query parameter keeps its name and loses its value: `?city=paris&q=x` becomes `?city=&q=`; a part with no `=` is removed;
- a path segment, or a parameter name, that looks personal becomes `:id`: one that holds an `@`, `0x` and 40 or more hex digits, a UUID, 6 digits in a row, 16 hex digits in a row with a digit among them, a phone number, a space, or more than 20 characters of base64 with upper case, lower case and a digit.

A plain word in the path (`/weather/paris`) is not caught: nothing tells a route from a search there. Write `:id` in its place yourself before running `arp line`. The full rules and examples: [What ARP publishes about you](/docs/what-arp-publishes). The code: [endpoint-redaction.ts](https://github.com/intuition-box/ARP/blob/main/packages/protocol/src/endpoint-redaction.ts).

## Failed before paying, and paid with nothing back

`no-delivery` means "paid, got nothing back": a line with a settled transaction. It is one of the closed reasons.

A call refused before any payment settled (a `402` you did not pay, a payment the facilitator refused) has no transaction to attach, and is not a record. When the call went through an MCP tool in Claude Code, the hook notes it locally as `payment` and nothing more; ARP's sponsoring service writes no line about an endpoint without a payment.

From the CLI, with `--tool` the URL you paid:

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
  "written_at": "2026-11-09T20:00:00.000Z",
  "signed_request": {
    "typed_data": {
      "domain": {"name": "ARP Line Request", "version": "4", "chainId": 13579},
      "types": {"LineRequest": [{"name": "agent", "type": "address"}, "…"]},
      "primaryType": "LineRequest",
      "message": {"agent": "0x…", "payment": "eip155:8453/tx/0x…", "outcome": "failed", "…": "…"}
    },
    "signature": "0x…"
  },
  "signed_by_payer": true
}
```

`endpoint` is the URL the payer called, with its values removed. A line written before 2026-11-10 did not name it, so its `endpoint` is `null`: unknown, not guessed. `endpoint_canonical` is always there, also without values, so two calls that differ only in what they asked count under one key. The feed removes values again as it reads, whatever a line wrote: no value reaches the file, and a line whose URLs no longer agree once reduced, or that carries credentials, is counted in `skipped`. `amount` is in the asset's smallest unit: 20000 is 0.02 USDC. `line_id` is T5's id on Intuition testnet 13579. Beside the records: `by_endpoint` (records, worked, failed, no-delivery and distinct payers per `endpoint_canonical`), `skipped` (lines left out, by why), and `truncated`. `signed_request` and `signed_by_payer` are below. The schema is `arp.x402-outcomes/3`; `signed_request`, `signed_by_payer` and the top-level `signed_requests_from` were added to it on 2026-11-11 without changing any other field. Version 2 published both URLs with their values, and version 1 had no `endpoint_canonical` and put the canonical URL in `endpoint`.

`payers` in `by_endpoint` counts distinct paying addresses per `endpoint_canonical`. A writer who pays one endpoint from two addresses counts twice, and nothing in the feed can tell that apart from two writers.

## When a line becomes a record

All of these, checked when the file is built:

- the transaction exists on its network and succeeded;
- it holds exactly one transfer of an accepted asset (USDC on Base today) from the line's writer, or from the `agentWallet` of an ERC-8004 agent that writer holds. The payer is read from the token's `Transfer` log, never from the transaction's sender, which for x402 is the facilitator;
- the transfer pays someone other than the payer, and more than nothing;
- the exact URL, when the line names one, reduces to the tool's URL, before and after values are removed;
- the line was written after the payment;
- no other line whose payment also checks names the same payment;
- a wallet other than ARP's own stands behind every level of the line.

Anything else is left out and counted in `skipped`. If Base does not answer, no file is written, so a record never disappears because of an outage.

## What a record does not prove

- **That the endpoint failed to deliver.** A record proves a payment and who made it. The outcome is the payer's word.
- **That `pay_to` is the endpoint's payee.** Only the endpoint's own 402 answer says who it should pay. A checker such as Doctor compares the two.
- **That the payer is anonymous.** The paying wallet is public on its own chain. Pay from a wallet dedicated to the agent's payments, never a personal one: [What ARP publishes about you](/docs/what-arp-publishes).
- **That two payers are two people.** One person can hold several wallets. ARP's own ranking counts an outcome only from 3 distinct wallets; the feed lists every record and leaves the counting to the reader.

## Who signed the line

A line written by ARP's sponsoring service rests on a request the agent signed: an EIP-712 `LineRequest` that names the payment, the outcome, the reason and the URL paid. The service keeps it, and the feed carries it as `signed_request`, so a reader checks who signed without trusting ARP. ARP could leave a request out; it cannot make one up, because only the signer's key produces the signature.

`signed_by_payer` is `true` when all three hold, and each can be recomputed from the record alone:

1. the signature recovers, over `typed_data`, to the record's `payer`;
2. `typed_data.message.payment` is this settlement: `<network>/tx/<settlement_tx>`, the hash in lower case;
3. `typed_data.message`'s `outcome`, `reason`, `domain` and `endpoint` are the record's, an empty string standing for `null`.

The third matters because the service keeps a request before it sends the line: a kept request can belong to a send that reverted, after which the line for that payment was written another way, with other words.

With viem, in TypeScript:

```ts
import {verifyTypedData} from "viem";

const {typed_data, signature} = record.signed_request;
const signed = await verifyTypedData({...typed_data, address: record.payer, signature});
const m = typed_data.message;
const same = m.payment === `${record.network}/tx/${record.settlement_tx.toLowerCase()}` && m.outcome === record.outcome &&
  m.reason === (record.reason ?? "") && m.domain === (record.domain ?? "") && m.endpoint === (record.endpoint ?? "");
// signed && same === record.signed_by_payer
```

`typed_data` takes viem's form: `expiresAt` is a number, and `types` leaves out `EIP712Domain`. A tool built on `eth_signTypedData_v4` adds it from the domain's three fields: `name` string, `version` string, `chainId` uint256. There is no `verifyingContract`: no contract checks this signature.

**It is EIP-712, not EIP-191.** A reader that verifies only `personal_sign` (EIP-191) messages cannot check it as one: the agent signed typed data, and there is no EIP-191 signature to check. Adding one would mean the agent signs a second time.

`signed_by_payer` is `false`, and the reason is in the record:

- **when `signed_request` is `null`**: the sponsoring service kept no request for this payment, because it wrote the line before it kept requests (task 121), as for every record in the feeds today, or because the line was written without it; or the feed was built without reading the service (`signed_requests_from` is `null`);
- **when a word differs**: the kept request names another outcome, reason, domain or URL than the line on chain;
- **when the agent's `agentWallet` paid and the address that holds the agent signed.** `payer` and `writer` differ, the signature recovers to `writer`, and the payer signed nothing. That is the honest answer, not a fault: the line is still the holder's word about a payment its agent's wallet made.

`signed_requests_from`, beside the records, says where the requests were read: the sponsoring service's `GET /line-request`. Ask it yourself with `?payment=<network>/tx/<settlement_tx>`; it answers the request as the agent posted it, or `404`.

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
