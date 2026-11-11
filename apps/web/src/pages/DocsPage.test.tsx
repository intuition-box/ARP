import {screen, waitFor} from "@testing-library/react";
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

    it("opens the first page when no page is named", async () => {
        serve(PAGE);
        renderWithProviders(<DocsPage />, {route: {path: "/docs/:slug?", at: "/docs"}});
        expect(await screen.findByRole("heading", {level: 1, name: "Overview"})).toBeTruthy();
    });

    it("lands on the section a link names once the text has arrived", async () => {
        serve(PAGE);
        const scrolled = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
        at("/docs/overview#four-jobs");
        await screen.findByRole("heading", {level: 2, name: "Four jobs"});
        await waitFor(() => expect(scrolled).toHaveBeenCalled());
        expect(scrolled.mock.contexts[0]).toBe(screen.getByRole("heading", {level: 2, name: "Four jobs"}));
        scrolled.mockRestore();
    });

    it("links the previous page, and no next page after the last one", async () => {
        serve(PAGE);
        at("/docs/glossary");
        expect((await screen.findByRole("link", {name: /← For developers/})).getAttribute("href")).toBe("/docs/developers");
        expect(screen.queryByRole("link", {name: /→$/})).toBeNull();
    });

    it("titles the browser tab after the page, and gives the old title back on leaving", async () => {
        serve(PAGE);
        document.title = "ARP";
        const page = at("/docs/overview");
        await screen.findByRole("heading", {level: 1, name: "Overview"});
        expect(document.title).toBe("Overview · ARP docs");
        page.unmount();
        expect(document.title).toBe("ARP");
    });
});
