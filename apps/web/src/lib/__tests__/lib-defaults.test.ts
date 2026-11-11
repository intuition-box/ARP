import {afterEach, describe, expect, it, vi} from "vitest";

import {formatDay, githubApiUrlOf} from "../atom-page";
import {deployments, identityRegistryFor} from "../deployments";
import {outcomeLabel} from "../outcome-words";
import {allowsMainnet, legalDetails} from "../site-config";
import {recallProfile, rememberProfile} from "../start-paths";

describe("githubApiUrlOf", () => {
    it("names the GitHub API call for a GitHub repository", () => {
        expect(githubApiUrlOf("github.com/acme/tools")).toBe("https://api.github.com/repos/acme/tools");
    });

    it("has none for no label, a skill, or another host", () => {
        expect(githubApiUrlOf(null)).toBeNull();
        expect(githubApiUrlOf("github.com/acme/tools?skill=x")).toBeNull();
        expect(githubApiUrlOf("gitlab.com/acme/tools")).toBeNull();
    });
});

describe("formatDay", () => {
    it("writes an ISO day as day, short month, year, without a time zone shift", () => {
        expect(formatDay("2026-10-29")).toBe("29 Oct 2026");
        expect(formatDay("2026-01-01")).toBe("1 Jan 2026");
    });

    it("hands back what it cannot split into three parts", () => {
        expect(formatDay("2026-10")).toBe("2026-10");
    });

    it("leaves the month empty rather than inventing one", () => {
        expect(formatDay("2026-13-01")).toBe("1  2026");
    });
});

describe("start-paths without storage passed in", () => {
    it("falls back to the global storage, and reports its absence rather than throwing", () => {
        // `node` has no `localStorage`, so the global fallback is the refusal case.
        expect(rememberProfile("claude")).toBe(false);
        expect(recallProfile()).toBeNull();
    });
});

describe("outcomeLabel", () => {
    it("says task done for worked, and names a failure's reasons", () => {
        expect(outcomeLabel("worked")).toBe("task done");
        expect(outcomeLabel("failed", ["timeout", "auth"])).toBe("failed: timeout, auth");
    });

    it("leaves any other outcome, and a failure with no reason, as written", () => {
        expect(outcomeLabel("failed")).toBe("failed");
        expect(outcomeLabel("no-delivery")).toBe("no-delivery");
    });
});

describe("identityRegistryFor", () => {
    it("names ARP's registry on the chain its deployment record describes, and none elsewhere", () => {
        expect(identityRegistryFor(deployments.chain.chainId)).toBe(deployments.arp.identityRegistry);
        expect(identityRegistryFor(8453)).toBeUndefined();
    });
});

describe("site-config", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("allows mainnet only when the build flag says exactly 1", () => {
        vi.stubEnv("VITE_ALLOW_MAINNET", "1");
        expect(allowsMainnet()).toBe(true);
        vi.stubEnv("VITE_ALLOW_MAINNET", "true");
        expect(allowsMainnet()).toBe(false);
    });

    it("reads the legal details from the build's variables", () => {
        vi.stubEnv("VITE_LEGAL_HOST_NAME", " Host SAS ");
        expect(legalDetails()).toMatchObject({hostName: "Host SAS"});
    });
});
