import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  CONTENT_CHAIN_ID,
  contentServerConfig,
  contentServerFetch,
  signerFromFile,
} from '../src/content-server.js';

/** A fixed test key, never funded: Hardhat's account 0, public knowledge. */
const KEY = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const HOST = 'content.example.org';
const PORT = 3003;

function keyFile(content: string, mode = 0o600): string {
  const path = join(mkdtempSync(join(tmpdir(), 'arp-content-')), 'receipt.key');
  writeFileSync(path, content);
  chmodSync(path, mode);
  return path;
}

const signer = { address: ADDRESS, signTypedData: vi.fn(async () => '0x' as const) } as const;
const at = (path: string, init: RequestInit = {}, host = HOST) =>
  new Request(`http://${host}${path}`, { ...init, headers: { host, ...(init.headers ?? {}) } });

describe('contentServerConfig', () => {
  const ok = { ARP_TARGET: 'testnet', ARP_PUBLIC_HOST: HOST, ARP_RECEIPT_KEY_FILE: '/run/secrets/receipt.key' };

  it('starts on testnet with a public name and a key file', () => {
    expect(contentServerConfig(ok)).toEqual({ host: HOST, keyFile: '/run/secrets/receipt.key', port: PORT });
  });

  it.each([
    [{ ...ok, ARP_TARGET: 'mainnet' }, /testnet 13579 only/],
    [{ ...ok, ARP_PUBLIC_HOST: 'https://content.example.org' }, /bare host name/],
    [{ ...ok, ARP_RECEIPT_KEY_FILE: '' }, /ARP_RECEIPT_KEY_FILE/],
    [{ ...ok, ARP_RECEIPT_KEY: KEY }, /refuses ARP_RECEIPT_KEY/],
    [{ ...ok, ARP_AGENT_PRIVATE_KEY: KEY }, /refuses ARP_AGENT_PRIVATE_KEY/],
  ])('refuses %o', (env, reason) => {
    const config = contentServerConfig(env);
    expect('refused' in config && config.refused).toMatch(reason);
  });
});

describe('signerFromFile', () => {
  it('reads a key with or without 0x, as Coolify stores it without', () => {
    expect(signerFromFile(keyFile(KEY)).address).toBe(ADDRESS);
    expect(signerFromFile(keyFile(`0x${KEY}\n`)).address).toBe(ADDRESS);
  });

  it('refuses a key file others can read, and never prints its content', () => {
    expect(() => signerFromFile(keyFile(KEY, 0o644))).toThrow();
    try {
      signerFromFile(keyFile(KEY, 0o644));
    } catch (error) {
      expect(String(error)).not.toContain(KEY);
    }
  });
});

describe('contentServerFetch', () => {
  const serve = vi.fn(async () => new Response('served'));
  const deps = { host: HOST, port: PORT, signer, serve };

  it('serves /content/:atomId on testnet, with its signer', async () => {
    const response = await contentServerFetch(at('/content/0xabc?nonce=1&by=0x2&sig=0x3'), deps);
    expect(await response.text()).toBe('served');
    expect(serve).toHaveBeenCalledWith('0xabc', expect.any(URLSearchParams), CONTENT_CHAIN_ID, signer);
    expect(CONTENT_CHAIN_ID).toBe(13579);
  });

  it('names its signer at /', async () => {
    const body: unknown = await (await contentServerFetch(at('/'), deps)).json();
    expect(body).toMatchObject({ content: { signer: ADDRESS }, chain: { id: 13579 } });
  });

  it('is not an MCP server', async () => {
    const post = at('/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"jsonrpc":"2.0","id":1,"method":"tools/list"}',
    });
    expect((await contentServerFetch(post, deps)).status).toBe(405);
    expect((await contentServerFetch(at('/mcp'), deps)).status).toBe(404);
  });

  it('answers its own name and loopback, and no other host', async () => {
    expect((await contentServerFetch(at('/', {}, `127.0.0.1:${PORT}`), deps)).status).toBe(200);
    expect((await contentServerFetch(at('/', {}, 'evil.example'), deps)).status).toBe(403);
  });
});
