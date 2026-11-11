import {mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {encodeAbiParameters, encodeEventTopics, getAddress, type Hex} from "viem";
import {generatePrivateKey, privateKeyToAccount} from "viem/accounts";

import {contentDigest, encodeApproveDeposit, signContentReceipt} from "@arp-protocol/core";

import {refusal, type AgentSender} from "../src/desktop/agent-key.js";
import {declareUsed, getSkill, type LoopConfig} from "../src/desktop/loop.js";

/**
 * How the sponsored loop fails, step by step: each service is a route in a fake `fetch` and the
 * transaction sender is a fake that sends nothing. `desktop.test.ts` walks the path that works.
 */
const REGISTRY = getAddress("0xC165A2AD2E540A4069E02834009161E2b4490d5A");
const MULTI_VAULT = getAddress("0x2Ece8D4dEdcB9918A398528f3fa4688b1d2CAB91");
const SPONSOR = getAddress("0xE596096F4176b682E300d73963e7B04B383C1AA1");
const ATOM = `0x${"ab".repeat(32)}` as Hex;
const NODE = privateKeyToAccount(generatePrivateKey());
const bytes = new TextEncoder().encode("# A skill\n");

type Route = (init: RequestInit | undefined, url: URL) => Response | Promise<Response>;
let dir: string;
let routes: Record<string, Route>;

function agent(logs: "registered" | "foreign" = "registered"): AgentSender {
    const account = privateKeyToAccount(generatePrivateKey());
    const registered = {
        address: REGISTRY,
        topics: encodeEventTopics({
            abi: [{type: "event", name: "Registered", inputs: [{name: "agentId", type: "uint256", indexed: true}, {name: "agentURI", type: "string", indexed: false}, {name: "to", type: "address", indexed: true}]}],
            eventName: "Registered",
            args: {agentId: 7n, to: account.address},
        }),
        data: encodeAbiParameters([{type: "string"}], [""]),
    };
    // The registry's ERC-721 Transfer, which the loop's ABI does not decode, and a log from elsewhere.
    const transfer = {address: REGISTRY, topics: [`0x${"dd".repeat(32)}`], data: "0x"};
    const elsewhere = {...registered, address: MULTI_VAULT};
    const sent = logs === "registered" ? [transfer, elsewhere, registered] : [transfer, elsewhere];
    return {
        address: account.address,
        account,
        client: {readContract: async () => `0x${"ef".repeat(32)}`} as unknown as AgentSender["client"], // only `readContract` is called on it
        async send(call, permitted) {
            const why = refusal(call, permitted);
            if (why !== null) throw new Error(`refused: ${why}`);
            return {status: "success", transactionHash: "0x05", logs: sent} as unknown as Awaited<ReturnType<AgentSender["send"]>>; // the fields the loop reads
        },
    };
}

const config = (extra: Partial<LoopConfig> = {}): LoopConfig => ({
    contentUrl: "http://content.test",
    sponsorUrl: "http://sponsor.test",
    registry: REGISTRY,
    multiVault: MULTI_VAULT,
    stateDir: join(dir, ".arp"),
    sleep: async () => {},
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(input));
        const route = routes[url.host === "content.test" ? "content" : url.pathname];
        if (route === undefined) return Response.json({error: "no route"}, {status: 404});
        return route(init, url);
    }) as typeof fetch, // the subset of fetch the loop calls
    ...extra,
});

const served = (to: Hex, overrides: {digest?: Hex; header?: boolean} = {}): Route => async () => {
    const signed = await signContentReceipt(
        {atom: ATOM, url: "github.com/acme/skills?skill=thumbs", path: "thumbs/SKILL.md", digest: overrides.digest ?? contentDigest(bytes), to, servedAt: 1, nonce: `0x${"00".repeat(32)}`},
        13579,
        NODE,
    );
    return new Response(bytes, {headers: overrides.header === false ? {} : {"x-arp-receipt": JSON.stringify(signed)}});
};

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "arp-loop-errors-"));
    routes = {
        "/": () => Response.json({multiVault: MULTI_VAULT, sponsor: SPONSOR}),
        "/mint-gas": () => Response.json({sent: "0x01"}),
        "/identity": () => Response.json({identityAtom: `0x${"cd".repeat(32)}`, sent: []}),
        "/gas": () => Response.json({sent: "0x02", next: {to: MULTI_VAULT, data: encodeApproveDeposit(SPONSOR), value: "0"}}),
        "/deposit": () => Response.json({sent: "0x03"}),
    };
});
afterEach(() => rmSync(dir, {recursive: true, force: true}));

