import { signCategoryRequest, verifyCategoryRequest } from '@arp-protocol/core';
import type { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { describe, expect, it, vi } from 'vitest';

import { fileCategory, type CategoryFields } from '../src/desktop/file-category.js';

const ID = `0x${'c'.repeat(64)}`;
// A fixed test key, holding nothing.
const AGENT = privateKeyToAccount(`0x${'66'.repeat(32)}`);
const answering = (status: number, body: unknown) =>
  vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify(body), { status }));
const sign = (fields: CategoryFields) =>
  signCategoryRequest(
    {
      agent: AGENT.address,
      agentRegistry: 'eip155:13579:0xC165A2ADc0000000000000000000000000000001',
      agentId: '7',
      label: fields.label,
      parent: fields.parent,
      subject: fields.subject as Hex, // a fixed 32-byte id in this test
      reason: fields.reason,
      nonce: `0x${'ab'.repeat(32)}`,
      expiresAt: Math.floor(Date.now() / 1000) + 600,
    },
    13579,
    AGENT,
  );
const sentBody = (fetch: ReturnType<typeof answering>) =>
  JSON.parse(String((fetch.mock.calls[0]![1] as RequestInit).body)) as { request: unknown };

describe('arp_file_category', () => {
  it('sends a request signed by the agent, which the sponsor can verify', async () => {
    const fetch = answering(200, { label: 'design', newCategory: false, created: true });
    const answer = await fileCategory({ id: ID, category: 'design' }, { sponsorUrl: 'http://sponsor', fetch, sign });
    expect(fetch.mock.calls[0]![0]).toBe('http://sponsor/propose-category');
    const { request } = sentBody(fetch);
    expect(await verifyCategoryRequest(request, Math.floor(Date.now() / 1000))).toEqual({
      status: 'valid',
      address: AGENT.address,
    });
    expect(request).toMatchObject({ request: { label: 'design', parent: '', reason: '', subject: ID } });
    expect(answer).toEqual({ filed: 'design', new_category: false, written: true });
  });

  it('signs a parent and a reason for a new category, and reports a refusal by its rule', async () => {
    const fetch = answering(422, { error: 'say why no existing category fits', rule: 'reason' });
    const answer = await fileCategory(
      { id: ID, category: 'slides', parent: 'design' },
      { sponsorUrl: 'http://sponsor', fetch, sign },
    );
    expect(sentBody(fetch)).toMatchObject({ request: { request: { label: 'slides', parent: 'design' } } });
    expect(answer).toEqual({ refused: 'reason', detail: 'say why no existing category fits' });
  });

  it('says so when the agent cannot sign, and sends nothing', async () => {
    const fetch = answering(200, {});
    const answer = await fileCategory(
      { id: ID, category: 'design' },
      { sponsorUrl: 'http://sponsor', fetch, sign: async () => Promise.reject(new Error('no gas for register()')) },
    );
    expect(answer).toEqual({ error: 'this agent could not sign the request: no gas for register()' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('says so when the sponsor is not running', async () => {
    const down = vi.fn(async (_url: string, _init: RequestInit): Promise<Response> => {
      throw new TypeError('fetch failed');
    });
    expect(
      await fileCategory({ id: ID, category: 'design' }, { sponsorUrl: 'http://sponsor', fetch: down, sign }),
    ).toEqual({
      error: "ARP's sponsor is not reachable, so the category was not filed.",
    });
  });
});
