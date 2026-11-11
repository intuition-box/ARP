/**
 * ARP's hosted content server (task 131, ADR `0196`): `GET /content/:atomId` and an info document,
 * nothing else.
 *
 * The content path is the one that signs a receipt for having served a skill (ADR `0080`), and the
 * sponsoring service pays for a declaration only against such a receipt. Until this file the only
 * server that signed one ran on the user's machine, so `arp_get_skill` and `arp_declare_used` failed
 * for everybody else. The hosted MCP endpoint cannot take the job: it holds no key and serves the
 * searches, and ADR `0161` keeps both properties. So this is a second process, with a different
 * shape:
 *
 * - **No MCP.** No tool runs here, so no search's words ever reach it; a request names an atom id,
 *   an agent address and a nonce, which the agent's declaration will make public anyway.
 * - **One key, read from a file, that signs receipts and nothing else.** `ARP_RECEIPT_KEY_FILE`
 *   only; a key in the environment is refused, like every ARP key (ADR `0116`).
 * - **Testnet 13579 only**, and answering its own public name and loopback, nothing else.
 *
 * It imports `content.ts` and never `config.ts`, so none of the MCP server's settings or keys load.
 */
import { loopbackHosts, readKeyFile, refuseForeignRequest, serveFetch } from '@arp-protocol/core/node';
import type { TypedDataSigner } from '@arp-protocol/core';
import { privateKeyToAccount } from 'viem/accounts';

import deployment13579 from '../../../data/deployments/13579.json';
import { serveContentRequest } from './content.js';
import { isBareHostName } from './hosted.js';

export const CONTENT_CHAIN_ID = deployment13579.chain.chainId;
const DEFAULT_PORT = 3003;

/** Variables that would hand this process another key or another chain. */
const REFUSED = ['ARP_RECEIPT_KEY', 'ARP_AGENT_PRIVATE_KEY'] as const;

type Env = Readonly<Record<string, string | undefined>>;

export type ContentServerConfig = { host: string; keyFile: string; port: number };

/** The settings, or why this environment may not start. Nothing is read from disk here. */
export function contentServerConfig(env: Env = process.env): ContentServerConfig | { refused: string } {
  for (const variable of REFUSED) {
    if ((env[variable] ?? '') !== '') return { refused: `the content server refuses ${variable}: its key comes from ARP_RECEIPT_KEY_FILE only` };
  }
  if (env['ARP_TARGET'] !== 'testnet') return { refused: 'the content server serves testnet 13579 only: set ARP_TARGET=testnet' };
  const host = (env['ARP_PUBLIC_HOST'] ?? '').trim().toLowerCase();
  if (!isBareHostName(host)) return { refused: 'ARP_PUBLIC_HOST must be a bare host name such as content.example.org' };
  const keyFile = (env['ARP_RECEIPT_KEY_FILE'] ?? '').trim();
  if (keyFile === '') return { refused: 'ARP_RECEIPT_KEY_FILE must name the receipt key file' };
  const port = Number(env['PORT'] ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return { refused: `PORT must be a TCP port, not ${env['PORT']}` };
  return { host, keyFile, port };
}

/** The receipt signer, from a key file holding 64 hex characters, with or without `0x`. */
export function signerFromFile(path: string): TypedDataSigner {
  const account = privateKeyToAccount(readKeyFile(path));
  return { address: account.address, signTypedData: (data) => account.signTypedData(data) };
}

export type ContentServerDeps = {
  host: string;
  port: number;
  signer: TypedDataSigner;
  serve?: typeof serveContentRequest;
};

/** One request: its own host only, `GET` only, two routes. */
export async function contentServerFetch(request: Request, deps: ContentServerDeps): Promise<Response> {
  const refused = refuseForeignRequest(request, {
    hosts: [...loopbackHosts(deps.port), deps.host],
    origins: [],
  });
  if (refused !== null) return refused;
  if (request.method !== 'GET') {
    return Response.json({ error: 'this server answers GET /content/:atomId only' }, { status: 405, headers: { allow: 'GET' } });
  }
  const url = new URL(request.url);
  const content = /^\/content\/([^/]+)\/?$/.exec(url.pathname);
  if (content !== null) {
    return (deps.serve ?? serveContentRequest)(content[1] ?? '', url.searchParams, CONTENT_CHAIN_ID, deps.signer);
  }
  if (url.pathname === '/') {
    return Response.json({
      name: 'ARP content server',
      content: { route: '/content/:atomId', signer: deps.signer.address, attests: 'access, never use' },
      chain: { id: CONTENT_CHAIN_ID, name: deployment13579.chain.name },
    });
  }
  return Response.json({ error: 'not found: this server answers GET /content/:atomId only' }, { status: 404 });
}

export async function main(env: Env = process.env): Promise<void> {
  const log = (line: string) => process.stderr.write(`${line}\n`);
  const config = contentServerConfig(env);
  if ('refused' in config) {
    log(config.refused);
    process.exit(1);
  }
  let signer: TypedDataSigner;
  try {
    signer = signerFromFile(config.keyFile);
  } catch (error) {
    // The reader's message names the path and the reason, never the file's content.
    log(error instanceof Error ? error.message : 'the receipt key file could not be read');
    process.exit(1);
  }
  await serveFetch({ port: config.port, hostname: env['ARP_HOST'] ?? '127.0.0.1', maxBodyBytes: 1024 }, (request) =>
    contentServerFetch(request, { host: config.host, port: config.port, signer }),
  );
  log(`ARP content server — ${config.host}, port ${config.port}, testnet ${CONTENT_CHAIN_ID}`);
  log(`  receipts:   signed by ${signer.address} (ADR 0080: receipts only, it cannot move value)`);
  log(`  routes:     GET /content/:atomId, GET /. No MCP, no tool, no search.`);
}

if (import.meta.main) await main();
