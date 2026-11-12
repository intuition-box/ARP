import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'bun:test';

import pkg from '../package.json';
import { DESKTOP_ENV, build, manifest, runInherit, sha256 } from '../scripts/mcpb.ts';

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

test('build stages arp.js, the bundled search and its licences, its package.json, the icon and the manifest, validates, then packs', () => {
  const root = mkdtempSync(join(tmpdir(), 'arp-mcpb-'));
  try {
    const bin = join(root, 'bin');
    const cli = join(root, 'cli');
    const out = join(root, 'out');
    for (const dir of [bin, join(cli, 'assets')]) mkdirSync(dir, { recursive: true });
    writeFileSync(join(bin, 'arp.js'), 'server');
    writeFileSync(join(bin, 'package.json'), '{"type":"module"}');
    writeFileSync(join(bin, 'skills-cli.js'), 'search');
    writeFileSync(join(bin, 'skills-cli.LICENSE.txt'), 'licences');
    writeFileSync(join(cli, 'assets', 'icon.png'), 'png');
    const calls: string[][] = [];
    const file = build({ bin, cli, out, mcpb: 'mcpb' }, (command, args) => {
      calls.push([command, ...args]);
    });

    const stage = join(out, 'stage');
    expect(file).toBe(join(out, `arp-${pkg.version}.mcpb`));
    expect(calls).toEqual([
      ['mcpb', 'validate', join(stage, 'manifest.json')],
      ['mcpb', 'pack', stage, file],
    ]);
    expect(readFileSync(join(stage, 'server', 'arp.js'), 'utf8')).toBe('server');
    expect(readFileSync(join(stage, 'server', 'skills-cli.js'), 'utf8')).toBe('search');
    expect(readFileSync(join(stage, 'server', 'skills-cli.LICENSE.txt'), 'utf8')).toBe('licences');
    expect(readFileSync(join(stage, 'icon.png'), 'utf8')).toBe('png');
    expect(JSON.parse(readFileSync(join(stage, 'manifest.json'), 'utf8'))).toEqual(manifest(pkg.version));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('build refuses before writing anything when arp.js has not been packaged', () => {
  const root = mkdtempSync(join(tmpdir(), 'arp-mcpb-'));
  try {
    const out = join(root, 'out');
    expect(() => build({ bin: join(root, 'bin'), cli: root, out, mcpb: 'mcpb' }, () => undefined)).toThrow(
      /arp\.js is missing: run bun run packages first/,
    );
    expect(existsSync(out)).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('sha256 is the hex digest of the file', () => {
  const root = mkdtempSync(join(tmpdir(), 'arp-mcpb-'));
  try {
    const file = join(root, 'f');
    writeFileSync(file, 'abc');
    expect(sha256(file)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the default runner passes when the command exits 0 and throws when it does not', () => {
  expect(() => runInherit(process.execPath, ['-e', ''])).not.toThrow();
  expect(() => runInherit(process.execPath, ['-e', 'process.exit(3)'])).toThrow();
});
