import { describe, expect, test } from 'bun:test';

import { Refused, type Ask } from '../src/admit-tool.ts';
import { liveTerms, probeTerms } from '../src/x402-terms-read.ts';

const OFFER = {
  network: 'eip155:8453',
  asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  payTo: `0x${'5e'.repeat(20)}`,
  amount: '20000',
};
const NOW = 1_800_000_000_000;

describe('liveTerms', () => {
  const answering = (status: number, header: Record<string, string>, body = ''): Ask => async () => ({
    status,
    header: (name) => header[name] ?? null,
    body,
  });

  test('reads the offers of a 402 and dates them now', async () => {
    const required = btoa(JSON.stringify({ x402Version: 2, accepts: [{ scheme: 'exact', ...OFFER, maxTimeoutSeconds: 60, extra: {} }] }));
    const read = liveTerms(answering(402, { 'payment-required': required }), () => NOW);
    expect(await read('https://seller.example/x')).toEqual({ at: NOW / 1000, offers: [OFFER] });
  });

  test('is null for an endpoint that answers no 402, or cannot be reached, or is private', async () => {
    expect(await liveTerms(answering(200, {}, '{}'), () => NOW)('https://seller.example/x')).toBeNull();
    const down: Ask = async () => Promise.reject(new Error('ECONNREFUSED'));
    expect(await liveTerms(down, () => NOW)('https://seller.example/x')).toBeNull();
    const refused: Ask = async () => Promise.reject(new Refused('private-address', '127.0.0.1 is not a public address'));
    expect(await liveTerms(refused, () => NOW)('http://127.0.0.1/x')).toBeNull();
  });
});

describe('probeTerms', () => {
  test('asks the probe by target and date, and reads its reading', async () => {
    let asked = '';
    const fetcher = (async (url: URL) => {
      asked = String(url);
      return Response.json({ reading: { at: '2026-11-11T10:00:00.000Z', offers: [OFFER] } });
    }) as unknown as typeof fetch; // the one call shape `probeTerms` makes
    const read = probeTerms('https://probe.example', { fetch: fetcher });
    expect(await read('https://seller.example/x402/weather', 1_762_860_000)).toEqual({ at: Date.parse('2026-11-11T10:00:00.000Z') / 1000, offers: [OFFER] });
    expect(asked).toBe('https://probe.example/x402?target=seller.example%2Fx402%2Fweather&before=2025-11-11T11%3A20%3A00.000Z');
  });

  test('is null when the probe has no reading, does not answer, or answers something else, and logs the outage', async () => {
    const lines: string[] = [];
    const with_ = (response: () => Response) =>
      probeTerms('https://probe.example', { fetch: (async () => response()) as unknown as typeof fetch, log: (line) => lines.push(line) }); // as above
    expect(await with_(() => new Response('{}', { status: 404 }))('https://seller.example/x', 1)).toBeNull();
    expect(await with_(() => new Response('', { status: 500 }))('https://seller.example/x', 1)).toBeNull();
    expect(await with_(() => Response.json({ reading: { at: 'yesterday', offers: [] } }))('https://seller.example/x', 1)).toBeNull();
    expect(lines).toHaveLength(2);
  });
});
