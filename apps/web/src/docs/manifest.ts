/**
 * The docs' table of contents. Each entry is one file, `public/docs/<slug>.md`, which is the only
 * copy of the page: the site renders it, an agent fetches it raw, and `/llms.txt` lists it from
 * here (`vite.config.ts`).
 */
export type DocEntry = {
    readonly slug: string;
    readonly title: string;
    /** One sentence, used in the sidebar's hover title and in `/llms.txt`. */
    readonly summary: string;
};

export type DocSection = {
    readonly title: string;
    readonly entries: readonly DocEntry[];
};

export const DOC_SECTIONS: readonly DocSection[] = [
    {
        title: "Start",
        entries: [
            {slug: "overview", title: "Overview", summary: "What ARP is, what it adds, and the whole picture in one diagram."},
            {slug: "quickstart", title: "Quickstart", summary: "Install ARP in your runtime and run a first search."},
            {slug: "testers", title: "For testers", summary: "The test week: what to do, what to report, and what ARP does on your machine."},
            {slug: "concepts", title: "Concepts", summary: "Skills, tools, agents, identities, lines and support, and how they relate."},
        ],
    },
    {
        title: "How it works",
        entries: [
            {slug: "lines", title: "Lines", summary: "What a public line says, how it is written, and what it costs."},
            {slug: "search-and-score", title: "Search and score", summary: "How a search is ranked, and what moves the order."},
            {slug: "local-memory", title: "Local memory and sharing", summary: "What the hook records on your machine, and what leaves only if you share."},
            {slug: "agents-and-nodes", title: "Agents and nodes", summary: "Finding an agent, checking its address, and being hired through a node."},
            {slug: "the-sieve", title: "The 8004 sieve", summary: "Which ERC-8004 agents exist, which answer, which speak, and how each is checked."},
        ],
    },
    {
        title: "Use",
        entries: [
            {slug: "web-app", title: "The web app", summary: "Every page of this site and what it is for."},
            {slug: "mcp-tools", title: "MCP tools", summary: "Every tool the MCP server serves, what it takes and what it returns."},
            {slug: "cli", title: "CLI", summary: "Every arp command, with its options."},
            {slug: "uninstall", title: "Uninstall", summary: "Everything ARP writes on a machine, and how to remove each piece."},
            {slug: "no-install", title: "Without installing anything", summary: "Public reads and calls you sign yourself, for any agent."},
        ],
    },
    {
        title: "Reference",
        entries: [
            {slug: "architecture", title: "Architecture", summary: "What runs where, the services, and the repository's layout."},
            {slug: "networks", title: "Networks and contracts", summary: "Chains, addresses, endpoints, and where costs are read."},
            {slug: "developers", title: "For developers", summary: "The repository, building and testing, what is published, and every environment variable."},
            {slug: "glossary", title: "Glossary", summary: "Every term used in these pages, in one line each."},
        ],
    },
];

export const DOC_ENTRIES: readonly DocEntry[] = DOC_SECTIONS.flatMap((section) => section.entries);

export const FIRST_DOC = "overview";

export function findDoc(slug: string | undefined): DocEntry | undefined {
    return DOC_ENTRIES.find((entry) => entry.slug === slug);
}
