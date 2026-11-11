import {describe, expect, it} from "vitest";

import {createGraphqlTransport, GraphqlError} from "../src/client.js";
import {HttpError, isTimeoutError, type FetchLike} from "../src/http.js";

const URL = "https://indexer.test/v1/graphql";

type Call = {input: string; init: RequestInit | undefined};

/** A fetch that records each call and answers with `respond`. */
function recordingFetch(respond: () => Response | Promise<Response>): {fetch: FetchLike; calls: Call[]} {
    const calls: Call[] = [];
    return {
        calls,
        fetch: async (input, init) => {
            calls.push({input, init});
            return respond();
        },
    };
}

function json(body: unknown, init?: ResponseInit): Response {
    return new Response(JSON.stringify(body), init);
}

async function failure(promise: Promise<unknown>): Promise<GraphqlError> {
    const caught: unknown = await promise.catch((error: unknown) => error);
    if (!(caught instanceof GraphqlError)) throw new Error(`expected a GraphqlError, got ${String(caught)}`);
    return caught;
}

describe("createGraphqlTransport", () => {
    it("POSTs the query and its variables as JSON to the configured URL", async () => {
        const {fetch, calls} = recordingFetch(() => json({data: {atoms: []}}));
        const transport = createGraphqlTransport({url: URL, fetch});

        await transport.request("query Q($id: String!) { atoms { id } }", {id: "0x1"});

        expect(calls).toHaveLength(1);
        const [call] = calls;
        expect(call?.input).toBe(URL);
        expect(call?.init?.method).toBe("POST");
        expect(call?.init?.headers).toEqual({
            "content-type": "application/json",
            accept: "application/json",
        });
        expect(JSON.parse(String(call?.init?.body))).toEqual({
            query: "query Q($id: String!) { atoms { id } }",
            variables: {id: "0x1"},
        });
        expect(call?.init?.signal).toBeInstanceOf(AbortSignal);
    });

    it("returns the data object", async () => {
        const {fetch} = recordingFetch(() => json({data: {atoms: [{id: "a"}]}}));
        const data = await createGraphqlTransport({url: URL, fetch}).request("{atoms{id}}", {});
        expect(data).toEqual({atoms: [{id: "a"}]});
    });

    it("reports a non-2xx status with the status code", async () => {
        const {fetch} = recordingFetch(() =>
            json({error: "x"}, {status: 503, statusText: "Service Unavailable"}),
        );
        const error = await failure(createGraphqlTransport({url: URL, fetch}).request("{x}", {}));
        expect(error.message).toBe("HTTP 503 Service Unavailable");
        expect(error.httpStatus).toBe(503);
        expect(error.url).toBe(URL);
        expect(error.name).toBe("GraphqlError");
    });

    it("joins every GraphQL error message, naming one without a message", async () => {
        const {fetch} = recordingFetch(() =>
            json({errors: [{message: "field 'x' not found"}, {extensions: {}}], data: null}),
        );
        const error = await failure(createGraphqlTransport({url: URL, fetch}).request("{x}", {}));
        expect(error.message).toBe("field 'x' not found; unknown error");
        expect(error.httpStatus).toBe(200);
    });

    it("refuses a body that is not JSON", async () => {
        const {fetch} = recordingFetch(() => new Response("<html>gateway</html>"));
        const error = await failure(createGraphqlTransport({url: URL, fetch}).request("{x}", {}));
        expect(error.message).toBe("response body is not a JSON object");
        expect(error.httpStatus).toBe(200);
    });

    it("refuses a JSON body that is not an object", async () => {
        const {fetch} = recordingFetch(() => json([{data: {}}]));
        const error = await failure(createGraphqlTransport({url: URL, fetch}).request("{x}", {}));
        expect(error.message).toBe("response body is not a JSON object");
    });

    it("refuses a body without a data object", async () => {
        const {fetch} = recordingFetch(() => json({data: null}));
        const error = await failure(createGraphqlTransport({url: URL, fetch}).request("{x}", {}));
        expect(error.message).toBe("response carries no data object");
    });

    it("wraps a network failure, keeping the HttpError as its cause", async () => {
        const fetch: FetchLike = async () => {
            throw new TypeError("connection refused");
        };
        const error = await failure(createGraphqlTransport({url: URL, fetch}).request("{x}", {}));
        expect(error.message).toBe("connection refused");
        expect(error.httpStatus).toBeNull();
        expect(error.cause).toBeInstanceOf(HttpError);
        expect(isTimeoutError(error)).toBe(false);
    });

    it("lets a per-request timeout override the transport's own", async () => {
        const fetch: FetchLike = (_input, init) =>
            new Promise((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
            });
        const transport = createGraphqlTransport({url: URL, fetch, timeoutMs: 60_000});
        const started = Date.now();
        const error = await failure(transport.request("{x}", {}, {timeoutMs: 20}));
        expect(Date.now() - started).toBeLessThan(5_000);
        expect(error.message).toBe(`timed out after 20ms: ${URL}`);
        expect(isTimeoutError(error)).toBe(true);
    });
});
