import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {encodeAbiParameters, type Hex} from "viem";

import {answerOf, errorOf, fakeReads} from "./helpers/fake-reads.js";

/**
 * `arp_identity`, `arp_find_agents` over the directory and the sieve, and `arp_agent_endpoints`
 * from the document through to the lines. The graph readers are mocked; the chain is a stubbed
 * JSON-RPC `fetch`, so the registry and payment reads run through viem for real.
 */
vi.hoisted(() => {
    process.env["ARP_NO_RECEIPTS"] = "1";
    process.env["ARP_TARGET"] = "testnet";
});

const OWN = "0xC165A2AD2E540A4069E02834009161E2b4490d5A";
const OWNER = "0x00000000000000000000000000000000000000e1";
const ATOM = `0x${"aa".repeat(32)}`;
const PAYMENT = `0x${"99".repeat(32)}` as Hex;

const mocks = vi.hoisted(() => ({
    resolveAgent: vi.fn(),
    resolveAgentAtom: vi.fn(),
    resolveDeclarationSubject: vi.fn(),
    getAgentEndpoints: vi.fn(),
    getPulseUsage: vi.fn(),
    readLineReceipts: vi.fn(),
    walletControlsSubject: vi.fn(),
    atomIsCanonicalFor: vi.fn(),
    listAgents: vi.fn(),
    findAgents: vi.fn(),
    findAgentsInDomains: vi.fn(),
    readRegistrationDocument: vi.fn(),
}));
vi.mock("@arp-protocol/core", async (original) => {
    const real = await original<typeof import("@arp-protocol/core")>();
    const {readRegistrationDocument: _document, ...core} = mocks;
    return {...real, ...core};
});
vi.mock("../src/registration-document.js", async (original) => ({
    ...(await original<typeof import("../src/registration-document.js")>()),
    readRegistrationDocument: mocks.readRegistrationDocument,
}));
vi.mock("../src/host-guard.js", () => ({hostGuard: () => ({allowPrivate: true})}));
vi.mock("../src/line-words.js", async (original) => ({
    ...(await original<typeof import("../src/line-words.js")>()),
    lineWordAtomIds: async () => ({hasOutcome: ATOM, because: ATOM}),
}));
vi.mock("../src/domain-tree.js", () => ({searchDomainTree: async () => ({subtree: (label: string) => [label, `${label} child`]})}));
vi.mock("../src/config.js", async (original) => ({
    ...(await original<typeof import("../src/config.js")>()),
    record: {arp: {identityRegistry: OWN, endpointBinding: {hasEndpoint: `0x${"e1".repeat(32)}`}}},
    IN_CONTEXT_OF: `0x${"c1".repeat(32)}`,
    reads: fakeReads(),
}));

const {agentEndpoints, findAgents, identity} = await import("../src/handlers/agents.js");

/** The chain: `ownerOf` answers, `getAgentWallet` reverts, a payment is mined, any other is unknown. */
type RpcCall = {method: string; params: unknown[]};
let rpcLog: RpcCall[] = [];
let paymentMined = true;
function chainAnswer(call: RpcCall): {result: unknown} | {error: {code: number; message: string}} {
    if (call.method === "eth_chainId") return {result: "0x350b"};
    if (call.method === "eth_call") {
        const data = String((call.params[0] as {data: string}).data);
        // ownerOf(uint256)
        if (data.startsWith("0x6352211e")) return {result: encodeAbiParameters([{type: "address"}], [OWNER])};
        return {error: {code: 3, message: "execution reverted"}};
    }
    if (call.method === "eth_getTransactionByHash") {
        if (!paymentMined) return {result: null};
        return {
            result: {
                hash: PAYMENT, from: OWNER, to: OWN, value: "0x3e8", blockHash: `0x${"11".repeat(32)}`, blockNumber: "0x1",
                transactionIndex: "0x0", nonce: "0x0", gas: "0x5208", gasPrice: "0x1", input: "0x", type: "0x0", v: "0x1b", r: "0x1", s: "0x1",
            },
        };
    }
    if (call.method === "eth_getTransactionReceipt") {
        if (!paymentMined) return {result: null};
        return {
            result: {
                transactionHash: PAYMENT, status: "0x1", from: OWNER, to: OWN, blockHash: `0x${"11".repeat(32)}`, blockNumber: "0x1",
                transactionIndex: "0x0", cumulativeGasUsed: "0x5208", gasUsed: "0x5208", logs: [], logsBloom: `0x${"00".repeat(256)}`,
                effectiveGasPrice: "0x1", type: "0x0", contractAddress: null,
            },
        };
    }
    return {error: {code: -32601, message: "no"}};
}
let nodeAnswer: () => Response = () => Response.json({offer: {description: "notes", input: "{}", output: "{}"}, minBudgetWei: "5"});

