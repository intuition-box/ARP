/**
 * The Claude Desktop extension, one `.mcpb` file (task 135, ADR `0110`).
 *
 *     bun run mcpb            write dist-mcpb/arp-<version>.mcpb, after `bun run packages`
 *
 * It carries the same `bin/arp.js` the Claude Code plugin carries (`packaging/claude/arp/bin/`), so the
 * two cannot drift: this script never builds its own. The server runs in the Desktop mode, `ARP_TOOLS=desktop`
 * (ADR `0110`): the reads, `arp_get_skill` and `arp_declare_used`, with nothing for the person to sign,
 * on testnet 13579. The sponsoring service and the content server are the bundle's defaults, inlined from
 * `package.json` `config` (ADR `0175`, ADR `0196`). Desktop runs no hook, so `hook.js` is left out.
 *
 * The one setting is task 88's: whether this machine's skill failures are shared, off by default, passed
 * to the server as `ARP_SHARE`.
 *
 * Packed with `@anthropic-ai/mcpb`, pinned in this package's devDependencies so it never ships in the npm
 * package. The manifest is validated before it is packed.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { SERVER_ENV } from '../src/install/targets.ts';

const CLI = resolve(import.meta.dir, '..');
const ROOT = resolve(CLI, '..', '..');
const BIN = join(ROOT, 'packaging', 'claude', 'arp', 'bin');
const OUT = join(CLI, 'dist-mcpb');
const MCPB = join(CLI, 'node_modules', '.bin', 'mcpb');

// This package's own manifest: the three fields read below are in it, and `bun run mcpb` fails at once if not.
const pkg = JSON.parse(readFileSync(join(CLI, 'package.json'), 'utf8')) as {
  version: string;
  license: string;
  engines: { node: string };
};

/** Desktop's mode: the server's own env plus the mode and the share setting. */
export const DESKTOP_ENV = {
  ...SERVER_ENV,
  ARP_TOOLS: 'desktop',
  ARP_SHARE: '${user_config.share_failures}',
};

export function manifest(version: string) {
  return {
    manifest_version: '0.3',
    name: 'arp',
    display_name: 'ARP',
    version,
    description:
      'Check a skill or MCP server before your agent uses it: what it asks for, and what other agents wrote about it.',
    long_description:
      'ARP reads a public index of skills, tools and agents on Intuition testnet 13579. In Claude Desktop it ' +
      "finds a skill, shows what its files ask for, serves its SKILL.md with a signed receipt from ARP's content " +
      "server, and can record publicly that your agent used it, paid by ARP's sponsoring service: you sign nothing " +
      'and see no wallet. A local key in your home directory names your agent. Name ARP in your request for Claude to use it.',
    author: { name: 'ARP', url: 'https://github.com/intuition-box/ARP' },
    repository: { type: 'git', url: 'https://github.com/intuition-box/ARP' },
    homepage: 'https://arp.intuition.box',
    documentation: 'https://arp.intuition.box/docs/install',
    support: 'https://github.com/intuition-box/ARP/issues',
    icon: 'icon.png',
    license: pkg.license,
    keywords: ['mcp', 'agent', 'skills', 'reputation', 'erc-8004', 'intuition'],
    server: {
      type: 'node',
      entry_point: 'server/arp.js',
      mcp_config: {
        command: 'node',
        args: ['${__dirname}/server/arp.js', 'mcp'],
        env: DESKTOP_ENV,
      },
    },
    tools_generated: true,
    compatibility: {
      platforms: ['darwin', 'win32', 'linux'],
      runtimes: { node: pkg.engines.node },
    },
    user_config: {
      share_failures: {
        type: 'boolean',
        title: "Share this machine's skill failures as public lines",
        description:
          "When a skill fails here, one public line on Intuition testnet: the skill's public address, its category when known, " +
          '"failed" and a closed reason, signed by this machine\'s own public ARP address, the same on every line. ' +
          'Never your prompts, files, paths, code or keys.',
        default: false,
      },
    },
  };
}

export function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** Where `build` reads and writes, and how it runs `mcpb`; the defaults are this repo's. */
export type BuildPaths = { bin: string; out: string; cli: string; mcpb: string };

type Run = (file: string, args: string[]) => void;

export const runInherit: Run = (file, args) => {
  execFileSync(file, args, { stdio: 'inherit' });
};

/** Stages the bundle, validates its manifest and packs it; returns the `.mcpb` file it wrote. */
export function build(paths: BuildPaths = { bin: BIN, out: OUT, cli: CLI, mcpb: MCPB }, run: Run = runInherit): string {
  const stage = join(paths.out, 'stage');
  if (!existsSync(join(paths.bin, 'arp.js'))) throw new Error(`${paths.bin}/arp.js is missing: run bun run packages first`);
  rmSync(paths.out, { recursive: true, force: true });
  mkdirSync(join(stage, 'server'), { recursive: true });
  copyFileSync(join(paths.bin, 'arp.js'), join(stage, 'server', 'arp.js'));
  // The search package the release bundles, and its licences (task 141, ADR `0201`).
  copyFileSync(join(paths.bin, 'skills-cli.js'), join(stage, 'server', 'skills-cli.js'));
  copyFileSync(join(paths.bin, 'skills-cli.LICENSE.txt'), join(stage, 'server', 'skills-cli.LICENSE.txt'));
  copyFileSync(join(paths.bin, 'package.json'), join(stage, 'server', 'package.json'));
  copyFileSync(join(paths.cli, 'assets', 'icon.png'), join(stage, 'icon.png'));
  writeFileSync(join(stage, 'manifest.json'), `${JSON.stringify(manifest(pkg.version), null, 2)}\n`);

  run(paths.mcpb, ['validate', join(stage, 'manifest.json')]);
  const file = join(paths.out, `arp-${pkg.version}.mcpb`);
  run(paths.mcpb, ['pack', stage, file]);
  return file;
}

if (import.meta.main) {
  const file = build();
  console.log(`wrote ${file}\nsha256 ${sha256(file)}`);
}
