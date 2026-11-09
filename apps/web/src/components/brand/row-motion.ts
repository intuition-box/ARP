/**
 * The most rows a staggered arrival counts through; row 9 onward arrives with row 8.
 *
 * `--list-step` is 30ms, tuned on three rows. Uncapped that is a six-second wait on two hundred, so
 * the claim field (`ClaimField`, `--row-index`) clamps its dots' order here. The landing's list
 * rows used it too until task 81 replaced them.
 */
export const LIST_CAP = 8;
