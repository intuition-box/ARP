/**
 * Writing one line from this machine: `arp line`, and what `arp share` calls (ADR `0144`). Kept out of the
 * MCP server's tools on purpose: a server that holds an agent key does not run the search package
 * (`handlers/pulse.ts`, `canSearch`), so the plugin's server stays read-only and holds no key, and this holds
 * it for the length of one call.
 */
import {
  chainIdOfNetwork,
  isCategoryIn,
  isTransactionAbsent,
  isUsageOutcome,
  isUsageReason,
  normaliseCategoryLabel,
  readDomainTree,
  resolveDomain,
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
import type { Hex } from 'viem';

import { chainId, domainWalk } from './config.js';
import { domainWords } from './domain-words.js';
import type { AgentSender } from './desktop/agent-key.js';
import { agentFor, loopConfig } from './desktop/handlers.js';
import { sponsorApproval, writeLine, type LineInput, type LoopConfig, type WrittenLine } from './desktop/loop.js';

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
  if (args.parent !== undefined && args.domain === undefined) return new Error('--parent and --why add a --domain');
  if (args.why !== undefined && args.why.trim() === '') return new Error('--why says why no category fits');
  if (!isUsageOutcome(args.outcome)) return new Error('--outcome must be worked or failed');
  if (args.reason !== undefined && !isUsageReason(args.reason)) {
    return new Error(`--reason must be one of ${USAGE_REASONS.join(', ')}`);
  }
  if (args.reason !== undefined && args.outcome !== 'failed') return new Error('a reason only follows --outcome failed');
  return {
    toolUrl: args.toolUrl,
    outcome: args.outcome,
    ...(args.domain === undefined ? {} : { domain: args.domain }),
    ...(args.reason === undefined ? {} : { reason: args.reason }),
    ...(args.parent === undefined || args.why === undefined
      ? {}
      : { newDomain: { parent: args.parent, why: args.why.trim() } }),
    ...(args.paymentTx === undefined || args.network === undefined
      ? {}
      : { payment: { network: args.network, txHash: args.paymentTx.toLowerCase() as Hex } }), // checked above
  };
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
    if (steps.payments === undefined) throw new Error('this build reads no payment network');
    payment = await readLinePayment(input, steps.payments);
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
