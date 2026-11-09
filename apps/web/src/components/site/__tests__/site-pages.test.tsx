import {screen} from "@testing-library/react";
import {Routes} from "react-router-dom";
import {describe, expect, it} from "vitest";

import {siteRoutes} from "../../../site-routes";
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

    it("prints the legal notice in French, says so in English, and shows a blank as a blank", async () => {
        renderAt("/mentions-legales");
        expect(await screen.findByRole("heading", {name: "Mentions légales"})).toBeTruthy();
        expect(screen.getByText("Legal notice, in French.")).toBeTruthy();
        expect(screen.getByText("[NOM ET PRÉNOM DE L'ÉDITEUR À COMPLÉTER]")).toBeTruthy();
    });

    it("prints the public list of what is hidden, from the file the filter reads", async () => {
        renderAt("/test-identities");
        expect(await screen.findByRole("heading", {name: "Hidden here"})).toBeTruthy();
        expect(screen.getByText("0xE596096F4176b682E300d73963e7B04B383C1AA1")).toBeTruthy();
        expect(screen.getByText("13579:1 to 13579:38")).toBeTruthy();
    });
});
