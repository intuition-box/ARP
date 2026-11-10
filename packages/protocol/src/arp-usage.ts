/**
 * The `arp-usage` adapter's output (task 112): one record per skill, in the shape of the adapter sheet
 * written for HOL's HCS-28 skill trust profile (`outreach/drafts/hol-arp-usage-adapter-2026-11-10.md` in
 * `Wieedze/ARP-business-dev`). Pure: it reads a skill lines feed (`skill-lines-feed.ts`) and touches no
 * network.
 *
 * It is a **proposed rule for a third party**, not ARP's own ranking: `arp_pulse` scores with its own
 * reading (`pulse-score.ts`), and nothing here feeds it.
 *
 * The rule, as the sheet states it:
 * 1. a line ARP marks `arp_test` is dropped;
 * 2. each wallet counts once, by its latest line with an outcome;
 * 3. a failure for `missing-key`, `missing-program` or `missing-file` is not held against the skill —
 *    it says what the skill needs, so that wallet leaves the count;
 * 4. below three wallets the adapter emits no score (HCS `conditional`: it leaves the denominator);
 * 5. `rate = (W + 1) / (n + 2)`, `confidence = 1 - exp(-n / 20)`,
 *    `score = 100 · (0.5 + confidence · (rate − 0.5))`, clamped to [0, 100], two decimals.
 *
 * Confidence grows with wallets, not lines, so one writer repeating itself moves nothing. Distinct
 * wallets are not distinct people: the sheet says so, and so does this file.
 */
import type {SkillLineRecord, SkillLinesFeed} from "./skill-lines-feed.js";

export const ARP_USAGE_SCHEMA = "arp.usage/1";

export const ARP_USAGE_ADAPTER = {
    id: "arp-usage",
    component: "arp-usage.score",
    contributionMode: "conditional",
    suggestedWeight: 1,
    minWallets: 3,
    confidenceScale: 20,
} as const;

export const ARP_USAGE_NOTE =
    "A proposed HCS-28 adapter output, computed from ARP's skill lines feed. Each wallet counts once, by its latest " +
    "outcome; a failure for a missing key, program or file is not held against the skill; below 3 wallets there is no " +
    "score. A wallet is not a person, and a line is its writer's word, not a proof of use.";

/** Reasons that say what a skill needs from the person, not that it is wrong (`docs/28`). */
const NEED_REASONS: ReadonlySet<string> = new Set(["missing-key", "missing-program", "missing-file"]);

export type ArpUsageRecord = {
    url: string;
    repo: string;
    skill: string;
    atom_id: string;
    /** `arp-usage.score`, or `null` when fewer than three wallets count. */
    score: number | null;
    /** Wallets counted: `worked + failed`. */
    n: number;
    worked: number;
    failed: number;
    /** Wallets whose latest outcome was a failure for something the person could supply. */
    needs_only: number;
    /** `null` with the score. */
    confidence: number | null;
    /** Names a failure needed, and how many distinct wallets outside ARP's tests wrote each: metadata, never scored. */
    needs: Record<string, number>;
};

export type ArpUsageFeed = {
    schema: typeof ARP_USAGE_SCHEMA;
    generated_at: string;
    /** The skill lines feed this was computed from. */
    source: {schema: string; generated_at: string; trace: {chain: string; graphql: string}};
    adapter: typeof ARP_USAGE_ADAPTER;
    note: string;
    skills: ArpUsageRecord[];
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** The latest line with an outcome, per wallet. A line without a date loses to one with a date. */
function latestOutcomes(lines: readonly SkillLineRecord[]): SkillLineRecord[] {
    const byWallet = new Map<string, SkillLineRecord>();
    for (const line of lines) {
        if (line.arp_test || line.outcome === null) continue;
        const key = line.writer.toLowerCase();
        const held = byWallet.get(key);
        if (held === undefined || (line.declared_at ?? "") > (held.declared_at ?? "")) byWallet.set(key, line);
    }
    return [...byWallet.values()];
}

/** The adapter's score for `worked` and `failed` wallet counts, or `null` below the threshold. */
export function arpUsageScore(worked: number, failed: number): {score: number; confidence: number} | null {
    const n = worked + failed;
    if (n < ARP_USAGE_ADAPTER.minWallets) return null;
    const rate = (worked + 1) / (n + 2);
    const confidence = 1 - Math.exp(-n / ARP_USAGE_ADAPTER.confidenceScale);
    const score = Math.min(100, Math.max(0, 100 * (0.5 + confidence * (rate - 0.5))));
    return {score: round2(score), confidence: round2(confidence)};
}

export function buildArpUsageFeed(lines: SkillLinesFeed, generatedAt: string): ArpUsageFeed {
    const skills = lines.skills.map((entry): ArpUsageRecord => {
        let worked = 0;
        let failed = 0;
        let needsOnly = 0;
        for (const line of latestOutcomes(entry.lines)) {
            if (line.outcome === "worked") worked += 1;
            else if (line.reasons.some((reason) => NEED_REASONS.has(reason))) needsOnly += 1;
            else failed += 1;
        }
        const needers = new Map<string, Set<string>>();
        for (const line of entry.lines) {
            if (line.arp_test) continue;
            for (const name of line.needs) needers.set(name, (needers.get(name) ?? new Set()).add(line.writer.toLowerCase()));
        }
        const needs = Object.fromEntries([...needers].map(([name, wallets]) => [name, wallets.size]));
        const scored = arpUsageScore(worked, failed);
        return {
            url: entry.url,
            repo: entry.repo,
            skill: entry.skill,
            atom_id: entry.atom_id,
            score: scored?.score ?? null,
            n: worked + failed,
            worked,
            failed,
            needs_only: needsOnly,
            confidence: scored?.confidence ?? null,
            needs,
        };
    });
    return {
        schema: ARP_USAGE_SCHEMA,
        generated_at: generatedAt,
        source: {schema: lines.schema, generated_at: lines.generated_at, trace: lines.trace},
        adapter: ARP_USAGE_ADAPTER,
        note: ARP_USAGE_NOTE,
        skills,
    };
}
