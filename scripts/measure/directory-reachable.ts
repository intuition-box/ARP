/** How many agents in ARP's directory on testnet 13579 can actually be reached?
 *
 *      bun run scripts/measure/directory-reachable.ts > data/measurements/directory-reachable-<date>.json
 *
 *  Read-only. Lists every agent the directory shows (the same `listAgents` read the site and
 *  `arp_find_agents` use), reads each one's ERC-8004 registration document from its own registry
 *  (`tokenURI`), and sends one request to every callable endpoint it declares (named mcp, a2a,
 *  openai, rest, api, jsonrpc or grpc): MCP `initialize`, or a
 *  GET for anything else. 8 s timeouts, no retries, signs nothing. An endpoint "answers" when it
 *  returns a 2xx (MCP: a JSON-RPC `result`). Templated and non-http endpoints are not probed. */
import { createErc8004Client } from '../../packages/protocol/src/client.ts';
import { intuitionSource } from '../../packages/protocol/src/sources/intuition/index.ts';
import { listAgents } from '../../packages/protocol/src/listing.ts';
import deployment from '../../data/deployments/13579.json';

// A committed JSON record; the field is optional here and defaulted below.
const GRAPHQL = (deployment as { graphqlUrl?: string }).graphqlUrl
  ?? 'https://testnet.intuition.sh/v1/graphql';
const RPC: Record<string, string> = {
  '8453': 'https://base-rpc.publicnode.com',
  '13579': 'https://testnet.rpc.intuition.systems/http',
  '1': 'https://ethereum-rpc.publicnode.com',
};
// Only what another agent can call. A website, an X profile or a GitHub link answering a GET is not
// an agent answering, and counted as one it took the figure from 32 to 128 on the first run.
const PROTOCOLS = new Set(['mcp', 'a2a', 'openai', 'rest', 'api', 'jsonrpc', 'grpc']);
const UA = 'ARP-verifier/0.0 (+https://github.com/intuition-box/ARP) measurement';
const client = createErc8004Client({ sources: [intuitionSource({ graphqlUrl: GRAPHQL })] });

const agents: { caip19: string; name: string }[] = [];
for (let offset = 0; ; offset += 100) {
  const page = await listAgents(client, { limit: 100, offset });
  for (const a of page.agents) agents.push({ caip19: a.ref ? `eip155:${a.ref.chainId}/erc721:${a.ref.registry}/${a.ref.tokenId}` : 'unresolved', name: a.metadata.name ?? a.sourceHandle });
  if (page.agents.length < 100) break;
}

async function tokenURI(chain: string, registry: string, id: string): Promise<string | null> {
  const rpc = RPC[chain];
  if (!rpc) return null;
  const data = '0xc87b56dd' + BigInt(id).toString(16).padStart(64, '0');
  const r = await fetch(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: registry, data }, 'latest'] }),
    signal: AbortSignal.timeout(20000),
  });
  // A JSON-RPC reply; `result` is checked for a hex string before it is read.
  const j = (await r.json()) as { result?: string; error?: unknown };
  if (j.error || !j.result || j.result === '0x') return null;
  const hex = j.result.slice(2);
  const len = parseInt(hex.slice(64, 128), 16);
  if (!len) return null;
  const b = hex.slice(128, 128 + len * 2).match(/../g) ?? [];
  return new TextDecoder().decode(new Uint8Array(b.map((x) => parseInt(x, 16))));
}

async function readDoc(uri: string): Promise<unknown> {
  if (uri.startsWith('data:')) {
    const p = uri.slice(uri.indexOf(',') + 1);
    return JSON.parse(uri.includes(';base64,') ? Buffer.from(p, 'base64').toString('utf8') : decodeURIComponent(p));
  }
  const url = uri.startsWith('ipfs://') ? `https://dweb.link/ipfs/${uri.slice(7)}` : uri;
  const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

async function answers(name: string, ep: string): Promise<boolean> {
  try {
    if (name === 'mcp') {
      const r = await fetch(ep, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'user-agent': UA },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'arp', version: '0' } } }),
        signal: AbortSignal.timeout(8000),
      });
      return r.ok && /"result"/.test((await r.text()).slice(0, 2000));
    }
    const r = await fetch(ep, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(8000) });
    return r.ok;
  } catch {
    return false;
  }
}

type Row = { caip19: string; name: string; doc: boolean; http: number; answering: string[]; kinds: string[] };
const rows: Row[] = [];
const queue = [...agents];
await Promise.all(Array.from({ length: 16 }, async () => {
  for (let a = queue.shift(); a; a = queue.shift()) {
    const row: Row = { caip19: a.caip19, name: a.name, doc: false, http: 0, answering: [], kinds: [] };
    rows.push(row);
    const m = /^eip155:(\d+)\/erc721:(0x[0-9a-fA-F]{40})\/(\d+)$/.exec(a.caip19);
    if (!m) continue;
    let doc: unknown;
    try {
      const uri = await tokenURI(m[1], m[2], m[3]);
      if (!uri) continue;
      doc = await readDoc(uri);
    } catch { continue; }
    row.doc = true;
    // A non-null object here; each field is read as `unknown` and narrowed.
    const f = doc !== null && typeof doc === 'object' ? (doc as Record<string, unknown>) : {};
    const eps = [f.endpoints, f.services].flatMap((v) => (Array.isArray(v) ? v : []))
      .filter((e): e is Record<string, unknown> => e !== null && typeof e === 'object');
    for (const e of eps) {
      const ep = String(e.endpoint ?? '');
      if (!PROTOCOLS.has(String(e.name ?? '').toLowerCase().trim())) continue;
      if (!/^https?:\/\//.test(ep) || /\{[a-zA-Z_]+\}/.test(ep)) continue;
      row.http++;
      const kind = String(e.name ?? '').toLowerCase().trim();
      if (await answers(kind, ep)) {
        row.answering.push(ep);
        if (!row.kinds.includes(kind)) row.kinds.push(kind);
      }
    }
  }
}));

const byChain: Record<string, number> = {};
for (const r of rows) { const c = r.caip19.split('/')[0]; byChain[c] = (byChain[c] ?? 0) + 1; }
console.log(JSON.stringify({
  at: new Date().toISOString(),
  chain: 13579,
  graphql: GRAPHQL,
  listed: rows.length,
  byIdentityChain: byChain,
  documentRead: rows.filter((r) => r.doc).length,
  declaresCallableEndpoint: rows.filter((r) => r.http > 0).length,
  answersAtLeastOne: rows.filter((r) => r.answering.length > 0).length,
  answering: rows.filter((r) => r.answering.length > 0).map((r) => ({ caip19: r.caip19, name: r.name, kinds: r.kinds, endpoints: r.answering })),
}, null, 2));
