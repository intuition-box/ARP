/**
 * nohumans.directory's last purchase of an x402 endpoint, as ARP's API serves it (`apps/api`,
 * `GET /x402/last-purchase`, task 120, ADR `0187`).
 *
 * Somebody else's verdict under CC BY 4.0, dated and credited. It is not an ARP line: nothing here
 * feeds a count, an order or a score.
 */
export type LastPurchaseSource = {
    name: string;
    url: string;
    licence: string;
    licenceUrl: string;
};

/**
 * The credit the licence asks for (`https://nohumans.directory/llms.txt`, "## Licence", read
 * 2026-11-11): the name, a link to `https://api.nohumans.directory`, the licence. The card prints it
 * in every state, before the reading arrives too, so it is a constant rather than the answer's copy.
 */
export const NOHUMANS_SOURCE: LastPurchaseSource = {
    name: "nohumans.directory",
    url: "https://api.nohumans.directory",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
};

export type LastPurchasePurchase = {
    at: string;
    delivered: boolean;
    reason: string | null;
    tx: string | null;
};

export type LastPurchaseAnswer = {
    source: LastPurchaseSource;
    network: string;
    endpoint: string;
    fetchedAt: string;
    listing: string | null;
} & ({match: "active" | "delisted"; purchase: LastPurchasePurchase | null} | {match: "unknown"});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isText = (value: unknown): value is string => typeof value === "string";

function purchaseOf(value: unknown): LastPurchasePurchase | null | undefined {
    if (value === null) return null;
    if (!isRecord(value) || !isText(value.at) || typeof value.delivered !== "boolean")
        return undefined;
    return {
        at: value.at,
        delivered: value.delivered,
        reason: isText(value.reason) ? value.reason : null,
        tx: isText(value.tx) && /^0x[0-9a-f]{64}$/.test(value.tx) ? value.tx : null,
    };
}

/** The API's answer, checked field by field. Throws on anything that is not that shape. */
export function parseLastPurchase(body: unknown): LastPurchaseAnswer {
    if (
        !isRecord(body) ||
        !isRecord(body.source) ||
        !isText(body.source.name) ||
        !isText(body.source.url) ||
        !isText(body.source.licence) ||
        !isText(body.source.licenceUrl) ||
        !isText(body.network) ||
        !isText(body.endpoint) ||
        !isText(body.fetchedAt)
    ) {
        throw new Error("the API answered something that is not a last-purchase reading");
    }
    const base = {
        source: {
            name: body.source.name,
            url: body.source.url,
            licence: body.source.licence,
            licenceUrl: body.source.licenceUrl,
        },
        network: body.network,
        endpoint: body.endpoint,
        fetchedAt: body.fetchedAt,
        listing: isText(body.listing) ? body.listing : null,
    };
    if (body.match === "unknown") return {...base, match: "unknown"};
    if (body.match === "active" || body.match === "delisted") {
        const purchase = purchaseOf(body.purchase);
        if (purchase === undefined) throw new Error("the purchase in the reading is malformed");
        return {...base, match: body.match, purchase};
    }
    throw new Error(`unknown match ${String(body.match)}`);
}

/**
 * `GET <base>/x402/last-purchase?url=<endpoint>`. Only the endpoint's public URL is sent. `null` when
 * the API answers 404: it serves no such route, which is how `apps/api` answers with
 * `ARP_X402_LAST_PURCHASE` off (task 140, ADR `0200`), and then there is no card.
 */
export async function fetchLastPurchase(
    baseUrl: string,
    endpoint: string,
    fetcher: typeof fetch = fetch,
): Promise<LastPurchaseAnswer | null> {
    const response = await fetcher(
        `${baseUrl.replace(/\/+$/, "")}/x402/last-purchase?url=${encodeURIComponent(endpoint)}`,
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`${response.status} from the API`);
    return parseLastPurchase(await response.json());
}

/**
 * Hosts whose pages are a package or its code, never an endpoint a payment reaches. Tool atoms on
 * 13579 name all five (read 2026-11-11), and asking nohumans.directory about them is noise.
 */
const NOT_ENDPOINT_HOSTS = new Set([
    "github.com",
    "gitlab.com",
    "npmjs.com",
    "pypi.org",
    "hub.docker.com",
]);

/**
 * The endpoint a tool atom names, as a URL with its scheme: a tool atom's label is its normalised
 * URL without `https://` (`normaliseToolUrl`, `declare/tool-thing.ts`). `null` for a label that is
 * not a URL with a dotted host, or names a code or package host — those atoms have no card.
 */
export function endpointOfLabel(label: string | null): string | null {
    if (label === null) return null;
    const text = label.trim();
    if (text.length === 0 || /\s/.test(text)) return null;
    const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    let url: URL;
    try {
        url = new URL(withScheme);
    } catch {
        return null;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".") || NOT_ENDPOINT_HOSTS.has(url.hostname)) return null;
    return withScheme;
}

const EXPLORERS: Record<string, string> = {"eip155:8453": "https://basescan.org/tx/"};

/** What the card prints, in three lines whatever the reading says, so its height never changes. */
export type LastPurchaseView = {
    /** `delivered`, `not delivered`, `never bought there`, `not listed there`, `…`, `not read`. */
    verdict: string;
    /** The failure code nohumans gave, or `null`. */
    reason: string | null;
    /** The listing was removed there, which its own rules read as a warning. */
    delisted: boolean;
    /** `YYYY-MM-DD` of the purchase: when the verdict was observed, which the licence asks to say. */
    day: string | null;
    tx: {hash: string; href: string | null} | null;
    /** The record on nohumans.directory, when there is one. */
    listing: string | null;
};

export function lastPurchaseView(
    state: {status: "pending"} | {status: "error"} | {status: "read"; answer: LastPurchaseAnswer},
): LastPurchaseView {
    const empty = {reason: null, delisted: false, day: null, tx: null, listing: null};
    if (state.status === "pending") return {...empty, verdict: "…"};
    if (state.status === "error") return {...empty, verdict: "not read"};
    const {answer} = state;
    if (answer.match === "unknown") return {...empty, verdict: "not listed there"};
    const {purchase} = answer;
    const delisted = answer.match === "delisted";
    if (purchase === null)
        return {...empty, verdict: "never bought there", delisted, listing: answer.listing};
    const explorer = EXPLORERS[answer.network];
    return {
        verdict: purchase.delivered ? "delivered" : "not delivered",
        reason: purchase.reason,
        delisted,
        day: purchase.at.length >= 10 ? purchase.at.slice(0, 10) : null,
        tx:
            purchase.tx === null
                ? null
                : {
                      hash: purchase.tx,
                      href: explorer === undefined ? null : `${explorer}${purchase.tx}`,
                  },
        listing: answer.listing,
    };
}
