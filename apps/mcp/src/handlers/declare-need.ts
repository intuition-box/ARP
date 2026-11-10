/**
 * `needs` and `with` on the direct `arp_declare_used` (task 105): the same guard as `arp line` and the
 * sponsor's `/line` (ADR `0166`). A name is planned only when it has the shape of a program or of an
 * environment variable's name and the skill's own SKILL.md, read from GitHub at `HEAD`, names it whole.
 *
 * Here nobody else re-reads the file: the agent signs these calls itself, so this read is the only check
 * before a name goes on a graph that deletes nothing. Every way it can fail refuses the name, never drops
 * it silently, because the agent asked for it.
 */
import {
  githubPulseSource,
  needKindOfReason,
  needShapeProblem,
  publishableNeed,
  resolveContentPath,
  skillRefFromUrl,
  type PulseSource,
} from '@arp-protocol/core';

/** The fields a declaration's name comes with, as the tool's arguments carry them. */
export type NeedArgs = { outcome: unknown; reason: unknown; needs: unknown; with: unknown };

/** The name to plan, `undefined` when none was asked, or why the arguments do not fit. */
export function needOf(args: NeedArgs): { need: string | undefined } | { problem: string } {
  const { outcome, reason, needs, with: withName } = args;
  if (needs !== undefined && typeof needs !== 'string') return { problem: 'needs, when given, must be a name' };
  if (withName !== undefined && typeof withName !== 'string') return { problem: 'with, when given, must be a name' };
  if (needs !== undefined && outcome !== 'failed') return { problem: 'needs follows outcome: failed; a worked use takes with' };
  if (withName !== undefined && outcome !== 'worked') return { problem: 'with follows outcome: worked; a failure takes needs' };
  const need = needs ?? withName;
  if (need === undefined) return { need: undefined };
  const problem = needShapeProblem({
    need,
    outcome: outcome as string, // `worked` or `failed`, checked just above
    reason: typeof reason === 'string' ? reason : '',
  });
  return problem === null ? { need } : { problem };
}

/**
 * Whether the skill at `toolUrl` names `need` in its SKILL.md. `null` when it does, else why not. Reads two
 * things at most: the repository's listing (GitHub's API) and the file (raw, not on the hourly quota).
 */
export async function needProblemInSkill(
  toolUrl: string,
  need: string,
  reason: unknown,
  source: Pick<PulseSource, 'listing' | 'file'> = defaultSource(),
): Promise<string | null> {
  const ref = skillRefFromUrl(toolUrl);
  if (ref === null) return 'needs and with name a skill\'s word: the tool must be a skill URL (github.com/<owner>/<repo>?skill=<name>)';
  const listing = await source.listing(ref.repo);
  if (listing === 'rate_limited') return 'GitHub\'s hourly limit is reached, so the skill\'s SKILL.md could not be read; set GITHUB_TOKEN or try later';
  if (listing === 'unreachable') return `github.com/${ref.repo} could not be listed, so "${need}" cannot be checked against its SKILL.md`;
  const resolved = resolveContentPath(ref, listing.files);
  if (resolved.status !== 'resolved') return `${toolUrl} has no single SKILL.md to check "${need}" against`;
  const markdown = await source.file(ref.repo, resolved.path);
  if (markdown === null) return `the skill's SKILL.md could not be read, so "${need}" is not planned`;
  const kind = typeof reason === 'string' ? needKindOfReason(reason) : null;
  return publishableNeed(need, markdown, kind ?? undefined) === null
    ? `the skill's SKILL.md does not name "${need}", so it is not planned`
    : null;
}

function defaultSource(): PulseSource {
  const token = process.env['GITHUB_TOKEN']?.trim();
  return githubPulseSource({ withRepository: false, ...(token ? { token } : {}) });
}
