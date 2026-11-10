/**
 * Pure edits of another program's configuration: ours in, ours out, nothing else touched.
 *
 * Each function takes the file's current text (or `null` when it does not exist) and returns the
 * new text, so `init` can compare the two and write only when they differ. Running it twice
 * therefore changes nothing the second time (clig.dev, "Robustness": idempotent).
 */

export type McpServer = { command: string; args: string[]; env: Record<string, string> };

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse a config file. A file that exists and is not a JSON object is refused, never overwritten. */
export function parseJsonConfig(text: string | null): Json | Error {
  if (text === null || text.trim().length === 0) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : new Error('not a JSON object');
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

export function formatJson(value: Json): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** `mcpServers.<name> = entry`, or removed when `entry` is `null`. Other servers are kept as they were. */
export function withMcpServer(config: Json, name: string, entry: Json | null): Json {
  const servers: Json = isRecord(config.mcpServers) ? { ...config.mcpServers } : {};
  if (entry === null) delete servers[name];
  else servers[name] = entry;
  const next: Json = { ...config, mcpServers: servers };
  if (entry === null && Object.keys(servers).length === 0) delete next.mcpServers;
  return next;
}

/**
 * How one runtime registers a hook. Two shapes exist in the docs read for task 33:
 *
 * | shape | file | runtimes |
 * | --- | --- | --- |
 * | `nested` | `hooks.<Event>: [{ matcher, hooks: [entry] }]` | Claude Code, Codex, Gemini CLI |
 * | `flat` | `{ version: 1, hooks: { <event>: [entry] } }` | Cursor, Copilot |
 */
export type HookSpec = {
  shape: 'nested' | 'flat';
  /**
   * One registration each. An event may appear more than once, with different matchers or `if`
   * rules; `withHooks` writes them all under that event's name.
   */
  events: readonly HookEvent[];
  /** The entry for one command, in this runtime's field names and timeout unit. */
  entry: (command: string, event: HookEvent) => Json;
};

/**
 * One registration. `matcher` picks the tools by name; the rest is Claude Code's per-handler
 * fields (code.claude.com/docs/en/hooks, read 2026-11-10), which other runtimes' `entry` ignore.
 */
export type HookEvent = {
  name: string;
  matcher?: string;
  /**
   * `true` makes the runtime wait for the hook, which is the only way its stdout is read before
   * the call it answers runs. Without it the entry is `async` and costs the session nothing.
   */
  sync?: boolean;
  /** Seconds. Ten when unset. A waited-on entry holds the session this long at worst. */
  timeout?: number;
  /**
   * One permission rule, such as `Bash(git *)`, that the call must match for the hook to run at
   * all; there is no list form, so two rules are two entries. Tool events only, and best-effort:
   * the docs say a call they cannot parse runs the hook regardless.
   */
  if?: string;
};

/**
 * Claude Code, one entry per row. Tasks that add an event add one row here and one route in
 * `apps/hook/src/hook.ts` (`ROUTES`).
 *
 * | event | why |
 * | --- | --- |
 * | `PostToolUse`, `PostToolUseFailure` | the recording; a failed call reaches only the second (ADR `0090`) |
 * | the same `PostToolUseFailure` row, waited on | a skill's failure is also answered with that skill's lines; the hook bounds its read at 3 s (task 99, ADR `0168`) |
 * | `PreToolUse` on `Bash`, waited on | a skills install, read before it runs (task 98, ADR `0167`) |
 *
 * The `PreToolUse` rule is `Bash(*skills*)`, wider than an install, because the command has many
 * spellings (`npx -y skills@1.7.4 add`, `bunx skills i`, `pnpm dlx skills add`) and one rule per
 * entry is all the docs allow; the hook itself says nothing for any other command. Only those
 * commands wait for Node to start; every other `Bash` call does not run the hook at all. Fifteen
 * seconds is the hook's six of GitHub plus Node's start, with room.
 */
export const CLAUDE_HOOKS: HookSpec = {
  shape: 'nested',
  events: [
    { name: 'PostToolUse', matcher: '*' },
    { name: 'PostToolUseFailure', matcher: '*', sync: true },
    { name: 'PreToolUse', matcher: 'Bash', sync: true, timeout: 15, if: 'Bash(*skills*)' },
  ],
  entry: (command, event) => ({
    type: 'command',
    command,
    ...(event.if === undefined ? {} : { if: event.if }),
    ...(event.sync === true ? {} : { async: true }),
    timeout: event.timeout ?? 10,
  }),
};

/** The distinct event names of a spec, in their first order. */
export function eventNames(spec: HookSpec): string[] {
  return [...new Set(spec.events.map((event) => event.name))];
}

function isOurs(hook: unknown, marker: string): boolean {
  return isRecord(hook) && typeof hook.command === 'string' && hook.command.includes(marker);
}

/** One event's list without our entries. Everything we did not write keeps every field it had. */
function strip(list: unknown, spec: HookSpec, marker: string): unknown[] {
  if (!Array.isArray(list)) return [];
  if (spec.shape === 'flat') return list.filter((entry) => !isOurs(entry, marker));
  const kept: unknown[] = [];
  for (const group of list) {
    if (!isRecord(group) || !Array.isArray(group.hooks)) {
      kept.push(group);
      continue;
    }
    const rest = group.hooks.filter((hook) => !isOurs(hook, marker));
    if (rest.length > 0) kept.push({ ...group, hooks: rest });
  }
  return kept;
}

function ours(list: unknown, spec: HookSpec, marker: string): unknown[] {
  if (!Array.isArray(list)) return [];
  if (spec.shape === 'flat') return list.filter((entry) => isOurs(entry, marker));
  return list.flatMap((group) =>
    isRecord(group) && Array.isArray(group.hooks)
      ? group.hooks.filter((hook) => isOurs(hook, marker))
      : [],
  );
}

/**
 * The runtime's `hooks` with ours on every event of `spec`, any earlier copy of ours dropped first,
 * or with ours removed when `command` is `null`. Ours are recognised by `marker`, a path only
 * `init` writes. Every other hook stays.
 */
export function withHooks(
  settings: Json,
  spec: HookSpec,
  command: string | null,
  marker: string,
): Json {
  const hooks: Json = isRecord(settings.hooks) ? { ...settings.hooks } : {};
  // Stripped once per name, then every registration of that name added, so two rows of one event
  // do not erase each other.
  for (const name of eventNames(spec)) {
    const kept = strip(hooks[name], spec, marker);
    if (command !== null) {
      for (const event of spec.events.filter((row) => row.name === name)) {
        const entry = spec.entry(command, event);
        kept.push(
          spec.shape === 'flat'
            ? entry
            : { ...(event.matcher === undefined ? {} : { matcher: event.matcher }), hooks: [entry] },
        );
      }
    }
    if (kept.length > 0) hooks[name] = kept;
    else delete hooks[name];
  }
  const next: Json = { ...settings, hooks };
  if (Object.keys(hooks).length === 0) {
    delete next.hooks;
    // A flat file we created holds only `version` once ours is gone; it is empty.
    if (spec.shape === 'flat' && Object.keys(next).length === 1 && 'version' in next) return {};
  } else if (spec.shape === 'flat' && next.version === undefined) {
    return { version: 1, ...next };
  }
  return next;
}

/** Our entries only, by event: what `init` shows the operator before writing. */
export function hooksOf(settings: Json, spec: HookSpec, marker: string): Json {
  if (!isRecord(settings.hooks)) return {};
  const out: Json = {};
  for (const name of eventNames(spec)) {
    const found = ours(settings.hooks[name], spec, marker);
    if (found.length > 0) out[name] = found;
  }
  return out;
}

/** Every registration of the spec is there: each event holds as many of ours as the spec has rows. */
export function hasHooks(settings: Json, spec: HookSpec, marker: string): boolean {
  const found = hooksOf(settings, spec, marker);
  return eventNames(spec).every((name) => {
    const list = found[name];
    return Array.isArray(list) && list.length >= spec.events.filter((row) => row.name === name).length;
  });
}

const TOML_BEGIN = '# >>> arp — managed by `arp init`, removed by `arp uninstall` >>>';
const TOML_END = '# <<< arp <<<';

function tomlString(value: string): string {
  return JSON.stringify(value); // a TOML basic string has JSON's escapes for these characters
}

/**
 * Codex's `config.toml`: our `[mcp_servers.arp]` table between two marker comments, so it can be
 * replaced or removed without parsing TOML (clig.dev, "Configuration": delineate your additions).
 * Returns an `Error` when a table of that name exists outside the markers: it is not ours to change.
 */
/** The text without a `[mcp_servers.arp]` table and its sub-tables, up to the next table's header. */
function withoutCodexTable(text: string): string {
  let inside = false;
  return text
    .split('\n')
    .filter((line) => {
      if (/^\s*\[\[?[^\]]+\]\]?\s*(#.*)?$/.test(line)) {
        inside = /^\s*\[mcp_servers\.arp(\.[^\]]+)?\]/.test(line);
      }
      return !inside;
    })
    .join('\n');
}

