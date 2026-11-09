import {createContext, useContext, useEffect} from "react";

/**
 * The path line under the nav (`NavCoin`): each page says where it is, the nav draws it.
 */
export type TrailStep = {label: string; to?: string};

export type Trail = {steps: readonly TrailStep[]; kind?: string};
export const TrailContext = createContext<{
    trail: Trail | null;
    setTrail: (trail: Trail | null) => void;
}>({
    trail: null,
    setTrail: () => undefined,
});

/**
 * Called by a page to fill the path line, for example
 * `useNavTrail([{label: "Agents", to: "/agents"}, {label: "Base 8453"}, {label: name}], "agent")`.
 * A page that does not call it shows no path line.
 */
export function useNavTrail(steps: readonly TrailStep[], kind?: string): void {
    const {setTrail} = useContext(TrailContext);
    const key = JSON.stringify([steps, kind]);
    useEffect(() => {
        setTrail({steps, ...(kind === undefined ? {} : {kind})});
        return () => setTrail(null);
        // `key` stands for `steps` and `kind`, whose identity changes on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, setTrail]);
}
