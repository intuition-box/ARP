/** The 8004 sieve (task 87): which ERC-8004 agents exist, which answer, which speak, which are used.
 *
 *      bun run scripts/measure/agent-sieve.ts --population registry --chain 8453 --count 500
 *      bun run scripts/measure/agent-sieve.ts --population registry --chain 8453 --ids 2340,22455
 *      bun run scripts/measure/agent-sieve.ts --population directory      # ARP's directory on 13579
 *      bun run scripts/measure/agent-sieve.ts --summary data/measurements/agent-sieve-8453-<stamp>.jsonl
 *      bun run scripts/measure/agent-sieve.ts --outreach data/measurements/agent-sieve-<…>.jsonl
 *      bun run scripts/measure/agent-sieve.ts --highest --chain 8453    # the population a sample is drawn from
 *
 *  Writes one JSON row per agent to `data/measurements/agent-sieve-<chain|directory>-<stamp>.jsonl`
 *  (`--out` to name it). **Resumable:** run it again with the same `--out` and the agents already in
 *  the file are skipped; an agent marked `couldNotSay` is retried with `--retry`, and `--ids` reads the
 *  named ones again. A redone agent's newest row is the one counted. The rung is
 *  `packages/protocol/src/sieve.ts`, and each row carries the request that proves it, so anyone can
 *  rerun it with one curl.
 *
 *  Read-only throughout: `tokenURI` and `ownerOf` on the registry, one GET of the registration file,
 *  one request per probeable endpoint (eight at most per agent, callable ones first), `getClients` on the ReputationRegistry
 *  and one `eth_getTransactionCount` per sampled reviewer, and two graph queries for the agent's atom
 *  and ARP's lines on it. Rung 5 needs a line from a wallet that is neither the agent's owner nor
 *  ARP's (`scripts/helpers/line-writers.ts`): on 2026-11-09 every line on an agent was ARP's own. Requests
 *  are serialised per host (`HostLimiter`), a 429 or 503 backs the host off and is never a verdict.
 *  Signs nothing, writes nothing on chain (the task forbids attesting from this).
 *
 *  ## The feedback split, and what it is not
 *
 *  ERC-8004 feedback is counted by **reviewer** (`getClients`), split in two and never summed into one
 *  figure: reviewers whose address has sent at most {@link FRESH_NONCE} transactions on that chain
 *  ("fresh": a wallet with no life outside the feedback it left) and the rest. This is a proxy, not the
 *  study's method (arXiv 2606.26028 clusters coordinated reviewers). Measured 2026-11-09 on agent
 *  8453:1380, 10 of its first 12 reviewers had sent 2 transactions each. At most `--feedback-sample`
 *  reviewers (40) are read per agent; `sampled` says how many, beside the total.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

import deployment from '../../data/deployments/13579.json';
import { highestTokenId } from '../helpers/erc8004-population.js';
import { OURS, USES } from '../helpers/line-writers.js';
import { fetchDocument, ownerOf, tokenUri, type Fetch } from '../helpers/registration-document.js';
import { resolveAgentAtom } from '../../packages/protocol/src/agent-pulse.ts';
import { createErc8004Client } from '../../packages/protocol/src/client.ts';
import { listAgents } from '../../packages/protocol/src/listing.ts';
import { intuitionSource } from '../../packages/protocol/src/sources/intuition/index.ts';
import {
  HostLimiter,
  isCallable,
  probeEndpoint,
  readDeclaredEndpoints,
  RUNG_NAMES,
  sieve,
  statedEmails,
  wilsonInterval,
  type DocumentOutcome,
  type Rung,
  type SievedEndpoint,
} from '../../packages/protocol/src/index.js';

const CANONICAL = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const REPUTATION = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';
const FRESH_NONCE = 3;
/** Probes per agent, callable endpoints first. Probeable endpoints past it are not recorded; emails are read from all. */
const MAX_ENDPOINTS = 8;

/** Where each identity chain is read. ERC-8004 is at the same address on each (CREATE2), ARP's own on 13579. */
const CHAINS: Record<number, { rpc: string; reputation: string | null }> = {
  8453: { rpc: process.env.BASE_RPC_URL ?? 'https://base-rpc.publicnode.com', reputation: REPUTATION },
  56: { rpc: 'https://bsc-rpc.publicnode.com', reputation: REPUTATION },
  1: { rpc: 'https://ethereum-rpc.publicnode.com', reputation: REPUTATION },
  196: { rpc: 'https://rpc.xlayer.tech', reputation: REPUTATION },
  13579: { rpc: 'https://testnet.rpc.intuition.systems/http', reputation: null },
};

