import {normaliseToolUrl} from "./declare/tool-thing.js";
import {EndpointNotRedactableError, redactEndpointUrl} from "./endpoint-redaction.js";

/**
 * Whether a tool's URL may be written on chain as it is (task 123, ADR `0190`).
 *
 * A tool's atom is its normalised URL (`normaliseToolUrl`), public and permanent. An MCP URL pasted with
 * `?api_key=…`, or with a token in its path, would put that key on Intuition forever. So every place that
 * lists a tool checks the URL it is about to write, and **refuses** one that carries a value, naming the form
 * it would accept. It never strips the value itself: a person who pasted a key needs to know they did.
 *
 * | host | accepted |
 * | --- | --- |
 * | `github.com` | no query, or the one parameter `skill`: a skill's name, which its repository already publishes. The path is not checked: an owner's and a repository's names are public names |
 * | any other | what {@link redactEndpointUrl} leaves unchanged: query names with no value, no fragment, no path segment that looks personal (task 119, ADR `0186`) |
 *
 * The rule reads the URL **as it would be written**, so a caller passes what it writes: the sponsor and the web
 * form `canonicalToolUrl`'s output, the wallet path and a declaration `normaliseToolUrl`'s.
 *
 * Pure: no network, no key.
 */

export type ToolUrlVerdict =
    | {ok: true}
    /** `listable` is the form that would be accepted, or `null` when there is none. */
    | {ok: false; why: string; listable: string | null};

const GITHUB = /^https?:\/\/(?:www\.)?github\.com(?:[/?#]|$)/i;

export function publishableToolUrl(url: string): ToolUrlVerdict {
    if (GITHUB.test(url)) {
        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch {
            return {ok: false, why: "it is not a URL", listable: null};
        }
        const names = [...parsed.searchParams.keys()];
        const others = [...new Set(names.filter((name) => name !== "skill"))];
        if (others.length === 0 && names.length <= 1 && parsed.hash === "") return {ok: true};
        const skill = parsed.searchParams.get("skill");
        const listable = normaliseToolUrl(
            `${parsed.origin}${parsed.pathname}${skill === null ? "" : `?skill=${encodeURIComponent(skill)}`}`,
        );
        const why = others.length > 0 ? `its query carries ${others.join(", ")}` : "its query repeats skill";
        return {ok: false, why, listable};
    }
    let redacted: string;
    try {
        redacted = redactEndpointUrl(url);
    } catch (error) {
        if (error instanceof EndpointNotRedactableError) return {ok: false, why: error.message, listable: null};
        throw error;
    }
    if (redacted === url) return {ok: true};
    const valued = new Set(
        (url.split("#")[0] ?? "")
            .split("?")
            .slice(1)
            .join("?")
            .split("&")
            .filter((part) => part.indexOf("=") > 0 && part.slice(part.indexOf("=") + 1) !== "")
            .map((part) => part.slice(0, part.indexOf("="))),
    );
    const parts: string[] = [];
    if (valued.size > 0) parts.push(`a value for ${[...valued].join(", ")}`);
    const pathOf = (u: string) => u.split(/[?#]/)[0];
    if (pathOf(redacted) !== pathOf(url)) parts.push("a path segment or name that looks personal");
    if (url.includes("#")) parts.push("a fragment");
    return {ok: false, why: `it carries ${parts.length === 0 ? "a value" : parts.join(" and ")}`, listable: redacted};
}

/**
 * A tool URL that would write a value on chain. Thrown by every planner that would create its atom. The
 * message never holds the URL: a caller that logs or forwards it would carry the value it refused.
 */
export class ToolUrlCarriesValuesError extends Error {
    readonly listable: string | null;

    constructor(why: string, listable: string | null) {
        super(
            `This tool URL cannot be listed: ${why}. A tool's URL is written publicly and for good, so remove it` +
                (listable === null ? "." : ` and list ${listable}.`),
        );
        this.name = "ToolUrlCarriesValuesError";
        this.listable = listable;
    }
}

/** Throws {@link ToolUrlCarriesValuesError} when {@link publishableToolUrl} refuses `url`. */
export function assertPublishableToolUrl(url: string): void {
    const verdict = publishableToolUrl(url);
    if (!verdict.ok) throw new ToolUrlCarriesValuesError(verdict.why, verdict.listable);
}
