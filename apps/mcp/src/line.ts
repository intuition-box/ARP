/**
 * Writing one line from this machine: `arp line`, and what `arp share` calls (ADR `0144`). Kept out of the
 * MCP server's tools on purpose: a server that holds an agent key does not run the search package
 * (`handlers/pulse.ts`, `canSearch`), so the plugin's server stays read-only and holds no key, and this holds
 * it for the length of one call.
 */
import {
  isCategoryIn,
  isUsageOutcome,
  isUsageReason,
  normaliseCategoryLabel,
  readDomainTree,
  USAGE_REASONS,
} from '@arp-protocol/core';

import { chainId, domainWalk } from './config.js';
import type { AgentSender } from './desktop/agent-key.js';
import { agentFor, loopConfig } from './desktop/handlers.js';
import { sponsorApproval, writeLine, type LineInput, type LoopConfig, type WrittenLine } from './desktop/loop.js';

/** A command line's strings as a line, or what is wrong with them. Closed words only. */
export function lineFromArgs(args: {
  toolUrl: string;
  outcome: string;
  domain: string | undefined;
  reason: string | undefined;
  /** With `why`, adds `domain` to the tree under this category if it is not there (ADR `0146`). */
  parent?: string | undefined;
  why?: string | undefined;
}): LineInput | Error {
  if ((args.parent === undefined) !== (args.why === undefined)) return new Error('--parent and --why go together');
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
  };
}

export type LineSteps = {
  config: LoopConfig;
  isCategory: (label: string) => Promise<boolean>;
  /** Called last, so a refused line leaves no key behind (`~/.arp/agent-key`, audit 2026-11-09). */
  agent: () => AgentSender;
  write?: typeof writeLine;
};

/** The checks that need no key come first: the domain, then whether the sponsor answers. */
export async function writeLineChecked(steps: LineSteps, input: LineInput): Promise<WrittenLine> {
  let line = input;
  if (input.domain !== undefined) {
    // The sponsor's normalisation, so the word checked, filed and written is one word.
    const domain = normaliseCategoryLabel(input.domain);
    if (await steps.isCategory(domain)) {
      // Already in the tree: nothing to add, whatever --parent said.
      const { newDomain: _unused, ...rest } = input;
      line = { ...rest, domain };
    } else if (input.newDomain === undefined) {
      throw new Error(`"${input.domain}" is not a category under tool; add it with --parent <category> --why <reason>`);
    } else {
      const parent = normaliseCategoryLabel(input.newDomain.parent);
      if (!(await steps.isCategory(parent))) throw new Error(`--parent "${input.newDomain.parent}" is not a category under tool`);
      line = { ...input, domain, newDomain: { parent, why: input.newDomain.why } };
    }
  }
  await sponsorApproval(steps.config);
  return (steps.write ?? writeLine)(steps.config, steps.agent(), line);
}

/** Testnet 13579 only (ADR `0135`, `0144`). */
export async function writeLineHere(input: LineInput): Promise<WrittenLine> {
  if (chainId !== 13579) throw new Error('a line is written on testnet 13579 only for now');
  return writeLineChecked(
    {
      config: loopConfig(),
      isCategory: async (label) => isCategoryIn(await readDomainTree(domainWalk()))(label),
      agent: agentFor,
    },
    input,
  );
}
