import {INTUITION_SAME_AS_TERM_ID, toCaip19} from "@arp-protocol/core";
import type {AgentListing, AtomStanding, RecentDeclaration, RecentStake, TermBacker} from "@arp-protocol/core";
import {getAddress, type Address} from "viem";

import list from "../data/arp-test-identities.json";

/**
 * ARP's own test identities, and what this site leaves out because of them (task 74).
 *
 * The list is `data/arp-test-identities.json`, served as it is on `/test-identities` so a visitor
 * reads the same thing the filter reads. Two rules, and only two:
 *
 * - **about** one of ARP's test agents (the subject or the object of a line): hidden;
 * - **held by** one of the listed wallets (a deposit, a redemption, a position): hidden. Not *signed
 *   by*: the sponsoring service signs deposits in a tester's name (ADR `0144`), and those are the
 *   lines a test round exists to produce.
 *
 * **A failed read of the test atoms fails the read it filters**, on purpose: showing ARP's tests
 * as somebody's activity because one query failed is the error this list exists to prevent, and
 * the pages already say "the graph did not answer" for a failed read.
 *
 * The tool catalogue ARP listed is not filtered: a listing is a URL, not a use.
 */

export type TestIdentityList = {
    why: string;
    measured: string;
    chainId: number;
    registry: Address;
    agents: {from: number; to: number};
    addresses: readonly {address: string; role: string}[];
};

export const TEST_IDENTITIES: TestIdentityList = {
    ...list,
    // Checked here, once, so a typo in the file fails at load rather than as a silent miss.
    registry: getAddress(list.registry),
};

const HIDDEN_ADDRESSES = new Set(TEST_IDENTITIES.addresses.map((entry) => entry.address.toLowerCase()));

export function isHiddenAddress(address: string | null | undefined): boolean {
    return address !== null && address !== undefined && HIDDEN_ADDRESSES.has(address.toLowerCase());
}

export function isHiddenAgent(ref: {chainId: number; tokenId: string; registry?: string}): boolean {
    if (ref.chainId !== TEST_IDENTITIES.chainId) return false;
    if (ref.registry !== undefined && ref.registry.toLowerCase() !== TEST_IDENTITIES.registry.toLowerCase())
        return false;
    if (!/^\d+$/.test(ref.tokenId)) return false;
    const id = BigInt(ref.tokenId);
    return id >= BigInt(TEST_IDENTITIES.agents.from) && id <= BigInt(TEST_IDENTITIES.agents.to);
}

export function isHiddenListing(listing: Pick<AgentListing, "ref" | "identities">): boolean {
    return [listing.ref, ...listing.identities].some((ref) => ref !== null && isHiddenAgent(ref));
}

/** The CAIP-19 strings of every listed agent: the names of the atoms their `same as` edges point at. */
export function hiddenCaip19s(): string[] {
    const out: string[] = [];
    for (let id = TEST_IDENTITIES.agents.from; id <= TEST_IDENTITIES.agents.to; id += 1) {
        out.push(
            toCaip19({chainId: TEST_IDENTITIES.chainId, tokenId: String(id), registry: TEST_IDENTITIES.registry}),
        );
    }
    return out;
}

const SAME_AS_SUBJECTS = `query TestIdentityAtoms($sameAs: String!, $caips: [String!]!) {
    triples(where: {predicate_id: {_eq: $sameAs}, object: {label: {_in: $caips}}}, limit: 500) {
        subject_id
    }
}`;

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * The identity atoms that claim to be one of the listed agents, by their `same as` edge.
 *
 * A line names its agent by atom, not by token id, so this is the join. Anybody can write a
 * `same as` to one of these identities; such an atom is hidden too, which can only hide more of
 * ARP's tests, never somebody else's agent.
 */
export async function fetchHiddenAtomIds(graphqlUrl: string, fetcher: FetchLike = fetch): Promise<Set<string>> {
    const response = await fetcher(graphqlUrl, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
            query: SAME_AS_SUBJECTS,
            variables: {sameAs: INTUITION_SAME_AS_TERM_ID, caips: hiddenCaip19s()},
        }),
    });
    if (!response.ok) throw new Error(`the graph answered ${response.status}`);
    const body: unknown = await response.json();
    const triples =
        typeof body === "object" && body !== null && "data" in body
            ? (body as {data?: {triples?: unknown}}).data?.triples // `data` checked just above.
            : undefined;
    if (!Array.isArray(triples)) throw new Error("the graph answered without triples");
    const ids = new Set<string>();
    for (const row of triples) {
        if (typeof row === "object" && row !== null && "subject_id" in row && typeof row.subject_id === "string") {
            ids.add(row.subject_id.toLowerCase());
        }
    }
    return ids;
}

const cache = new Map<string, Promise<Set<string>>>();

/** Once per graph per page load. A failure is not cached, so the next read asks again. */
export function hiddenAtomIds(graphqlUrl: string, fetcher?: FetchLike): Promise<Set<string>> {
    const known = cache.get(graphqlUrl);
    if (known !== undefined) return known;
    const pending = fetchHiddenAtomIds(graphqlUrl, fetcher).catch((error: unknown) => {
        cache.delete(graphqlUrl);
        throw error;
    });
    cache.set(graphqlUrl, pending);
    return pending;
}

const hiddenAtom = (hidden: ReadonlySet<string>, atomId: string) => hidden.has(atomId.toLowerCase());

export function visibleDeclarations(
    rows: readonly RecentDeclaration[],
    hidden: ReadonlySet<string>,
): RecentDeclaration[] {
    return rows.filter(
        (row) => !hiddenAtom(hidden, row.subject.atomId) && !hiddenAtom(hidden, row.object.atomId),
    );
}

export function visibleStakes(rows: readonly RecentStake[], hidden: ReadonlySet<string>): RecentStake[] {
    return rows.filter(
        (row) =>
            !hiddenAtom(hidden, row.subject.atomId) &&
            !hiddenAtom(hidden, row.object.atomId) &&
            // Whose position it is decides, not who signed: the sponsor signs deposits for testers.
            // A redeem's position is the signer's own, whatever address receives the assets.
            !isHiddenAddress(row.kind === "redeem" ? row.account : (row.receiver ?? row.account)),
    );
}

/**
 * An atom's page without the lines ARP's test agents wrote about it: an edge whose subject is one
 * of them is dropped, and its group's sums are recomputed from what is left. A group left empty
 * goes. What the atom says about itself (its outgoing claims, the catalogue's tags) is untouched.
 */
export function visibleStanding(standing: AtomStanding, hidden: ReadonlySet<string>): AtomStanding {
    let removed = 0;
    const groups = standing.groups.flatMap((group) => {
        const edges = group.edges.filter((edge) => !hiddenAtom(hidden, edge.subject.atomId));
        if (edges.length === group.edges.length) return [group];
        removed += group.edges.length - edges.length;
        if (edges.length === 0) return [];
        return [
            {
                ...group,
                edges,
                assets: edges.reduce((sum, edge) => sum + (edge.support.totalAssets ?? 0n), 0n),
                positions: edges.reduce((sum, edge) => sum + (edge.support.positionCount ?? 0), 0),
            },
        ];
    });
    return removed === 0 ? standing : {...standing, groups, edgeCount: standing.edgeCount - removed};
}

/** Positions held by one of the listed wallets are not shown among a term's backers. */
export function visibleBackers(rows: readonly TermBacker[]): TermBacker[] {
    return rows.filter((row) => !isHiddenAddress(row.account));
}
