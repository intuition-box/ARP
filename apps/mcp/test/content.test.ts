import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {keccak256, stringToBytes, type Hex} from "viem";
import {privateKeyToAccount} from "viem/accounts";

import {contentRequestTypedData, verifyContentReceipt, type SignedContentReceipt} from "@arp-protocol/core";

/**
 * `GET /content/:atomId`, the transport half: GitHub's tree listing and the raw file are the
 * network, stubbed on `fetch`; the decisions run for real.
 */
const GRILL = "0x0f5d49c4219b44d36e737c57e82dc3ad8bdfcc2d7ee73ba9b75974a4b6935ea3";
const UNPINNED = "0xd006d48b6be455713a076af5fc34046233e51ce1f85a544b8eb9fe762b9ff975";
const COMMIT = "a496f5513d4a4cf889bc48e189e579f4b0bdf6aa";
const TREE = `https://api.github.com/repos/mattpocock/skills/git/trees/${COMMIT}?recursive=1`;
const RAW = `https://raw.githubusercontent.com/mattpocock/skills/${COMMIT}/`;
const CHAIN = 13579;
// Fixed test keys, holding nothing.
const NODE = privateKeyToAccount(`0x${"77".repeat(32)}`);
const AGENT = privateKeyToAccount(`0x${"88".repeat(32)}`);
const signer = {address: NODE.address, signTypedData: (data: Parameters<typeof NODE.signTypedData>[0]) => NODE.signTypedData(data)};

type Tree = {path: string; type: string; sha: string}[];
let tree: Tree | null;
let treeStatus: number;
let files: Record<string, string | number>;
let fetchMock: ReturnType<typeof vi.fn>;

/** The module fresh, so the listing cache of one case is not another's. */
async function load() {
    vi.resetModules();
    return import("../src/content.js");
}

beforeEach(() => {
    tree = [
        {path: "skills/grill-me", type: "tree", sha: "t"},
        {path: "skills/grill-me/SKILL.md", type: "blob", sha: "s1"},
        {path: "skills/grill-me/notes.md", type: "blob", sha: "s2"},
    ];
    treeStatus = 200;
    files = {"skills/grill-me/SKILL.md": "# grill me\n", "skills/grill-me/notes.md": "notes\n"};
    fetchMock = vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url === TREE) return treeStatus === 200 ? Response.json(tree === null ? {} : {tree}) : new Response("limit", {status: treeStatus});
        if (url.startsWith(RAW)) {
            const body = files[decodeURIComponent(url.slice(RAW.length))];
            if (body === undefined) return new Response("no", {status: 404});
            if (typeof body === "number") return new Response("x", {status: body});
            return new Response(body);
        }
        throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    delete process.env["GITHUB_TOKEN"];
});
afterEach(() => vi.unstubAllGlobals());

const serve = async (atom: string, query = "", withSigner = true) => {
    const {serveContentRequest} = await load();
    return serveContentRequest(atom, new URLSearchParams(query), CHAIN, withSigner ? signer : null);
};

describe("a SKILL.md served", () => {
    it("passes the bytes through, names where they came from and signs for the access", async () => {
        const response = await serve(GRILL.toUpperCase().replace("0X", "0x"));
        expect(response.status).toBe(200);
        expect(await response.text()).toBe("# grill me\n");
        expect(response.headers.get("x-arp-atom")).toBe(GRILL);
        expect(response.headers.get("x-arp-path")).toBe("skills/grill-me/SKILL.md");
        expect(response.headers.get("x-arp-commit")).toBe(COMMIT);
        expect(response.headers.get("content-disposition")).toBe("attachment");
        expect(response.headers.get("x-arp-also-at")).toBeNull();
        const receipt = JSON.parse(response.headers.get("x-arp-receipt") ?? "null") as SignedContentReceipt;
        expect(receipt.receipt.to).toBeNull();
        expect(await verifyContentReceipt(receipt)).toMatchObject({status: "valid", signer: NODE.address});
    });

    it("names the caller a signature proves, and nobody when the claimed address is not the signer", async () => {
        const nonce = keccak256(stringToBytes("n")) as Hex;
        const sig = await AGENT.signTypedData(contentRequestTypedData(GRILL, nonce, CHAIN));
        const named = await serve(GRILL, `nonce=${nonce}&by=${AGENT.address}&sig=${sig}`);
        const receipt = JSON.parse(named.headers.get("x-arp-receipt") ?? "null") as SignedContentReceipt;
        expect(receipt.receipt.to).toBe(AGENT.address);
        expect(receipt.receipt.nonce).toBe(nonce);
        const mismatch = await serve(GRILL, `nonce=${nonce}&by=${NODE.address}&sig=${sig}`);
        expect((JSON.parse(mismatch.headers.get("x-arp-receipt") ?? "null") as SignedContentReceipt).receipt.to).toBeNull();
        const garbled = await serve(GRILL, `nonce=nope&sig=zz`);
        expect((JSON.parse(garbled.headers.get("x-arp-receipt") ?? "null") as SignedContentReceipt).receipt.nonce).toBe(`0x${"00".repeat(32)}`);
    });

    it("signs nothing without a key, and says where identical copies also live", async () => {
        tree = [...(tree ?? []), {path: "other/grill-me/SKILL.md", type: "blob", sha: "s1"}];
        const response = await serve(GRILL, "", false);
        expect(response.status).toBe(200);
        expect(response.headers.get("x-arp-receipt")).toBeNull();
        expect(response.headers.get("x-arp-also-at")).toBe("other/grill-me/SKILL.md");
    });

    it("lists a repository once per commit, with the token when one is set", async () => {
        process.env["GITHUB_TOKEN"] = " ghp_test ";
        const {serveContentRequest} = await load();
        await serveContentRequest(GRILL, new URLSearchParams(), CHAIN, null);
        await serveContentRequest(GRILL, new URLSearchParams(), CHAIN, null);
        const listings = fetchMock.mock.calls.filter(([url]) => String(url) === TREE);
        expect(listings).toHaveLength(1);
        expect((listings[0]?.[1] as RequestInit).headers).toMatchObject({authorization: "Bearer ghp_test"});
    });
});

