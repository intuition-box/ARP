import {Route} from "react-router-dom";

import {SitePage} from "./components/site/SitePage";
import {LEGAL_SLUGS} from "./services/legal";

/**
 * The public site's own routes (task 74): what is hidden and why, the legal pages, and the 404.
 * Kept apart from `App.tsx` so its routes and these do not share a hunk. Called as a function,
 * because `Routes` reads its children as `Route` elements and not as a component.
 */
export function siteRoutes() {
    return (
        <>
            <Route path="/test-identities" element={<SitePage name="test-identities" />} />
            {LEGAL_SLUGS.map((slug) => (
                <Route key={slug} path={`/${slug}`} element={<SitePage name={slug} />} />
            ))}
            {/* Last, so it answers only what nothing above does. */}
            <Route path="*" element={<SitePage name="not-found" />} />
        </>
    );
}
