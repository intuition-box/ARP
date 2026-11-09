import {useEffect, useId, useState} from "react";

import {RingLoader} from "../brand/RingLoader";

import {atNaturalSize} from "./natural-size";

/**
 * One Mermaid block, drawn in the site's tokens. Mermaid loads only when a page has a diagram, and
 * the Markdown keeps the source, which is what an agent reads.
 *
 * The colours are read off `:root` at draw time because Mermaid derives shades from real colour
 * values and cannot resolve `var(--…)`. No accent: a diagram is a resting state (`rules/ui.md`).
 */
type Drawn = {status: "pending"} | {status: "ok"; svg: string} | {status: "failed"};

function token(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function draw(id: string, source: string): Promise<string> {
    const {default: mermaid} = await import("mermaid");
    mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        fontFamily: token("--font-sans"),
        flowchart: {curve: "basis", htmlLabels: false},
        themeVariables: {
            darkMode: true,
            background: token("--color-ground"),
            fontFamily: token("--font-sans"),
            fontSize: "14px",
            primaryColor: token("--color-raised"),
            primaryTextColor: token("--color-fg"),
            primaryBorderColor: token("--color-rule-strong"),
            secondaryColor: token("--color-bg"),
            tertiaryColor: token("--color-bg"),
            lineColor: token("--color-steel"),
            textColor: token("--color-silver"),
            clusterBkg: token("--color-bg"),
            clusterBorder: token("--color-rule"),
            edgeLabelBackground: token("--color-ground"),
            actorBkg: token("--color-raised"),
            actorBorder: token("--color-rule-strong"),
            actorTextColor: token("--color-fg"),
            signalColor: token("--color-silver"),
            signalTextColor: token("--color-fg"),
            noteBkgColor: token("--color-raised-2"),
            noteBorderColor: token("--color-rule-strong"),
            noteTextColor: token("--color-fg"),
            labelBoxBkgColor: token("--color-raised"),
            labelTextColor: token("--color-fg"),
        },
    });
    const {svg} = await mermaid.render(id, source);
    return atNaturalSize(svg);
}

export function MermaidDiagram({source}: {source: string}) {
    // Mermaid wants an id that is a valid CSS selector; React's has colons in it.
    const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
    const [drawn, setDrawn] = useState<Drawn>({status: "pending"});

    useEffect(() => {
        let live = true;
        draw(id, source).then(
            (svg) => live && setDrawn({status: "ok", svg}),
            () => live && setDrawn({status: "failed"}),
        );
        return () => {
            live = false;
        };
    }, [id, source]);

    if (drawn.status === "failed") return <pre className="doc-code">{source}</pre>;
    if (drawn.status === "pending") {
        return (
            <div className="doc-diagram flex min-h-40 items-center justify-center">
                <RingLoader />
            </div>
        );
    }
    return (
        <figure
            className="doc-diagram"
            aria-label="Diagram. Its text is in this page's Markdown."
            // Mermaid's own output under `securityLevel: "strict"`, from Markdown this site ships.
            dangerouslySetInnerHTML={{__html: drawn.svg}}
        />
    );
}