describe("a SKILL.md refused, each with its own status", () => {
    const refused = async (atom: string) => {
        const response = await serve(atom);
        return {status: response.status, body: (await response.json()) as {error: string; reason: string}};
    };

    it.each([
        ["0x12", 400, "bad-atom-id"],
        [`0x${"99".repeat(32)}`, 404, "unknown-atom"],
        [UNPINNED, 404, "unpinned"],
    ])("%s answers %i %s", async (atom, code, error) => {
        expect(await refused(atom)).toMatchObject({status: code, body: {error}});
    });

    it("says the file is absent at the pinned commit, and an empty tree is no tree", async () => {
        tree = null;
        expect(await refused(GRILL)).toMatchObject({status: 404, body: {error: "absent", reason: expect.stringContaining("grill-me/SKILL.md")}});
    });

    it("refuses two copies that differ, naming both", async () => {
        tree = [...(tree ?? []), {path: "other/grill-me/SKILL.md", type: "blob", sha: "s9"}];
        const {status, body} = await refused(GRILL);
        expect(status).toBe(409);
        expect(body.reason).toContain("skills/grill-me/SKILL.md, other/grill-me/SKILL.md");
    });

    it("passes on the origin's status, and its own failure to list as 502", async () => {
        files["skills/grill-me/SKILL.md"] = 503;
        expect(await refused(GRILL)).toMatchObject({status: 502, body: {error: "upstream", reason: "the origin answered HTTP 503"}});
        treeStatus = 403;
        expect(await refused(GRILL)).toMatchObject({status: 502, body: {error: "upstream", reason: expect.stringContaining("HTTP 403")}});
    });

    it("refuses a file over the cap", async () => {
        files["skills/grill-me/SKILL.md"] = "x".repeat(1_048_577);
        expect(await refused(GRILL)).toMatchObject({status: 413, body: {error: "too-large"}});
    });
});

describe("a skill's whole directory, ?bundle=1", () => {
    const bundle = async (withSigner = true) => serve(GRILL, "bundle=1", withSigner);

    it("serves every file in base64 with a receipt over the manifest", async () => {
        const response = await bundle();
        expect(response.status).toBe(200);
        const body = (await response.json()) as {path: string; manifest: string; files: {path: string; base64: string}[]};
        expect(body.path).toBe("skills/grill-me");
        expect(body.files.map((file) => [file.path, Buffer.from(file.base64, "base64").toString()])).toEqual([
            ["SKILL.md", "# grill me\n"],
            ["notes.md", "notes\n"],
        ]);
        expect(response.headers.get("x-arp-commit")).toBe(COMMIT);
        expect(response.headers.get("x-arp-receipt")).not.toBeNull();
    });

    it("signs nothing without a key", async () => {
        expect((await bundle(false)).headers.get("x-arp-receipt")).toBeNull();
    });

    it("refuses a directory with too many files", async () => {
        tree = [...(tree ?? []), ...Array.from({length: 300}, (_, n) => ({path: `skills/grill-me/f${n}.md`, type: "blob", sha: `x${n}`}))];
        const response = await bundle();
        expect(response.status).toBe(413);
        expect(((await response.json()) as {reason: string}).reason).toMatch(/files, over the 300 file cap$/);
    });

    it("answers 502 when the listing cannot be read", async () => {
        treeStatus = 500;
        expect((await bundle()).status).toBe(502);
    });
});

describe("the catalogue and the pins", () => {
    it("are per chain: a chain with no record knows no skill and pins nothing", async () => {
        const {catalogueFor, contentIndexFor, pinFor} = await load();
        expect(catalogueFor(1155)).toEqual([]);
        expect(catalogueFor(13579)).toBe(catalogueFor(13579));
        expect(contentIndexFor(13579).get(GRILL)).toBe("https://github.com/mattpocock/skills?skill=grill-me");
        expect(contentIndexFor(13579)).toBe(contentIndexFor(13579));
        expect(pinFor(1155)("mattpocock/skills")).toBeNull();
        expect(pinFor(13579)("mattpocock/skills")).toBe(COMMIT);
        expect(pinFor(13579)("nobody/nothing")).toBeNull();
    });
});
