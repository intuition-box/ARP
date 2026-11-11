import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

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
