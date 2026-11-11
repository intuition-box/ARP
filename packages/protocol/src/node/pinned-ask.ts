/**
 * One request to a URL somebody else supplied, connected only to addresses that were checked.
 *
 * Moved here from `apps/sponsor/src/admit-tool.ts` (task 140, ADR `0200`): the probe, once it runs
 * on a host of ARP's own instead of Cloudflare's edge, connects to catalogued endpoints from a
 * network where a private address reaches something, and it needs the same guard the sponsor has.
 *
 * The name is resolved once, refused if any address is private, loopback or link-local, and the
 * connection is made to the addresses that were checked (the `lookup` hook of `node:http`). DNS
 * rebinding between the check and the connection is closed that way, which `fetch` cannot do. No
 * redirect is followed, each request has a deadline, and the body is capped.
 */
import {lookup as dnsLookup} from "node:dns";
import http from "node:http";
import https from "node:https";

import type {HeaderLookup} from "../sponsor/tool-forms.js";
import {privateAddress, privateProbeTarget} from "../verify/probe.js";

/** What one request answered: the status, the headers, and at most `maxBytes` of the body. */
export type Answer = {status: number; header: HeaderLookup; body: string};
export type AskInit = {method: "GET" | "POST"; headers: Record<string, string>; body?: string};
/** One request to a URL a caller supplied. Throws {@link Refused} for a private target. */
export type Ask = (url: string, init: AskInit) => Promise<Answer>;

/** A target this process will not connect to, with the rule a caller is told. */
export class Refused extends Error {
    constructor(
        readonly rule: "not-a-tool" | "private-address",
        message: string,
    ) {
        super(message);
    }
}

export type ResolveAll = (hostname: string) => Promise<{address: string; family: number}[]>;

const resolveWithDns: ResolveAll = (hostname) =>
    new Promise((resolve, reject) =>
        dnsLookup(hostname, {all: true}, (error, addresses) => (error ? reject(error) : resolve(addresses))),
    );

type LookupCallback = (
    error: Error | null,
    address: string | {address: string; family: number}[],
    family?: number,
) => void;

export type PinnedAskOptions = {
    /** Lets a private address through, for a rig that reaches its own endpoints on purpose. */
    allowPrivate: boolean;
    timeoutMs: number;
    maxBytes: number;
    userAgent: string;
    resolve?: ResolveAll;
};

/** Requests that connect only to the addresses they checked. */
export function pinnedAsk(options: PinnedAskOptions): Ask {
    const resolve = options.resolve ?? resolveWithDns;
    const {timeoutMs, maxBytes} = options;
    return (url, init) =>
        new Promise<Answer>((settle, fail) => {
            const parsed = new URL(url);
            if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
                fail(new Refused("not-a-tool", `${url} is not an http or https URL`));
                return;
            }
            // A literal address, `localhost` or a `.internal` name is refused before any lookup: a
            // connection to a literal never asks the resolver.
            if (!options.allowPrivate && privateProbeTarget(url) !== null) {
                fail(new Refused("private-address", `${parsed.hostname} is not a public address`));
                return;
            }
            const lookup = (hostname: string, lookupOptions: {all?: boolean}, callback: LookupCallback) => {
                resolve(hostname).then(
                    (addresses) => {
                        const bad = options.allowPrivate
                            ? undefined
                            : addresses.find((entry) => privateAddress(entry.address));
                        if (bad !== undefined) {
                            callback(
                                new Refused(
                                    "private-address",
                                    `${hostname} resolves to ${bad.address}, not a public address`,
                                ),
                                "",
                            );
                            return;
                        }
                        const first = addresses[0];
                        if (first === undefined) {
                            callback(new Error(`${hostname} has no address`), "");
                            return;
                        }
                        if (lookupOptions?.all) callback(null, addresses);
                        else callback(null, first.address, first.family);
                    },
                    (error: unknown) => callback(error instanceof Error ? error : new Error(String(error)), ""),
                );
            };

            let done = false;
            let request: http.ClientRequest;
            const chunks: Buffer[] = [];
            let size = 0;
            let answered: Omit<Answer, "body"> | null = null;
            const finish = () => {
                if (done || answered === null) return;
                done = true;
                clearTimeout(deadline);
                settle({...answered, body: Buffer.concat(chunks).toString("utf8")});
            };
            const abort = (error: Error) => {
                if (done) return;
                done = true;
                clearTimeout(deadline);
                fail(error);
            };
            // A stream that never ends (MCP's older SSE transport) is read until the deadline, then kept.
            const deadline = setTimeout(() => {
                if (answered !== null) {
                    finish();
                    request.destroy();
                } else {
                    request.destroy();
                    abort(new Error(`no answer within ${timeoutMs} ms`));
                }
            }, timeoutMs);

            const client = parsed.protocol === "https:" ? https : http;
            request = client.request(
                url,
                {
                    method: init.method,
                    headers: {"user-agent": options.userAgent, ...init.headers},
                    // The `lookup` hook is how the connection uses the checked addresses; `node:http`'s type
                    // for it is the overloaded `dns.lookup`, which a single function cannot satisfy.
                    lookup: lookup as unknown as typeof dnsLookup,
                    // No pooled socket: Node's global agent keeps connections alive, and a reused one
                    // skips `lookup`, so a request would inherit a socket another policy opened.
                    agent: false,
                },
                (response) => {
                    const headers = response.headers;
                    answered = {
                        status: response.statusCode ?? 0,
                        header: (name) => {
                            const value = headers[name.toLowerCase()];
                            return Array.isArray(value) ? value.join(", ") : (value ?? null);
                        },
                    };
                    response.on("data", (chunk: Buffer) => {
                        size += chunk.length;
                        if (size > maxBytes) {
                            chunks.push(chunk.subarray(0, maxBytes - (size - chunk.length)));
                            finish();
                            request.destroy();
                            return;
                        }
                        chunks.push(chunk);
                    });
                    response.on("end", finish);
                    response.on("error", (error) => (answered === null ? abort(error) : finish()));
                },
            );
            request.on("error", (error) => abort(error));
            if (init.body !== undefined) request.write(init.body);
            request.end();
        });
}
