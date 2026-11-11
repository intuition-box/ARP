import {stringToHex, type Address, type Hex} from "viem";

import {HAS_EVIDENCE_LABEL} from "../line-evidence.js";
import {PAID_WITH_LABEL} from "../x402-payment.js";
import {NEEDS_LABEL, needShapeProblem, WITH_LABEL} from "./line-need.js";
import {encodeCreateAtom, encodeCreateTriple, encodeDeposit, type MultiVaultReads} from "./multivault.js";
import type {PreparedCall} from "./types.js";
import {BECAUSE_LABEL, HAS_OUTCOME_LABEL, USAGE_OUTCOMES, USAGE_REASONS, type UsageOutcome, type UsageReason} from "./usage-words.js";

/**
 * What a `uses` declaration can be qualified with: where it happened and how it went (task 63, ADR
 * `0135`). Like every plan in this package it signs nothing and sends nothing (ADR `0038`).
 *
 * Form B (ADR `0138`): each line is about the one before, so an outcome belongs to its domain and
 * a reason to its outcome. A declaration can stop at any level.
 *
 * ```
 * T1 = (agent, uses, skill)
 * T2 = (T1, in context of, video)
 * T3 = (T2, has outcome, failed)
 * T4 = (T3, because, missing-key)
 * T5 = (T4, needs, OPENAI_API_KEY)     on a worked line instead: (T3, with, ffmpeg)
 * E  = (T3, has evidence, content-receipt:<hash>)    what backs it, beside the rest (task 127, ADR `0192`)
 * ```
 *
 * With a version (ADR `0192`), T1's object is `V = (skill, version, sha256:<digest>)`: the caller plans `V` and
 * T1, and this plans the levels on T1 the same way.
 *
 * With no domain, the outcome is about T1 itself.
 *
 * **The vocabulary is closed on purpose.** A domain must already be a category and an outcome one
 * of two words: on a graph that deletes nothing, free text fragments for ever. Never the text of a
 * request, which would publish what somebody was doing.
 *
 * **An outcome is one agent's word, and it paid to say it.** ARP gives no verdict on a tool (ADR
 * `0049`), and whoever reads this reads who wrote it.
 */
// The closed words, in a module with no dependency so the runtime hook can read lines (task 99, ADR `0168`).
export {BECAUSE_LABEL, HAS_OUTCOME_LABEL, USAGE_OUTCOMES, USAGE_REASONS, type UsageOutcome, type UsageReason} from "./usage-words.js";

export type UsageContextRefusal = {
    status: "refused";
    rule:
        | "nothing_to_add"
        | "not_declared"
        | "unknown_domain"
        | "reason_without_failure"
        | "payment_without_outcome"
        | "need_shape"
        | "evidence_without_outcome";
    detail: string;
};

export type UsageContextPlan = {
    status: "planned";
    chainId: number;
    contextTripleId: Hex | null;
    outcomeTripleId: Hex | null;
    reasonTripleId: Hex | null;
    /** `(outcome, paid with, payment)`, ADR `0159`. */
    paymentTripleId: Hex | null;
    /** `(reason, needs, name)` on a failure, or `(outcome, with, name)` on a worked line (task 97, ADR `0166`). */
    needTripleId: Hex | null;
    /** `(outcome, has evidence, evidence)`: what backs the line (task 127, ADR `0192`). */
    evidenceTripleId: Hex | null;
    calls: PreparedCall[];
    /**
     * Qualifiers already on chain, which this plan does not create. Without a `declarer` nobody can
     * say this wallet stands behind them, so a caller has to tell the agent: a line somebody else
     * wrote first is not the agent's word until it holds a position on it.
     */
    alreadyWritten: Hex[];
    totalValue: bigint;
};

export function isUsageOutcome(value: unknown): value is UsageOutcome {
    return USAGE_OUTCOMES.some((outcome) => outcome === value);
}

export function isUsageReason(value: unknown): value is UsageReason {
    return USAGE_REASONS.some((reason) => reason === value);
}

/**
 * Plan the qualifiers for one `uses` edge.
 *
 * `edgePlanned` says the edge is created earlier in the same plan, so it does not exist yet. Without
 * it a missing edge is refused, because a triple about a term that is not there reverts.
 */
