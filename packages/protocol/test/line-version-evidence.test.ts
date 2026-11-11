import {PULSE_QUALIFIERS_QUERY, PULSE_VERSIONED_USES_QUERY, type GraphqlTransport} from "@arp-protocol/graphql";
import {decodeFunctionData, keccak256, sha256, stringToBytes, type Hex} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {describe, expect, it} from "vitest";

import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {bundleManifest} from "../src/content-bundle.js";
import {multiVaultDeclareAbi} from "../src/declare/multivault.js";
import {skillDirectoryDigest} from "../src/node/skill-directory.js";
import {prepareUsageContext} from "../src/declare/usage-context.js";
import {planVersionedUse} from "../src/declare/versioned-use.js";
import {checkReceiptEvidence, contentReceiptHash, receiptEvidenceLabel, receiptHashOfEvidenceLabel} from "../src/line-evidence.js";
import {parseLocalOutcomes} from "../src/local-outcomes.js";
import {getPulseUsage, usageOnVersion} from "../src/pulse-usage.js";
import {signContentReceipt, type ContentReceipt} from "../src/receipt.js";
import {decideShare, sharedLineKey} from "../src/share-failures.js";
import {digestOfVersionLabel, manifestOfHashes, versionAtomLabel} from "../src/skill-version.js";
import {HAS_TYPE, MCP_SERVER_TYPE, SKILL_TYPE, VERSION} from "../src/sources/intuition/terms.js";
import {planToolListing, subjectTypeOf} from "../src/sponsor/list-tool.js";
import {signLineRequest, verifyLineRequest, type LineRequest} from "../src/sponsor/line.js";
import {atomIdFor, fakeReads} from "./helpers.js";

// Fixed test keys, generated for nothing and holding nothing.
const AGENT = privateKeyToAccount(`0x${"68".repeat(32)}`);
const NODE = privateKeyToAccount(`0x${"69".repeat(32)}`);
const STRANGER = privateKeyToAccount(`0x${"6a".repeat(32)}`);
const NOW = 1_800_000_000;
const TOOL = `0x${"77".repeat(32)}` as Hex;
const DIGEST = `0x${"d1".repeat(32)}`;
const OTHER_DIGEST = `0x${"d2".repeat(32)}`;

const receipt = (over: Partial<ContentReceipt> = {}): ContentReceipt => ({
    atom: TOOL,
    url: "https://github.com/acme/skills?skill=pdf",
    path: "skills/pdf",
    digest: DIGEST as Hex,
    to: AGENT.address,
    servedAt: NOW - 60,
    nonce: keccak256(stringToBytes("r")),
    commit: "a".repeat(40),
    ...over,
});

const request = (over: Partial<LineRequest> = {}): LineRequest => ({
    agent: AGENT.address,
    agentRegistry: `eip155:13579:0x${"11".repeat(20)}`,
    agentId: "9",
    tool: TOOL,
    domain: "",
    outcome: "worked",
    reason: "",
    payment: "",
    endpoint: "",
    need: "",
    payTo: "",
    asset: "",
    price: "",
    termsAt: 0,
    version: DIGEST,
    evidence: "",
    nonce: keccak256(stringToBytes("n")),
    expiresAt: NOW + 600,
    ...over,
});

describe("a version's atom (ADR 0192)", () => {
    it("names the hash function and reads back", () => {
        expect(versionAtomLabel(DIGEST)).toBe(`sha256:${"d1".repeat(32)}`);
        expect(digestOfVersionLabel(versionAtomLabel(DIGEST))).toBe(DIGEST);
        expect(digestOfVersionLabel("1.0.0")).toBeNull();
        expect(() => versionAtomLabel("0xABC")).toThrow();
    });

    it("is ADR 0185's digest: the manifest the hook writes is bundleManifest's", () => {
        const files = [
            {path: "scripts/b.py", bytes: stringToBytes("print(1)")},
            {path: "SKILL.md", bytes: stringToBytes("# pdf")},
        ];
        const hashed = files.map((file) => ({path: file.path, sha256: sha256(file.bytes).slice(2)}));
        expect(manifestOfHashes(hashed)).toBe(bundleManifest(files));
    });

    it("is the same digest computed where the skill is installed, and none for an empty directory", () => {
        const dir = mkdtempSync(join(tmpdir(), "arp-skill-"));
        try {
            mkdirSync(join(dir, "scripts"));
            writeFileSync(join(dir, "SKILL.md"), "# pdf");
            writeFileSync(join(dir, "scripts", "b.py"), "print(1)");
            const files = [
                {path: "SKILL.md", bytes: stringToBytes("# pdf")},
                {path: "scripts/b.py", bytes: stringToBytes("print(1)")},
            ];
            expect(skillDirectoryDigest(dir)).toBe(sha256(stringToBytes(bundleManifest(files))));
            expect(skillDirectoryDigest(join(dir, "scripts", "absent"))).toBeNull();
        } finally {
            rmSync(dir, {recursive: true, force: true});
        }
    });
});

