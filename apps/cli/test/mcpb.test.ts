import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'bun:test';

import pkg from '../package.json';
import { manifest } from '../scripts/mcpb.ts';

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
