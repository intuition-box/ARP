import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Io } from '../src/probe.ts';
import { guardedIo, start, type Started } from '../src/server.ts';
import type { Target } from '../src/targets.ts';

const dirs: string[] = [];
const running: Started[] = [];
afterEach(async () => {
  for (const service of running.splice(0)) await service.stop();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function dataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'arp-probe-main-'));
  dirs.push(dir);
  return dir;
}

const target: Target = { label: 'mcp.example.com/mcp', kind: 'endpoint', repo: 'o/r', url: 'https://mcp.example.com/mcp' };
const answers: Io = {
  ask: async () => ({ status: 200, header: () => null, body: '{"jsonrpc":"2.0","id":1,"result":{}}' }),
  fetch: async () => new Response('', { status: 404 }),
};

async function until(check: () => boolean): Promise<void> {
  for (let i = 0; i < 100 && !check(); i += 1) await Bun.sleep(10);
}

describe('the process', () => {
  test('reads every target on start, keeps it under ARP_DATA_DIR, and answers its own Host only', async () => {
    const dir = dataDir();
    const lines: string[] = [];
    const service = start({ PROBE_PORT: '0', ARP_DATA_DIR: dir }, answers, (line) => lines.push(line), [target]);
    if ('error' in service) throw new Error(service.error);
    running.push(service);
    await until(() => lines.length > 0);
    expect(lines[0]).toBe('arp-probe: cycle read 1: 1 answers');
    expect(existsSync(join(dir, 'probe.sqlite'))).toBe(true);
    expect(service.banner.join('\n')).toContain('GET /x402 off');

    const base = `http://127.0.0.1:${service.port}`;
    const health = (await (await fetch(`${base}/healthz`)).json()) as { lastReading: string | null };
    expect(health.lastReading).not.toBeNull();
    expect((await fetch(`${base}/probe`, { headers: { host: 'evil.example' } })).status).toBe(421);
    expect((await fetch(`${base}/x402?target=a&before=2026-11-11T00:00:00Z`)).status).toBe(404);
  });

  test('ARP_PROBE_X402=on turns the route on', async () => {
    const service = start({ PROBE_PORT: '0', ARP_DATA_DIR: dataDir(), ARP_PROBE_X402: 'on' }, answers, () => {}, []);
    if ('error' in service) throw new Error(service.error);
    running.push(service);
    expect(service.banner.join('\n')).toContain('GET /x402 on');
    const missing = await fetch(`http://127.0.0.1:${service.port}/x402?target=a&before=2026-11-11T00:00:00Z`);
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as { error: string }).error).toStartWith('no x402 reading of a');
  });

  test('a cycle that throws is logged, and the schedule carries on', async () => {
    const lines: string[] = [];
    let first = true;
    const log = (line: string) => {
      if (first) {
        first = false;
        throw new Error('log down');
      }
      lines.push(line);
    };
    const service = start({ PROBE_PORT: '0', ARP_DATA_DIR: dataDir() }, answers, log, [target]);
    if ('error' in service) throw new Error(service.error);
    running.push(service);
    await until(() => lines.length > 0);
    expect(lines[0]).toBe('arp-probe: cycle failed: Error: log down');
  });

  test('refuses a bad port, and every interface without a public name', () => {
    expect(start({ PROBE_PORT: '-1' }, answers, () => {})).toEqual({ error: 'PROBE_PORT -1 is not a port' });
    expect(start({ PROBE_PORT: '0', PROBE_LISTEN: '0.0.0.0' }, answers, () => {})).toHaveProperty('error');
  });

  test('the hosted way out refuses a private endpoint before connecting', async () => {
    await expect(guardedIo.ask('http://10.0.0.1/mcp', { method: 'POST', headers: {} })).rejects.toMatchObject({
      rule: 'private-address',
    });
  });
});