// A committed JSON record; the field is optional and defaulted.
const GRAPHQL = (deployment as { graphqlUrl?: string }).graphqlUrl ?? 'https://testnet.intuition.sh/v1/graphql';

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
}

type Agent = { chainId: number; registry: string; tokenId: string; atom: string | null; name: string | null };

export type SieveRow = {
  chainId: number;
  registry: string;
  tokenId: string;
  name: string | null;
  at: string;
  rung: Rung;
  rungName: string;
  couldNotSay: boolean;
  anyLive: boolean;
  owner: string | null;
  document: DocumentOutcome;
  /** The request that proves the rung, as a curl a reader can paste. */
  proof: { url: string; code: string; curl: string } | null;
  endpoints: { name: string | null; protocol: string | null; url: string; status: string; code: string }[];
  emails: string[];
  feedback: { reviewers: number; sampled: number; fresh: number; other: number } | null;
  used: { lines: number; fromArp: number; fromOthers: number } | null;
};

// ------------------------------------------------------------------ summary --

/** The file's rows, the last one per agent: a `--retry` appends rather than rewrites. */
function rowsOf(path: string): SieveRow[] {
  const latest = new Map<string, SieveRow>();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const row = JSON.parse(line) as SieveRow; // a row this script wrote
    latest.set(`${row.chainId}/${row.tokenId}`, row);
  }
  return [...latest.values()];
}

