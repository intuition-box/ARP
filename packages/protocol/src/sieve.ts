/**
 * The 8004 sieve (task 87): the highest rung an ERC-8004 agent reaches, each rung checkable by one
 * request. Pure: it reads what a walk already established and touches no network.
 *
 * | rung | means |
 * | ---- | ----- |
 * | 0 shell     | no registration URI, or one that does not resolve to JSON |
 * | 1 described | a registration file that parses |
 * | 2 declares  | at least one endpoint another agent could call, and it can be probed |
 * | 3 answers   | one of those answered (`live`, or a protocol answer of any kind) |
 * | 4 speaks    | one served the protocol it declares (MCP or A2A handshake) |
 * | 5 used      | an ARP line names it, from a wallet that is not its owner's |
 *
 * **Callable is narrower than probeable.** A registration file lists its web site, its X account,
 * its npm package and its docs beside its MCP server, and each of them answers a GET. Counted, they
 * make a GitHub link "an agent that answers". In ARP's directory walk of 2026-11-09, 145 of 244 Base
 * identities had some declared URL alive and 40 had a callable endpoint that answered
 * (`agent-sieve.ts --summary data/measurements/agent-sieve-directory-2026-11-09T2000.jsonl`). So rungs
 * 2 to 4 read only endpoints declared as a protocol (MCP,
 * A2A) or as an API. The broad reading, any declared URL alive, is kept beside the rung as `anyLive`,
 * because it is close to the definition `docs/19` quotes from the study and the two must be shown
 * apart, never merged.
 *
 * **Not a verdict:** a TLS, DNS or transport failure, a 429 and an unrecognised answer leave the agent
 * at the rung below with `couldNotSay`, to be retried (the probe's own rules).
 *
 * No score (ADR `0046`): the rung is a fact per step, not a grade.
 */
import type {DeclaredEndpoint, DocumentOutcome, ProbeOutcome} from "./verify/types.js";

export type Rung = 0 | 1 | 2 | 3 | 4 | 5;

export const RUNG_NAMES: Readonly<Record<Rung, string>> = {
    0: "shell",
    1: "described",
    2: "declares an address",
    3: "answers",
    4: "speaks",
    5: "used",
};

/** Endpoint names that mean "call me here", beside the two protocols the probe can handshake. */
const API_NAMES = new Set(["api", "rest", "openai", "jsonrpc", "grpc"]);

export type SievedEndpoint = DeclaredEndpoint & {outcome: ProbeOutcome};

/** Whether another agent could send a request to this endpoint: a protocol or an API, and probeable. */
export function isCallable(endpoint: DeclaredEndpoint): boolean {
    if (endpoint.classification.status !== "probeable") return false;
    if (endpoint.protocol !== null) return true;
    return API_NAMES.has((endpoint.name ?? "").toLowerCase());
}

const ANSWERED = new Set(["live", "serves-declared-protocol", "declared-protocol-not-served"]);

function answered(outcome: ProbeOutcome): boolean {
    return outcome.status === "confirmed" && ANSWERED.has(outcome.code);
}

/** A failure that says nothing about the agent: retry it, never count it. */
function noVerdict(outcome: ProbeOutcome): boolean {
    return outcome.status === "inconclusive";
}

export type SieveInput = {
    document: DocumentOutcome;
    endpoints: readonly SievedEndpoint[];
    /** An ARP line names the agent, from a wallet that is not its owner's. `null` when not read. */
    usedByAnother: boolean | null;
};

export type SieveResult = {
    rung: Rung;
    /** The rung above could not be decided: a failure that is not a verdict. */
    couldNotSay: boolean;
    /** The endpoint that proves the rung, when one does. */
    proof: SievedEndpoint | null;
    /** Any declared URL answered, callable or not: the study's broad reading, shown apart. */
    anyLive: boolean;
};

export function sieve(input: SieveInput): SieveResult {
    const anyLive = input.endpoints.some((endpoint) => answered(endpoint.outcome));
    if (input.document.status !== "read") {
        // A gateway or host that failed in transit is not the agent's fault.
        const transient =
            input.document.status === "unreachable" &&
            (input.document.code === "transport-error" ||
                input.document.httpStatus === 429 ||
                input.document.httpStatus === 503);
        return {rung: 0, couldNotSay: transient, proof: null, anyLive};
    }
    const callable = input.endpoints.filter(isCallable);
    const speaks = callable.find(
        (endpoint) => endpoint.outcome.status === "confirmed" && endpoint.outcome.code === "serves-declared-protocol",
    );
    const answers = callable.find((endpoint) => answered(endpoint.outcome));
    let rung: Rung = callable.length === 0 ? 1 : speaks !== undefined ? 4 : answers !== undefined ? 3 : 2;
    const proof = speaks ?? answers ?? callable[0] ?? null;
    // Below 4, a callable endpoint that gave no verdict may be the one that would have lifted it.
    const couldNotSay = rung >= 2 && rung < 4 && callable.some((endpoint) => noVerdict(endpoint.outcome));
    if (input.usedByAnother === true) rung = 5;
    return {rung, couldNotSay, proof, anyLive};
}

/** The 95% Wilson interval of `hits / n`, for a figure taken from a sample. `[0, 1]` when n is 0. */
export function wilsonInterval(hits: number, n: number): [number, number] {
    if (n === 0) return [0, 1];
    const z = 1.96;
    const p = hits / n;
    const centre = p + (z * z) / (2 * n);
    const spread = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
    const denominator = 1 + (z * z) / n;
    return [(centre - spread) / denominator, (centre + spread) / denominator];
}

/** Emails an agent's own registration file states: an endpoint named `email`, or a `mailto:` value. */
export function statedEmails(endpoints: readonly DeclaredEndpoint[]): string[] {
    const out = new Set<string>();
    for (const endpoint of endpoints) {
        const value = endpoint.classification.declared.trim().replace(/^mailto:/i, "");
        const named = (endpoint.name ?? "").toLowerCase() === "email";
        if ((named || endpoint.classification.declared.toLowerCase().startsWith("mailto:")) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            out.add(value.toLowerCase());
        }
    }
    return [...out];
}
