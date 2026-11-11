import {
  checkLineLimits,
  checkReceiptEvidence,
  planVersionedUse,
  receiptEvidenceLabel,
  checkPayee,
  checkX402Payment,
  exactEndpointNamesTool,
  lineTermsOf,
  isRedactedEndpointUrl,
  isToolUrl,
  normaliseToolUrl,
  needKindOfReason,
  publishableNeed,
  skillRefFromUrl,
  parsePaymentAtomLabel,
  paymentLevelLabel,
  encodeCreateTriple,
  planDepositApproval,
  planSponsoredDeposit,
  prepareUsageContext,
  verifyLineRequest,
  type PayeeCheck,
  type SignedContentReceipt,
  type SignedLineRequest,
  type X402Terms,
} from '@arp-protocol/core';
import { getAddress, type Address, type Hex } from 'viem';
import { SPONSOR_CHAIN_ID } from '../key-file.ts';
import { chainUnreadable, json, REGISTRY, type Body, type SponsorContext } from './context.ts';

/**
 * One line, form B, paid by the service (ADR `0144`): the `uses` edge if missing, the domain, the
 * outcome and the reason, and then a deposit in the agent's name on each level, so the agent's wallet
 * stands behind them (`pulse-usage.ts`). The service creates terms and is never counted as saying them.
 *
 * **No proof of use** is asked, unlike `/deposit`: a line is the agent's word. Testnet 13579 only, under
 * a per-agent and a total daily cap and the shared budget.
 *
 * **An x402 line** (task 89, ADR `0159`) names its payment, and adds `(outcome, paid with, payment)`.
 * The service reads that transaction on its own network, read-only, before it spends anything: one
 * transfer of an accepted asset from the agent's holder or its `agentWallet`. That is also what lets a
 * line be about an endpoint, which ADR `0144` refused: lifting an endpoint now costs a real payment.
 *
 * **The exact URL paid** (task 93, ADR `0162`) rides in the payment level's atom, after the payment and
 * one space, so naming it costs nothing more. It must normalise to the tool atom's URL, read from the
 * index, or a writer could name any URL beside somebody else's endpoint.
 *
 * **With its values removed** (task 119, ADR `0186`): the payer reduces the URL before it signs
 * (`redactEndpointUrl`), and this refuses with 422 `rule: 'endpoint-private'` a URL that still carries a
 * query value, a fragment, credentials or a path segment that looks personal, and a tool atom whose URL
 * does. It refuses rather than reduces: the agent signed the URL, and a value it signed is not written.
 *
 * **To the endpoint, for its price** (task 122, ADR `0189`): the request signs the terms the payer paid
 * against. The transfer must match them (`checkX402Payment`), and they must match ARP's probe's reading of
 * the endpoint's `402` from before the payment, or a live read of it now (`checkPayee`); a reading that
 * disagrees refuses with 422 `rule: 'payee'`. Neither readable writes the line all the same, and keeps
 * `unchecked` beside its request, which the feed counts apart. The live read connects to the URL the agent
 * signed, through the same pinned client as `/list-tool`, and only after its payment has checked on chain.
 *
 * **What was missing, or added** (task 97, ADR `0166`): `(reason, needs, ffmpeg)` on a missing-program or
 * missing-key failure, `(outcome, with, ffmpeg)` on a worked line. Written only when the skill's own SKILL.md,
 * read from GitHub at `HEAD`, names it whole (`publishableNeed`): a word its author published, never one from
 * the agent's machine. A name the file does not hold refuses the whole request, since the agent signed it, and
 * nothing is spent.
 *
 * **Which version, and what backs it** (task 127, ADR `0192`). A request that signs a skill's directory digest is
 * written about `V = (skill, version, sha256:<digest>)`: `T1 = (agent, uses, V)`, with `V` created if missing. The
 * digest is written only when it is a published one: the skill's directory at its repository's `HEAD`, read from
 * GitHub, or the digest of a content receipt from a node this service accepts. Otherwise 422 `rule: 'version'`,
 * and a writer drops the version and signs again (a local edit writes no version, ADR `0185`). A request that names
 * a receipt's hash brings the receipt beside it (`body.receipt`); it must be ARP's node's, for this agent, this tool
 * and this digest (`checkReceiptEvidence`), or 422 `rule: 'evidence'`. It adds `(outcome, has evidence,
 * content-receipt:<hash>)`, and the receipt is kept and served at `GET /receipt?hash=`.
 */
