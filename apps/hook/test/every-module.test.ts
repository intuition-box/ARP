import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'bun:test';

// Bun counts only the files a test loads, so a module no test imports would sit outside the 90 % gate (task 136,
// ADR `0198`). This loads every one of them. `hook.ts` is the one left out, and `bunfig.toml` says why.
const SRC = join(import.meta.dir, '..', 'src');
const ENTRYPOINT = 'hook.ts';

test('every module in src/ loads and exports something', async () => {
  const modules = readdirSync(SRC).filter((name) => name.endsWith('.ts'));
  expect(modules).toContain(ENTRYPOINT);
  for (const name of modules.filter((module) => module !== ENTRYPOINT)) {
    const loaded: Record<string, unknown> = await import(join(SRC, name));
    expect([name, Object.keys(loaded).length > 0]).toEqual([name, true]);
  }
});