describe("the line request, version 6 (ADR 0192)", () => {
    it("signs the version and the evidence", async () => {
        const hash = contentReceiptHash(receipt(), 13579);
        const signed = await signLineRequest(request({evidence: hash}), 13579, AGENT);
        expect(await verifyLineRequest(signed, NOW)).toEqual({status: "valid", address: AGENT.address});
        for (const over of [{version: OTHER_DIGEST}, {evidence: `0x${"ee".repeat(32)}`}]) {
            expect((await verifyLineRequest({...signed, request: {...signed.request, ...over}}, NOW)).status).toBe("mismatch");
        }
    });

    it("refuses a version beside a payment, evidence without a version, and other shapes", async () => {
        const cases: Partial<LineRequest>[] = [
            {version: "0x1234"},
            {version: DIGEST.toUpperCase().replace("0X", "0x")},
            {version: "", evidence: `0x${"ee".repeat(32)}`},
            {evidence: "content-receipt:0x00"},
        ];
        for (const over of cases) {
            expect((await verifyLineRequest(await signLineRequest(request(over), 13579, AGENT), NOW)).status).toBe("malformed");
        }
    });

    it("no longer verifies a version 5 request, which signed no version", async () => {
        const {version: _v, evidence: _e, ...v5} = request({version: "", evidence: ""});
        expect(await verifyLineRequest({request: v5, chainId: 13579, signature: "0x00"}, NOW)).toMatchObject({status: "malformed"});
    });
});

describe("a content receipt as evidence (ADR 0192)", () => {
    const check = async (signedBy = NODE, over: Partial<ContentReceipt> = {}, line: Partial<{version: string; tool: Hex; chainId: number; hash: string}> = {}) => {
        const signed = await signContentReceipt(receipt(over), 13579, signedBy);
        return checkReceiptEvidence({
            signed,
            hash: line.hash ?? contentReceiptHash(signed.receipt, 13579),
            agent: AGENT.address,
            tool: line.tool ?? TOOL,
            version: line.version ?? DIGEST,
            chainId: line.chainId ?? 13579,
            accepted: [NODE.address],
        });
    };

    it("backs a line on the digest it was signed over, served to this agent by a node the reader accepts", async () => {
        expect(await check()).toMatchObject({status: "accepted", signer: NODE.address});
    });

    it("is refused on another digest: a receipt over other files is not evidence for this line", async () => {
        expect(await check(NODE, {}, {version: OTHER_DIGEST})).toMatchObject({status: "refused", reason: expect.stringContaining("digest")});
    });

    it("is refused for another caller, an unknown signer, another tool, another chain or another hash", async () => {
        expect(await check(NODE, {to: STRANGER.address})).toMatchObject({status: "refused", reason: expect.stringContaining("other-caller")});
        expect(await check(STRANGER)).toMatchObject({status: "refused", reason: expect.stringContaining("unknown-signer")});
        expect(await check(NODE, {}, {tool: `0x${"78".repeat(32)}` as Hex})).toMatchObject({status: "refused"});
        expect(await check(NODE, {}, {chainId: 1155})).toMatchObject({status: "refused"});
        expect(await check(NODE, {}, {hash: `0x${"ee".repeat(32)}`})).toMatchObject({status: "refused"});
        expect(await checkReceiptEvidence({signed: null, hash: "", agent: AGENT.address, tool: TOOL, version: DIGEST, chainId: 13579, accepted: []})).toMatchObject({status: "refused"});
    });

    it("names one receipt in its atom", () => {
        const hash = contentReceiptHash(receipt(), 13579);
        expect(receiptHashOfEvidenceLabel(receiptEvidenceLabel(hash))).toBe(hash);
        expect(receiptHashOfEvidenceLabel("paid with")).toBeNull();
    });
});

