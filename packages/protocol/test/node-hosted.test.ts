import {afterEach, describe, expect, it, vi} from "vitest";

import {every, hostedListener, refuseOtherHost} from "../src/node/index.js";

describe("hostedListener", () => {
    it("listens on loopback and answers loopback names by default", () => {
        expect(hostedListener("API", 8787, undefined, undefined)).toEqual({
            hostname: "127.0.0.1",
            hosts: ["127.0.0.1:8787", "localhost:8787", "[::1]:8787"],
        });
    });

    it("adds the public name when it listens on every interface", () => {
        const listener = hostedListener("API", 8787, "0.0.0.0", "API.arp.example.org");
        expect(listener).toEqual({
            hostname: "0.0.0.0",
            hosts: ["127.0.0.1:8787", "localhost:8787", "[::1]:8787", "api.arp.example.org"],
        });
    });

    it("refuses every interface without a public name, and a name with a scheme or port", () => {
        expect(hostedListener("API", 1, "0.0.0.0", "")).toHaveProperty("error");
        expect(hostedListener("API", 1, "0.0.0.0", "https://api.example.org")).toHaveProperty("error");
        expect(hostedListener("API", 1, "0.0.0.0", "api.example.org:443")).toHaveProperty("error");
        expect(hostedListener("API", 1, "127.0.0.1", "api.example.org")).toHaveProperty("error");
        expect(hostedListener("PROBE", 1, "10.0.0.1", undefined)).toEqual({
            error: "PROBE_LISTEN must be 127.0.0.1 or 0.0.0.0, not 10.0.0.1",
        });
    });
});

describe("refuseOtherHost", () => {
    // Node's `Request` drops a `Host` header it is given; Bun.serve's carries the one that arrived.
    const asked = (host: string) => ({headers: new Headers({host})});
    const hosts = ["127.0.0.1:8787", "api.arp.example.org"];
    it("lets its own names through, whatever their case", () => {
        expect(refuseOtherHost(asked("API.arp.example.org"), hosts)).toBeNull();
        expect(refuseOtherHost(asked("127.0.0.1:8787"), hosts)).toBeNull();
    });

    it("answers 421 to any other Host", async () => {
        const refused = refuseOtherHost(asked("evil.example"), hosts);
        expect(refused?.status).toBe(421);
        expect(await refused?.json()).toEqual({error: "this service answers to its own host only"});
    });
});

describe("every", () => {
    afterEach(() => vi.useRealTimers());

    it("runs one at a time: a tick while a run is in flight is skipped, not queued", async () => {
        let release: () => void = () => {};
        let runs = 0;
        const schedule = every(
            60_000,
            () =>
                new Promise<void>((done) => {
                    runs += 1;
                    release = done;
                }),
            {runOnStart: false, onError: () => {}},
        );
        const first = schedule.tick();
        expect(await schedule.tick()).toBe(false);
        expect(runs).toBe(1);
        release();
        expect(await first).toBe(true);
        const second = schedule.tick();
        release();
        expect(await second).toBe(true);
        expect(runs).toBe(2);
        schedule.stop();
    });

    it("fires on its period, on start when asked, and survives a run that throws", async () => {
        vi.useFakeTimers();
        const errors: unknown[] = [];
        let runs = 0;
        const schedule = every(
            1_000,
            async () => {
                runs += 1;
                if (runs === 1) throw new Error("upstream down");
            },
            {runOnStart: true, onError: (error) => errors.push(error)},
        );
        await vi.advanceTimersByTimeAsync(0);
        expect(runs).toBe(1);
        await vi.advanceTimersByTimeAsync(3_000);
        expect(runs).toBe(4);
        expect(errors).toHaveLength(1);
        schedule.stop();
        await vi.advanceTimersByTimeAsync(5_000);
        expect(runs).toBe(4);
    });
});
