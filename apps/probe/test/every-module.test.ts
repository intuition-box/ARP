import { describe, expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';

/**
 * Bun measures only the files a test loads, so a module no test imports would be missing from the
 * coverage report rather than counted at zero. Loading every one of them here keeps the 90 % gate in
 * `bunfig.toml` honest: a new file without tests drags the figure down.
 */
// `main.ts` starts the service at import (binds a port, starts the schedule); `server.ts` is what it runs, tested.
const SOURCES = readdirSync(new URL('../src/', import.meta.url)).filter(
  (file) => file.endsWith('.ts') && file !== 'main.ts',
);

describe('every module in src/', () => {
  test('there is at least one', () => {
    expect(SOURCES.length).toBeGreaterThan(0);
  });

  test.each(SOURCES)('%s loads and exports something', async (file) => {
    const module: Record<string, unknown> = await import(`../src/${file}`);
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});
