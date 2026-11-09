// ../hook/src/append.ts
import { closeSync, constants, lstatSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";
function appendOwn(path, text) {
  if (lstatSync(dirname(path)).isSymbolicLink())
    throw new Error(`${dirname(path)} is a symbolic link`);
  const flags = constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0);
  const fd = openSync(path, flags, 384);
  try {
    writeSync(fd, text);
  } finally {
    closeSync(fd);
  }
}

// ../hook/src/hook.ts
import { existsSync as existsSync2, lstatSync as lstatSync2, mkdirSync as mkdirSync3, readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from "node:fs";
import { homedir as homedir3 } from "node:os";
import { dirname as dirname3, join as join4 } from "node:path";
// ../../packages/protocol/dist/declare/tool-thing.js
class InvalidToolUrlError extends Error {
  input;
  constructor(input, why) {
    super(`${JSON.stringify(input)} is not a usable tool URL: ${why}`);
    this.name = "InvalidToolUrlError";
    this.input = input;
  }
}
function normaliseToolUrl(input) {
  const trimmed = input.trim();
  if (trimmed.length === 0)
    throw new InvalidToolUrlError(input, "empty");
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    throw new InvalidToolUrlError(input, "not parseable as a URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidToolUrlError(input, `scheme ${url.protocol} is not http or https`);
  }
  if (url.hostname.length === 0)
    throw new InvalidToolUrlError(input, "no host");
  const host = url.hostname.replace(/\.+$/, "").replace(/^(?:www\.)+/, "");
  const path = url.pathname.replace(/(?:\.git|\/)+$/, "");
  const params = [...new URLSearchParams(url.search).entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const query = params.length === 0 ? "" : `?${new URLSearchParams(params).toString()}`;
  const port = url.port === "" || url.port === "80" || url.port === "443" ? "" : `:${url.port}`;
  return `https://${host}${port}${path}${query}`;
}
// ../../packages/protocol/dist/declare/category.js
import { stringToHex } from "viem";
function normaliseCategoryLabel(raw) {
  return raw.normalize("NFKC").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}
// ../../packages/protocol/dist/session.js
function refForInvocation(name, source, fetched) {
  const bare = name.includes(":") ? name.split(":").pop() ?? name : name;
  let matches = fetched.filter((row) => row.skill === bare);
  if (source !== null && matches.length > 1) {
    const narrowed = matches.filter((row) => source.includes(repoOf(row.url)));
    if (narrowed.length > 0)
      matches = narrowed;
  }
  const atoms = new Set(matches.map((row) => row.atom.toLowerCase()));
  if (atoms.size !== 1)
    return null;
  return matches[0]?.atom ?? null;
}
function repoOf(url) {
  const parts = /github\.com\/([^/?#]+)\/([^/?#]+)/.exec(url);
  return parts === null ? url : `${parts[1]}/${parts[2]}`;
}
// ../../packages/protocol/dist/skill-requires.js
var LOGIN = /\b(auth login|log ?in|sign ?up|api[ _-]?key|access token)\b/i;
function frontmatter(markdown) {
  const lines = markdown.split(`
`);
  if (lines[0]?.trim() !== "---")
    return { lines: [], bodyStart: 0 };
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  return end === -1 ? { lines: [], bodyStart: 0 } : { lines: lines.slice(1, end), bodyStart: end + 1 };
}
function unquote(value) {
  return value.trim().replace(/^["']|["']$/g, "");
}
function declaredBins(lines) {
  const at = lines.findIndex((line) => /^\s*bins\s*:/.test(line));
  if (at === -1)
    return [];
  const inline = lines[at]?.split(":").slice(1).join(":").trim() ?? "";
  if (inline.startsWith("[")) {
    return inline.replace(/^\[|\]$/g, "").split(",").map(unquote).filter((name) => name.length > 0);
  }
  const out = [];
  for (const line of lines.slice(at + 1)) {
    const item = /^\s*-\s*(.+)$/.exec(line);
    if (item === null)
      break;
    out.push(unquote(item[1] ?? ""));
  }
  return out.filter((name) => name.length > 0);
}
function bashTools(lines) {
  const line = lines.find((candidate) => /^\s*allowed-tools\s*:/.test(candidate));
  if (line === undefined)
    return [];
  return [...line.matchAll(/Bash\(\s*([A-Za-z0-9._-]+)/g)].map((match) => match[1] ?? "").filter((name) => name.length > 0);
}
function declaredDescription(lines) {
  const at = lines.findIndex((line) => /^description\s*:/.test(line));
  if (at === -1)
    return null;
  const inline = lines[at]?.split(":").slice(1).join(":").trim() ?? "";
  if (inline !== "" && !/^[>|][-+]?$/.test(inline))
    return unquote(inline) || null;
  const block = [];
  for (const line of lines.slice(at + 1)) {
    if (!/^\s+\S/.test(line))
      break;
    block.push(line.trim());
  }
  return block.length === 0 ? null : block.join(" ");
}
var COMMON = new Set(("awk bash break bun case cat cd chmod command continue cp curl cut date diff do done echo else end env " + "esac exit export false fi find for function git grep head if kill ln local ls mkdir mv node npm npx open pip pip3 pnpm printf pwd " + "python python3 read return rm sed set sh shift sleep sort source sudo tail tar tee test then time " + "touch tr true uniq unset unzip wait wc wget which while xargs yarn zip").split(" "));
var INSTALL = /\b(?:npm\s+(?:i|install)\s+(?:-g|--global)|pnpm\s+add\s+-g|yarn\s+global\s+add|brew\s+install|pipx\s+install|pip3?\s+install|cargo\s+install)\s+([@a-z0-9][@\w./-]*)/i;
var PROBE = /\b(?:command\s+-v|which)\s+([a-z][\w-]*)/i;
var COMMAND = /^[a-z][a-z0-9_-]*$/;
function commandsIn(shell, explicitOnly) {
  const found = [];
  for (const segment of shell.split(/&&|\|\||[|;]/)) {
    const line = segment.trim().replace(/^\$\s+/, "");
    if (line === "" || line.startsWith("#"))
      continue;
    const named = INSTALL.exec(line)?.[1] ?? PROBE.exec(line)?.[1];
    if (named !== undefined) {
      found.push(named);
      continue;
    }
    if (explicitOnly)
      continue;
    const words = line.split(/\s+/).filter((word) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(word));
    const first = words[0] === "sudo" ? words[1] : words[0];
    if (first === undefined || !COMMAND.test(first))
      continue;
    found.push(first);
  }
  return found;
}
var SHELL_FENCE = /^(sh|bash|shell|zsh|console|terminal)$/i;
function shellLinesRun(lines) {
  const run = [];
  let heredocEnd = null;
  let quote = null;
  let continued = false;
  for (const line of lines) {
    if (heredocEnd !== null) {
      if (line.trim() === heredocEnd)
        heredocEnd = null;
      continue;
    }
    if (quote === null && !continued)
      run.push(line);
    continued = line.trimEnd().endsWith("\\");
    heredocEnd = /<<-?\s*['"]?([A-Za-z_]+)/.exec(line)?.[1] ?? null;
    for (const char of line) {
      if (quote === null && (char === '"' || char === "'"))
        quote = char;
      else if (char === quote)
        quote = null;
    }
  }
  return run;
}
function commandsRun(body, declared) {
  const found = [];
  let fence = null;
  let fenced = [];
  for (const line of body) {
    const marker = /^\s*(?:```|~~~)\s*([\w-]*)/.exec(line);
    if (marker !== null) {
      if (fence === "shell") {
        for (const run of shellLinesRun(fenced))
          found.push(...commandsIn(run, false));
      }
      fenced = [];
      fence = fence !== null ? null : SHELL_FENCE.test(marker[1] ?? "") ? "shell" : "other";
      continue;
    }
    if (fence !== null) {
      fenced.push(line);
      continue;
    }
    for (const inline of line.matchAll(/`([^`]+)`/g))
      found.push(...commandsIn(inline[1] ?? "", true));
  }
  return [...new Set(found)].filter((name) => !COMMON.has(name) && !declared.includes(name));
}
function requiresLine(lines) {
  const name = lines.map((line) => /^\s*requires\s*:\s*(\S+)\s*$/.exec(line)?.[1]).find(Boolean);
  return name === undefined ? [] : [unquote(name)];
}
function readRequires(markdown) {
  const { lines, bodyStart } = frontmatter(markdown);
  const cli = [...new Set([...declaredBins(lines), ...bashTools(lines), ...requiresLine(lines)])];
  const description = declaredDescription(lines);
  const body = markdown.split(`
`);
  const runs = commandsRun(body.slice(bodyStart), cli);
  for (let index = bodyStart;index < body.length; index += 1) {
    const text = body[index] ?? "";
    if (LOGIN.test(text)) {
      return { cli, runs, login: { line: index + 1, text: text.trim().slice(0, 160) }, description };
    }
  }
  return { cli, runs, login: null, description };
}
// ../../packages/protocol/dist/domain-words.js
function tokens(text) {
  return normaliseCategoryLabel(text).split(/[^a-z0-9]+/).filter((t) => t.length > 1);
}
function domainInText(text, words) {
  const padded = ` ${tokens(text).join(" ")} `;
  const hit = (phrase) => padded.includes(` ${tokens(phrase).join(" ")} `);
  const label = [...words.labels].filter((l) => tokens(l).length > 0 && hit(l)).sort((a, b) => b.length - a.length)[0];
  if (label !== undefined)
    return label;
  const alias = Object.keys(words.aliases).filter((a) => words.labels.includes(words.aliases[a]) && hit(a)).sort((a, b) => b.length - a.length)[0];
  return alias === undefined ? null : words.aliases[alias];
}
// ../../packages/protocol/dist/content-path.js
function skillRefFromUrl(url) {
  let parsed;
  try {
    parsed = new URL(url.includes("://") ? url : `https://${url}`);
  } catch {
    return null;
  }
  if (parsed.hostname.replace(/^www\./, "") !== "github.com")
    return null;
  const skill = parsed.searchParams.get("skill");
  if (skill === null || skill.length === 0)
    return null;
  const [owner, repo] = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\.git$/, "").split("/");
  if (owner === undefined || repo === undefined)
    return null;
  if (owner.length === 0 || repo.length === 0)
    return null;
  return { repo: `${owner}/${repo}`, skill };
}

// ../../packages/protocol/dist/share-failures.js
function installedFromSkillLock(lock) {
  if (lock === null)
    return [];
  try {
    const parsed = JSON.parse(lock);
    return Object.entries(parsed.skills ?? {}).flatMap(([skill, entry]) => entry?.sourceType === "github" && typeof entry.source === "string" ? [{ skill, source: entry.source }] : []);
  } catch {
    return [];
  }
}
function installedFromReceipts(text) {
  const found = [];
  for (const line of (text ?? "").split(`
`)) {
    if (line.trim() === "")
      continue;
    try {
      const row = JSON.parse(line);
      const url = typeof row.url === "string" ? row.url : row.receipt?.url;
      const ref = typeof url === "string" ? skillRefFromUrl(url) : null;
      if (ref !== null)
        found.push({ skill: ref.skill, source: ref.repo });
    } catch {
      continue;
    }
  }
  return found;
}
// ../hook/src/classify.ts
var CANCELLED = /\b(interrupted|cancel(l)?ed|aborted) by (the )?user\b|\buser (rejected|denied|declined)\b|\bpermission denied by user\b|\buser doesn't want to (proceed|take this action)\b/i;
var AUTH = /\b(unauthori[sz]ed|forbidden|invalid (api )?(key|token)|authentication|not authenticated|expired token)\b/i;
var TIMEOUT = /\b(timed? ?out|timeout|deadline exceeded|ETIMEDOUT)\b/i;
var UNREACHABLE = /\b(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|getaddrinfo|certificate|TLS|SSL|socket hang up|connection refused|fetch failed)\b/i;
var PAYMENT = /\b(payment required|insufficient (funds|balance)|payment (failed|refused|rejected)|x402)\b/i;
var STATUS = /\b(40[123]|429|5\d\d)\b/;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function failureText(call) {
  const parts = [];
  const push = (value) => {
    if (typeof value === "string")
      parts.push(value);
    else if (isRecord(value)) {
      for (const key of ["error", "message", "reason"]) {
        const text = value[key];
        if (typeof text === "string")
          parts.push(text);
      }
      if (Array.isArray(value.content)) {
        for (const item of value.content) {
          if (isRecord(item) && typeof item.text === "string")
            parts.push(item.text);
        }
      }
    }
  };
  push(call.error);
  push(call.response);
  return parts.join(`
`).slice(0, 4000);
}
function statusOf(call) {
  if (!isRecord(call.response))
    return null;
  for (const key of ["status", "statusCode", "status_code"]) {
    const value = call.response[key];
    if (typeof value === "number" && Number.isInteger(value))
      return value;
  }
  return null;
}
function flaggedError(response) {
  return isRecord(response) && (response.isError === true || response.is_error === true);
}
function classifyCall(call) {
  if (call.interrupted)
    return null;
  const failed = call.event === "PostToolUseFailure" || call.error !== null || flaggedError(call.response);
  const status = statusOf(call);
  if (!failed && (status === null || status < 400))
    return { outcome: "ok", code: null };
  const text = failureText(call);
  if (CANCELLED.test(text))
    return null;
  const found = STATUS.exec(text);
  const match = status ?? (found === null ? null : Number(found[0]));
  const code = match === null ? null : String(match);
  if (match === 402 || PAYMENT.test(text))
    return { outcome: "payment", code };
  if (match === 401 || match === 403 || AUTH.test(text))
    return { outcome: "auth", code };
  if (TIMEOUT.test(text))
    return { outcome: "timeout", code };
  if (UNREACHABLE.test(text))
    return { outcome: "unreachable", code };
  return { outcome: "tool_error", code };
}

// ../hook/src/mcp-config.ts
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return;
  }
}
function entryOf(raw) {
  if (!isRecord2(raw))
    return null;
  if (typeof raw.url === "string" && raw.url.length > 0)
    return { transport: "remote", url: raw.url };
  if (typeof raw.command === "string" && raw.command.length > 0) {
    const args = Array.isArray(raw.args) ? raw.args.filter((arg) => typeof arg === "string") : [];
    return { transport: "local", command: raw.command, args };
  }
  return null;
}
function collect(into, servers) {
  if (!isRecord2(servers))
    return;
  for (const [name, raw] of Object.entries(servers)) {
    const entry = entryOf(raw);
    if (entry !== null)
      into.set(name, entry);
  }
}
function readMcpServers({
  cwd,
  home = homedir()
}) {
  const servers = new Map;
  const user = readJson(join(home, ".claude.json"));
  if (isRecord2(user)) {
    collect(servers, user.mcpServers);
    if (isRecord2(user.projects)) {
      const project = user.projects[cwd];
      if (isRecord2(project))
        collect(servers, project.mcpServers);
    }
  }
  const shared = readJson(join(cwd, ".mcp.json"));
  if (isRecord2(shared))
    collect(servers, shared.mcpServers);
  return servers;
}
function packageArg(args) {
  const first = args.find((arg) => !arg.startsWith("-"));
  if (first === undefined)
    return null;
  const at = first.lastIndexOf("@");
  return at > 0 ? first.slice(0, at) : first;
}
var NPM_LAUNCHERS = new Set(["npx", "bunx", "pnpx"]);
var PYPI_LAUNCHERS = new Set(["uvx", "pipx"]);
var LOCALHOST = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
var SECRET_SEGMENT = /^(?=[A-Za-z0-9_-]*[A-Za-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{24,}$/;
function credentialFree(url) {
  const segments = url.pathname.split("/").filter((segment) => segment.length > 0);
  const path = segments.some((segment) => SECRET_SEGMENT.test(segment)) ? "" : url.pathname;
  const port = url.port === "" ? "" : `:${url.port}`;
  return `${url.protocol}//${url.hostname}${port}${path}`;
}
function serverUrlOf(entry) {
  if (entry === undefined)
    return null;
  if (entry.transport === "remote") {
    try {
      const url = new URL(entry.url);
      if (url.protocol !== "https:" && url.protocol !== "http:")
        return null;
      return LOCALHOST.has(url.hostname) ? null : credentialFree(url);
    } catch {
      return null;
    }
  }
  const launcher = entry.command.split(/[\\/]/).pop() ?? entry.command;
  const args = launcher === "pipx" && entry.args[0] === "run" ? entry.args.slice(1) : entry.args;
  const pkg = packageArg(args);
  if (pkg === null || pkg.startsWith(".") || pkg.startsWith("/"))
    return null;
  if (NPM_LAUNCHERS.has(launcher))
    return `https://www.npmjs.com/package/${pkg}`;
  if (PYPI_LAUNCHERS.has(launcher))
    return `https://pypi.org/project/${pkg}`;
  return null;
}

// ../hook/src/capture.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join as join2 } from "node:path";
var TOP_LEVEL_NAMES = new Set([
  "hook_event_name",
  "hookEventName",
  "tool_name",
  "toolName",
  "tool_use_id",
  "toolUseId",
  "session_id",
  "sessionId",
  "conversation_id",
  "generation_id",
  "turn_id",
  "model",
  "model_id",
  "permission_mode",
  "permissionMode",
  "timestamp",
  "mcp_server_name",
  "original_request_name"
]);
var URL_KEYS = new Set(["mcp_server_url", "server_url", "serverUrl", "url"]);
var IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]{0,39}$/;
var SECRET_SHAPED = /^(?=.*\d)(?=.*[A-Za-z]).{20,}$/;
function keyOf(key) {
  return IDENTIFIER.test(key) && !SECRET_SHAPED.test(key) ? key : `<key:${key.length}>`;
}
function hostOnly(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}<rest:${value.length}>`;
  } catch {
    return `<string:${value.length}>`;
  }
}
function deep(value) {
  if (typeof value === "string")
    return `<string:${value.length}>`;
  if (typeof value === "number")
    return "<number>";
  if (Array.isArray(value))
    return value.map(deep);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [keyOf(key), deep(item)]));
  }
  return value;
}
function redact(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return deep(payload);
  }
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => {
    if (typeof value === "string") {
      if (URL_KEYS.has(key))
        return [keyOf(key), hostOnly(value)];
      return [keyOf(key), TOP_LEVEL_NAMES.has(key) ? value : `<string:${value.length}>`];
    }
    if (typeof value === "number" || typeof value === "boolean" || value === null) {
      return [keyOf(key), value];
    }
    return [keyOf(key), deep(value)];
  }));
}
function capture(payload, dir, now = new Date) {
  try {
    const record = redact(payload);
    const event = typeof record === "object" && record !== null && !Array.isArray(record) ? Object.entries(record).find(([key]) => key === "hook_event_name" || key === "hookEventName")?.[1] : undefined;
    const name = `${now.toISOString().replace(/[:.]/g, "-")}-${String(event ?? "event").replace(/[^A-Za-z]/g, "")}.json`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join2(dir, name), `${JSON.stringify(record, null, 2)}
`);
  } catch {}
}

// ../hook/src/payload.ts
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function str(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
function ms(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}
function first(raw, keys) {
  for (const key of keys)
    if (key in raw)
      return raw[key];
  return;
}
function toolCallOf(raw) {
  if (!isRecord3(raw))
    return null;
  const format = typeof raw.toolName === "string" && typeof raw.tool_name !== "string" ? "grok" : "claude";
  const camel = format === "grok";
  const tool = str(camel ? raw.toolName : raw.tool_name);
  if (tool === null)
    return null;
  const input = camel ? raw.toolInput : raw.tool_input;
  const responseKeys = camel ? ["toolResult", "tool_response"] : ["tool_response"];
  const hasResponse = responseKeys.some((key) => (key in raw) && raw[key] !== undefined);
  return {
    format,
    event: str(camel ? first(raw, ["hookEventName", "hook_event_name"]) : raw.hook_event_name),
    session: str(camel ? raw.sessionId : raw.session_id),
    id: str(camel ? raw.toolUseId : raw.tool_use_id),
    tool,
    input: isRecord3(input) ? input : undefined,
    hasResponse,
    response: hasResponse ? first(raw, responseKeys) : undefined,
    error: str(raw.error),
    interrupted: (camel ? first(raw, ["isInterrupt", "is_interrupt"]) : raw.is_interrupt) === true,
    ms: ms(camel ? first(raw, ["durationMs", "duration_ms"]) : raw.duration_ms),
    cwd: str(raw.cwd),
    transcript: str(raw.transcript_path)
  };
}

// ../hook/src/skill-failure.ts
import { existsSync, mkdirSync as mkdirSync2, readFileSync as readFileSync2 } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { dirname as dirname2, join as join3 } from "node:path";
// ../../data/catalogue/domain-aliases.json
var domain_aliases_default = {
  _note: "Words a person or an agent uses, mapped to a node of ARP's domain tree (OASF 1.1.0 names, plus ARP's own `design`), task 84. Read locally by the MCP server, the CLI and the hook: the words never leave the machine (the user, 2026-11-09). Every target is checked against data/catalogue/oasf-1.1.0-skills.json by packages/protocol/test/domain-words.test.ts. ARP's old category words map to the one node that held them; the split ones (method, quality) have no alias, and a refusal suggests nodes instead.",
  oasfVersion: "1.1.0",
  aliases: {
    ads: "advertising",
    advertising: "advertising",
    agent: "agent application building",
    agents: "agent orchestration",
    android: "mobile development",
    animation: "web animation",
    api: "api development",
    audio: "audio & speech processing",
    automation: "tool use and automation",
    backend: "backend development",
    blockchain: "blockchain and web3",
    brand: "branding",
    browser: "browser automation",
    captions: "video editing",
    chart: "chart generation",
    charts: "chart generation",
    chat: "team messaging",
    collaboration: "collaboration and communication",
    commit: "commit authoring",
    copywriting: "copywriting",
    crawl: "web crawling",
    cro: "conversion optimization",
    dashboard: "dashboard building",
    database: "databases",
    debug: "code debugging",
    debugging: "code debugging",
    deck: "presentation authoring",
    deploy: "deployment and release management",
    development: "software engineering",
    docker: "containerization",
    docs: "technical writing",
    document: "document authoring",
    documentation: "project documentation",
    docx: "document authoring",
    editing: "video editing",
    email: "email marketing",
    excel: "spreadsheet authoring",
    frontend: "frontend development",
    git: "git workflow",
    illustration: "image generation",
    image: "computer vision",
    infrastructure: "devops and cloud infrastructure",
    ios: "mobile development",
    issues: "issue tracking",
    kubernetes: "container orchestration",
    landing: "conversion optimization",
    layout: "design",
    logo: "branding",
    logs: "logging and log analysis",
    marketing: "content, writing and marketing",
    mcp: "agent tool building",
    meeting: "meeting intelligence",
    meetings: "meeting intelligence",
    mobile: "mobile development",
    monitoring: "monitoring and alerting",
    montage: "video editing",
    music: "text to audio",
    newsletter: "email marketing",
    notes: "note-taking",
    payment: "payments integration",
    pdf: "pdf manipulation",
    pentest: "penetration testing",
    postgres: "relational database operations",
    powerpoint: "presentation authoring",
    pptx: "presentation authoring",
    pr: "pull request management",
    prd: "requirements and prd authoring",
    presentation: "presentation authoring",
    prompt: "prompt design",
    rag: "retrieval-augmented generation",
    research: "research and scholarship",
    review: "code review",
    scrape: "web scraping",
    scraping: "web data acquisition",
    search: "web search research",
    security: "cybersecurity",
    seo: "search engine optimization",
    slide: "presentation authoring",
    slides: "presentation authoring",
    "smart contract": "smart contract development",
    social: "social media marketing",
    solidity: "smart contract development",
    spec: "requirements and prd authoring",
    spreadsheet: "spreadsheet authoring",
    sql: "relational database operations",
    subtitles: "video editing",
    summarize: "text summarization",
    summary: "text summarization",
    tdd: "software testing",
    test: "software testing",
    testing: "software testing",
    tests: "software testing",
    thumbnail: "image generation",
    tickets: "issue tracking",
    trading: "defi and crypto trading",
    transcription: "automatic speech recognition",
    translate: "translation",
    tts: "text to speech",
    typography: "design",
    ui: "design",
    ux: "design",
    voice: "text to speech",
    wallet: "crypto wallet operations",
    website: "web development",
    writing: "content writing",
    xlsx: "spreadsheet authoring"
  }
};
// ../../data/catalogue/skill-nodes-13579.json
var skill_nodes_13579_default = {
  _note: "For the hook, which reads no network (task 84): the nodes of ARP's testnet tree as written by task 79 (data/catalogue/oasf-tree-13579.json), and the node each skill name is filed at, when the name is filed at one node only. Generated from data/catalogue/oasf-skill-tags-proposal-13579.json, rows not reviewed out.",
  chainId: 13579,
  oasfVersion: "1.1.0",
  nodes: [
    "ad copywriting",
    "ad creative production",
    "advertising",
    "agent application building",
    "agent evaluation",
    "agent orchestration",
    "agent tool building",
    "agentic workflow orchestration",
    "ai agent development",
    "ai safety and guardrails",
    "ai/ml engineering",
    "answer engine optimization",
    "api development",
    "api schema understanding",
    "app store release",
    "architecture patterns",
    "architecture review",
    "article and blog writing",
    "audio & speech processing",
    "audio generation",
    "audio to audio",
    "authentication implementation",
    "authorization and access control",
    "benchmark execution",
    "branding",
    "browser automation",
    "build, packaging and dev tooling",
    "business and professional",
    "business and professional writing",
    "business operations",
    "business strategy",
    "calendar and scheduling",
    "campaign planning",
    "ci/cd configuration",
    "ci/cd pipelines",
    "cli and terminal app development",
    "cloud architecture design",
    "cloud cost optimization",
    "cloud networking",
    "cloud platform operations",
    "cloud resource management",
    "code comprehension",
    "code debugging",
    "code generation",
    "code migration and modernization",
    "code quality and maintenance",
    "code refactoring and optimization",
    "code review",
    "collaboration and communication",
    "commit authoring",
    "competitive analysis",
    "competitive intelligence",
    "compliance assessment",
    "computer vision",
    "configuration management",
    "container orchestration",
    "container workload management",
    "containerization",
    "content strategy",
    "content writing",
    "content, writing and marketing",
    "context window management",
    "controllable image generation",
    "conversion optimization",
    "copy editing",
    "copywriting",
    "crm management",
    "cross-platform mobile development",
    "customer support and success",
    "cybersecurity",
    "data analytics",
    "data engineering and analytics",
    "data modeling",
    "data modeling and design",
    "data pipelines",
    "data visualization",
    "data warehousing",
    "databases",
    "deep learning training",
    "deep research",
    "dependency management",
    "deployment and release management",
    "deployment orchestration",
    "design",
    "dev environment setup",
    "devops and cloud infrastructure",
    "document authoring",
    "document collaboration",
    "document or database question answering",
    "document processing",
    "editing and proofreading",
    "email campaign creation",
    "email management",
    "email marketing",
    "employee lifecycle",
    "end-to-end and ui testing",
    "error handling implementation",
    "experiment tracking",
    "face swapping",
    "frontend development",
    "full-stack development",
    "game development",
    "git workflow",
    "governance, compliance and ethics",
    "graph database operations",
    "growth strategy",
    "human resources",
    "iac authoring",
    "identity administration",
    "identity and access management",
    "image editing",
    "image generation",
    "image inpainting",
    "image outpainting",
    "image to image",
    "image to video",
    "incident response",
    "inference and serving",
    "infrastructure as code",
    "instructed image editing",
    "interactive visualization",
    "issue tracking",
    "knowledge base management",
    "knowledge management",
    "landing page and sales copy",
    "language generation",
    "language processing",
    "lead generation",
    "llm evaluation",
    "llm observability",
    "llm tracing and instrumentation",
    "logging and log analysis",
    "logical reasoning",
    "market and competitive intelligence",
    "market research",
    "marketing copywriting",
    "marketing strategy",
    "meeting intelligence",
    "ml experimentation and lifecycle",
    "mobile development",
    "model and agent evaluation",
    "model fine-tuning",
    "model serving",
    "model training and fine-tuning",
    "monitoring and alerting",
    "multi-agent coordination",
    "native mobile development",
    "network configuration",
    "nosql database operations",
    "note-taking",
    "observability",
    "observability instrumentation",
    "office productivity",
    "orm and data access",
    "paid ads management",
    "paper analysis",
    "pdf manipulation",
    "performance monitoring",
    "postmortem authoring",
    "presentation authoring",
    "problem solving",
    "process operations",
    "product analytics",
    "product management",
    "product marketing and gtm",
    "product strategy",
    "production llm monitoring",
    "project and task management",
    "project scaffolding",
    "prompt design",
    "prompt engineering",
    "prompt optimization",
    "pull request management",
    "quality evaluation",
    "reasoning and planning",
    "relational database operations",
    "release management",
    "requirements and prd authoring",
    "research and scholarship",
    "research ideation",
    "research, knowledge and productivity",
    "responsible ai governance",
    "retention management",
    "retrieval-augmented generation",
    "roadmapping and prioritization",
    "role assignment",
    "root-cause debugging",
    "runtime guardrails",
    "sales and crm",
    "sales enablement",
    "sales outreach",
    "script integration",
    "search engine optimization",
    "security hardening",
    "security operations",
    "seo auditing",
    "seo content optimization",
    "serverless and edge computing",
    "serverless function development",
    "site reliability engineering",
    "social content creation",
    "social media management",
    "social media marketing",
    "software architecture and design",
    "software engineering",
    "software testing",
    "specialized application development",
    "spreadsheet authoring",
    "static analysis and linting",
    "stream processing",
    "structured data markup",
    "styling and responsive layout",
    "support operations",
    "system design",
    "talking avatar generation",
    "task decomposition",
    "task management",
    "team messaging",
    "technical writing",
    "test strategy and tdd",
    "text paraphrasing",
    "text style transfer",
    "text to audio",
    "text to code",
    "text to image",
    "text to video",
    "third-party integration",
    "threat detection",
    "tool use and automation",
    "tool use planning",
    "trace analysis and debugging",
    "ux writing and microcopy",
    "version control and collaboration",
    "video",
    "video editing",
    "vulnerability analysis",
    "vulnerability management",
    "web accessibility",
    "web animation",
    "web development",
    "web search",
    "web search research",
    "workflow automation"
  ],
  skills: {
    "ab-test-setup": "product analytics",
    "ab-testing": "product analytics",
    "academy-guide": "support operations",
    "ace-step": "text to audio",
    "ad-creative": "ad copywriting",
    adapt: "styling and responsive layout",
    ads: "paid ads management",
    "agent-browser": "browser automation",
    "agent-tools": "script integration",
    "agents-sdk": "agent application building",
    "ai-avatar-video": "talking avatar generation",
    "ai-image-generation": "text to image",
    "ai-music": "text to audio",
    "ai-paper-reproduction": "research and scholarship",
    "ai-research-explore": "research ideation",
    "ai-research-reproduction": "research and scholarship",
    "ai-seo": "answer engine optimization",
    "ai-video-generation": "text to video",
    "airunway-aks-setup": "model serving",
    "algorithmic-art": "image generation",
    analytics: "product analytics",
    "analytics-tracking": "product analytics",
    "analyze-project": "code comprehension",
    "analyze-test-run": "software testing",
    animate: "web animation",
    "animate-expo": "web animation",
    "animation-performance": "web animation",
    "animation-vocabulary": "web animation",
    animejs: "web animation",
    "app-store-screenshots": "app store release",
    "appinsights-instrumentation": "observability instrumentation",
    "apple-design": "design",
    arrange: "design",
    "ask-matt": "tool use planning",
    "ask-sonner": "frontend development",
    aso: "seo auditing",
    "aso-audit": "seo auditing",
    attribution: "product analytics",
    audit: "web accessibility",
    "azure-ai": "cloud platform operations",
    "azure-aigateway": "runtime guardrails",
    "azure-app-onboard": "deployment orchestration",
    "azure-app-onboard-prereq": "deployment orchestration",
    "azure-cloud-migrate": "code migration and modernization",
    "azure-compliance": "compliance assessment",
    "azure-compute": "cloud resource management",
    "azure-cost": "cloud cost optimization",
    "azure-cost-optimization": "cloud cost optimization",
    "azure-deploy": "deployment orchestration",
    "azure-diagnostics": "incident response",
    "azure-enterprise-infra-planner": "cloud architecture design",
    "azure-hosted-copilot-sdk": "agent application building",
    "azure-kubernetes": "container workload management",
    "azure-kusto": "logging and log analysis",
    "azure-kusto-graph": "graph database operations",
    "azure-kusto-irql": "threat detection",
    "azure-kusto-irql-graph": "interactive visualization",
    "azure-messaging": "code debugging",
    "azure-observability": "observability",
    "azure-postgres": "relational database operations",
    "azure-prepare": "iac authoring",
    "azure-quotas": "cloud resource management",
    "azure-rbac": "authorization and access control",
    "azure-reliability": "site reliability engineering",
    "azure-resource-lookup": "cloud resource management",
    "azure-resource-visualizer": "cloud architecture design",
    "azure-storage": "cloud resource management",
    "azure-upgrade": "code migration and modernization",
    "azure-validate": "ci/cd configuration",
    basin: "data warehousing",
    "batch-grill-me": "problem solving",
    bolder: "design",
    brainstorming: "reasoning and planning",
    "brand-guidelines": "branding",
    "break-ui": "end-to-end and ui testing",
    "building-ai-agent-on-cloudflare": "agent application building",
    "building-mcp-server-on-cloudflare": "agent tool building",
    "canopy-part-title": "video editing",
    "canvas-design": "image generation",
    "captions-overlay": "video editing",
    cavecrew: "role assignment",
    caveman: "text style transfer",
    "caveman-commit": "commit authoring",
    "caveman-compress": "context window management",
    "caveman-discover": "llm tracing and instrumentation",
    "caveman-es": "text style transfer",
    "caveman-evidence-review": "trace analysis and debugging",
    "caveman-explore": "code comprehension",
    "caveman-help": "text style transfer",
    "caveman-learn": "prompt optimization",
    "caveman-manage": "release management",
    "caveman-optimize": "llm evaluation",
    "caveman-review": "code review",
    "caveman-setup": "llm tracing and instrumentation",
    "caveman-stats": "production llm monitoring",
    "cf-cli": "cloud resource management",
    "changelog-video": "video editing",
    "character-design-sheet": "controllable image generation",
    "chief-of-staff": "agentic workflow orchestration",
    "churn-prevention": "retention management",
    clarify: "ux writing and microcopy",
    "claude-api": "third-party integration",
    "claude-design-hyperframes": "video editing",
    "claude-handoff": "multi-agent coordination",
    cloudflare: "cloud architecture design",
    "cloudflare-email-service": "third-party integration",
    "cloudflare-one": "network configuration",
    "cloudflare-one-migrations": "network configuration",
    "co-marketing": "campaign planning",
    "code-review": "code review",
    "code-slice-hero": "video editing",
    "codebase-design": "architecture patterns",
    "codex-pet": "image to image",
    "cold-email": "sales outreach",
    colorize: "design",
    "community-marketing": "growth strategy",
    "competitor-alternatives": "landing page and sales copy",
    "competitor-profiling": "competitive intelligence",
    "competitor-teardown": "competitive analysis",
    competitors: "landing page and sales copy",
    compress: "context window management",
    "content-strategy": "content strategy",
    "contribute-catalog": "video editing",
    "controlnet-pose": "image to video",
    "conversion-tracking": "product analytics",
    "copy-editing": "copy editing",
    copywriting: "marketing copywriting",
    critique: "design",
    cro: "conversion optimization",
    "css-animations": "web animation",
    "cuboid-carousel": "video editing",
    "customer-research": "market research",
    "cut-the-curve": "video editing",
    "decision-mapping": "task decomposition",
    delight: "design",
    "deploy-to-vercel": "deployment orchestration",
    "design-an-interface": "system design",
    "design-mobile-apps": "design",
    "design-taste-frontend": "design",
    "design-taste-frontend-v1": "design",
    "design-taste-frontend-v2-experimental": "design",
    "developing-genkit-dart": "agent application building",
    "developing-genkit-go": "agent application building",
    "developing-genkit-js": "agent application building",
    "developing-genkit-python": "agent application building",
    diagnose: "root-cause debugging",
    "diagnosing-bugs": "root-cause debugging",
    "diagnosing-superpowers": "trace analysis and debugging",
    "directory-submissions": "search engine optimization",
    "discernment-nudge": "responsible ai governance",
    "discover-azure-skills": "tool use planning",
    "dispatching-parallel-agents": "multi-agent coordination",
    distill: "design",
    "doc-coauthoring": "technical writing",
    docx: "document authoring",
    "domain-modeling": "data modeling",
    "durable-objects": "serverless function development",
    "edit-article": "editing and proofreading",
    "elevenlabs-music-generation": "text to audio",
    "email-sequence": "email campaign creation",
    emails: "email campaign creation",
    "embedded-captions": "video editing",
    "emil-design-eng": "design",
    "entra-agent-id": "identity administration",
    "entra-app-registration": "authentication implementation",
    "env-and-assets-bootstrap": "dev environment setup",
    events: "campaign planning",
    "executing-plans": "task management",
    "explore-code": "deep learning training",
    "explore-run": "experiment tracking",
    "extension-to-functions-codebase": "code migration and modernization",
    extract: "design",
    "face-swap": "face swapping",
    "faceless-explainer": "text to video",
    figma: "video editing",
    "file-test-bug": "issue tracking",
    "find-animation-opportunities": "web animation",
    "find-skills": "tool use planning",
    "finishing-a-development-branch": "git workflow",
    "firebase-ai-logic": "third-party integration",
    "firebase-ai-logic-basics": "third-party integration",
    "firebase-app-hosting-basics": "deployment orchestration",
    "firebase-auth-basics": "authentication implementation",
    "firebase-basics": "dev environment setup",
    "firebase-crashlytics": "monitoring and alerting",
    "firebase-data-connect": "relational database operations",
    "firebase-firestore": "nosql database operations",
    "firebase-firestore-basics": "nosql database operations",
    "firebase-firestore-enterprise-native-mode": "nosql database operations",
    "firebase-firestore-standard": "nosql database operations",
    "firebase-hosting-basics": "deployment orchestration",
    "firebase-local-env-setup": "dev environment setup",
    "firebase-remote-config-basics": "configuration management",
    "firebase-security-rules-auditor": "vulnerability analysis",
    "firestore-rules-creation": "authorization and access control",
    "firestore-security-rules-auditor": "vulnerability analysis",
    "flux-2-klein": "text to image",
    "flux-kontext": "instructed image editing",
    "form-cro": "conversion optimization",
    "free-tool-strategy": "growth strategy",
    "free-tools": "growth strategy",
    "frontend-design": "design",
    "frost-sequence-camera-orbit": "video editing",
    "full-output-enforcement": "prompt design",
    "gateway-workers": "serverless function development",
    "general-video": "video editing",
    "git-guardrails-claude-code": "git workflow",
    "glass-shard-title": "video editing",
    "google-agents-cli-adk-code": "agent application building",
    "google-agents-cli-deploy": "deployment orchestration",
    "google-agents-cli-eval": "agent evaluation",
    "google-agents-cli-observability": "llm tracing and instrumentation",
    "google-agents-cli-publish": "release management",
    "google-agents-cli-scaffold": "project scaffolding",
    "google-agents-cli-workflow": "agent application building",
    "gpt-image": "text to image",
    "gpt-image-2": "text to image",
    "gpt-image-edit": "instructed image editing",
    "gpt-taste": "design",
    "graphic-overlays": "video editing",
    "grill-me": "problem solving",
    "grill-with-docs": "problem solving",
    grilling: "problem solving",
    gsap: "web animation",
    handoff: "context window management",
    happyhorse: "text to video",
    "happyhorse-1-0": "text to video",
    harden: "error handling implementation",
    "higgsfield-brandkit": "branding",
    "higgsfield-faceless-video": "text to video",
    "higgsfield-game-generation": "game development",
    "higgsfield-generate": "text to image",
    "higgsfield-marketplace-cards": "ad creative production",
    "higgsfield-product-photoshoot": "text to image",
    "higgsfield-soul-id": "model fine-tuning",
    "higgsfield-websites": "full-stack development",
    "higgsfield-youtube-thumbnail": "text to image",
    "high-end-visual-design": "design",
    hyperframes: "video",
    "hyperframes-animation": "web animation",
    "hyperframes-audio": "audio to audio",
    "hyperframes-cli": "video editing",
    "hyperframes-core": "video editing",
    "hyperframes-creative": "video editing",
    "hyperframes-keyframes": "video editing",
    "hyperframes-media": "audio generation",
    "hyperframes-read-first": "video",
    "hyperframes-registry": "video editing",
    "hyperframes-studio": "video editing",
    image: "image generation",
    "image-edit": "instructed image editing",
    "image-inpainting": "image inpainting",
    "image-outpainting": "image outpainting",
    "image-taste-frontend": "design",
    "image-to-video": "image to video",
    impeccable: "design",
    implement: "text to code",
    "implement-spec": "text to code",
    "improve-animations": "web animation",
    "improve-codebase-architecture": "architecture review",
    "industrial-brutalist-ui": "design",
    "influencer-marketing": "campaign planning",
    "infsh-cli": "script integration",
    "internal-comms": "business and professional writing",
    "investigate-first": "root-cause debugging",
    k2: "stream processing",
    "kling-3-0": "text to video",
    "landing-page-design": "conversion optimization",
    "lark-approval": "process operations",
    "lark-apps": "full-stack development",
    "lark-attendance": "employee lifecycle",
    "lark-base": "spreadsheet authoring",
    "lark-calendar": "calendar and scheduling",
    "lark-contact": "team messaging",
    "lark-doc": "document collaboration",
    "lark-drive": "document collaboration",
    "lark-event": "workflow automation",
    "lark-im": "team messaging",
    "lark-mail": "email management",
    "lark-markdown": "document collaboration",
    "lark-meeting": "meeting intelligence",
    "lark-minutes": "meeting intelligence",
    "lark-note": "meeting intelligence",
    "lark-okr": "roadmapping and prioritization",
    "lark-openapi-explorer": "api schema understanding",
    "lark-shared": "authentication implementation",
    "lark-sheets": "spreadsheet authoring",
    "lark-skill-maker": "agent tool building",
    "lark-slides": "presentation authoring",
    "lark-task": "task management",
    "lark-vc": "meeting intelligence",
    "lark-vc-agent": "meeting intelligence",
    "lark-whiteboard": "document collaboration",
    "lark-whiteboard-cli": "document collaboration",
    "lark-wiki": "knowledge base management",
    "lark-workflow-meeting-summary": "meeting intelligence",
    "lark-workflow-standup-report": "task management",
    launch: "product marketing and gtm",
    "launch-strategy": "product marketing and gtm",
    layout: "design",
    "lead-magnets": "lead generation",
    "lean-build": "text to code",
    "link-building": "search engine optimization",
    lipsync: "talking avatar generation",
    "loop-me": "requirements and prd authoring",
    lottie: "web animation",
    "markdown-token-optimizer": "context window management",
    "marketing-council": "marketing strategy",
    "marketing-ideas": "growth strategy",
    "marketing-loops": "workflow automation",
    "marketing-plan": "marketing strategy",
    "marketing-psychology": "marketing strategy",
    "mcp-builder": "agent tool building",
    "media-use": "video",
    mediabunny: "video",
    megacave: "text style transfer",
    "microsoft-foundry": "agent application building",
    "migrate-to-shoehorn": "code migration and modernization",
    migration: "code migration and modernization",
    "minimal-run-and-audit": "benchmark execution",
    "minimalist-ui": "design",
    "mobile-native": "styling and responsive layout",
    "motion-doctrine": "video editing",
    "motion-graphics": "video editing",
    "music-to-video": "video editing",
    "nano-banana-2": "text to image",
    "nano-banana-edit": "instructed image editing",
    "nextjs-on-cloudflare": "deployment orchestration",
    normalize: "design",
    "obsidian-vault": "note-taking",
    offers: "product marketing and gtm",
    onboard: "design",
    onboarding: "conversion optimization",
    "onboarding-cro": "conversion optimization",
    optimize: "code refactoring and optimization",
    "orbit-card": "video editing",
    overdrive: "web animation",
    "oversized-cursor": "video editing",
    "p-image": "text to image",
    "p-video": "text to video",
    "p-video-avatar": "talking avatar generation",
    "page-cro": "conversion optimization",
    "paid-ads": "paid ads management",
    "paper-context-resolver": "paper analysis",
    "paywall-upgrade-cro": "conversion optimization",
    paywalls: "conversion optimization",
    pdf: "pdf manipulation",
    "pick-ui-library": "frontend development",
    polish: "design",
    "popup-cro": "conversion optimization",
    popups: "conversion optimization",
    pptx: "presentation authoring",
    pr: "pull request management",
    "pr-to-video": "video editing",
    pricing: "product strategy",
    "pricing-strategy": "product strategy",
    "prisma-cli": "orm and data access",
    "prisma-client-api": "orm and data access",
    "prisma-compute": "deployment orchestration",
    "prisma-database-setup": "orm and data access",
    "prisma-driver-adapter-implementation": "orm and data access",
    "prisma-mongodb-upgrade": "code migration and modernization",
    "prisma-orm-setup": "orm and data access",
    "prisma-postgres": "relational database operations",
    "prisma-postgres-setup": "relational database operations",
    "prisma-upgrade-v7": "code migration and modernization",
    "product-hunt-launch": "product marketing and gtm",
    "product-launch-video": "ad creative production",
    "product-marketing": "product marketing and gtm",
    "product-marketing-context": "product marketing and gtm",
    "product-photography": "text to image",
    "programmatic-seo": "seo content optimization",
    prospecting: "lead generation",
    "public-relations": "marketing strategy",
    "python-appservice-deploy": "deployment orchestration",
    "python-executor": "script integration",
    qa: "issue tracking",
    quieter: "design",
    "receiving-code-review": "code review",
    "reddit-automation": "social content creation",
    "redesign-existing-projects": "design",
    "referral-program": "growth strategy",
    referrals: "growth strategy",
    relight: "instructed image editing",
    "remotion-best-practices": "video",
    "remotion-captions": "video editing",
    "remotion-create": "video",
    "remotion-docs": "document or database question answering",
    "remotion-interactivity": "video",
    "remotion-maps": "video",
    "remotion-markup": "video",
    "remotion-multimedia": "video",
    "remotion-render": "video",
    "remotion-saas": "full-stack development",
    "remotion-studio": "video",
    "remotion-to-hyperframes": "code migration and modernization",
    "remotion-upgrade": "dependency management",
    "remove-animations": "web animation",
    "repo-intake-and-plan": "code comprehension",
    "request-refactor-plan": "code refactoring and optimization",
    "requesting-code-review": "code review",
    research: "deep research",
    "resolving-merge-conflicts": "git workflow",
    retro: "postmortem authoring",
    review: "code review",
    "review-animations": "web animation",
    revops: "crm management",
    "run-train": "deep learning training",
    "runcomfy-cli": "script integration",
    "safe-debug": "root-cause debugging",
    "safe-refactor": "code refactoring and optimization",
    "sales-enablement": "sales enablement",
    "sandbox-migrate-to-next": "code migration and modernization",
    "sandbox-next": "containerization",
    "sandbox-sdk": "containerization",
    "sandbox-stable": "containerization",
    "scaffold-exercises": "project scaffolding",
    schema: "structured data markup",
    "schema-markup": "structured data markup",
    "seam-craft": "video editing",
    seedance: "text to video",
    "seedance-v2": "text to video",
    sensei: "agent tool building",
    "seo-audit": "seo auditing",
    "setup-matt-pocock-skills": "dev environment setup",
    "setup-pre-commit": "dev environment setup",
    "setup-ts-deep-modules": "static analysis and linting",
    shape: "design",
    signup: "conversion optimization",
    "signup-flow-cro": "conversion optimization",
    "site-architecture": "search engine optimization",
    "skill-authoring": "agent tool building",
    "skill-creator": "agent tool building",
    "slack-gif-creator": "image generation",
    slideshow: "presentation authoring",
    sms: "email marketing",
    social: "social media management",
    "social-content": "social content creation",
    "stitch-design-taste": "design",
    "storyboard-creation": "video",
    "subagent-driven-development": "agentic workflow orchestration",
    "surgical-patch": "root-cause debugging",
    "systematic-debugging": "root-cause debugging",
    tailwind: "styling and responsive layout",
    "talking-head-recut": "video editing",
    tdd: "test strategy and tdd",
    teach: "research and scholarship",
    "template-skill": "agent tool building",
    "test-driven-development": "test strategy and tdd",
    "theme-factory": "design",
    three: "web animation",
    "to-issues": "issue tracking",
    "to-prd": "requirements and prd authoring",
    "to-questionnaire": "reasoning and planning",
    "to-spec": "requirements and prd authoring",
    "to-tickets": "issue tracking",
    triage: "issue tracking",
    "turnstile-spin": "security hardening",
    "twitter-automation": "social media management",
    typegpu: "web animation",
    typeset: "design",
    "ubiquitous-language": "data modeling",
    ultracave: "text style transfer",
    "using-git-worktrees": "git workflow",
    "using-superpowers": "tool use planning",
    "vercel-cli-with-tokens": "deployment orchestration",
    "vercel-composition-patterns": "frontend development",
    "vercel-deploy": "deployment orchestration",
    "vercel-optimize": "cloud cost optimization",
    "vercel-react-best-practices": "code refactoring and optimization",
    "vercel-react-native-skills": "cross-platform mobile development",
    "vercel-react-view-transitions": "web animation",
    "verification-before-completion": "quality evaluation",
    "verify-and-stop": "software testing",
    video: "video",
    "video-ad-specs": "ad creative production",
    "video-edit": "video editing",
    "video-extend": "video editing",
    "video-inpainting": "video editing",
    "video-outpainting": "video editing",
    waapi: "web animation",
    "wait-what": "text paraphrasing",
    "wan-2-7": "text to video",
    wayfinder: "task decomposition",
    "web-artifacts-builder": "frontend development",
    "web-design-guidelines": "design",
    "web-perf": "code refactoring and optimization",
    "web-search": "web search research",
    "webapp-testing": "end-to-end and ui testing",
    "website-to-hyperframes": "video editing",
    "website-to-video": "video editing",
    "wireframe-portal-title": "video editing",
    wizard: "cli and terminal app development",
    "workers-best-practices": "serverless function development",
    "workers-profiling": "performance monitoring",
    wrangler: "deployment orchestration",
    "write-a-skill": "agent tool building",
    "write-swift": "native mobile development",
    "writing-beats": "content writing",
    "writing-for-agents": "technical writing",
    "writing-fragments": "content writing",
    "writing-great-skills": "agent tool building",
    "writing-guidelines": "copy editing",
    "writing-plans": "task decomposition",
    "writing-shape": "article and blog writing",
    "writing-skills": "agent tool building",
    "xcode-project-setup": "dependency management",
    xlsx: "spreadsheet authoring",
    "youtube-thumbnail-design": "image generation",
    "zoom-out": "code comprehension"
  }
};

// ../hook/src/skill-failure.ts
var MISSING_KEY = /\b(api[ _-]?key|access[ _-]?token|credentials?)\b.{0,40}\b(missing|not set|not found|required|invalid|expired)\b|(?<!\bnot )\b(missing|no|invalid|expired)\b.{0,20}\b(api[ _-]?key|access[ _-]?token|credentials?)\b|\b(HTTP|status)(\/[\d.]+| code)?[ :=]*(401|403)\b|\b(401|403) (unauthori[sz]ed|forbidden)\b|\bunauthori[sz]ed\b|not authenticated|not logged in/i;
var MISSING_KEY_VARIABLE = /\b[A-Z0-9_]*(API_KEY|TOKEN|SECRET)\b.{0,30}\b(not set|missing|required|unset)\b/;
var MISSING_PROGRAM = /command not found|executable file not found|\bnot installed\b|No module named|spawn \S+ ENOENT|Cannot find module/i;
var MISSING_FILE = /No such file or directory|\bENOENT\b|file not found|\b(file|path|directory|folder)\b(?!\.).{0,80}\bdoes not exist\b/i;
function failureReason(text) {
  if (MISSING_PROGRAM.test(text))
    return "missing-program";
  if (MISSING_KEY.test(text) || MISSING_KEY_VARIABLE.test(text))
    return "missing-key";
  if (MISSING_FILE.test(text))
    return "missing-file";
  return null;
}
var RUNNERS = new Set(["bash", "bun", "bunx", "node", "npx", "python", "python3", "sh", "uv", "uvx", "zsh"]);
function programsOf(command) {
  const found = [];
  for (const part of command.split(/&&|\|\||[;|\n]/)) {
    const words = part.trim().split(/\s+/).filter((word) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(word));
    const first2 = words[0];
    if (first2 === undefined || first2 === "")
      continue;
    const program = first2.split("/").pop() ?? first2;
    if (!RUNNERS.has(program)) {
      found.push(program);
      continue;
    }
    const target = words.slice(1).find((word) => !word.startsWith("-") && word !== "run");
    if (target !== undefined)
      found.push(target.split("/").pop() ?? target);
  }
  return found;
}
var escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function askedBySkill(command, markdown, directory) {
  if (new RegExp(`${escaped(directory)}(?=[/\\s'"]|$)`).test(command))
    return true;
  const { cli, runs } = readRequires(markdown);
  const named = new Set([...cli, ...runs]);
  return programsOf(command).some((program) => named.has(program) || program.includes(".") && new RegExp(`(?:^|[\\s\`'"/(])${escaped(program)}(?=[\\s\`'")]|$)`, "m").test(markdown));
}
var NODES = skill_nodes_13579_default.nodes;
var WORDS = { labels: NODES, aliases: domain_aliases_default.aliases };
var SKILL_NODE = skill_nodes_13579_default.skills;
function lastUserWords(transcript) {
  let words = "";
  for (const line of transcript.split(`
`)) {
    if (!line.includes('"user"'))
      continue;
    try {
      const entry = JSON.parse(line);
      if (entry.type !== "user" || entry.isMeta === true)
        continue;
      const content = entry.message?.content;
      const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((block) => block?.type === "text" && typeof block.text === "string" ? block.text : "").join(" ") : "";
      if (text.trim() !== "" && !text.trimStart().startsWith("<"))
        words = text;
    } catch {
      continue;
    }
  }
  return words;
}
function contextOf(words, skill, description) {
  return domainInText(words, WORDS) ?? SKILL_NODE[skill.split(":").pop() ?? skill] ?? null;
}
function answerOf(response) {
  const blocks = Array.isArray(response) ? response : typeof response === "object" && response !== null && Array.isArray(response.content) ? response.content : [response];
  for (const block of blocks) {
    const text = typeof block === "string" ? block : block?.text;
    if (typeof text !== "string")
      continue;
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null)
        return parsed;
    } catch {
      continue;
    }
  }
  return null;
}
var searchesPath = (cwd) => join3(dirname2(process.env["ARP_SESSION_LOG"] ?? join3(cwd, ".arp", "session.jsonl")), "searches.jsonl");
function recordSearch(call, cwd) {
  if (call.session === null)
    return;
  const answer = answerOf(call.response);
  if (answer === null || !Array.isArray(answer["skills"]))
    return;
  const domain = typeof answer["domain"] === "string" && NODES.includes(answer["domain"]) ? answer["domain"] : null;
  const skills = answer["skills"].flatMap((row) => typeof row?.name === "string" && typeof row.source === "string" ? [{ name: row.name, source: row.source }] : []);
  if (skills.length === 0)
    return;
  try {
    const path = searchesPath(cwd);
    mkdirSync2(dirname2(path), { recursive: true });
    appendOwn(path, `${JSON.stringify({ session: call.session, domain, skills })}
`);
  } catch {}
}
function foundBySearch(cwd, session, skill) {
  const path = searchesPath(cwd);
  if (!existsSync(path))
    return null;
  const name = skill.split(":").pop() ?? skill;
  let found = null;
  for (const line of readFileSync2(path, "utf8").split(`
`)) {
    try {
      const row = JSON.parse(line);
      if (row.session !== session)
        continue;
      const hit = row.skills?.find((entry) => entry.name === name);
      if (hit !== undefined)
        found = { domain: typeof row.domain === "string" ? row.domain : null, source: hit.source };
    } catch {
      continue;
    }
  }
  return found;
}
var readIfThere = (path) => existsSync(path) ? readFileSync2(path, "utf8") : null;
function installedSource(name, cwd) {
  const known = [
    ...installedFromSkillLock(readIfThere(join3(homedir2(), ".agents", ".skill-lock.json"))),
    ...installedFromReceipts(readIfThere(join3(arpHome(), "receipts.jsonl"))),
    ...installedFromReceipts(readIfThere(join3(cwd, ".arp", "receipts.jsonl")))
  ];
  const sources = new Set(known.filter((entry) => entry.skill === name).map((entry) => entry.source));
  return sources.size === 1 ? [...sources][0] ?? null : null;
}
function skillsOfSession(log, session) {
  if (!existsSync(log))
    return [];
  const skills = [];
  for (const line of readFileSync2(log, "utf8").split(`
`)) {
    try {
      const row = JSON.parse(line);
      if (row["kind"] === "skill" && row["session"] === session && typeof row["name"] === "string") {
        skills.unshift({
          name: row["name"],
          source: typeof row["source"] === "string" ? row["source"] : null
        });
      }
    } catch {}
  }
  return skills;
}
function skillDirectory(name, cwd) {
  const roots = [join3(cwd, ".claude", "skills"), join3(homedir2(), ".claude", "skills")];
  const given = process.env["ARP_SKILLS_DIR"];
  if (given !== undefined && given !== "")
    roots.unshift(given);
  return roots.map((root) => join3(root, name)).find((dir) => existsSync(join3(dir, "SKILL.md"))) ?? null;
}
function arpHome() {
  const given = process.env["ARP_HOME"]?.trim();
  return given !== undefined && given !== "" ? given : join3(homedir2(), ".arp");
}
function appendFailure(line) {
  const path = join3(arpHome(), "failures.jsonl");
  const seen = existsSync(path) ? readFileSync2(path, "utf8") : "";
  const key = `"session":${JSON.stringify(line.session)},"skill":${JSON.stringify(line.skill)},`;
  if (seen.split(`
`).some((row) => row.includes(key) && row.includes(`"reason":"${line.reason}"`)))
    return false;
  mkdirSync2(dirname2(path), { recursive: true });
  appendOwn(path, `${JSON.stringify(line)}
`);
  return true;
}
function recordSkillFailure(call, cwd) {
  const classified = classifyCall(call);
  if (classified === null || classified.outcome === "ok" || call.session === null)
    return;
  const command = call.input?.["command"];
  if (typeof command !== "string")
    return;
  const reason = failureReason(failureText(call));
  if (reason === null)
    return;
  try {
    const log = process.env["ARP_SESSION_LOG"] ?? join3(cwd, ".arp", "session.jsonl");
    for (const skill of skillsOfSession(log, call.session)) {
      const directory = skillDirectory(skill.name, cwd);
      if (directory === null)
        continue;
      const markdown = readFileSync2(join3(directory, "SKILL.md"), "utf8");
      if (!askedBySkill(command, markdown, directory))
        continue;
      const search = foundBySearch(cwd, call.session, skill.name);
      const words = call.transcript !== null && existsSync(call.transcript) ? lastUserWords(readFileSync2(call.transcript, "utf8")) : "";
      const domain = search?.domain ?? contextOf(words, skill.name, readRequires(markdown).description);
      appendFailure({
        at: new Date().toISOString(),
        session: call.session,
        skill: skill.name,
        source: skill.source ?? search?.source ?? installedSource(skill.name.split(":").pop() ?? skill.name, cwd),
        ...domain === null ? {} : { domain },
        reason
      });
      return;
    }
  } catch {}
}

// ../hook/src/hook.ts
function fetchedRefs(cwd) {
  const path = process.env["ARP_RECEIPTS"] ?? join4(cwd, ".arp", "receipts.jsonl");
  if (!existsSync2(path))
    return [];
  let text;
  try {
    text = readFileSync3(path, "utf8");
  } catch {
    return [];
  }
  const rows = [];
  for (const line of text.split(`
`)) {
    if (line.trim().length === 0)
      continue;
    try {
      const row = JSON.parse(line);
      if (typeof row.skill !== "string" || typeof row.atom !== "string")
        continue;
      rows.push({
        skill: row.skill,
        atom: row.atom,
        url: typeof row.url === "string" ? row.url : "",
        at: typeof row.at === "string" ? row.at : ""
      });
    } catch {
      continue;
    }
  }
  return rows;
}
function responseOf(call, outcome) {
  if (!call.hasResponse)
    return null;
  const raw = call.response;
  let bytes = 0;
  try {
    bytes = typeof raw === "string" ? raw.length : JSON.stringify(raw)?.length ?? 0;
  } catch {
    bytes = 0;
  }
  return { answered: raw !== null, bytes, failed: outcome !== "ok" };
}
function readString(from, key) {
  const value = from?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
function serverRef(server, cwd) {
  const url = serverUrlOf(readMcpServers({ cwd }).get(server));
  if (url === null)
    return null;
  try {
    return normaliseToolUrl(url);
  } catch {
    return null;
  }
}
function whatOf(call, cwd, fetched) {
  if (call.tool === "Skill") {
    const name = readString(call.input, "skill");
    if (name === null)
      return null;
    const source = readString(call.input, "source");
    return {
      kind: "skill",
      name,
      source,
      ref: readString(call.input, "atom_id") ?? readString(call.input, "tool_atom_id") ?? readString(call.input, "url") ?? refForInvocation(name, source, fetched())
    };
  }
  const mcp = /^mcp__([^_]+(?:_[^_]+)*?)__/.exec(call.tool);
  if (mcp?.[1] !== undefined) {
    return { kind: "mcp", name: mcp[1], source: null, ref: serverRef(mcp[1], cwd) };
  }
  return null;
}
var raw = "";
for await (const chunk of process.stdin)
  raw += chunk;
var parsed;
try {
  parsed = JSON.parse(raw);
} catch {
  process.exit(0);
}
if (process.argv.includes("--capture"))
  capture(parsed, join4(homedir3(), ".arp", "captures"));
var call = toolCallOf(parsed);
if (call === null)
  process.exit(0);
var cwd = call.cwd ?? process.cwd();
if (call.tool === "Bash") {
  recordSkillFailure(call, cwd);
  process.exit(0);
}
if (call.tool.endsWith("__arp_pulse"))
  recordSearch(call, cwd);
var what = whatOf(call, cwd, () => fetchedRefs(cwd));
if (what === null)
  process.exit(0);
var classified = classifyCall(call);
if (classified === null)
  process.exit(0);
var own = join4(cwd, ".arp");
var path = process.env["ARP_SESSION_LOG"] ?? join4(own, "session.jsonl");
var line = {
  at: new Date().toISOString(),
  session: call.session,
  call: call.id,
  format: call.format,
  ...what,
  outcome: classified.outcome,
  code: classified.code,
  ms: call.ms,
  response: responseOf(call, classified.outcome)
};
try {
  mkdirSync3(dirname3(path), { recursive: true });
  if (dirname3(path) === own && lstatSync2(own).isSymbolicLink())
    throw new Error(`${own} is a symbolic link`);
  const ignore = join4(own, ".gitignore");
  if (dirname3(path) === own && !existsSync2(ignore))
    writeFileSync2(ignore, `*
`, { flag: "wx" });
  appendOwn(path, `${JSON.stringify(line)}
`);
} catch {}
