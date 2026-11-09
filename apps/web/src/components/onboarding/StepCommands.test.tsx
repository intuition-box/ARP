import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {StepCommands} from "./StepCommands";

const init = {id: "init", title: "Add ARP to your runtime", done: null, commands: ["npx -y @arp-protocol/cli init"]};
const connect = {
    id: "connect",
    title: "Add ARP to Claude Code",
    done: null,
    commands: ["claude plugin marketplace add intuition-box/ARP", "claude plugin install arp@arp"],
};

describe("the sharing offer on the install steps (task 88)", () => {
    it("is unticked, and the command stays as it is until it is ticked", () => {
        render(<StepCommands step={init} />);
        const box = screen.getByLabelText("Share this machine's skill failures as public lines?");
        expect(box).toHaveProperty("checked", false);
        expect(screen.getByText("npx -y @arp-protocol/cli init")).toBeTruthy();
        fireEvent.click(box);
        expect(screen.getByText("npx -y @arp-protocol/cli init --share")).toBeTruthy();
    });

    it("adds the plugin's own command for Claude Code, which takes no install flag", () => {
        render(<StepCommands step={connect} />);
        fireEvent.click(screen.getByLabelText("Share this machine's skill failures as public lines?"));
        const lines = [...document.querySelectorAll("code")].map((code) => code.textContent);
        expect(lines).toContain("› /arp:share-on");
        expect(lines.filter((line) => line?.includes("share-on"))).toEqual(["› /arp:share-on"]);
    });

    it("offers nothing on a step that installs nothing", () => {
        render(<StepCommands step={{id: "doctor", title: "Check", done: null, commands: ["npx -y @arp-protocol/cli doctor"]}} />);
        expect(screen.queryByLabelText("Share this machine's skill failures as public lines?")).toBeNull();
    });
});
