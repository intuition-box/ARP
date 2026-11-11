import {describe, expect, it} from "vitest";

import {BUSY, CANCELLED, createSearchGate, positiveSetting, type SearchOutcome} from "../src/search-gate.js";

const never = new AbortController().signal;

function deferred() {
    let resolve: (outcome: SearchOutcome) => void = () => undefined;
    const promise = new Promise<SearchOutcome>((r) => (resolve = r));
    return {promise, resolve};
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("the search gate", () => {
    it("runs no more than maxRunning at once, and the next starts when one ends", async () => {
        const gate = createSearchGate({maxRunning: 2, maxWaiting: 10});
        const runs = [deferred(), deferred(), deferred()];
        let started = 0;
        const calls = runs.map((run, at) => gate.run(`q${at}`, () => (started++, run.promise), never, 60_000));
        await tick();
        expect(started).toBe(2);
        runs[0]?.resolve({output: "a"});
        await tick();
        expect(started).toBe(3);
        runs[1]?.resolve({output: "b"});
        runs[2]?.resolve({output: "c"});
        expect(await Promise.all(calls)).toEqual([{output: "a"}, {output: "b"}, {output: "c"}]);
    });

    it("refuses at once when the line is full, without starting anything", async () => {
        const gate = createSearchGate({maxRunning: 1, maxWaiting: 1});
        const run = deferred();
        let started = 0;
        const task = () => (started++, run.promise);
        const first = gate.run("a", task, never, 60_000);
        const second = gate.run("b", task, never, 60_000);
        expect(await gate.run("c", task, never, 60_000)).toEqual({error: BUSY});
        run.resolve({output: "x"});
        await Promise.all([first, second]);
        expect(started).toBe(2);
    });

    it("lets a caller leave the line when its signal aborts", async () => {
        const gate = createSearchGate({maxRunning: 1, maxWaiting: 5});
        const run = deferred();
        const first = gate.run("a", () => run.promise, never, 60_000);
        const leave = new AbortController();
        let started = false;
        const waiting = gate.run("b", () => ((started = true), Promise.resolve({output: "b"})), leave.signal, 60_000);
        leave.abort();
        expect(await waiting).toEqual({error: CANCELLED});
        run.resolve({output: "a"});
        await first;
        expect(started).toBe(false);
    });

    it("runs one phrase once while it runs, and forgets it as soon as it answers", async () => {
        const gate = createSearchGate({maxRunning: 4, maxWaiting: 4});
        let started = 0;
        const run = deferred();
        const task = () => (started++, run.promise);
        const both = Promise.all([gate.run("video", task, never, 60_000), gate.run("video", task, never, 60_000)]);
        run.resolve({output: "v"});
        expect(await both).toEqual([{output: "v"}, {output: "v"}]);
        expect(started).toBe(1);
        // No answer is kept: the key is the words searched (ADR 0161, ADR 0195).
        expect(await gate.run("video", () => (started++, Promise.resolve({output: "again"})), never, 60_000)).toEqual({output: "again"});
        expect(started).toBe(2);
    });
});

describe("a run two callers share", () => {
    it("keeps running for the second caller when the first leaves", async () => {
        const gate = createSearchGate({maxRunning: 1, maxWaiting: 1});
        const run = deferred();
        const seen: AbortSignal[] = [];
        const first = new AbortController();
        const a = gate.run("video", (stop) => (seen.push(stop), run.promise), first.signal, 60_000);
        const b = gate.run("video", () => Promise.resolve({output: "never"}), never, 60_000);
        first.abort();
        expect(await a).toEqual({error: CANCELLED});
        expect(seen[0]?.aborted).toBe(false);
        run.resolve({output: "v"});
        expect(await b).toEqual({output: "v"});
    });

    it("stops the run when every caller has left, and the next caller starts a fresh one", async () => {
        const gate = createSearchGate({maxRunning: 1, maxWaiting: 1});
        const seen: AbortSignal[] = [];
        const one = new AbortController();
        const two = new AbortController();
        // Like runSearch, it ends when its signal aborts, which is what frees the slot.
        const hang = (stop: AbortSignal) =>
            new Promise<{error: string}>((resolve) => stop.addEventListener("abort", () => resolve({error: "killed"})));
        const a = gate.run("video", (stop) => (seen.push(stop), hang(stop)), one.signal, 60_000);
        const b = gate.run("video", hang, two.signal, 60_000);
        await tick();
        one.abort();
        two.abort();
        expect(await Promise.all([a, b])).toEqual([{error: CANCELLED}, {error: CANCELLED}]);
        expect(seen[0]?.aborted).toBe(true);
        expect(await gate.run("video", () => Promise.resolve({output: "fresh"}), never, 60_000)).toEqual({output: "fresh"});
    });
});

describe("a wait in line", () => {
    it("starts nothing when every caller left before its turn came", async () => {
        const gate = createSearchGate({maxRunning: 1, maxWaiting: 1});
        const leave = new AbortController();
        let started = false;
        const a = gate.run("a", () => ((started = true), Promise.resolve({output: "a"})), leave.signal, 60_000);
        leave.abort();
        expect(await a).toEqual({error: CANCELLED});
        await tick();
        expect(started).toBe(false);
        expect(await gate.run("b", () => Promise.resolve({output: "b"}), never, 60_000)).toEqual({output: "b"});
    });

    it("ends at waitMs with BUSY, and starts nothing", async () => {
        const gate = createSearchGate({maxRunning: 1, maxWaiting: 1});
        const run = deferred();
        const first = gate.run("a", () => run.promise, never, 60_000);
        let started = false;
        expect(await gate.run("b", () => ((started = true), Promise.resolve({output: "b"})), never, 5)).toEqual({error: BUSY});
        run.resolve({output: "a"});
        await first;
        expect(started).toBe(false);
    });
});

describe("a positive setting", () => {
    it("takes a positive whole number and falls back on anything else", () => {
        expect(positiveSetting("8", 4)).toBe(8);
        for (const raw of [undefined, "", "0", "-1", "2.5", "many"]) expect(positiveSetting(raw, 4)).toBe(4);
    });
});
