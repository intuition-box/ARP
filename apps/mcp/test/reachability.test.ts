import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {answerOf, errorOf, fakeReads, type FakeState} from "./helpers/fake-reads.js";

vi.hoisted(() => {
    process.env["ARP_NO_RECEIPTS"] = "1";
    process.env["ARP_TARGET"] = "testnet";
});

const state = vi.hoisted(() => ({shares: 0n}) as {shares?: bigint});
const probeEndpoint = vi.hoisted(() => vi.fn());
vi.mock("@arp-protocol/core", async (original) => ({...(await original<typeof import("@arp-protocol/core")>()), probeEndpoint}));
vi.mock("../src/config.js", async (original) => ({
    ...(await original<typeof import("../src/config.js")>()),
    reads: fakeReads(state as FakeState),
}));

const {probe, recordReachable} = await import("../src/handlers/reachability.js");

const TOOL = `0x${"ab".repeat(32)}`;
const RECEIVER = "0x00000000000000000000000000000000000000b1";
const LIVE = {status: "confirmed", code: "live", httpStatus: 200, request: {method: "GET", url: "https://tool.example"}, detail: "200"};

beforeEach(() => {
    state.shares = 0n;
    probeEndpoint.mockReset().mockResolvedValue(LIVE);
    delete process.env["ARP_ALLOW_PRIVATE_PROBE"];
});
afterEach(() => {
    delete process.env["ARP_ALLOW_PRIVATE_PROBE"];
});

describe("arp_probe_endpoint", () => {
    it.each([
        [{url: "ftp://x"}, "url must be an http or https address"],
        [{url: 3}, "url must be an http or https address"],
        [{url: "https://tool.example", protocol: "grpc"}, "protocol, when given, must be 'mcp' or 'a2a'"],
    ])("refuses %j", async (args, message) => {
        expect((await errorOf(await probe(1, args))).message).toBe(message);
    });

    it("refuses a private address, unless the operator allows probing their own rig", async () => {
        const error = await errorOf(await probe(1, {url: "http://127.0.0.1:8080"}));
        expect(error.message).toMatch(/is not a public address/);
        expect(probeEndpoint).not.toHaveBeenCalled();
        process.env["ARP_ALLOW_PRIVATE_PROBE"] = "1";
        expect(await answerOf(await probe(1, {url: "http://127.0.0.1:8080"}))).toEqual({url: "http://127.0.0.1:8080", outcome: LIVE});
        expect(probeEndpoint.mock.calls[0]?.[1]).toEqual({allowPrivate: true});
    });

    it("probes with the declared protocol, through the DNS guard", async () => {
        await probe(1, {url: "https://tool.example", protocol: "mcp"});
        const [endpoint, guard] = probeEndpoint.mock.calls[0] ?? [];
        expect(endpoint).toMatchObject({protocol: "mcp", name: "mcp", classification: {status: "probeable", url: "https://tool.example"}});
        expect(guard).toMatchObject({allowPrivate: false});
        await probe(1, {url: "https://tool.example"});
        expect(probeEndpoint.mock.calls[1]?.[0]).toMatchObject({protocol: null, name: null});
    });
});

describe("arp_record_reachable", () => {
    const record = (args: Record<string, unknown>) => recordReachable(2, {url: "https://tool.example", tool_atom_id: TOOL, receiver: RECEIVER, ...args});

    it.each([
        [{url: "tool.example"}, "url must be an http or https address"],
        [{tool_atom_id: "0x1"}, "tool_atom_id must be 0x + 32 bytes — arp_find_tools returns them"],
        [{receiver: "me"}, "receiver must be a 0x address"],
        [{protocol: "http"}, "protocol, when given, must be 'mcp' or 'a2a'"],
    ])("refuses %j", async (args, message) => {
        expect((await errorOf(await record(args))).message).toBe(message);
    });

    it("plans the claim an up verdict calls for, unsigned, with its cost", async () => {
        const out = await answerOf(await record({protocol: "a2a"}));
        expect(out).toMatchObject({url: "https://tool.example", verdict: "up", you_currently_assert: "none", would_become: "up"});
        expect(out["triple_id"]).toMatch(/^0x[0-9a-f]{64}$/);
        expect(out["counter_triple_id"]).toMatch(/^0x[0-9a-f]{64}$/);
        const calls = out["calls"] as {value_wei: string}[];
        expect(calls.length).toBeGreaterThan(0);
        expect(out["total_value_wei"]).toBe(calls.reduce((sum, call) => sum + BigInt(call.value_wei), 0n).toString());
        expect(out).not.toHaveProperty("warning");
        expect(String(out["caveat"])).toMatch(/UNSIGNED/);
    });

    it("plans nothing when the probe gave no verdict", async () => {
        probeEndpoint.mockResolvedValue({status: "inconclusive", reason: "tls", detail: "x"});
        const out = await answerOf(await record({}));
        expect(out).toMatchObject({verdict: "no-verdict", calls: [], total_value_wei: "0"});
    });

    it("warns an address that supports both sides", async () => {
        state.shares = 5n;
        expect((await answerOf(await record({})))["warning"]).toBe("this address supports BOTH sides");
    });
});
