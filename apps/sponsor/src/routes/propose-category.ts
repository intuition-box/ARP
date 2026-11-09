import {
  checkCategoryLimits,
  planCategory,
  verifyCategoryRequest,
  type SignedCategoryRequest,
} from '@arp-protocol/core';
import type { Address, Hex } from 'viem';
import { SPONSOR_CHAIN_ID } from '../key-file.ts';
import { chainUnreadable, isBytes32, json, type Body, type SponsorContext } from './context.ts';

/** A label is one word or a listed compound; this only bounds what is hashed and logged. */
const MAX_LABEL_LENGTH = 64;
/** A reason a reviewer reads in the weekly list (task 59 §2 item 4), not an essay. */
const MAX_REASON_LENGTH = 500;

/** What `/propose-category` keeps of each proposal it wrote, for the weekly review list. */
export type CategoryLogEntry = {
  at: number;
  label: string;
  /** `null` for a tag with an existing category. */
  parent: string | null;
  newCategory: boolean;
  subjectId: Hex;
  /** The agent that signed for it (ADR `0146`), `null` for an unsigned tag. */
  agent: Address | null;
  reason: string;
  transactions: Hex[];
  /** `partial` when a send after the first reverted or was not confirmed: what landed is indexed. */
  status: 'complete' | 'partial';
};

/**
 * A new category, written by the service as an attestor the index reads (task 59 §2 item 3, ADR
 * `0124`). The rules are `planCategory`'s (ADR `0115`, `docs/25` §8). It refuses a label that is
 * already a category, a parent that does not climb to `tool`, a missing reason, and a skill not on
 * chain. A refusal names its rule. Then it writes the category's atom if new,
 * `(category, is a sub-domain of, parent)` and `(skill, has tag, category)`, each at
 * `cost + minDeposit`.
 *
 * An existing category is a valid choice: then only the tag is written (the user, 2026-11-03).
 *
 * Two ways in (task 73, ADR `0146`):
 *
 * - **Signed by an agent** (`body.request`, `SignedCategoryRequest`): the signer must hold the
 *   registered agent it names. Only this way adds a category to the tree, counted against that
 *   agent's own daily cap as well as the global one. The nonce is spent once.
 * - **Unsigned**, from the web app's local origins like `/list-tool`: path C files the tool it just
 *   listed under a category that already exists (the user, 2026-11-09). A new category is refused
 *   with rule `agent`.
 *
 * Every accepted proposal is logged with its reason, under its daily cap inside the budget.
 */
