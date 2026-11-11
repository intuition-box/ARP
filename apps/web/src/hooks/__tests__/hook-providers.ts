import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createElement, type ReactNode} from "react";

import {ChainChoiceContext, choiceFor} from "../../lib/chain-choice";

/**
 * The two providers a read hook needs, for `renderHook`: a query client and the chain choice.
 *
 * `retryDelay: 0` and not `retry: false`, because most hooks set `retry: 1` themselves and a query
 * option beats a default — so an error test would otherwise wait a whole backoff round. Written with
 * `createElement` so the file is `.ts` and stays outside the fast-refresh lint rule.
 */
export function hookProviders(options: {isMainnet?: boolean} = {}) {
    const client = new QueryClient({
        defaultOptions: {queries: {retryDelay: 0, gcTime: 0}, mutations: {retry: false}},
    });
    const value = {choice: choiceFor(options.isMainnet ?? false), setMainnet: () => {}};
    function wrapper({children}: {children: ReactNode}) {
        return createElement(
            QueryClientProvider,
            {client},
            createElement(ChainChoiceContext.Provider, {value}, children),
        );
    }
    return {client, wrapper};
}
