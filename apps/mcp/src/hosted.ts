/**
 * The hosted read-only endpoint (task 92, ADR `0161`): the same server, run by ARP behind a public
 * name, for a caller who chooses to point at a URL instead of installing anything.
 *
 * It receives the caller's tool arguments, the words of a search among them, which is what ADR `0155`
 * point 3 kept away from ARP. ADR `0161` allows it on four conditions, and this file is three of them
 * as code: the installed plugin and CLI never route here (nothing in them names it), and a hosted
 * process serves `ARP_TOOLS=read` on testnet 13579, holds no key, and keeps no argument in what it
 * logs. `hostedRefusal` is checked before anything else loads (`config.ts`), so a refused setting never
 * starts a listener.
 */

export const HOSTED_FLAG = 'ARP_HOSTED';

/** A DNS name: labels of letters, digits and hyphens, at least one dot. No scheme, port or path. */
const HOST_NAME = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

/** Variables that hand this process a key, or open a door a hosted server must keep shut. */
const REFUSED_WHEN_HOSTED = [
  'ARP_RECEIPT_KEY',
  'ARP_AGENT_PRIVATE_KEY',
  'ARP_ALLOW_PRIVATE_PROBE',
] as const;

type Env = Readonly<Record<string, string | undefined>>;

export function isHosted(env: Env = process.env): boolean {
  return env[HOSTED_FLAG] === '1';
}

/** The public name a hosted server answers, lower-cased, or `null` when none is set. */
export function publicHost(env: Env = process.env): string | null {
  const name = (env['ARP_PUBLIC_HOST'] ?? '').trim().toLowerCase();
  return name === '' ? null : name;
}

/**
 * Why this environment may not start, or `null`. Not hosted, only `ARP_PUBLIC_HOST` is checked: a
 * public name on a server that is not hosted would open a loopback server to a proxy without any of
 * the conditions below.
 */
export function hostedRefusal(env: Env = process.env): string | null {
  const name = publicHost(env);
  const flag = env[HOSTED_FLAG];
  if (flag !== undefined && flag !== '' && flag !== '1') {
    return `${HOSTED_FLAG} must be 1 or unset, not ${flag}`;
  }
  if (!isHosted(env)) {
    return name === null ? null : `ARP_PUBLIC_HOST needs ${HOSTED_FLAG}=1: only the hosted read-only server answers a public name`;
  }
  if (env['ARP_TOOLS'] !== 'read') {
    return `${HOSTED_FLAG}=1 serves ARP_TOOLS=read only, not ${env['ARP_TOOLS'] ?? 'every tool'}`;
  }
  if (env['ARP_TARGET'] !== 'testnet') {
    return `${HOSTED_FLAG}=1 reads testnet 13579 only: set ARP_TARGET=testnet`;
  }
  if (env['ARP_TRANSPORT'] === 'stdio') {
    return `${HOSTED_FLAG}=1 serves HTTP; stdio is for a client on the same machine`;
  }
  for (const variable of REFUSED_WHEN_HOSTED) {
    if ((env[variable] ?? '') !== '') return `${HOSTED_FLAG}=1 refuses ${variable}: a hosted server holds no key and probes no private address`;
  }
  if (name === null) {
    return `${HOSTED_FLAG}=1 needs ARP_PUBLIC_HOST, the name the proxy forwards`;
  }
  if (!HOST_NAME.test(name)) {
    return `ARP_PUBLIC_HOST must be a bare host name such as mcp.example.org, not ${env['ARP_PUBLIC_HOST']}`;
  }
  return null;
}

/**
 * What a log line may say about an error. Hosted, the error's class and nothing else: a message can
 * carry the caller's arguments (a GraphQL server echoes its variables, a search's output names what was
 * searched), and ADR `0161` condition 2 is that none is kept. The caller still gets the message in its
 * own response. Not hosted, the message, as before.
 */
export function loggable(error: unknown, message: string, env: Env = process.env): string {
  if (!isHosted(env)) return message;
  return error instanceof Error ? error.name : 'error';
}
