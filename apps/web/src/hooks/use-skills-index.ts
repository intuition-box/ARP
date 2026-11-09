import {useQuery} from "@tanstack/react-query";
import type {SkillsIndexAnswer} from "@arp-protocol/core";

import {searchSkills} from "../services/skills-index";

export type SkillsIndexRead = {status: "pending"} | {status: "failed"} | SkillsIndexAnswer;

/** skills.sh's results for a search. Five minutes, like the proxy's own cache. */
export function useSkillsIndex(query: string): SkillsIndexRead {
    const read = useQuery({
        queryKey: ["skills-index", query],
        queryFn: () => searchSkills(query),
        enabled: query.trim().length > 0,
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
    if (read.data !== undefined) return read.data;
    return read.isError ? {status: "failed"} : {status: "pending"};
}