/** `force`: `arp init --force`, which replaces a table `init` did not write. The caller keeps a backup. */
export function withCodexServer(
  text: string | null,
  entry: McpServer | null,
  force = false,
): string | Error {
  const current = text ?? '';
  const begin = current.indexOf(TOML_BEGIN);
  const end = current.indexOf(TOML_END);
  const hasBlock = begin !== -1 && end > begin;
  const kept = hasBlock
    ? current.slice(0, begin) + current.slice(end + TOML_END.length)
    : current;
  const foreign = /^\s*\[mcp_servers\.arp\]/m.test(kept);
  if (foreign && !force) {
    return new Error('an [mcp_servers.arp] table exists that `arp init` did not write');
  }
  const outside = foreign ? withoutCodexTable(kept) : kept;
  let base = outside.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '');
  if (entry === null) return base.length === 0 ? '' : `${base}\n`;
  const block = [
    TOML_BEGIN,
    '[mcp_servers.arp]',
    `command = ${tomlString(entry.command)}`,
    `args = [${entry.args.map(tomlString).join(', ')}]`,
    `env = { ${Object.entries(entry.env)
      .map(([key, value]) => `${key} = ${tomlString(value)}`)
      .join(', ')} }`,
    TOML_END,
  ].join('\n');
  base = base.length === 0 ? '' : `${base}\n\n`;
  return `${base}${block}\n`;
}

/** Our block's lines in a Codex config, or none. */
export function codexBlockOf(text: string | null): string[] {
  if (text === null) return [];
  const begin = text.indexOf(TOML_BEGIN);
  const end = text.indexOf(TOML_END);
  return begin === -1 || end < begin ? [] : text.slice(begin, end + TOML_END.length).split('\n');
}

export function hasCodexServer(text: string | null): boolean {
  return text !== null && text.includes(TOML_BEGIN) && text.includes(TOML_END);
}
