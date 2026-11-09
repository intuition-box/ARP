import {wagmiConfig} from "./wagmi";

/** A chain's display name for the chains the app knows (`Base`), `Chain <id>` otherwise. */
export function chainNameOf(chainId: number): string {
    return wagmiConfig.chains.find((chain) => chain.id === chainId)?.name ?? `Chain ${chainId}`;
}
