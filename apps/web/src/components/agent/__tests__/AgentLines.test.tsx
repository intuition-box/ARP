import {render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {describe, expect, it} from "vitest";

import type {AgentLinesView} from "../../../services/agent-lines";
import {AgentLines} from "../AgentLines";

const view: AgentLinesView = {
    usedBy: [
        {
            key: "1",
            atomId: "0xh",
            name: "hirer",
            nameIsId: false,
            parts: [{domain: "translation", outcome: "worked"}],
        },
    ],
    used: [{key: "2", atomId: "0xt", name: "hyperframes", nameIsId: false, parts: []}],
    contexts: ["translation"],
    truncated: false,
};

const show = (read: Parameters<typeof AgentLines>[0]["read"]) =>
    render(
        <MemoryRouter>
            <AgentLines read={read} />
        </MemoryRouter>,
    );

describe("AgentLines", () => {
    it("shows who used the agent and what it used, each name a link to its page", () => {
        show({status: "ok", view});
        expect(screen.getByRole("heading", {name: "Used by"})).toBeTruthy();
        expect(screen.getByRole("link", {name: "hirer"})).toHaveAttribute("href", "/atom/0xh");
        expect(screen.getByText("translation")).toBeTruthy();
        expect(screen.getByText(/worked/)).toBeTruthy();
        expect(screen.getByRole("link", {name: "hyperframes"})).toHaveAttribute(
            "href",
            "/atom/0xt",
        );
        expect(screen.getByText("no context")).toBeTruthy();
    });

    it("says how a line appears when there is none", () => {
        show({status: "ok", view: {usedBy: [], used: [], contexts: [], truncated: false}});
        expect(screen.getByText(/No line names this agent yet/)).toBeTruthy();
    });

    it("gives a cut read's counts as a floor", () => {
        show({status: "ok", view: {...view, truncated: true}});
        expect(screen.getAllByText("1+")).toHaveLength(2);
    });

    it("says how a line appears when the agent has no atom yet", () => {
        show({status: "no-atom"});
        expect(screen.getByText(/No line names this agent yet/)).toBeTruthy();
    });

    it("says the read failed rather than that there is nothing", () => {
        show({status: "failed"});
        expect(screen.getByText(/did not answer/)).toBeTruthy();
        expect(screen.queryByText(/No line names/)).toBeNull();
    });
});
