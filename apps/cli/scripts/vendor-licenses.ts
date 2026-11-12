/**
 * The licences of what `dist/skills-cli.js` bundles (task 141, ADR `0201`): the `skills` CLI and the packages
 * it pulls in, each at the version `bun.lock` resolved. MIT, ISC and BlueOak-1.0.0 all allow redistribution
 * with the notice, so the notice goes beside the file, as `skills-cli.LICENSE.txt`.
 *
 *     bun scripts/vendor-licenses.ts    run by `bun run build`, after the bundle
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

/** What the bundle contains: `skills` and its dependency tree, as `bun.lock` has it on 2026-11-12. */
export const BUNDLED = ['skills', 'tar', 'yaml', 'minipass', 'chownr', 'minizlib', '@isaacs/fs-minipass', 'yallist'] as const;

export type Notice = { name: string; version: string; license: string; text: string };

/** The package's directory, resolved from each place in turn: a dependency of a dependency sits beside its parent. */
export function packageDir(name: string, ...from: readonly string[]): string {
  for (const dir of from) {
    try {
      return dirname(createRequire(join(dir, 'package.json')).resolve(`${name}/package.json`));
    } catch {
      // Not reachable from here; the next place is tried.
    }
  }
  throw new Error(`${name} is not installed where the bundle was built from`);
}

/** A package's licence text: its LICENSE file, and for `skills` the third-party notice it ships too. */
export function noticeOf(dir: string): Notice {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { name: string; version: string; license: string }; // npm's own manifest
  const files = readdirSync(dir).filter((file) => /^(licen[cs]e|thirdpartynotice)/i.test(file)).sort();
  if (files.length === 0) throw new Error(`${pkg.name}@${pkg.version} ships no licence file`);
  return { ...pkg, text: files.map((file) => readFileSync(join(dir, file), 'utf8').trim()).join('\n\n') };
}

export function licenceFile(notices: readonly Notice[]): string {
  const head =
    'skills-cli.js bundles the packages below, unmodified, at these versions. Each licence allows ' +
    'redistribution with its notice, which follows.\n';
  return `${head}\n${notices.map((n) => `== ${n.name}@${n.version} (${n.license}) ==\n\n${n.text}\n`).join('\n')}`;
}

/** Writes `dist/skills-cli.LICENSE.txt` beside the bundle; returns what it named. */
export function writeLicenceFile(cli: string): { file: string; packages: string[] } {
  const skills = packageDir('skills', cli);
  const tar = packageDir('tar', skills);
  const notices = BUNDLED.map((name) => noticeOf(name === 'skills' ? skills : packageDir(name, skills, tar, cli)));
  if (!existsSync(join(cli, 'dist', 'skills-cli.js'))) throw new Error('dist/skills-cli.js is missing: run the bundle first');
  const file = join(cli, 'dist', 'skills-cli.LICENSE.txt');
  writeFileSync(file, licenceFile(notices));
  return { file, packages: notices.map((n) => `${n.name}@${n.version}`) };
}

if (import.meta.main) {
  const { file, packages } = writeLicenceFile(resolve(import.meta.dir, '..'));
  console.log(`wrote ${file}: ${packages.join(', ')}`);
}
