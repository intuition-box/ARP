/**
 * What an install says when it offers to turn on sharing (task 88, ADR `0157`): one text, so `arp init`, the
 * plugin's first answer, the Desktop setting and the web page say the same thing. Off unless the person
 * agrees. No import: the CLI, the server and the browser all bundle it.
 *
 * It names exactly what leaves (the skill's public address, its category when known, `failed`, a closed reason,
 * and the machine's own ARP address that signs every line) and what never does, and that sending waits for ARP's
 * sponsoring service, which is not online yet.
 */
export const SHARE_OFFER = {
    question: "Share this machine's skill failures as public lines?",
    sends: "When a skill fails here, one public line on Intuition testnet: the skill's public address, its category when known, \"failed\" and a closed reason (missing-key, missing-program, missing-file).",
    signer: "Each line is signed by this machine's own ARP address, created on the first send: it is public and the same on every line, so this machine's lines can be told apart from others' and linked together.",
    never: "Never your prompts, your files, your paths, your code or your keys.",
    service: "Sending goes through ARP's sponsoring service, which is not online yet: until it is, nothing is sent and `arp share send` says so.",
    later: "Off by default. Change it any time with `arp share on` or `arp share off`.",
} as const;

/** The offer as lines of text, in reading order. */
export function shareOfferLines(): string[] {
    return [SHARE_OFFER.sends, SHARE_OFFER.signer, SHARE_OFFER.never, SHARE_OFFER.service, SHARE_OFFER.later];
}