describe("planning a versioned line (ADR 0192)", () => {
    const reads = (existing: string[] = []) =>
        fakeReads({existing: new Set(existing.map((id) => id.toLowerCase())), chainId: 13579, atomCost: 10n, tripleCost: 20n, minDeposit: 1n});

    it("creates the digest atom and V = (skill, version, digest) when they are missing", async () => {
        const plan = await planVersionedUse({tool: TOOL, digest: DIGEST, reads: reads()});
        expect(plan.calls.map((call) => call.kind)).toEqual(["create-atom", "create-triple"]);
        expect(plan.digestAtomId).toBe(atomIdFor(versionAtomLabel(DIGEST)));
        const decoded = decodeFunctionData({abi: multiVaultDeclareAbi, data: plan.calls[1]?.data ?? "0x"});
        expect(decoded.args?.[0]).toEqual([TOOL]);
        expect(decoded.args?.[1]).toEqual([VERSION]);
        expect(decoded.args?.[2]).toEqual([plan.digestAtomId]);
    });

    it("creates nothing when the version is already on chain", async () => {
        const first = await planVersionedUse({tool: TOOL, digest: DIGEST, reads: reads()});
        const again = await planVersionedUse({tool: TOOL, digest: DIGEST, reads: reads([first.digestAtomId, first.versionTripleId])});
        expect(again.calls).toEqual([]);
        expect(again.versionTripleId).toBe(first.versionTripleId);
    });

    it("hangs the evidence on the outcome, as paid with is", async () => {
        const edge = `0x${"ab".repeat(32)}` as Hex;
        const label = receiptEvidenceLabel(contentReceiptHash(receipt(), 13579));
        const plan = await prepareUsageContext({
            usesTripleId: edge,
            outcome: "worked",
            evidence: label,
            inContextOf: `0x${"cd".repeat(32)}` as Hex,
            isCategory: async () => false,
            reads: reads([edge]),
        });
        if (plan.status !== "planned" || plan.outcomeTripleId === null || plan.evidenceTripleId === null) throw new Error("expected a plan");
        const last = plan.calls.at(-1);
        const decoded = decodeFunctionData({abi: multiVaultDeclareAbi, data: last?.data ?? "0x"});
        expect(decoded.args?.[0]).toEqual([plan.outcomeTripleId]);
        expect(decoded.args?.[1]).toEqual([atomIdFor("has evidence")]);
        expect(decoded.args?.[2]).toEqual([atomIdFor(label)]);
        expect(await prepareUsageContext({usesTripleId: edge, domain: "video", evidence: label, inContextOf: edge, isCategory: async () => true, reads: reads([edge])})).toMatchObject({
            status: "refused",
            rule: "evidence_without_outcome",
        });
    });
});

describe("the subject's type, written once when it is listed (ADR 0192)", () => {
    it("types a skill by its URL, an MCP endpoint by what it answered, and nothing else", () => {
        expect(subjectTypeOf("https://github.com/acme/skills?skill=pdf", null)).toBe(SKILL_TYPE);
        expect(subjectTypeOf("https://mcp.example.com/mcp", "mcp-endpoint")).toBe(MCP_SERVER_TYPE);
        expect(subjectTypeOf("https://github.com/acme/skills", "skill")).toBeNull();
        expect(subjectTypeOf("https://pay.example.com/api", "x402")).toBeNull();
    });

    it("plans (skill, has type, Skill) beside the listing, and again for a listed skill that has none", async () => {
        const url = "https://github.com/acme/skills?skill=pdf";
        const fresh = await planToolListing({url, reads: fakeReads({chainId: 13579})});
        const typed = fresh.calls.at(-1);
        const decoded = decodeFunctionData({abi: multiVaultDeclareAbi, data: typed?.data ?? "0x"});
        expect(decoded.args?.[1]).toEqual([HAS_TYPE]);
        expect(decoded.args?.[2]).toEqual([SKILL_TYPE]);
        expect(fresh.toolOnChain).toBe(false);

        const listed = new Set([fresh.atomId, fresh.repository?.atomId ?? "", fresh.repository?.sourceTripleId ?? ""].map((id) => id.toLowerCase()));
        const untyped = await planToolListing({url, reads: fakeReads({chainId: 13579, existing: listed})});
        expect(untyped.toolOnChain).toBe(true);
        expect(untyped.calls).toHaveLength(1);
        const done = await planToolListing({url, reads: fakeReads({chainId: 13579, existing: new Set([...listed, (untyped.type?.tripleId ?? "").toLowerCase()])})});
        expect(done.calls).toEqual([]);
    });
});

