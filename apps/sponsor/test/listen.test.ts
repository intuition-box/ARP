import { describe, expect, it } from 'bun:test';

import { refuseForeignRequest } from '@arp-protocol/core/node';

import { listenFrom } from '../src/listen.ts';

describe('listenFrom', () => {
  it('listens on 127.0.0.1 and answers loopback names only when nothing is set', () => {
    expect(listenFrom(3200, undefined, undefined)).toEqual({
      hostname: '127.0.0.1',
      hosts: ['127.0.0.1:3200', 'localhost:3200', '[::1]:3200'],
    });
  });

  it('hosted, answers its public name as well, in lower case', () => {
    const listen = listenFrom(3200, '0.0.0.0', 'Sponsor.Example.org');
    expect(listen).toEqual({
      hostname: '0.0.0.0',
      hosts: ['127.0.0.1:3200', 'localhost:3200', '[::1]:3200', 'sponsor.example.org'],
    });
  });

  it('refuses every interface without a public name, and a public name on loopback', () => {
    expect(listenFrom(3200, '0.0.0.0', undefined)).toHaveProperty('error');
    expect(listenFrom(3200, '0.0.0.0', ' ')).toHaveProperty('error');
    expect(listenFrom(3200, '127.0.0.1', 'sponsor.example.org')).toHaveProperty('error');
  });

  it('refuses another address, and a name with a scheme, a port, a path or no dot', () => {
    expect(listenFrom(3200, '192.168.1.4', 'sponsor.example.org')).toHaveProperty('error');
    for (const name of [
      'https://sponsor.example.org',
      'sponsor.example.org:443',
      'sponsor.example.org/x',
      'localhost',
      'evil.example.org,sponsor.example.org',
    ]) {
      expect(listenFrom(3200, '0.0.0.0', name)).toHaveProperty('error');
    }
  });

  it('a request through the proxy passes, and another name is still refused', () => {
    const listen = listenFrom(3200, '0.0.0.0', 'sponsor.example.org');
    if ('error' in listen) throw new Error(listen.error);
    const request = (host: string) =>
      new Request('http://sponsor.example.org/line', {
        method: 'POST',
        headers: { host, 'content-type': 'application/json' },
        body: '{}',
      });
    expect(refuseForeignRequest(request('sponsor.example.org'), { hosts: listen.hosts })).toBeNull();
    expect(
      refuseForeignRequest(request('rebound.example.org'), { hosts: listen.hosts })?.status,
    ).toBe(403);
  });
});
