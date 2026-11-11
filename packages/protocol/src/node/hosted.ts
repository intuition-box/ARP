/**
 * Where a hosted read-only service listens, which `Host` it answers, and how often it does its work
 * (task 140, ADR `0200`): `apps/api` and `apps/probe`, which ran as Cloudflare Workers until then.
 *
 * Run on one machine a service listens on 127.0.0.1 and answers its loopback names only. In a
 * container it listens on every interface and answers one more name, its public one, the `Host`
 * the proxy in front of it forwards — the rule `apps/sponsor/src/listen.ts` applies to the sponsor.
 */
import {loopbackHosts} from "./local-state.js";

export type Listener = {hostname: "127.0.0.1" | "0.0.0.0"; hosts: string[]};

/** A DNS name: labels of letters, digits and hyphens, at least one dot. No scheme, port or path. */
const HOST_NAME = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

/**
 * The listener for `<PREFIX>_LISTEN` and `<PREFIX>_PUBLIC_HOST`, or why they are refused. Every
 * interface needs a public name, and a public name needs every interface.
 */
export function hostedListener(
    prefix: string,
    port: number,
    listen: string | undefined,
    publicHost: string | undefined,
): Listener | {error: string} {
    const where = (listen ?? "").trim() || "127.0.0.1";
    if (where !== "127.0.0.1" && where !== "0.0.0.0") {
        return {error: `${prefix}_LISTEN must be 127.0.0.1 or 0.0.0.0, not ${where}`};
    }
    const name = (publicHost ?? "").trim().toLowerCase();
    if (name !== "" && !HOST_NAME.test(name)) {
        return {error: `${prefix}_PUBLIC_HOST must be a bare host name such as api.example.org, not ${publicHost}`};
    }
    if (where === "0.0.0.0" && name === "") {
        return {error: `${prefix}_LISTEN=0.0.0.0 needs ${prefix}_PUBLIC_HOST, the name the proxy forwards`};
    }
    if (where === "127.0.0.1" && name !== "") {
        return {error: `${prefix}_PUBLIC_HOST needs ${prefix}_LISTEN=0.0.0.0: on 127.0.0.1 no proxy reaches it`};
    }
    return {hostname: where, hosts: name === "" ? loopbackHosts(port) : [...loopbackHosts(port), name]};
}

/**
 * A 421 unless the request's `Host` is one of `hosts`. No `Origin` check, unlike
 * `refuseForeignRequest`: these services answer any page's `GET`, with `access-control-allow-origin: *`.
 */
export function refuseOtherHost(request: Pick<Request, "headers">, hosts: readonly string[]): Response | null {
    const host = (request.headers.get("host") ?? "").toLowerCase();
    if (hosts.some((allowed) => allowed.toLowerCase() === host)) return null;
    return new Response(JSON.stringify({error: "this service answers to its own host only"}), {
        status: 421,
        headers: {"content-type": "application/json"},
    });
}

export type Schedule = {
    /** One run now, unless one is in flight. Resolves `true` when it ran, `false` when it was skipped. */
    tick(): Promise<boolean>;
    stop(): void;
};

/**
 * `task` every `periodMs`, **one run at a time**: a tick that lands while the last run is still in
 * flight is skipped, not queued, so a slow upstream never piles runs on top of each other. A run
 * that throws is reported to `onError` and the schedule carries on. What a Worker's cron trigger
 * did, in process.
 */
export function every(
    periodMs: number,
    task: () => Promise<unknown>,
    options: {runOnStart: boolean; onError: (error: unknown) => void},
): Schedule {
    let running = false;
    const tick = async (): Promise<boolean> => {
        if (running) return false;
        running = true;
        try {
            await task();
        } catch (error) {
            options.onError(error);
        } finally {
            running = false;
        }
        return true;
    };
    const timer = setInterval(() => void tick(), periodMs);
    if (options.runOnStart) void tick();
    return {tick, stop: () => clearInterval(timer)};
}
