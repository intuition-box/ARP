import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { sharingFileText } from '@arp-protocol/core';

/**
 * The Desktop extension's setting (task 88): its manifest passes a checkbox as `ARP_SHARE`, `true` or
 * `false`, and the checkbox is the answer, so it is written each start. Anything else leaves the file alone.
 * Returns what was written, or `null`.
 *
 * The plugin's server no longer asks in its instructions (task 88 did, at the start of each session while no
 * answer was on file). The hook asks instead, once, after the first skill result (task 126, ADR `0191`): asking
 * in both places would ask twice, and the hook is where there is a result to share.
 */
export function applyDesktopShare(value: string | undefined, arpHome: string): boolean | null {
  if (value !== 'true' && value !== 'false') return null;
  mkdirSync(arpHome, { recursive: true });
  writeFileSync(join(arpHome, 'sharing.json'), sharingFileText(value === 'true', 'desktop', new Date()));
  return value === 'true';
}