describe("reading versioned lines (ADR 0192)", () => {
    const SKILL = "0xaaa";
    const V1 = "0xv1";
    const V2 = "0xv2";
    const [CONTEXT, OUTCOME, BECAUSE] = ["0xc0", "0xd0", "0xe0"];
    const versioned = (id: string, v: string, digest: string, by: string) => ({
        term_id: id,
        object_id: v,
        creator_id: by,
        created_at: "2026-11-11T10:00:00Z",
        subject: {term_id: `agent-${by}`, label: by},
        object_term: {triple: {subject_id: SKILL, predicate_id: VERSION, object: {label: versionAtomLabel(digest)}}},
    });
    const plain = (id: string, by: string) => ({
        term_id: id,
        object_id: SKILL,
        creator_id: by,
        created_at: "2026-11-01T10:00:00Z",
        subject: {term_id: `agent-${by}`, label: by},
    });
    const worked = (edge: string, by: string) => ({term_id: `${edge}-w`, subject_id: edge, predicate_id: OUTCOME, creator_id: by, object: {label: "worked"}});
    const uses = [
        versioned("0x1", V1, DIGEST, "0xA"),
        versioned("0x2", V1, DIGEST, "0xB"),
        versioned("0x3", V2, OTHER_DIGEST, "0xC"),
        plain("0x4", "0xD"),
        // A `version` triple whose object is not a digest is no version, and its line is not about this skill.
        {...versioned("0x5", "0xv3", DIGEST, "0xE"), object_term: {triple: {subject_id: SKILL, predicate_id: VERSION, object: {label: "1.0.0"}}}},
    ];
    const qualifiers = ["0x1", "0x2", "0x3", "0x4", "0x5"].map((edge, at) => worked(edge, ["0xA", "0xB", "0xC", "0xD", "0xE"][at] ?? ""));
    const transport: GraphqlTransport = {
        request: async (query: string, variables?: unknown) => {
            if (query === PULSE_VERSIONED_USES_QUERY) return {triples: uses};
            if (query === PULSE_QUALIFIERS_QUERY) {
                const {edges} = variables as {edges: string[]}; // this query's own variables
                return {triples: qualifiers.filter((row) => edges.includes(row.subject_id))};
            }
            throw new Error("unexpected query");
        },
    };
    const read = async () =>
        (await getPulseUsage([SKILL], {graphqlUrl: "unused", inContextOf: CONTEXT, hasOutcome: OUTCOME, because: BECAUSE, version: VERSION, payers: [], transport})).get(SKILL);

    it("groups lines by version and rolls them up to the skill", async () => {
        const usage = await read();
        expect(usage?.declarations.map((row) => [row.tripleId, row.version ?? null])).toEqual([
            ["0x1", DIGEST],
            ["0x2", DIGEST],
            ["0x3", OTHER_DIGEST],
            ["0x4", null],
        ]);
        expect(usage?.wallets).toBe(4);
        expect(usage?.byOutcome).toEqual({worked: 4});
        expect(usage?.byVersion).toEqual({[DIGEST]: 2, [OTHER_DIGEST]: 1});
    });

    it("starts a new digest at zero, and keeps the earlier lines where they are", async () => {
        const usage = await read();
        if (usage === undefined) throw new Error("no usage");
        expect(usageOnVersion(usage, DIGEST)).toMatchObject({wallets: 2, byOutcome: {worked: 2}});
        const next = usageOnVersion(usage, `0x${"d3".repeat(32)}`);
        expect(next).toMatchObject({wallets: 0, declarations: [], byOutcome: {}});
        expect(usage.declarations).toHaveLength(4);
    });
});

describe("sharing a result on a version (ADR 0192)", () => {
    it("carries the version the hook recorded, and makes it a sentence of its own", () => {
        const decision = decideShare({
            on: true,
            failures: [],
            outcomes: [{at: "2026-11-11T10:00:00Z", session: "s", skill: "pdf", source: "acme/skills", outcome: "worked", version: DIGEST}],
            installed: [],
            alreadyShared: new Set(),
        });
        expect(decision.lines).toEqual([{toolUrl: "https://github.com/acme/skills?skill=pdf", outcome: "worked", version: DIGEST}]);
        const line = decision.lines[0];
        if (line === undefined) throw new Error("no line");
        const {version: _version, ...unversioned} = line;
        expect(sharedLineKey(line)).not.toBe(sharedLineKey(unversioned));
        const kept = parseLocalOutcomes(`${JSON.stringify({at: "a", session: "s", skill: "pdf", source: null, outcome: "worked", version: "1.0"})}\n`);
        expect(kept[0]?.version).toBeUndefined();
    });
});