function summarise(path: string): void {
  const rows = rowsOf(path);
  const byChain = new Map<number, SieveRow[]>();
  for (const row of rows) byChain.set(row.chainId, [...(byChain.get(row.chainId) ?? []), row]);
  const pct = (x: number) => `${(Math.max(0, x) * 100).toFixed(1)}%`;
  console.log(`${path}\n${rows.length} agents read, ${rows[0]?.at.slice(0, 10) ?? '—'} to ${rows.at(-1)?.at.slice(0, 10) ?? '—'}`);
  for (const [chainId, list] of [...byChain.entries()].sort((a, b) => a[0] - b[0])) {
    const n = list.length;
    console.log(`\n=== chain ${chainId}: n = ${n} — one context, never summed with another chain ===`);
    for (const rung of [0, 1, 2, 3, 4, 5] as Rung[]) {
      const at = list.filter((row) => row.rung === rung).length;
      const atLeast = list.filter((row) => row.rung >= rung).length;
      const [low, high] = wilsonInterval(atLeast, n);
      console.log(
        `  ${rung} ${RUNG_NAMES[rung].padEnd(20)} at ${String(at).padStart(5)}   at least ${String(atLeast).padStart(5)}  (${pct(atLeast / n)}, 95% ${pct(low)}–${pct(high)})`,
      );
    }
    // Concentration first: one platform can be most of a chain. On 2026-11-09, 451 of 500 sampled
    // Base agents were cards served by one host, each under its own owner. A share without this is
    // a share of that host.
    const hostOf = (row: SieveRow) => {
      try {
        return row.proof === null ? null : new URL(row.proof.url).host;
      } catch {
        return null;
      }
    };
    const answering = list.filter((row) => row.rung >= 3 && row.rung <= 4);
    const hosts = new Map<string, number>();
    for (const row of answering) {
      const host = hostOf(row);
      if (host !== null) hosts.set(host, (hosts.get(host) ?? 0) + 1);
    }
    const top = [...hosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const owners = new Set(answering.map((row) => row.owner)).size;
    console.log(
      `  rungs 3-4 come from ${hosts.size} hosts and ${owners} owners; largest: ${top.map(([host, count]) => `${host} ${count}`).join(', ') || '—'}`,
    );
    const outside = list.filter((row) => top[0] === undefined || hostOf(row) !== top[0][0]);
    console.log(
      `  without the largest host: n = ${outside.length}, rung 3+ ${outside.filter((row) => row.rung >= 3).length}, rung 4 ${outside.filter((row) => row.rung === 4).length}`,
    );
    const unsure = list.filter((row) => row.couldNotSay).length;
    console.log(`  could not say, retry: ${unsure}`);
    // docs/19 §5: the two definitions side by side, never merged into a range.
    const broad = list.filter((row) => row.document.status === 'read' && row.anyLive).length;
    const handshake = list.filter((row) => row.rung >= 4).length;
    const [bl, bh] = wilsonInterval(broad, n);
    const [hl, hh] = wilsonInterval(handshake, n);
    console.log(`  broad, as the study words it (a file with any declared URL alive): ${broad}/${n}, 95% ${pct(bl)}–${pct(bh)}`);
    console.log(`  ARP's, an MCP or A2A handshake (rung 4+):                         ${handshake}/${n}, 95% ${pct(hl)}–${pct(hh)}`);
    const withFeedback = list.filter((row) => row.feedback !== null && row.feedback.reviewers > 0);
    const sampled = withFeedback.reduce((sum, row) => sum + (row.feedback?.sampled ?? 0), 0);
    const fresh = withFeedback.reduce((sum, row) => sum + (row.feedback?.fresh ?? 0), 0);
    console.log(
      `  feedback: ${withFeedback.length} agents have reviewers; of ${sampled} reviewers sampled, ${fresh} fresh (≤ ${FRESH_NONCE} sent tx), ${sampled - fresh} other`,
    );
  }
}

function outreach(path: string): void {
  const rows = rowsOf(path).filter((row) => row.rung >= 3);
  const date = new Date().toISOString().slice(0, 10);
  const out = `data/outreach/agents-that-answer-${date}.csv`;
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = ['chain,token_id,name,rung,emails_stated,proof_url,checked_at'];
  for (const row of rows) {
    lines.push(
      [row.chainId, row.tokenId, cell(row.name ?? ''), row.rung, cell(row.emails.join(' ')), cell(row.proof?.url ?? ''), row.at].join(','),
    );
  }
  writeFileSync(out, `${lines.join('\n')}\n`);
  console.log(`${rows.length} agents at rung 3 or above → ${out} (git-ignored: third parties' stated contacts)`);
}

// The population a registry sample is drawn from: the highest minted id, read now and printed with its time.
if (process.argv.includes('--highest')) {
  const chainId = Number(arg('chain') ?? 8453);
  const chain = CHAINS[chainId];
  if (chain === undefined) process.exit(1);
  console.log(`chain ${chainId}: highest minted id ${await highestTokenId({ rpcUrl: chain.rpc })}, read ${new Date().toISOString()}`);
  process.exit(0);
}

if (arg('summary') !== null) {
  summarise(arg('summary') ?? '');
  process.exit(0);
}
if (arg('outreach') !== null) {
  outreach(arg('outreach') ?? '');
  process.exit(0);
}

// -------------------------------------------------------------- population --

const population = arg('population') ?? 'registry';
let agents: Agent[] = [];
let label: string;
if (population === 'directory') {
  label = 'directory';
  const client = createErc8004Client({ sources: [intuitionSource({ graphqlUrl: GRAPHQL })] });
  for (let offset = 0; ; offset += 100) {
    const page = await listAgents(client, { limit: 100, offset });
    for (const listing of page.agents) {
      if (listing.ref === null) continue;
      agents.push({
        chainId: listing.ref.chainId,
        registry: listing.ref.registry,
        tokenId: listing.ref.tokenId,
        atom: listing.sourceHandle,
        name: listing.metadata.name,
      });
    }
    if (page.agents.length < 100) break;
  }
  // `--ids` narrows the directory to those token ids, read again (e.g. after a fix in the reader).
  const only = arg('ids');
  if (only !== null) {
    const wanted = new Set(only.split(',').map((part) => part.trim()));
    agents = agents.filter((agent) => wanted.has(agent.tokenId));
  }
} else {
  const chainId = Number(arg('chain') ?? 8453);
  label = String(chainId);
  const chain = CHAINS[chainId];
  if (chain === undefined || chainId === 13579) {
    console.error(`--chain must be one of ${Object.keys(CHAINS).filter((c) => c !== '13579').join(', ')}`);
    process.exit(1);
  }
  const explicit = arg('ids');
  const outFile = arg('out');
  // `--retry` on an existing file reads its undecided agents again, and nothing else. A `--count`
  // into an existing file would draw a new sample into it, so that is refused.
  const undecidedInFile =
    process.argv.includes('--retry') && explicit === null && outFile !== null && existsSync(outFile)
      ? readFileSync(outFile, 'utf8')
          .split('\n')
          .filter((line) => line.trim() !== '')
          .map((line) => JSON.parse(line) as SieveRow) // rows this script wrote
          .filter((row) => row.chainId === chainId && row.couldNotSay)
          .map((row) => row.tokenId)
      : null;
  if (undecidedInFile === null && explicit === null && outFile !== null && existsSync(outFile)) {
    console.error(`${outFile} exists: pass --retry to read its undecided agents again, or --ids, not a new --count`);
    process.exit(1);
  }
  const ids = explicit
    ? explicit.split(',').map((part) => part.trim())
    : undecidedInFile !== null
      ? [...new Set(undecidedInFile)]
      : await (async () => {
        const highest = await highestTokenId({ rpcUrl: chain.rpc });
        const count = Number(arg('count') ?? 100);
        // Uniform over the id space, without repeats: a figure from it carries sampling error.
        const picked = new Set<number>();
        while (picked.size < Math.min(count, highest)) picked.add(1 + Math.floor(Math.random() * highest));
        console.error(`chain ${chainId}: highest minted id ${highest}, sampling ${picked.size}`);
        return [...picked].map(String);
      })();
  agents = ids.map((tokenId) => ({ chainId, registry: CANONICAL, tokenId, atom: null, name: null }));
}

const stamp = new Date().toISOString().slice(0, 16).replace(':', '');
const outPath = arg('out') ?? `data/measurements/agent-sieve-${label}-${stamp}.jsonl`;
const retry = process.argv.includes('--retry');
const done = new Map<string, SieveRow>();
if (existsSync(outPath)) {
  for (const line of readFileSync(outPath, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const row = JSON.parse(line) as SieveRow; // a row this script wrote
    done.set(`${row.chainId}/${row.tokenId}`, row);
  }
}
// Ids named with `--ids` are read again even when the file holds them: that is how a row is redone.
const named = arg('ids') !== null;
const todo = agents.filter((agent) => {
  const prior = done.get(`${agent.chainId}/${agent.tokenId}`);
  return prior === undefined || named || (retry && prior.couldNotSay);
});
console.error(`${agents.length} agents, ${agents.length - todo.length} already in ${outPath}, ${todo.length} to read`);

// ------------------------------------------------------------ ARP's lines --

/** `uses` lines whose object is an agent's atom, with who wrote each, on testnet 13579. */
async function linesOn(atoms: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  for (let at = 0; at < atoms.length; at += 100) {
    const response = await fetch(GRAPHQL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'query Lines($uses: String!, $atoms: [String!]!) { triples(where: {predicate_id: {_eq: $uses}, object_id: {_in: $atoms}}, limit: 1000) { object_id subject_id creator_id } }',
        variables: { uses: USES, atoms: atoms.slice(at, at + 100) },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    // The indexer's reply, read by shape.
    const body = (await response.json()) as { data?: { triples?: { object_id: string; subject_id: string; creator_id: string }[] } };
    for (const triple of body.data?.triples ?? []) {
      if (triple.subject_id === triple.object_id) continue;
      out.set(triple.object_id, [...(out.get(triple.object_id) ?? []), triple.creator_id.toLowerCase()]);
    }
  }
  return out;
}


// -------------------------------------------------------------------- walk --

let requests = 0;
const counting: Fetch = async (input, init) => {
  requests += 1;
  return globalThis.fetch(input, init);
};

async function rpcCall(rpc: string, method: string, params: unknown[]): Promise<string | null> {
  const response = await counting(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await response.json()) as { result?: string }; // a JSON-RPC reply, checked below
  return typeof json.result === 'string' ? json.result : null;
}

/** `getClients(agentId)`: every address that left this agent feedback. */
async function reviewersOf(rpc: string, reputation: string, tokenId: string): Promise<string[]> {
  const data = '0x42dd519c' + BigInt(tokenId).toString(16).padStart(64, '0');
  const result = await rpcCall(rpc, 'eth_call', [{ to: reputation, data }, 'latest']).catch(() => null);
  if (result === null || result.length < 130) return [];
  const hex = result.slice(2);
  const length = parseInt(hex.slice(64, 128), 16);
  const out: string[] = [];
  for (let i = 0; i < length; i += 1) out.push(`0x${hex.slice(128 + i * 64 + 24, 128 + (i + 1) * 64)}`.toLowerCase());
  return out;
}

async function feedbackOf(agent: Agent): Promise<SieveRow['feedback']> {
  const chain = CHAINS[agent.chainId];
  if (chain?.reputation === null || chain === undefined) return null;
  const reviewers = await reviewersOf(chain.rpc, chain.reputation, agent.tokenId);
  const sample = reviewers.slice(0, Number(arg('feedback-sample') ?? 40));
  let fresh = 0;
  for (const reviewer of sample) {
    const nonce = await rpcCall(chain.rpc, 'eth_getTransactionCount', [reviewer, 'latest']).catch(() => null);
    if (nonce !== null && Number(BigInt(nonce)) <= FRESH_NONCE) fresh += 1;
  }
  return { reviewers: reviewers.length, sampled: sample.length, fresh, other: sample.length - fresh };
}

function curlOf(endpoint: SievedEndpoint): string {
  const outcome = endpoint.outcome;
  const request = outcome.status === 'not-checkable' ? null : outcome.request;
  if (request === null) return '';
  if (request.method === 'GET') return `curl -s '${request.url}'`;
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: request.rpcMethod ?? 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'arp', version: '0' } } });
  return `curl -s -X POST '${request.url}' -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' -d '${body}'`;
}

