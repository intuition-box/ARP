import {searchSkillsIndex, type SkillsIndexAnswer} from "@arp-protocol/core";

/**
 * skills.sh's index, read through the site's own origin: skills.sh sends no CORS header, so
 * `vite.config.ts` in dev and `nginx.conf` in production proxy `/skills-index/api/search` (task 82).
 */
export const SKILLS_INDEX_PROXY = "/skills-index";

export function searchSkills(query: string, fetchLike: typeof fetch = fetch): Promise<SkillsIndexAnswer> {
    return searchSkillsIndex(query, {baseUrl: SKILLS_INDEX_PROXY, limit: 20, fetch: fetchLike});
}

/** `github.com/<owner>/<repo>?skill=<name>`, the label an ARP atom carries for the same skill. */
export function labelKeyOf(url: string): string {
    return url.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
}
