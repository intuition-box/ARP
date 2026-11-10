/**
 * What the x402 outcomes feed reads (task 89, ADR `0159`): every payment level, then the levels above
 * it by id, then the reasons on their outcomes. Ordered by id, so a page boundary does not move between
 * two reads of the same graph.
 *
 * `object.data` is selected beside `label` because the index cuts a text atom's label at 256 characters
 * (testnet 13579, 2026-11-10), and a payment level carries the exact URL paid (task 93, ADR `0162`).
 */
const LEVEL = `term_id
        subject_id
        predicate_id
        creator_id
        created_at
        subject {
            term_id
            label
        }
        object {
            term_id
            label
            data
            value {
                thing {
                    url
                }
            }
        }
        positions(where: {shares: {_gt: "0"}}) {
            account_id
        }`;

export const X402_PAYMENT_LEVELS_QUERY = `query X402PaymentLevels($paidWith: String!, $limit: Int!, $offset: Int!) {
    triples(where: {predicate_id: {_eq: $paidWith}}, order_by: {term_id: asc}, limit: $limit, offset: $offset) {
        ${LEVEL}
    }
}`;

export const X402_LEVELS_BY_ID_QUERY = `query X402LevelsById($ids: [String!]!, $limit: Int!) {
    triples(where: {term_id: {_in: $ids}}, limit: $limit) {
        ${LEVEL}
    }
}`;

export const X402_REASONS_QUERY = `query X402Reasons($ids: [String!]!, $because: String!, $limit: Int!) {
    triples(where: {subject_id: {_in: $ids}, predicate_id: {_eq: $because}}, order_by: {term_id: asc}, limit: $limit) {
        ${LEVEL}
    }
}`;