export async function proposeCategory(ctx: SponsorContext, body: Body): Promise<Response> {
  const { options, reads, limits, ledger, now, exclusive, assertMultiVault } = ctx;
  const { sendToMultiVault, unconfirmed } = ctx;
  const categories = options.categories ?? null;
  if (categories === null) {
    return json(
      { error: 'category proposals are not configured on this service', rule: 'config' },
      503,
    );
  }
  let agent: Address | null = null;
  let nonceKey: string | null = null;
  let fields: Body = body;
  if (body.request !== undefined) {
    if (ctx.chainId !== SPONSOR_CHAIN_ID) {
      return json(
        { error: `a category is filed on testnet ${SPONSOR_CHAIN_ID} only`, rule: 'chain' },
        403,
      );
    }
    const verdict = await verifyCategoryRequest(body.request, Math.floor(now() / 1000));
    if (verdict.status !== 'valid') {
      return json({ error: `request is ${verdict.status}`, rule: 'signature', verdict }, 401);
    }
    const signed = body.request as SignedCategoryRequest; // Checked by `verifyCategoryRequest`.
    if (signed.chainId !== ctx.chainId) {
      return json({ error: `request is for chain ${signed.chainId}`, rule: 'signature' }, 400);
    }
    const registered = await ctx.ownerOfAgent(signed.request.agentRegistry, signed.request.agentId);
    if ('unreadable' in registered) return registered.unreadable;
    if ('error' in registered) return json({ error: registered.error }, registered.status);
    if (registered.owner !== verdict.address) {
      return json(
        {
          error: `agent ${signed.request.agentId} is held by ${registered.owner}, not ${verdict.address}`,
          rule: 'agent',
        },
        403,
      );
    }
    const own = ctx.refuseOwnAgent(registered.owner, signed.request.agentId);
    if (own !== null) return own;
    agent = verdict.address;
    nonceKey = `category-nonce:${signed.request.nonce.toLowerCase()}`;
    const { label: l, parent: p, subject, reason: r } = signed.request;
    fields = { label: l, parent: p === '' ? undefined : p, subjectId: subject, reason: r === '' ? undefined : r };
  }
  const { label, parent, subjectId, reason } = fields;
  if (typeof label !== 'string' || label.length === 0 || label.length > MAX_LABEL_LENGTH) {
    return json(
      { error: `label is required, at most ${MAX_LABEL_LENGTH} characters`, rule: 'empty' },
      400,
    );
  }
  // Ignored, and so optional, when `label` is already a category.
  if (parent !== undefined && (typeof parent !== 'string' || parent.length > MAX_LABEL_LENGTH)) {
    return json({ error: 'parent is a string', rule: 'parent' }, 400);
  }
  // Optional for an existing category, required for a new one (`planCategory` decides).
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > MAX_REASON_LENGTH)) {
    return json(
      { error: `reason is required, at most ${MAX_REASON_LENGTH} characters`, rule: 'reason' },
      400,
    );
  }
  if (!isBytes32(subjectId)) return json({ error: 'subjectId is required', rule: 'skill' }, 400);

  const proposal = { label, parent: parent ?? '', subjectId, reason: reason ?? '' };
  const plan = () =>
    planCategory(proposal, {
      reads,
      isCategory: categories.isCategory,
      isKnown: categories.isKnown,
      isTool: categories.isTool,
      compounds: categories.compounds,
      backing: { attestors: categories.attestors, depositor: ctx.wallet.address },
    });
  let first;
  try {
    first = await plan();
  } catch (error) {
    return chainUnreadable(String(error instanceof Error ? error.message : error));
  }
  if (first.status === 'refused') return json({ error: first.detail, rule: first.rule }, 422);
  const answer = (planned: typeof first, transactions: Hex[]) =>
    json({
      newCategory: planned.newCategory,
      label: planned.label,
      parent: planned.parent,
      categoryId: planned.categoryId,
      subDomainTriple: planned.subDomainTripleId,
      tagTriple: planned.tagTripleId,
      created: transactions.length > 0,
      transactions,
    });
  // The root is where every path ends, not a category to tag with.
  if (first.label === 'tool') {
    return json({ error: '"tool" is the root, not a category to tag with', rule: 'root' }, 422);
  }
  // Only an agent's signed request grows the tree (ADR `0146`); a person tags with what exists.
  if (first.newCategory && agent === null) {
    return json(
      { error: 'a new category is added by a registered agent, with a signed request', rule: 'agent' },
      403,
    );
  }
  if (first.calls.length === 0) return answer(first, []);

  // The parent is in the key: one cap slot per label, parent and subject, so a second parent for
  // the same label is a second proposal and not a free edge (security review, task 59).
  const key = first.newCategory
    ? `category:${first.label}:${first.parent}:${subjectId.toLowerCase()}`
    : `category-tag:${first.label}:${subjectId.toLowerCase()}`;
  const limitOf = (value: bigint) =>
    checkCategoryLimits(ledger.relevant(now()), {
      proposal: key,
      newCategory: first.newCategory,
      ...(agent === null ? {} : { agent }),
      value,
      now: now(),
      limits,
    });
  const early = limitOf(first.totalValue);
  if (!early.ok) return json({ error: early.reason, rule: 'limit' }, 429);

  return exclusive(async () => {
    if (nonceKey !== null && ledger.has('category', nonceKey)) {
      return json({ error: 'this request was already used', rule: 'nonce' }, 409);
    }
    const prefix = `${key}#`;
    if (ledger.pending().some((r) => r.kind === 'category' && (r.key ?? '').startsWith(prefix))) {
      return json(
        {
          error:
            'this category was sent and not confirmed; the operator reconciles it against the chain (ledger pending())',
          rule: 'pending',
        },
        409,
      );
    }
    let current;
    try {
      current = await plan();
    } catch (error) {
      return chainUnreadable(String(error instanceof Error ? error.message : error));
    }
    if (current.status === 'refused')
      return json({ error: current.detail, rule: current.rule }, 422);
    // The key and the cap were chosen for one kind of proposal: if the label changed kind between
    // the two reads, the caller asks again rather than be charged to the other cap.
    if (current.newCategory !== first.newCategory) {
      return json(
        { error: 'the category changed while this was queued; ask again', rule: 'changed' },
        409,
      );
    }
    if (current.calls.length === 0) return answer(current, []);
    current.calls.forEach(assertMultiVault);
    const decision = limitOf(current.totalValue);
    if (!decision.ok) return json({ error: decision.reason, rule: 'limit' }, 429);

    // Spent before the first send, and kept whatever lands: a replay must not be paid twice.
    if (nonceKey !== null && agent !== null) {
      ledger.append({ kind: 'category', subject: agent, value: 0n, at: now(), key: nonceKey });
    }
    const sent: Hex[] = [];
    // Every write that lands is logged, finished or not: the review list must see what the index
    // now reads, and a partial category is one.
    const record = (status: CategoryLogEntry['status']) => {
      if (sent.length === 0) return;
      categories.invalidate();
      categories.log({
        at: now(),
        label: current.label,
        parent: current.parent,
        newCategory: current.newCategory,
        subjectId,
        agent,
        reason: (reason ?? '').trim(),
        transactions: sent,
        status,
      });
    };
    // After this proposal's spent records. A reverted key is not spent, so a retry reuses it.
    const offset = ledger.keyedWith('category', prefix).length;
    for (const [index, call] of current.calls.entries()) {
      const recordKey = `${prefix}${offset + index}`;
      ledger.reserve({
        kind: 'category',
        subject: agent ?? ctx.wallet.address,
        value: call.value,
        at: now(),
        key: recordKey,
      });
      const result = await sendToMultiVault(call);
      if (result.status === 'unconfirmed') {
        record('partial');
        return unconfirmed('category', recordKey, result.hash, { transactions: sent });
      }
      if (result.status !== 'success') {
        ledger.settle('category', recordKey, { status: 'reverted', hash: result.hash });
        record('partial');
        return json({ error: `${call.why}: ${result.hash} reverted`, transactions: sent }, 502);
      }
      ledger.settle('category', recordKey, { status: 'success', hash: result.hash });
      sent.push(result.hash);
    }
    record('complete');
    return answer(current, sent);
  });
}
