import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { start, type Started } from '../src/server.ts';
import type { Fetch } from '../src/sources.ts';

const dirs: string[] = [];
const running: Started[] = [];
afterEach(async () => {
  for (const service of running.splice(0)) await service.stop();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function dataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'arp-api-main-'));
  dirs.push(dir);
  return dir;
}

/** Every upstream read says the quota is spent, so the slice on start returns at once. */
const spent = (async () => new Response('', { status: 429 })) as Fetch;

describe('the process', () => {
  test('listens, keeps its store under ARP_DATA_DIR, and answers its own Host only', async () => {
    const dir = dataDir();
    const lines: string[] = [];
    const service = start({ API_PORT: '0', ARP_DATA_DIR: dir }, spent, (line) => lines.push(line));
    if ('error' in service) throw new Error(service.error);
    running.push(service);
    expect(existsSync(join(dir, 'api.sqlite'))).toBe(true);
    expect(service.banner.join('\n')).toContain('/x402/last-purchase off');
    expect(service.banner.join('\n')).toContain('POST /refresh off');

    const health = await fetch(`http://127.0.0.1:${service.port}/healthz`);
    expect(health.status).toBe(200);
    const other = await fetch(`http://127.0.0.1:${service.port}/healthz`, {
      headers: { host: 'evil.example' },
    });
    expect(other.status).toBe(421);
    const x402 = await fetch(`http://127.0.0.1:${service.port}/x402/last-purchase?url=https%3A%2F%2Fe.example%2F`);
    expect(x402.status).toBe(404);
  });

  test('the switches and the token show in the banner, never their values', () => {
    const service = start(
      {
        API_PORT: '0',
        ARP_DATA_DIR: dataDir(),
        GITHUB_TOKEN: 'ghp_secret',
        REFRESH_SECRET: 'also-secret',
        ARP_X402_LAST_PURCHASE: 'on',
      },
      spent,
      () => {},
    );
    if ('error' in service) throw new Error(service.error);
    running.push(service);
    const banner = service.banner.join('\n');
    expect(banner).toContain('with a token');
    expect(banner).toContain('POST /refresh on');
    expect(banner).toContain('/x402/last-purchase on');
    expect(banner).not.toContain('secret');
  });

  test('a slice that throws is logged, and the service keeps answering', async () => {
    const lines: string[] = [];
    const garbled = (async () => new Response('not json')) as Fetch;
    const service = start({ API_PORT: '0', ARP_DATA_DIR: dataDir() }, garbled, (line) => lines.push(line));
    if ('error' in service) throw new Error(service.error);
    running.push(service);
    for (let i = 0; i < 50 && lines.length === 0; i += 1) await Bun.sleep(10);
    expect(lines[0]).toStartWith('arp-api: slice failed:');
    expect((await fetch(`http://127.0.0.1:${service.port}/healthz`)).status).toBe(200);
  });

  test('refuses a bad port, and every interface without a public name', () => {
    expect(start({ API_PORT: 'eighty' }, spent, () => {})).toEqual({ error: 'API_PORT eighty is not a port' });
    expect(start({ API_PORT: '0', API_LISTEN: '0.0.0.0' }, spent, () => {})).toHaveProperty('error');
  });
});