describe("getting a skill, refused", () => {
    it("passes on what the content server said", async () => {
        const me = agent();
        routes["content"] = () => Response.json({error: "unknown-atom", reason: "not catalogued"}, {status: 404});
        await expect(getSkill(config(), me, ATOM)).rejects.toThrow("the content server answered 404: unknown-atom not catalogued");
        routes["content"] = () => new Response("not json", {status: 500});
        await expect(getSkill(config(), me, ATOM)).rejects.toThrow("the content server answered 500:");
    });

    it("refuses bytes with no receipt, and bytes the receipt is not over", async () => {
        const me = agent();
        routes["content"] = served(me.address, {header: false});
        await expect(getSkill(config(), me, ATOM)).rejects.toThrow("the content server sent no receipt");
        routes["content"] = served(me.address, {digest: `0x${"00".repeat(32)}`});
        await expect(getSkill(config(), me, ATOM)).rejects.toThrow("the files do not match the receipt");
    });

    it("refuses a receipt whose signature does not hold", async () => {
        const me = agent();
        routes["content"] = async (init, url) => {
            const response = await served(me.address)(init, url);
            const signed = JSON.parse(response.headers.get("x-arp-receipt") ?? "{}") as Record<string, unknown>;
            return new Response(bytes, {headers: {"x-arp-receipt": JSON.stringify({...signed, signature: "0x1234"})}});
        };
        await expect(getSkill(config(), me, ATOM)).rejects.toThrow(/^the receipt does not verify/);
    });

    it("lets an error that is not a network failure through as it is", async () => {
        const me = agent();
        routes["content"] = () => {
            throw new RangeError("a bug, not the network");
        };
        await expect(getSkill(config(), me, ATOM)).rejects.toThrow(RangeError);
    });
});

describe("declaring it, refused", () => {
    const ready = async (me: AgentSender) => {
        routes["content"] = served(me.address);
        await getSkill(config(), me, ATOM);
    };

    it("stops when the sponsor sends no gas to register", async () => {
        const me = agent();
        await ready(me);
        routes["/mint-gas"] = () => Response.json({error: "daily limit"}, {status: 429});
        await expect(declareUsed(config(), me, ATOM)).rejects.toThrow("no gas to register (429): daily limit");
    });

    it("stops when register() emitted no Registered event for this agent", async () => {
        const me = agent("foreign");
        await ready(me);
        await expect(declareUsed(config(), me, ATOM)).rejects.toThrow("register() in 0x05 emitted no Registered event for this agent");
    });

    it("stops when the identity could not be made", async () => {
        const me = agent();
        await ready(me);
        routes["/identity"] = () => Response.json({error: "no budget"}, {status: 503});
        await expect(declareUsed(config(), me, ATOM)).rejects.toThrow("the identity could not be created (503): no budget");
    });

    it("waits for the indexer to see a new identity, and gives up at the deadline", async () => {
        const me = agent();
        await ready(me);
        let asked = 0;
        routes["/deposit"] = () => {
            asked += 1;
            return asked === 1 ? Response.json({error: "agent 7 has no identity atom on the graph"}, {status: 403}) : Response.json({sent: "0x03", created: "0x04"});
        };
        const waits: number[] = [];
        expect(await declareUsed(config({sleep: async (ms) => void waits.push(ms)}), me, ATOM)).toEqual({skill: "thumbs", created: true, sent: "0x03"});
        expect(waits).toEqual([5_000]);

        routes["/deposit"] = () => Response.json({error: "agent 7 has no identity atom on the graph"}, {status: 403});
        await expect(declareUsed(config({indexerWaitMs: 0}), me, ATOM)).rejects.toThrow("the sponsor refused (403): agent 7 has no identity atom on the graph");
    });

    it("approves once, and stops when the sponsor sends no gas for it", async () => {
        const me = agent();
        await ready(me);
        routes["/deposit"] = () => Response.json({error: "not approved", approve: {}}, {status: 409});
        routes["/gas"] = () => Response.json({error: "empty"}, {status: 500});
        await expect(declareUsed(config(), me, ATOM)).rejects.toThrow("no gas for the approval (500): empty");
    });

    it("asks for the approval once only, and passes on the second refusal", async () => {
        const me = agent();
        await ready(me);
        routes["/deposit"] = () => Response.json({error: "not approved", approve: {}}, {status: 409});
        await expect(declareUsed(config(), me, ATOM)).rejects.toThrow("the sponsor refused (409): not approved");
    });

    it("names the sponsoring service and its setting when it does not answer", async () => {
        const me = agent();
        await ready(me);
        routes["/mint-gas"] = () => {
            throw new TypeError("fetch failed");
        };
        await expect(declareUsed(config(), me, ATOM)).rejects.toThrow("ARP's sponsoring service did not answer at http://sponsor.test. Is it running? Its address is set by ARP_SPONSOR.");
    });
});
