/** The content receipts that back lines this service wrote (task 127, ADR `0192`).
 *
 *  A line backed by a receipt carries `(outcome, has evidence, content-receipt:<hash>)`, where `<hash>` is the
 *  receipt's EIP-712 hash. The atom names the receipt and holds none of it, so the receipt is kept here,
 *  as received, and served read-only at `GET /receipt?hash=<hash>`. A stranger recomputes the hash from what
 *  it gets, recovers the node that signed it, and checks the digest against the repository at its commit with
 *  `sha256sum`; ARP can withhold a receipt but cannot forge one.
 *
 *  **The one copy**, as for signed line requests (ADR `0188`): kept for as long as the service's data
 *  volume is, appended before the first send, so a line that lands always has its receipt.
 */
import { isReceiptHash, type SignedContentReceipt } from '@arp-protocol/core';
import { appendJsonLine, readJsonLines } from '@arp-protocol/core/node';

type Row = { hash: string; receipt: SignedContentReceipt; at: number };

export class LineReceiptStore {
  private readonly byHash = new Map<string, SignedContentReceipt>();

  /** `null` keeps them in memory only, for tests. */
  constructor(private readonly path: string | null) {
    if (path === null) return;
    // This service's own format, written below. A half-written last line is skipped by `readJsonLines`.
    for (const line of readJsonLines(path) as Row[]) this.byHash.set(line.hash, line.receipt);
  }

  /** Keeps a receipt `checkReceiptEvidence` accepted, under its hash. The same receipt twice is kept once. */
  keep(hash: string, receipt: SignedContentReceipt, at: number): void {
    const key = hash.toLowerCase();
    if (this.byHash.has(key)) return;
    if (this.path !== null) appendJsonLine(this.path, { hash: key, receipt, at } satisfies Row);
    this.byHash.set(key, receipt);
  }

  /** The receipt kept under `hash`, `0x` and 64 lower-case hex, or `null`. */
  get(hash: string): SignedContentReceipt | null {
    return isReceiptHash(hash) ? (this.byHash.get(hash) ?? null) : null;
  }
}
