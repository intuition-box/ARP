/**
 * The site's legal pages, in English (task 74; translated from French on the user's request,
 * 2026-11-09): legal notice, privacy, cookies, terms, accessibility, contact (cookies and
 * accessibility added in task 76).
 *
 * Every personal or host detail is a visible placeholder, `[… TO BE COMPLETED]`. `vite.config.ts`
 * refuses a release build (`VITE_PUBLIC_RELEASE=1`) while one remains, so the site cannot go
 * online with them unfilled. The privacy page lists what the code contacts; when a page starts
 * calling a new host, it belongs here too.
 */

export const LEGAL_SLUGS = ["legal-notice", "privacy", "cookies", "terms", "accessibility", "contact"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

/** A paragraph, or a list when it is an array. */
export type LegalBlock = string | readonly string[];
export type LegalSection = {heading: string; blocks: readonly LegalBlock[]};
export type LegalDoc = {title: string; sections: readonly LegalSection[]};

/** What a placeholder looks like, for the release check and for the page that marks them. */
export const PLACEHOLDER = /\[[^[\]"]*TO BE COMPLETED\]/g;

const EDITOR = "[PUBLISHER'S FULL NAME TO BE COMPLETED]";
const EMAIL = "[CONTACT E-MAIL ADDRESS TO BE COMPLETED]";
const REPO = "https://github.com/intuition-box/ARP";

export const LEGAL: Record<LegalSlug, LegalDoc> = {
    "legal-notice": {
        title: "Legal notice",
        sections: [
            {
                heading: "Publisher",
                blocks: [
                    "This site is published by a private individual, on a non-professional basis:",
                    [
                        EDITOR,
                        "[PUBLISHER'S POSTAL ADDRESS TO BE COMPLETED]",
                        "[PUBLISHER'S PHONE NUMBER TO BE COMPLETED]",
                        EMAIL,
                    ],
                ],
            },
            {
                heading: "Publication director",
                blocks: ["[NAME OF THE PUBLICATION DIRECTOR TO BE COMPLETED]"],
            },
            {
                heading: "Host",
                blocks: [
                    [
                        "[HOST'S COMPANY NAME TO BE COMPLETED]",
                        "[HOST'S ADDRESS TO BE COMPLETED]",
                        "[HOST'S PHONE NUMBER TO BE COMPLETED]",
                    ],
                ],
            },
            {
                heading: "Source code",
                blocks: [
                    `The code of this site and of ARP is public, under the MIT licence: ${REPO}.`,
                    "This site is a test, on a test network: see the terms of use.",
                ],
            },
        ],
    },
    privacy: {
        title: "Privacy",
        sections: [
            {
                heading: "In short",
                blocks: [
                    "ARP keeps no data about you. This site is a set of static files: it has no account, no database and no form sent to ARP.",
                    "No cookie, no audience measurement, no advertising, no tracker.",
                ],
            },
            {
                heading: "Data controller",
                blocks: [`${EDITOR}, reachable at ${EMAIL}.`],
            },
            {
                heading: "What your browser keeps",
                blocks: [
                    "Your browser's local storage (not a cookie, and nothing in it leaves for ARP) keeps a few preferences: the path chosen in “Get started”, the activity bar open or closed, the network chosen when this version of the site offers mainnet and, if you connect a wallet, the connection state and the delegations you sign. You can clear it at any time from your browser's settings.",
                    "If you connect a wallet, its address is read in your browser, to show your positions. It is sent to no ARP server.",
                ],
            },
            {
                heading: "The services your browser contacts",
                blocks: [
                    "To show the pages, your browser talks directly to third-party services, which see your IP address and the time of the request:",
                    [
                        "Intuition, to read the graph and the test network (testnet.intuition.sh, testnet.rpc.intuition.systems);",
                        "GitHub (api.github.com, raw.githubusercontent.com), to read a skill's file on its page;",
                        "the IPFS gateway ipfs.io, and the image addresses agents declare themselves, for their images;",
                        "the public Base, BNB Chain and Ethereum networks, only if you import an agent registered there;",
                        "[ADDRESS OF ARP'S FIGURES SERVICE, OR REMOVE THIS LINE IF VITE_ARP_API_URL IS NOT SET, TO BE COMPLETED], for skills' install and star counts.",
                    ],
                    "Fonts are served by this site, not by Google.",
                ],
            },
            {
                heading: "What you write on the chain",
                blocks: [
                    "A transaction you sign is public and permanent: it is written to a network that neither ARP nor anyone else can erase. Do not sign anything you do not want published.",
                ],
            },
            {
                heading: "The host's logs",
                blocks: [
                    "The server that sends these pages keeps a technical log of requests (IP address, date, page requested, browser), for security and proper operation. It is kept [LOG RETENTION PERIOD TO BE COMPLETED], then erased.",
                ],
            },
            {
                heading: "Your rights",
                blocks: [
                    `You can ask to access, correct or erase data about you, or object to its processing, by writing to ${EMAIL}. You can also complain to the CNIL, the French data protection authority (cnil.fr).`,
                ],
            },
        ],
    },
    cookies: {
        title: "Cookies",
        sections: [
            {
                heading: "No cookie",
                blocks: [
                    "This site sets no cookie of its own. It uses no audience measurement, no advertising, no social network button and no other tracker. That is why it does not ask for your consent: there is nothing to accept or refuse.",
                ],
            },
            {
                heading: "Your browser's local storage",
                blocks: [
                    "To remember your choices, the site writes a few values to your browser's local storage. They stay on your device, are sent to no one and serve only the function you asked for:",
                    [
                        "the path chosen in “Get started”;",
                        "the activity bar, open or closed;",
                        "the network chosen, test or main, only in a version of the site that offers mainnet;",
                        "if you connect a wallet: the connection state, kept by the connection library, and the delegations you sign.",
                    ],
                    "These values are strictly necessary for the service you request; they do not require consent. You can clear them at any time by deleting this site's data in your browser's settings.",
                ],
            },
            {
                heading: "Third-party sites",
                blocks: [
                    "The services your browser contacts to show the pages are listed on the Privacy page. The site does not call them to track you; the images agents declare are loaded from addresses it does not control.",
                ],
            },
        ],
    },
    terms: {
        title: "Terms of use",
        sections: [
            {
                heading: "A test",
                blocks: [
                    "This site is a test version of ARP. It runs only on Intuition's test network (testnet, chain 13579). That network's token, tTRUST, has no value: it cannot be bought or sold.",
                    "What you read here can change, disappear or be wrong. The test network's data can be erased by those who run it.",
                ],
            },
            {
                heading: "No warranty",
                blocks: [
                    "The site and the software are provided as is, without warranty of any kind, whether of availability, accuracy or fitness for a purpose. To the extent permitted by law, the publisher is not liable for any resulting damage.",
                    "ARP neither hosts nor checks the skills, tools and agents it lists: they belong to their authors. What you install or pay for elsewhere is your decision and subject to those authors' terms.",
                ],
            },
            {
                heading: "What you publish",
                blocks: [
                    "A line written on the chain is public, signed by you and permanent. You are responsible for it.",
                ],
            },
            {
                heading: "Licence",
                blocks: [`ARP's code is free software under the MIT licence: ${REPO}.`],
            },
            {
                heading: "Governing law",
                blocks: ["These terms are governed by French law."],
            },
        ],
    },
    accessibility: {
        title: "Accessibility",
        sections: [
            {
                heading: "Compliance status",
                blocks: [
                    "This site has not been audited against the French accessibility framework (RGAA). It is therefore not declared compliant. It is a test site, published by a private individual.",
                ],
            },
            {
                heading: "What is done",
                blocks: [
                    [
                        "text colours meet the WCAG AA contrast ratio on the dark background, checked by a script in the source code;",
                        "interactive elements are designed to be reachable with the keyboard, with a visible focus indicator;",
                        "the “?” hints open on hover and on keyboard focus;",
                        "form fields have a label and icon buttons an accessible name;",
                        "animations stop when your system asks for reduced motion;",
                        "the documentation pages also exist as plain text (/docs/<page>.md, or all together in /llms-full.txt), with the diagrams as text.",
                    ],
                ],
            },
            {
                heading: "Known limits",
                blocks: [
                    [
                        "the home page moves through scenes with the scroll wheel; it stays readable with normal scrolling when your system asks for reduced motion, or on a small screen;",
                        "the documentation's diagrams are images without a long description: their source text is in the plain-text version;",
                        "the site exists in a dark theme only.",
                    ],
                ],
            },
            {
                heading: "Report a problem",
                blocks: [
                    `If some content or function is inaccessible to you, write to ${EMAIL} or open an issue at ${REPO}/issues. We will look for an alternative or a fix.`,
                ],
            },
        ],
    },
    contact: {
        title: "Contact",
        sections: [
            {
                heading: "Write",
                blocks: [EMAIL],
            },
            {
                heading: "A problem or a question about ARP",
                blocks: [`Open an issue at ${REPO}/issues.`],
            },
        ],
    },
};

/** Every placeholder still in the legal pages. Empty means they can be published. */
export function remainingPlaceholders(): string[] {
    return JSON.stringify(LEGAL).match(PLACEHOLDER) ?? [];
}
