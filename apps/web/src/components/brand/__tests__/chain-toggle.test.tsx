import {screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {renderWithProviders} from "../../../test/render";
import {ChainToggle} from "../ChainToggle";

describe("the chain control (task 74)", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("says this is a test on testnet, and offers no switch, unless a build allows mainnet", () => {
        renderWithProviders(<ChainToggle />);
        const label = screen.getByRole("link", {name: /Testnet · test money/});
        expect(label.getAttribute("href")).toBe("/conditions");
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("is the switch again with VITE_ALLOW_MAINNET=1", () => {
        vi.stubEnv("VITE_ALLOW_MAINNET", "1");
        renderWithProviders(<ChainToggle />);
        expect(screen.getByRole("button", {name: /Switch to Mainnet/})).toBeTruthy();
    });
});