beforeEach(() => {
    rpcLog = [];
    paymentMined = true;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        if (init?.method === "POST" && typeof init.body === "string" && init.body.includes('"jsonrpc"')) {
            const call = JSON.parse(init.body) as RpcCall & {id: number}; // a JSON-RPC request viem built
            rpcLog.push(call);
            return Response.json({jsonrpc: "2.0", id: call.id, ...chainAnswer(call)});
        }
        void input;
        return nodeAnswer();
    }));
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.resolveAgent.mockResolvedValue({registrationFile: "https://agent.example/card.json"});
    mocks.readRegistrationDocument.mockResolvedValue({
        status: "ok",
        document: {endpoints: [{name: "A2A", endpoint: "https://agent.example/a2a", version: "0.3"}, {name: "MCP", endpoint: "not a url"}]},
    });
    mocks.resolveAgentAtom.mockResolvedValue({status: "found", atom: ATOM});
    mocks.getAgentEndpoints.mockResolvedValue([]);
    mocks.atomIsCanonicalFor.mockResolvedValue(true);
    mocks.getPulseUsage.mockResolvedValue(new Map());
    mocks.walletControlsSubject.mockResolvedValue("yes");
});
afterEach(() => vi.unstubAllGlobals());

describe("arp_identity", () => {
    it.each([
        [{agent_chain_id: 0}, "agent_chain_id must be a positive integer"],
        [{agent_chain_id: 8453, agent_token_id: "x"}, "agent_token_id must be a decimal string"],
        [{agent_chain_id: 8453, agent_token_id: "1", registry: "0x1"}, "registry, when given, must be a 20-byte hex address"],
    ])("refuses %j", async (args, message) => {
        expect((await errorOf(await identity(1, args))).message).toBe(message);
    });

    it("names the identity entry an agent declares under", async () => {
        mocks.resolveDeclarationSubject.mockResolvedValue(ATOM);
        const out = await answerOf(await identity(1, {agent_chain_id: 8453, agent_token_id: "7", registry: OWN}));
        expect(out).toMatchObject({identity_atom: ATOM, declarable: true});
        expect(String(out["caip19"])).toBe(`eip155:8453/erc721:${OWN}/7`);
    });

    it("says an agent with no public identity cannot declare yet, and why that is common", async () => {
        const missing = new Error("none");
        missing.name = "NoAgentIdentityError";
        mocks.resolveDeclarationSubject.mockRejectedValue(missing);
        const out = await answerOf(await identity(1, {agent_chain_id: 8453, agent_token_id: "7"}));
        expect(out).toMatchObject({identity_atom: null, declarable: false});
        expect(String(out["note"])).toContain("28,648");
    });

    it("lets any other failure through", async () => {
        mocks.resolveDeclarationSubject.mockRejectedValue(new Error("graph down"));
        await expect(identity(1, {agent_chain_id: 8453, agent_token_id: "7"})).rejects.toThrow("graph down");
    });
});

