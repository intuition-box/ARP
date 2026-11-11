import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {DomainRail} from "../DomainRail";

/** The filter rail: a pressed button per selected domain, its count, and Clear only when useful. */
const OPTIONS = [
    {label: "video", depth: 1},
    {label: "render", depth: 2},
];

describe("DomainRail", () => {
    it("blanks a zero count, presses what is selected and clears it", () => {
        const onToggle = vi.fn();
        const onClear = vi.fn();
        render(
            <DomainRail
                options={OPTIONS}
                selected={new Set(["video"])}
                counts={(domain) => (domain === "video" ? 4 : 0)}
                onToggle={onToggle}
                onClear={onClear}
            />,
        );
        expect(
            screen.getByRole("navigation", {name: "Filter by what a tool is for"}),
        ).toBeInTheDocument();
        const video = screen.getByRole("button", {name: "video 4"});
        expect(video).toHaveAttribute("aria-pressed", "true");
        const render_ = screen.getByRole("button", {name: "render"});
        expect(render_).toHaveAttribute("aria-pressed", "false");
        expect(render_.style.paddingLeft).toBe("0.875rem");
        fireEvent.click(render_);
        expect(onToggle).toHaveBeenCalledWith("render");
        fireEvent.click(screen.getByRole("button", {name: "Clear"}));
        expect(onClear).toHaveBeenCalled();
    });

    it("offers no Clear on an untouched filter", () => {
        render(
            <DomainRail
                options={OPTIONS}
                selected={new Set()}
                counts={() => 1}
                onToggle={vi.fn()}
                onClear={vi.fn()}
            />,
        );
        expect(screen.queryByRole("button", {name: "Clear"})).toBeNull();
    });
});