export async function line(ctx: SponsorContext, body: Body): Promise<Response> {
  const { options, chainId, wallet, reads, limits, ledger, now, multiVault } = ctx;
  const { exclusive, sendToMultiVault, ownerOfAgent, refuseOwnAgent, unconfirmed, assertMultiVault, owners } = ctx;
  const lines = options.lines ?? null;
  if (lines === null || options.categories === undefined || options.categories === null) {
    return json({ error: 'writing a line is not configured on this service', rule: 'config' }, 503);
  }
  if (chainId !== SPONSOR_CHAIN_ID) {
    return json({ error: `a sponsored line is written on testnet ${SPONSOR_CHAIN_ID} only`, rule: 'chain' }, 403);
  }
  const verdict = await verifyLineRequest(body.request, Math.floor(now() / 1000));
  if (verdict.status !== 'valid') {
    return json({ error: `request is ${verdict.status}`, rule: 'signature', verdict }, 401);
  }
  const signed = body.request as SignedLineRequest; // Checked by `verifyLineRequest`.
  if (signed.chainId !== chainId) {
    return json({ error: `request is for chain ${signed.chainId}`, rule: 'signature' }, 400);
  }
  const { request } = signed;
  const agent = verdict.address;

  const registered = await ownerOfAgent(request.agentRegistry, request.agentId);
  if ('unreadable' in registered) return registered.unreadable;
  if ('error' in registered) return json({ error: registered.error }, registered.status);
  if (registered.owner !== agent) {
    return json({ error: `agent ${request.agentId} is held by ${registered.owner}, not ${agent}` }, 403);
  }
  const own = refuseOwnAgent(registered.owner, request.agentId);
  if (own !== null) return own;

  const subjectRead = await options.identities.identityAtom({
    agentRegistry: request.agentRegistry,
    agentId: request.agentId,
  });
  if (subjectRead.status === 'none') {
    return json({ error: `agent ${request.agentId} has no identity atom on the graph` }, 403);
  }
  if (subjectRead.status === 'ambiguous') {
    return json({ error: `agent ${request.agentId}: ${subjectRead.reason}` }, 409);
  }
  const subject = subjectRead.atom;
  const categories = options.categories;

  const payment = request.payment === '' ? null : parsePaymentAtomLabel(request.payment);
  if (payment !== null && !isRedactedEndpointUrl(request.endpoint)) {
    return json(
      { error: `${request.endpoint} still carries a value; sign it with its values removed (redactEndpointUrl)`, rule: 'endpoint-private' },
      422,
    );
  }
  let payee: PayeeCheck = { status: 'unchecked', checkedAt: null };
  if (payment !== null) {
    const payments = lines.payments ?? null;
    if (payments === null) {
      return json({ error: 'a line with a payment is not configured on this service', rule: 'config' }, 503);
    }
    // Checked again under the lock below. Here so that a replay costs no read of somebody else's endpoint.
    if (ledger.has('line', `line-payment:${request.payment}`)) {
      return json({ error: 'this payment already backs a line', rule: 'payment' }, 409);
    }
    const terms = lineTermsOf(request) as X402Terms; // a payment's terms, checked by `verifyLineRequest`
    let paidAt = 0;
    if (!payments.policy.has(payment.network)) {
      return json(
        { error: `network ${payment.network} is not one this service reads: ${[...payments.policy.keys()].join(', ')}`, rule: 'network' },
        422,
      );
    }
    const payers: Address[] = [agent];
    try {
      const wallet = await owners.agentWalletOf(getAddress(REGISTRY.exec(request.agentRegistry)?.[2] ?? ''), BigInt(request.agentId));
      if (wallet !== null) payers.push(getAddress(wallet));
    } catch (error) {
      return chainUnreadable(String(error instanceof Error ? error.message : error));
    }
    const checked = await checkX402Payment({
      ref: payment,
      payers,
      policy: payments.policy,
      reads: payments.readsFor(payment.network),
      terms,
    });
    if (checked.status === 'unreadable') return chainUnreadable(checked.reason);
    if (checked.status === 'refused') return json({ error: `the payment does not check: ${checked.reason}`, rule: 'payment' }, 422);
    paidAt = checked.paidAt;

    if (lines.toolUrl === undefined) {
      return json({ error: 'a line with a payment is not configured on this service', rule: 'config' }, 503);
    }
    let toolUrl: string | null;
    try {
      toolUrl = await lines.toolUrl(request.tool);
    } catch (error) {
      return chainUnreadable(String(error instanceof Error ? error.message : error));
    }
    if (toolUrl === null) return json({ error: 'the index has no document for this tool yet', rule: 'tool', retry: true }, 422);
    if (isToolUrl(toolUrl) && !isRedactedEndpointUrl(normaliseToolUrl(toolUrl))) {
      return json(
        { error: `the tool's atom ${toolUrl} carries a value; list the endpoint with its values removed`, rule: 'endpoint-private' },
        422,
      );
    }
    if (!exactEndpointNamesTool(request.endpoint, toolUrl)) {
      return json({ error: `${request.endpoint} is not a spelling of the tool's URL ${toolUrl}`, rule: 'endpoint' }, 422);
    }

    // ADR `0189`: the terms must be the endpoint's, by a reading the payer does not control.
    const readings = lines.x402Terms ?? null;
    const endpoint = request.endpoint;
    const canonical = normaliseToolUrl(toolUrl);
    payee = await checkPayee({
      terms,
      paidAt,
      probe: readings === null ? null : await readings.probe(canonical, paidAt),
      live: async () => (readings === null ? null : readings.live(endpoint)),
    });
    if (payee.status === 'refused') {
      return json({ error: `the terms are not the endpoint's: ${payee.reason}`, rule: 'payee' }, 422);
    }
  }

  // ADR `0192`: the version a line names is a published digest, and its evidence a receipt over that digest.
  let evidence: { hash: string; receipt: SignedContentReceipt } | null = null;
  if (request.version !== '') {
    if (ledger.has('line', `line:${request.nonce.toLowerCase()}`)) {
      return json({ error: 'this request was already used', rule: 'nonce' }, 409);
    }
    const checked = await checkVersion(ctx, lines, request.tool, request.version, request.evidence, body.receipt, agent);
    if (checked instanceof Response) return checked;
    evidence = checked;
  }

  if (request.need !== '') {
    // A replayed request must not spend GitHub's hourly allowance: the nonce is checked again below, under the lock.
    if (ledger.has('line', `line:${request.nonce.toLowerCase()}`)) {
      return json({ error: 'this request was already used', rule: 'nonce' }, 409);
    }
    const refused = await checkNeed(lines, request.tool, request.need, request.outcome === 'worked' ? null : needKindOfReason(request.reason));
    if (refused !== null) return refused;
  }

  return exclusive(async () => {
    // One payment backs one sponsored line, whoever asks again and under any nonce (ADR `0159`): its
    // label is the key. A replay of the same request names the same payment, so the nonce is covered.
    const key = payment === null ? `line:${request.nonce.toLowerCase()}` : `line-payment:${request.payment}`;
    if (ledger.has('line', key)) {
      return json(
        { error: payment === null ? 'this request was already used' : 'this payment already backs a line', rule: payment === null ? 'nonce' : 'payment' },
        409,
      );
    }

    let usesId: Hex;
    let versioned: Awaited<ReturnType<typeof planVersionedUse>> | null = null;
    let object: Hex = request.tool;
    let plan;
    let edgeExists: boolean;
    let cost: bigint;
    try {
      if (!(await reads.termExists(request.tool))) {
        return json({ error: 'the tool has no atom: list it first (POST /list-tool)', rule: 'tool' }, 422);
      }
      const about = await lines.subject(request.tool);
      if (about === 'other' && payment === null) {
        return json(
          { error: 'a sponsored line is about a skill or repository on GitHub, or an x402 endpoint with its payment', rule: 'tool' },
          422,
        );
      }
      if (about === 'unseen') {
        return json({ error: 'the index has no document for this tool yet', rule: 'tool', retry: true }, 422);
      }
      // With a version, the use is of `V = (skill, version, sha256:<digest>)`, not of the skill (ADR `0192`).
      versioned = request.version === '' ? null : await planVersionedUse({ tool: request.tool, digest: request.version, reads });
      object = versioned?.versionTripleId ?? request.tool;
      usesId = await reads.tripleId(subject, options.usesPredicate, object);
      edgeExists = await reads.termExists(usesId);
      const [tripleCost, minDeposit] = await Promise.all([reads.tripleCost(), reads.minDeposit()]);
      cost = tripleCost + minDeposit;
      plan = await prepareUsageContext({
        usesTripleId: usesId,
        edgePlanned: !edgeExists,
        ...(request.domain === '' ? {} : { domain: request.domain }),
        outcome: request.outcome,
        ...(request.reason === '' ? {} : { reason: request.reason }),
        ...(payment === null ? {} : { payment: paymentLevelLabel(payment, request.endpoint) }),
        ...(request.need === '' ? {} : { need: request.need }),
        ...(evidence === null ? {} : { evidence: receiptEvidenceLabel(evidence.hash) }),
        inContextOf: lines.inContextOf,
        isCategory: categories.isCategory,
        reads,
      });
    } catch (error) {
      return chainUnreadable(String(error instanceof Error ? error.message : error));
    }
    if (plan.status === 'refused') return json({ error: plan.detail, rule: plan.rule }, 422);

    const levels = [
      usesId,
      plan.contextTripleId,
      plan.outcomeTripleId,
      plan.reasonTripleId,
      plan.paymentTripleId,
      plan.needTripleId,
      plan.evidenceTripleId,
    ].filter(
      (term): term is Hex => term !== null,
    );
    const curve = await reads.defaultCurveId();
    const missing: Hex[] = [];
    for (const term of levels) {
      if ((await reads.sharesOf(agent, term, curve)) === 0n) missing.push(term);
    }
    const versionCalls = versioned?.calls ?? [];
    if (edgeExists && versionCalls.length === 0 && plan.calls.length === 0 && missing.length === 0) {
      return json({ termId: usesId, levels, created: false, transactions: [], ...versionAnswer(versioned) });
    }

    const value =
      (versioned?.totalValue ?? 0n) + (edgeExists ? 0n : cost) + plan.totalValue + BigInt(missing.length) * limits.depositAmount;
    const fits = checkLineLimits(ledger.relevant(now()), { agent, value, now: now(), limits });
    if (!fits.ok) return json({ error: fits.reason, rule: 'limit' }, 429);

    // Whether the agent approved this service, learnt on a term that exists, before anything is spent.
    const probe = await planSponsoredDeposit({
      receiver: agent,
      termId: request.tool,
      amount: limits.depositAmount,
      reads,
    });
    const simulated = await wallet.simulate(probe.call);
    if (!simulated.ok) {
      return json(
        {
          error: `a deposit in the agent's name does not simulate: ${simulated.reason}`,
          approve: planDepositApproval({ multiVault, chainId, sponsor: wallet.address }),
        },
        409,
      );
    }

    const calls = [
      ...versionCalls,
      ...(edgeExists
        ? []
        : [
            {
              kind: 'create-triple' as const,
              chainId,
              to: multiVault,
              value: cost,
              data: encodeCreateTriple(subject, options.usesPredicate, object, cost),
              why: `the \`uses\` triple ${usesId}, created for a sponsored line`,
            },
          ]),
      ...plan.calls,
    ];
    for (const call of calls) assertMultiVault(call);

    // Kept before the first send, as the spend is reserved: a line that lands always has its request (ADR `0188`).
    if (payment !== null) lines.requests?.keep(signed, now(), payee);
    if (evidence !== null) lines.receipts?.keep(evidence.hash, evidence.receipt, now());
    ledger.reserve({ kind: 'line', subject: agent, value, at: now(), key, termId: usesId });
    const transactions: Hex[] = [];
    // A revert frees the reservation only when nothing landed. Terms already paid for stay counted, and
    // the nonce stays spent, or a replay could lose more without any cap seeing it (ADR `0144`).
    const fail = (hash: Hex) => {
      const last = transactions.at(-1);
      ledger.settle('line', key, last === undefined ? { status: 'reverted', hash } : { status: 'success', hash: last });
      return json({ error: `transaction ${hash} reverted`, transactions }, 502);
    };
    for (const call of calls) {
      const sent = await sendToMultiVault(call);
      if (sent.status === 'unconfirmed') return unconfirmed('line', key, sent.hash, { transactions });
      if (sent.status !== 'success') return fail(sent.hash);
      transactions.push(sent.hash);
    }
    for (const term of missing) {
      const deposit = await planSponsoredDeposit({
        receiver: agent,
        termId: term,
        amount: limits.depositAmount,
        reads,
      });
      const sent = await sendToMultiVault(deposit.call);
      if (sent.status === 'unconfirmed') return unconfirmed('line', key, sent.hash, { transactions });
      if (sent.status !== 'success') return fail(sent.hash);
      transactions.push(sent.hash);
    }
    ledger.settle('line', key, { status: 'success', hash: transactions.at(-1) as Hex }); // at least one, checked above
    return json({ termId: usesId, levels, created: calls.length > 0, transactions, ...versionAnswer(versioned) });
  });
}

