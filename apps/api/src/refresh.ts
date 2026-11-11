/** A refresh cycle, run a slice at a time.
 *
 *  One cycle reads every repository (53), every skill repository's tree (41) and every skill's page
 *  (673) — about 770 requests (counted 2026-11-11 from `catalogue.ts`: `REPOS.length`,
 *  the distinct `repo` of `SKILLS`, `SKILLS.length`). A cycle is cut into slices of `budget` reads,
 *  and each slice writes the three documents once at its end rather than once per read. The cursor
 *  lives in the store beside them. The slices were for a Worker's subrequest ceiling and KV's daily
 *  write budget; in the container (ADR `0200`) they stay, and pace a cycle at one slice every ten
 *  minutes, so a restart resumes at the cursor rather than starting over.
 *
 *  When a cycle is done the schedule keeps firing and does nothing until `everyHours` have passed, then
 *  starts the next. A read that fails keeps the previous value: a stale fact with its date is worth
 *  more than an empty row. A rate limit stops the slice where it is, so the next one retries the
 *  same unit rather than skipping it.
 */
import { resolveContentPath } from '@arp-protocol/core';

import { REPOS, repoLabel, SKILLS, skillLabel, type Repo, type Skill } from './catalogue.ts';
import {
  type Fetch,
  isFailure,
  readRepo,
  readSkillPage,
  readTree,
  type RepoFact,
  type SkillFact,
} from './sources.ts';

/** Get and put, with an expiry: what KV gave the Worker, and `sqlite-store.ts` gives the container (ADR `0200`). A Map does in a test. */
export type Store = {
  get(key: string, type: 'json'): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

/** An entry with the moment it was read. Every value served carries one. */
export type Dated<T> = T & { fetchedAt: string };

export type Documents = {
  repos: Record<string, Dated<RepoFact>>;
  skills: Record<string, Dated<SkillFact>>;
  paths: Record<string, Dated<{ path: string }>>;
};

export type CycleState = {
  cycleStartedAt: string | null;
  completedAt: string | null;
  cursor: number;
  /** The failures of the last slice, so a stuck cycle says why. */
  lastErrors: string[];
};

type Unit =
  | { kind: 'repo'; repo: Repo }
  | { kind: 'tree'; slug: string; skills: readonly Skill[] }
  | { kind: 'page'; skill: Skill };

/** The order of a cycle. Repositories first: they are the cheapest and the most read. */
export function unitsOf(repos: readonly Repo[], skills: readonly Skill[]): Unit[] {
  const bySlug = new Map<string, Skill[]>();
  for (const skill of skills) bySlug.set(skill.repo, [...(bySlug.get(skill.repo) ?? []), skill]);
  return [
    ...repos.map((repo): Unit => ({ kind: 'repo', repo })),
    ...[...bySlug].map(([slug, list]): Unit => ({ kind: 'tree', slug, skills: list })),
    ...skills.map((skill): Unit => ({ kind: 'page', skill })),
  ];
}

const KEYS = { state: 'state', repos: 'repos', skills: 'skills', paths: 'paths' } as const;

export async function readState(store: Store): Promise<CycleState> {
  // Only `runSlice` writes this key, always a whole `CycleState`.
  const state = (await store.get(KEYS.state, 'json')) as CycleState | null;
  return state ?? { cycleStartedAt: null, completedAt: null, cursor: 0, lastErrors: [] };
}

export async function readDocuments(store: Store): Promise<Documents> {
  const [repos, skills, paths] = await Promise.all([
    store.get(KEYS.repos, 'json'),
    store.get(KEYS.skills, 'json'),
    store.get(KEYS.paths, 'json'),
  ]);
  return {
    // Only `runSlice` writes these three keys, each a whole document of its type.
    repos: (repos ?? {}) as Documents['repos'],
    skills: (skills ?? {}) as Documents['skills'],
    paths: (paths ?? {}) as Documents['paths'],
  };
}

export type SliceOptions = {
  store: Store;
  fetch: Fetch;
  now: () => number;
  githubToken?: string;
  /** Reads per slice. */
  budget?: number;
  /** Hours between the end of one cycle and the start of the next. */
  everyHours?: number;
  /** Pause between two reads, in ms — the courtesy `skills-installs.ts` kept with skills.sh. */
  pauseMs?: number;
  /** Injected for tests; the catalogue otherwise. */
  units?: Unit[];
};

export type SliceResult = { ran: number; state: CycleState; idle: boolean };

export async function runSlice(options: SliceOptions): Promise<SliceResult> {
  const { store, fetch, now } = options;
  const budget = options.budget ?? 40;
  const everyMs = (options.everyHours ?? 24) * 3_600_000;
  const pauseMs = options.pauseMs ?? 250;
  const units = options.units ?? unitsOf(REPOS, SKILLS);

  let state = await readState(store);
  const complete = state.cycleStartedAt !== null && state.cursor >= units.length;
  if (complete) {
    const finished = state.completedAt === null ? 0 : Date.parse(state.completedAt);
    if (now() - finished < everyMs) return { ran: 0, state, idle: true };
  }
  if (state.cycleStartedAt === null || complete) {
    state = {
      cycleStartedAt: new Date(now()).toISOString(),
      completedAt: null,
      cursor: 0,
      lastErrors: [],
    };
  }

  const docs = await readDocuments(store);
  const errors: string[] = [];
  let ran = 0;
  while (ran < budget && state.cursor < units.length) {
    const unit = units[state.cursor];
    if (unit === undefined) break;
    const at = new Date(now()).toISOString();

    if (unit.kind === 'repo') {
      const fact = await readRepo(unit.repo.slug, fetch, options.githubToken);
      if (isFailure(fact)) {
        errors.push(fact.error);
        if (fact.limited) break;
      } else {
        docs.repos[repoLabel(unit.repo.slug)] = { ...fact, fetchedAt: at };
      }
    } else if (unit.kind === 'tree') {
      const listing = await readTree(unit.slug, fetch, options.githubToken);
      if (isFailure(listing)) {
        errors.push(listing.error);
        if (listing.limited) break;
      } else {
        for (const skill of unit.skills) {
          const resolution = resolveContentPath({ repo: skill.repo, skill: skill.skill }, listing);
          const label = skillLabel(skill.repo, skill.skill);
          // Only a path that names one content: a single file, or several identical copies. Two
          // different files under one name get no entry, and the page says it has none rather
          // than showing somebody else's file (`packages/protocol/src/content-path.ts`).
          if (resolution.status === 'resolved')
            docs.paths[label] = { path: resolution.path, fetchedAt: at };
          else delete docs.paths[label];
        }
      }
    } else {
      const fact = await readSkillPage(unit.skill.repo, unit.skill.skill, fetch);
      if (isFailure(fact)) {
        errors.push(fact.error);
        if (fact.limited) break;
      } else {
        docs.skills[skillLabel(unit.skill.repo, unit.skill.skill)] = { ...fact, fetchedAt: at };
      }
    }

    state.cursor += 1;
    ran += 1;
    if (pauseMs > 0 && ran < budget) await new Promise((done) => setTimeout(done, pauseMs));
  }

  state.lastErrors = errors;
  if (state.cursor >= units.length) state.completedAt = new Date(now()).toISOString();

  await Promise.all([
    store.put(KEYS.repos, JSON.stringify(docs.repos)),
    store.put(KEYS.skills, JSON.stringify(docs.skills)),
    store.put(KEYS.paths, JSON.stringify(docs.paths)),
    store.put(KEYS.state, JSON.stringify(state)),
  ]);
  return { ran, state, idle: false };
}
