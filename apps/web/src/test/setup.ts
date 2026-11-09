import "@testing-library/jest-dom/vitest";
import {cleanup} from "@testing-library/react";
import {afterEach, vi} from "vitest";

/**
 * Unmount between tests.
 *
 * Without it every render stacks in the same document and a `getByText` that should find one node
 * finds three — which fails as "multiple elements" rather than as the thing that is actually wrong,
 * and sends the next reader looking in the wrong place.
 */
afterEach(() => {
    cleanup();
});

/**
 * No render reaches the graph to learn which atoms are ARP's test identities (task 74): every
 * read that filters them gets an empty set unless a test says otherwise with `vi.mocked`.
 */
vi.mock("../services/test-identities", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../services/test-identities")>()),
    hiddenAtomIds: vi.fn(async () => new Set<string>()),
}));
