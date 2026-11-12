import { afterEach, describe, expect, it } from 'bun:test';

import { intuitionPinner } from '../src/pin.ts';
import { restoreFetch, stubFetch } from './fetch-stub.ts';

afterEach(restoreFetch);

const AUTH = { apiKey: 'test-key', headerName: 'x-api-key' };
const THING = { name: 'agent', description: 'an agent', image: '', url: 'https://agent.test' };

describe('pinning an identity Thing', () => {
  it('sends the Thing with the credential and returns the URI the API gives', async () => {
    const asked = stubFetch(() => Response.json({ data: { pinThing: { uri: 'ipfs://thing' } } }));
    expect(await intuitionPinner(AUTH)(THING)).toBe('ipfs://thing');
    const headers = asked[0]?.init?.headers as Record<string, string>; // the pinner sends a plain record
    expect(headers['x-api-key']).toBe('test-key');
    expect(asked[0]?.body).toMatchObject({ variables: THING });
  });

  it('fails on an HTTP error and on an answer with no URI', async () => {
    stubFetch(() => new Response('', { status: 401 }));
    await expect(intuitionPinner(AUTH)(THING)).rejects.toThrow('http 401');
    stubFetch(() => Response.json({ data: { pinThing: {} } }));
    await expect(intuitionPinner(AUTH)(THING)).rejects.toThrow('no uri');
  });
});
