/**
 * Mermaid fits a diagram to its container, which shrinks a wide sequence diagram to unreadable
 * text in a 46rem column. At its own width it keeps 14px labels, and the frame scrolls instead.
 */
export function atNaturalSize(svg: string): string {
    const width = /viewBox="[\d.-]+ [\d.-]+ ([\d.]+) /.exec(svg)?.[1];
    if (width === undefined) return svg;
    return svg
        .replace(/ width="100%"/, ` width="${Math.ceil(Number(width))}"`)
        .replace(/max-width: ?[\d.]+px;?/, "");
}
