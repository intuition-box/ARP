import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {StepCommands} from "../StepCommands";

/** An install step with no commands yet: nothing to copy, so nothing to share either. */
describe("StepCommands without commands", () => {
    it("renders no command and no sharing offer", () => {
        const {container} = render(
            <StepCommands step={{id: "init", title: "Add ARP", done: null}} />,
        );
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole("checkbox")).toBeNull();
    });
});
