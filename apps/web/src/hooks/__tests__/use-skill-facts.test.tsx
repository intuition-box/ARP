import {QueryClient} from "@tanstack/react-query";
import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {hasLastPurchaseSource, useLastPurchase} from "../use-last-purchase";
import {liveFacts} from "../use-live-facts";
import {useSkillFacts} from "../use-skill-facts";
import {useSkillMd} from "../use-skill-md";
import {hookProviders} from "./hook-providers";

/**
 * With no `VITE_ARP_API_URL`, which is how the tests and a build without the facts API run: every
 * figure comes from the copies bundled with the app, and nothing asks the API. The other case is
 * `use-skill-facts-live.test.tsx`.
 */
const fetchSkillMd = vi.hoisted(() => vi.fn());
vi.mock("../../services/skill-md", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/skill-md")>()),
    fetchSkillMd,
}));
const fetchFacts = vi.hoisted(() => vi.fn());
vi.mock("../../services/facts-api", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/facts-api")>()),
    fetchFacts,
}));

const SKILL = "github.com/vercel-labs/skills?skill=find-skills";
const REPO = "github.com/mobbin/mobbin-mcp-server";

afterEach(() => {
    vi.clearAllMocks();
});

describe("without the facts API", () => {
    it("liveFacts answers null without a request", async () => {
        expect(await liveFacts(new QueryClient())).toBeNull();
        expect(fetchFacts).not.toHaveBeenCalled();
    });

    it("useLastPurchase has no source and stays idle", () => {
        expect(hasLastPurchaseSource).toBe(false);
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useLastPurchase("https://api.example.com/x"), {wrapper});
        expect(result.current.fetchStatus).toBe("idle");
    });
});

describe("useSkillFacts", () => {
    it("answers null for everything until the facts load", () => {
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useSkillFacts(), {wrapper});
        expect(result.current.factFor(SKILL)).toBeNull();
        expect(result.current.skillLabels).toEqual([]);
        expect(result.current.isLoading).toBe(true);
    });

    it("serves the bundled skill, repository and catalogue facts with their date", async () => {
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useSkillFacts(), {wrapper});
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.factFor(SKILL)?.installs).toBeGreaterThan(0);
        expect(result.current.repoFactFor(REPO)).toMatchObject({archived: false, gone: false});
        expect(result.current.catalogueFor(SKILL)).toEqual({atom: null, domain: null});
        expect(result.current.skillLabels).toContain(SKILL);
        expect(result.current.measuredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("answers null for no label and for a label it has no fact on", async () => {
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useSkillFacts(), {wrapper});
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.factFor(null)).toBeNull();
        expect(result.current.repoFactFor(null)).toBeNull();
        expect(result.current.catalogueFor(null)).toBeNull();
        expect(result.current.factFor("github.com/nobody/x?skill=y")).toBeNull();
        expect(result.current.repoFactFor("github.com/nobody/x")).toBeNull();
        expect(result.current.catalogueFor("github.com/nobody/x?skill=y")).toBeNull();
    });
});

describe("useSkillMd", () => {
    it("is none for no label and for a label that is not a skill", () => {
        const {wrapper} = hookProviders();
        expect(renderHook(() => useSkillMd(null), {wrapper}).result.current).toEqual({status: "none"});
        expect(renderHook(() => useSkillMd(REPO), {wrapper}).result.current).toEqual({status: "none"});
    });

    it("is pending while the paths load, then reads the skill's own SKILL.md", async () => {
        fetchSkillMd.mockResolvedValue({description: "Finds skills", version: "1"});
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useSkillMd(SKILL), {wrapper});
        expect(result.current).toEqual({status: "pending"});
        await waitFor(() => expect(result.current.status).toBe("ok"));
        const url = "https://raw.githubusercontent.com/vercel-labs/skills/HEAD/skills/find-skills/SKILL.md";
        expect(result.current).toEqual({
            status: "ok",
            url,
            path: "skills/find-skills/SKILL.md",
            md: {description: "Finds skills", version: "1"},
        });
        expect(fetchSkillMd).toHaveBeenCalledWith(url);
    });

    it("is none for a skill whose path was never found", async () => {
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useSkillMd("github.com/nobody/x?skill=y"), {wrapper});
        expect(result.current).toEqual({status: "pending"});
        await waitFor(() => expect(result.current).toEqual({status: "none"}));
        expect(fetchSkillMd).not.toHaveBeenCalled();
    });

    it("says failed, with the URL it tried, when GitHub does not answer", async () => {
        fetchSkillMd.mockRejectedValue(new Error("404"));
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useSkillMd(SKILL), {wrapper});
        await waitFor(() => expect(result.current.status).toBe("failed"));
        expect(result.current).toHaveProperty("url", expect.stringContaining("raw.githubusercontent.com"));
    });
});
