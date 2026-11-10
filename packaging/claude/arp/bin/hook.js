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
import { existsSync as existsSync3, lstatSync as lstatSync2, mkdirSync as mkdirSync4, readFileSync as readFileSync4, writeFileSync as writeFileSync2 } from "node:fs";
import { homedir as homedir3 } from "node:os";
import { dirname as dirname4, join as join5 } from "node:path";
// ../../packages/graphql/dist/http.js
var DEFAULT_TIMEOUT_MS = 1e4;
var DEFAULT_MAX_BODY_BYTES = 8 * 1024 * 1024;

class HttpError extends Error {
  kind;
  timeoutMs;
  constructor(kind, message, timeoutMs, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "HttpError";
    this.kind = kind;
    this.timeoutMs = timeoutMs;
  }
}
async function readBodyText(response, options = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
  const timeoutMs = options.timeoutMs ?? 0;
  const body = response.body;
  if (body === null)
    return "";
  const reader = body.getReader();
  const signal = options.signal;
  let onAbort = null;
  const aborted = signal === undefined ? null : new Promise((_, reject) => {
    const fire = () => reject(new HttpError("timeout", `timed out after ${timeoutMs}ms reading the body`, timeoutMs));
    onAbort = fire;
    if (signal.aborted)
      fire();
    else
      signal.addEventListener("abort", fire, { once: true });
  });
  aborted?.catch(() => {
    return;
  });
  const decoder = new TextDecoder;
  let total = 0;
  let text = "";
  try {
    for (;; ) {
      const chunk = await (aborted === null ? reader.read() : Promise.race([reader.read(), aborted]));
      if (chunk.done)
        break;
      total += chunk.value.byteLength;
      if (total > maxBytes) {
        throw new HttpError("too-large", `body exceeds ${maxBytes} bytes`, timeoutMs);
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    reader.cancel().catch(() => {
      return;
    });
    if (error instanceof HttpError)
      throw error;
    throw new HttpError("network", error instanceof Error ? error.message : String(error), timeoutMs, error);
  } finally {
    if (signal !== undefined && onAbort !== null)
      signal.removeEventListener("abort", onAbort);
  }
}
async function fetchTextWithTimeout(fetchImpl, url, init, options) {
  const { timeoutMs } = options;
  const controller = new AbortController;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response;
    try {
      response = await fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new HttpError("timeout", `timed out after ${timeoutMs}ms: ${url}`, timeoutMs);
      }
      throw new HttpError("network", error instanceof Error ? error.message : String(error), timeoutMs, error);
    }
    const text = await readBodyText(response, {
      signal: controller.signal,
      timeoutMs,
      ...options.maxBytes === undefined ? {} : { maxBytes: options.maxBytes }
    });
    return { response, text };
  } finally {
    clearTimeout(timer);
  }
}
function defaultFetch() {
  if (typeof globalThis.fetch !== "function") {
    throw new TypeError("no global fetch available — pass one via createErc8004Client({fetch})");
  }
  return (input, init) => globalThis.fetch(input, init);
}
// ../../packages/graphql/dist/json.js
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readRecord(source, key) {
  if (!isRecord(source))
    return null;
  const child = source[key];
  return isRecord(child) ? child : null;
}
function readString(source, key) {
  if (!isRecord(source))
    return null;
  const value = source[key];
  return typeof value === "string" ? value : null;
}
function readArray(source, key) {
  if (!isRecord(source))
    return [];
  const value = source[key];
  return Array.isArray(value) ? value : [];
}
// ../../packages/graphql/dist/client.js
class GraphqlError extends Error {
  url;
  httpStatus;
  constructor(message, url, httpStatus, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "GraphqlError";
    this.url = url;
    this.httpStatus = httpStatus;
  }
}
function createGraphqlTransport(config) {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return {
    async request(query, variables, options) {
      let response;
      let text;
      try {
        ({ response, text } = await fetchTextWithTimeout(config.fetch, config.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({ query, variables })
        }, {
          timeoutMs: options?.timeoutMs ?? timeoutMs,
          ...config.maxBodyBytes === undefined ? {} : { maxBytes: config.maxBodyBytes }
        }));
      } catch (error) {
        const message = error instanceof HttpError ? error.message : String(error);
        throw new GraphqlError(message, config.url, null, error);
      }
      if (!response.ok) {
        throw new GraphqlError(`HTTP ${response.status} ${response.statusText}`, config.url, response.status);
      }
      let body = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
      if (!isRecord(body)) {
        throw new GraphqlError("response body is not a JSON object", config.url, 200);
      }
      const errors = readArray(body, "errors");
      if (errors.length > 0) {
        const messages = errors.map((entry) => readString(entry, "message") ?? "unknown error").join("; ");
        throw new GraphqlError(messages, config.url, 200);
      }
      const data = body["data"];
      if (!isRecord(data)) {
        throw new GraphqlError("response carries no data object", config.url, 200);
      }
      return data;
    }
  };
}
// ../../packages/graphql/dist/queries/agent.js
var THING = `value { thing { name description image url } }`;
var MARKET_SIDE = `
    total_market_cap
    total_assets
    vaults(where: {curve_id: {_eq: $curveId}}, limit: 1) {
      market_cap
      total_assets
      total_shares
      current_share_price
      position_count
    }`;
var RESOLVE_AGENT_QUERY = `
query ResolveAgentByCaip($sameAsPredicateId: String!, $caipId: String!) {
  triples(
    where: {
      predicate_id: {_eq: $sameAsPredicateId}
      object: {value: {thing: {name: {_eq: $caipId}}}}
    }
    limit: 2
  ) {
    subject { term_id label data ${THING} }
  }
}`;
var TRUST_SURFACE_QUERY = `
query AgentTrustSurface($subjectId: String!, $predicateIds: [String!], $curveId: numeric!, $limit: Int!) {
  triples(
    where: {subject_id: {_eq: $subjectId}, predicate_id: {_in: $predicateIds}}
    order_by: {term: {total_market_cap: desc}}
    limit: $limit
  ) {
    term_id
    predicate { term_id label }
    object { term_id label data ${THING} }
    term {${MARKET_SIDE}
    }
    counter_term {${MARKET_SIDE}
    }
  }
}`;
var CAPABILITIES_QUERY = `
query AgentCapabilities($subjectId: String!, $predicateIds: [String!], $limit: Int!) {
  triples(
    where: {subject_id: {_eq: $subjectId}, predicate_id: {_in: $predicateIds}}
    order_by: {term_id: asc}
    limit: $limit
  ) {
    term_id
    predicate { term_id label }
    object { term_id label ${THING} }
  }
}`;
var IDENTITY_SAMPLE_LIMIT = 4;
var CAPABILITY_SAMPLE_LIMIT = 8;
var COHORT_QUERY = `
query AgentCohort($where: triples_bool_exp!, $sameAsPredicateId: String!, $capabilityPredicateIds: [String!], $orderBy: [triples_order_by!]!, $limit: Int!, $offset: Int!) {
  total: triples_aggregate(
    where: $where
  ) {
    aggregate { count }
  }
  triples(
    where: $where
    order_by: $orderBy
    limit: $limit
    offset: $offset
  ) {
    subject {
      term_id
      label
      ${THING}
      as_subject_triples_aggregate { aggregate { count } }
      term {
        total_market_cap
        vaults_aggregate { aggregate { count sum { position_count } } }
      }
      identityCount: as_subject_triples_aggregate(
        where: {predicate_id: {_eq: $sameAsPredicateId}}
      ) {
        aggregate { count }
      }
      identity: as_subject_triples(
        where: {predicate_id: {_eq: $sameAsPredicateId}}
        limit: ${IDENTITY_SAMPLE_LIMIT}
      ) {
        object { label ${THING} }
      }
      capabilities: as_subject_triples(
        where: {predicate_id: {_in: $capabilityPredicateIds}}
        limit: ${CAPABILITY_SAMPLE_LIMIT}
      ) {
        predicate_id
        object { term_id label }
      }
    }
  }
}`;
// ../../packages/graphql/dist/queries/atom-standing.js
var VAULT_SIDE = `
    total_market_cap
    total_assets
    vaults(where: {curve_id: {_eq: $curveId}}, limit: 1) {
      market_cap
      total_assets
      total_shares
      current_share_price
      position_count
    }`;
var ATOM_STANDING_QUERY = `
query AtomStanding($atomId: String!, $curveId: numeric!, $limit: Int!, $attestor: [String!]!) {
  atom: atoms(where: {term_id: {_eq: $atomId}}, limit: 1) {
    term_id
    label
    data
    type
    value { thing { url } }
    term { ${VAULT_SIDE} }
  }
  triples(
    where: {object_id: {_eq: $atomId}}
    order_by: {term: {total_assets: desc}}
    limit: $limit
  ) {
    term_id
    predicate { term_id label }
    subject { term_id label type }
    term { ${VAULT_SIDE} }
    counter_term { ${VAULT_SIDE} }
  }
  claims: triples(
    where: {subject_id: {_eq: $atomId}}
    order_by: {term: {total_assets: desc}}
    limit: $limit
  ) {
    term_id
    predicate { term_id label }
    object { term_id label type }
    term {
      ${VAULT_SIDE}
      vaults(where: {curve_id: {_eq: $curveId}}, limit: 1) {
        positions(where: {account_id: {_in: $attestor}, shares: {_gt: "0"}}, limit: 1) { shares }
      }
    }
  }
}`;
var LISTED_CAPABILITIES_FOR_QUERY = `query ListedCapabilitiesFor($subject: String!, $predicates: [String!]) {
  atoms(where: {term_id: {_eq: $subject}}, limit: 1) {
    capabilities: as_subject_triples(
      where: {predicate_id: {_in: $predicates}}
      limit: ${CAPABILITY_SAMPLE_LIMIT}
    ) { object { term_id } }
  }
}`;
// ../../packages/graphql/dist/queries/tool-listing.js
function toolListingQuery(sponsored) {
  const variables = sponsored ? "$uses: String!, $sameAs: String!, $curveId: numeric!, $limit: Int!, $sponsor: String!" : "$uses: String!, $sameAs: String!, $curveId: numeric!, $limit: Int!";
  const sponsoredCount = sponsored ? `
      sponsored: deposits_aggregate(where: {sender_id: {_ilike: $sponsor}, receiver_id: {_nilike: $sponsor}}) { aggregate { count } }` : "";
  return `
query ToolListing(${variables}) {
  triples(
    where: {
      predicate_id: {_eq: $uses}
      subject: {as_subject_triples: {predicate_id: {_eq: $sameAs}}}
    }
    limit: $limit
  ) {
    term_id
    subject_id
    object {
      term_id
      label
      data
      type
      value { thing { url } }
    }
    term {
      total_assets
      vaults(where: {curve_id: {_eq: $curveId}}, limit: 1) { position_count total_assets }
      deposits: deposits_aggregate { aggregate { count } }${sponsoredCount}
    }
    counter_term {
      total_assets
      vaults(where: {curve_id: {_eq: $curveId}}, limit: 1) { position_count total_assets }
    }
  }
}`;
}
var TOOL_LISTING_QUERY = toolListingQuery(false);
var TOOL_LISTING_SPONSORED_QUERY = toolListingQuery(true);
// ../../packages/graphql/dist/queries/pulse-usage.js
var PULSE_USES_QUERY = `query PulseUses($tools: [String!]!, $uses: String!, $limit: Int!) {
    triples(where: {object_id: {_in: $tools}, predicate_id: {_eq: $uses}}, limit: $limit) {
        term_id
        object_id
        creator_id
        created_at
        subject {
            term_id
            label
        }
        positions(where: {shares: {_gt: "0"}}) {
            account_id
        }
    }
}`;
var PULSE_QUALIFIERS_QUERY = `query PulseQualifiers($edges: [String!]!, $predicates: [String!]!, $writers: [String!]!, $limit: Int!) {
    triples(where: {subject_id: {_in: $edges}, predicate_id: {_in: $predicates}}, limit: $limit) {
        term_id
        subject_id
        predicate_id
        creator_id
        created_at
        object {
            label
        }
        positions(where: {shares: {_gt: "0"}, account_id: {_in: $writers}}) {
            account_id
        }
    }
}`;
var PULSE_ATOMS_QUERY = `query PulseAtoms($uris: [String!]!, $limit: Int!) {
    atoms(where: {data: {_in: $uris}}, limit: $limit) {
        term_id
        data
    }
}`;
// ../../packages/graphql/dist/queries/tool-usage.js
var VAULT_SIDE2 = `
    total_market_cap
    total_assets
    vaults(where: {curve_id: {_eq: $curveId}}, limit: 1) {
      market_cap
      total_assets
      total_shares
      current_share_price
      position_count
    }`;
var TOOL_USAGE_QUERY = `
query ToolUsage($toolId: String!, $uses: String!, $curveId: numeric!) {
  tool: atoms(where: {term_id: {_eq: $toolId}}, limit: 1) {
    term_id
    label
    data
  }
  triples(where: {predicate_id: {_eq: $uses}, object_id: {_eq: $toolId}}, limit: 200) {
    term_id
    subject {
      term_id
      label
      type
    }
    term { ${VAULT_SIDE2} }
    counter_term { ${VAULT_SIDE2} }
  }
}`;
var ATTESTED_TOOL_USAGE_QUERY = `
query AttestedToolUsage($toolId: String!, $uses: String!, $curveId: numeric!, $attestor: String!) {
  tool: atoms(where: {term_id: {_eq: $toolId}}, limit: 1) {
    term_id
    label
    data
  }
  triples(where: {
    predicate_id: {_eq: $uses},
    object_id: {_eq: $toolId},
    term: {positions: {account_id: {_eq: $attestor}}}
  }, limit: 200) {
    term_id
    subject {
      term_id
      label
      type
    }
    term { ${VAULT_SIDE2} }
    counter_term { ${VAULT_SIDE2} }
  }
}`;
// ../../packages/graphql/dist/queries/x402-feed.js
var LEVEL = `term_id
        subject_id
        predicate_id
        creator_id
        created_at
        subject {
            term_id
            label
        }
        object {
            term_id
            label
            data
            value {
                thing {
                    url
                }
            }
        }
        positions(where: {shares: {_gt: "0"}}) {
            account_id
        }`;
