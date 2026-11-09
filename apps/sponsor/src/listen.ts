/** Where the service listens, and which `Host` headers it answers (task 78, ADR `0149`).
 *
 *  Run on one machine it listens on 127.0.0.1 and answers its loopback names only, which is what
 *  stops a rebinding page (ADR `0116`). Hosted, it listens on every interface inside its container
 *  and answers one more name, its public one, the `Host` the proxy in front of it forwards. The
 *  routes do not change, and hosted they answer anyone, not only this machine: most verify a
 *  signature first, while `/gas` and `/identity` check only who owns the agent and `/list-tool`
 *  takes unsigned listings under its own daily cap. The per-address and per-day caps and the daily
 *  budget are what bound them all (`apps/web/DEPLOY.md`, "What bounds a loss").
 */
import { loopbackHosts } from '@arp-protocol/core/node';

export type Listen = { hostname: '127.0.0.1' | '0.0.0.0'; hosts: string[] };

/** A DNS name: labels of letters, digits and hyphens, at least one dot. No scheme, port or path. */
const HOST_NAME = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

/**
 * The listener for `SPONSOR_LISTEN` and `SPONSOR_PUBLIC_HOST`, or why they are refused. Every
 * interface needs a public name: listening on them while answering loopback names only would
 * refuse every request the proxy forwards, and a name with nothing listening for it is a typo.
 */
export function listenFrom(
  port: number,
  listen: string | undefined,
  publicHost: string | undefined,
): Listen | { error: string } {
  const where = (listen ?? '').trim() || '127.0.0.1';
  if (where !== '127.0.0.1' && where !== '0.0.0.0') {
    return { error: `SPONSOR_LISTEN must be 127.0.0.1 or 0.0.0.0, not ${where}` };
  }
  const name = (publicHost ?? '').trim().toLowerCase();
  if (name !== '' && !HOST_NAME.test(name)) {
    return {
      error: `SPONSOR_PUBLIC_HOST must be a bare host name such as sponsor.example.org, not ${publicHost}`,
    };
  }
  if (where === '0.0.0.0' && name === '') {
    return { error: 'SPONSOR_LISTEN=0.0.0.0 needs SPONSOR_PUBLIC_HOST, the name the proxy forwards' };
  }
  if (where === '127.0.0.1' && name !== '') {
    return { error: 'SPONSOR_PUBLIC_HOST needs SPONSOR_LISTEN=0.0.0.0: on 127.0.0.1 no proxy reaches it' };
  }
  return { hostname: where, hosts: name === '' ? loopbackHosts(port) : [...loopbackHosts(port), name] };
}
