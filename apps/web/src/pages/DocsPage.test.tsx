import {screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {renderWithProviders} from "../test/render";

import {DocsPage} from "./DocsPage";

const PAGE = "# Overview\n\nARP is the public pulse.\n\n## Four jobs\n\nSee [Lines](/docs/lines).\n";

function serve(body: string, status = 200) {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, {status})));
}

afterEach(() => vi.unstubAllGlobals());

const at = (path: string) => renderWithProviders(<DocsPage />, {route: {path: "/docs/:slug", at: path}});

describe("DocsPage", () => {
    it("renders the page's Markdown, with a way to copy it and to read it raw", async () => {
        serve(PAGE);
        at("/docs/overview");
        expect(await screen.findByRole("heading", {level: 1, name: "Overview"})).toBeTruthy();
        expect(screen.getByRole("heading", {level: 2, name: "Four jobs"}).id).toBe("four-jobs");
        expect(screen.getByRole("button", {name: "Copy as Markdown"})).toBeTruthy();
        expect(screen.getByRole("link", {name: "View as Markdown"}).getAttribute("href")).toBe("/docs/overview.md");
    });

    it("says a page it does not know is not there", () => {
        serve(PAGE);
        at("/docs/nope");
        expect(screen.getByRole("heading", {name: "No page by that name"})).toBeTruthy();
    });

    it("offers the raw file when the page cannot be read", async () => {
        serve("", 500);
        at("/docs/lines");
        expect(await screen.findByText(/could not be read/)).toBeTruthy();
        expect(screen.getByRole("link", {name: "Open the file"}).getAttribute("href")).toBe("/docs/lines.md");
    });

    it("links the next page", async () => {
        serve(PAGE);
        at("/docs/overview");
        expect((await screen.findByRole("link", {name: /Quickstart →/})).getAttribute("href")).toBe("/docs/quickstart");
    });
});
