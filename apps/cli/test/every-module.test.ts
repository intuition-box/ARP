import { expect, test } from 'bun:test';
import { Glob } from 'bun';

/** Bun counts only the files a test loads, so a module no test imports would be missing from the
 *  coverage figure instead of counting at 0 %. Loading every one makes the gate see all of them. */
const EXCLUDED = new Set([
  'cli.ts', // the entrypoint, excluded in bunfig.toml: it runs a command at import
]);
const SRC = new URL('../src/', import.meta.url).pathname;
const modules = [...new Glob('**/*.ts').scanSync(SRC)].filter((m) => !EXCLUDED.has(m)).sort();

test('src/ holds the modules this list expects', () => {
  expect(modules.length).toBeGreaterThan(0);
});

test.each(modules)('src/%s loads and exports something', async (path) => {
  const module: Record<string, unknown> = await import(`${SRC}${path}`);
  expect(Object.keys(module).length).toBeGreaterThan(0);
});
