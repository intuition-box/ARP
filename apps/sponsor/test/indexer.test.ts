import { afterEach, describe, expect, it } from 'bun:test';

import { repoSpellingsOnGraph } from '../src/indexer.ts';
import { restoreFetch, stubFetch } from './fetch-stub.ts';

afterEach(restoreFetch);

describe('the spellings of a repository already on the graph', () => {
  it('keeps the Thing atoms whose label is the repository, whatever its case', async () => {
    const asked = stubFetch(() =>
      Response.json({
        data: {
          atoms: [
            { term_id: '0x1', label: 'github.com/Acme/Kit_One' },
            { term_id: '0x2', label: 'github.com/acme/kit_one' },
            { term_id: '0x3', label: 'github.com/acme/kit_one/extra' },
            { term_id: '0x4', label: null },
          ],
        },
      }),
    );
    expect(await repoSpellingsOnGraph('https://index.test/graphql', 'acme/kit_one')).toEqual([
      { spelling: 'Acme/Kit_One', termId: '0x1' },
      { spelling: 'acme/kit_one', termId: '0x2' },
    ]);
    // `_` is escaped, so a repository name with an underscore is not a wildcard.
    expect(asked[0]?.url).toBe('https://index.test/graphql');
    expect(asked[0]?.body).toMatchObject({ variables: { p: 'github.com/acme/kit\\_one' } });
  });

  it('throws on an HTTP failure, and on an answer that carries no atoms', async () => {
    stubFetch(() => new Response('down', { status: 503 }));
    await expect(repoSpellingsOnGraph('https://index.test/graphql', 'a/b')).rejects.toThrow(
      'HTTP 503',
    );
    stubFetch(() => Response.json({ errors: [{ message: 'bad query' }] }));
    await expect(repoSpellingsOnGraph('https://index.test/graphql', 'a/b')).rejects.toThrow(
      'no atoms',
    );
  });
});
