/** The two readings an x402 line's signed terms are checked against (task 122, ADR `0189`).
 *
 *  - **ARP's probe** (`apps/probe`, `GET /x402`): its most recent dated reading of the endpoint's `402`
 *    from before the payment. What makes the check work after the endpoint goes dark. Read over HTTP
 *    from `ARP_PROBE_URL`; unset, there is none.
 *  - **A live read**: one `GET` of the URL the agent signed, values removed, through {@link pinnedAsk}'s
 *    client (no private address, no redirect, a deadline, a capped body). Only the offers leave this file,
 *    never the body. `/line` asks for it only after the payment has checked on chain and the payment is
 *    not already spent, so one paid settlement buys at most one read per signed request.
 *
 *  Either returns `null` when it has nothing to say: a dark endpoint, a probe that does not answer. Neither
 *  throws, since an absent reading is `unchecked`, never a refusal.
 */
import { x402OffersOf, type X402Offer, type X402TermsReading } from '@arp-protocol/core';

import type { Ask } from './admit-tool.ts';

export function liveTerms(ask: Ask, now: () => number): (endpoint: string) => Promise<X402TermsReading | null> {
  return async (endpoint) => {
    let answer;
    try {
      answer = await ask(endpoint, { method: 'GET', headers: { accept: 'application/json, */*' } });
    } catch {
      // Unreachable or refused as private: the endpoint said nothing, which is what `null` means here.
      return null;
    }
    const offers = x402OffersOf(answer.status, answer.header, answer.body);
    return offers === null ? null : { at: Math.floor(now() / 1000), offers };
  };
}

const isOffer = (value: unknown): value is X402Offer =>
  typeof value === 'object' &&
  value !== null &&
  // A non-null object, checked on the two lines above; each field is read as `unknown`.
  ['network', 'asset', 'payTo', 'amount'].every((field) => typeof (value as Record<string, unknown>)[field] === 'string');

/**
 * The probe's reading of `endpoint` (a canonical URL, `normaliseToolUrl`) before `before` (unix seconds).
 * The probe keys a target by its URL without `https://`. `log` hears an outage, which reads as no reading.
 */
export function probeTerms(
  probeUrl: string,
  options: { fetch?: typeof fetch; log?: (line: string) => void } = {},
): (endpoint: string, before: number) => Promise<X402TermsReading | null> {
  const doFetch = options.fetch ?? fetch;
  return async (endpoint, before) => {
    const target = endpoint.replace(/^https:\/\//, '');
    const url = new URL('/x402', probeUrl);
    url.searchParams.set('target', target);
    url.searchParams.set('before', new Date(before * 1000).toISOString());
    try {
      const response = await doFetch(url, { signal: AbortSignal.timeout(5_000) });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`probe answered ${response.status}`);
      // Every field is optional and `unknown` here, and each is checked on the next three lines.
      const body = (await response.json()) as { reading?: { at?: unknown; offers?: unknown } };
      const at = typeof body.reading?.at === 'string' ? Date.parse(body.reading.at) : Number.NaN;
      const offers = body.reading?.offers;
      if (Number.isNaN(at) || !Array.isArray(offers) || !offers.every(isOffer)) throw new Error('probe answered no reading this reads');
      return { at: Math.floor(at / 1000), offers };
    } catch (error) {
      options.log?.(`x402 probe reading of ${target}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  };
}
