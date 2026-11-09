import {screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {renderWithProviders} from "../../../test/render";
import {ChainToggle} from "../ChainToggle";

describe("the chain control (task 74)", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("shows nothing, and offers no switch, unless a build allows mainnet", () => {
        renderWithProviders(<ChainToggle />);
        expect(screen.queryByRole("link")).toBeNull();
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("is the switch again with VITE_ALLOW_MAINNET=1", () => {
        vi.stubEnv("VITE_ALLOW_MAINNET", "1");
        renderWithProviders(<ChainToggle />);
        expect(screen.getByRole("button", {name: /Switch to Mainnet/})).toBeTruthy();
    });
});