const limiter = new HostLimiter({ minGapMs: 400 });

/** Longer than the limiter's longest back-off (ten minutes), so a courteous wait is never cut. */
const AGENT_DEADLINE_MS = 12 * 60_000;

/** A row that says nothing about the agent, to be read again with `--retry`. */
function undecided(agent: Agent, detail: string): SieveRow {
  const document: DocumentOutcome = { status: 'unreachable', code: 'transport-error', url: null, httpStatus: null, detail };
  return {
    chainId: agent.chainId,
    registry: agent.registry,
    tokenId: agent.tokenId,
    name: agent.name,
    at: new Date().toISOString(),
    rung: 0,
    rungName: RUNG_NAMES[0],
    couldNotSay: true,
    anyLive: false,
    owner: null,
    document,
    proof: null,
    endpoints: [],
    emails: [],
    feedback: null,
    used: null,
  };
}

async function sieveOne(agent: Agent): Promise<SieveRow> {
  const chain = CHAINS[agent.chainId];
  const at = new Date().toISOString();
  const empty = { chainId: agent.chainId, registry: agent.registry, tokenId: agent.tokenId, name: agent.name, at };
  // The agent's atom as the agent pulse resolves it (`resolveAgentAtom`): lines name that atom, which
  // is not always the one the directory lists. A read that fails leaves `used` unknown, not zero.
  const atom = await resolveAgentAtom(
    { chainId: agent.chainId, tokenId: agent.tokenId, registry: agent.registry as `0x${string}` },
    { graphqlUrl: GRAPHQL },
  )
    .then((found) => (found.status === 'found' ? String(found.atom) : null))
    .catch(() => undefined);
  const writers = atom === undefined || atom === null ? [] : ((await linesOn([atom]).catch(() => null))?.get(atom) ?? []);
  const usedOf = (owner: string | null): SieveRow['used'] => {
    if (atom === undefined) return null;
    const fromArp = writers.filter((writer) => OURS.has(writer)).length;
    // "From a wallet that is not its own", and not ARP's: ARP's lines are rehearsal, counted apart.
    const fromOthers = writers.filter((writer) => !OURS.has(writer) && writer !== owner).length;
    return { lines: writers.length, fromArp, fromOthers };
  };
  if (chain === undefined) {
    const document: DocumentOutcome = { status: 'unreachable', code: 'unresolvable-scheme', url: null, httpStatus: null, detail: `no RPC for chain ${agent.chainId}` };
    return { ...empty, rung: 0, rungName: RUNG_NAMES[0], couldNotSay: true, anyLive: false, owner: null, document, proof: null, endpoints: [], emails: [], feedback: null, used: usedOf(null) };
  }
  const owner = await ownerOf({ rpc: chain.rpc, registry: agent.registry, id: BigInt(agent.tokenId), fetch: counting });
  let rpcFailure: string | null = null;
  const uri = await tokenUri({ rpc: chain.rpc, registry: agent.registry, id: BigInt(agent.tokenId), fetch: counting }).catch(
    (error: unknown) => {
      rpcFailure = String(error).slice(0, 120);
      return null;
    },
  );
  // An RPC that failed is not an agent without a document: it is read again with `--retry`.
  let document: DocumentOutcome =
    rpcFailure === null
      ? { status: 'no-token-uri' }
      : { status: 'unreachable', code: 'transport-error', url: null, httpStatus: null, detail: rpcFailure };
  const endpoints: SievedEndpoint[] = [];
  let emails: string[] = [];
  let name = agent.name;
  if (uri !== null) {
    const read = await fetchDocument(uri, limiter, counting);
    document = read.outcome;
    if (read.body !== null) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(read.body);
      } catch {
        parsed = null;
      }
      // A non-null object; `name` is read as `unknown` and checked.
      const fields = parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      if (name === null && typeof fields.name === 'string') name = fields.name.slice(0, 120);
      // Callable endpoints first, so a file listing ten links before its MCP server still gets it probed.
      const declared = readDeclaredEndpoints(parsed).sort((a, b) => Number(isCallable(b)) - Number(isCallable(a)));
      emails = statedEmails(declared);
      let probes = 0;
      for (const endpoint of declared) {
        const classification = endpoint.classification;
        if (classification.status === 'probeable' && probes >= MAX_ENDPOINTS) continue;
        if (classification.status === 'probeable') probes += 1;
        const outcome =
          classification.status === 'probeable'
            ? await limiter.run(classification.url, () => probeEndpoint(endpoint, { fetch: counting }))
            : await probeEndpoint(endpoint, { fetch: counting });
        if (outcome.status === 'inconclusive' && outcome.code === 'rate-limited') limiter.backOff(outcome.request.url, null);
        endpoints.push({ ...endpoint, outcome });
      }
    }
  }
  const used = usedOf(owner);
  const result = sieve({ document, endpoints, usedByAnother: used === null ? null : used.fromOthers > 0 });
  const feedback = await feedbackOf(agent).catch(() => null);
  return {
    ...empty,
    name,
    rung: result.rung,
    rungName: RUNG_NAMES[result.rung],
    couldNotSay: result.couldNotSay,
    anyLive: result.anyLive,
    owner,
    document,
    proof:
      result.proof === null || result.proof.classification.status !== 'probeable'
        ? null
        : {
            url: result.proof.classification.url,
            code: result.proof.outcome.status === 'not-checkable' ? result.proof.outcome.code : `${result.proof.outcome.status}:${result.proof.outcome.code}`,
            curl: curlOf(result.proof),
          },
    endpoints: endpoints.map((endpoint) => ({
      name: endpoint.name,
      protocol: endpoint.protocol,
      url: endpoint.classification.declared.slice(0, 300),
      status: endpoint.outcome.status,
      code: endpoint.outcome.code,
    })),
    emails,
    feedback,
    used,
  };
}

