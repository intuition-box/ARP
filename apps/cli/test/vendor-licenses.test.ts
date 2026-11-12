import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'bun:test';

import { BUNDLED, licenceFile, noticeOf, packageDir, writeLicenceFile } from '../scripts/vendor-licenses.ts';

/** The notice that ships beside `skills-cli.js` (task 141, ADR `0201`). */
const CLI = resolve(import.meta.dir, '..');

function fakePackage(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'arp-licence-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo', version: '1.2.3', license: 'MIT' }));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}

test('every bundled package resolves from where the CLI is built, at one version', () => {
  const skills = packageDir('skills', CLI);
  const tar = packageDir('tar', skills);
  for (const name of BUNDLED) {
    const notice = noticeOf(name === 'skills' ? skills : packageDir(name, skills, tar, CLI));
    expect(notice.name).toBe(name);
    expect(notice.text.length).toBeGreaterThan(100);
  }
  expect(noticeOf(skills).version).toBe('1.7.6');
});

test('the bundled tree is the one ADR 0201 lists: a moved dependency fails here, before a different bundle ships', () => {
  const skills = packageDir('skills', CLI);
  const tar = packageDir('tar', skills);
  const versions = Object.fromEntries(
    BUNDLED.map((name) => [name, noticeOf(name === 'skills' ? skills : packageDir(name, skills, tar, CLI)).version]),
  );
  expect(versions).toEqual({
    skills: '1.7.6',
    tar: '7.5.23',
    yaml: '2.9.1',
    minipass: '7.1.3',
    chownr: '3.0.0',
    minizlib: '3.1.0',
    '@isaacs/fs-minipass': '4.0.1',
    yallist: '5.0.0',
  });
});

test("a package's licence and third-party notice are both kept", () => {
  const notice = noticeOf(fakePackage({ LICENSE: 'the licence', 'ThirdPartyNoticeText.txt': 'the notice', 'README.md': 'zzz-readme' }));
  expect(notice.text).toContain('the licence');
  expect(notice.text).toContain('the notice');
  expect(notice.text).not.toContain('zzz-readme');
});

test('a package with no licence file stops the build', () => {
  expect(() => noticeOf(fakePackage({ 'README.md': 'x' }))).toThrow('ships no licence file');
});

test('a package nowhere to be found stops the build', () => {
  const empty = mkdtempSync(join(tmpdir(), 'arp-none-'));
  mkdirSync(join(empty, 'node_modules'));
  writeFileSync(join(empty, 'package.json'), '{}');
  expect(() => packageDir('surely-not-installed-anywhere', empty)).toThrow('is not installed');
});

test('the file names each package, its version and its licence, then the text', () => {
  const text = licenceFile([{ name: 'a', version: '1.0.0', license: 'MIT', text: 'MIT text' }]);
  expect(text).toContain('== a@1.0.0 (MIT) ==');
  expect(text).toContain('MIT text');
  expect(text.startsWith('skills-cli.js bundles')).toBe(true);
});

test('the build writes the notice beside the bundle, naming all eight packages', () => {
  if (!existsSync(join(CLI, 'dist', 'skills-cli.js'))) throw new Error('run `bun run build` first');
  const { file, packages } = writeLicenceFile(CLI);
  expect(packages).toHaveLength(BUNDLED.length);
  expect(packages[0]).toBe('skills@1.7.6');
  expect(readFileSync(file, 'utf8')).toContain('== skills@1.7.6 (MIT) ==');
});

test('no notice is written without the bundle beside it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arp-nobundle-'));
  mkdirSync(join(dir, 'dist'));
  writeFileSync(join(dir, 'package.json'), '{}');
  // Resolves `skills` from the real CLI's node_modules, then finds no bundle in `dir`.
  expect(() => writeLicenceFile(dir)).toThrow();
});