/**
 * `GET /line-request?payment=eip155:<chain>/tx/<hash>`: the request an agent signed for the x402 line that
 * names this payment, as it posted it, or 404 (task 121, ADR `0188`). Read-only. Every field but the nonce,
 * the expiry, the terms and the signature is already on chain in the line; beside them, `payee_check` and
 * `payee_checked_at` (unix seconds) say which reading named the terms as the endpoint's (ADR `0189`).
 */
export function lineRequest(ctx: SponsorContext, url: URL): Response {
  const store = ctx.options.lines?.requests ?? null;
  if (store === null) return json({ error: 'signed requests are not kept on this service', rule: 'config' }, 503);
  const payment = url.searchParams.get('payment') ?? '';
  if (parsePaymentAtomLabel(payment) === null) {
    return json({ error: 'payment is eip155:<chain>/tx/<hash>, lower case', rule: 'payment' }, 400);
  }
  const kept = store.get(payment);
  if (kept === null) return json({ error: 'no signed request is kept for this payment' }, 404);
  // The payee check beside the request (ADR `0189`): ARP's word on which reading named the signed terms.
  return json({ ...kept.signed, payee_check: kept.payee.check, payee_checked_at: kept.payee.checkedAt });
}

/** The version a line was written on, for the answer: `V`'s id beside the levels, which do not include it. */
function versionAnswer(versioned: Awaited<ReturnType<typeof planVersionedUse>> | null) {
  return versioned === null ? {} : { versionTripleId: versioned.versionTripleId };
}