describe("arp_find_agents over the directory", () => {
    it.each([
        [{domain: " "}, "domain, when given, must be a category of the tree"],
        [{domain: 3}, "domain, when given, must be a category of the tree"],
        [{order: "best"}, "order must be"],
        [{limit: 0}, "limit must be an integer between 1 and 100"],
        [{limit: 1.5}, "limit must be an integer between 1 and 100"],
        [{offset: -2}, "offset must be a non-negative integer"],
    ])("refuses %j", async (args, message) => {
        expect((await errorOf(await findAgents(1, args))).message).toContain(message);
    });

    it("answers a page with the cohort's size, each agent's market as read, and its rung where the sieve read it", async () => {
        mocks.listAgents.mockResolvedValue({
            sourceId: "intuition",
            order: "economic-conviction",
            limit: 2,
            offset: 4,
            total: 28_648,
            agents: [
                {
                    sourceHandle: "0x01",
                    ref: {chainId: 8453, registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", tokenId: "2340"},
                    isIdentityAmbiguous: false,
                    identityEdgeCount: 1,
                    metadata: {name: "Clawnch", isFallback: false},
                    statementCount: 12,
                    market: {totalMarketCap: 13n, positionCount: 3, vaultCount: 2},
                },
                {sourceHandle: "0x02", ref: null, isIdentityAmbiguous: true, identityEdgeCount: 2, metadata: {name: "Agent 1:2", isFallback: true}, statementCount: 0, market: {totalMarketCap: null, positionCount: 0, vaultCount: 0}},
                {sourceHandle: "0x03", ref: {chainId: 1, registry: OWN, tokenId: "9"}, isIdentityAmbiguous: false, identityEdgeCount: 1, metadata: {name: "x", isFallback: false}, statementCount: 1, market: null},
            ],
        });
        const out = await answerOf(await findAgents(1, {order: "economic-conviction", limit: 2, offset: 4}));
        expect(mocks.listAgents.mock.calls[0]?.[1]).toEqual({order: "economic-conviction", limit: 2, offset: 4});
        expect(out).toMatchObject({source_id: "intuition", total: 28_648, limit: 2, offset: 4});
        const [first, second, third] = out["agents"] as Record<string, unknown>[];
        expect(first).toMatchObject({rung: 4, could_not_say: false, own_atom_market: {total_market_cap_wei: "13", position_count: 3, vault_count: 2}});
        expect(second).toMatchObject({caip19: null, identity_ambiguous: true, name_is_fallback: true, own_atom_market: {total_market_cap_wei: null}});
        expect(second).not.toHaveProperty("rung");
        expect(third).toMatchObject({own_atom_market: null});
        expect(third).not.toHaveProperty("rung");
    });

    it("pages the agents that answered the sieve's walk, highest rung first", async () => {
        const out = await answerOf(await findAgents(1, {order: "answers-now", limit: 1, offset: 0}));
        expect(out).toMatchObject({order: "answers-now", limit: 1, offset: 0});
        expect(out["checked"]).toEqual(expect.any(String));
        expect(out["agents"]).toHaveLength(1);
        expect((out["agents"] as {rung: number}[])[0]?.rung).toBeGreaterThanOrEqual(3);
        expect(mocks.listAgents).not.toHaveBeenCalled();
    });
});

describe("arp_find_agents for a domain", () => {
    const line = (writer: string, outcome: string) => ({
        tripleId: "0xl",
        agent: {atomId: ATOM, label: "Agent 13579:6"},
        writer,
        holders: [],
        declaredAt: null,
        domains: ["design child"],
        outcomes: [outcome],
        lines: [{domain: "design child", outcome, reasons: []}],
    });

    it("walks the domain's subtree, reads each control once, and keeps what the agents say of themselves apart", async () => {
        mocks.findAgentsInDomains.mockResolvedValue({
            agents: [{atomId: ATOM, label: "six", caip19: `eip155:13579/erc721:${OWN}/6`, ambiguous: false}],
            truncated: false,
        });
        mocks.getPulseUsage.mockResolvedValue(new Map([[ATOM, {declarations: [line("0xw1", "worked"), line("0xw1", "worked"), line("0xw2", "failed")], byOthers: [], truncated: true}]]));
        mocks.walletControlsSubject.mockImplementation(async (_atom: string, wallet: string) => {
            if (wallet === "0xw2") throw new Error("rpc down");
            return "yes";
        });
        mocks.findAgents.mockResolvedValue({agents: [{atomId: "0xself", label: "self", matched: {label: "design"}}]});
        const out = await answerOf(await findAgents(1, {domain: " Design "}));
        expect(out).toMatchObject({domain: "design", searched: ["design", "design child"], truncated: true});
        expect(mocks.walletControlsSubject).toHaveBeenCalledTimes(2);
        expect((out["used_here"] as Record<string, unknown>[])[0]).toMatchObject({
            agent_token_id: "6",
            registry: OWN,
            wallets_worked: 1,
            wallets_failed: 0,
            lines_in_domain: 2,
            lines_not_counted: 1,
        });
        expect(out["say_they_do_this"]).toEqual([{atom: "0xself", label: "self", matched: "design"}]);
    });

    it("keeps the lines it counted when the self-description read fails, and names the failure", async () => {
        mocks.findAgentsInDomains.mockResolvedValue({agents: [], truncated: false});
        mocks.findAgents.mockRejectedValue(new Error("graph down"));
        const out = await answerOf(await findAgents(1, {domain: "design"}));
        expect(out).toMatchObject({used_here: [], say_they_do_this: null, error: "graph down"});
    });
});

describe("arp_agent_endpoints", () => {
    const ask = (args: Record<string, unknown> = {}) => agentEndpoints(1, {agent_chain_id: 13579, agent_token_id: "6", ...args}).then(answerOf);

    it("passes the refusal through untouched", async () => {
        expect((await errorOf(await agentEndpoints(1, {agent_chain_id: 13579, agent_token_id: "six"}))).message).toBe("agent_token_id must be a decimal string");
        expect((await errorOf(await agentEndpoints(1, {agent_chain_id: 13579, agent_token_id: "6", registry: "0x1"}))).message).toBe(
            "registry, when given, must be a 20-byte hex address",
        );
    });

    it("splits what can be called from what cannot, and reads this chain's registry when none was named", async () => {
        const out = await ask();
        expect(mocks.resolveAgent.mock.calls[0]?.[1]).toMatchObject({registry: OWN});
        expect(out["callable"]).toEqual([expect.objectContaining({name: "A2A", url: "https://agent.example/a2a"})]);
        expect((out["not_callable"] as {name: string}[]).map((row) => row.name)).toEqual(["MCP"]);
        expect(out).toMatchObject({signed_endpoints: [], lines: [], lines_total: 0, by_others: []});
    });

    it.each([
        [{status: "refused", reason: "private address"}, "refused: private address"],
        [{status: "unreadable", reason: "not JSON"}, "not JSON"],
    ])("says what was published and could not be read: %j", async (read, error) => {
        mocks.readRegistrationDocument.mockResolvedValue(read);
        expect(await ask()).toMatchObject({registration_file: "https://agent.example/card.json", error});
    });

    it("says a document it failed to fetch is not a missing one", async () => {
        mocks.readRegistrationDocument.mockRejectedValue(new Error("timeout"));
        expect(await ask()).toMatchObject({error: "timeout", note: expect.stringContaining("different answer")});
    });

    it("tells an agent with no document from one the graph does not hold, and points at its signed addresses", async () => {
        mocks.getAgentEndpoints.mockResolvedValue([{endpoint: "https://node.example", tripleId: "0x1", createdAt: null, status: "bound", proofs: []}]);
        mocks.resolveAgent.mockResolvedValue({registrationFile: " "});
        expect((await ask())["note"]).toBe("This agent registered without a document. Its addresses are in signed_endpoints.");
        mocks.resolveAgent.mockResolvedValue(null);
        const out = await ask();
        expect(out["in_graph"]).toBe(false);
        expect(String(out["note"])).toMatch(/^Not found in the graph this server reads \(chain 13579\), so its document was not read\. Its addresses/);
    });

    it("reads signed addresses and lines only for agents on this chain", async () => {
        const out = await ask({agent_chain_id: 8453, registry: OWN});
        expect(out).toMatchObject({signed_endpoints: null, lines: null});
        expect(String(out["pulse_note"])).toContain("chain 13579");
    });

    it.each([
        [{status: "none"}, {signed_endpoints: [], lines: []}],
        [{status: "ambiguous", reason: "two atoms"}, {signed_endpoints: null, lines: null, pulse_note: expect.stringContaining("two atoms")}],
    ])("reads nothing for an identity it cannot pin down: %j", async (strict, expected) => {
        mocks.resolveAgentAtom.mockResolvedValue(strict);
        expect(await ask()).toMatchObject(expected);
    });

    it("names a failure to resolve the identity beside the declared endpoints", async () => {
        mocks.resolveAgentAtom.mockRejectedValue(new Error("graph down"));
        const out = await ask();
        expect(out).toMatchObject({pulse_error: "graph down", signed_endpoints: null});
        expect(out["callable"]).toHaveLength(1);
    });

    it("asks only the newest signed addresses whether they answer, and reads the owner off the registry", async () => {
        mocks.resolveAgentAtom.mockImplementation(async (ref: {registry: `0x${string}`; tokenId: string}, options: {controllersOf: (r: unknown) => Promise<string[]>}) => {
            expect(await options.controllersOf(ref)).toEqual([OWNER]);
            return {status: "found", atom: ATOM};
        });
        const bound = (n: number) => ({endpoint: `https://node${n}.example`, tripleId: `0x${n}`, createdAt: null, status: "bound", proofs: [{binding: {nodeAddress: OWNER.toLowerCase()}}]});
        mocks.getAgentEndpoints.mockResolvedValue([bound(1), bound(2), bound(3), bound(4)]);
        let calls = 0;
        nodeAnswer = () => (++calls === 1 ? new Response("down", {status: 502}) : Response.json({offer: {description: "notes", input: "{}", output: "{}"}, minBudgetWei: "5"}));
        const signed = (await ask())["signed_endpoints"] as Record<string, unknown>[];
        expect(signed).toHaveLength(4);
        expect(signed.slice(0, 3).filter((row) => row["answers_now"] === true)).toHaveLength(2);
        expect(signed.find((row) => row["answers_now"] === false)).toMatchObject({why: "http 502", offer: null});
        expect(signed[3]).toMatchObject({answers_now: null, why: "not_checked_older_address", offer: null});
        expect(rpcLog.some((call) => call.method === "eth_call")).toBe(true);
    });

    it("does not read lines on an entry that is not the agent's canonical one", async () => {
        mocks.atomIsCanonicalFor.mockResolvedValue(false);
        const out = await ask();
        expect(out["lines"]).toBeNull();
        expect(String(out["pulse_note"])).toContain("canonical");
    });

    it("lists the newest lines with what each receipt holds, the payment read on chain", async () => {
        const declared = (at: string | null) => ({
            tripleId: `0x${at ?? "none"}`,
            agent: {atomId: "0xhirer", label: "Hirer"},
            writer: OWNER,
            holders: [],
            declaredAt: at,
            domains: ["document"],
            outcomes: ["worked"],
            lines: [],
        });
        mocks.getPulseUsage.mockResolvedValue(new Map([[ATOM, {declarations: [declared("2026-11-01"), declared(null), declared("2026-11-05")], byOthers: ["0xother"], truncated: false}]]));
        mocks.walletControlsSubject.mockResolvedValueOnce("yes").mockRejectedValueOnce(new Error("rpc")).mockResolvedValue("no");
        mocks.readLineReceipts.mockImplementation(async (_line: unknown, deps: {getPayment: (hash: Hex) => Promise<unknown>}) => {
            const payment = await deps.getPayment(PAYMENT);
            return {
                receipts: [{document: "ipfs://r", signature: "valid", signer: OWNER, paidWei: payment === null ? null : "1000", paymentUnread: false, subjectControl: "yes", checks: {}}],
                unreadable: 0,
                othersNotRead: 1,
            };
        });
        const out = await ask();
        expect(out).toMatchObject({lines_total: 3, by_others: ["0xother"]});
        const lines = out["lines"] as Record<string, unknown>[];
        expect(lines.map((row) => row["declared_at"])).toEqual(["2026-11-05", "2026-11-01", null]);
        expect(lines.map((row) => row["wallet_controls_declarer"])).toEqual(["yes", "unknown", "no"]);
        expect((lines[0]?.["receipts"] as Record<string, unknown>[])[0]).toMatchObject({paid_wei: "1000", signer: OWNER});
        expect(lines[0]).toMatchObject({receipts_unreadable: 0, attachments_by_others_not_read: 1});
    });

    it("reads a payment that is not on chain as none, and any other failure as a failure", async () => {
        paymentMined = false;
        mocks.getPulseUsage.mockResolvedValue(new Map([[ATOM, {declarations: [{tripleId: "0x1", agent: {atomId: "0xh", label: "h"}, writer: OWNER, holders: [], declaredAt: null, domains: [], outcomes: [], lines: []}], byOthers: [], truncated: false}]]));
        let seen: unknown = "unset";
        mocks.readLineReceipts.mockImplementation(async (_line: unknown, deps: {getPayment: (hash: Hex) => Promise<unknown>}) => {
            seen = await deps.getPayment(PAYMENT);
            return {receipts: [], unreadable: 0, othersNotRead: 0};
        });
        await ask();
        expect(seen).toBeNull();
        mocks.readLineReceipts.mockRejectedValue(new Error("graph down"));
        expect(await ask()).toMatchObject({signed_endpoints: null, lines: null, pulse_error: "graph down"});
    });
});
