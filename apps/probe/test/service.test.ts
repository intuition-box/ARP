import { describe, expect, test } from 'bun:test';

import type { Reading } from '../src/probe.ts';
import { memoryReadings } from '../src/store.ts';
import { TARGETS, type Target } from '../src/targets.ts';
import { handle, probeAnswer } from '../src/service.ts';

const NOW = Date.parse('2026-11-11T12:00:00.000Z');
const clock = () => NOW;

const a: Target = { label: 'a.test/mcp', kind: 'endpoint', repo: 'o/a', url: 'https://a.test/mcp' };
const b: Target = { label: 'npmjs.com/package/b', kind: 'npm', repo: 'o/b', url: 'https://npmjs.com/package/b' };

function row(target: string, at: string, outcome: Reading['outcome'] = 'answers'): Reading {
  return { target, kind: 'endpoint', at, outcome, http: 200, ms: 12, detail: 'kept out of the history' };
}

/** The service's own JSON answer, read as the shape the assertion that follows checks. */
async function body<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe('probeAnswer', () => {
  test('gives each target its latest reading and its history, without the detail', () => {
    const rows = [row(a.label, '2026-11-11T10:00:00.000Z'), row(a.label, '2026-11-11T11:00:00.000Z', 'no-answer')];
    const answer = probeAnswer([a, b], rows, 7);
    expect(answer.measuredBy).toBe('ARP, from its own server');
    expect(answer.window).toEqual({ days: 7 });
    expect(answer.targets[0]).toEqual({
      label: a.label,
      kind: 'endpoint',
      repo: 'o/a',
      latest: rows[1],
      history: [
        { at: '2026-11-11T10:00:00.000Z', outcome: 'answers', http: 200, ms: 12 },
        { at: '2026-11-11T11:00:00.000Z', outcome: 'no-answer', http: 200, ms: 12 },
      ],
    });
    expect(answer.targets[1]?.label).toBe(b.label);
    expect(answer.targets[1]?.latest).toBeNull();
    expect(answer.targets[1]?.history).toEqual([]);
  });
});

describe('handle', () => {
  test('answers a CORS preflight with no body', async () => {
    const response = await handle(new Request('https://probe.test/probe', { method: 'OPTIONS' }), memoryReadings(), clock);
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toBe('GET, OPTIONS');
    expect(await response.text()).toBe('');
  });

  test('/probe reads one day back by default, and is cacheable for a minute', async () => {
    const store = memoryReadings();
    await store.append([row(TARGETS[0]?.label ?? '', '2026-11-10T11:59:00.000Z'), row(TARGETS[0]?.label ?? '', '2026-11-10T12:01:00.000Z')]);
    const response = await handle(new Request('https://probe.test/probe'), store, clock);
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    expect(response.headers.get('content-type')).toBe('application/json');
    const answer = await body<{ window: { days: number }; targets: { history: unknown[] }[] }>(response);
    expect(answer.window.days).toBe(1);
    expect(answer.targets[0]?.history).toHaveLength(1);
  });

  test('/probe falls back to one day for a window that is not a positive number', async () => {
    for (const days of ['0', '-3', 'abc', 'Infinity']) {
      const response = await handle(new Request(`https://probe.test/probe?days=${days}`), memoryReadings(), clock);
      expect((await body<{ window: { days: number } }>(response)).window.days).toBe(1);
    }
  });

  test('/x402 skips a reading that kept no offers, taken while the switch was off (ADR 0200)', async () => {
    const store = memoryReadings();
    await store.append([
      { ...row(a.label, '2026-11-11T08:00:00.000Z', 'x402'), detail: '{"offers":[{"payTo":"0x1"}]}' },
      { ...row(a.label, '2026-11-11T09:00:00.000Z', 'x402'), detail: null },
    ]);
    const response = await handle(
      new Request(`https://probe.test/x402?target=${encodeURIComponent(a.label)}&before=2026-11-11T10:00:00Z`),
      store,
      clock,
      { x402: true },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      measuredBy: 'ARP, from its own server',
      reading: { target: a.label, at: '2026-11-11T08:00:00.000Z', offers: [{ payTo: '0x1' }] },
    });
  });

  test('/x402 refuses a request without a target or a date', async () => {
    for (const query of ['', 'target=a.test%2Fmcp', 'before=2026-11-11T10:00:00Z']) {
      const response = await handle(new Request(`https://probe.test/x402?${query}`), memoryReadings(), clock, { x402: true });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'GET /x402?target=<label>&before=<ISO 8601>' });
    }
  });

  test('/x402 says which target and date it found nothing for', async () => {
    const response = await handle(
      new Request('https://probe.test/x402?target=a.test%2Fmcp&before=2026-11-11T10:00:00Z'),
      memoryReadings(),
      clock,
      { x402: true },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'no x402 reading of a.test/mcp before 2026-11-11T10:00:00.000Z' });
  });

  test('/healthz counts the targets and names the last reading of the past hour', async () => {
    const store = memoryReadings();
    await store.append([row(a.label, '2026-11-11T10:30:00.000Z'), row(a.label, '2026-11-11T11:10:00.000Z'), row(a.label, '2026-11-11T11:55:00.000Z')]);
    const response = await handle(new Request('https://probe.test/healthz'), store, clock);
    expect(await response.json()).toEqual({ ok: true, targets: TARGETS.length, lastReading: '2026-11-11T11:55:00.000Z' });

    const empty = await handle(new Request('https://probe.test/healthz'), memoryReadings(), clock);
    expect((await body<{ lastReading: string | null }>(empty)).lastReading).toBeNull();
  });

  test('any other route or method is a 404 that lists the routes, /x402 among them only when on', async () => {
    const requests = () => [new Request('https://probe.test/'), new Request('https://probe.test/probe', { method: 'POST' })];
    for (const request of requests()) {
      const off = await handle(request, memoryReadings(), clock);
      expect(off.status).toBe(404);
      expect(await off.json()).toEqual({ error: 'GET /probe or GET /healthz' });
    }
    for (const request of requests()) {
      const on = await handle(request, memoryReadings(), clock, { x402: true });
      expect(await on.json()).toEqual({ error: 'GET /probe, GET /x402 or GET /healthz' });
    }
  });
});
