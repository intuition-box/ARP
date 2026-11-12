import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {TransactionReceiptNotFoundError, type Chain, type Hex} from "viem";

/**
 * The app's one feed, wired to the browser. Its address is read at module load, so each test
 * stubs the environment and imports a fresh copy. The two boundaries are stubbed: `EventSource`
 * and the per-chain RPC client.
 */
const getTransactionReceipt = vi.hoisted(() => vi.fn());
const publicClientFor = vi.hoisted(() =>
    vi.fn<(chain: Chain) => {getTransactionReceipt: typeof getTransactionReceipt}>(() => ({
        getTransactionReceipt,
    })),
);
vi.mock("../../lib/clients", () => ({publicClientFor}));

const HASH: Hex = `0x${"1".repeat(64)}`;

class FakeEventSource {
    static opened: string[] = [];
    static last: FakeEventSource | null = null;
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    constructor(url: string) {
        FakeEventSource.opened.push(url);
        FakeEventSource.last = this;
    }
    close(): void {}
}

const sentFrame = (chainId: number) =>
    new MessageEvent("message", {
        data: JSON.stringify({
            source: "sent",
            at: "2026-10-30T13:11:00Z",
            chainId,
            status: "success",
            hash: HASH,
            signer: null,
            to: null,
            value: "0",
            gasUsed: null,
            kind: "deposit",
            why: "stake",
            decoded: {fn: "redeem", termId: `0x${"d".repeat(64)}`},
        }),
    });
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function load() {
    vi.resetModules();
    const {agentFeed} = await import("../agent-feed-live");
    const {activityLog} = await import("../activity-log");
    return {agentFeed, activityLog};
}
const confirmed = (log: {all(): readonly {key?: string; label: string}[]}) =>
    log.all().find((entry) => entry.key === `agent:confirmed:${HASH}`);

// The first import transforms viem and the feed's graph; on a loaded machine that alone passed 5 s and
// the late import then opened a feed inside the next test. Warm it once, so each `load()` re-evaluates
// cached modules.
beforeAll(async () => {
    await import("../agent-feed-live");
}, 60_000);

beforeEach(() => {
    FakeEventSource.opened = [];
    FakeEventSource.last = null;
    vi.stubGlobal("EventSource", FakeEventSource);
    getTransactionReceipt.mockReset();
    publicClientFor.mockClear();
});
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe("where the feed connects", () => {
    it("to the configured address when one is set", async () => {
        vi.stubEnv("VITE_ARP_ACTIVITY_URL", "https://feed.example/events");
        const {agentFeed} = await load();
        const stop = agentFeed.start();
        expect(FakeEventSource.opened).toEqual(["https://feed.example/events"]);
        stop();
    });

    it("to the local default in a dev build, when the address is empty", async () => {
        vi.stubEnv("VITE_ARP_ACTIVITY_URL", "");
        vi.stubEnv("DEV", true);
        const {agentFeed} = await load();
        const stop = agentFeed.start();
        expect(FakeEventSource.opened).toEqual(["http://127.0.0.1:3003/events"]);
        stop();
    });

    it("nowhere in a production build with no address", async () => {
        vi.stubEnv("VITE_ARP_ACTIVITY_URL", "");
        vi.stubEnv("DEV", false);
        const {agentFeed} = await load();
        const stop = agentFeed.start();
        expect(FakeEventSource.opened).toEqual([]);
        expect(agentFeed.status()).toBe("off");
        stop();
    });
});

describe("how a sent hash is confirmed", () => {
    beforeEach(() => {
        vi.stubEnv("VITE_ARP_ACTIVITY_URL", "https://feed.example/events");
    });

    it("reads the receipt on the chain the call was sent on, and prices it", async () => {
        getTransactionReceipt.mockResolvedValue({
            status: "success",
            blockNumber: 42n,
            gasUsed: 10n,
            effectiveGasPrice: 3n,
        });
        const {agentFeed, activityLog} = await load();
        const stop = agentFeed.start();
        FakeEventSource.last?.onmessage?.(sentFrame(1155));
        await settle();
        expect(publicClientFor.mock.calls[0]?.[0].id).toBe(1155);
        expect(confirmed(activityLog)).toMatchObject({label: "block 42", costWei: "30"});
        stop();
    });

    it("reads testnet receipts through the testnet client", async () => {
        getTransactionReceipt.mockResolvedValue({
            status: "reverted",
            blockNumber: 7n,
            gasUsed: 1n,
            effectiveGasPrice: 1n,
        });
        const {agentFeed, activityLog} = await load();
        const stop = agentFeed.start();
        FakeEventSource.last?.onmessage?.(sentFrame(13579));
        await settle();
        expect(publicClientFor.mock.calls[0]?.[0].id).toBe(13579);
        expect(confirmed(activityLog)).toMatchObject({label: "reverted"});
        stop();
    });

    it("a chain the app has no client for, a receipt not mined yet, and an RPC failure confirm nothing", async () => {
        const {agentFeed, activityLog} = await load();
        const stop = agentFeed.start();
        FakeEventSource.last?.onmessage?.(sentFrame(8453));
        await settle();
        expect(publicClientFor).not.toHaveBeenCalled();
        expect(confirmed(activityLog)).toBeUndefined();
        stop();

        for (const failure of [
            new TransactionReceiptNotFoundError({hash: HASH}),
            new Error("rpc down"),
        ]) {
            getTransactionReceipt.mockRejectedValueOnce(failure);
            const fresh = await load();
            const stopFresh = fresh.agentFeed.start();
            FakeEventSource.last?.onmessage?.(sentFrame(13579));
            await settle();
            expect(getTransactionReceipt).toHaveBeenCalled();
            expect(confirmed(fresh.activityLog)).toBeUndefined();
            stopFresh();
        }
    });
});
