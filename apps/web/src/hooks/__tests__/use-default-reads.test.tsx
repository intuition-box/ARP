import {renderHook, waitFor} from "@testing-library/react";
import type {AgentRef} from "@arp-protocol/core";
import {afterEach, describe, expect, it, vi} from "vitest";

import {hiddenAtomIds} from "../../services/test-identities";
import {useAgentCohort, useAgentSearch} from "../use-agent-cohort";
import {useAgentProfile} from "../use-agent-profile";
import {useAtomStanding} from "../use-atom-standing";
import {useTermShape} from "../use-term-shape";
import {useReadsSignals, useSponsorAddress, useToolCatalog} from "../use-tool-catalog";
import {hookProviders} from "./hook-providers";

/**
 * The query options of these hooks have their own tests with injected readers. What is left is the
 * wiring those tests cannot see: that the hook a page calls hands the **chosen chain's** endpoint to
 * the real reader. Each reader is mocked where it would reach the network, and made to fail so the
 * assertion is about the request rather than about the view built from an answer.
 */
const core = vi.hoisted(() => ({
    getTermShape: vi.fn(),
    getTermActivity: vi.fn(),
    getAtomStanding: vi.fn(),
    listTools: vi.fn(),
    listRegisteredTools: vi.fn(),
}));
vi.mock("@arp-protocol/core", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@arp-protocol/core")>()),
    ...core,
}));
const connector = vi.hoisted(() => ({fetchAgentCohort: vi.fn(), fetchAgentProfile: vi.fn()}));
vi.mock("../../services/erc8004-connector", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/erc8004-connector")>()),
    ...connector,
}));

const TESTNET_GRAPHQL = "https://testnet.intuition.sh/v1/graphql";
const MAINNET_GRAPHQL = "https://mainnet.intuition.sh/v1/graphql";
const ATOM = `0x${"22".repeat(32)}`;
const unavailable = new Error("unavailable");

afterEach(() => {
    vi.clearAllMocks();
});

describe("useTermShape", () => {
    it("reads the shape and a 26-week curve from the chosen chain", async () => {
        core.getTermShape.mockRejectedValue(unavailable);
        core.getTermActivity.mockRejectedValue(unavailable);
        const {result} = renderHook(() => useTermShape(ATOM, 1), {wrapper: hookProviders({isMainnet: true}).wrapper});
        await waitFor(() => expect(result.current.error).toBe(unavailable));
        expect(core.getTermShape).toHaveBeenCalledWith(ATOM, {graphqlUrl: MAINNET_GRAPHQL, curveId: 1});
        expect(core.getTermActivity).toHaveBeenCalledWith(ATOM, {
            graphqlUrl: MAINNET_GRAPHQL,
            curveId: 1,
            grain: "week",
            buckets: 26,
        });
    });
});

describe("useAgentCohort and useAgentSearch", () => {
    it("ask the chosen chain's graph for one page, or for a name", async () => {
        connector.fetchAgentCohort.mockRejectedValue(unavailable);
        const {wrapper} = hookProviders();
        const cohort = renderHook(() => useAgentCohort("evidence-quantity", 25), {wrapper});
        await waitFor(() => expect(cohort.result.current.error).toBe(unavailable));
        expect(connector.fetchAgentCohort).toHaveBeenCalledWith(
            {order: "evidence-quantity", limit: 25, offset: 25},
            TESTNET_GRAPHQL,
        );
        const search = renderHook(() => useAgentSearch(" deep "), {wrapper});
        await waitFor(() => expect(search.result.current.error).toBe(unavailable));
        expect(connector.fetchAgentCohort).toHaveBeenLastCalledWith(
            expect.objectContaining({name: "deep", offset: 0}),
            TESTNET_GRAPHQL,
        );
    });
});

describe("useAgentProfile", () => {
    it("resolves the agent on the chosen chain's graph", async () => {
        connector.fetchAgentProfile.mockRejectedValue(unavailable);
        const ref: AgentRef = {chainId: 8453, tokenId: "12"};
        const {result} = renderHook(() => useAgentProfile(ref, 2n), {wrapper: hookProviders({isMainnet: true}).wrapper});
        await waitFor(() => expect(result.current.error).toBe(unavailable));
        expect(connector.fetchAgentProfile).toHaveBeenCalledWith(ref, 2n, MAINNET_GRAPHQL);
    });
});

describe("useAtomStanding", () => {
    it("reads the atom's standing and ARP's hidden identities from the same graph", async () => {
        core.getAtomStanding.mockRejectedValue(unavailable);
        const {result} = renderHook(() => useAtomStanding(ATOM), {wrapper: hookProviders().wrapper});
        await waitFor(() => expect(result.current.error).toBe(unavailable));
        expect(core.getAtomStanding).toHaveBeenCalledWith(ATOM, expect.objectContaining({graphqlUrl: TESTNET_GRAPHQL}));
        expect(hiddenAtomIds).toHaveBeenCalledWith(TESTNET_GRAPHQL);
    });
});

describe("useToolCatalog", () => {
    it("reads the declared and the registered tools from the chosen chain, with its sponsor", async () => {
        core.listTools.mockRejectedValue(unavailable);
        core.listRegisteredTools.mockRejectedValue(unavailable);
        const {result} = renderHook(() => useToolCatalog("declarations", 1), {wrapper: hookProviders().wrapper});
        await waitFor(() => expect(result.current.error).toBe(unavailable));
        expect(core.listTools).toHaveBeenCalledWith({
            graphqlUrl: TESTNET_GRAPHQL,
            order: "declarations",
            curveId: 1,
            sponsor: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
            excludeSubjects: expect.any(Set),
        });
        expect(core.listRegisteredTools).toHaveBeenCalledWith({graphqlUrl: TESTNET_GRAPHQL, curveId: 1});
    });
});

describe("useSponsorAddress and useReadsSignals", () => {
    it("have a sponsor on testnet and none on mainnet", () => {
        const useBoth = () => ({sponsor: useSponsorAddress(), reads: useReadsSignals()});
        const testnet = renderHook(useBoth, {wrapper: hookProviders().wrapper}).result.current;
        const mainnet = renderHook(useBoth, {wrapper: hookProviders({isMainnet: true}).wrapper}).result.current;
        expect(testnet.sponsor).toMatch(/^0x[0-9a-fA-F]{40}$/);
        expect(testnet.reads).toBe(true);
        expect(mainnet).toEqual({sponsor: null, reads: false});
    });
});
