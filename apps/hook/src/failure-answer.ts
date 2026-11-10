import { createHash } from 'node:crypto';

// The pure module, not the package index: the published hook carries no dependency (ADR `0145`).
import { linesSentence, readSkillLines, skillAtom, skillUrlOf } from '../../../packages/protocol/src/failure-lines.ts';
import testnet from '../../../data/deployments/13579.json';

import { toolCallOf } from './payload.ts';
import { type FailureLine, recordSkillFailure } from './skill-failure.ts';

type FetchLike = NonNullable<Parameters<typeof readSkillLines>[1]['fetch']>;

/**
 * How long the agent may wait for the index, in all. The runtime's own timeout on the entry is longer;
 * this one is the hook's, so a slow index costs a failed call three seconds at most and says nothing.
 */
export const ANSWER_MS = 3_000;

/** Where lines are written today: testnet 13579, the sponsor's chain (ADR `0144`). Its record, read once. */
const WHERE = 'Intuition testnet 13579';
const IN_CONTEXT_OF = testnet.arp.endpointBinding.inContextOf;
const PAYERS = [testnet.arp.deployer, testnet.arp.sponsor];

const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest();

/**
 * What agents wrote about the skill that just failed, as the runtime's `additionalContext`, or `null`.
 *
 * Reads the index live (task 99, ADR `0168`). What is sent is the skill's atom URI and the four words
 * of the vocabulary: the failure line's `source` and `skill` reach the network only as that hash.
 * `null`, silently, when the skill has no `owner/repo` source, when nobody wrote a line, when the read
 * fails or when it takes longer than `ANSWER_MS`. `ARP_FAILURE_LINES=off` sends nothing at all.
 */
export async function answerFailure(
  failure: Pick<FailureLine, 'skill' | 'source'>,
  env: Record<string, string | undefined> = process.env,
  fetcher?: FetchLike,
): Promise<string | null> {
  if (env['ARP_FAILURE_LINES'] === 'off' || failure.source === null) return null;
  const url = skillUrlOf(failure.source, failure.skill);
  if (url === null) return null;
  const { uri, label } = skillAtom(url, sha256);
  const graphqlUrl = env['INTUITION_GRAPHQL_URL'] ?? testnet.chain.graphqlUrl;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ANSWER_MS);
  });
  const read = readSkillLines(uri, {
    graphqlUrl,
    inContextOf: IN_CONTEXT_OF,
    payers: PAYERS,
    timeoutMs: ANSWER_MS,
    ...(fetcher === undefined ? {} : { fetch: fetcher }),
  })
    .then((usage) => linesSentence(usage, label, WHERE))
    // Silence is the right failure: the record is already written, and the agent has the error itself.
    .catch(() => null);
  try {
    return await Promise.race([read, late]);
  } finally {
    clearTimeout(timer);
  }
}

/** The runtime's answer to a failed call: Claude Code's `hookSpecificOutput` for `PostToolUseFailure`. */
export function failureOutput(context: string): string {
  return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUseFailure', additionalContext: context } });
}

/** What a route returns to hand a call to the recording, as though its event had no route. */
export const RECORD: unique symbol = Symbol('record');

/**
 * The `PostToolUseFailure` route (task 99). A failed shell command is recorded as before
 * (`recordSkillFailure`), and when that writes a skill's failure now, answered with the skill's lines.
 * Every other failed call, an MCP tool's or a skill's own, goes to the recording unchanged.
 */
export async function postToolUseFailure(payload: unknown): Promise<string | null | typeof RECORD> {
  const call = toolCallOf(payload);
  if (call === null || call.tool !== 'Bash') return RECORD;
  const failure = recordSkillFailure(call, call.cwd ?? process.cwd());
  const context = failure === null ? null : await answerFailure(failure);
  return context === null ? null : failureOutput(context);
}
