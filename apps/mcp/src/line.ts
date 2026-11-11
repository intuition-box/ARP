/**
 * Writing one line from this machine: `arp line`, and what `arp share` calls (ADR `0144`). Kept out of the
 * MCP server's tools on purpose: a server that holds an agent key does not run the search package
 * (`handlers/pulse.ts`, `canSearch`), so the plugin's server stays read-only and holds no key, and this holds
 * it for the length of one call.
 */
import {
  chainIdOfNetwork,
  isCategoryIn,
  isExactEndpointUrl,
  isTransactionAbsent,
  isUsageOutcome,
  isUsageReason,
  needShapeProblem,
  normaliseCategoryLabel,
  readDomainTree,
  redactEndpointUrl,
  resolveDomain,
  skillRefFromUrl,
  type DomainResolution,
  USAGE_REASONS,
  transfersIn,
  X402_DEFAULT_NETWORKS,
  x402NetworksFrom,
  x402Reading,
  type X402NetworkTable,
  type X402NetworkPolicy,
  type X402Transfer,
  type X402TransferReads,
} from '@arp-protocol/core';
import { skillDirectoryDigest } from '@arp-protocol/core/node';
import type { Hex } from 'viem';

import { chainId, domainWalk } from './config.js';
import { domainWords } from './domain-words.js';
import type { AgentSender } from './desktop/agent-key.js';
import { agentFor, loopConfig } from './desktop/handlers.js';
import { sponsorApproval, writeLine, type LineInput, type LineTerms, type LoopConfig, type WrittenLine } from './desktop/loop.js';

/** Base by default, plus what `ARP_X402_NETWORKS` adds (task 91, ADR `0160`). Throws on a malformed setting. */
export function lineNetworks(env: Readonly<Record<string, string | undefined>> = process.env): X402NetworkTable {
  return x402NetworksFrom(X402_DEFAULT_NETWORKS, env);
}

