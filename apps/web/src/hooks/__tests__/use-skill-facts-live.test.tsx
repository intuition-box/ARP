import {QueryClient} from "@tanstack/react-query";
import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {FactsAnswer} from "../../services/facts-api";
import {hookProviders} from "./hook-providers";

/**
 * With `VITE_ARP_API_URL` set: the hooks read it at module load, so it is stubbed before the
 * modules are imported. The API itself is mocked at `fetchFacts` and `fetchLastPurchase`, the two
 * calls that would reach it.
 */
const API = "https://api.arp.example";
vi.hoisted(() => {
    vi.stubEnv("VITE_ARP_API_URL", "https://api.arp.example");
});
const fetchFacts = vi.hoisted(() => vi.fn());
vi.mock("../../services/facts-api", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/facts-api")>()),
    fetchFacts,
}));
const fetchLastPurchase = vi.hoisted(() => vi.fn());
vi.mock("../../services/last-purchase", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/last-purchase")>()),
    fetchLastPurchase,
}));
const fetchSkillMd = vi.hoisted(() => vi.fn());
vi.mock("../../services/skill-md", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/skill-md")>()),
    fetchSkillMd,
}));

const {liveFacts} = await import("../use-live-facts");
const {hasLastPurchaseSource, useLastPurchase} = await import("../use-last-purchase");
const {useSkillFacts} = await import("../use-skill-facts");
const {useSkillMd} = await import("../use-skill-md");

const SKILL = "github.com/acme/skills?skill=live";

const ANSWER: FactsAnswer = {
    read: {
        skills: {oldest: "2026-11-09T08:00:00Z", newest: "2026-11-10T08:00:00Z"},
        repos: {oldest: null, newest: null},
        paths: {oldest: null, newest: null},
    },
    skills: {[SKILL]: {description: "Live skill", installs: 12, fetchedAt: "2026-11-10T08:00:00Z"}},
    repos: {},
    paths: {[SKILL]: "skills/live/SKILL.md"},
};

afterEach(() => {
    vi.clearAllMocks();
});

describe("liveFacts", () => {
    it("asks the API once per client and shares the answer", async () => {
        fetchFacts.mockResolvedValue(ANSWER);
        const client = new QueryClient();
        expect(await liveFacts(client)).toBe(ANSWER);
        expect(await liveFacts(client)).toBe(ANSWER);
        expect(fetchFacts).toHaveBeenCalledTimes(1);
        expect(fetchFacts).toHaveBeenCalledWith(API);
    });

    it("answers null when the API fails, so the caller falls back to the bundled copy", async () => {
        fetchFacts.mockRejectedValue(new Error("502"));
        expect(await liveFacts(new QueryClient())).toBeNull();
    });
});

describe("useSkillFacts with the API", () => {
    it("serves the live figures, dated by the oldest skill read", async () => {
        fetchFacts.mockResolvedValue(ANSWER);
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useSkillFacts(), {wrapper});
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.factFor(SKILL)?.installs).toBe(12);
        expect(result.current.skillLabels).toEqual([SKILL]);
        expect(result.current.measuredOn).toBe("2026-11-09");
    });

    it("falls back to the bundled facts when the API fails", async () => {
        fetchFacts.mockRejectedValue(new Error("502"));
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useSkillFacts(), {wrapper});
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.factFor(SKILL)).toBeNull();
        expect(result.current.skillLabels.length).toBeGreaterThan(1);
    });
});

describe("useSkillMd with the API", () => {
    it("finds a skill's path in the live answer", async () => {
        fetchFacts.mockResolvedValue(ANSWER);
        fetchSkillMd.mockResolvedValue({description: null, version: null});
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useSkillMd(SKILL), {wrapper});
        await waitFor(() => expect(result.current.status).toBe("ok"));
        expect(fetchSkillMd).toHaveBeenCalledWith(
            "https://raw.githubusercontent.com/acme/skills/HEAD/skills/live/SKILL.md",
        );
    });
});

describe("useLastPurchase with the API", () => {
    it("has a source, and waits for an endpoint", () => {
        expect(hasLastPurchaseSource).toBe(true);
        const {wrapper} = hookProviders();
        expect(renderHook(() => useLastPurchase(null), {wrapper}).result.current.fetchStatus).toBe("idle");
    });

    it("asks the API about the endpoint", async () => {
        fetchLastPurchase.mockResolvedValue({status: "none"});
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useLastPurchase("https://paid.example/api"), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(fetchLastPurchase).toHaveBeenCalledWith(API, "https://paid.example/api");
    });
});
