import {screen} from "@testing-library/react";
import {Routes} from "react-router-dom";
import {describe, expect, it} from "vitest";

import {siteRoutes} from "../../../site-routes";
import {SiteFooterLinks} from "../SiteFooter";
import {renderWithProviders} from "../../../test/render";

/** The site's own routes, at one address, as the app mounts them. */
function renderAt(at: string) {
    return renderWithProviders(<Routes>{siteRoutes()}</Routes>, {route: {path: "/*", at}});
}

describe("the site's own pages (task 74)", () => {
    it("answers an unknown address with a 404 that leads somewhere", async () => {
        renderAt("/nope-404");
        expect(await screen.findByRole("heading", {name: "No page here"})).toBeTruthy();
        expect(screen.getByText("/nope-404")).toBeTruthy();
        expect(screen.getByRole("link", {name: "Agents"}).getAttribute("href")).toBe("/agents");
    });

    it("prints the legal notice in English, naming nobody and no blank", async () => {
        renderAt("/legal-notice");
        expect(await screen.findByRole("heading", {name: "Legal notice"})).toBeTruthy();
        expect(screen.getByText(/a private individual, on a non-professional basis/)).toBeTruthy();
        expect(screen.queryByText(/TO BE COMPLETED/)).toBeNull();
    });

    it("says there is no cookie, and says what the browser keeps instead", async () => {
        renderAt("/cookies");
        expect(await screen.findByRole("heading", {name: "Cookies"})).toBeTruthy();
        expect(screen.getByRole("heading", {name: "No cookie"})).toBeTruthy();
        expect(screen.getByRole("heading", {name: "Your browser's local storage"})).toBeTruthy();
    });

    it("states plainly that accessibility was not audited, and how to report a problem", async () => {
        renderAt("/accessibility");
        expect(await screen.findByRole("heading", {name: "Accessibility"})).toBeTruthy();
        expect(screen.getByText(/has not been audited/)).toBeTruthy();
        expect(screen.getByRole("heading", {name: "Report a problem"})).toBeTruthy();
    });

    it("prints the public list of what is hidden, from the file the filter reads", async () => {
        renderAt("/test-identities");
        expect(await screen.findByRole("heading", {name: "Hidden here"})).toBeTruthy();
        expect(screen.getByText("0xE596096F4176b682E300d73963e7B04B383C1AA1")).toBeTruthy();
        expect(screen.getByText("13579:1 to 13579:44")).toBeTruthy();
    });

    it("links the docs, the code on intuition-box, and the six legal pages from the footer", () => {
        renderWithProviders(<SiteFooterLinks />);
        const href = (name: string) => screen.getByRole("link", {name}).getAttribute("href");
        expect(href("Docs")).toBe("/docs");
        expect(screen.queryByRole("link", {name: "Hidden here"})).toBeNull();
        expect(screen.queryByRole("link", {name: "llms.txt"})).toBeNull();
        expect(href("GitHub")).toBe("https://github.com/intuition-box/ARP");
        expect(href("Legal notice")).toBe("/legal-notice");
        expect(href("Privacy")).toBe("/privacy");
        expect(href("Cookies")).toBe("/cookies");
        expect(href("Terms")).toBe("/terms");
        expect(href("Accessibility")).toBe("/accessibility");
        expect(href("Contact")).toBe("/contact");
    });
});
