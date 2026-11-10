import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { toolAtomUri } from '@arp-protocol/core';
import { afterEach, beforeEach, expect, test } from 'bun:test';

import { ANSWER_MS, answerFailure } from '../src/failure-answer.ts';

const HOOK = join(import.meta.dir, '..', 'src', 'hook.ts');
const SKILL = '---\nname: gadget\n---\nInstall ffmpeg, then run:\n\n```bash\nvidcut --in a.mp4\n```\n';
const URI = toolAtomUri('https://github.com/a/b?skill=gadget');
const ID: Record<string, string> = { [URI]: '0xtool', 'has outcome': '0xd0', because: '0xe0', needs: '0xf0', with: '0xf1' };
/** `inContextOf` from `data/deployments/13579.json`, which the hook binds. */
const CONTEXT = '0x61a88b9c372c0d164d2caf66947b67ed0fcb4c457178a271b6b3dc39fb1f8862';

type Line = { wallet: string; outcome: 'failed' | 'worked'; reason?: string; name?: string };

/** A miniature Intuition index over HTTP: form B lines, one `uses` edge per wallet. Keeps every body it was sent. */
function serveIndex(lines: Line[], delayMs = 0) {
  const bodies: string[] = [];
  const qualifiers: Record<string, unknown>[] = [];
  const uses = lines.map((line, at) => {
    const edge = `0xedge${at}`;
    const q = (term: string, subject: string, predicate: string, label: string) =>
      qualifiers.push({ term_id: term, subject_id: subject, predicate_id: predicate, creator_id: line.wallet, object: { label } });
    q(`${edge}c`, edge, CONTEXT, 'video');
    q(`${edge}o`, `${edge}c`, '0xd0', line.outcome);
    if (line.reason !== undefined) q(`${edge}r`, `${edge}o`, '0xe0', line.reason);
    if (line.name !== undefined) {
      if (line.outcome === 'failed') q(`${edge}n`, `${edge}r`, '0xf0', line.name);
      else q(`${edge}w`, `${edge}o`, '0xf1', line.name);
    }
    return { term_id: edge, object_id: '0xtool', creator_id: line.wallet, created_at: null, subject: { term_id: `0xagent${at}`, label: null } };
  });
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const text = await request.text();
      bodies.push(text);
      if (delayMs > 0) await Bun.sleep(delayMs);
      const { query, variables } = JSON.parse(text) as { query: string; variables: Record<string, string[]> }; // our own client's body
      let data: unknown;
      if (query.includes('PulseAtoms')) {
        data = { atoms: (variables['uris'] ?? []).filter((uri) => uri in ID).map((uri) => ({ term_id: ID[uri], data: uri })) };
      } else if (query.includes('PulseUses')) {
        data = { triples: uses };
      } else {
        const edges = variables['edges'] ?? [];
        const predicates = variables['predicates'] ?? [];
        data = { triples: qualifiers.filter((row) => edges.includes(row['subject_id'] as string) && predicates.includes(row['predicate_id'] as string)) };
      }
      return Response.json({ data });
    },
  });
  return { url: `http://127.0.0.1:${server.port}/v1/graphql`, bodies, stop: () => server.stop(true) };
}

const LINES: Line[] = [
  { wallet: '0xA', outcome: 'failed', reason: 'missing-program', name: 'ffmpeg' },
  { wallet: '0xB', outcome: 'failed', reason: 'missing-program', name: 'ffmpeg' },
  { wallet: '0xC', outcome: 'failed', reason: 'missing-key' },
  { wallet: '0xD', outcome: 'worked', name: 'ffmpeg' },
  { wallet: '0xE', outcome: 'worked', name: 'ffmpeg' },
];

let dir: string;
let index: ReturnType<typeof serveIndex> | undefined;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arp-answer-'));
  mkdirSync(join(dir, '.claude', 'skills', 'gadget'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'skills', 'gadget', 'SKILL.md'), SKILL);
});
afterEach(() => {
  index?.stop();
  index = undefined;
  rmSync(dir, { recursive: true, force: true });
});

/**
 * Runs the hook as the runtime does and returns what it printed. Not `spawnSync`: the index is served from
 * this process, which has to keep answering while the hook waits.
 */
async function fire(payload: Record<string, unknown>, graphqlUrl: string, extra: Record<string, string> = {}): Promise<string> {
  const run = Bun.spawn(['bun', HOOK], {
    stdin: new TextEncoder().encode(JSON.stringify({ session_id: 'secret-session-7', cwd: dir, ...payload })),
    stdout: 'pipe',
    env: {
      ...process.env,
      HOME: dir,
      ARP_HOME: join(dir, 'home'),
      ARP_SESSION_LOG: join(dir, 'session.jsonl'),
      INTUITION_GRAPHQL_URL: graphqlUrl,
      ARP_FAILURE_LINES: 'on',
      ...extra,
    },
  });
  await run.exited;
  return await new Response(run.stdout).text();
}

