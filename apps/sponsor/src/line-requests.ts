/** The signed request behind each x402 line this service wrote (task 121, ADR `0188`).
 *
 *  **The one copy.** Nothing else holds it: the line's atoms carry what the agent signed, never the
 *  signature, and adding a level for it would put the agent's position behind a term it did not sign.
 *  The x402 feed reads it here, through `GET /line-request`, and republishes it beside the record; a
 *  reader recovers the signer itself, so ARP can withhold a request but cannot forge one.
 *
 *  **Kept as received, before the first send.** The body the agent posted, after `verifyLineRequest`
 *  accepted it, appended before the key is used, as the ledger reserves a spend. A request whose line
 *  then reverts stays in the file and names a payment no line carries; the feed asks only about lines on
 *  chain. A retry after a revert signs a new request under a new nonce, and the latest one per payment
 *  is the one answered.
 *
 *  **With the payee check** (task 122, ADR `0189`): which reading named the signed terms as the endpoint's,
 *  `probe` or `live`, and when it was made, or `unchecked`. ARP's own word, kept beside the request because
 *  the feed is built later, when a live read would say nothing about the time of the payment. A row written
 *  before it has no check and reads as `unchecked`.
 */
import { parsePaymentAtomLabel, type PayeeCheck, type PayeeSource, type SignedLineRequest } from '@arp-protocol/core';
import { appendJsonLine, readJsonLines } from '@arp-protocol/core/node';

/** What the service found, as kept and served: `checkedAt` unix seconds, `null` when unchecked. */
export type KeptPayee = { check: PayeeSource; checkedAt: number | null };
export type KeptRequest = { signed: SignedLineRequest; payee: KeptPayee };

type Row = { payment: string; signed: SignedLineRequest; at: number; payee?: KeptPayee };

const UNCHECKED: KeptPayee = { check: 'unchecked', checkedAt: null };

export class LineRequestStore {
  private readonly byPayment = new Map<string, KeptRequest>();

  /** `null` keeps them in memory only, for tests. */
  constructor(private readonly path: string | null) {
    if (path === null) return;
    // This service's own format, written below. A half-written last line is skipped by `readJsonLines`.
    for (const line of readJsonLines(path) as Row[]) this.byPayment.set(line.payment, { signed: line.signed, payee: line.payee ?? UNCHECKED });
  }

  /** Keeps `signed` under its payment label. A request with no payment is not kept: it backs no x402 record. */
  keep(signed: SignedLineRequest, at: number, check: PayeeCheck = { status: 'unchecked', checkedAt: null }): void {
    const { payment } = signed.request;
    if (payment === '') return;
    const payee: KeptPayee = check.status === 'probe' || check.status === 'live' ? { check: check.status, checkedAt: check.checkedAt } : UNCHECKED;
    if (this.path !== null) appendJsonLine(this.path, { payment, signed, at, payee } satisfies Row);
    this.byPayment.set(payment, { signed, payee });
  }

  /** The request kept for `payment`, `eip155:<chain>/tx/<hash>` in lower case, and its payee check, or `null`. */
  get(payment: string): KeptRequest | null {
    return parsePaymentAtomLabel(payment) === null ? null : (this.byPayment.get(payment) ?? null);
  }
}
