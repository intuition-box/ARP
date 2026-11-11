import {describe, expect, it, vi} from "vitest";

/**
 * A chain whose environment lacks MetaMask's two enforcers cannot be given a stake delegation: the
 * builder refuses rather than emitting a delegation with only ARP's cap on it.
 */
vi.mock("@metamask/smart-accounts-kit", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@metamask/smart-accounts-kit")>()),
    getSmartAccountsEnvironment: () => ({caveatEnforcers: {}}),
}));

const {composeAndStakeCaveats} = await import("../caveat-builder");

describe("composeAndStakeCaveats on a misconfigured chain", () => {
    it("refuses when the AllowedTargets and AllowedMethods enforcers are missing", () => {
        expect(() => composeAndStakeCaveats({cap: 1n, periodSeconds: 1n})).toThrow(
            /AllowedTargets\/Methods enforcers missing/,
        );
    });
});
