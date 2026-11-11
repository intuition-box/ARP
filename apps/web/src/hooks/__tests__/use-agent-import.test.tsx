import {renderHook} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, it, vi} from "vitest";

import {ChainChoiceContext, choiceFor} from "../../lib/chain-choice";

/**
 * Task 129: an agent on testnet 13579 has its atom in the testnet graph, and the import's plans are
 * priced on testnet whatever the toggle says (ADR `0194`). Faked at the service boundary.
 */
const erc8004GraphClient = vi.fn((url?: string) => ({url}));
const resolveCanonicalAgentAtom = vi.fn(async () => null);
const planIdentityAtom = vi.fn(async () => ({}));
const planOperatorLink = vi.fn(async () => ({}));

vi.mock("../../services/erc8004-connector", () => ({erc8004GraphClient}));
vi.mock("../../services/agent-import", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/agent-import")>()),
    resolveCanonicalAgentAtom,
    planOperatorLink,
}));
vi.mock("../../services/agent-identity-atom", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/agent-identity-atom")>()),
    planIdentityAtom,
}));

const {useAgentImport} = await import("../use-agent-import");
const REGISTRY = "0x0000000000000000000000000000000000000001";

describe("useAgentImport", () => {
    it("reads a testnet agent's atom in the testnet graph, and any other in mainnet's", async () => {
        const {result} = renderHook(() => useAgentImport());
        await result.current.resolveAtom({chainId: 13579, tokenId: "40", registry: REGISTRY});
        expect(erc8004GraphClient).toHaveBeenLastCalledWith(choiceFor(false).graphqlUrl);
        await result.current.resolveAtom({chainId: 8453, tokenId: "1", registry: REGISTRY});
        expect(erc8004GraphClient).toHaveBeenLastCalledWith(undefined);
    });

    it("prices the record and the link on testnet even with the toggle on mainnet", async () => {
        const mainnet = ({children}: {children: ReactNode}) => (
            <ChainChoiceContext.Provider value={{choice: choiceFor(true), setMainnet: () => {}}}>
                {children}
            </ChainChoiceContext.Provider>
        );
        const {result} = renderHook(() => useAgentImport(), {wrapper: mainnet});
        await result.current.planIdentity({chainId: 13579, tokenId: "40", registry: REGISTRY});
        expect(planIdentityAtom).toHaveBeenCalledWith(
            expect.objectContaining({chain: choiceFor(false)}),
        );
        await result.current.planLink({
            agentAtomId: `0x${"ab".repeat(32)}`,
            operatingAccount: REGISTRY,
        });
        expect(planOperatorLink).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            choiceFor(false),
        );
    });
});
