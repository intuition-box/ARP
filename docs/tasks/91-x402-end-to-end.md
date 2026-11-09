# Task 91 — The x402 failure loop, end to end on Base Sepolia

**Status:** verified 2026-11-09, `task-verifier` PASS (round 1), commits `290a4ac`..`ececf21`, post-mortem `.claude/learning/80-x402-end-to-end.md`; dry run done, the paid run waits on the user's test USDC. On `feat/91-x402-e2e-sepolia`, worktree `../ARP-91`, not pushed.
**ADR:** `0160`.
**Rules:** `code.md`, `security.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`.

## Why

Task 89 shipped the x402 failure line and its feed with zero records (`docs/tasks/89`, deliverable 4). The
user asked on 2026-11-09 for the loop to be walked once: « oui » to a fake x402 seller, our agent pays it
on Base Sepolia, gets nothing, writes the line, the feed publishes it.

## Deliverables

1. **Networks by configuration** (ADR `0160`): `x402NetworksFrom` in `packages/protocol/src/x402-payment.ts`
   reads `ARP_X402_NETWORKS="eip155:<id>=<asset>,…"` and needs `ARP_X402_RPC_<id>` for a network that is
   not a default; a bad setting throws. `arp line` (`apps/mcp/src/line.ts`), the sponsor's `/line`
   (`apps/sponsor/src/main.ts`) and the feed build use it. Base stays the only default.
2. **The fake seller**, `scripts/demo/x402-fake-seller.ts`: 402 with x402 v2 requirements (`exact`,
   `eip155:84532`, 0.001 USDC), verifies and settles through the x402.org facilitator, then answers 200 with
   an empty body. Holds no key. Coinbase's `@x402/core`, `@x402/evm`, `@x402/fetch` **2.28.0**, pinned,
   root `devDependencies` only (2.1 MB, 4.9 MB, 72 KB unpacked).
3. **The runbook**, `scripts/demo/x402-e2e.ts`: configures Base Sepolia, starts the seller, checks the 402,
   builds a payload (dry run), pays with the agent key (`--execute`), detects nothing usable, writes the
   line with `arp line --reason no-delivery --payment-tx --network eip155:84532`, builds the feed with Base
   Sepolia into `~/.arp/x402-e2e/feed.json` and checks payer, pay_to and amount. Effects go to
   `~/.arp/x402-e2e.jsonl`.
4. **A recorded Base Sepolia settlement** for the tests: `packages/protocol/test/fixtures/x402-base-sepolia-usdc-3009.json`.

## Facts read on 2026-11-09

| fact | value | how |
| --- | --- | --- |
| USDC on Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e`: `symbol()` USDC, `decimals()` 6, `name()` USDC, `version()` 2; chain id 84532 at block 56,667,109 | `https://sepolia.base.org`, `eth_call` (the runbook rereads it at step 1) |
| facilitator | `https://x402.org/facilitator/supported` lists `exact` on `eip155:84532` (x402 v2); its EVM signer is `0xd407e409E34E0b9afb99EcCeb609bDbcD5e7f1bf` | `GET /supported` |
| fixture | `0xed29a97b…7fe3a`, a stranger's 2,000-unit test USDC payment from `0x011a…fc9ac` to `0xa849…79d9`, submitted by that facilitator | `eth_getTransactionReceipt`, `eth_getBlockByNumber` on `https://sepolia.base.org` |
| agent | `0x56BC52C2A0B863C39dBcBE9aC853f301D79bec42` (the key in `~/.arp/agent-key`, agent 12 per `STATE.md`): 0 USDC, 0 ETH on Base Sepolia | the runbook, step 3 |
| sponsor keys on 13579 | `arp.sponsor` `0x7793…7ec9`: 10.4 tTRUST; `arp.sponsorV1` `0xE596…1AA1`: 2.334 tTRUST | `eth_getBalance` on the testnet RPC |
| clock | this machine 321 s behind Base Sepolia's latest block | the runbook, step 1 |

## What ran

`bun run scripts/demo/x402-e2e.ts` (dry run), 2026-11-09:

1. `eip155:84532` accepted by configuration, the token read as USDC/6.
2. The seller answered 402, x402 v2: exact, `eip155:84532`, 0.001 USDC to `0x…dEaD`.
3. A payload from a throwaway key carried a valid EIP-3009 signature (checked with `verifyTypedData`), and
   the facilitator's own `verify` refused it for `invalid_exact_evm_insufficient_balance` only, as it should
   for an empty wallet. Nothing was settled.
4. The agent key was read for its address only, and its balance: 0 USDC. The run stopped there.

Also: `arp line … --network eip155:84532` with the setting read a real Base Sepolia transaction and stopped
at the domain check, before any key; with an unknown hash it answered "not found on eip155:84532". The
feed build with Base Sepolia enabled wrote `0 records, 0 skipped`. A malformed `ARP_X402_NETWORKS` stops it.

The first dry run's facilitator verify said `invalid_exact_evm_payload_authorization_valid_before`: the
clock above, with a 120 s window. The seller now asks for 600 s, and the runbook stops when the clock
leaves less than two minutes.

## What did not run, and why

Nothing was paid, no line was written, no record exists: the agent holds no test USDC on Base Sepolia, and
funding it is the user's step. No key was moved and no funds were sent between keys.

## What the user does

1. Send test USDC on **Base Sepolia** to the agent, `0x56BC52C2A0B863C39dBcBE9aC853f301D79bec42`:
   https://faucet.circle.com (pick Base Sepolia). 1 USDC is a thousand runs. **No Base Sepolia ETH is
   needed**: the facilitator submits the transfer and pays its gas.
2. Start the local sponsor as usual (`apps/sponsor/README.md`), with three more settings, and
   `INTUITION_PIN_API_KEY` set (its `/list-tool` lists the endpoint):

   ```
   ARP_X402_NETWORKS=eip155:84532=0x036CbD53842c5426634e7929541eC2318f3dCF7e \
   ARP_X402_RPC_84532=https://sepolia.base.org \
   SPONSOR_KEY_FILE=~/.arp/sponsor.key … bun run apps/sponsor/src/main.ts
   ```

   Both ARP keys hold tTRUST on 13579 today, so no funding step is needed there. The runbook refuses a
   sponsor whose address is neither `arp.sponsor` nor `arp.sponsorV1`.
3. Then, from the repository:

   ```
   bun run scripts/demo/x402-e2e.ts --execute --agent 0x56BC52C2A0B863C39dBcBE9aC853f301D79bec42
   ```

   If it stops after paying, rerun with `--payment-tx <hash>` from `~/.arp/x402-e2e.jsonl`: one payment
   backs one line.

The line names the seller's URL, `https://127.0.0.1:4021/x402-demo/no-delivery` once normalised: a test
atom on 13579. The site's feed (`apps/web/public/feeds/x402-outcomes.json`) is not rebuilt; it reads Base only.

## Do not do in this task

- Sign or send on Base or any mainnet; add Base Sepolia to the defaults.
- Move funds between keys, or read a key into the session.
- Post to Doctor or any other service.
