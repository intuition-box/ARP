import { expect, test } from 'bun:test';
import { Glob } from 'bun';

/** Bun counts only the files a test loads, so a module no test imports would be missing from the
 *  coverage figure instead of counting at 0 %. Loading every one makes the gate see all of them. */
// `main.ts` starts the service at import (binds a port, starts the schedule); `server.ts` is what it runs, tested.
const EXCLUDED = new Set<string>(['main.ts']);
const SRC = new URL('../src/', import.meta.url).pathname;
const modules = [...new Glob('**/*.ts').scanSync(SRC)].filter((m) => !EXCLUDED.has(m)).sort();

test('src/ holds the modules this list expects', () => {
  expect(modules.length).toBeGreaterThan(0);
});

test.each(modules)('src/%s loads and exports something', async (path) => {
  const module: Record<string, unknown> = await import(`${SRC}${path}`);
  expect(Object.keys(module).length).toBeGreaterThan(0);
});
