import { verifyCategoryRequest } from '@arp-protocol/core';
import { privateKeyToAccount } from 'viem/accounts';
import { describe, expect, it } from 'vitest';

import { categoryToSign } from '../src/handlers/category.js';

// A fixed test key, holding nothing.
const AGENT = privateKeyToAccount(`0x${'66'.repeat(32)}`);
const NOW = Math.floor(Date.now() / 1000);

describe('a domain the tree lacks, asked for in a declaration', () => {
  const answer = categoryToSign({
    domain: 'slides',
    parent: 'design',
    reason: 'none of the design children is about decks',
    declarer: AGENT.address,
    agentRegistry: 'eip155:13579:0xC165A2ADc0000000000000000000000000000001',
    agentId: '8',
    subject: `0x${'0b'.repeat(32)}`,
    nowSeconds: NOW,
  });

  it('answers a request to sign, not calls', () => {
    expect(answer.status).toBe('sign_category_first');
    expect(answer).not.toHaveProperty('calls');
    expect(answer.request).toMatchObject({ label: 'slides', parent: 'design', agentId: '8' });
    expect(answer.next).toContain('arp_propose_category');
  });

  it('gives typed data a wallet signs, whose signature the sponsor accepts', async () => {
    const typed = answer.typed_data as {
      domain: { name: string; version: string; chainId: number };
      types: Record<string, { name: string; type: string }[]>;
      primaryType: 'CategoryRequest';
      message: Record<string, unknown>;
    };
    // What a wallet does with `eth_signTypedData_v4`: it drops the domain's own type and signs the rest.
    const { EIP712Domain: _domainType, ...types } = typed.types;
    const signature = await AGENT.signTypedData({ ...typed, types, message: { ...typed.message, expiresAt: BigInt(String(typed.message['expiresAt'])) } });
    expect(await verifyCategoryRequest({ request: answer.request, chainId: typed.domain.chainId, signature }, NOW)).toEqual({
      status: 'valid',
      address: AGENT.address,
    });
  });
});
