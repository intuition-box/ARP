import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'bun:test';

import pkg from '../package.json';
import { DESKTOP_ENV, manifest } from '../scripts/mcpb.ts';

/** The Claude Desktop extension's manifest (task 135, ADR `0110`). */
const built = manifest(pkg.version);

test('the extension runs the Desktop mode on testnet, from the bundled arp.js', () => {
  expect(built.version).toBe(pkg.version);
  expect(built.server.entry_point).toBe('server/arp.js');
  expect(built.server.mcp_config.args).toEqual(['${__dirname}/server/arp.js', 'mcp']);
  expect(Object.entries(built.server.mcp_config.env)).toEqual([
    ['ARP_TARGET', 'testnet'],
    ['ARP_TOOLS', 'desktop'],
    ['ARP_SHARE', '${user_config.share_failures}'],
  ]);
  expect(built.compatibility.runtimes.node).toBe(pkg.engines.node);
});

test('sharing failures is a setting the person turns on, off by default (task 88)', () => {
  expect(built.user_config.share_failures.type).toBe('boolean');
  expect(built.user_config.share_failures.default).toBe(false);
});

test("the manifest passes the official validator", () => {
  const dir = mkdtempSync(join(tmpdir(), 'arp-mcpb-'));
  const path = join(dir, 'manifest.json');
  writeFileSync(path, JSON.stringify(built));
  // The validator checks the icon the manifest names, beside it.
  copyFileSync(join(import.meta.dir, '..', 'assets', 'icon.png'), join(dir, 'icon.png'));
  const out = execFileSync(join(import.meta.dir, '..', 'node_modules', '.bin', 'mcpb'), ['validate', path], {
    encoding: 'utf8',
  });
  expect(out).toContain('Manifest schema validation passes');
});

/** `initialize` over stdio, under Node, in Desktop's mode, with `HOME` a fresh folder. */
function initialize(entry: string, home: string, share: string) {
  const request = {
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'host', version: '0' } },
  };
  const proc = Bun.spawnSync(['node', entry, 'mcp'], {
    cwd: home,
    stdin: new TextEncoder().encode(`${JSON.stringify(request)}\n`),
    env: { ...process.env, HOME: home, ...DESKTOP_ENV, ARP_SHARE: share },
  });
  const line = proc.stdout.toString().split('\n').find((text) => text.startsWith('{'));
  // The server's own JSON-RPC answer; the test reads the one field it is about.
  return JSON.parse(line ?? '{}') as { result?: { serverInfo?: { name: string; version: string } } };
}

// The `.mcpb` copies this file unchanged (`scripts/mcpb.ts`), so it is the extension's server.
const BUNDLE = join(import.meta.dir, '..', '..', '..', 'packaging', 'claude', 'arp', 'bin', 'arp.js');

test("the bundled server reports the package's version, not a hard-coded one (task 137)", () => {
  const home = mkdtempSync(join(tmpdir(), 'arp-mcpb-home-'));
  try {
    expect(initialize(BUNDLE, home, 'false').result?.serverInfo).toEqual({ name: 'ARP', version: pkg.version });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}, 20_000);

test('the bundled server leaves a choice made in Claude Code alone while the box is unchanged (task 137)', () => {
  const home = mkdtempSync(join(tmpdir(), 'arp-mcpb-home-'));
  const file = join(home, '.arp', 'sharing.json');
  const sharing = () => JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  try {
    initialize(BUNDLE, home, 'false');
    expect(sharing()).toMatchObject({ failures: false, how: 'desktop' });
    // `arp share on` in Claude Code, on the same machine.
    writeFileSync(file, `${JSON.stringify({ failures: true, at: new Date().toISOString(), how: 'command' })}\n`);
    initialize(BUNDLE, home, 'false');
    expect(sharing()).toMatchObject({ failures: true, how: 'command' });
    initialize(BUNDLE, home, 'true');
    expect(sharing()).toMatchObject({ failures: true, how: 'desktop' });
    initialize(BUNDLE, home, 'false');
    expect(sharing()).toMatchObject({ failures: false, how: 'desktop' });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}, 40_000);
