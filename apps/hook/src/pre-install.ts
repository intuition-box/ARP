/**
 * `PreToolUse` on `Bash`: what a skill contains, shown before `npx skills add` installs it (task 98,
 * ADR `0167`).
 *
 * The command is read for a skills install (`skillInstallOf`); anything else returns `null` and the
 * hook exits 0 with nothing on stdout, which the runtime reads as "no opinion". An install is read
 * from GitHub (`readSkillInstall`, through `readPulse`) and answered with two fields of Claude Code's
 * hook output (code.claude.com/docs/en/hooks, "JSON output", read 2026-11-10):
 *
 * ```
 * systemMessage                          shown to the person, before the command runs
 * hookSpecificOutput.additionalContext   given to the agent, "alongside the tool result"
 * ```
 *
 * **No `permissionDecision`, ever**: facts, not a verdict, and nothing blocks (ADR `0165`). The
 * runtime's own permission flow decides whether the command runs, as it would without this hook.
 *
 * ## What leaves the machine
 *
 * The repository and the skill names the command already carries, in requests to `api.github.com`
 * and `raw.githubusercontent.com`, the same requests the install itself is about to make. Nothing
 * the person typed, no file of theirs and no part of the command beyond the source. A token is read
 * from `GITHUB_TOKEN` or `GH_TOKEN` when set and sent to GitHub only.
 *
 * Imports are by path, never the core package's index: the index pulls viem, and the hook ships
 * without it (task 84).
 */
import { githubPulseSource } from '../../../packages/protocol/src/pulse.ts';
import {
  readSkillInstall,
  skillInstallOf,
  skillInstallReport,
} from '../../../packages/protocol/src/skill-install.ts';

import { toolCallOf } from './payload.ts';

/** GitHub's whole budget for one install. The entry's own timeout (`edits.ts`) is well above it. */
export const GITHUB_BUDGET_MS = 6_000;

/**
 * Before the budget ends, the skill's other files stop being fetched (task 112), so what was read is
 * reported in time; a file not read by then is named as not fetched.
 */
const DIRECTORY_MARGIN_MS = 1_500;

/** Claude Code caps `additionalContext` and `systemMessage` at 10,000 characters. */
const OUTPUT_CAP = 9_500;

const FOR_THE_AGENT =
  "This is what the skill's own files contain, read by ARP's hook before the install ran. " +
  'They are facts, not a verdict, and nothing was blocked. The person was shown the same lines.';

function capped(text: string): string {
  return text.length <= OUTPUT_CAP ? text : `${text.slice(0, OUTPUT_CAP)}\n… (cut)`;
}

/**
 * The hook's stdout for one `PreToolUse` payload, or `null` when the call is not a skills install.
 * `fetch` is there for a test; the hook passes none.
 */
export async function preToolUse(
  raw: unknown,
  options: { env?: NodeJS.ProcessEnv; fetch?: typeof fetch; budgetMs?: number } = {},
): Promise<string | null> {
  const call = toolCallOf(raw);
  if (call === null || call.tool !== 'Bash') return null;
  const command = call.input?.['command'];
  if (typeof command !== 'string') return null;
  const install = skillInstallOf(command);
  if (install === null) return null;

  const env = options.env ?? process.env;
  const token = (env['GITHUB_TOKEN'] ?? env['GH_TOKEN'])?.trim() || undefined;
  const budgetMs = options.budgetMs ?? GITHUB_BUDGET_MS;
  // The answer is due at the budget; the requests are cut a little later, so a request cut at the
  // budget reads as "no answer in time" and not as a failed read.
  const deadline = new Promise<void>((resolve) => setTimeout(resolve, budgetMs));
  const directoryBy = new Promise<void>((resolve) =>
    setTimeout(resolve, Math.max(0, budgetMs - DIRECTORY_MARGIN_MS)),
  );
  const source = githubPulseSource({
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    ...(token === undefined ? {} : { token }),
    timeoutMs: budgetMs + 500,
    signal: AbortSignal.timeout(budgetMs + 500),
  });
  const report = capped(
    skillInstallReport(await readSkillInstall(install, source, deadline, directoryBy)),
  );
  return JSON.stringify({
    systemMessage: report,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: `${report}\n\n${FOR_THE_AGENT}`,
    },
  });
}
