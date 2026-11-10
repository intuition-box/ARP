/**
 * The closed words of a line (ADR `0138`), with no dependency: `usage-context.ts` re-exports them, and
 * the runtime hook, which ships without viem (ADR `0145`), reads lines with them (task 99).
 */
export const USAGE_OUTCOMES = ["worked", "failed"] as const;
export type UsageOutcome = (typeof USAGE_OUTCOMES)[number];

/** A plain string, so its id follows from the word and is the same on every chain. */
export const HAS_OUTCOME_LABEL = "has outcome";

/**
 * Why a use failed. Closed for the same reason as the outcomes (ADR `0138`). `no-delivery` is a paid call
 * that gave nothing back (ADR `0159`): it is written about an x402 endpoint, usually with its payment.
 */
export const USAGE_REASONS = ["missing-key", "missing-program", "missing-file", "not-the-right-tool", "no-delivery"] as const;
export type UsageReason = (typeof USAGE_REASONS)[number];
export const BECAUSE_LABEL = "because";
