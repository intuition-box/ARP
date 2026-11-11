import {render, screen} from "@testing-library/react";
import type {ReactNode} from "react";
import {MemoryRouter, useLocation} from "react-router-dom";
import {describe, expect, it, vi} from "vitest";

/**
 * Which page each address opens. Every page is a marker naming itself, and the layout a
 * pass-through, so the assertion is the routing table and nothing a page reads: no page fetches.
 * The redirects are asserted as the address the reader ends on.
 */
function Where({page}: {page: string}) {
    const {pathname, search} = useLocation();
    return <p>{`${page} at ${pathname}${search}`}</p>;
}

vi.mock("./components/Layout", () => ({
    Layout: ({children}: {children: ReactNode}) => <>{children}</>,
}));
vi.mock("./pages/ActivityPage", () => ({ActivityPage: () => <Where page="activity" />}));
vi.mock("./pages/AgentDirectory", () => ({AgentDirectory: () => <Where page="agents" />}));
vi.mock("./pages/AgentTrustPanel", () => ({AgentTrustPanel: () => <Where page="agent" />}));
vi.mock("./pages/Landing", () => ({Landing: () => <Where page="landing" />}));
vi.mock("./pages/AtomPanel", () => ({AtomPanel: () => <Where page="atom" />}));
vi.mock("./pages/PulsePage", () => ({PulsePage: () => <Where page="pulse" />}));
vi.mock("./pages/SearchPage", () => ({SearchPage: () => <Where page="search" />}));
vi.mock("./pages/ToolCatalog", () => ({ToolCatalog: () => <Where page="tools" />}));
vi.mock("./pages/DocsPage", () => ({DocsPage: () => <Where page="docs" />}));
vi.mock("./pages/StartPage", () => ({StartPage: () => <Where page="start" />}));
vi.mock("./components/site/SitePage", () => ({
    SitePage: ({name}: {name: string}) => <Where page={`site ${name}`} />,
}));

import App from "./App";

function open(at: string) {
    render(
        <MemoryRouter initialEntries={[at]}>
            <App />
        </MemoryRouter>,
    );
}

describe("the routes", () => {
    it.each([
        ["/", "landing at /"],
        ["/agents", "agents at /agents"],
        ["/agent/8453/2340", "agent at /agent/8453/2340"],
        ["/tools", "tools at /tools"],
        ["/atom/0xabc", "atom at /atom/0xabc"],
        ["/start/tool", "start at /start/tool"],
        ["/pulse/owner/repo/skill", "pulse at /pulse/owner/repo/skill"],
        ["/search?q=pdf", "search at /search?q=pdf"],
        ["/activity", "activity at /activity"],
        ["/docs", "docs at /docs"],
        ["/docs/install", "docs at /docs/install"],
        ["/test-identities", "site test-identities at /test-identities"],
        ["/no-such-page", "site not-found at /no-such-page"],
    ])("%s opens %s", async (at, expected) => {
        open(at);
        expect(await screen.findByText(expected)).toBeInTheDocument();
    });

    it.each([
        ["/tool/atom/0xabc", "atom at /atom/0xabc"],
        ["/agent/import", "start at /start/agent?have=yes"],
        ["/agent?have=no", "start at /start/agent?with=wallet"],
        ["/register?what=tool", "start at /start/tool?with=wallet"],
    ])("the old address %s lands on %s", async (at, expected) => {
        open(at);
        expect(await screen.findByText(expected)).toBeInTheDocument();
    });
});
