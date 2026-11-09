/** The subjects of the `same as` edges pointing at atoms with one of the given labels. The
 *  predicate's id arrives as a variable: this package names no term (ADR `0082`). */
export const SAME_AS_SUBJECTS_QUERY = `
query SameAsSubjects($sameAs: String!, $labels: [String!]!) {
  triples(where: {predicate_id: {_eq: $sameAs}, object: {label: {_in: $labels}}}, limit: 500) {
    subject_id
  }
}`;