/**
 * `GET /receipt?hash=0x…`: the content receipt behind a line that names `content-receipt:<hash>`, as the agent
 * sent it, or 404 (task 127, ADR `0192`). Read-only. A stranger recomputes the hash (`contentReceiptHash`),
 * recovers the node (`verifyContentReceipt`) and the digest from the repository at the receipt's commit.
 */
export function lineReceipt(ctx: SponsorContext, url: URL): Response {
  const store = ctx.options.lines?.receipts ?? null;
  if (store === null) return json({ error: 'receipts are not kept on this service', rule: 'config' }, 503);
  const hash = url.searchParams.get('hash') ?? '';
  if (!/^0x[0-9a-f]{64}$/.test(hash)) return json({ error: 'hash is 0x and 64 lower-case hex', rule: 'hash' }, 400);
  const kept = store.get(hash);
  return kept === null ? json({ error: 'no receipt is kept for this hash' }, 404) : json(kept);
}

/**
 * Whether a line's version is a published digest, and its evidence a receipt over it (ADR `0192`): the receipt
 * accepted, or `null` when the line names none; otherwise the answer that refuses the line. Nothing is spent.
 */
async function checkVersion(
  ctx: SponsorContext,
  lines: NonNullable<SponsorContext['options']['lines']>,
  tool: Hex,
  version: string,
  evidenceHash: string,
  sent: unknown,
  agent: Address,
): Promise<{ hash: string; receipt: SignedContentReceipt } | null | Response> {
  if (lines.toolUrl === undefined) {
    return json({ error: 'a line that names a version is not configured on this service', rule: 'config' }, 503);
  }
  let toolUrl: string | null;
  try {
    toolUrl = await lines.toolUrl(tool);
  } catch (error) {
    return chainUnreadable(String(error instanceof Error ? error.message : error));
  }
  if (toolUrl === null) return json({ error: 'the index has no document for this tool yet', rule: 'tool', retry: true }, 422);
  if (skillRefFromUrl(toolUrl) === null) {
    return json({ error: "a version names a skill's directory, and this tool is not a skill", rule: 'version' }, 422);
  }
  if (evidenceHash !== '') {
    if (lines.receipts === undefined || lines.receipts === null) {
      return json({ error: 'a line backed by a receipt is not configured on this service', rule: 'config' }, 503);
    }
    const verdict = await checkReceiptEvidence({
      signed: sent,
      hash: evidenceHash,
      agent,
      tool,
      version,
      chainId: ctx.chainId,
      accepted: ctx.options.acceptedContentSigners,
    });
    if (verdict.status === 'refused') return json({ error: `the receipt does not back this line: ${verdict.reason}`, rule: 'evidence' }, 422);
    // An accepted node served these files, so the digest is one it published.
    return { hash: verdict.hash, receipt: sent as SignedContentReceipt }; // checked by `checkReceiptEvidence`
  }
  if (lines.skillDigest === undefined) {
    return json({ error: 'a line that names a version is not configured on this service', rule: 'config' }, 503);
  }
  let published: string | null;
  try {
    published = await lines.skillDigest(toolUrl);
  } catch (error) {
    // GitHub not answering says nothing about the skill, and no version is written without its files.
    const reason = String(error instanceof Error ? error.message : error).slice(0, 200);
    return json({ error: `the skill's directory could not be read: ${reason}`, rule: 'version', retry: true }, 503);
  }
  if (published !== version.toLowerCase()) {
    return json(
      { error: `${version} is not ${toolUrl}'s directory at HEAD; a local edit writes no version`, rule: 'version' },
      422,
    );
  }
  return null;
}

