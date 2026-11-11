/**
 * What an x402 endpoint's URL may carry onto a public, permanent record (task 119, ADR `0186`).
 *
 * The URL a payer called can hold a search word, an email, a wallet address or a token, in its query or
 * its path. An x402 line writes that URL on chain twice: in the tool atom (`normaliseToolUrl`, T1) and in
 * the payment level (`paymentLevelLabel`, T5), and Intuition has no deletion. So the payer reduces the URL
 * **before it signs anything**, and every reader can apply the same reduction and get the same key.
 *
 * The rules, closed, in the order they apply:
 *
 * | part | rule |
 * | --- | --- |
 * | scheme, host, port | kept as typed |
 * | `user:pass@` | the URL is refused: a credential has no redacted form worth publishing |
 * | fragment | removed |
 * | a query parameter | its name kept, its value removed: `?city=paris&q=x` becomes `?city=&q=` |
 * | a query part with no `=` | removed: it is a value with no name |
 * | a path segment, or a parameter name, that looks personal | replaced by `:id` |
 *
 * "Looks personal", tested on the segment as typed and percent-decoded: it holds an `@` (an email, a
 * handle); `0x` and 40 or more hex digits (an address, a hash); a UUID; a run of 6 or more digits; a
 * run of 16 or more hex digits with a digit among them (an API key); a phone number (only digits,
 * spaces and `+ - . ( )`, with 7 or more digits); a space (free text); or more than 20 characters of
 * the base64 alphabet with an upper-case letter, a lower-case letter and a digit (a token). A segment
 * already `:id` is kept.
 *
 * **Not caught:** a plain word in the path (`/weather/paris`). Nothing tells a word that names a route
 * from one that names a search; the payer replaces it with `:id` before writing the line.
 *
 * Hashing a value instead was rejected (ADR `0186`): a plain hash of a guessable value is reversed by
 * trying candidates, and a salted one gives two payers two keys for one endpoint.
 *
 * Pure: no network, no key. Applying it twice gives what applying it once gave.
 */

/** What a redacted path segment or parameter name becomes. */
export const REDACTED_SEGMENT = ":id";

/** A URL that has no redacted form: not http(s) with a host, or carrying credentials. */
export class EndpointNotRedactableError extends Error {
    readonly input: string;

    constructor(input: string, why: string) {
        super(`${JSON.stringify(input)} cannot be written as an endpoint: ${why}`);
        this.name = "EndpointNotRedactableError";
        this.input = input;
    }
}

const PARTS = /^([A-Za-z][A-Za-z0-9+.-]*:\/\/)([^/?#]*)([^?#]*)(?:\?([^#]*))?(?:#.*)?$/;

const PERSONAL: readonly ((segment: string) => boolean)[] = [
    (s) => s.includes("@"),
    (s) => /0x[0-9a-f]{40}/i.test(s),
    (s) => /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(s),
    (s) => /\d{6}/.test(s),
    (s) => (s.match(/[0-9a-f]{16,}/gi) ?? []).some((run) => /\d/.test(run)),
    (s) => /^[\d\s+().-]+$/.test(s) && (s.match(/\d/g) ?? []).length >= 7,
    (s) => /\s/.test(s),
    (s) => s.length > 20 && /^[A-Za-z0-9+/=_-]+$/.test(s) && /[A-Z]/.test(s) && /[a-z]/.test(s) && /\d/.test(s),
];

/** Whether one path segment or parameter name would be replaced by {@link REDACTED_SEGMENT}. */
export function looksPersonal(segment: string): boolean {
    if (segment === REDACTED_SEGMENT) return false;
    let decoded = segment;
    try {
        decoded = decodeURIComponent(segment);
    } catch {
        // A malformed escape is tested as typed only.
    }
    return [segment, decoded].some((form) => PERSONAL.some((test) => test(form)));
}

const reduce = (segment: string) => (segment !== "" && looksPersonal(segment) ? REDACTED_SEGMENT : segment);

/**
 * The endpoint URL as paid, with every value removed: the one form an x402 line signs and writes.
 * Throws {@link EndpointNotRedactableError} on a URL that is not http(s) with a host, or that carries
 * `user:pass@`.
 */
export function redactEndpointUrl(url: string): string {
    const match = PARTS.exec(url);
    if (match === null) throw new EndpointNotRedactableError(url, "not a URL with a scheme and a host");
    const scheme = match[1] as string; // group 1 always matches
    const authority = match[2] as string; // group 2 always matches, possibly empty
    if (!/^https?:\/\/$/i.test(scheme)) throw new EndpointNotRedactableError(url, `scheme ${scheme} is not http or https`);
    if (authority.includes("@")) throw new EndpointNotRedactableError(url, "it carries credentials (user:pass@)");
    if (authority === "" || authority.startsWith(":")) throw new EndpointNotRedactableError(url, "no host");
    const path = (match[3] as string).split("/").map(reduce).join("/"); // group 3 always matches, possibly empty
    const names = (match[4] ?? "")
        .split("&")
        .filter((part) => part.indexOf("=") > 0)
        .map((part) => reduce(part.slice(0, part.indexOf("="))));
    const query = names.length === 0 ? "" : `?${names.map((name) => `${name}=`).join("&")}`;
    return `${scheme}${authority}${path}${query}`;
}

/** Whether a URL is already in its redacted form, so it may be signed and written as it is. */
export function isRedactedEndpointUrl(url: string): boolean {
    try {
        return redactEndpointUrl(url) === url;
    } catch {
        return false;
    }
}
