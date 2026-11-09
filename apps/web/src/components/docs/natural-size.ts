/**
 * Mermaid fits a diagram to its container, which shrinks a wide sequence diagram to unreadable
 * text in a narrow column. Drawn at its own width, it is fitted to the docs' text column on a
 * desktop (`.doc-diagram`), but never below `MIN_SCALE`, where its 14px labels stop being legible;
 * past that the frame scrolls.
 */
const MIN_SCALE = 0.6;

export function atNaturalSize(svg: string): string {
    const width = /viewBox="[\d.-]+ [\d.-]+ ([\d.]+) /.exec(svg)?.[1];
    if (width === undefined) return svg;
    const natural = Math.ceil(Number(width));
    return svg
        .replace(/ width="100%"/, ` width="${natural}"`)
        .replace(/max-width: ?[\d.]+px;?/, `min-width: ${Math.ceil(natural * MIN_SCALE)}px;`);
}
