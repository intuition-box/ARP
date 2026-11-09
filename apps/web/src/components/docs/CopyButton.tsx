import {useEffect, useState} from "react";

type CopyState = "idle" | "copied" | "failed";

/**
 * Copies a text to the clipboard and says so for two seconds. The word changes in place, in a live
 * region, so a screen reader hears it and nothing moves.
 */
export function CopyButton({
    text,
    label,
    className,
}: {
    text: string;
    label: string;
    className?: string;
}) {
    const [state, setState] = useState<CopyState>("idle");

    useEffect(() => {
        if (state === "idle") return;
        const timer = window.setTimeout(() => setState("idle"), 2000);
        return () => window.clearTimeout(timer);
    }, [state]);

    const copy = () => {
        // Undefined outside a secure context, such as a plain-http preview on a LAN address.
        if (navigator.clipboard === undefined) {
            setState("failed");
            return;
        }
        navigator.clipboard.writeText(text).then(
            () => setState("copied"),
            () => setState("failed"),
        );
    };

    return (
        <button type="button" onClick={copy} className={className}>
            <span aria-live="polite">
                {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
            </span>
        </button>
    );
}
