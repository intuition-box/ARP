import {afterEach, describe, expect, it, vi} from "vitest";

import {
    defaultFetch,
    fetchTextWithTimeout,
    fetchWithTimeout,
    HttpError,
    isTimeoutError,
    readBodyText,
    type FetchLike,
} from "../src/http.js";

/** A fetch that never settles until its signal aborts. */
const hangingFetch: FetchLike = (_input, init) =>
    new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    });

const refusingFetch: FetchLike = async () => {
    throw new TypeError("ECONNREFUSED");
};

async function httpFailure(promise: Promise<unknown>): Promise<HttpError> {
    const caught: unknown = await promise.catch((error: unknown) => error);
    if (!(caught instanceof HttpError)) throw new Error(`expected an HttpError, got ${String(caught)}`);
    return caught;
}

describe("fetchWithTimeout", () => {
    it("passes the init through with an abort signal and returns the response", async () => {
        let seen: RequestInit | undefined;
        const fetchImpl: FetchLike = async (_input, init) => {
            seen = init;
            return new Response("ok", {status: 201});
        };
        const response = await fetchWithTimeout(fetchImpl, "https://x.test", {method: "GET"}, 100);
        expect(response.status).toBe(201);
        expect(seen?.method).toBe("GET");
        expect(seen?.signal).toBeInstanceOf(AbortSignal);
    });

    it("reports a deadline as a timeout", async () => {
        const error = await httpFailure(fetchWithTimeout(hangingFetch, "https://x.test", {}, 20));
        expect(error.kind).toBe("timeout");
        expect(error.timeoutMs).toBe(20);
        expect(error.message).toBe("timed out after 20ms: https://x.test");
    });

    it("reports a refusal as a network failure, keeping the cause", async () => {
        const error = await httpFailure(fetchWithTimeout(refusingFetch, "https://x.test", {}, 100));
        expect(error.kind).toBe("network");
        expect(error.message).toBe("ECONNREFUSED");
        expect(error.cause).toBeInstanceOf(TypeError);
    });

    it("stringifies a thrown non-Error", async () => {
        const fetchImpl: FetchLike = () => Promise.reject("plain string");
        const error = await httpFailure(fetchWithTimeout(fetchImpl, "https://x.test", {}, 100));
        expect(error.kind).toBe("network");
        expect(error.message).toBe("plain string");
    });
});

describe("fetchTextWithTimeout before the headers", () => {
    it("reports a deadline as a timeout", async () => {
        const error = await httpFailure(
            fetchTextWithTimeout(hangingFetch, "https://x.test", {}, {timeoutMs: 20}),
        );
        expect(error.kind).toBe("timeout");
    });

    it("reports a refusal as a network failure", async () => {
        const error = await httpFailure(
            fetchTextWithTimeout(refusingFetch, "https://x.test", {}, {timeoutMs: 100}),
        );
        expect(error.kind).toBe("network");
        expect(error.message).toBe("ECONNREFUSED");
    });

    it("stringifies a thrown non-Error", async () => {
        const fetchImpl: FetchLike = () => Promise.reject(42);
        const error = await httpFailure(
            fetchTextWithTimeout(fetchImpl, "https://x.test", {}, {timeoutMs: 100}),
        );
        expect(error.message).toBe("42");
    });
});

describe("readBodyText", () => {
    it("reads an absent body as the empty string", async () => {
        expect(await readBodyText(new Response(null, {status: 204}))).toBe("");
    });

    it("reads a body with no options under the default cap", async () => {
        expect(await readBodyText(new Response("héllo"))).toBe("héllo");
    });

    it("refuses at once when the signal is already aborted", async () => {
        const controller = new AbortController();
        controller.abort();
        const error = await httpFailure(
            readBodyText(new Response("x"), {signal: controller.signal, timeoutMs: 7}),
        );
        expect(error.kind).toBe("timeout");
        expect(error.message).toBe("timed out after 7ms reading the body");
    });

    it("reports a stream that errors as a network failure", async () => {
        const stream = new ReadableStream<Uint8Array>({
            pull(controller) {
                controller.error(new Error("socket hang up"));
            },
        });
        const error = await httpFailure(readBodyText(new Response(stream)));
        expect(error.kind).toBe("network");
        expect(error.message).toBe("socket hang up");
    });

    it("stringifies a stream error that is not an Error", async () => {
        const stream = new ReadableStream<Uint8Array>({
            pull(controller) {
                controller.error("reset");
            },
        });
        const error = await httpFailure(readBodyText(new Response(stream)));
        expect(error.message).toBe("reset");
    });
});

describe("isTimeoutError", () => {
    it("finds a timeout through the cause chain", () => {
        const timeout = new HttpError("timeout", "t", 10);
        expect(isTimeoutError(timeout)).toBe(true);
        expect(isTimeoutError(new Error("outer", {cause: new Error("mid", {cause: timeout})}))).toBe(true);
    });

    it("answers false for a refusal, a plain error, and a non-error", () => {
        expect(isTimeoutError(new HttpError("network", "n", 10))).toBe(false);
        expect(isTimeoutError(new Error("x"))).toBe(false);
        expect(isTimeoutError("timeout")).toBe(false);
        expect(isTimeoutError(null)).toBe(false);
    });

    it("stops walking after eight levels", () => {
        let error: Error = new HttpError("timeout", "t", 10);
        for (let level = 0; level < 8; level += 1) error = new Error(`wrap ${level}`, {cause: error});
        expect(isTimeoutError(error)).toBe(false);
    });
});

describe("defaultFetch", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("delegates to the global fetch", async () => {
        const global = vi.fn(async () => new Response("from global"));
        vi.stubGlobal("fetch", global);
        const response = await defaultFetch()("https://x.test", {method: "GET"});
        expect(await response.text()).toBe("from global");
        expect(global).toHaveBeenCalledWith("https://x.test", {method: "GET"});
    });

    it("fails loudly when the runtime has no fetch", () => {
        vi.stubGlobal("fetch", undefined);
        expect(() => defaultFetch()).toThrow(TypeError);
    });
});