export async function prepareUsageContext(params: {
    usesTripleId: Hex;
    edgePlanned?: boolean;
    domain?: string;
    outcome?: UsageOutcome;
    /** Only with `outcome: "failed"`. */
    reason?: UsageReason;
    /**
     * The x402 payment the outcome refers to, as `paymentLevelLabel` writes it: the payment and, since task
     * 93, the exact URL paid with its values removed (ADRs `0159`, `0162`, `0186`). Only with an outcome. Its format is the caller's to
     * check: this plans the triple and reads no paying chain.
     */
    payment?: string;
    /**
     * What was missing (with `missing-program` or `missing-key`) or what had to be added (with `worked`): a
     * program's or an environment variable's name (ADR `0166`). Its shape is checked here. **Whether the
     * skill's SKILL.md names it is the caller's to check** (`publishableNeed`): this reads no content.
     */
    need?: string;
    /**
     * What backs the line, as its atom is labelled: `content-receipt:<hash>` (`receiptEvidenceLabel`, ADR `0192`).
     * Only with an outcome. **Whether the receipt holds is the caller's to check** (`checkReceiptEvidence`).
     */
    evidence?: string;
    /** The predicate this chain's other nested claims use. Read from the deployment record. */
    inContextOf: Hex;
    /** Whether a label is a category under `tool`, read from the index. */
    isCategory(label: string): Promise<boolean>;
    /**
     * The wallet that will sign. Given, a qualifier somebody else already wrote gets a `minDeposit`
     * deposit from it, so an earlier writer cannot silence the declarer (`intuition-integrator`, task 63).
     */
    declarer?: Address;
    /** `declarer` did not write this edge, so it deposits on it to declare the use (ADR `0138`). */
    declarerDidNotWriteEdge?: boolean;
    reads: MultiVaultReads;
}): Promise<UsageContextPlan | UsageContextRefusal> {
    const {reads} = params;
    const domain = params.domain?.trim().toLowerCase();
    if (params.reason !== undefined && params.outcome !== "failed") {
        return {status: "refused", rule: "reason_without_failure", detail: "a reason only follows a failure"};
    }
    if (params.payment !== undefined && params.outcome === undefined) {
        return {status: "refused", rule: "payment_without_outcome", detail: "a payment is attached to an outcome"};
    }
    if (params.evidence !== undefined && params.outcome === undefined) {
        return {status: "refused", rule: "evidence_without_outcome", detail: "evidence is attached to an outcome"};
    }
    if (params.need !== undefined) {
        const problem =
            params.outcome === undefined
                ? "a need is attached to an outcome"
                : needShapeProblem({need: params.need, outcome: params.outcome, reason: params.reason ?? ""});
        if (problem !== null) return {status: "refused", rule: "need_shape", detail: problem};
    }
    if (domain === undefined && params.outcome === undefined) {
        return {status: "refused", rule: "nothing_to_add", detail: "give a domain or an outcome"};
    }
    if (params.edgePlanned !== true && !(await reads.termExists(params.usesTripleId))) {
        return {status: "refused", rule: "not_declared", detail: "this use is not declared yet"};
    }
    if (domain !== undefined && !(await params.isCategory(domain))) {
        return {status: "refused", rule: "unknown_domain", detail: `"${domain}" is not a category under tool`};
    }

    const [atomCost, tripleCost, stake] = await Promise.all([reads.atomCost(), reads.tripleCost(), reads.minDeposit()]);
    const atomAssets = atomCost + stake;
    const tripleAssets = tripleCost + stake;
    const calls: PreparedCall[] = [];
    const alreadyWritten: Hex[] = [];
    const curve = await reads.defaultCurveId();

    const atom = async (label: string, why: string): Promise<Hex> => {
        const data = stringToHex(label);
        const id = await reads.atomId(data);
        if (!(await reads.termExists(id)) && !calls.some((call) => call.data === encodeCreateAtom(data, atomAssets))) {
            calls.push({
                kind: "create-atom",
                chainId: reads.chainId,
                to: reads.address,
                value: atomAssets,
                data: encodeCreateAtom(data, atomAssets),
                why,
            });
        }
        return id;
    };

    const triple = async (subject: Hex, predicate: Hex, object: Hex, why: string): Promise<Hex> => {
        const id = await reads.tripleId(subject, predicate, object);
        if (!(await reads.termExists(id))) {
            calls.push({
                kind: "create-triple",
                chainId: reads.chainId,
                to: reads.address,
                value: tripleAssets,
                data: encodeCreateTriple(subject, predicate, object, tripleAssets),
                why,
            });
        } else {
            alreadyWritten.push(id);
            if (params.declarer !== undefined && (await reads.sharesOf(params.declarer, id, curve)) === 0n) {
                calls.push({
                    kind: "deposit",
                    chainId: reads.chainId,
                    to: reads.address,
                    value: stake,
                    data: encodeDeposit(params.declarer, id, curve, 0n),
                    why: `${why}: already written, so stand behind it`,
                });
            }
        }
        return id;
    };

    if (params.declarerDidNotWriteEdge === true && params.declarer !== undefined && (await reads.sharesOf(params.declarer, params.usesTripleId, curve)) === 0n) {
        calls.push({
            kind: "deposit",
            chainId: reads.chainId,
            to: reads.address,
            value: stake,
            data: encodeDeposit(params.declarer, params.usesTripleId, curve, 0n),
            why: "another wallet wrote this use, so deposit on it to declare it too",
        });
    }

    let contextTripleId: Hex | null = null;
    if (domain !== undefined) {
        const domainId = await atom(domain, `the category "${domain}"`);
        contextTripleId = await triple(params.usesTripleId, params.inContextOf, domainId, `say this use was in "${domain}"`);
    }
    let outcomeTripleId: Hex | null = null;
    if (params.outcome !== undefined) {
        const predicate = await atom(HAS_OUTCOME_LABEL, `the word "${HAS_OUTCOME_LABEL}"`);
        const outcomeId = await atom(params.outcome, `the word "${params.outcome}"`);
        outcomeTripleId = await triple(contextTripleId ?? params.usesTripleId, predicate, outcomeId, `say this use ${params.outcome}`);
    }
    let reasonTripleId: Hex | null = null;
    if (params.reason !== undefined && outcomeTripleId !== null) {
        const predicate = await atom(BECAUSE_LABEL, `the word "${BECAUSE_LABEL}"`);
        const reasonId = await atom(params.reason, `the word "${params.reason}"`);
        reasonTripleId = await triple(outcomeTripleId, predicate, reasonId, `say it failed because of ${params.reason}`);
    }
    let paymentTripleId: Hex | null = null;
    if (params.payment !== undefined && outcomeTripleId !== null) {
        const predicate = await atom(PAID_WITH_LABEL, `the word "${PAID_WITH_LABEL}"`);
        const paymentId = await atom(params.payment, `the payment ${params.payment}`);
        paymentTripleId = await triple(outcomeTripleId, predicate, paymentId, `say this outcome was paid with ${params.payment}`);
    }
    let needTripleId: Hex | null = null;
    const needSubject = params.outcome === "worked" ? outcomeTripleId : reasonTripleId;
    if (params.need !== undefined && needSubject !== null) {
        const label = params.outcome === "worked" ? WITH_LABEL : NEEDS_LABEL;
        const predicate = await atom(label, `the word "${label}"`);
        const nameId = await atom(params.need, `the name "${params.need}"`);
        needTripleId = await triple(needSubject, predicate, nameId, `say it ${label} ${params.need}`);
    }
    let evidenceTripleId: Hex | null = null;
    if (params.evidence !== undefined && outcomeTripleId !== null) {
        const predicate = await atom(HAS_EVIDENCE_LABEL, `the word "${HAS_EVIDENCE_LABEL}"`);
        const evidenceId = await atom(params.evidence, `the evidence ${params.evidence}`);
        evidenceTripleId = await triple(outcomeTripleId, predicate, evidenceId, `say this outcome has evidence ${params.evidence}`);
    }
    return {
        status: "planned",
        chainId: reads.chainId,
        contextTripleId,
        outcomeTripleId,
        reasonTripleId,
        paymentTripleId,
        needTripleId,
        evidenceTripleId,
        calls,
        alreadyWritten,
        totalValue: calls.reduce((sum, call) => sum + call.value, 0n),
    };
}

export type BudgetRefusal = {
    status: "refused";
    rule: "over_budget";
    total_value_wei: string;
    budget_wei: string;
    detail: string;
};

/**
 * A plan that costs more than the caller said it can spend, or `null` when it fits. Checked before anything is
 * signed: a line is permanent, and an agent that learns the price afterwards has already paid it
 * (`docs/tasks/65` §9, where 0.011 went out against a budget of 0.01). The budget is what is left, so a
 * payment already made is the caller's to subtract.
 */
export function budgetRefusal(totalValue: bigint, budget: bigint): BudgetRefusal | null {
    if (totalValue <= budget) return null;
    return {
        status: "refused",
        rule: "over_budget",
        total_value_wei: totalValue.toString(),
        budget_wei: budget.toString(),
        detail: `this costs ${totalValue} wei, more than the ${budget} wei left. Nothing was planned to send`,
    };
}
