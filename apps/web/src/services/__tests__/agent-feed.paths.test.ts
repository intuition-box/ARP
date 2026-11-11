import {describe, expect, it, vi} from "vitest";
import type {ActivityEvent as AgentEvent, DecodedCall} from "@arp-protocol/core";
import type {Hex} from "viem";

import {ActivityLog} from "../activity-log";
import {
    AgentFeed,
    agentsByWallet,
    entryFor,
    namesOf,
    timelineRows,
    traceInvocations,
    type EventSourceLike,
    type ReadReceipt,
    type TermName,
} from "../agent-feed";

const AGENT: Hex = `0x${"a".repeat(64)}`;
const USES: Hex = `0x${"b".repeat(64)}`;
const SKILL: Hex = `0x${"c".repeat(64)}`;
const SECOND: Hex = `0x${"e".repeat(64)}`;
const TRIPLE: Hex = `0x${"d".repeat(64)}`;
const HASH: Hex = `0x${"1".repeat(64)}`;
const WALLET: Hex = "0xB86F5f4E338eCEEC5DD095f48acF764465587FCF";

const session = (over: Partial<Extract<AgentEvent, {source: "session"}>> = {}): AgentEvent => ({
    source: "session",
    at: "2026-10-30T13:10:00Z",
    session: "s",
    call: "c1",
    kind: "skill",
    name: "brainstorming",
    ref: SKILL,
    outcome: "ok",
    ms: 5,
    ...over,
});
const sent = (
    decoded: DecodedCall,
    over: Partial<Extract<AgentEvent, {source: "sent"}>> = {},
): AgentEvent => ({
    source: "sent",
    at: "2026-10-30T13:11:00Z",
    chainId: 13579,
    status: "success",
    hash: HASH,
    signer: WALLET,
    to: null,
    value: "1",
    gasUsed: null,
    kind: "call-kind",
    why: "why",
    decoded,
    ...over,
});
const receipt = (over: Partial<Extract<AgentEvent, {source: "receipt"}>> = {}): AgentEvent => ({
    source: "receipt",
    at: "2026-10-30T11:00:00Z",
    name: "brainstorming",
    url: null,
    atom: SKILL,
    signer: "0x76dc846361405D145cf899dAE3512225EC8A5111",
    to: WALLET,
    ...over,
});
const triples = (objects: Hex[]): DecodedCall => ({
    fn: "createTriples",
    subjects: objects.map(() => AGENT),
    predicates: objects.map(() => USES),
    objects,
});
const noNames = new Map<string, string>();

describe("entryFor, one line per kind of call", () => {
    it("names each decoded call by what it does", () => {
        const label = (decoded: DecodedCall) => {
            const entry = entryFor(sent(decoded), noNames);
            return [entry.label, entry.detail];
        };
        expect(label(triples([]))).toEqual(["uses", undefined]);
        expect(label(triples([SKILL, SECOND, SECOND]))).toEqual(["uses", "→ 0xcccccccc… +2"]);
        expect(label({fn: "createAtoms", count: 3})).toEqual(["listed", "3"]);
        expect(label({fn: "redeem", termId: TRIPLE})).toEqual(["withdraw", "0xdddddddd…"]);
        expect(label({fn: "other", selector: "0x12345678"})).toEqual(["call", "0x12345678"]);
        expect(label({fn: "other", selector: null})).toEqual(["call", undefined]);
    });

    it("a reverted send is refused and a confirmed create-triple is a declaration", () => {
        expect(entryFor(sent(triples([SKILL]), {status: "reverted"}), noNames).step).toBe(
            "refused",
        );
        expect(entryFor(sent(triples([SKILL])), noNames).step).toBe("declaration");
    });

    it("a failed invocation is refused and says how it failed, how long it took and on what", () => {
        const entry = entryFor(session({outcome: "timeout", ms: 12}), noNames);
        expect(entry.step).toBe("refused");
        expect(entry.detail).toBe("skill · timeout · 12ms · 0xcccccccc…");
    });

    it("an invocation with no outcome, duration or ref is only its kind", () => {
        const entry = entryFor(session({outcome: null, ms: null, ref: null}), noNames);
        expect(entry.step).toBe("invocation");
        expect(entry.detail).toBe("skill");
    });

    it("a receipt names its signer and its atom when it has them, and an unreadable date is no date", () => {
        expect(entryFor(receipt(), noNames).detail).toBe("signed 0x76dc8463… · id 0xcccccccc…");
        const bare = entryFor(receipt({signer: null, atom: null, at: "not a date"}), noNames);
        expect(bare.detail).toBe("");
        expect(bare).not.toHaveProperty("at");
    });

    it("an invocation with no session and no call id is keyed by its time and name", () => {
        const entry = entryFor(session({session: null, call: null}), noNames);
        expect(entry.key).toBe("agent:session::2026-10-30T13:10:00Z:brainstorming");
    });
});

describe("namesOf", () => {
    it("learns a name from a receipt's atom as well as from an invocation's ref", () => {
        const names = namesOf([receipt({atom: SECOND, name: "served"}), session({ref: null})]);
        expect(names.get(SECOND)).toBe("served");
        expect(names.size).toBe(1);
    });
});

