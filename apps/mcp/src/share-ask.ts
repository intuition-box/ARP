import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { SHARE_OFFER } from '@arp-protocol/core';

/**
 * The plugin has no install screen, so its server asks the agent to put the sharing offer to the person,
 * once, while no answer is on file (task 88, ADR `0157`). The person answers by typing a command the model
 * cannot invoke (`/arp:share-on`, `/arp:share-off`), so the choice stays theirs. `null` once answered.
 */
export function shareAskInstructions(arpHome: string): string | null {
  if (existsSync(join(arpHome, 'sharing.json'))) return null;
  return [
    'SHARING IS NOT SET YET. Once in this session, at a natural pause (never in the middle of a task), ask the',
    `person: "${SHARE_OFFER.question}" and give them, in your own short words, exactly this: ${SHARE_OFFER.sends}`,
    `${SHARE_OFFER.signer} ${SHARE_OFFER.never} ${SHARE_OFFER.service}`,
    'It is off unless they agree. If they agree, they type /arp:share-on; if not, /arp:share-off, so the',
    'question is not asked again. Do not run either yourself, and do not ask twice.',
  ].join('\n');
}

/**
 * The Desktop extension's setting (task 88): its manifest passes a checkbox as `ARP_SHARE`, `true` or
 * `false`, and the checkbox is the answer, so it is written each start. Anything else leaves the file alone.
 * Returns what was written, or `null`.
 */
export function applyDesktopShare(value: string | undefined, arpHome: string): boolean | null {
  if (value !== 'true' && value !== 'false') return null;
  mkdirSync(arpHome, { recursive: true });
  writeFileSync(join(arpHome, 'sharing.json'), `${JSON.stringify({ failures: value === 'true' })}\n`);
  return value === 'true';
}
