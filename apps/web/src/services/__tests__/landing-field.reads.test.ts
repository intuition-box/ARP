import {describe, expect, it, vi} from "vitest";

/**
 * The one read `landing-field.ts` still makes itself, stubbed where it leaves the browser: the
 * MultiVault reads (an RPC).
 */
const atomId = vi.hoisted(() => vi.fn());
const multiVaultReads = vi.hoisted(() => vi.fn(() => ({atomId})));
vi.mock("@arp-protocol/core", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@arp-protocol/core")>()),
    multiVaultReads,
}));

const {readVocabularyIds} = await import("../landing-field");

const VOCABULARY = {
    rpcUrl: "https://rpc.test",
    chainId: 13579,
    multiVault: "0x0000000000000000000000000000000000000001",
    inContextOf: "0x01",
    payers: [],
} as const;

describe("readVocabularyIds", () => {
    it("reads the two vocabulary atoms' ids off the chain the vocabulary names", async () => {
        atomId.mockResolvedValueOnce("0xoutcome").mockResolvedValueOnce("0xbecause");
        expect(await readVocabularyIds(VOCABULARY)).toEqual({
            hasOutcome: "0xoutcome",
            because: "0xbecause",
        });
        expect(multiVaultReads).toHaveBeenCalledWith({
            address: VOCABULARY.multiVault,
            chainId: 13579,
            rpcUrl: "https://rpc.test",
        });
    });
});
