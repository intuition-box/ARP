import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { applyDesktopShare, shareAskInstructions } from '../src/share-ask.js';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const home = () => {
  const dir = mkdtempSync(join(tmpdir(), 'arp-share-ask-'));
  dirs.push(dir);
  return dir;
};

describe('the plugin asks once about sharing (task 88)', () => {
  it('asks while no answer is on file, naming what leaves, what never does, and that the person answers', () => {
    const text = shareAskInstructions(home());
    expect(text).toContain("Share this machine's skill failures as public lines?");
    expect(text).toContain('Never your prompts');
    expect(text).toContain('not online yet');
    expect(text).toContain('/arp:share-on');
    expect(text).toContain('Do not run either yourself');
  });

  it('says nothing once the person answered, yes or no', () => {
    const dir = home();
    writeFileSync(join(dir, 'sharing.json'), '{"failures":false}\n');
    expect(shareAskInstructions(dir)).toBeNull();
  });
});

describe('the Desktop extension writes its checkbox (task 88)', () => {
  it('writes true or false as the answer, and nothing for any other value', () => {
    const dir = home();
    expect(applyDesktopShare('true', dir)).toBe(true);
    expect(JSON.parse(readFileSync(join(dir, 'sharing.json'), 'utf8'))).toEqual({ failures: true });
    expect(applyDesktopShare('false', dir)).toBe(false);
    expect(JSON.parse(readFileSync(join(dir, 'sharing.json'), 'utf8'))).toEqual({ failures: false });
    expect(applyDesktopShare('${user_config.share}', dir)).toBeNull();
    expect(applyDesktopShare(undefined, dir)).toBeNull();
  });
});
