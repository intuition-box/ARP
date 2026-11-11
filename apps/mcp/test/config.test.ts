import {mkdirSync, mkdtempSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {getAddress} from "viem";

/**
 * `config.ts` reads the environment once, at load, and stops the process on a setting it cannot
 * serve. Each case loads it fresh under its own environment, with `process.exit` turned into a throw.
 */
const KEYS = [
    "ARP_TARGET", "ARP_HOSTED", "ARP_PUBLIC_HOST", "ARP_TOOLS", "ARP_NO_RECEIPTS", "ARP_HOME", "ARP_RECEIPT_KEY",
    "INTUITION_GRAPHQL_URL", "INTUITION_RPC_URL", "ARP_MULTI_VAULT", "ARP_SKILLS_INDEX_URL", "ARP_DOMAIN_ATTESTOR",
    "ARP_ACCEPTED_SIGNERS", "ARP_SKILLS_DIR", "ARP_PROJECT_DIR",
] as const;
const saved = new Map(KEYS.map((key) => [key, process.env[key]]));
let errors: string[];

async function load(env: Partial<Record<(typeof KEYS)[number], string>>) {
    for (const key of KEYS) delete process.env[key];
    Object.assign(process.env, {ARP_NO_RECEIPTS: "1", ARP_TARGET: "testnet", ...env});
    vi.resetModules();
    return import("../src/config.js");
}

beforeEach(() => {
    errors = [];
    vi.spyOn(console, "error").mockImplementation((line: unknown) => {
        errors.push(String(line));
    });
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
        throw new Error(`exit ${String(code)}`);
    });
});
afterEach(() => {
    vi.restoreAllMocks();
    for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

describe("what stops the server at load", () => {
    it("a hosted setting it refuses, before any key is made", async () => {
        await expect(load({ARP_PUBLIC_HOST: "mcp.example.org"})).rejects.toThrow("exit 1");
        expect(errors[0]).toContain("ARP_PUBLIC_HOST needs ARP_HOSTED=1");
    });

    it("an unknown target", async () => {
        await expect(load({ARP_TARGET: "devnet"})).rejects.toThrow("exit 1");
        expect(errors[0]).toBe("ARP_TARGET must be one of mainnet, testnet");
    });

    it("a deployment value set to nothing", async () => {
        await expect(load({INTUITION_GRAPHQL_URL: ""})).rejects.toThrow("exit 1");
        expect(errors[0]).toBe("data/deployments/13579.json is missing a graphqlUrl");
    });

    it("a receipt key left where an older version kept it", async () => {
        const cwd = process.cwd();
        const dir = mkdtempSync(join(tmpdir(), "arp-config-legacy-"));
        mkdirSync(join(dir, ".arp"));
        writeFileSync(join(dir, ".arp", "receipt-key"), `0x${"12".repeat(32)}\n`, {mode: 0o600});
        process.chdir(dir);
        try {
            await expect(load({ARP_NO_RECEIPTS: "", ARP_HOME: join(dir, "home")})).rejects.toThrow("exit 1");
        } finally {
            process.chdir(cwd);
        }
        expect(errors.join("\n")).toContain("receipt-key");
    });
});

describe("what it reads", () => {
    it("defaults to mainnet's record, ARP's attestors and skills.sh", async () => {
        const mainnet = await load({ARP_TARGET: "mainnet"});
        expect(mainnet.chainId).toBe(1155);
        expect(mainnet.sessionCatalogue).toEqual([]);
        expect(mainnet.SKILLS_INDEX).toBe("https://skills.sh");
        expect(mainnet.DOMAIN_ATTESTORS?.length).toBeGreaterThan(0);
        expect(mainnet.HOSTED).toBe(false);
        expect(mainnet.RECEIPT_SIGNER).toBeNull();
    });

    it("reads skills.sh elsewhere, or not at all", async () => {
        expect((await load({ARP_SKILLS_INDEX_URL: " https://index.test "})).SKILLS_INDEX).toBe("https://index.test");
        expect((await load({ARP_SKILLS_INDEX_URL: "off"})).SKILLS_INDEX).toBeNull();
    });

    it("takes the signers a reader accepts from the environment, valid addresses only, once", async () => {
        const config = await load({ARP_ACCEPTED_SIGNERS: ` 0x${"ab".repeat(20)}, nope ,`});
        expect(config.acceptedSigners()).toEqual([`0x${"ab".repeat(20)}`]);
        process.env["ARP_ACCEPTED_SIGNERS"] = "";
        expect(config.acceptedSigners()).toEqual([`0x${"ab".repeat(20)}`]);
    });

    it("resolves a path against the project the launcher names", async () => {
        const config = await load({ARP_SKILLS_DIR: ".claude/skills", ARP_PROJECT_DIR: "/work/project"});
        expect(config.SKILLS_DIR).toBe("/work/project/.claude/skills");
        expect(config.inProject("x", "/p")).toBe("/p/x");
        expect((await load({})).SKILLS_DIR).toBeUndefined();
    });

    it("names the sponsor's wallets and the predicate nested claims use, from the record", async () => {
        const config = await load({});
        expect(config.LINE_PAYERS.length).toBeGreaterThan(0);
        expect(new Set(config.LINE_PAYERS).size).toBe(config.LINE_PAYERS.length);
        expect(config.IN_CONTEXT_OF).toMatch(/^0x[0-9a-f]{64}$/);
        expect(config.domainWalk()).toMatchObject({root: "tool", graphqlUrl: config.GRAPHQL, attestor: config.DOMAIN_ATTESTORS});
        expect((await load({ARP_TARGET: "mainnet"})).IN_CONTEXT_OF).toBe(`0x${"0".repeat(64)}`);
    });

    it("serves hosted with no receipt key at all", async () => {
        const config = await load({ARP_HOSTED: "1", ARP_TOOLS: "read", ARP_PUBLIC_HOST: "mcp.example.org", ARP_NO_RECEIPTS: ""});
        expect(config.HOSTED).toBe(true);
        expect(config.RECEIPT_SIGNER).toBeNull();
        expect(config.READ_ONLY).toBe(true);
    });
});

describe("whose index the domain search reads", () => {
    const lower = `0x${"ab".repeat(20)}`;

    it("checksums a lower-case address, which the indexer would otherwise match against nothing", async () => {
        const upper = `0x${"AB".repeat(20)}`;
        const config = await load({ARP_DOMAIN_ATTESTOR: `${lower}, ${upper}`});
        expect(config.DOMAIN_ATTESTORS).toEqual([getAddress(lower), getAddress(lower)]);
        expect(config.DOMAIN_ATTESTORS?.[0]).not.toBe(lower);
    });

    it("keeps a mixed-case address as given", async () => {
        const mixed = "0xC165A2AD2E540A4069E02834009161E2b4490d5A";
        expect((await load({ARP_DOMAIN_ATTESTOR: mixed})).DOMAIN_ATTESTORS).toEqual([mixed]);
    });

    it.each([
        ["", undefined, null],
        [" , ", undefined, null],
        ["0x12", undefined, "is not a 0x address"],
        [`${lower},nope`, undefined, "is not a 0x address"],
    ])("disables the domain search for %j", async (raw, expected, said) => {
        expect((await load({ARP_DOMAIN_ATTESTOR: raw})).DOMAIN_ATTESTORS).toBe(expected);
        if (said === null) expect(errors).toEqual([]);
        else expect(errors.join("\n")).toContain(said);
    });
});
