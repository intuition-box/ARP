import {act, renderHook} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {ChainChoiceProvider} from "../ChainChoiceProvider";
import {CHAIN_STORAGE_KEY, readStored, useChainChoice, useSetChain} from "../chain-choice";

/**
 * The provider in front of every page. `VITE_ALLOW_MAINNET` is read at call time, so each case
 * stubs it; storage is happy-dom's own.
 */
function wrapper({children}: {children: ReactNode}) {
    return <ChainChoiceProvider>{children}</ChainChoiceProvider>;
}

function useBoth() {
    return {choice: useChainChoice(), setMainnet: useSetChain()};
}

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("ChainChoiceProvider", () => {
    it("opens on testnet and ignores a stored mainnet where mainnet is not allowed", () => {
        vi.stubEnv("VITE_ALLOW_MAINNET", "");
        localStorage.setItem(CHAIN_STORAGE_KEY, "mainnet");
        const {result} = renderHook(useBoth, {wrapper});
        expect(result.current.choice.chainId).toBe(13579);
        act(() => result.current.setMainnet(true));
        expect(result.current.choice.chainId).toBe(13579);
        expect(localStorage.getItem(CHAIN_STORAGE_KEY)).toBe("mainnet");
    });

    it("where mainnet is allowed, restores a stored choice and remembers a new one", () => {
        vi.stubEnv("VITE_ALLOW_MAINNET", "1");
        localStorage.setItem(CHAIN_STORAGE_KEY, "mainnet");
        const {result} = renderHook(useBoth, {wrapper});
        expect(result.current.choice.isMainnet).toBe(true);
        act(() => result.current.setMainnet(false));
        expect(result.current.choice.symbol).toBe("tTRUST");
        expect(localStorage.getItem(CHAIN_STORAGE_KEY)).toBe("testnet");
        act(() => result.current.setMainnet(true));
        expect(localStorage.getItem(CHAIN_STORAGE_KEY)).toBe("mainnet");
    });

    it("still switches for the session when storage refuses the write", () => {
        vi.stubEnv("VITE_ALLOW_MAINNET", "1");
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("quota");
        });
        const {result} = renderHook(useBoth, {wrapper});
        act(() => result.current.setMainnet(true));
        expect(result.current.choice.symbol).toBe("TRUST");
    });
});

describe("the chain-choice hooks outside the provider", () => {
    it("throw rather than default to a chain", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => renderHook(() => useChainChoice())).toThrow(/no ChainChoiceProvider/);
        expect(() => renderHook(() => useSetChain())).toThrow(/no ChainChoiceProvider/);
    });
});

describe("readStored", () => {
    it("defaults to testnet where there is no storage at all", () => {
        vi.stubGlobal("localStorage", undefined);
        expect(readStored()).toBe(false);
        vi.unstubAllGlobals();
    });
});
