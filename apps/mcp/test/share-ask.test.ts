import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { sharingFileText } from '@arp-protocol/core';

import { applyDesktopShare } from '../src/share-ask.js';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const home = () => {
  const dir = mkdtempSync(join(tmpdir(), 'arp-share-ask-'));
  dirs.push(dir);
  return dir;
};

describe('the Desktop extension writes its checkbox (task 88)', () => {
  it('writes true or false as the answer, with the date and how, and nothing for any other value', () => {
    const dir = home();
    expect(applyDesktopShare('true', dir)).toBe(true);
    expect(JSON.parse(readFileSync(join(dir, 'sharing.json'), 'utf8'))).toMatchObject({ failures: true, how: 'desktop' });
    expect(applyDesktopShare('false', dir)).toBe(false);
    const written = JSON.parse(readFileSync(join(dir, 'sharing.json'), 'utf8')) as Record<string, unknown>;
    expect(written).toMatchObject({ failures: false, how: 'desktop' });
    expect(typeof written['at']).toBe('string');
    expect(applyDesktopShare('${user_config.share}', dir)).toBeNull();
    expect(applyDesktopShare(undefined, dir)).toBeNull();
  });
});

describe('an unchanged checkbox never overwrites a choice made elsewhere (task 137)', () => {
  const sharing = (dir: string) => JSON.parse(readFileSync(join(dir, 'sharing.json'), 'utf8')) as Record<string, unknown>;

  it('Claude Code turns sharing on, Desktop starts with the box off and unchanged: sharing stays on', () => {
    const dir = home();
    expect(applyDesktopShare('false', dir)).toBe(false); // the first start, nothing on file
    writeFileSync(join(dir, 'sharing.json'), sharingFileText(true, 'command', new Date())); // `arp share on`
    expect(applyDesktopShare('false', dir)).toBeNull();
    expect(applyDesktopShare('false', dir)).toBeNull();
    expect(sharing(dir)).toMatchObject({ failures: true, how: 'command' });
  });

  it('an "always" answer made before Desktop ever started survives a box left at its default', () => {
    const dir = home();
    writeFileSync(join(dir, 'sharing.json'), sharingFileText(true, 'asked-always', new Date()));
    expect(applyDesktopShare('false', dir)).toBeNull();
    expect(sharing(dir)).toMatchObject({ failures: true, how: 'asked-always' });
  });

  it('the person changes the box in Desktop: it applies, either way', () => {
    const dir = home();
    expect(applyDesktopShare('false', dir)).toBe(false);
    writeFileSync(join(dir, 'sharing.json'), sharingFileText(true, 'command', new Date()));
    expect(applyDesktopShare('true', dir)).toBe(true); // ticked: a change
    expect(sharing(dir)).toMatchObject({ failures: true, how: 'desktop' });
    writeFileSync(join(dir, 'sharing.json'), sharingFileText(false, 'command', new Date())); // `arp share off`
    expect(applyDesktopShare('true', dir)).toBeNull(); // still ticked, unchanged: off stays off
    expect(sharing(dir)).toMatchObject({ failures: false, how: 'command' });
    expect(applyDesktopShare('false', dir)).toBe(false); // unticked: a change
    expect(sharing(dir)).toMatchObject({ failures: false, how: 'desktop' });
  });

  it("a choice the extension wrote itself follows the box, as before", () => {
    const dir = home();
    writeFileSync(join(dir, 'sharing.json'), sharingFileText(true, 'desktop', new Date())); // written by 0.0.6
    expect(applyDesktopShare('true', dir)).toBe(true);
    expect(sharing(dir)).toMatchObject({ failures: true, how: 'desktop' });
  });

  it('a box ticked for the first time turns sharing on over an earlier "no"', () => {
    const dir = home();
    writeFileSync(join(dir, 'sharing.json'), sharingFileText(false, 'asked-no', new Date()));
    expect(applyDesktopShare('true', dir)).toBe(true);
    expect(sharing(dir)).toMatchObject({ failures: true, how: 'desktop' });
  });
});