/** A command line's strings as a line, or what is wrong with them. Closed words only. */
export function lineFromArgs(args: {
  toolUrl: string;
  outcome: string;
  domain: string | undefined;
  reason: string | undefined;
  /** With `why`, adds `domain` to the tree under this category if it is not there (ADR `0146`). */
  parent?: string | undefined;
  why?: string | undefined;
  /** With `network`, the x402 settlement this outcome refers to (task 89, ADR `0159`). */
  paymentTx?: string | undefined;
  network?: string | undefined;
  /**
   * With `paymentTx`, all four: the `payTo`, `asset` and `amount` of the x402 `PaymentRequirements` that was
   * paid, and when that `402` was received, unix seconds or ISO 8601 (task 122, ADR `0189`).
   */
  payTo?: string | undefined;
  asset?: string | undefined;
  price?: string | undefined;
  termsAt?: string | undefined;
  /** With a missing-program or missing-key failure: the program or variable's name that was missing (ADR `0166`). */
  needs?: string | undefined;
  /** With a worked outcome: the program or variable's name the agent had to add (ADR `0166`). */
  with?: string | undefined;
  /**
   * The directory the skill ran from: its digest is the line's version (task 127, ADR `0192`). Only for a skill's
   * URL, never with a payment.
   */
  skillDir?: string | undefined;
}, env: Readonly<Record<string, string | undefined>> = process.env): LineInput | Error {
  if ((args.parent === undefined) !== (args.why === undefined)) return new Error('--parent and --why go together');
  if ((args.paymentTx === undefined) !== (args.network === undefined)) return new Error('--payment-tx and --network go together');
  if (args.network !== undefined && chainIdOfNetwork(args.network) === null) {
    return new Error('--network is a CAIP-2 EVM network, such as eip155:8453 for Base');
  }
  if (args.network !== undefined) {
    let networks: X402NetworkTable;
    try {
      networks = lineNetworks(env);
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
    if (!networks.has(args.network)) return new Error(`--network must be one of ${[...networks.keys()].join(', ')}`);
  }
  if (args.paymentTx !== undefined && !/^0x[0-9a-fA-F]{64}$/.test(args.paymentTx)) return new Error('--payment-tx is a 32-byte transaction hash');
  const terms = termsFromArgs(args);
  if (terms instanceof Error) return terms;
  if (args.reason === 'no-delivery' && args.paymentTx === undefined) {
    return new Error('--reason no-delivery means paid, nothing received: it takes --payment-tx and --network');
  }
  // The line names the URL as it was called, beside the tool's canonical atom (ADR `0162`), with its values
  // removed before anything is signed (ADR `0186`): `?city=paris` is written `?city=`.
  let toolUrl = args.toolUrl;
  if (args.paymentTx !== undefined) {
    if (!isExactEndpointUrl(args.toolUrl)) {
      return new Error('with --payment-tx, --tool is the exact URL you paid, scheme included, as you called it');
    }
    try {
      toolUrl = redactEndpointUrl(args.toolUrl);
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }
  if (args.parent !== undefined && args.domain === undefined) return new Error('--parent and --why add a --domain');
  if (args.why !== undefined && args.why.trim() === '') return new Error('--why says why no category fits');
  if (!isUsageOutcome(args.outcome)) return new Error('--outcome must be worked or failed');
  if (args.reason !== undefined && !isUsageReason(args.reason)) {
    return new Error(`--reason must be one of ${USAGE_REASONS.join(', ')}`);
  }
  if (args.reason !== undefined && args.outcome !== 'failed') return new Error('a reason only follows --outcome failed');
  if (args.needs !== undefined && args.outcome !== 'failed') return new Error('--needs follows --outcome failed; a worked line takes --with');
  if (args.with !== undefined && args.outcome !== 'worked') return new Error('--with follows --outcome worked; a failure takes --needs');
  const need = args.needs ?? args.with;
  if (need !== undefined) {
    const problem = needShapeProblem({ need, outcome: args.outcome, reason: args.reason ?? '' });
    if (problem !== null) return new Error(problem);
    if (args.paymentTx !== undefined) return new Error("--needs and --with name a skill's word; a paid endpoint has no SKILL.md");
  }
  let version: string | null = null;
  if (args.skillDir !== undefined) {
    if (args.paymentTx !== undefined) return new Error("--skill-dir names a skill's files; a paid endpoint has none");
    if (skillRefFromUrl(toolUrl) === null) return new Error('--skill-dir follows a skill URL, https://github.com/<owner>/<repo>?skill=<name>');
    version = skillDirectoryDigest(args.skillDir);
    if (version === null) return new Error(`--skill-dir ${args.skillDir} is not a directory this can read, or holds more than 300 files`);
  }
  return {
    toolUrl,
    outcome: args.outcome,
    ...(args.domain === undefined ? {} : { domain: args.domain }),
    ...(args.reason === undefined ? {} : { reason: args.reason }),
    ...(args.parent === undefined || args.why === undefined
      ? {}
      : { newDomain: { parent: args.parent, why: args.why.trim() } }),
    ...(args.paymentTx === undefined || args.network === undefined
      ? {}
      : { payment: { network: args.network, txHash: args.paymentTx.toLowerCase() as Hex } }), // checked above
    ...(terms === null ? {} : { terms }),
    ...(need === undefined ? {} : { need }),
    ...(version === null ? {} : { version }),
  };
}

const TERMS_FLAGS = ['--pay-to', '--asset', '--price', '--terms-at'] as const;

/** The four terms flags: all of them with a payment, none without (ADR `0189`). */
function termsFromArgs(args: {
  paymentTx?: string | undefined;
  payTo?: string | undefined;
  asset?: string | undefined;
  price?: string | undefined;
  termsAt?: string | undefined;
}): LineTerms | null | Error {
  const given = [args.payTo, args.asset, args.price, args.termsAt];
  if (args.paymentTx === undefined) {
    return given.every((value) => value === undefined) ? null : new Error(`${TERMS_FLAGS.join(', ')} follow --payment-tx`);
  }
  if (given.some((value) => value === undefined)) {
    return new Error(`with --payment-tx, name the terms the 402 gave and you paid against: ${TERMS_FLAGS.join(' ')}`);
  }
  const { payTo, asset, price, termsAt } = args as Required<typeof args>; // each checked defined above
  if (!/^0x[0-9a-fA-F]{40}$/.test(payTo)) return new Error("--pay-to is the 402's payTo address");
  if (!/^0x[0-9a-fA-F]{40}$/.test(asset)) return new Error("--asset is the 402's asset address");
  if (!/^[1-9][0-9]{0,77}$/.test(price)) return new Error("--price is the 402's amount, a positive integer in the asset's smallest unit");
  const receivedAt = /^[0-9]+$/.test(termsAt) ? Number(termsAt) : Math.floor(Date.parse(termsAt) / 1000);
  if (!Number.isSafeInteger(receivedAt) || receivedAt <= 0) return new Error('--terms-at is when the 402 was received: unix seconds or ISO 8601');
  if (receivedAt > Math.floor(Date.now() / 1000) + 300) return new Error('--terms-at is in the future');
  return { payTo, asset, price, receivedAt };
}

/** Whether a transfer the payment holds matches the terms: their payee, their asset, at least their price. */
function matchesTerms(payment: ReadPayment, terms: LineTerms): boolean {
  return payment.transfers.some(
    (transfer) =>
      transfer.payTo.toLowerCase() === terms.payTo.toLowerCase() &&
      transfer.asset.toLowerCase() === terms.asset.toLowerCase() &&
      BigInt(transfer.amount) >= BigInt(terms.price),
  );
}

/** What the payment's transaction holds, read before anything is signed. Amounts are decimal strings, so it prints as JSON. */
export type ReadPayment = {
  network: string;
  txHash: Hex;
  transfers: (Omit<X402Transfer, 'amount'> & { amount: string })[];
};

/**
 * Read an x402 line's payment on its own network, read-only, before any key is loaded: the transaction
 * exists, succeeded, and moves an accepted asset. Which transfer is the agent's is the sponsor's check,
 * since it knows the agent's holder and `agentWallet`. Throws with the reason otherwise.
 */
export async function readLinePayment(
  input: LineInput,
  reading: { policy: X402NetworkPolicy; readsFor(network: string): X402TransferReads },
): Promise<ReadPayment | null> {
  if (input.payment === undefined) return null;
  const { network, txHash } = input.payment;
  const assets = reading.policy.get(network)?.assets ?? [];
  const reads = reading.readsFor(network);
  let receipt;
  try {
    receipt = await reads.getTransactionReceipt({ hash: txHash });
  } catch (error) {
    if (isTransactionAbsent(error)) throw new Error(`transaction ${txHash} not found on ${network}`);
    throw new Error(`${network} could not be read: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
  }
  if (receipt.status !== 'success') throw new Error(`the payment ${txHash} reverted on ${network}`);
  const transfers = transfersIn(receipt.logs, assets);
  if (transfers.length === 0) throw new Error(`${txHash} on ${network} moves no accepted asset (${assets.join(', ')})`);
  return { network, txHash, transfers: transfers.map((transfer) => ({ ...transfer, amount: transfer.amount.toString() })) };
}

export type LineSteps = {
  config: LoopConfig;
  isCategory: (label: string) => Promise<boolean>;
  /** A word people use ("slides") to the node it names, or the closest nodes (task 84). Optional in tests. */
  resolve?: (word: string) => Promise<DomainResolution>;
  /** Called last, so a refused line leaves no key behind (`~/.arp/agent-key`, audit 2026-11-09). */
  agent: () => AgentSender;
  write?: typeof writeLine;
  /** Reads an x402 line's payment network. Absent, a line with a payment is refused before any key. */
  payments?: { policy: X402NetworkPolicy; readsFor(network: string): X402TransferReads };
};

/** The checks that need no key come first: the payment, the domain, then whether the sponsor answers. */
export async function writeLineChecked(
  steps: LineSteps,
  input: LineInput,
): Promise<WrittenLine & { payment?: ReadPayment }> {
  let line = input;
  let payment: ReadPayment | null = null;
  if (input.payment !== undefined) {
    if (!isExactEndpointUrl(input.toolUrl)) throw new Error(`${input.toolUrl} is not the exact http(s) URL that was paid`);
    if (steps.payments === undefined) throw new Error('this build reads no payment network');
    payment = await readLinePayment(input, steps.payments);
    if (input.terms === undefined) throw new Error('a line with a payment names the terms it paid against');
    if (payment !== null && !matchesTerms(payment, input.terms)) {
      throw new Error(
        `no transfer in ${input.payment.txHash} pays ${input.terms.payTo} at least ${input.terms.price} of ${input.terms.asset}: check --pay-to, --asset and --price`,
      );
    }
  }
  if (input.domain !== undefined) {
    // The sponsor's normalisation, so the word checked, filed and written is one word.
    const domain = normaliseCategoryLabel(input.domain);
    const resolved = (await steps.isCategory(domain)) ? null : await steps.resolve?.(domain);
    if (resolved === null || resolved?.status === 'node') {
      // Already in the tree, by its name or a word for it: nothing to add, whatever --parent said.
      const { newDomain: _unused, ...rest } = input;
      line = { ...rest, domain: resolved?.status === 'node' ? resolved.label : domain };
    } else if (input.newDomain === undefined) {
      const closest = resolved?.status === 'unknown' && resolved.suggestions.length > 0 ? ` Closest: ${resolved.suggestions.join(', ')}.` : '';
      throw new Error(`"${input.domain}" is not a category under tool.${closest} Pick one, or add it with --parent <category> --why <reason>`);
    } else {
      const parent = normaliseCategoryLabel(input.newDomain.parent);
      if (!(await steps.isCategory(parent))) throw new Error(`--parent "${input.newDomain.parent}" is not a category under tool`);
      line = { ...input, domain, newDomain: { parent, why: input.newDomain.why } };
    }
  }
  await sponsorApproval(steps.config);
  const written = await (steps.write ?? writeLine)(steps.config, steps.agent(), line);
  return payment === null ? written : { ...written, payment };
}

/** Testnet 13579 only (ADR `0135`, `0144`). An x402 payment is read on its own network, never signed there. */
export async function writeLineHere(input: LineInput): Promise<WrittenLine & { payment?: ReadPayment }> {
  if (chainId !== 13579) throw new Error('a line is written on testnet 13579 only for now');
  return writeLineChecked(
    {
      config: loopConfig(),
      isCategory: async (label) => isCategoryIn(await readDomainTree(domainWalk()))(label),
      resolve: async (word) => resolveDomain(word, domainWords(await readDomainTree(domainWalk()))),
      agent: agentFor,
      payments: x402Reading(lineNetworks(), process.env),
    },
    input,
  );
}
