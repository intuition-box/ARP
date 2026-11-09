import {keccak256, stringToBytes, type Address} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {describe, expect, it} from "vitest";

import {signCategoryRequest, verifyCategoryRequest, type CategoryRequest} from "../src/sponsor/category.js";
import {checkCategoryLimits, type SponsorLimits, type SponsorRecord} from "../src/sponsor/limits.js";

// Fixed test keys, generated for nothing and holding nothing.
const HOLDER = privateKeyToAccount(`0x${"66".repeat(32)}`);
const OTHER = privateKeyToAccount(`0x${"67".repeat(32)}`);
const NOW = 1_800_000_000;

const request = (over: Partial<CategoryRequest> = {}): CategoryRequest => ({
    agent: HOLDER.address,
    agentRegistry: "eip155:13579:0xC165A2ADc0000000000000000000000000000001",
    agentId: "7",
    label: "typography",
    parent: "design",
    subject: `0x${"0b".repeat(32)}`,
    reason: "none of the design children is about type",
    nonce: keccak256(stringToBytes("category-1")),
    expiresAt: NOW + 600,
    ...over,
});

describe("verifyCategoryRequest", () => {
    it("recovers the agent's address from a request it signed", async () => {
        const signed = await signCategoryRequest(request(), 13579, HOLDER);
        expect(await verifyCategoryRequest(signed, NOW)).toEqual({status: "valid", address: HOLDER.address});
    });

    it("tells a request signed by another key apart", async () => {
        const signed = await signCategoryRequest(request(), 13579, OTHER);
        expect((await verifyCategoryRequest(signed, NOW)).status).toBe("mismatch");
    });

    it("refuses a request changed after signing", async () => {
        const signed = await signCategoryRequest(request(), 13579, HOLDER);
        const changed = {...signed, request: {...signed.request, parent: "tool"}};
        expect((await verifyCategoryRequest(changed, NOW)).status).toBe("mismatch");
    });

    it("refuses an expired request, and one that lives too long", async () => {
        const expired = await signCategoryRequest(request({expiresAt: NOW}), 13579, HOLDER);
        expect((await verifyCategoryRequest(expired, NOW)).status).toBe("expired");
        const far = await signCategoryRequest(request({expiresAt: NOW + 7_200}), 13579, HOLDER);
        expect(await verifyCategoryRequest(far, NOW)).toEqual({status: "malformed", reason: "expires too far ahead"});
    });

    it("reads every field before recovering", async () => {
        const signed = await signCategoryRequest(request(), 13579, HOLDER);
        const cases: [Record<string, unknown>, string][] = [
            [{label: ""}, "label"],
            [{label: "x".repeat(65)}, "label"],
            [{parent: 3}, "parent"],
            [{subject: "0x12"}, "subject"],
            [{reason: "r".repeat(501)}, "reason"],
            [{nonce: "nope"}, "nonce"],
            [{agent: "0x1"}, "agent"],
        ];
        for (const [over, reason] of cases) {
            const broken = {...signed, request: {...signed.request, ...over}};
            expect(await verifyCategoryRequest(broken, NOW)).toEqual({status: "malformed", reason});
        }
        expect((await verifyCategoryRequest(null, NOW)).status).toBe("malformed");
        expect((await verifyCategoryRequest({...signed, chainId: "13579"}, NOW)).status).toBe("malformed");
    });
});

describe("checkCategoryLimits, per agent", () => {
    const limits = {categoriesPerDay: 5, categoriesPerAgentPerDay: 1, categoryTagsPerDay: 5, dailyBudget: 10n ** 18n} as SponsorLimits; // Only the members this check reads.
    const at = 20_000 * 86_400_000;
    const record = (subject: Address, key: string): SponsorRecord => ({kind: "category", subject, value: 1n, at, key});

    it("counts an agent's own new categories, and not another agent's", () => {
        const records = [record(HOLDER.address, "category:typography:design:0x0b#0")];
        const params = {newCategory: true, value: 1n, now: at, limits};
        expect(checkCategoryLimits(records, {...params, proposal: "category:icons:design:0x0b", agent: HOLDER.address}).ok).toBe(false);
        expect(checkCategoryLimits(records, {...params, proposal: "category:icons:design:0x0b", agent: OTHER.address}).ok).toBe(true);
    });

    it("lets the agent finish a proposal it already started, and ignores its nonce records", () => {
        const records = [
            record(HOLDER.address, "category:typography:design:0x0b#0"),
            record(HOLDER.address, "category-nonce:0xabc"),
        ];
        const decision = checkCategoryLimits(records, {
            proposal: "category:typography:design:0x0b",
            newCategory: true,
            agent: HOLDER.address,
            value: 1n,
            now: at,
            limits,
        });
        expect(decision.ok).toBe(true);
    });
});
