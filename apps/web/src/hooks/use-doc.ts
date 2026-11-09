import {useQuery} from "@tanstack/react-query";

import {fetchDoc} from "../services/docs";

export type DocRead = {status: "pending"} | {status: "failed"} | {status: "ok"; markdown: string};

export function useDoc(slug: string): DocRead {
    const query = useQuery({
        queryKey: ["doc", slug],
        queryFn: () => fetchDoc(slug),
        staleTime: Infinity,
    });
    if (query.isPending) return {status: "pending"};
    if (query.isError) return {status: "failed"};
    return {status: "ok", markdown: query.data};
}
