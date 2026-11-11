import {describe, expect, it} from "vitest";

import {normaliseToolUrl} from "../src/declare/tool-thing.js";
import {
    EndpointNotRedactableError,
    isRedactedEndpointUrl,
    looksPersonal,
    redactEndpointUrl,
    REDACTED_SEGMENT,
} from "../src/endpoint-redaction.js";
import {paymentLevelLabel} from "../src/x402-payment.js";

const EMAIL = "alice@example.com";
const WALLET = "0x1111111111111111111111111111111111111111";
const TX = `0x${"ab".repeat(32)}`;

describe("redactEndpointUrl (task 119, ADR 0186)", () => {
    it("keeps scheme, host, port and names, and removes every value and the fragment", () => {
        expect(redactEndpointUrl("https://api.example.com/weather?city=paris&q=x")).toBe("https://api.example.com/weather?city=&q=");
        expect(redactEndpointUrl("http://www.api.example.com:8080/x402/weather/?q=x#top")).toBe("http://www.api.example.com:8080/x402/weather/?q=");
        expect(redactEndpointUrl("https://api.example.com/weather")).toBe("https://api.example.com/weather");
        expect(redactEndpointUrl("https://api.example.com/weather?")).toBe("https://api.example.com/weather");
        // A part with no `=` is a value with no name.
        expect(redactEndpointUrl("https://api.example.com/search?paris&lang=fr")).toBe("https://api.example.com/search?lang=");
    });

    it("signs none of an email, an address or a search word given in the query and the path", () => {
        const called = `https://api.example.com/v1/${encodeURIComponent(EMAIL)}/${WALLET}/feed?owner=${WALLET}&mail=${EMAIL}&q=pizza%20near%20me`;
        const redacted = redactEndpointUrl(called);
        expect(redacted).toBe("https://api.example.com/v1/:id/:id/feed?owner=&mail=&q=");
        for (const value of [EMAIL, "alice", WALLET.slice(2), "pizza"]) expect(redacted).not.toContain(value);
        // The payment level it goes into carries none either.
        const label = paymentLevelLabel({network: "eip155:8453", txHash: TX as `0x${string}`}, redacted);
        for (const value of [EMAIL, "alice", WALLET.slice(2), "pizza"]) expect(label).not.toContain(value);
    });

    it("replaces a path segment that looks personal, by each closed rule", () => {
        const personal = [
            "alice@example.com",
            "alice%40example.com",
            "@alice",
            WALLET,
            `0x${"ab".repeat(32)}`,
            "balance-0x1111111111111111111111111111111111111111",
            "123e4567-e89b-12d3-a456-426614174000",
            "order-1234567",
            "9aa3d95b3bc440fa88ea12eaa4456161",
            "+33-6-12-34-56-78",
            "(555) 123-4567",
            "best%20pizza",
            "eyJhbGciOiJIUzI1NiJ9xyz",
        ];
        for (const segment of personal) {
            expect(looksPersonal(segment), segment).toBe(true);
            expect(redactEndpointUrl(`https://api.example.com/a/${segment}/b`), segment).toBe("https://api.example.com/a/:id/b");
        }
    });

    it("keeps what names a route: words, versions, short numbers, long lower-case slugs", () => {
        for (const segment of ["weather", "v2", "x402-demo", "no-delivery", "2026", "get-weather-forecast-today", "deadbeefcafebabefacefeed", REDACTED_SEGMENT]) {
            expect(looksPersonal(segment), segment).toBe(false);
        }
        // Not caught, and said so: a plain word in a path. The payer writes `:id` in its place.
        expect(redactEndpointUrl("https://api.example.com/weather/paris")).toBe("https://api.example.com/weather/paris");
        expect(redactEndpointUrl("https://api.example.com/weather/:id")).toBe("https://api.example.com/weather/:id");
    });

    it("tests a parameter's name like a segment", () => {
        expect(redactEndpointUrl(`https://api.example.com/a?${WALLET}=1&lang=fr`)).toBe("https://api.example.com/a?:id=&lang=");
    });

    it("refuses credentials, a scheme that is not http(s), and no host", () => {
        for (const bad of ["https://user:pass@api.example.com/a", "https://token@api.example.com/a", "ftp://api.example.com/a", "https:///a", "api.example.com/a", "https://:443/a"]) {
            expect(() => redactEndpointUrl(bad), bad).toThrow(EndpointNotRedactableError);
            expect(isRedactedEndpointUrl(bad), bad).toBe(false);
        }
    });

    it("is idempotent, and says whether a URL is already reduced", () => {
        for (const url of [
            "http://www.api.example.com/x402/weather/?b=2&a=1",
            `https://api.example.com/v1/${EMAIL}/feed?owner=${WALLET}#x`,
            `https://api.example.com/a?${WALLET}=1`,
        ]) {
            const once = redactEndpointUrl(url);
            expect(redactEndpointUrl(once)).toBe(once);
            expect(isRedactedEndpointUrl(once)).toBe(true);
            // The tool atom's form of a reduced URL is reduced too.
            expect(isRedactedEndpointUrl(normaliseToolUrl(once))).toBe(true);
        }
        expect(isRedactedEndpointUrl("https://api.example.com/weather?city=paris")).toBe(false);
        expect(isRedactedEndpointUrl("https://api.example.com/weather#top")).toBe(false);
    });

    it("gives two URLs that differ only in values one tool atom URL", () => {
        const a = normaliseToolUrl(redactEndpointUrl("http://www.api.example.com/weather/?q=paris&city=1"));
        const b = normaliseToolUrl(redactEndpointUrl("https://api.example.com/weather?city=2&q=london"));
        expect(a).toBe(b);
        expect(a).toBe("https://api.example.com/weather?city=&q=");
    });
});

describe("paymentLevelLabel refuses a value (ADR 0186)", () => {
    it("throws on a URL that still carries one, and writes a reduced one", () => {
        const ref = {network: "eip155:8453", txHash: TX as `0x${string}`};
        expect(() => paymentLevelLabel(ref, "https://api.example.com/weather?city=paris")).toThrow(/still carries a value/);
        expect(paymentLevelLabel(ref, "https://api.example.com/weather?city=")).toBe(`eip155:8453/tx/${TX} https://api.example.com/weather?city=`);
    });
});
