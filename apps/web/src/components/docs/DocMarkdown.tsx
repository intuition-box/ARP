import type {Element, ElementContent} from "hast";
import {lazy, Suspense} from "react";
import Markdown, {type Components} from "react-markdown";
import {Link} from "react-router-dom";
import remarkGfm from "remark-gfm";

import {headingId} from "../../services/docs";

import {CopyButton} from "./CopyButton";

const MermaidDiagram = lazy(() =>
    import("./MermaidDiagram").then((module) => ({default: module.MermaidDiagram})),
);

/** The text of a hast subtree: a code block's source, a heading's words. */
function textOf(node: ElementContent | Element | undefined): string {
    if (node === undefined) return "";
    if (node.type === "text") return node.value;
    if (node.type === "element") return node.children.map(textOf).join("");
    return "";
}

function codeChild(node: Element | undefined): Element | undefined {
    const first = node?.children[0];
    return first?.type === "element" && first.tagName === "code" ? first : undefined;
}

function languageOf(code: Element | undefined): string | undefined {
    const classes = code?.properties["className"];
    if (!Array.isArray(classes)) return undefined;
    const language = classes.map(String).find((name) => name.startsWith("language-"));
    return language?.slice("language-".length);
}

const COMPONENTS: Components = {
    // From the hast node, so a heading made of inline code (`/search`, `arp_pulse`) gets its words.
    h2: ({node, children}) => <h2 id={headingId(textOf(node))}>{children}</h2>,
    h3: ({node, children}) => <h3 id={headingId(textOf(node))}>{children}</h3>,
    a: ({href, children}) => {
        if (href !== undefined && href.startsWith("/") && !href.endsWith(".md") && !href.endsWith(".txt")) {
            return <Link to={href}>{children}</Link>;
        }
        const external = href?.startsWith("http") === true;
        return (
            <a href={href} {...(external ? {target: "_blank", rel: "noreferrer"} : {})}>
                {children}
            </a>
        );
    },
    pre: ({node, children}) => {
        const code = codeChild(node);
        const source = textOf(code).replace(/\n$/, "");
        if (languageOf(code) === "mermaid") {
            return (
                <Suspense fallback={<pre className="doc-code">{source}</pre>}>
                    <MermaidDiagram source={source} />
                </Suspense>
            );
        }
        return (
            <div className="doc-code-wrap">
                <pre className="doc-code">{children}</pre>
                <CopyButton text={source} label="Copy" className="doc-code-copy" />
            </div>
        );
    },
    table: ({children}) => (
        <div className="doc-table-wrap">
            <table>{children}</table>
        </div>
    ),
};

export function DocMarkdown({markdown}: {markdown: string}) {
    return (
        <div className="doc-prose">
            <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
                {markdown}
            </Markdown>
        </div>
    );
}
