import { describe, expect, it } from 'bun:test';

import { HostLimiter } from '../../packages/protocol/src/index.js';
import { fetchDocument, type Fetch } from '../helpers/registration-document.ts';

const never: Fetch = async () => {
  throw new Error('no request expected');
};

describe('fetchDocument', () => {
  it('reads a tokenURI that holds the JSON itself, with no request', async () => {
    const read = await fetchDocument('{"name":"Anchor","services":[]}', new HostLimiter(), never);
    expect(read.outcome).toEqual({ status: 'read', url: 'inline', httpStatus: 200 });
    expect(read.body).toBe('{"name":"Anchor","services":[]}');
  });

  it('tries another gateway when a gateway URL is refused', async () => {
    const asked: string[] = [];
    const fetch: Fetch = async (input) => {
      asked.push(String(input));
      return String(input).startsWith('https://ipfs.io/')
        ? new Response('slow down', { status: 429 })
        : new Response('{"name":"x"}', { status: 200 });
    };
    const read = await fetchDocument('https://ipfs.io/ipfs/bafy1', new HostLimiter({ minGapMs: 0 }), fetch);
    expect(read.outcome.status).toBe('read');
    expect(asked[0]).toBe('https://ipfs.io/ipfs/bafy1');
    expect(asked[1]).toBe('https://gateway.pinata.cloud/ipfs/bafy1');
  });

  it('names a scheme it cannot read rather than calling it a missing document', async () => {
    const read = await fetchDocument('ar://abc', new HostLimiter(), never);
    expect(read.outcome).toMatchObject({ status: 'unreachable', code: 'unresolvable-scheme' });
  });
});
