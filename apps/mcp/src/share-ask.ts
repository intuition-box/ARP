import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { sharingChoiceOf, sharingFileText } from '@arp-protocol/core';

/** The checkbox's value the extension last saw, beside `sharing.json` (task 137). */
export const DESKTOP_SEEN = 'desktop-share.json';

function readOrNull(path: string): string | null {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

/** What the checkbox said at the last start, else its manifest default, `false`: an unseen checkbox is unticked. */
function lastSeen(arpHome: string): boolean {
  const text = readOrNull(join(arpHome, DESKTOP_SEEN));
  if (text === null) return false;
  try {
    const parsed: unknown = JSON.parse(text);
    // An object, checked first; a file in any other shape counts as the default.
    return typeof parsed === 'object' && parsed !== null && (parsed as Record<string, unknown>)['share'] === true;
  } catch {
    return false;
  }
}

/**
 * The Desktop extension's setting (task 88): its manifest passes a checkbox as `ARP_SHARE`, `true` or
 * `false`. Anything else leaves both files alone. Returns what was written to `sharing.json`, or `null`.
 *
 * Since task 137 the checkbox writes `sharing.json` only when it is the choice to make: no choice on file, a
 * choice the extension itself wrote (`how: desktop`), or a checkbox changed since the last start. An unchanged
 * checkbox never overwrites `arp share on`, `arp init` or an answer to the hook's question made in Claude Code
 * on the same machine; before, it rewrote the file at every start and turned such a choice off.
 *
 * The plugin's server no longer asks in its instructions (task 88 did, at the start of each session while no
 * answer was on file). The hook asks instead, once, after the first skill result (task 126, ADR `0191`): asking
 * in both places would ask twice, and the hook is where there is a result to share.
 */
export function applyDesktopShare(value: string | undefined, arpHome: string, now: Date = new Date()): boolean | null {
  if (value !== 'true' && value !== 'false') return null;
  const ticked = value === 'true';
  const choice = sharingChoiceOf(readOrNull(join(arpHome, 'sharing.json')));
  const changed = ticked !== lastSeen(arpHome);
  mkdirSync(arpHome, { recursive: true });
  writeFileSync(join(arpHome, DESKTOP_SEEN), `${JSON.stringify({ share: ticked })}\n`);
  if (choice !== null && choice.how !== 'desktop' && !changed) return null;
  writeFileSync(join(arpHome, 'sharing.json'), sharingFileText(ticked, 'desktop', now));
  return ticked;
}
