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
 */
import { parsePaymentAtomLabel, type SignedLineRequest } from '@arp-protocol/core';
import { appendJsonLine, readJsonLines } from '@arp-protocol/core/node';

type Row = { payment: string; signed: SignedLineRequest; at: number };

export class LineRequestStore {
  private readonly byPayment = new Map<string, SignedLineRequest>();

  /** `null` keeps them in memory only, for tests. */
  constructor(private readonly path: string | null) {
    if (path === null) return;
    // This service's own format, written below. A half-written last line is skipped by `readJsonLines`.
    for (const line of readJsonLines(path) as Row[]) this.byPayment.set(line.payment, line.signed);
  }

  /** Keeps `signed` under its payment label. A request with no payment is not kept: it backs no x402 record. */
  keep(signed: SignedLineRequest, at: number): void {
    const { payment } = signed.request;
    if (payment === '') return;
    if (this.path !== null) appendJsonLine(this.path, { payment, signed, at } satisfies Row);
    this.byPayment.set(payment, signed);
  }

  /** The request kept for `payment`, `eip155:<chain>/tx/<hash>` in lower case, or `null`. */
  get(payment: string): SignedLineRequest | null {
    return parsePaymentAtomLabel(payment) === null ? null : (this.byPayment.get(payment) ?? null);
  }
}
