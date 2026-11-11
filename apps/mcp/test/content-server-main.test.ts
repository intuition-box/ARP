import {chmodSync, mkdtempSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

/** The hosted content server's start: what refuses it, and what it listens with. The listener is replaced. */
const serveFetch = vi.hoisted(() => vi.fn(async (_options: unknown, _handler: unknown) => undefined));
vi.mock("@arp-protocol/core/node", async (original) => ({...(await original<typeof import("@arp-protocol/core/node")>()), serveFetch}));

const {contentServerConfig, main} = await import("../src/content-server.js");

/** A fixed test key, never funded: Hardhat's account 0, public knowledge. */
const KEY = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function keyFile(mode = 0o600): string {
    const path = join(mkdtempSync(join(tmpdir(), "arp-content-main-")), "receipt.key");
    writeFileSync(path, KEY);
    chmodSync(path, mode);
    return path;
}

let printed: string[];
beforeEach(() => {
    printed = [];
    serveFetch.mockClear();
    vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
        printed.push(String(chunk));
        return true;
    });
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
        throw new Error(`exit ${String(code)}`);
    });
});
afterEach(() => vi.restoreAllMocks());

const base = (file: string) => ({ARP_TARGET: "testnet", ARP_PUBLIC_HOST: "content.example.org", ARP_RECEIPT_KEY_FILE: file});

describe("the content server's start", () => {
    it.each(["0", "70000", "x"])("refuses PORT=%s", (port) => {
        expect(contentServerConfig({...base("/k"), PORT: port})).toEqual({refused: `PORT must be a TCP port, not ${port}`});
    });

    it("takes a port and a host name in any case", () => {
        expect(contentServerConfig({...base("/k"), PORT: "8080", ARP_PUBLIC_HOST: " Content.Example.ORG "})).toEqual({host: "content.example.org", keyFile: "/k", port: 8080});
    });

    it("stops on a setting it refuses, saying which", async () => {
        await expect(main({ARP_TARGET: "mainnet"})).rejects.toThrow("exit 1");
        expect(printed.join("")).toContain("testnet 13579 only");
        expect(serveFetch).not.toHaveBeenCalled();
    });

    it("stops on a key file others can read, without printing the key", async () => {
        await expect(main(base(keyFile(0o644)))).rejects.toThrow("exit 1");
        expect(printed.join("")).not.toContain(KEY);
        expect(serveFetch).not.toHaveBeenCalled();
    });

    it("listens on loopback with a small body limit, and names its signer", async () => {
        await main(base(keyFile()));
        expect(serveFetch).toHaveBeenCalledWith({port: 3003, hostname: "127.0.0.1", maxBodyBytes: 1024}, expect.any(Function));
        expect(printed.join("")).toContain(`signed by ${ADDRESS}`);
        await main({...base(keyFile()), ARP_HOST: "0.0.0.0"});
        expect(serveFetch.mock.calls[1]?.[0]).toMatchObject({hostname: "0.0.0.0"});
    });

    it("answers through the handler it was started with", async () => {
        await main(base(keyFile()));
        const handler = serveFetch.mock.calls[0]?.[1] as unknown as (request: Request) => Promise<Response>; // the handler `main` passed
        const info = await handler(new Request("http://content.example.org/", {headers: {host: "content.example.org"}}));
        expect(await info.json()).toMatchObject({content: {signer: ADDRESS}});
    });
});
