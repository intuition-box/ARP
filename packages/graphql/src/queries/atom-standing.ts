import {CAPABILITY_SAMPLE_LIMIT} from "./agent.js";

const VAULT_SIDE = `
    total_market_cap
    total_assets
    vaults(where: {curve_id: {_eq: $curveId}}, limit: 1) {
      market_cap
      total_assets
      total_shares
      current_share_price
      position_count
    }`;

/**
 * One side of an incoming edge: {@link VAULT_SIDE}, and the positions on it that the caller does
 * not hold. `kept` is what the atom page counts as supports (task 144): `position_count` includes
 * the position the sponsoring service opens when it creates an edge, its deposit to itself.
 * Equal to `position_count` when `$exclude` names nobody who holds one: over 200 testnet vaults
 * with a redemption, `position_count` equalled the count of positions with shares (2026-11-12).
 */
const EDGE_SIDE = `${VAULT_SIDE}
    vaults(where: {curve_id: {_eq: $curveId}}, limit: 1) {
      kept: positions_aggregate(where: {account_id: {_nin: $exclude}, shares: {_gt: "0"}}) { aggregate { count } }
    }`;

/**
 * Every triple whose **object** is this atom, with both sides of each edge's market.
 *
 * `$curveId` is `numeric`, never `String!` — declaring it `String!` is rejected at validation time
 * and takes the whole query down. That bug broke the trust surface on 2026-09-16 and no fixture
 * could catch it, because a mocked transport proves the variable was passed and not that the query
 * was valid.
 *
 * No `predicate_id` filter, which is the whole point. `order_by` puts the busiest predicates'
 * edges first so a truncated read loses the quiet tail rather than an arbitrary slice.
 */
export const ATOM_STANDING_QUERY = `
query AtomStanding($atomId: String!, $curveId: numeric!, $limit: Int!, $attestor: [String!]!, $exclude: [String!]!) {
  atom: atoms(where: {term_id: {_eq: $atomId}}, limit: 1) {
    term_id
    label
    data
    type
    value { thing { url } }
    term { ${VAULT_SIDE} }
  }
  triples(
    where: {object_id: {_eq: $atomId}}
    order_by: {term: {total_assets: desc}}
    limit: $limit
  ) {
    term_id
    predicate { term_id label }
    subject { term_id label type }
    term { ${EDGE_SIDE} }
    counter_term { ${EDGE_SIDE} }
  }
  claims: triples(
    where: {subject_id: {_eq: $atomId}}
    order_by: {term: {total_assets: desc}}
    limit: $limit
  ) {
    term_id
    predicate { term_id label }
    object { term_id label type }
    object_term { triple { predicate_id subject { term_id label type } object { label } } }
    term {
      ${VAULT_SIDE}
      vaults(where: {curve_id: {_eq: $curveId}}, limit: 1) {
        positions(where: {account_id: {_in: $attestor}, shares: {_gt: "0"}}, limit: 1) { shares }
      }
    }
  }
}`;

export const AGENT_REF_FOR_ATOM_QUERY = `query AgentRefForAtom($atomId: String!) {
  out: triples(
    where: {subject_id: {_eq: $atomId}, predicate: {label: {_eq: "same as"}}}
    limit: 10
  ) { object { label } }
  back: triples(
    where: {object_id: {_eq: $atomId}, predicate: {label: {_eq: "same as"}}}
    limit: 10
  ) { subject { label } }
}`;

export const DECLARED_MODULES_FOR_QUERY = `query DeclaredModulesFor($subjects: [String!], $predicate: String!, $limit: Int!) {
  triples(
    where: {subject_id: {_in: $subjects}, predicate_id: {_eq: $predicate}}
    limit: $limit
  ) { subject { term_id } object { term_id } object_term { triple { predicate_id subject { term_id } object { label } } } }
}`;

export const LISTED_CAPABILITIES_FOR_QUERY = `query ListedCapabilitiesFor($subject: String!, $predicates: [String!]) {
  atoms(where: {term_id: {_eq: $subject}}, limit: 1) {
    capabilities: as_subject_triples(
      where: {predicate_id: {_in: $predicates}}
      limit: ${CAPABILITY_SAMPLE_LIMIT}
    ) { object { term_id } }
  }
}`;
