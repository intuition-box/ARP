import {useQuery} from "@tanstack/react-query";

import {contentsOf, type SkillContentsEntry, type SkillContentsReading} from "../services/skill-contents";

/**
 * What one skill's files contain, from the bundled dated reading (task 96).
 *
 * Loaded on demand, as `use-skill-facts.ts` loads its file: a reader who never opens a skill page
 * should not pay for every skill's contents.
 */
export type SkillContentsRead =
    | {status: "pending"}
    | {status: "not-read"; measuredAt: string}
    | {status: "read"; measuredAt: string; entry: SkillContentsEntry};

export function useSkillContents(label: string | null): SkillContentsRead {
    const query = useQuery({
        queryKey: ["skill-contents"],
        // The shape `build-skill-contents.ts` writes; checked by `skill-contents.test.ts`.
        queryFn: async () => (await import("../data/skill-contents.json")).default as SkillContentsReading,
        staleTime: Infinity,
    });
    if (query.data === undefined) return {status: "pending"};
    const entry = contentsOf(query.data, label);
    return entry === null
        ? {status: "not-read", measuredAt: query.data.measuredAt}
        : {status: "read", measuredAt: query.data.measuredAt, entry};
}
