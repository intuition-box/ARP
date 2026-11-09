import {
  CATEGORY_REQUEST_TYPES,
  categoryRequestTypedData,
  verifyCategoryRequest,
  type SignedCategoryRequest,
  type SponsorCategoryRequest,
} from '@arp-protocol/core';
import { getAddress, isHex, keccak256, stringToBytes, type Address, type Hex } from 'viem';

import { chainId, SPONSOR_URL } from '../config.js';
import { submitCategory } from '../desktop/file-category.js';
import { type JsonRpcId, fail, text } from '../rpc.js';

/**
 * A domain the tree does not have yet, asked for inside a declaration (task 73, ADR `0146`).
 *
 * This server holds no key in this mode, so it cannot sign for the agent. It answers with the request
 * to sign instead of calls: the agent signs it with the wallet that holds its ERC-8004 identity, hands
 * it to `arp_propose_category`, which passes it to ARP's sponsor, and then asks for the declaration
 * again. Only the sponsor's write counts, because the tree is read through ARP's attestors (ADR `0124`).
 */
export type CategoryToSign = {
  status: 'sign_category_first';
  why: string;
  request: SponsorCategoryRequest;
  typed_data: unknown;
  next: string;
};

const TTL_SECONDS = 600;

export function categoryToSign(params: {
  domain: string;
  parent: string;
  reason: string;
  declarer: Address;
  agentRegistry: string;
  agentId: string;
  subject: Hex;
  nowSeconds: number;
}): CategoryToSign {
  const request: SponsorCategoryRequest = {
    agent: getAddress(params.declarer),
    agentRegistry: params.agentRegistry,
    agentId: params.agentId,
    label: params.domain,
    parent: params.parent,
    subject: params.subject,
    reason: params.reason,
    nonce: keccak256(stringToBytes(`category-${params.subject}-${params.domain}-${params.nowSeconds}`)),
    expiresAt: params.nowSeconds + TTL_SECONDS,
  };
  const typed = categoryRequestTypedData(request, chainId);
  return {
    status: 'sign_category_first',
    why: `"${params.domain}" is not a category yet. ARP adds it to the tree under "${params.parent}" when your agent signs for it.`,
    request,
    // Shaped for `eth_signTypedData_v4`: the domain's own type is listed and the expiry is a string.
    typed_data: {
      domain: typed.domain,
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
        ],
        ...CATEGORY_REQUEST_TYPES,
      },
      primaryType: typed.primaryType,
      message: { ...request, expiresAt: String(request.expiresAt) },
    },
    next:
      `Sign typed_data with ${request.agent} within ${TTL_SECONDS / 60} minutes, then call arp_propose_category ` +
      'with `request` and the `signature`. Once it answers `filed`, call arp_declare_used again with the same arguments.',
  };
}

/** `arp_propose_category`: hand a signed category request to ARP's sponsor. */
export async function proposeCategory(id: JsonRpcId, args: Record<string, unknown>) {
  const request = args['request'];
  const signature = args['signature'];
  if (typeof request !== 'object' || request === null) {
    return fail(id, -32602, 'request must be the `request` object arp_declare_used returned');
  }
  if (typeof signature !== 'string' || !isHex(signature)) {
    return fail(id, -32602, 'signature must be the 0x signature of `typed_data`');
  }
  const signed = { request, chainId, signature };
  // Checked here first, so a wrong signer is told before the sponsor is asked.
  const verdict = await verifyCategoryRequest(signed, Math.floor(Date.now() / 1000));
  if (verdict.status !== 'valid') {
    return fail(id, -32602, `the request is ${verdict.status}: sign typed_data with the request's agent address`);
  }
  return text(
    id,
    await submitCategory(signed as SignedCategoryRequest, { // checked by `verifyCategoryRequest`
      sponsorUrl: SPONSOR_URL,
      fetch: globalThis.fetch.bind(globalThis),
    }),
  );
}
