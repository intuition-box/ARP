/**
 * Which paths light a nav tab, where a prefix cannot decide it.
 *
 * The old rule was `pathname.startsWith(`${to}/`)`, and `/agent/8453/2340` starts with `/agent/`,
 * so somebody else's agent lit "Your agent" (now `/start/agent`). The colliding tab says which
 * paths are its own; everything else keeps the prefix rule, which is right for `/tools`, `/start`
 * and `/activity`.
 */
export const SECTION_PATHS: Record<string, (pathname: string) => boolean> = {
    // An agent detail is `/agent/<numeric chain>/<token>`; `/agent/import` is not.
    "/agents": (pathname) => pathname === "/agents" || /^\/agent\/\d+\//.test(pathname),
};

/** Whether `to` is the section `pathname` belongs to. Same rule as the old nav. */
export function isCurrentSection(to: string, pathname: string): boolean {
    const section = SECTION_PATHS[to];
    if (section !== undefined) return section(pathname);
    if (to === "/") return pathname === "/";
    return pathname === to || pathname.startsWith(`${to}/`);
}
