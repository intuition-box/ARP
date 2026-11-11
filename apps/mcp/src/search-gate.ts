/**
 * What stands between `arp_pulse` and the search package on a shared server: each run is a process, and a
 * call starts up to four. Without this, a crowd on the hosted server started a crowd of processes.
 *
 * - at most `maxRunning` runs at once, the rest wait in line, and past `maxWaiting` a call is refused at once
 *   rather than queued behind a wait it cannot outlast;
 * - one phrase asked twice while it runs is run once, and forgotten when it answers. The run stops only
 *   when every caller waiting on it has left, and each caller leaves on its own signal.
 *
 * Nothing outlives the calls waiting on it: the key is the words searched, and the hosted server keeps
 * a caller's words for the length of the call only (ADR `0161`, ADR `0195`). So no answer is cached.
 */
export type SearchOutcome = { output: string } | { error: string };

export type SearchGate = {
  /** `waitMs` bounds the wait in line only; once running, the task keeps its own limit. */
  run(key: string, task: (stop: AbortSignal) => Promise<SearchOutcome>, stop: AbortSignal, waitMs: number): Promise<SearchOutcome>;
};

export const BUSY = 'the server is running as many searches as it can; try again in a moment';
export const CANCELLED = 'the call was cancelled';

type Shared = { outcome: Promise<SearchOutcome>; callers: number; stop: AbortController };

export function createSearchGate(options: { maxRunning: number; maxWaiting: number }): SearchGate {
  const inFlight = new Map<string, Shared>();
  const waiting: (() => void)[] = [];
  let running = 0;

  const release = () => {
    running -= 1;
    const next = waiting.shift();
    if (next !== undefined) next();
  };

  const acquire = (stop: AbortSignal, waitMs: number): Promise<boolean> => {
    if (running < options.maxRunning) {
      running += 1;
      return Promise.resolve(true);
    }
    if (waiting.length >= options.maxWaiting) return Promise.resolve(false);
    return new Promise((resolve) => {
      const turn = () => {
        clearTimeout(timer);
        stop.removeEventListener('abort', leave);
        running += 1;
        resolve(true);
      };
      const leave = () => {
        clearTimeout(timer);
        stop.removeEventListener('abort', leave);
        const at = waiting.indexOf(turn);
        if (at !== -1) waiting.splice(at, 1);
        resolve(false);
      };
      const timer = setTimeout(leave, waitMs);
      waiting.push(turn);
      stop.addEventListener('abort', leave, { once: true });
    });
  };

  return {
    async run(key, task, stop, waitMs) {
      if (stop.aborted) return { error: CANCELLED };
      let shared = inFlight.get(key);
      if (shared === undefined) {
        const controller = new AbortController();
        const outcome = (async (): Promise<SearchOutcome> => {
          if (!(await acquire(controller.signal, waitMs))) return { error: BUSY };
          try {
            // Every caller may have left between the turn and now: start nothing for nobody.
            if (controller.signal.aborted) return { error: CANCELLED };
            return await task(controller.signal);
          } finally {
            release();
          }
        })();
        const entry: Shared = { outcome, callers: 0, stop: controller };
        inFlight.set(key, entry);
        void outcome.finally(() => {
          if (inFlight.get(key) === entry) inFlight.delete(key);
        });
        shared = entry;
      }
      const joined = shared;
      joined.callers += 1;
      let onStop: () => void = () => {};
      const left = new Promise<SearchOutcome>((resolve) => {
        onStop = () => {
          joined.callers -= 1;
          if (joined.callers === 0) {
            // Nobody is left to answer: stop the run, and let the next caller start a fresh one.
            if (inFlight.get(key) === joined) inFlight.delete(key);
            joined.stop.abort();
          }
          resolve({ error: CANCELLED });
        };
        stop.addEventListener('abort', onStop, { once: true });
      });
      try {
        return await Promise.race([joined.outcome, left]);
      } finally {
        if (!stop.aborted) joined.callers -= 1;
        stop.removeEventListener('abort', onStop);
      }
    },
  };
}

/** A positive whole number from the environment, or the default. */
export function positiveSetting(raw: string | undefined, fallback: number): number {
  const value = raw === undefined ? Number.NaN : Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