describe("AgentFeed, the states a reader can see", () => {
    function setup(readReceipt: ReadReceipt, log = new ActivityLog()) {
        const source: EventSourceLike = {
            onopen: null,
            onmessage: null,
            onerror: null,
            close: () => undefined,
        };
        const feed = new AgentFeed(log, {url: "http://feed", open: () => source, readReceipt});
        return {log, source, feed};
    }
    const frame = (event: AgentEvent) => new MessageEvent("message", {data: JSON.stringify(event)});
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

    it("tells its subscribers of each change until they unsubscribe", () => {
        const {feed, source} = setup(async () => null);
        const listener = vi.fn();
        const unsubscribe = feed.subscribe(listener);
        feed.start();
        source.onopen?.(new Event("open"));
        const calls = listener.mock.calls.length;
        expect(calls).toBeGreaterThan(0);
        unsubscribe();
        source.onerror?.(new Event("error"));
        expect(feed.status()).toBe("offline");
        expect(listener).toHaveBeenCalledTimes(calls);
    });

    it("with no feed URL nothing connects", () => {
        const open = vi.fn();
        const feed = new AgentFeed(new ActivityLog(), {
            url: undefined,
            open,
            readReceipt: async () => null,
        });
        feed.start();
        expect(open).not.toHaveBeenCalled();
        expect(feed.status()).toBe("off");
    });

    it("a reverted receipt is logged as refused", async () => {
        const {feed, source, log} = setup(async () => ({
            status: "reverted",
            block: 9n,
            costWei: 3n,
        }));
        feed.start();
        source.onmessage?.(frame(sent(triples([SKILL]))));
        await settle();
        expect(log.all().find((entry) => entry.key === `agent:confirmed:${HASH}`)).toMatchObject({
            step: "refused",
            label: "reverted",
        });
    });

    it("a receipt the chain does not have yet logs nothing, and a log that already has an entry is not appended to twice", async () => {
        const log = new ActivityLog();
        const first = setup(async () => null, log);
        first.feed.start();
        first.source.onmessage?.(frame(sent(triples([SKILL]))));
        await settle();
        expect(log.all()).toHaveLength(1);

        const second = setup(async () => null, log);
        second.feed.start();
        second.source.onmessage?.(frame(sent(triples([SKILL]))));
        await settle();
        expect(second.feed.all()).toHaveLength(1);
        expect(log.all()).toHaveLength(1);
    });
});

describe("traceInvocations, what is left unjoined", () => {
    const tripleIdOf = () => undefined;

    it("an invocation with no ref is keyed by name, counts its failures and keeps its latest time", () => {
        const rows = traceInvocations(
            [
                session({ref: null, at: "2026-10-30T10:00:00Z"}),
                session({ref: null, at: "2026-10-30T12:00:00Z", outcome: "timeout"}),
                session({ref: null, at: "2026-10-30T11:00:00Z"}),
            ],
            tripleIdOf,
        );
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({calls: 3, failed: 1, lastAt: "2026-10-30T12:00:00Z"});
        expect(rows[0]?.declaration).toBeNull();
    });

    it("a declaration of another object, a deposit, and a triple id the chain did not compute leave no stake", () => {
        const rows = traceInvocations(
            [
                session(),
                sent(triples([SECOND])),
                sent({fn: "deposit", receiver: WALLET, termId: TRIPLE, curveId: "1"}),
                sent(triples([SKILL])),
            ],
            tripleIdOf,
        );
        expect(rows[0]?.declaration?.object).toBe(SKILL);
        expect(rows[0]?.stakes).toEqual([]);
    });
});

describe("timelineRows, the less common rows", () => {
    const names = new Map<string, TermName>([
        [AGENT.toLowerCase(), {kind: "atom", label: "Agent 13579:8"}],
        [
            TRIPLE.toLowerCase(),
            {kind: "triple", subject: "Agent", predicate: "uses", object: "git"},
        ],
    ]);
    const context = {chainId: 13579, names, tripleIdOf: () => undefined};

    it("with no transaction the feed's agent is the receipt's requester, or 'this agent'", () => {
        const rows = timelineRows([receipt({signer: null}), session()], context);
        expect(rows[0]?.who).toBe("0xB86F5f4E…");
        expect(rows[1]?.who).toBe("content server");
        expect(timelineRows([session({outcome: "tool_error"})], context)[0]).toMatchObject({
            who: "this agent",
            off: "invoked skill brainstorming · tool_error",
        });
    });

    it("says what each kind of transaction did, on chain", () => {
        const on = (event: AgentEvent) => timelineRows([event], context)[0]?.on;
        expect(on(sent(triples([])))).toBe("declares");
        expect(on(sent({fn: "deposit", receiver: WALLET, termId: TRIPLE, curveId: "1"}))).toBe(
            "supports uses → git",
        );
        expect(on(sent({fn: "deposit", receiver: WALLET, termId: SECOND, curveId: "1"}))).toBe(
            "supports 0xeeeeeeee…",
        );
        expect(on(sent({fn: "createAtoms", count: 1}))).toBe("call-kind");
        expect(on(sent(triples([SKILL]), {status: "dry", hash: null}))).toBe(
            "dry run · declares uses → 0xcccccccc…",
        );
        expect(on(sent(triples([SKILL]), {status: "reverted"}))).toBe(
            "reverted · declares uses → 0xcccccccc…",
        );
    });

    it("a transaction with no signer and no hash names nobody and links nothing", () => {
        const row = timelineRows([sent(triples([SKILL]), {signer: null, hash: null})], context)[0];
        expect(row).toMatchObject({who: "—", tx: null, off: null});
    });
});

describe("agentsByWallet, what it refuses to guess", () => {
    it("names no wallet that signed nothing, declared no subject, or declared from a triple", () => {
        const names = new Map<string, TermName>([
            [AGENT.toLowerCase(), {kind: "triple", subject: "a", predicate: "b", object: "c"}],
        ]);
        const wallets = agentsByWallet(
            [
                sent(triples([SKILL]), {signer: null}),
                sent({fn: "createTriples", subjects: [], predicates: [], objects: []}),
                sent(triples([SKILL])),
                sent({fn: "createAtoms", count: 1}),
            ],
            names,
        );
        expect(wallets.size).toBe(0);
    });
});
