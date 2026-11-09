import {act, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {CopyButton} from "./CopyButton";

afterEach(() => vi.unstubAllGlobals());

function clipboard(writeText: ((text: string) => Promise<void>) | undefined) {
    vi.stubGlobal("navigator", {...navigator, clipboard: writeText === undefined ? undefined : {writeText}});
}

describe("CopyButton", () => {
    it("copies the text and says so", async () => {
        const writeText = vi.fn(async () => undefined);
        clipboard(writeText);
        render(<CopyButton text="# Lines" label="Copy as Markdown" />);
        await act(async () => fireEvent.click(screen.getByRole("button")));
        expect(writeText).toHaveBeenCalledWith("# Lines");
        expect(screen.getByRole("button").textContent).toBe("Copied");
    });

    it("says it failed when the clipboard refuses", async () => {
        clipboard(async () => Promise.reject(new Error("denied")));
        render(<CopyButton text="x" label="Copy" />);
        await act(async () => fireEvent.click(screen.getByRole("button")));
        expect(screen.getByRole("button").textContent).toBe("Copy failed");
    });

    it("says it failed where there is no clipboard", async () => {
        clipboard(undefined);
        render(<CopyButton text="x" label="Copy" />);
        await act(async () => fireEvent.click(screen.getByRole("button")));
        expect(screen.getByRole("button").textContent).toBe("Copy failed");
    });
});