/**
 * Whether the skill's own SKILL.md names `need` (ADR `0166`), or the answer that refuses the line. `kind` is
 * what the failure's reason calls for, `null` on a worked line, where either shape may stand.
 */
async function checkNeed(
  lines: NonNullable<SponsorContext['options']['lines']>,
  tool: Hex,
  need: string,
  kind: 'program' | 'key' | null,
): Promise<Response | null> {
  if (lines.toolUrl === undefined || lines.skillMarkdown === undefined) {
    return json({ error: 'a line that names what was missing is not configured on this service', rule: 'config' }, 503);
  }
  let toolUrl: string | null;
  try {
    toolUrl = await lines.toolUrl(tool);
  } catch (error) {
    return chainUnreadable(String(error instanceof Error ? error.message : error));
  }
  if (toolUrl === null) return json({ error: 'the index has no document for this tool yet', rule: 'tool', retry: true }, 422);
  if (skillRefFromUrl(toolUrl) === null) {
    return json({ error: 'a line names what was missing only about a skill, whose SKILL.md names it', rule: 'need' }, 422);
  }
  let markdown: string | null;
  try {
    markdown = await lines.skillMarkdown(toolUrl);
  } catch (error) {
    // GitHub not answering says nothing about the skill, and nothing is written without its file.
    const reason = String(error instanceof Error ? error.message : error).slice(0, 200);
    return json({ error: `the skill's SKILL.md could not be read: ${reason}`, rule: 'need' }, 503);
  }
  if (markdown === null) return json({ error: `${toolUrl} has no single SKILL.md to check "${need}" against`, rule: 'need' }, 422);
  if (publishableNeed(need, markdown, kind ?? undefined) === null) {
    return json({ error: `the skill's SKILL.md does not name "${need}", so it is not written`, rule: 'need' }, 422);
  }
  return null;
}
