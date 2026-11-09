import {describe, expect, it} from "vitest";

import {chainNameOf} from "../chain-name";

/** The agent page's path line names the chain an identity lives on. */
describe("chainNameOf", () => {
    it("names a chain the app knows", () => {
        expect(chainNameOf(8453)).toBe("Base");
    });

    it("falls back to the id for one it does not", () => {
        expect(chainNameOf(42)).toBe("Chain 42");
    });
});
