import {legalDetailsFrom, type LegalDetails} from "../services/legal";

/**
 * What the hosted site allows (task 74).
 *
 * **Testnet only unless a build says otherwise.** The public test round runs on Intuition testnet
 * 13579, where the token has no value; a switch to mainnet on that site would put a button that
 * deposits real TRUST in front of strangers. A local build that wants the toggle back sets
 * `VITE_ALLOW_MAINNET=1`.
 *
 * Read at call time rather than at module load, so a test can stub it.
 */
export function allowsMainnet(): boolean {
    // Vite types `import.meta.env` keys through an index signature; annotated so `any` stops here.
    const flag: string | undefined = import.meta.env.VITE_ALLOW_MAINNET;
    return flag === "1";
}

/**
 * The legal pages' build variables (`LEGAL_VARIABLES`): the host's details, the contact e-mail and
 * the log retention. Set in the deployment, never committed. Read at call time, so a test can stub them.
 */
export function legalDetails(): LegalDetails {
    // `import.meta.env` is Vite's typed record of the build's variables; read as a plain string map.
    return legalDetailsFrom(import.meta.env as Record<string, string | undefined>);
}
