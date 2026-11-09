import type { SignedCategoryRequest } from '@arp-protocol/core';

/**
 * `arp_file_category`: file a skill under a category through the sponsor (task 59, ADR `0124`).
 *
 * The agent pays nothing, and asks nothing of the person. It signs the request with its local key,
 * because only a registered agent's signed request may add a category to the tree (task 73, ADR
 * `0146`). The sponsor checks the proposal against the same rules as every category (`docs/25` §8)
 * and writes it as the index's attestor. An existing category writes only the tag; a new one needs a
 * parent and a reason.
 *
 * Every IO is injected, so the test needs no server.
 */
export type FileCategoryArgs = { id: string; category: string; parent?: string; reason?: string };

export type FileCategoryAnswer =
  | { filed: string; new_category: boolean; written: boolean }
  | { refused: string; detail: string }
  | { error: string };

/** The fields the agent signs; the signer fills the rest (agent, nonce, expiry). */
export type CategoryFields = { label: string; parent: string; subject: string; reason: string };

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function fileCategory(
  args: FileCategoryArgs,
  deps: { sponsorUrl: string; fetch: Fetch; sign: (fields: CategoryFields) => Promise<SignedCategoryRequest> },
): Promise<FileCategoryAnswer> {
  let request: SignedCategoryRequest;
  try {
    request = await deps.sign({
      label: args.category,
      parent: args.parent ?? '',
      subject: args.id,
      reason: args.reason ?? '',
    });
  } catch (error) {
    return { error: `this agent could not sign the request: ${error instanceof Error ? error.message : String(error)}` };
  }
  return submitCategory(request, deps);
}

/** Send a signed request to the sponsor and read its answer. Shared with `arp_propose_category`. */
export async function submitCategory(
  request: SignedCategoryRequest,
  deps: { sponsorUrl: string; fetch: Fetch },
): Promise<FileCategoryAnswer> {
  let response: Response;
  try {
    response = await deps.fetch(`${deps.sponsorUrl}/propose-category`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ request }),
    });
  } catch {
    return { error: "ARP's sponsor is not reachable, so the category was not filed." };
  }
  const answer: unknown = await response.json().catch(() => null);
  if (response.ok && isRecord(answer) && typeof answer['label'] === 'string') {
    return {
      filed: answer['label'],
      new_category: answer['newCategory'] === true,
      written: answer['created'] === true,
    };
  }
  const rule = isRecord(answer) && typeof answer['rule'] === 'string' ? answer['rule'] : 'unknown';
  const detail =
    isRecord(answer) && typeof answer['error'] === 'string'
      ? answer['error']
      : `HTTP ${response.status}`;
  return { refused: rule, detail };
}