/** The person's words, the command and its output each carry a marker that must never reach the index. */
async function failSkill(url: string, event = 'PostToolUseFailure', extra: Record<string, string> = {}): Promise<string> {
  const transcript = join(dir, 't.jsonl');
  writeFileSync(transcript, `${JSON.stringify({ type: 'user', message: { content: 'cut my PRIVATE-WORDS wedding video' } })}\n`);
  await fire({ tool_name: 'Skill', tool_input: { skill: 'gadget', source: 'a/b' }, tool_response: 'loaded' }, url, extra);
  return await fire(
    {
      hook_event_name: event,
      transcript_path: transcript,
      tool_name: 'Bash',
      tool_input: { command: 'vidcut --in /home/me/PRIVATE-PATH/clip.mp4' },
      error: 'vidcut: spawn ffmpeg ENOENT while reading PRIVATE-OUTPUT',
    },
    url,
    extra,
  );
}

test('a skill failure is answered with what agents wrote about that skill', async () => {
  index = serveIndex(LINES);
  const printed = await failSkill(index.url);
  expect(JSON.parse(printed)).toEqual({
    hookSpecificOutput: {
      hookEventName: 'PostToolUseFailure',
      additionalContext:
        'ARP, lines agents wrote on github.com/a/b?skill=gadget (Intuition testnet 13579): 3 wallets wrote failed · because missing-program (2), missing-key (1) · needs ffmpeg (2); 2 wallets wrote worked · with ffmpeg (2).',
    },
  });
});

test('only the skill identity leaves the machine: never the command, its output, a path, the session or the words', async () => {
  index = serveIndex(LINES);
  await failSkill(index.url);
  expect(index.bodies.length).toBeGreaterThan(0);
  const sent = index.bodies.join('\n');
  for (const secret of ['PRIVATE', 'vidcut', 'clip.mp4', '/home/', dir, 'secret-session-7', 'wedding', 'ENOENT', 'gadget']) {
    expect([secret, sent.includes(secret)]).toEqual([secret, false]);
  }
  // The first request names the skill's atom URI, a hash of its public URL, and the vocabulary's four words.
  const first = JSON.parse(index.bodies[0] ?? '{}') as { variables: { uris: string[] } }; // our own client's body
  expect(first.variables.uris).toEqual([URI, 'has outcome', 'because', 'needs', 'with']);
});

test('the success path and a repeated failure read nothing', async () => {
  index = serveIndex(LINES);
  await failSkill(index.url);
  const after = index.bodies.length;
  // The same session, skill and reason is already recorded: one read per failure, not one per retry.
  expect(await failSkill(index.url)).toBe('');
  await fire({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'vidcut a' }, tool_response: 'done' }, index.url);
  expect(index.bodies.length).toBe(after);
});

test('an asynchronous event, or ARP_FAILURE_LINES=off, sends nothing', async () => {
  index = serveIndex(LINES);
  expect(await failSkill(index.url, 'PostToolUse')).toBe('');
  rmSync(join(dir, 'home'), { recursive: true, force: true });
  expect(await failSkill(index.url, 'PostToolUseFailure', { ARP_FAILURE_LINES: 'off' })).toBe('');
  expect(index.bodies).toEqual([]);
});

test('no line, an unreachable index or a slow one: silence, and the failure is still recorded', async () => {
  index = serveIndex([]);
  expect(await failSkill(index.url)).toBe('');
  expect(readFileSync(join(dir, 'home', 'failures.jsonl'), 'utf8')).toContain('"reason":"missing-program"');
  expect(await answerFailure({ skill: 'gadget', source: 'a/b' }, { INTUITION_GRAPHQL_URL: 'http://127.0.0.1:9/' })).toBeNull();

  const slow = serveIndex(LINES, ANSWER_MS + 2_000);
  const started = Date.now();
  expect(await answerFailure({ skill: 'gadget', source: 'a/b' }, { INTUITION_GRAPHQL_URL: slow.url })).toBeNull();
  expect(Date.now() - started).toBeLessThan(ANSWER_MS + 1_000);
  slow.stop();
});

test('a skill with no owner/repo source sends nothing', async () => {
  let asked = false;
  const fetcher = (async () => {
    asked = true;
    return new Response('{}');
  }) as unknown as typeof fetch; // a stub that only records it was called
  expect(await answerFailure({ skill: 'gadget', source: null }, {}, fetcher)).toBeNull();
  expect(await answerFailure({ skill: 'gadget', source: '/home/me/skills' }, {}, fetcher)).toBeNull();
  expect(asked).toBe(false);
});
