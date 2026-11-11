import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** The variables the hook's modules read. An in-process test sets them and puts each one back, so no test leaks into the next. */
const KEYS = ['ARP_HOME', 'ARP_SESSION_LOG', 'ARP_SKILLS_DIR', 'ARP_SHARE_AUTO', 'ARP_CLI', 'ARP_FAILURE_LINES', 'ARP_RECEIPTS'] as const;

export type Sandbox = { dir: string; home: string; restore: () => void };

/**
 * A fresh directory, with `ARP_HOME` and `ARP_SESSION_LOG` inside it and no `ARP_SKILLS_DIR` or `ARP_CLI`. The live
 * index read and the sharing stay as `setup.ts` left them (off) unless a test turns them on.
 */
export function sandbox(prefix: string): Sandbox {
  const saved = new Map(KEYS.map((key) => [key, process.env[key]]));
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const home = join(dir, 'home');
  process.env['ARP_HOME'] = home;
  process.env['ARP_SESSION_LOG'] = join(dir, '.arp', 'session.jsonl');
  delete process.env['ARP_SKILLS_DIR'];
  delete process.env['ARP_CLI'];
  delete process.env['ARP_RECEIPTS'];
  return {
    dir,
    home,
    restore: () => {
      for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
