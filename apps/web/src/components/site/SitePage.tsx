import {lazy, Suspense, type ReactNode} from "react";

import {PageLoading} from "../brand/PageLoading";

/**
 * The public site's own pages (task 74), split from the main bundle like every other route.
 */
const TestIdentitiesPage = lazy(() =>
    import("../../pages/TestIdentitiesPage").then((module) => ({default: module.TestIdentitiesPage})),
);
const NotFoundPage = lazy(() =>
    import("../../pages/NotFoundPage").then((module) => ({default: module.NotFoundPage})),
);
const LegalPage = lazy(() =>
    import("../../pages/LegalPage").then((module) => ({default: module.LegalPage})),
);

export type SitePageName = "test-identities" | "not-found" | LegalSlug;
export type LegalSlug = "mentions-legales" | "confidentialite" | "conditions" | "contact";

function pageOf(name: SitePageName): ReactNode {
    if (name === "test-identities") return <TestIdentitiesPage />;
    if (name === "not-found") return <NotFoundPage />;
    return <LegalPage slug={name} />;
}

export function SitePage({name}: {name: SitePageName}) {
    return (
        <Suspense
            fallback={
                <div className="arp-route-loader">
                    <PageLoading label="Loading the page">loading…</PageLoading>
                </div>
            }
        >
            {pageOf(name)}
        </Suspense>
    );
}