var X402_PAYMENT_LEVELS_QUERY = `query X402PaymentLevels($paidWith: String!, $limit: Int!, $offset: Int!) {
    triples(where: {predicate_id: {_eq: $paidWith}}, order_by: {term_id: asc}, limit: $limit, offset: $offset) {
        ${LEVEL}
    }
}`;
var X402_LEVELS_BY_ID_QUERY = `query X402LevelsById($ids: [String!]!, $limit: Int!) {
    triples(where: {term_id: {_in: $ids}}, limit: $limit) {
        ${LEVEL}
    }
}`;
var X402_REASONS_QUERY = `query X402Reasons($ids: [String!]!, $because: String!, $limit: Int!) {
    triples(where: {subject_id: {_in: $ids}, predicate_id: {_eq: $because}}, order_by: {term_id: asc}, limit: $limit) {
        ${LEVEL}
    }
}`;
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
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function failureText(call) {
  const parts = [];
  const push = (value) => {
    if (typeof value === "string")
      parts.push(value);
    else if (isRecord2(value)) {
      for (const key of ["error", "message", "reason"]) {
        const text = value[key];
        if (typeof text === "string")
          parts.push(text);
      }
      if (Array.isArray(value.content)) {
        for (const item of value.content) {
          if (isRecord2(item) && typeof item.text === "string")
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
  if (!isRecord2(call.response))
    return null;
  for (const key of ["status", "statusCode", "status_code"]) {
    const value = call.response[key];
    if (typeof value === "number" && Number.isInteger(value))
      return value;
  }
  return null;
}
function flaggedError(response) {
  return isRecord2(response) && (response.isError === true || response.is_error === true);
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
function isRecord3(value) {
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
  if (!isRecord3(raw))
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
  if (!isRecord3(servers))
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
  if (isRecord3(user)) {
    collect(servers, user.mcpServers);
    if (isRecord3(user.projects)) {
      const project = user.projects[cwd];
      if (isRecord3(project))
        collect(servers, project.mcpServers);
    }
  }
  const shared = readJson(join(cwd, ".mcp.json"));
  if (isRecord3(shared))
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
function isRecord4(value) {
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
function eventOf(raw) {
  if (!isRecord4(raw))
    return null;
  return str(first(raw, ["hook_event_name", "hookEventName"]));
}
function toolCallOf(raw) {
  if (!isRecord4(raw))
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
    input: isRecord4(input) ? input : undefined,
    hasResponse,
    response: hasResponse ? first(raw, responseKeys) : undefined,
    error: str(raw.error),
    interrupted: (camel ? first(raw, ["isInterrupt", "is_interrupt"]) : raw.is_interrupt) === true,
    ms: ms(camel ? first(raw, ["durationMs", "duration_ms"]) : raw.duration_ms),
    cwd: str(raw.cwd),
    transcript: str(raw.transcript_path)
  };
}

// ../../packages/protocol/src/content-path.ts
function skillRefFromUrl3(url) {
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
function directoryOf2(path) {
  const parts = path.split("/");
  return parts.length < 2 ? "" : parts[parts.length - 2] ?? "";
}
function skillFilesIn2(listing) {
  return listing.filter((file) => (file.path.split("/").pop() ?? "").toLowerCase() === "skill.md");
}

// ../../packages/protocol/src/skill-requires.ts
var LOGIN2 = /\b(auth login|log ?in|sign ?up|api[ _-]?key|access token)\b/i;
function frontmatter2(markdown) {
  const lines = markdown.split(`
`);
  if (lines[0]?.trim() !== "---")
    return { lines: [], bodyStart: 0 };
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  return end === -1 ? { lines: [], bodyStart: 0 } : { lines: lines.slice(1, end), bodyStart: end + 1 };
}
function unquote2(value) {
  return value.trim().replace(/^["']|["']$/g, "");
}
function declaredBins2(lines) {
  const at = lines.findIndex((line) => /^\s*bins\s*:/.test(line));
  if (at === -1)
    return [];
  const inline = lines[at]?.split(":").slice(1).join(":").trim() ?? "";
  if (inline.startsWith("[")) {
    return inline.replace(/^\[|\]$/g, "").split(",").map(unquote2).filter((name) => name.length > 0);
  }
  const out = [];
  for (const line of lines.slice(at + 1)) {
    const item = /^\s*-\s*(.+)$/.exec(line);
    if (item === null)
      break;
    out.push(unquote2(item[1] ?? ""));
  }
  return out.filter((name) => name.length > 0);
}
function bashTools2(lines) {
  const line = lines.find((candidate) => /^\s*allowed-tools\s*:/.test(candidate));
  if (line === undefined)
    return [];
  return [...line.matchAll(/Bash\(\s*([A-Za-z0-9._-]+)/g)].map((match) => match[1] ?? "").filter((name) => name.length > 0);
}
function declaredDescription2(lines) {
  const at = lines.findIndex((line) => /^description\s*:/.test(line));
  if (at === -1)
    return null;
  const inline = lines[at]?.split(":").slice(1).join(":").trim() ?? "";
  if (inline !== "" && !/^[>|][-+]?$/.test(inline))
    return unquote2(inline) || null;
  const block = [];
  for (const line of lines.slice(at + 1)) {
    if (!/^\s+\S/.test(line))
      break;
    block.push(line.trim());
  }
  return block.length === 0 ? null : block.join(" ");
}
var COMMON2 = new Set(("awk bash break bun case cat cd chmod command continue cp curl cut date diff do done echo else end env " + "esac exit export false fi find for function git grep head if kill ln local ls mkdir mv node npm npx open pip pip3 pnpm printf pwd " + "python python3 read return rm sed set sh shift sleep sort source sudo tail tar tee test then time " + "touch tr true uniq unset unzip wait wc wget which while xargs yarn zip").split(" "));
var INSTALL2 = /\b(?:npm\s+(?:i|install)\s+(?:-g|--global)|pnpm\s+add\s+-g|yarn\s+global\s+add|brew\s+install|pipx\s+install|pip3?\s+install|cargo\s+install)\s+([@a-z0-9][@\w./-]*)/i;
var PROBE2 = /\b(?:command\s+-v|which)\s+([a-z][\w-]*)/i;
var COMMAND2 = /^[a-z][a-z0-9_-]*$/;
function commandsIn2(shell, explicitOnly) {
  const found = [];
  for (const segment of shell.split(/&&|\|\||[|;]/)) {
    const line = segment.trim().replace(/^\$\s+/, "");
    if (line === "" || line.startsWith("#"))
      continue;
    const named = INSTALL2.exec(line)?.[1] ?? PROBE2.exec(line)?.[1];
    if (named !== undefined) {
      found.push(named);
      continue;
    }
    if (explicitOnly)
      continue;
    const words = line.split(/\s+/).filter((word) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(word));
    const first2 = words[0] === "sudo" ? words[1] : words[0];
    if (first2 === undefined || !COMMAND2.test(first2))
      continue;
    found.push(first2);
  }
  return found;
}
var SHELL_FENCE2 = /^(sh|bash|shell|zsh|console|terminal)$/i;
function shellLinesRun2(lines) {
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
function commandsRun2(body, declared) {
  const found = [];
  let fence = null;
  let fenced = [];
  for (const line of body) {
    const marker = /^\s*(?:```|~~~)\s*([\w-]*)/.exec(line);
    if (marker !== null) {
      if (fence === "shell") {
        for (const run of shellLinesRun2(fenced))
          found.push(...commandsIn2(run, false));
      }
      fenced = [];
      fence = fence !== null ? null : SHELL_FENCE2.test(marker[1] ?? "") ? "shell" : "other";
      continue;
    }
    if (fence !== null) {
      fenced.push(line);
      continue;
    }
    for (const inline of line.matchAll(/`([^`]+)`/g))
      found.push(...commandsIn2(inline[1] ?? "", true));
  }
  return [...new Set(found)].filter((name) => !COMMON2.has(name) && !declared.includes(name));
}
function requiresLine2(lines) {
  const name = lines.map((line) => /^\s*requires\s*:\s*(\S+)\s*$/.exec(line)?.[1]).find(Boolean);
  return name === undefined ? [] : [unquote2(name)];
}
function readRequires2(markdown) {
  const { lines, bodyStart } = frontmatter2(markdown);
  const cli = [...new Set([...declaredBins2(lines), ...bashTools2(lines), ...requiresLine2(lines)])];
  const description = declaredDescription2(lines);
  const body = markdown.split(`
`);
  const runs = commandsRun2(body.slice(bodyStart), cli);
  for (let index = bodyStart;index < body.length; index += 1) {
    const text = body[index] ?? "";
    if (LOGIN2.test(text)) {
      return { cli, runs, login: { line: index + 1, text: text.trim().slice(0, 160) }, description };
    }
  }
  return { cli, runs, login: null, description };
}

// ../../packages/protocol/src/skill-contents.ts
var CONTENTS_LIMITS2 = {
  files: 200,
  fileChars: 512 * 1024,
  items: 40,
  lineChars: 160
};
var SCRIPT = /\.(sh|bash|zsh|py|js|mjs|cjs|ts|rb|pl|ps1|php|lua)$/i;
var MARKDOWN = /\.(md|mdx|markdown)$/i;
var FENCE = /^\s*(?:```|~~~)/;
function cap(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > CONTENTS_LIMITS2.lineChars ? `${flat.slice(0, CONTENTS_LIMITS2.lineChars - 1)}…` : flat;
}
function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
var BASE_SHELLS = new Set(["sh", "bash", "zsh", "dash"]);
function interpreterOf(firstLine) {
  const match = /^#!\s*(\S+)(?:\s+(?:-\S+\s+)*(\S+))?/.exec(firstLine);
  if (match === null)
    return null;
  const binary = match[1]?.split("/").pop() ?? "";
  const name = binary === "env" ? match[2] ?? "" : binary;
  return /^[a-z][\w.-]*$/i.test(name) && !BASE_SHELLS.has(name) ? name : null;
}
var SCRIPT_PROBE = /(?:^|[;&|(!{]|\bif|\bthen|\$\()\s*(?:!\s*)?(?:command\s+-v|which|type\s+-p|hash)\s+([a-z][\w.+-]*)/g;
var SYSTEM_INSTALL = /\b(?:brew|apt-get|apt|dnf|yum|apk|pacman|choco|winget|scoop|port)\s+(?:install|add|-S)\s+(?:-\S+\s+)*([a-z][\w.+-]*)/g;
var COMMENT_LINE = /^\s*(?:#|\/\/|\*|--|;|rem\s)/i;
var PYTHON_PROBE = /\bshutil\.which\(\s*["']([a-z][\w.+-]*)["']/g;
function programsInScriptLine(line, shell) {
  if (COMMENT_LINE.test(line))
    return [];
  const matches = shell ? [...line.matchAll(SCRIPT_PROBE), ...line.matchAll(SYSTEM_INSTALL)] : [...line.matchAll(PYTHON_PROBE)];
  return matches.map((match) => match[1] ?? "").filter((name) => name !== "");
}
var PACKAGE_INSTALL = /\b(pip3?|pipx|uv\s+pip|uv\s+add|poetry\s+add|npm|pnpm|yarn|bun|gem|cargo)\s+(?:install|add|i)\b([^\n|;&#`)]*)/gi;
function packagesIn(line) {
  const out = [];
  for (const match of line.matchAll(PACKAGE_INSTALL)) {
    const manager = (match[1] ?? "").replace(/\s+/g, " ").toLowerCase();
    for (const raw of (match[2] ?? "").trim().split(/\s+/)) {
      const word = raw.replace(/^["']|["']$/g, "");
      if (word === "" || word.startsWith("-") || word.startsWith(".") || /[:\\<>{}$]/.test(word))
        continue;
      if (/\.(txt|toml|json|cfg|lock|whl|tgz|tar\.gz|zip)$/i.test(word))
        continue;
      const name = word.replace(/[=<>!~[].*$/, "");
      if (/^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(@[\w.^~-]+)?$/i.test(name))
        out.push({ manager, name });
    }
  }
  return out;
}
function requirementsIn(text) {
  return text.split(`
`).map((line) => line.replace(/#.*/, "").trim()).filter((line) => line !== "" && !line.startsWith("-") && !/^(https?|git\+)/.test(line)).map((line) => /^[A-Za-z0-9][\w.-]*/.exec(line)?.[0] ?? "").filter((name) => name !== "");
}
var SHELL_VARIABLES = new Set(("HOME PATH PWD OLDPWD USER LOGNAME SHELL TERM LANG LC_ALL TMPDIR TMP TEMP HOSTNAME IFS PS1 PS2 " + "RANDOM SECONDS LINENO BASH_SOURCE BASH_VERSION FUNCNAME PIPESTATUS OPTARG OPTIND EUID UID PPID " + "REPLY EDITOR VISUAL PAGER DISPLAY XDG_CONFIG_HOME XDG_DATA_HOME XDG_CACHE_HOME CI NODE_ENV DEBUG").split(" "));
var READS_IN_CODE = [
  /\bprocess\.env\.([A-Z][A-Z0-9_]+)/g,
  /\bprocess\.env\[\s*["']([A-Z][A-Z0-9_]+)["']\s*\]/g,
  /\bBun\.env\.([A-Z][A-Z0-9_]+)/g,
  /\bDeno\.env\.get\(\s*["']([A-Z][A-Z0-9_]+)["']/g,
  /\bimport\.meta\.env\.([A-Z][A-Z0-9_]+)/g,
  /\bos\.environ\[\s*["']([A-Z][A-Z0-9_]+)["']\s*\]/g,
  /\b(?:os\.environ\.get|os\.getenv|getenv|environ\.get)\(\s*["']([A-Z][A-Z0-9_]+)["']/g,
  /\bENV(?:\.fetch\(|\[)\s*["']([A-Z][A-Z0-9_]+)["']/g,
  /\$env:([A-Za-z][A-Za-z0-9_]+)/g
];
var SHELL_READ = /\$\{?([A-Z][A-Z0-9_]{2,})\b/g;
var SHELL_ASSIGN = /^\s*(?:export\s+|local\s+|readonly\s+|declare\s+(?:-\w+\s+)?)?([A-Z][A-Z0-9_]*)=/;
var SHELL_LOOP = /\b(?:for|read(?:\s+-\w+)*)\s+([A-Z][A-Z0-9_]*)\b/g;
var EXPORT_IN_PROSE = /\bexport\s+([A-Z][A-Z0-9_]{2,})=/g;
var KEY_NAMED = /\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_(?:API_KEY|APIKEY|KEY|TOKEN|SECRET|PASSWORD))\b/g;
function shellReads(lines) {
  const assigned = new Set;
  for (const line of lines) {
    const name = SHELL_ASSIGN.exec(line)?.[1];
    if (name !== undefined)
      assigned.add(name);
    for (const loop of line.matchAll(SHELL_LOOP))
      assigned.add(loop[1] ?? "");
  }
  return lines.flatMap((line) => [...line.matchAll(SHELL_READ)].map((match) => match[1] ?? "")).filter((name) => !assigned.has(name));
}
function isShell(path, text) {
  return /\.(sh|bash|zsh)$/i.test(path) || /^#!\s*\S*\/(?:env\s+)?(?:ba|z|da)?sh\b/.test(text);
}
function settingsIn(path, text, code) {
  const found = new Set;
  for (const pattern of READS_IN_CODE) {
    for (const match of text.matchAll(pattern))
      found.add((match[1] ?? "").toUpperCase());
  }
  if (MARKDOWN.test(path)) {
    for (const match of text.matchAll(EXPORT_IN_PROSE))
      found.add(match[1] ?? "");
    for (const match of text.matchAll(KEY_NAMED))
      found.add(match[1] ?? "");
  } else if (isShell(path, text)) {
    for (const name of shellReads(code))
      found.add(name);
  }
  return [...found].filter((name) => name.length > 0 && !SHELL_VARIABLES.has(name));
}
function codeOf(path, text, isScript) {
  const lines = text.split(`
`);
  if (isScript)
    return lines;
  if (!MARKDOWN.test(path))
    return [];
  const out = [];
  let fenced = false;
  for (const line of lines) {
    if (FENCE.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced)
      out.push(line);
    else
      for (const inline of line.matchAll(/`([^`]+)`/g))
        out.push(inline[1] ?? "");
  }
  return out;
}
var FETCH_AND_RUN = [
  {
    kind: "pipe to a shell",
    pattern: /\b(?:curl|wget|iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^|\n]*\|\s*(?:sudo\s+(?:-\S+\s+)*)?(?:sh|bash|zsh|dash|python3?|node|perl|ruby|iex|Invoke-Expression)\b/i
  },
  {
    kind: "runs a downloaded script",
    pattern: /\b(?:sh|bash|zsh|source)\s+<\(\s*(?:curl|wget)\b|\b(?:sh|bash|zsh)\s+-c\s+["']?\$\(\s*(?:curl|wget)\b|\b(?:iex|Invoke-Expression)\b[^\n]*\b(?:irm|iwr|Invoke-WebRequest|Invoke-RestMethod|DownloadString)\b|\bdeno\s+run\b[^\n]*\bhttps?:\/\//i
  },
  {
    kind: "installs from a URL",
    pattern: /\b(?:pip3?|pipx|uv\s+pip|npm|pnpm|yarn|bun|gem)\s+(?:install|add|i)\b[^\n|;&]*\s(?:https?:\/\/|git\+|github:)/i
  },
  {
    kind: "runs a package fetched at run time",
    pattern: /\bnpx\s+(?:-y|--yes)\b|\b(?:pnpm|yarn)\s+dlx\s+\S|\buvx\s+[a-z]|\bpipx\s+run\s+[a-z]/i
  }
];
var URL_HOST = /\bhttps?:\/\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)/gi;
var PLACEHOLDER_HOST = /(^|\.)(example\.(com|org|net)|localhost|local|test|invalid|example|internal)$|^(127\.\d+\.\d+\.\d+|0\.0\.0\.0)$|^(www\.)?(your|my)-?(domain|site|server|host|app|api|company|website)\./;
var FILE_LIKE_HOST = /\.(jpe?g|png|gif|webp|svg|mp[34]|wav|mov|webm|pdf|md|json|txt|html?|js|ts|py|sh)$/;
function domainsIn(text) {
  const out = [];
  for (const match of text.matchAll(URL_HOST)) {
    const host = (match[1] ?? "").toLowerCase();
    if (!/\.[a-z]{2,}$/.test(host) && !/^\d+\.\d+\.\d+\.\d+$/.test(host))
      continue;
    if (PLACEHOLDER_HOST.test(host) || FILE_LIKE_HOST.test(host))
      continue;
    out.push(host);
  }
  return out;
}
var INVISIBLE = /[​-‍⁠-⁤﻿᠎‪-‮⁦-⁩]|\uDB40[\uDC00-\uDDEF]/g;
var PICTOGRAPH = /\p{Extended_Pictographic}/u;
function codePoint(point) {
  return `U+${point.toString(16).toUpperCase().padStart(4, "0")}`;
}
function invisibleIn(line, lineIndex) {
  const counts = new Map;
  const spelled = [];
  for (const match of line.matchAll(INVISIBLE)) {
    const char = match[0];
    const at = match.index;
    if (lineIndex === 0 && at === 0 && char === "\uFEFF")
      continue;
    if (char === "‍") {
      const before = [...line.slice(0, at)].at(-1) ?? "";
      const after = [...line.slice(at + 1)][0] ?? "";
      if (PICTOGRAPH.test(before) && PICTOGRAPH.test(after))
        continue;
    }
    const point = char.codePointAt(0) ?? 0;
    if (point >= 917536 && point <= 917630)
      spelled.push(String.fromCharCode(point - 917504));
    const name = point >= 917504 && point <= 917631 ? "Unicode tag" : codePoint(point);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  if (counts.size === 0)
    return null;
  const listed = [...counts.entries()].map(([name, n]) => `${n} × ${name}`).join(", ");
  return spelled.length === 0 ? listed : `${listed}, spelling "${cap(spelled.join(""))}"`;
}
var BASE64_RUN = /[A-Za-z0-9+/]{100,}={0,2}/g;
var DATA_URI = /data:([\w.+-]+\/[\w.+-]+)?(?:;[\w=-]+)*;base64,([A-Za-z0-9+/]{100,}={0,2})/g;
var URL_TEXT = /\bhttps?:\/\/\S+/g;
function encodedIn(line) {
  const out = [];
  const withoutUris = line.replace(DATA_URI, (_whole, type, body) => {
    out.push(`data URI${type === undefined ? "" : ` ${type}`}, ${body.length} characters of base64`);
    return " ";
  });
  for (const match of withoutUris.replace(URL_TEXT, " ").matchAll(BASE64_RUN)) {
    const run = match[0];
    if (/[A-Z]/.test(run) && /[a-z]/.test(run) && /[0-9]/.test(run))
      out.push(`${run.length} characters of base64`);
  }
  return out;
}
var IGNORE_INSTRUCTIONS = /\b(?:ignore|disregard|forget|override)\b[^.\n]{0,40}?\b(?:previous|prior|above|earlier|preceding|all|any|other|system|your)\b[^.\n]{0,25}?\b(?:instructions?|prompts?|rules|guidelines|directions)\b/i;
var KEEP_FROM_PERSON = /\b(?:do not|don't|never)\s+(?:tell|inform|notify|alert|(?:mention|reveal)(?:\s+(?:this|it))?\s+to)\s+(?:the\s+)?(?:user|human|person|operator)\b|\bwithout\s+(?:telling|informing|notifying|alerting)\s+(?:the\s+)?(?:user|human|person|operator)\b/i;
function unquoted(line) {
  return line.replace(/"[^"]*"|\u201C[^\u201D]*\u201D|\u300C[^\u300D]*\u300D|`[^`]*`/g, " ");
}
var COMMENT_WORDS = 4;
function hiddenInMarkdown(path, text) {
  const out = [];
  const push = (kind, line, value) => out.push({ kind, file: path, line, text: value });
  let fenced = false;
  let comment = null;
  for (const [index, line] of text.split(`
`).entries()) {
    const invisible = invisibleIn(line, index);
    if (invisible !== null)
      push("hidden characters", index + 1, invisible);
    for (const encoded of encodedIn(line))
      push("encoded block", index + 1, encoded);
    const visible = line.replace(INVISIBLE, "");
    if (IGNORE_INSTRUCTIONS.test(unquoted(visible)))
      push("says to ignore instructions", index + 1, cap(visible));
    if (KEEP_FROM_PERSON.test(unquoted(visible)))
      push("says not to tell the person", index + 1, cap(visible));
    if (comment === null && FENCE.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced)
      continue;
    let rest = visible;
    while (rest.length > 0) {
      if (comment === null) {
        const open = rest.indexOf("<!--");
        if (open === -1)
          break;
        comment = { start: index + 1, text: [] };
        rest = rest.slice(open + 4);
      }
      const close = rest.indexOf("-->");
      if (close === -1) {
        comment.text.push(rest);
        break;
      }
      comment.text.push(rest.slice(0, close));
      const inner = comment.text.join(" ").replace(/\s+/g, " ").trim();
      if (inner.split(" ").filter((word) => /[\p{L}\p{N}]/u.test(word)).length >= COMMENT_WORDS) {
        push("HTML comment", comment.start, cap(inner));
      }
      comment = null;
      rest = rest.slice(close + 3);
    }
  }
  if (comment !== null)
    push("HTML comment", comment.start, cap(`(never closed) ${comment.text.join(" ")}`));
  return out;
}
function bounded(name, items, cut) {
  if (items.length <= CONTENTS_LIMITS2.items)
    return [...items];
  cut.push(name);
  return items.slice(0, CONTENTS_LIMITS2.items);
}
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function namesFile(markdown, path) {
  const base = path.slice(path.lastIndexOf("/") + 1);
  return markdown.includes(path) || new RegExp(`(^|[\\s/\`'"(])${escapeRegExp(base)}($|[\\s\`'")]|[.,:;](\\s|$))`, "m").test(markdown);
}
function readSkillContents2(input) {
  const sorted = [...input].sort((a, b) => compare(a.path, b.path));
  const skipped = [];
  const files = [];
  for (const file of sorted) {
    if (files.length >= CONTENTS_LIMITS2.files)
      skipped.push({ path: file.path, why: "over the file limit" });
    else if (file.text === null)
      skipped.push({ path: file.path, why: file.notFetched === true ? "not fetched" : "binary" });
    else if (file.text.length > CONTENTS_LIMITS2.fileChars)
      skipped.push({ path: file.path, why: "too large" });
    else
      files.push({ path: file.path, text: file.text.replace(/\r\n?/g, `
`) });
  }
  const skillMd = files.find((file) => file.path === "SKILL.md")?.text ?? "";
  const programs = new Map;
  const add = (name, from) => {
    if (!programs.has(name))
      programs.set(name, from);
  };
  const requires = readRequires2(skillMd);
  for (const name of requires.cli)
    add(name, "declared");
  for (const name of requires.runs)
    add(name, "runs");
  const packages = new Map;
  const settings = new Set;
  const domains = new Set;
  const fetchAndRun = [];
  const hidden = [];
  const scripts = skipped.filter((file) => file.why === "not fetched" && SCRIPT.test(file.path)).map((file) => ({ path: file.path, namedInSkillMd: namesFile(skillMd, file.path) }));
  for (const file of files) {
    const lines = file.text.split(`
`);
    const isScript = SCRIPT.test(file.path) || lines[0]?.startsWith("#!") === true;
    const code = codeOf(file.path, file.text, isScript);
    const shell = isShell(file.path, file.text);
    for (const line of code) {
      const installed = packagesIn(line);
      for (const pkg of installed)
        packages.set(`${pkg.manager} ${pkg.name}`, pkg);
      if (!isScript)
        continue;
      for (const name of programsInScriptLine(line, shell)) {
        if (!installed.some((pkg) => pkg.name === name))
          add(name, "script");
      }
    }
    if (isScript) {
      scripts.push({ path: file.path, namedInSkillMd: namesFile(skillMd, file.path) });
      const interpreter = interpreterOf(lines[0] ?? "");
      if (interpreter !== null)
        add(interpreter, "interpreter");
    }
    if (/(^|\/)requirements[\w.-]*\.txt$/i.test(file.path)) {
      for (const name of requirementsIn(file.text))
        packages.set(`pip ${name}`, { manager: "pip", name });
    }
    for (const setting of settingsIn(file.path, file.text, code))
      settings.add(setting);
    for (const host of domainsIn(file.text))
      domains.add(host);
    for (const [index, line] of lines.entries()) {
      const run = FETCH_AND_RUN.find(({ pattern }) => pattern.test(line));
      if (run !== undefined)
        fetchAndRun.push({ kind: run.kind, file: file.path, line: index + 1, text: cap(line) });
    }
    if (MARKDOWN.test(file.path))
      hidden.push(...hiddenInMarkdown(file.path, file.text));
  }
  const packageNames = new Set([...packages.values()].map((pkg) => pkg.name));
  for (const [name, from] of programs)
    if (from !== "declared" && packageNames.has(name))
      programs.delete(name);
  const cut = [];
  return {
    programs: bounded("programs", [...programs.entries()].map(([name, from]) => ({ name, from })).sort((a, b) => compare(a.name, b.name)), cut),
    packages: bounded("packages", [...packages.values()].sort((a, b) => compare(`${a.manager} ${a.name}`, `${b.manager} ${b.name}`)), cut),
    settings: bounded("settings", [...settings].sort(compare), cut),
    scripts: bounded("scripts", scripts.sort((a, b) => compare(a.path, b.path)), cut),
    fetchAndRun: bounded("fetchAndRun", fetchAndRun, cut),
    domains: bounded("domains", [...domains].sort(compare), cut),
    hidden: bounded("hidden", hidden, cut),
    read: {
      files: files.length,
      bytes: files.reduce((sum, file) => sum + new TextEncoder().encode(file.text).byteLength, 0),
      skipped
    },
    cut
  };
}
function contentsLines2(contents, perList = 6) {
  const list = (items, cut) => items.length === 0 ? "none found" : `${items.slice(0, perList).join(", ")}${items.length > perList || cut ? `, and ${Math.max(0, items.length - perList)}${cut ? "+" : ""} more` : ""}`;
  const at = (rows, name) => list(rows.map((row) => `${row.kind} at ${row.file}:${row.line} "${row.text}"`), contents.cut.includes(name));
  return [
    `Programs: ${list(contents.programs.map((p) => `${p.name} (${p.from})`), contents.cut.includes("programs"))}`,
    ...contents.packages.length === 0 ? [] : [`Packages: ${list(contents.packages.map((p) => `${p.manager} ${p.name}`), contents.cut.includes("packages"))}`],
    `Keys and settings it reads: ${list(contents.settings, contents.cut.includes("settings"))}`,
    `Scripts: ${list(contents.scripts.map((s) => s.namedInSkillMd ? `${s.path} (named in SKILL.md)` : s.path), contents.cut.includes("scripts"))}`,
    `Fetches and runs code: ${at(contents.fetchAndRun, "fetchAndRun")}`,
    `Domains named: ${list(contents.domains, contents.cut.includes("domains"))}`,
    `Hidden or encoded text: ${at(contents.hidden, "hidden")}`,
    ...contents.read.skipped.length === 0 ? [] : [`Not read: ${list(contents.read.skipped.map((s) => `${s.path} (${s.why})`), false)}`]
  ];
}

// ../../packages/protocol/src/pulse.ts
var MAX_SKILL_FILES_READ2 = 200;
var MAX_SCRIPTS_READ = 5;
var GITHUB_READ_TIMEOUT_MS = 1e4;
var INSTALLER_ORDER = [
  "",
  "skills/",
  "skills/.curated/",
  "skills/.experimental/",
  "skills/.system/",
  ".agents/skills/",
  ".claude/skills/",
  ".cline/skills/",
  ".codebuddy/skills/",
  ".codex/skills/",
  ".commandcode/skills/",
  ".continue/skills/",
  ".factory/skills/",
  ".github/skills/",
  ".goose/skills/",
  ".grok/skills/",
  ".iflow/skills/",
  ".junie/skills/",
  ".kilo/skills/",
  ".kilocode/skills/",
  ".kimchi/skills/",
  ".kiro/skills/",
  ".minimax/skills/",
  ".mux/skills/",
  ".neovate/skills/",
  ".opencode/skills/",
  ".openhands/skills/",
  ".pi/skills/",
  ".posit/assistant/skills/",
  ".qoder/skills/",
  ".roo/skills/",
  ".trae/skills/",
  ".windsurf/skills/",
  ".zcode/skills/",
  ".zencoder/skills/"
];
function installerRank(path) {
  let best = null;
  INSTALLER_ORDER.forEach((prefix, rank) => {
    if (best !== null || !path.startsWith(prefix))
      return;
    const depth = path.slice(prefix.length).split("/").length;
    if (prefix === "" ? depth <= 2 : depth <= 4)
      best = rank;
  });
  return best;
}
function normaliseName(name) {
  return name.trim().toLowerCase().replace(/[\s_]+/g, "-");
}
function frontmatterName2(markdown) {
  const lines = markdown.split(`
`);
  if (lines[0]?.trim() !== "---")
    return null;
  for (const line of lines.slice(1)) {
    if (line.trim() === "---")
      return null;
    const match = /^name\s*:\s*(.+?)\s*$/.exec(line);
    if (match !== null)
      return (match[1] ?? "").replace(/^["']|["']$/g, "");
  }
  return null;
}
var KEY_NAME3 = /\b[A-Z][A-Z0-9_]*(?:API_KEY|APIKEY|_TOKEN|_SECRET)\b/g;
var PAID_WORD = /\b(pricing|paid|subscription|credits?|billing|free tier|per minute)\b/gi;
var HOST = /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
var NOT_A_SERVICE = /(^|\.)(github\.com|githubusercontent\.com|example\.(com|org|net))$/;
var LOOKS_LIKE_A_FILE = /\.(jpe?g|png|gif|webp|mp[34]|wav|mov|webm|pdf|md|json|txt)$/;
var SCRIPT2 = /\.(sh|bash|py|js|mjs|cjs|ts|rb|pl)$/i;
var RUNS_FILE = /\b(?:node|bun|deno|tsx|python3?|bash|sh)\s+((?:~|\.{1,2})?\/?[\w.@-]+(?:\/[\w.@-]+)*\.(?:mjs|cjs|js|ts|py|sh))\b/g;
var PLACEHOLDER = /(^|\/)(path|your|my|foo|example|script|file|input|output)(\/|\.|$)/i;
function filesItRuns(markdown, repositoryFiles) {
  const named = [...markdown.matchAll(RUNS_FILE)].map((match) => match[1] ?? "");
  const found = new Set;
  for (const name of named) {
    if (name.startsWith("/") || name.startsWith("~") || PLACEHOLDER.test(name))
      continue;
    const tail = name.replace(/^(\.{1,2}\/)+/, "");
    const hit = repositoryFiles.find((file) => file.path === tail || file.path.endsWith(`/${tail}`));
    if (hit !== undefined)
      found.add(hit.path);
  }
  return [...found];
}
function absentFiles(markdown, repositoryFiles) {
  const named = [...markdown.matchAll(RUNS_FILE)].map((match) => match[1] ?? "");
  return [...new Set(named)].filter((name) => {
    if (name.startsWith("/") || name.startsWith("~") || PLACEHOLDER.test(name))
      return false;
    const tail = name.replace(/^(\.{1,2}\/)+/, "");
    return !repositoryFiles.some((file) => file.path === tail || file.path.endsWith(`/${tail}`));
  });
}
function readSkillFacts2(markdown, filesInDirectory, repositoryFiles = filesInDirectory) {
  const hosts = [...markdown.matchAll(HOST)].map((match) => (match[1] ?? "").toLowerCase()).filter((host) => !NOT_A_SERVICE.test(host) && !LOOKS_LIKE_A_FILE.test(host));
  return {
    files: filesInDirectory.length,
    bytes: filesInDirectory.reduce((total, file) => total + file.size, 0),
    scripts: filesInDirectory.filter((file) => SCRIPT2.test(file.path)).length,
    keys: [...new Set(markdown.match(KEY_NAME3) ?? [])],
    paidWords: [...new Set((markdown.match(PAID_WORD) ?? []).map((word) => word.toLowerCase()))],
    hosts: [...new Set(hosts)],
    runsAbsentFiles: absentFiles(markdown, repositoryFiles),
    keysInScriptsItRuns: [],
    requires: readRequires2(markdown),
    contains: readSkillContents2([{ path: "SKILL.md", text: markdown }])
  };
}
function parentOf(path) {
  const at = path.lastIndexOf("/");
  return at === -1 ? "" : path.slice(0, at);
}
async function locate(source, repo, skill, listing) {
  const wanted = normaliseName(skill);
  const candidates = listing.files.filter((file) => skillFilesIn2([file]).length === 1);
  const guessed = candidates.filter((file) => normaliseName(directoryOf2(file.path)) === wanted);
  const others = candidates.filter((file) => !guessed.includes(file));
  const read = async (files) => (await Promise.all(files.map(async (file) => ({ file, markdown: await source.file(repo, file.path) })))).filter((entry) => entry.markdown !== null && normaliseName(frontmatterName2(entry.markdown) ?? "") === wanted);
  let named = await read(guessed);
  if (named.length === 0) {
    if (others.length > MAX_SKILL_FILES_READ2) {
      return { status: "incomplete", reason: "too_many_skill_files" };
    }
    for (let at = 0;at < others.length && named.length === 0; at += 20) {
      named = await read(others.slice(at, at + 20));
    }
    if (named.length > 0) {
      const last = others.findIndex((file) => file === named.at(-1)?.file);
      named = [...named, ...await read(others.slice(last + 1))];
    }
  }
  if (named.length === 0) {
    if (listing.truncated)
      return { status: "incomplete", reason: "truncated_listing" };
    return { status: "absent", skillFiles: candidates.length };
  }
  const ranked = named.map((entry) => ({ ...entry, rank: installerRank(entry.file.path) })).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  const [first2, ...rest] = ranked;
  if (first2 === undefined)
    return { status: "absent", skillFiles: candidates.length };
  const differs = rest.filter((entry) => entry.file.sha !== first2.file.sha);
  if (first2.rank === null && differs.length > 0) {
    return { status: "ambiguous", paths: ranked.map((entry) => entry.file.path) };
  }
  return {
    status: "found",
    file: first2.file,
    markdown: first2.markdown,
    alsoAt: rest.filter((entry) => entry.file.sha === first2.file.sha).map((entry) => entry.file.path),
    differsAt: differs.map((entry) => entry.file.path)
  };
}
function usualPaths(skill) {
  return [`skills/${skill}/SKILL.md`, `${skill}/SKILL.md`, `.claude/skills/${skill}/SKILL.md`, "SKILL.md"];
}
async function readFileOnly(result, source) {
  if (!/^[\w.-]+$/.test(result.skill) || /^\.+$/.test(result.skill))
    return null;
  const wanted = normaliseName(result.skill);
  for (const path of usualPaths(result.skill)) {
    const markdown = await source.file(result.source, path);
    if (markdown === null || normaliseName(frontmatterName2(markdown) ?? "") !== wanted)
      continue;
    const { keys, paidWords, hosts, requires, contains } = readSkillFacts2(markdown, []);
    return { ...result, status: "read_file_only", path, keys, paidWords, hosts, requires, contains };
  }
  return null;
}
async function readPulse2(result, source) {
  if (!/^(?!\.{1,2}\/)[\w.-]+\/(?!\.{1,2}$)[\w.-]+$/.test(result.source))
    return { ...result, status: "not_github" };
  const listing = await source.listing(result.source);
  if (listing === "rate_limited")
    return await readFileOnly(result, source) ?? { ...result, status: "rate_limited" };
  if (listing === "unreachable")
    return { ...result, status: "repository_unreachable" };
  const located = await locate(source, result.source, result.skill, listing);
  if (located.status === "absent")
    return { ...result, status: "absent", skillFiles: located.skillFiles };
  if (located.status === "ambiguous")
    return { ...result, status: "ambiguous", paths: located.paths };
  if (located.status === "incomplete")
    return { ...result, status: "incomplete", reason: located.reason };
  const directory = parentOf(located.file.path);
  const prefix = directory === "" ? "" : `${directory}/`;
  const inDirectory = listing.files.filter((file) => file.path.startsWith(prefix));
  const scripts = filesItRuns(located.markdown, listing.files).slice(0, MAX_SCRIPTS_READ);
  const scriptTexts = await Promise.all(scripts.map(async (file) => ({ file, text: await source.file(result.source, file) })));
  const keysInScriptsItRuns = scriptTexts.map(({ file, text }) => ({ file, keys: [...new Set(text?.match(KEY_NAME3) ?? [])] })).filter((entry) => entry.keys.length > 0);
  const relative = (path) => path.startsWith(prefix) ? path.slice(prefix.length) : path;
  const fetched = new Set(scriptTexts.filter((entry) => entry.text !== null).map((entry) => entry.file));
  const contains = readSkillContents2([
    { path: "SKILL.md", text: located.markdown },
    ...scriptTexts.flatMap(({ file, text }) => text === null ? [] : [{ path: relative(file), text }]),
    ...inDirectory.filter((file) => SCRIPT2.test(file.path) && !fetched.has(file.path)).map((file) => ({ path: relative(file.path), text: null, notFetched: true }))
  ]);
  return {
    ...result,
    status: "read",
    path: located.file.path,
    alsoAt: located.alsoAt,
    differsAt: located.differsAt,
    contentId: directory === "" ? listing.rootTreeId : listing.trees.get(directory) ?? located.file.sha,
    skillMdSha: located.file.sha,
    repository: await source.repository(result.source),
    ...listing.readAt === undefined ? {} : { listingReadAt: listing.readAt },
    ...readSkillFacts2(located.markdown, inDirectory, listing.files),
    keysInScriptsItRuns,
    contains
  };
}
function githubPulseSource2(options = {}) {
  const get = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? GITHUB_READ_TIMEOUT_MS;
  const bounded2 = () => {
    const limit = AbortSignal.timeout(timeoutMs);
    return options.signal === undefined ? limit : AbortSignal.any([limit, options.signal]);
  };
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "arp-pulse",
    ...options.token === undefined ? {} : { authorization: `Bearer ${options.token}` }
  };
  const listings = new Map;
  const repositories = new Map;
  const quota = { apiRequests: 0, limited: false, resetsAt: null };
  const noteLimit = (response) => {
    const hit = response.status === 429 || response.status === 403 && (response.headers.get("x-ratelimit-remaining") === "0" || response.headers.has("retry-after"));
    if (!hit)
      return false;
    quota.limited = true;
    const reset = Number(response.headers.get("x-ratelimit-reset"));
    if (Number.isFinite(reset) && reset > 0)
      quota.resetsAt = new Date(reset * 1000).toISOString();
    return true;
  };
  const readListing = async (repo) => {
    const cached = await options.cache?.get(repo).catch(() => null);
    if (cached !== null && cached !== undefined)
      return cached;
    if (quota.limited)
      return "rate_limited";
    quota.apiRequests += 1;
    const response = await get(`https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`, { headers, signal: bounded2() });
    if (noteLimit(response))
      return "rate_limited";
    if (!response.ok)
      return "unreachable";
    const body = await response.json();
    const files = [];
    const trees = new Map;
    for (const entry of body.tree ?? []) {
      if (typeof entry.path !== "string" || typeof entry.sha !== "string")
        continue;
      if (entry.type === "tree")
        trees.set(entry.path, entry.sha);
      if (entry.type === "blob") {
        files.push({ path: entry.path, sha: entry.sha, size: typeof entry.size === "number" ? entry.size : 0 });
      }
    }
    const listing = {
      rootTreeId: typeof body.sha === "string" ? body.sha : "",
      files,
      trees,
      truncated: body.truncated === true
    };
    await options.cache?.set(repo, listing).catch(() => {
      return;
    });
    return listing;
  };
  const readRepository = async (repo) => {
    if (options.withRepository === false || quota.limited)
      return null;
    quota.apiRequests += 1;
    const response = await get(`https://api.github.com/repos/${repo}`, { headers, signal: bounded2() });
    noteLimit(response);
    if (!response.ok)
      return null;
    const body = await response.json();
    return {
      stars: typeof body.stargazers_count === "number" ? body.stargazers_count : 0,
      pushedAt: typeof body.pushed_at === "string" ? body.pushed_at : null,
      archived: body.archived === true
    };
  };
  const once = (cache, repo, read) => {
    const hit = cache.get(repo);
    if (hit !== undefined)
      return hit;
    const started = read(repo);
    cache.set(repo, started);
    return started;
  };
  return {
    listing: (repo) => once(listings, repo, readListing),
    repository: (repo) => once(repositories, repo, readRepository),
    file: async (repo, path) => {
      const encoded = path.split("/").map(encodeURIComponent).join("/");
      const response = await get(`https://raw.githubusercontent.com/${repo}/HEAD/${encoded}`, { signal: bounded2() });
      return response.ok ? response.text() : null;
    },
    quota: () => ({ ...quota })
  };
}

// ../../packages/protocol/src/skill-install.ts
var MAX_SKILLS_READ2 = 3;
var ADD = new Set(["add", "a", "install", "i"]);
var RUNNERS = new Set(["npx", "pnpx", "bunx"]);
var DLX = { pnpm: ["dlx"], yarn: ["dlx"], npm: ["exec", "x"] };
var SKILLS = /^skills(@[\w.^~<>=*-]+)?$/;
var ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
function shellWords(command) {
  const commands = [[]];
  let word = null;
  let quote = null;
  const end = () => {
    if (word !== null)
      commands[commands.length - 1]?.push(word);
    word = null;
  };
  for (let at = 0;at < command.length; at += 1) {
    const char = command[at] ?? "";
    if (quote !== null) {
      if (char === quote)
        quote = null;
      else if (char === "\\" && quote === '"' && at + 1 < command.length)
        word = (word ?? "") + command[at += 1];
      else
        word = (word ?? "") + char;
    } else if (char === "'" || char === '"') {
      quote = char;
      word ??= "";
    } else if (char === "\\" && at + 1 < command.length) {
      word = (word ?? "") + command[at += 1];
    } else if (/\s/.test(char) && char !== `
`) {
      end();
    } else if (char === `
` || char === ";" || char === "&" || char === "|") {
      end();
      commands.push([]);
    } else {
      word = (word ?? "") + char;
    }
  }
  end();
  return commands.filter((words) => words.length > 0);
}
function addArguments(words) {
  let at = 0;
  while (at < words.length && ENV_ASSIGNMENT.test(words[at] ?? ""))
    at += 1;
  const first2 = words[at];
  if (first2 !== undefined && RUNNERS.has(first2))
    at += 1;
  else if (first2 !== undefined && DLX[first2]?.includes(words[at + 1] ?? "") === true)
    at += 2;
  while (at < words.length && (words[at] ?? "").startsWith("-"))
    at += 1;
  if (!SKILLS.test(words[at] ?? ""))
    return null;
  const subcommand = words[at + 1];
  return subcommand !== undefined && ADD.has(subcommand) ? words.slice(at + 2) : null;
}
function parseAdd(args) {
  const skills = [];
  let source = null;
  let all = false;
  let list = false;
  for (let at = 0;at < args.length; at += 1) {
    const arg = args[at] ?? "";
    if (arg === "--all")
      all = true;
    else if (arg === "-l" || arg === "--list")
      list = true;
    else if (arg === "-s" || arg === "--skill" || arg === "-a" || arg === "--agent" || arg === "--subagent") {
      while (at + 1 < args.length && !(args[at + 1] ?? "").startsWith("-")) {
        at += 1;
        if (arg === "-s" || arg === "--skill")
          skills.push(args[at] ?? "");
      }
    } else if (arg === "--metadata")
      at += 1;
    else if (!arg.startsWith("-") && source === null)
      source = arg;
  }
  return { source, skills, all, list };
}
var NAME = /^[\w.-]+$/;
function github(repo, ref, subpath, named, all) {
  const [owner, name] = repo.split("/");
  const clean = `${owner}/${(name ?? "").replace(/\.git$/, "")}`;
  const path = subpath?.replace(/^\/+|\/+$/g, "") ?? "";
  return {
    kind: "github",
    repo: clean,
    ref,
    subpath: path === "" || path.split("/").includes("..") ? null : path,
    skills: all || named.length === 0 || named.includes("*") ? "all" : [...new Set(named)]
  };
}
function sourceOf(input, named, all) {
  const elsewhere = { kind: "elsewhere", source: input };
  if (/^(\.{1,2}(\/|$)|\/|~)/.test(input) || /^[A-Za-z]:[\\/]/.test(input))
    return elsewhere;
  const hash = input.indexOf("#");
  let rest = hash === -1 ? input : input.slice(0, hash);
  const fragment = hash === -1 ? "" : input.slice(hash + 1);
  const fragmentAt = fragment.indexOf("@");
  let ref = (fragmentAt === -1 ? fragment : fragment.slice(0, fragmentAt)) || null;
  const fragmentSkill = fragmentAt === -1 ? null : fragment.slice(fragmentAt + 1) || null;
  const withSkill = (names) => fragmentSkill === null ? names : [fragmentSkill];
  const prefixed = /^github:(.+)$/.exec(rest);
  if (prefixed?.[1] !== undefined)
    rest = prefixed[1];
  const tree = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?$/.exec(rest);
  if (tree !== null) {
    ref = tree[3] ?? ref;
    return github(`${tree[1]}/${tree[2]}`, ref, tree[4] ?? null, withSkill(named), all);
  }
  const url = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+?)\/?$/.exec(rest);
  if (url !== null)
    return github(`${url[1]}/${url[2]}`, ref, null, withSkill(named), all);
  if (rest.includes(":"))
    return elsewhere;
  const at = /^([^/]+)\/([^/@]+)@(.+)$/.exec(rest);
  if (at !== null)
    return github(`${at[1]}/${at[2]}`, ref, null, [fragmentSkill ?? at[3] ?? ""], false);
  const shorthand = /^([^/]+)\/([^/]+?)(?:\/(.+?))?\/?$/.exec(rest);
  if (shorthand !== null && NAME.test(shorthand[1] ?? "") && NAME.test(shorthand[2] ?? "")) {
    return github(`${shorthand[1]}/${shorthand[2]}`, ref, shorthand[3] ?? null, withSkill(named), all);
  }
  return elsewhere;
}
function skillInstallOf2(command) {
  for (const words of shellWords(command)) {
    const args = addArguments(words);
    if (args === null)
      continue;
    const add = parseAdd(args);
    if (add.list || add.source === null)
      continue;
    return sourceOf(add.source, add.skills, add.all);
  }
  return null;
}
async function namesUnder(install, source) {
  const listing = await source.listing(install.repo);
  if (listing === "rate_limited" || listing === "unreachable")
    return listing;
  const prefix = install.subpath === null ? "" : `${install.subpath}/`;
  const files = skillFilesIn2(listing.files).filter((file) => file.path.startsWith(prefix)).sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));
  const names = await Promise.all(files.slice(0, MAX_SKILLS_READ2).map(async (file) => {
    const markdown = await source.file(install.repo, file.path);
    const parts = file.path.split("/");
    return (markdown === null ? null : frontmatterName2(markdown)) ?? parts.at(-2) ?? install.repo.split("/")[1] ?? "";
  }));
  return { names, total: files.length };
}
async function readSkillInstall2(install, source, deadline) {
  if (install.kind === "elsewhere")
    return install;
  const late = deadline.then(() => "late");
  let names;
  let total;
  if (install.skills === "all") {
    const found = await Promise.race([
      namesUnder(install, source).catch(() => "unreachable"),
      late
    ]);
    if (found === "late")
      return {
        kind: "github",
        install,
        readings: [],
        notRead: 0,
        listing: "no answer in time"
      };
    if (found === "rate_limited" || found === "unreachable") {
      return { kind: "github", install, readings: [], notRead: 0, listing: found };
    }
    ({ names, total } = found);
  } else {
    names = install.skills.slice(0, MAX_SKILLS_READ2);
    total = install.skills.length;
  }
  const readings = await Promise.all(names.map(async (skill) => {
    const pulse = readPulse2({ source: install.repo, skill, installs: null, installsText: null, url: null }, source).then((read) => ({ skill, pulse: read })).catch(() => ({ skill, pulse: null, why: "read failed" }));
    const settled = await Promise.race([pulse, late]);
    return settled === "late" ? { skill, pulse: null, why: "no answer in time" } : settled;
  }));
  return {
    kind: "github",
    install,
    readings,
    notRead: Math.max(0, total - names.length),
    listing: null
  };
}
var plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
function readingLines(repo, reading) {
  const head = `${repo} · ${reading.skill}`;
  const { pulse } = reading;
  if (pulse === null)
    return [
      `${head}: not read (${reading.why === "no answer in time" ? "GitHub did not answer in time" : "the read failed"})`
    ];
  switch (pulse.status) {
    case "read": {
      const facts = [
        `${pulse.path}`,
        plural(pulse.files, "file"),
        ...pulse.repository === null ? [] : [
          plural(pulse.repository.stars, "star"),
          ...pulse.repository.pushedAt === null ? [] : [`last push ${pulse.repository.pushedAt.slice(0, 10)}`],
          ...pulse.repository.archived ? ["archived"] : []
        ]
      ];
      return [
        `${head} (${facts.join(", ")})`,
        ...contentsLines2(pulse.contains).map((line) => `  ${line}`),
        ...pulse.differsAt.length === 0 ? [] : [`  Other files carry this name and differ: ${pulse.differsAt.join(", ")}`]
      ];
    }
    case "read_file_only":
      return [
        `${head} (${pulse.path}; GitHub's hourly limit was reached, so SKILL.md alone was read, not its scripts)`,
        ...contentsLines2(pulse.contains).map((line) => `  ${line}`)
      ];
    case "absent":
      return [
        `${head}: no SKILL.md in the repository names it (${plural(pulse.skillFiles, "skill file")} read)`
      ];
    case "ambiguous":
      return [
        `${head}: several files carry this name and differ, and which one installs is not knowable here: ${pulse.paths.join(", ")}`
      ];
    case "incomplete":
      return [
        `${head}: not read (${pulse.reason === "truncated_listing" ? "GitHub cut the repository's file list" : "too many skill files to search"})`
      ];
    case "rate_limited":
      return [`${head}: not read (GitHub's hourly limit; GITHUB_TOKEN raises it)`];
    case "repository_unreachable":
      return [`${head}: not read (the repository did not answer)`];
    case "not_github":
      return [`${head}: not read (not a GitHub repository)`];
  }
}
function skillInstallReport2(read) {
  const title = "ARP read this skill before the install (what its own files contain; facts, not a verdict):";
  if (read.kind === "elsewhere") {
    return `${title}
${read.source}: not read (ARP reads GitHub sources only)`;
  }
  const { install } = read;
  const lines = [title];
  if (read.listing !== null) {
    const why = read.listing === "rate_limited" ? "GitHub's hourly limit; GITHUB_TOKEN raises it" : read.listing === "no answer in time" ? "GitHub did not answer in time" : "the repository did not answer";
    lines.push(`${install.repo}${install.subpath === null ? "" : `/${install.subpath}`}: not read (${why})`);
  } else if (read.readings.length === 0) {
    lines.push(`${install.repo}${install.subpath === null ? "" : `/${install.subpath}`}: no SKILL.md found`);
  }
  for (const reading of read.readings)
    lines.push(...readingLines(install.repo, reading));
  if (read.notRead > 0)
    lines.push(`${plural(read.notRead, "more skill")} in this install not read (ARP reads ${MAX_SKILLS_READ2})`);
  if (install.ref !== null)
    lines.push(`Read at the default branch's HEAD; the command names ${install.ref}.`);
  return lines.join(`
`);
}

// ../hook/src/pre-install.ts
var GITHUB_BUDGET_MS = 6000;
var OUTPUT_CAP = 9500;
var FOR_THE_AGENT = "This is what the skill's own files contain, read by ARP's hook before the install ran. " + "They are facts, not a verdict, and nothing was blocked. The person was shown the same lines.";
function capped(text) {
  return text.length <= OUTPUT_CAP ? text : `${text.slice(0, OUTPUT_CAP)}
… (cut)`;
}
async function preToolUse(raw, options = {}) {
  const call = toolCallOf(raw);
  if (call === null || call.tool !== "Bash")
    return null;
  const command = call.input?.["command"];
  if (typeof command !== "string")
    return null;
  const install = skillInstallOf2(command);
  if (install === null)
    return null;
  const env = options.env ?? process.env;
  const token = (env["GITHUB_TOKEN"] ?? env["GH_TOKEN"])?.trim() || undefined;
  const budgetMs = options.budgetMs ?? GITHUB_BUDGET_MS;
  const deadline = new Promise((resolve) => setTimeout(resolve, budgetMs));
  const source = githubPulseSource2({
    ...options.fetch === undefined ? {} : { fetch: options.fetch },
    ...token === undefined ? {} : { token },
    timeoutMs: budgetMs + 500,
    signal: AbortSignal.timeout(budgetMs + 500)
  });
  const report = capped(skillInstallReport2(await readSkillInstall2(install, source, deadline)));
  return JSON.stringify({
    systemMessage: report,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: `${report}

${FOR_THE_AGENT}`
    }
  });
}

// ../hook/src/failure-answer.ts
import { createHash } from "node:crypto";

// ../../packages/protocol/src/declare/line-need.ts
var NEEDS_LABEL3 = "needs";
var WITH_LABEL3 = "with";
var PROGRAM_NAME3 = /^[a-z0-9][a-z0-9._+-]{0,39}$/;
var KEY_NAME4 = /^[A-Z][A-Z0-9_]{2,63}$/;
function needKindOf3(name) {
  if (PROGRAM_NAME3.test(name))
    return "program";
  if (KEY_NAME4.test(name))
    return "key";
  return null;
}
function needKindOfReason3(reason) {
  if (reason === "missing-program")
    return "program";
  if (reason === "missing-key")
    return "key";
  return null;
}
var escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function namedInSkill3(name, markdown) {
  const kind = needKindOf3(name);
  if (kind === null)
    return false;
  const pattern = new RegExp(`(?<![A-Za-z0-9_+.-])${escaped(name)}(?![A-Za-z0-9_+-])(?!\\.[A-Za-z0-9])`, kind === "program" ? "i" : "");
  return pattern.test(markdown);
}
function publishableNeed3(name, markdown, kind) {
  const shape = needKindOf3(name);
  if (shape === null || kind !== undefined && shape !== kind)
    return null;
  return namedInSkill3(name, markdown) ? name : null;
}

// ../../packages/protocol/src/declare/thing-cid.ts
function thingDocument2(thing) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Thing",
    description: thing.description,
    image: thing.image,
    name: thing.name,
    url: thing.url
  });
}
function base32(bytes) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = value << 8 | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[value >>> bits - 5 & 31];
      bits -= 5;
    }
  }
  if (bits > 0)
    out += alphabet[value << 5 - bits & 31];
  return out;
}
function thingUriOfDigest(digest) {
  const cid = new Uint8Array(4 + digest.length);
  cid.set([1, 85, 18, 32]);
  cid.set(digest, 4);
  return `ipfs://b${base32(cid)}`;
}

// ../../packages/protocol/src/declare/tool-thing.ts
class InvalidToolUrlError2 extends Error {
  input;
  constructor(input, why) {
    super(`${JSON.stringify(input)} is not a usable tool URL: ${why}`);
    this.name = "InvalidToolUrlError";
    this.input = input;
  }
}
var TOOL_THING_DESCRIPTION2 = "A tool identified by its URL, so every declaration of its use lands on one atom.";
function normaliseToolUrl2(input) {
  const trimmed = input.trim();
  if (trimmed.length === 0)
    throw new InvalidToolUrlError2(input, "empty");
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    throw new InvalidToolUrlError2(input, "not parseable as a URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidToolUrlError2(input, `scheme ${url.protocol} is not http or https`);
  }
  if (url.hostname.length === 0)
    throw new InvalidToolUrlError2(input, "no host");
  const host = url.hostname.replace(/\.+$/, "").replace(/^(?:www\.)+/, "");
  const path = url.pathname.replace(/(?:\.git|\/)+$/, "");
  const params = [...new URLSearchParams(url.search).entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const query = params.length === 0 ? "" : `?${new URLSearchParams(params).toString()}`;
  const port = url.port === "" || url.port === "80" || url.port === "443" ? "" : `:${url.port}`;
  return `https://${host}${port}${path}${query}`;
}
function toolThing2(url) {
  const normalised = normaliseToolUrl2(url);
  return {
    name: normalised.slice("https://".length),
    description: TOOL_THING_DESCRIPTION2,
    image: "",
    url: normalised
  };
}

// ../../packages/protocol/src/declare/usage-words.ts
var USAGE_OUTCOMES3 = ["worked", "failed"];
var HAS_OUTCOME_LABEL3 = "has outcome";
var USAGE_REASONS3 = ["missing-key", "missing-program", "missing-file", "not-the-right-tool", "no-delivery"];
var BECAUSE_LABEL3 = "because";

// ../../packages/protocol/src/sources/intuition/terms.ts
var USES2 = "0x5c0bde1cc696456c0268248c4656acdf9621fdb39e605bc99b0a83dc8ff6e800";

// ../../packages/protocol/src/pulse-usage.ts
var DEFAULT_LIMIT = 250;
var rowsOf = (data) => Array.isArray(data["triples"]) ? data["triples"].filter(isRecord) : [];
async function findToolAtoms2(uris, config) {
  const out = new Map;
  if (uris.length === 0)
    return out;
  const transport = config.transport ?? createGraphqlTransport({
    url: config.graphqlUrl,
    fetch: config.fetch ?? defaultFetch(),
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  });
  const data = await transport.request(PULSE_ATOMS_QUERY, { uris: [...uris], limit: uris.length });
  const rows = Array.isArray(data["atoms"]) ? data["atoms"].filter(isRecord) : [];
  for (const row of rows) {
    const id = readString(row, "term_id");
    const uri = readString(row, "data");
    if (id !== null && uri !== null)
      out.set(uri, id);
  }
  return out;
}
async function getPulseUsage2(toolAtomIds, config) {
  const transport = config.transport ?? createGraphqlTransport({
    url: config.graphqlUrl,
    fetch: config.fetch ?? defaultFetch(),
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  });
  const limit = Math.min(config.limit ?? DEFAULT_LIMIT, DEFAULT_LIMIT);
  const key = (id) => id.toLowerCase();
  const empty = () => ({
    declarations: [],
    agents: 0,
    wallets: 0,
    byDomain: {},
    byOutcome: {},
    byReason: {},
    byNeed: {},
    byWith: {},
    byOthers: [],
    truncated: false
  });
  const out = new Map(toolAtomIds.map((id) => [key(id), empty()]));
  if (toolAtomIds.length === 0)
    return out;
  const edgeRows = rowsOf(await transport.request(PULSE_USES_QUERY, { tools: [...toolAtomIds], uses: USES2, limit }));
  const edges = new Map;
  const NESTED_CAP = 100;
  let truncated = edgeRows.length >= limit;
  for (const row of edgeRows) {
    const tripleId = readString(row, "term_id");
    const tool = readString(row, "object_id");
    const writer = readString(row, "creator_id");
    const subject = readRecord(row, "subject");
    const atomId = subject === null ? null : readString(subject, "term_id");
    if (tripleId === null || tool === null || writer === null || subject === null || atomId === null)
      continue;
    const edgeHolders = (Array.isArray(row["positions"]) ? row["positions"].filter(isRecord) : []).map((holder) => readString(holder, "account_id")).filter((account) => account !== null);
    const declaration = (wallet, declaredAt) => ({
      tripleId,
      agent: { atomId, label: readString(subject, "label") },
      writer: wallet,
      holders: edgeHolders,
      declaredAt,
      domains: [],
      outcomes: [],
      lines: []
    });
    const declarers = new Map([[key(writer), declaration(writer, readString(row, "created_at"))]]);
    const holders = Array.isArray(row["positions"]) ? row["positions"].filter(isRecord) : [];
    if (holders.length >= NESTED_CAP)
      truncated = true;
    for (const holder of holders) {
      const wallet = readString(holder, "account_id");
      if (wallet !== null && !declarers.has(key(wallet)))
        declarers.set(key(wallet), declaration(wallet, null));
    }
    edges.set(key(tripleId), { tool: key(tool), declarers });
  }
  const payers = new Set(config.payers.map(key));
  const writers = [...new Set([...edges.values()].flatMap((edge) => [...edge.declarers.values()].map((row) => row.writer)))];
  const qualifiers = async (subjects, predicates) => subjects.length === 0 ? [] : rowsOf(await transport.request(PULSE_QUALIFIERS_QUERY, { edges: subjects, predicates, writers, limit }));
  const pass = (rows) => {
    truncated = truncated || rows.length >= limit;
    return rows;
  };
  const standing = (row, edge, below) => {
    const holders = Array.isArray(row["positions"]) ? row["positions"].filter(isRecord) : [];
    if (holders.length >= NESTED_CAP)
      truncated = true;
    const wallets = [readString(row, "creator_id"), ...holders.map((holder) => readString(holder, "account_id"))];
    return new Set(wallets.filter((wallet) => wallet !== null).map(key).filter((wallet) => edge.declarers.has(wallet) && !payers.has(wallet) && (below === undefined || below.has(wallet))));
  };
  const parts = (row) => {
    const object = readRecord(row, "object");
    return {
      termId: readString(row, "term_id"),
      subjectId: readString(row, "subject_id"),
      predicateId: readString(row, "predicate_id"),
      writer: readString(row, "creator_id"),
      value: object === null ? null : readString(object, "label")
    };
  };
  const isOutcome = (value) => USAGE_OUTCOMES3.some((word) => word === value);
  const isReason = (value) => USAGE_REASONS3.some((word) => word === value);
  const contexts = new Map;
  const outcomes = new Map;
  const others = (edge, row, predicate) => out.get(edge.tool)?.byOthers.push({
    tripleId: row.termId ?? "",
    writer: row.writer ?? "",
    predicate,
    value: row.value ?? ""
  });
  const onEdge = pass(await qualifiers([...edges.keys()], [config.inContextOf, config.hasOutcome]));
  for (const row of onEdge) {
    const line = parts(row);
    const edge = line.subjectId === null ? undefined : edges.get(key(line.subjectId));
    if (edge === undefined || line.predicateId === null || line.writer === null || line.value === null || line.termId === null)
      continue;
    const isOutcomeLine = key(line.predicateId) === key(config.hasOutcome);
    if (isOutcomeLine && !isOutcome(line.value))
      continue;
    const wallets = standing(row, edge);
    if (wallets.size === 0) {
      others(edge, line, isOutcomeLine ? "outcome" : "context");
    } else if (isOutcomeLine && isOutcome(line.value)) {
      outcomes.set(key(line.termId), { edge, domain: null, form: "sibling", outcome: line.value, wallets, reasons: new Map, named: new Map });
    } else {
      contexts.set(key(line.termId), { edge, domain: line.value, wallets });
    }
  }
  const onContext = pass(await qualifiers([...contexts.keys()], [config.hasOutcome]));
  for (const row of onContext) {
    const line = parts(row);
    const context = line.subjectId === null ? undefined : contexts.get(key(line.subjectId));
    if (context === undefined || line.value === null || line.termId === null || !isOutcome(line.value))
      continue;
    const wallets = standing(row, context.edge, context.wallets);
    if (wallets.size === 0) {
      others(context.edge, line, "outcome");
    } else {
      outcomes.set(key(line.termId), { edge: context.edge, domain: context.domain, form: "nested", outcome: line.value, wallets, reasons: new Map, named: new Map });
    }
  }
  const reading = (predicate) => predicate !== undefined;
  const failures = [...outcomes.entries()].filter(([, found]) => found.outcome === "failed").map(([id]) => id);
  const worked = [...outcomes.entries()].filter(([, found]) => found.outcome === "worked").map(([id]) => id);
  const withId = config.with;
  const onOutcome = pass(await qualifiers(reading(withId) ? [...failures, ...worked] : failures, [config.because, ...reading(withId) ? [withId] : []]));
  const reasonTerms = new Map;
  const addName = (found, wallets, name) => {
    for (const wallet of wallets) {
      const given = found.named.get(wallet) ?? [];
      if (!given.includes(name))
        given.push(name);
      found.named.set(wallet, given);
    }
  };
  for (const row of onOutcome) {
    const line = parts(row);
    const found = line.subjectId === null ? undefined : outcomes.get(key(line.subjectId));
    if (found === undefined || line.value === null || line.predicateId === null)
      continue;
    if (withId !== undefined && key(line.predicateId) === key(withId)) {
      if (found.outcome !== "worked" || needKindOf3(line.value) === null)
        continue;
      const wallets2 = standing(row, found.edge, found.wallets);
      if (wallets2.size === 0)
        others(found.edge, line, "with");
      addName(found, wallets2, line.value);
      continue;
    }
    if (found.outcome !== "failed" || !isReason(line.value))
      continue;
    const wallets = standing(row, found.edge, found.wallets);
    if (wallets.size === 0)
      others(found.edge, line, "reason");
    for (const wallet of wallets) {
      const given = found.reasons.get(wallet) ?? [];
      if (!given.includes(line.value))
        given.push(line.value);
      found.reasons.set(wallet, given);
    }
    if (line.termId !== null && wallets.size > 0 && needKindOfReason3(line.value) !== null) {
      reasonTerms.set(key(line.termId), { found, reason: line.value, wallets });
    }
  }
  const needsId = config.needs;
  if (reading(needsId)) {
    const onReason = pass(await qualifiers([...reasonTerms.keys()], [needsId]));
    for (const row of onReason) {
      const line = parts(row);
      const reason = line.subjectId === null ? undefined : reasonTerms.get(key(line.subjectId));
      if (reason === undefined || line.value === null)
        continue;
      const kind = needKindOf3(line.value);
      if (kind === null || kind !== needKindOfReason3(reason.reason))
        continue;
      const wallets = standing(row, reason.found.edge, reason.wallets);
      if (wallets.size === 0)
        others(reason.found.edge, line, "needs");
      addName(reason.found, wallets, line.value);
    }
  }
  for (const { edge, domain, wallets } of contexts.values()) {
    for (const wallet of wallets)
      edge.declarers.get(wallet)?.domains.push(domain);
  }
  const ordered = [...outcomes.values()].sort((a, b) => Number(b.form === "nested") - Number(a.form === "nested"));
  for (const found of ordered) {
    for (const wallet of found.wallets) {
      const declaration = found.edge.declarers.get(wallet);
      if (declaration === undefined)
        continue;
      const reasons = found.reasons.get(wallet) ?? [];
      const named = found.named.get(wallet) ?? [];
      const field = found.outcome === "failed" ? "needs" : "with";
      if (!declaration.outcomes.includes(found.outcome))
        declaration.outcomes.push(found.outcome);
      const domains = found.form === "nested" ? [found.domain] : declaration.domains.length > 0 ? declaration.domains : [null];
      for (const domain of domains) {
        const same = declaration.lines.find((line) => line.domain === domain && line.outcome === found.outcome);
        if (same === undefined) {
          declaration.lines.push({ domain, outcome: found.outcome, reasons, form: found.form, ...named.length === 0 ? {} : { [field]: named } });
        } else {
          same.reasons = [...new Set([...same.reasons, ...reasons])];
          if (named.length > 0)
            same[field] = [...new Set([...same[field] ?? [], ...named])];
        }
      }
    }
  }
  for (const { tool, declarers } of edges.values()) {
    const rows = [...declarers.values()].filter((row, at) => at === 0 || row.domains.length > 0 || row.lines.length > 0);
    out.get(tool)?.declarations.push(...rows);
  }
  for (const usage of out.values()) {
    usage.truncated = truncated;
    usage.agents = new Set(usage.declarations.map((declaration) => key(declaration.agent.atomId))).size;
    usage.wallets = new Set(usage.declarations.map((declaration) => key(declaration.writer)).filter((wallet) => !payers.has(wallet))).size;
    for (const declaration of usage.declarations) {
      for (const domain of declaration.domains)
        usage.byDomain[domain] = (usage.byDomain[domain] ?? 0) + 1;
      for (const outcome of declaration.outcomes)
        usage.byOutcome[outcome] = (usage.byOutcome[outcome] ?? 0) + 1;
      for (const reason of new Set(declaration.lines.flatMap((line) => line.reasons))) {
        usage.byReason[reason] = (usage.byReason[reason] ?? 0) + 1;
      }
      const byNeed = usage.byNeed ??= {};
      for (const name of new Set(declaration.lines.flatMap((line) => line.needs ?? [])))
        byNeed[name] = (byNeed[name] ?? 0) + 1;
      const byWith = usage.byWith ??= {};
      for (const name of new Set(declaration.lines.flatMap((line) => line.with ?? [])))
        byWith[name] = (byWith[name] ?? 0) + 1;
    }
  }
  return out;
}

// ../../packages/protocol/src/failure-lines.ts
function skillUrlOf2(source, skill) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(source))
    return null;
  const name = skill.split(":").pop() ?? skill;
  const url = `https://github.com/${source}?skill=${encodeURIComponent(name)}`;
  return skillRefFromUrl3(url) === null ? null : url;
}
function skillAtom(url, sha256) {
  const thing = toolThing2(url);
  return { uri: thingUriOfDigest(sha256(thingDocument2(thing))), label: thing.name };
}
async function readSkillLines(atomUri, config) {
  const words = [HAS_OUTCOME_LABEL3, BECAUSE_LABEL3, NEEDS_LABEL3, WITH_LABEL3];
  const atoms = await findToolAtoms2([atomUri, ...words], config);
  const tool = atoms.get(atomUri);
  const hasOutcome = atoms.get(HAS_OUTCOME_LABEL3);
  const because = atoms.get(BECAUSE_LABEL3);
  if (tool === undefined || hasOutcome === undefined || because === undefined)
    return null;
  const needs = atoms.get(NEEDS_LABEL3);
  const withId = atoms.get(WITH_LABEL3);
  const usage = await getPulseUsage2([tool], {
    ...config,
    hasOutcome,
    because,
    ...needs === undefined ? {} : { needs },
    ...withId === undefined ? {} : { with: withId }
  });
  return usage.get(tool.toLowerCase()) ?? null;
}
function counted(counts) {
  return [...counts.entries()].sort(([a, x], [b, y]) => y.size - x.size || a.localeCompare(b)).map(([name, wallets]) => `${name} (${wallets.size})`).join(", ");
}
var plural2 = (n) => `${n} wallet${n === 1 ? "" : "s"}`;
function linesSentence(usage, label, where) {
  if (usage === null)
    return null;
  const parts = [];
  for (const outcome of ["failed", "worked"]) {
    const wallets = new Set;
    const because = new Map;
    const named = new Map;
    const add = (to, name, wallet) => to.set(name, (to.get(name) ?? new Set).add(wallet));
    for (const row of usage.declarations) {
      const wallet = row.writer.toLowerCase();
      for (const line of row.lines) {
        if (line.outcome !== outcome)
          continue;
        wallets.add(wallet);
        for (const reason of line.reasons)
          add(because, reason, wallet);
        for (const name of (outcome === "failed" ? line.needs : line.with) ?? [])
          add(named, name, wallet);
      }
    }
    if (wallets.size === 0)
      continue;
    const detail = [
      ...because.size === 0 ? [] : [`because ${counted(because)}`],
      ...named.size === 0 ? [] : [`${outcome === "failed" ? "needs" : "with"} ${counted(named)}`]
    ];
    parts.push([`${usage.truncated ? "at least " : ""}${plural2(wallets.size)} wrote ${outcome}`, ...detail].join(" · "));
  }
  if (parts.length === 0)
    return null;
  return `ARP, lines agents wrote on ${label} (${where}): ${parts.join("; ")}.`;
}
// ../../data/deployments/13579.json
var _13579_default = {
  chain: {
    name: "Intuition Testnet",
    chainId: 13579,
    chainIdHex: "0x350b",
    nativeCurrency: {
      name: "Test Trust",
      symbol: "tTRUST",
      decimals: 18
    },
    rpcUrl: "https://testnet.rpc.intuition.systems/http",
    explorerUrl: "https://testnet.explorer.intuition.systems",
    graphqlUrl: "https://testnet.intuition.sh/v1/graphql",
    _source: [
      "Intuition skill: .claude/skills/intuition/SKILL.md (table at line 149, Viem chain config at line 184)",
      "MetaMask deployments: ~/Project/metamask-smart-accounts-kit/packages/delegation-deployments/src/index.ts (CHAIN_ID.intuitionTestnet = 0x350b)"
    ]
  },
  intuition: {
    _source: ".claude/skills/intuition/SKILL.md line 152",
    multiVault: "0x2Ece8D4dEdcB9918A398528f3fa4688b1d2CAB91"
  },
  metamaskDelegationFramework: {
    version: "1.3.0",
    _source: "MetaMask deployments package (~/Project/metamask-smart-accounts-kit/packages/delegation-deployments/src/contractAddresses.ts → DEPLOYMENTS_1_3_0). All addresses are deterministic CREATE2 — same value on every chain MetaMask supports. Intuition Testnet (chainId 0x350b) is explicitly mapped to DEPLOYMENTS_1_3_0 at packages/delegation-deployments/src/index.ts line 148.",
    delegationManager: "0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    simpleFactory: "0x69Aa2f9fe1572F1B640E1bbc512f5c3a734fc77c",
    implementations: {
      hybridDeleGator: "0x48dBe696A4D990079e039489bA2053B36E8FFEC4",
      multiSigDeleGator: "0x56a9EdB16a0105eb5a4C54f4C062e2868844f3A7",
      eip7702StatelessDeleGator: "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B"
    },
    enforcers: {
      _note: "Standard caveat enforcers. ARP composes its custom DomainScopeEnforcer + TrustStakeCapEnforcer alongside a subset of these.",
      allowedCalldata: "0xc2b0d624c1c4319760C96503BA27C347F3260f55",
      allowedMethods: "0x2c21fD0Cb9DC8445CB3fb0DC5E7Bb0Aca01842B5",
      allowedTargets: "0x7F20f61b1f09b08D970938F6fa563634d65c4EeB",
      approvalRevocation: "0xe264F1f09A19505a1ca1a86D5b01E8bFdb64324A",
      blockNumber: "0x5d9818dF0AE3f66e9c3D0c5029DAF99d1823ca6c",
      deployed: "0x24ff2AA430D53a8CD6788018E902E098083dcCd2",
      erc20BalanceChange: "0xcdF6aB796408598Cea671d79506d7D48E97a5437",
      erc20TransferAmount: "0xf100b0819427117EcF76Ed94B358B1A5b5C6D2Fc",
      erc20PeriodTransfer: "0x474e3Ae7E169e940607cC624Da8A15Eb120139aB",
      erc20Streaming: "0x56c97aE02f233B29fa03502Ecc0457266d9be00e",
      erc721BalanceChange: "0x8aFdf96eDBbe7e1eD3f5Cd89C7E084841e12A09e",
      erc721Transfer: "0x3790e6B7233f779b09DA74C72b6e94813925b9aF",
      erc1155BalanceChange: "0x63c322732695cAFbbD488Fc6937A0A7B66fC001A",
      exactCalldataBatch: "0x982FD5C86BBF425d7d1451f974192d4525113DfD",
      exactCalldata: "0x99F2e9bF15ce5eC84685604836F71aB835DBBdED",
      exactExecutionBatch: "0x1e141e455d08721Dd5BCDA1BaA6Ea5633Afd5017",
      exactExecution: "0x146713078D39eCC1F5338309c28405ccf85Abfbb",
      id: "0xC8B5D93463c893401094cc70e66A206fb5987997",
      logicalOrWrapper: "0xE1302607a3251AF54c3a6e69318d6aa07F5eB46c",
      limitedCalls: "0x04658B29F6b82ed55274221a06Fc97D318E25416",
      nativeBalanceChange: "0xbD7B277507723490Cd50b12EaaFe87C616be6880",
      argsEqualityCheck: "0x44B8C6ae3C304213c3e298495e12497Ed3E56E41",
      nativeTokenPayment: "0x4803a326ddED6dDBc60e659e5ed12d85c7582811",
      nativeTokenTransferAmount: "0xF71af580b9c3078fbc2BBF16FbB8EEd82b330320",
      nativeTokenStreaming: "0xD10b97905a320b13a0608f7E9cC506b56747df19",
      nativeTokenPeriodTransfer: "0x9BC0FAf4Aca5AE429F4c06aEEaC517520CB16BD9",
      nonce: "0xDE4f2FAC4B3D87A1d9953Ca5FC09FCa7F366254f",
      ownershipTransfer: "0x7EEf9734E7092032B5C56310Eb9BbD1f4A524681",
      redeemer: "0xE144b0b2618071B4E56f746313528a669c7E65c5",
      specificActionERC20TransferBatch: "0x6649b61c873F6F9686A1E1ae9ee98aC380c7bA13",
      timestamp: "0x1046bb45C8d673d4ea75321280DB34899413c069",
      valueLte: "0x92Bf12322527cAA612fd31a0e810472BBB106A8F",
      multiTokenPeriod: "0xFB2f1a9BD76d3701B730E5d69C3219D42D80eBb7"
    }
  },
  arp: {
    endpointBinding: {
      _note: "Task 39c, ADR 0094/0095. The two predicates the endpoint binding is written with: (agent identity atom) has endpoint (endpoint atom), and (pinned binding document) in context of (that triple). Both READ FROM THE GRAPH, neither minted by ARP: scripts/measure/endpoint-predicate.ts, run 2026-10-30, found `has endpoint` (Thing, 6 triples) and `in context of` (Thing, 29 triples) on testnet 13579, and none of `reachable at`, `is reachable at`, `served at`, `hosted at`. `in context of` differs from mainnet's 0x892054b0… (scripts/measure/nested-triples.ts), so never copy it across chains.",
      measuredAt: "2026-10-30",
      hasEndpoint: "0xa4488686eb3702e4e972a971ea008d6832a7f935b942366f1091566d1993a5f1",
      inContextOf: "0x61a88b9c372c0d164d2caf66947b67ed0fcb4c457178a271b6b3dc39fb1f8862"
    },
    _note: "Written by scripts/deploy/deploy.sh --broadcast. Addresses are EOA-nonce-derived (CREATE). deploy.sh skips a contract whose address here already has code unless --force, and on a redeploy keeps the replaced address under <name>V<n>. ModuleRegistry and DomainScopeEnforcer were removed from src/ in 59ac83a; their entries are the record.",
    deployer: "0xE596096F4176b682E300d73963e7B04B383C1AA1",
    deployedAt: "2026-06-01T13:30:00Z",
    moduleRegistry: "0xc9a2f66775828017e984E8be077fA2d17e0A41F4",
    moduleRegistryV1: "0x777C28eCb4688D647B535098d11fB87A9746334f",
    _moduleRegistryNote: "Redeployed 2026-06-03 with schemaURI uniqueness (ADR 0013). V1 address kept for historical reference; orphan (UI reads V2).",
    domainScopeEnforcer: "0x516B82E29e3Ca46Ca810FC2EEf348932b198f7f9",
    trustStakeCapEnforcer: "0x19e07280F1483Aa9aCDb1a7F8C61bfd20c7879Bc",
    identityRegistry: "0xC165A2AD2E540A4069E02834009161E2b4490d5A",
    sponsor: "0x77939A4c276f3E549276CEB3A09CDa1fF58b7ec9",
    sponsorV1: "0xE596096F4176b682E300d73963e7B04B383C1AA1",
    _sponsorNote: "The address ARP's sponsoring service sends from on 13579 (apps/sponsor, ADR 0092, 0094). Since 2026-11-09 a key of its own, for the hosted service (task 78, ADR 0149): sponsorV1 is the deployer's key, which sent for it before and also holds mainnet funds. Not a contract: an EOA whose key is a file mounted into the service's container, never read by an agent. Before 2026-11-09: The address ARP's sponsoring service sends from on 13579 (apps/sponsor, ADR 0092, 0094): its GET / answered this on 2026-11-02. /tools counts every deposit it sent in Usage: the proof-gated ones, the edge creations it paid for, and, because the address is also ARP's deployer, 3 deposits written before the service existed (scripts/measure/sponsor-deposit-provenance.ts, 2026-11-03). Not a contract: an EOA whose key is in a 0600 file the agent never reads.",
    deployedTxs: {
      moduleRegistry: "0x6ee4f4d76dd55c69ea434f8c3c204cb6149df1c588910b1792db1650681fbc2e",
      moduleRegistryV1: "0x02abe9a0c598df131995bc40927a4e0be0b86e7bdbfe747cfdf37fb19b069634",
      domainScopeEnforcer: "0x6ca2c4e680b45eaa37147c2458bd38d756e6ffabb560755657cc9caf893df272",
      trustStakeCapEnforcer: "0x8dd54ea3eeba14645531c501c3f1b8ec95e6a95788825e00fbe239ff32263159",
      identityRegistry: "0x60b1f6ff7dbdcbca6864794eb9c5cf1e3ba94770daac6d2e77a4df00d726900c",
      trustStakeCapEnforcerV1: "0x80e36828202a9c7606b92146076ed123155a94cfda3a2ab53013bd27be71764f"
    },
    explorerLinks: {
      moduleRegistry: "https://testnet.explorer.intuition.systems/address/0xc9a2f66775828017e984E8be077fA2d17e0A41F4",
      moduleRegistryV1: "https://testnet.explorer.intuition.systems/address/0x777C28eCb4688D647B535098d11fB87A9746334f",
      domainScopeEnforcer: "https://testnet.explorer.intuition.systems/address/0x516B82E29e3Ca46Ca810FC2EEf348932b198f7f9",
      trustStakeCapEnforcer: "https://testnet.explorer.intuition.systems/address/0x19e07280F1483Aa9aCDb1a7F8C61bfd20c7879Bc",
      identityRegistry: "https://testnet.explorer.intuition.systems/address/0xC165A2AD2E540A4069E02834009161E2b4490d5A",
      trustStakeCapEnforcerV1: "https://testnet.explorer.intuition.systems/address/0x7BB56819E9a413B8B4668C5cAF5C494c41dC0F8E"
    },
    modules: [
      {
        id: "1",
        name: "Solidity Audit",
        domain: "solidity-audit",
        schemaURI: "ipfs://bafkreiembmtprqzufrdkvig74lskv6iazuatblm4hwmtxkf5a3v67mkdkm",
        creator: "0xE596096F4176b682E300d73963e7B04B383C1AA1",
        tx: "0xbd97979b197e4423293180e36d69f72e8eb07d2bb11bdfb2940ec918d6f6af3c"
      }
    ],
    intuitionAtoms: [
      {
        atomId: "0xde8890fca8dde322ca57bce0e20dfeb23be67332f9101305ebe72facdee032dc",
        uri: "ipfs://bafkreiembmtprqzufrdkvig74lskv6iazuatblm4hwmtxkf5a3v67mkdkm",
        tx: "0x97db7629c6c973d43c0c62325754d750ee262853bdbd87496b4b82c1ea3d0ac7"
      }
    ],
    rigAgents: {
      _note: "Task 24. ERC-8004 agents on ARP's own testnet registry, minted 2026-10-19 on chain 13579. SIGNED BY THE AGENT SESSION using the operator's PRIVATE_KEY from .env, on the user's explicit authorisation — not by a human at a keyboard. See ADR 0037. security.md scopes its automation prohibition to mainnet, so this is permitted and was previously unwritten. Agents 1 and 2 were left with an EMPTY tokenURI deliberately: no-token-uri is 23% of the real cohort (32/140, scripts/measure/cohort-endpoints.ts), so they exercise a branch the three new agents cannot. Permanent: the ids are taken and setAgentURI leaves the superseded URI in the mint transaction's calldata.",
      registry: "0xC165A2AD2E540A4069E02834009161E2b4490d5A",
      agents: {
        "3": {
          slug: "rig-confirmed",
          exercises: "confirmed/serves-declared-protocol + tools/list recovery",
          endpoint: "http://localhost:3002/mcp",
          _endpointNote: "ARP's own MCP server, local by default. ARP_MCP_ENDPOINT regenerates the file and setAgentURI can update the agent — but that escape hatch is a rehearsal prop: portability.md rule 4 says any step that works because ARP can write to the registry is not a step, and on mainnet ARP owns no registry. The real fix is a public endpoint.",
          tx: "0xce4fee69c692ddf57d4537b23479d78384a9e2d06b733b532e419055ed50a086",
          documentSha256_16: "478ac85cd6b2357f",
          _documentShaNote: "sha256 of the data: URI, first 16 hex. Lets repo-vs-chain drift be detected: the fixtures in scripts/seed/rig-registration-files.ts are the source of truth for three permanent mints, and an edit to FILES would otherwise diverge silently. Checked by scripts/verify/verify-rig-claims.ts against a gate report. ONLY REPRODUCIBLE WITH ARP_MCP_ENDPOINT UNSET: OWN_ENDPOINT reads the environment and the document is hashed after substitution, so anyone with it exported sees a false DRIFT."
        },
        "4": {
          slug: "rig-dead",
          exercises: "confirmed/dead",
          endpoint: "http://192.0.2.1/mcp",
          _endpointNote: "TEST-NET-1, RFC 5737 — reserved and never routable, so it always times out. A .invalid hostname was tried first and gave inconclusive/transport-error, because a DNS failure is indistinguishable from our own network being down.",
          tx: "0x87bf71cf0ce55db7f82ca617b8601ee87f870e67018b1097a311ed2d61cc7378",
          uriUpdatedTx: "0x8f5950a61fca19b6a3f69b26f6c4159e29833689ed4b1623d8610206bfe87100",
          documentSha256_16: "6db8b769dd551e98"
        },
        "5": {
          slug: "rig-unprobeable",
          exercises: "not-checkable ×2 — templated and non-http-identifier. Never a defect.",
          tx: "0x859aff609fa10dba635ffd12d0b60b598c7c3174238f61962edb4b5eee1a0efd",
          documentSha256_16: "f61a9d7f6637958e"
        }
      },
      gate: {
        command: "bun run scripts/verify/verify-cohort.ts --target intuition-testnet --ids 1,2,3,4,5 --tools --out /tmp/gate.json && bun run scripts/verify/verify-rig-claims.ts /tmp/gate.json",
        ranAt: "2026-10-19",
        result: "5 agents: 2 with no tokenURI (40%), 3 read. 4 endpoints: 2 confirmed (serves-declared-protocol, dead), 2 not-checkable (templated, non-http-identifier), 0 inconclusive, 1 capability list recovered (arp_tool_reputation).",
        _requires: "apps/mcp/src/server.ts listening on :3002, or agent 3 reports inconclusive. The confirmed branch is therefore reproducible only on a host running that server — a known limit of this gate until ARP has a public endpoint.",
        _widerThanSpecced: "--ids 1,2,3,4,5 rather than 3,4,5. Including the two empty-tokenURI agents exercises a fifth branch for two extra requests.",
        _claimsCheck: "verify-rig-claims.ts asserts each fixture's `exercises` prose against the outcome the probe observed, and the document hashes against this file. The unit suite CANNOT close that class: confirmed and inconclusive are both probeable before a request is sent, and the mutation that actually shipped lived exactly there."
      }
    },
    trustStakeCapEnforcerV1: "0x7BB56819E9a413B8B4668C5cAF5C494c41dC0F8E",
    delegationRegister: {
      _note: "Task 37c, ADR 0092 item 7. The two predicates a published delegation is written with: (delegator CAIP-10) delegate to (delegate CAIP-10), and (pinned document) in context of (that triple). Both READ FROM THE GRAPH, neither minted by ARP: on testnet 13579 on 2026-11-03 exactly one atom carries each label, a Thing, `delegate to` in 10 triples and `in context of` in 29. `in context of` is the one endpointBinding uses. Never copy either across chains.",
      measuredAt: "2026-11-03",
      delegateTo: "0xb56980d42a3b03455bf41ea20fe04ae223fca0b9e688994dc661414e81e6433b",
      inContextOf: "0x61a88b9c372c0d164d2caf66947b67ed0fcb4c457178a271b6b3dc39fb1f8862"
    }
  }
};

// ../hook/src/skill-failure.ts
import { existsSync, mkdirSync as mkdirSync2, readFileSync as readFileSync2 } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { dirname as dirname2, join as join3 } from "node:path";

// ../../packages/protocol/src/declare/label.ts
function normaliseCategoryLabel2(raw) {
  return raw.normalize("NFKC").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}

// ../../packages/protocol/src/domain-words.ts
function tokens(text) {
  return normaliseCategoryLabel2(text).split(/[^a-z0-9]+/).filter((t) => t.length > 1);
}
function domainInText2(text, words) {
  const padded = ` ${tokens(text).join(" ")} `;
  const hit = (phrase) => padded.includes(` ${tokens(phrase).join(" ")} `);
  const label = [...words.labels].filter((l) => tokens(l).length > 0 && hit(l)).sort((a, b) => b.length - a.length)[0];
  if (label !== undefined)
    return label;
  const alias = Object.keys(words.aliases).filter((a) => words.labels.includes(words.aliases[a]) && hit(a)).sort((a, b) => b.length - a.length)[0];
  return alias === undefined ? null : words.aliases[alias];
}
// ../../data/catalogue/domain-aliases.json
var domain_aliases_default = {
  _note: "Words a person or an agent uses, mapped to a node of ARP's domain tree (OASF 1.1.0 names, plus ARP's own `design`), task 84. Read locally by the MCP server, the CLI and the hook: the words never leave the machine (the user, 2026-11-09), except for a caller who chooses ARP's hosted read-only endpoint, which receives its words and keeps none (ADR 0161). Every target is checked against data/catalogue/oasf-1.1.0-skills.json by packages/protocol/test/domain-words.test.ts. ARP's old category words map to the one node that held them; the split ones (method, quality) have no alias, and a refusal suggests nodes instead.",
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
  _note: "For the hook's failure record, which reads no network (task 84): the nodes of ARP's testnet tree as written by task 79 (data/catalogue/oasf-tree-13579.json), and the node each skill name is filed at, when the name is filed at one node only. Built by scripts/build/build-skill-nodes.ts from data/catalogue/oasf-skill-tags-proposal-13579.json, rows not reviewed out.",
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
var PROGRAM_IN_ERROR = [
  /(?:^|[\s:])([^\s:'"`]+): (?:command )?not found\b/gim,
  /command not found: ([^\s'"`]+)/gi,
  /\bexec(?:utable)?:? "?([^\s"]+)"?: executable file not found/gi,
  /\bspawn ([^\s'"`]+) ENOENT\b/gi,
  /No module named '?([A-Za-z0-9_.-]+)'?/g,
  /Cannot find module '([^']+)'/g,
  /(?:^|\s)'?([^\s'"`]+)'? is not installed\b/gim
];
var KEY_IN_ERROR = [
  /\b([A-Z][A-Z0-9_]{2,63})\b[^=\n]{0,30}\b(?:not set|missing|required|unset|is empty)\b/g,
  /\b(?:set|export|provide|missing|define)\s+(?:the\s+)?(?:environment variable\s+)?\$?([A-Z][A-Z0-9_]{2,63})\b/gi,
  /\$?\b([A-Z][A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|ACCESS_KEY)[A-Z0-9_]*)\b/g
];
function needOf(reason, text, markdown) {
  const kind = reason === "missing-program" ? "program" : reason === "missing-key" ? "key" : null;
  if (kind === null)
    return null;
  for (const pattern of kind === "program" ? PROGRAM_IN_ERROR : KEY_IN_ERROR) {
    for (const match of text.matchAll(pattern)) {
      const named = match[1] ?? "";
      const name = kind === "program" ? (named.split("/").pop() ?? "").toLowerCase() : named;
      const kept = publishableNeed3(name, markdown, kind);
      if (kept !== null)
        return kept;
    }
  }
  return null;
}
var RUNNERS2 = new Set(["bash", "bun", "bunx", "node", "npx", "python", "python3", "sh", "uv", "uvx", "zsh"]);
function programsOf(command) {
  const found = [];
  for (const part of command.split(/&&|\|\||[;|\n]/)) {
    const words = part.trim().split(/\s+/).filter((word) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(word));
    const first2 = words[0];
    if (first2 === undefined || first2 === "")
      continue;
    const program = first2.split("/").pop() ?? first2;
    if (!RUNNERS2.has(program)) {
      found.push(program);
      continue;
    }
    const target = words.slice(1).find((word) => !word.startsWith("-") && word !== "run");
    if (target !== undefined)
      found.push(target.split("/").pop() ?? target);
  }
  return found;
}
var escaped2 = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function askedBySkill(command, markdown, directory) {
  if (new RegExp(`${escaped2(directory)}(?=[/\\s'"]|$)`).test(command))
    return true;
  const { cli, runs } = readRequires(markdown);
  const named = new Set([...cli, ...runs]);
  return programsOf(command).some((program) => named.has(program) || program.includes(".") && new RegExp(`(?:^|[\\s\`'"/(])${escaped2(program)}(?=[\\s\`'")]|$)`, "m").test(markdown));
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
function contextOf(words, skill) {
  return domainInText2(words, WORDS) ?? SKILL_NODE[skill.split(":").pop() ?? skill] ?? null;
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
    return null;
  const command = call.input?.["command"];
  if (typeof command !== "string")
    return null;
  const reason = failureReason(failureText(call));
  if (reason === null)
    return null;
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
      const domain = search?.domain ?? contextOf(words, skill.name);
      const need = needOf(reason, failureText(call), markdown);
      const line = {
        at: new Date().toISOString(),
        session: call.session,
        skill: skill.name,
        source: skill.source ?? search?.source ?? installedSource(skill.name.split(":").pop() ?? skill.name, cwd),
        ...domain === null ? {} : { domain },
        reason,
        ...need === null ? {} : { need }
      };
      return appendFailure(line) ? line : null;
    }
  } catch {}
  return null;
}

// ../hook/src/failure-answer.ts
var ANSWER_MS = 3000;
var WHERE = "Intuition testnet 13579";
var IN_CONTEXT_OF = _13579_default.arp.endpointBinding.inContextOf;
var PAYERS = [_13579_default.arp.deployer, _13579_default.arp.sponsor];
var sha256 = (text) => createHash("sha256").update(text, "utf8").digest();
async function answerFailure(failure, env = process.env, fetcher) {
  if (env["ARP_FAILURE_LINES"] === "off" || failure.source === null)
    return null;
  const url = skillUrlOf2(failure.source, failure.skill);
  if (url === null)
    return null;
  const { uri, label } = skillAtom(url, sha256);
  const graphqlUrl = env["INTUITION_GRAPHQL_URL"] ?? _13579_default.chain.graphqlUrl;
  let timer;
  const late = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), ANSWER_MS);
  });
  const read = readSkillLines(uri, {
    graphqlUrl,
    inContextOf: IN_CONTEXT_OF,
    payers: PAYERS,
    timeoutMs: ANSWER_MS,
    ...fetcher === undefined ? {} : { fetch: fetcher }
  }).then((usage) => linesSentence(usage, label, WHERE)).catch(() => null);
  try {
    return await Promise.race([read, late]);
  } finally {
    clearTimeout(timer);
  }
}
function failureOutput(context) {
  return JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUseFailure", additionalContext: context } });
}
var RECORD = Symbol("record");
async function postToolUseFailure(payload) {
  const call = toolCallOf(payload);
  if (call === null || call.tool !== "Bash")
    return RECORD;
  const failure = recordSkillFailure(call, call.cwd ?? process.cwd());
  const context = failure === null ? null : await answerFailure(failure);
  return context === null ? null : failureOutput(context);
}

// ../hook/src/worked.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync3, readFileSync as readFileSync3 } from "node:fs";
import { dirname as dirname3, join as join4 } from "node:path";

// ../../packages/protocol/src/local-outcomes.ts
var OUTCOME_ANSWERS2 = ["worked", "failed", "unsure"];
function isOutcomeAnswer2(word) {
  return OUTCOME_ANSWERS2.includes(word);
}
var ANSWER = /^[\s>*`-]*arp:\s*([A-Za-z0-9._:@/-]+)\s+(worked|failed|unsure)[\s.`*]*$/gim;
function answersIn2(text, asked) {
  const found = new Map;
  for (const match of text.matchAll(ANSWER)) {
    const [, skill, word] = match;
    if (skill === undefined || word === undefined)
      continue;
    const answer = word.toLowerCase();
    if (!asked.includes(skill) || found.has(skill) || !isOutcomeAnswer2(answer))
      continue;
    found.set(skill, answer);
  }
  return found;
}

// ../hook/src/worked.ts
var MAX_ASKED = 5;
function isRecord5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var field = (raw, snake, camel) => raw[snake] ?? raw[camel];
var text = (value) => typeof value === "string" && value.length > 0 ? value : null;
function stopInputOf(raw) {
  if (!isRecord5(raw) || field(raw, "hook_event_name", "hookEventName") !== "Stop")
    return null;
  const session = text(field(raw, "session_id", "sessionId"));
  if (session === null)
    return null;
  return {
    session,
    cwd: text(raw["cwd"]) ?? process.cwd(),
    active: field(raw, "stop_hook_active", "stopHookActive") === true,
    last: text(field(raw, "last_assistant_message", "lastAssistantMessage")) ?? "",
    transcript: text(field(raw, "transcript_path", "transcriptPath"))
  };
}
function questionFor(skills) {
  return "ARP asks once per skill: did each skill you used here do its job, and did the task finish with it? " + "Reply with one line per skill and nothing else: `arp: <skill> worked`, `arp: <skill> failed` or `arp: <skill> unsure`. " + `Kept on this machine unless \`arp share\` is on. Skills: ${skills.join(", ")}`;
}
var isArpsOwn = (name) => name === "arp" || name.endsWith(":arp");
function rows(path) {
  if (!existsSync2(path))
    return [];
  const found = [];
  for (const line of readFileSync3(path, "utf8").split(`
`)) {
    if (line.trim() === "")
      continue;
    try {
      const row = JSON.parse(line);
      if (isRecord5(row))
        found.push(row);
    } catch {}
  }
  return found;
}
function withOf(skill, source, cwd, before) {
  const name = skill.split(":").pop() ?? skill;
  let need = null;
  let latest = "";
  for (const row of rows(join4(arpHome(), "failures.jsonl"))) {
    const { skill: rowSkill, source: rowSource, need: rowNeed, at } = row;
    if (typeof rowSkill !== "string" || typeof rowNeed !== "string" || typeof at !== "string")
      continue;
    if (rowSkill !== skill && rowSkill !== name && !rowSkill.endsWith(`:${name}`))
      continue;
    if (typeof rowSource === "string" && source !== null && rowSource !== source)
      continue;
    if (at > before || at < latest)
      continue;
    need = rowNeed;
    latest = at;
  }
  if (need === null)
    return null;
  const directory = skillDirectory(name, cwd);
  if (directory === null)
    return null;
  return publishableNeed3(need, readFileSync3(join4(directory, "SKILL.md"), "utf8"));
}
function record(input, asked, outcome, at) {
  const search = foundBySearch(input.cwd, input.session, asked.skill);
  const words = input.transcript !== null && existsSync2(input.transcript) ? lastUserWords(readFileSync3(input.transcript, "utf8")) : "";
  const domain = search?.domain ?? contextOf(words, asked.skill);
  const source = asked.source ?? search?.source ?? installedSource(asked.skill.split(":").pop() ?? asked.skill, input.cwd);
  const named = outcome === "worked" ? withOf(asked.skill, source, input.cwd, at) : null;
  const line = {
    at,
    session: input.session,
    skill: asked.skill,
    source,
    ...domain === null ? {} : { domain },
    outcome,
    ...named === null ? {} : { with: named }
  };
  appendOwn(join4(arpHome(), "outcomes.jsonl"), `${JSON.stringify(line)}
`);
}
async function stop(payload) {
  const input = stopInputOf(payload);
  if (input === null)
    return null;
  const ask = onStop(input);
  return ask === null ? null : JSON.stringify(ask);
}
function onStop(input, now = new Date) {
  try {
    const home = arpHome();
    mkdirSync3(home, { recursive: true });
    const askedPath = join4(home, "asked.jsonl");
    const asked = rows(askedPath).flatMap((row) => row["session"] === input.session && typeof row["skill"] === "string" ? [{
      at: typeof row["at"] === "string" ? row["at"] : "",
      session: input.session,
      skill: row["skill"],
      source: typeof row["source"] === "string" ? row["source"] : null
    }] : []);
    const answered = new Set(rows(join4(home, "outcomes.jsonl")).flatMap((row) => row["session"] === input.session && typeof row["skill"] === "string" ? [row["skill"]] : []));
    const pending = asked.filter((row) => !answered.has(row.skill));
    const at = now.toISOString();
    for (const [skill, answer] of answersIn2(input.last, pending.map((row) => row.skill))) {
      const row = pending.find((entry) => entry.skill === skill);
      if (row !== undefined)
        record(input, row, answer, at);
    }
    if (input.active)
      return null;
    const known = new Set(asked.map((row) => row.skill));
    const log = process.env["ARP_SESSION_LOG"] ?? join4(input.cwd, ".arp", "session.jsonl");
    const fresh = [];
    for (const skill of skillsOfSession(log, input.session)) {
      if (known.has(skill.name) || isArpsOwn(skill.name))
        continue;
      known.add(skill.name);
      fresh.push({ at, session: input.session, skill: skill.name, source: skill.source });
    }
    const ask = fresh.slice(0, MAX_ASKED);
    if (ask.length === 0)
      return null;
    mkdirSync3(dirname3(askedPath), { recursive: true });
    appendOwn(askedPath, ask.map((row) => `${JSON.stringify(row)}
`).join(""));
    return { decision: "block", reason: questionFor(ask.map((row) => row.skill)) };
  } catch {
    return null;
  }
}

// ../hook/src/hook.ts
var ROUTES = {
  PreToolUse: (payload) => preToolUse(payload),
  PostToolUseFailure: (payload) => postToolUseFailure(payload),
  Stop: (payload) => stop(payload)
};
async function route(handler, payload) {
  let out = null;
  try {
    out = await handler(payload);
  } catch {
    out = null;
  }
  if (out === RECORD)
    return;
  if (out === null)
    process.exit(0);
  process.stdout.write(`${out}
`, () => process.exit(0));
  await new Promise(() => {
    return;
  });
}
function fetchedRefs(cwd) {
  const path = process.env["ARP_RECEIPTS"] ?? join5(cwd, ".arp", "receipts.jsonl");
  if (!existsSync3(path))
    return [];
  let text2;
  try {
    text2 = readFileSync4(path, "utf8");
  } catch {
    return [];
  }
  const rows2 = [];
  for (const line of text2.split(`
`)) {
    if (line.trim().length === 0)
      continue;
    try {
      const row = JSON.parse(line);
      if (typeof row.skill !== "string" || typeof row.atom !== "string")
        continue;
      rows2.push({
        skill: row.skill,
        atom: row.atom,
        url: typeof row.url === "string" ? row.url : "",
        at: typeof row.at === "string" ? row.at : ""
      });
    } catch {
      continue;
    }
  }
  return rows2;
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
function readString2(from, key) {
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
    const name = readString2(call.input, "skill");
    if (name === null)
      return null;
    const source = readString2(call.input, "source");
    return {
      kind: "skill",
      name,
      source,
      ref: readString2(call.input, "atom_id") ?? readString2(call.input, "tool_atom_id") ?? readString2(call.input, "url") ?? refForInvocation(name, source, fetched())
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
  capture(parsed, join5(homedir3(), ".arp", "captures"));
var event = eventOf(parsed);
var handler = event === null ? undefined : ROUTES[event];
if (handler !== undefined)
  await route(handler, parsed);
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
var own = join5(cwd, ".arp");
var path = process.env["ARP_SESSION_LOG"] ?? join5(own, "session.jsonl");
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
  mkdirSync4(dirname4(path), { recursive: true });
  if (dirname4(path) === own && lstatSync2(own).isSymbolicLink())
    throw new Error(`${own} is a symbolic link`);
  const ignore = join5(own, ".gitignore");
  if (dirname4(path) === own && !existsSync3(ignore))
    writeFileSync2(ignore, `*
`, { flag: "wx" });
  appendOwn(path, `${JSON.stringify(line)}
`);
} catch {}