const queue = [...todo];
let finished = 0;
await Promise.all(
  // Eight at once by default. A free RPC that starts answering HTML instead of JSON is throttling:
  // `--retry --workers 2` reads the undecided again at a quarter of the pace.
  Array.from({ length: Math.max(1, Number(arg('workers') ?? 8)) }, async () => {
    for (let agent = queue.shift(); agent !== undefined; agent = queue.shift()) {
      // One agent may not hold the walk: past the deadline it is written as undecided and retried
      // later. On 2026-11-09 agent 8453:27621 held a run for over an hour; alone it took seven seconds.
      const deadline = new Promise<SieveRow>((resolve) =>
        setTimeout(() => resolve(undecided(agent, `the walk of this agent passed ${AGENT_DEADLINE_MS / 1000} s`)), AGENT_DEADLINE_MS),
      );
      const row = await Promise.race([sieveOne(agent), deadline]).catch((error: unknown) => {
        console.error(`${agent.chainId}/${agent.tokenId} failed: ${String(error).slice(0, 120)}`);
        return null;
      });
      if (row === null) continue;
      appendFileSync(outPath, `${JSON.stringify(row)}\n`);
      finished += 1;
      if (finished % 25 === 0) console.error(`${finished}/${todo.length}, ${requests} requests`);
    }
  }),
);
console.error(`done: ${finished} rows appended to ${outPath}, ${requests} requests`);
summarise(outPath);
// A request still pending past an agent's deadline would keep the process alive; the rows are written.
process.exit(0);
