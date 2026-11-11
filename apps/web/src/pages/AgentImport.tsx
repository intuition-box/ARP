import {useId, useRef, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {useAccount, useSwitchChain} from "wagmi";

import {DEFAULT_IDENTITY_REGISTRY, type IdentityAtomPlan} from "@arp-protocol/core";

import {Hint} from "../components/brand/Hint";
import {
    consentStatus,
    proofStatus,
    provenPhase,
    signedConsent,
    withError,
    writeError,
    writePlan,
    writeResult,
    writeStatus,
    type Phase,
    type ProvenAgent,
    type ProvenPhase,
} from "../components/import/import-phase";
import {
    ConsentPreview,
    LinkPlan,
    Proof,
    Published,
    Refusal,
} from "../components/import/ImportResults";
import {Failure, Field, labelClass, Step} from "../components/import/ImportStep";
import {MissingIdentityAtom} from "../components/import/MissingIdentityAtom";
import {ConnectPrompt} from "../components/onboarding/ConnectPrompt";
import {controlClass} from "../lib/control-class";
import {useAgentImport} from "../hooks/use-agent-import";
import {choiceFor} from "../lib/chain-choice";
import {intuitionTestnet} from "../lib/chains";
import {identityRegistryFor} from "../lib/deployments";
import {buildImportConsent, type ImportConsent, type ImportedAgent} from "../services/agent-import";
import {formatTrust, truncateMiddle} from "../services/trust-format";

/**
 * The "yes" branch of `/start/agent` — rendered inside `StartPage`, not routed to.
 *
 * The rest of `/start/agent` mints a new ERC-8004 identity. This page takes one that already
 * exists, so nothing is minted here and the page says so where an operator would reasonably expect
 * otherwise.
 *
 * Three steps, each requiring a click, nothing advancing on its own:
 *
 *   1. **Prove it is yours.** The registry names the owner. We read it and
 *      compare. That is the whole proof — no bridge, no cross-chain message.
 *   2. **Say so.** An EIP-712 statement naming the agent, the account that will
 *      act for it, the ARP context and a nonce. Consent, and the record of it.
 *   3. **Publish the link.** One `same as` edge on the selected Intuition chain, from the
 *      agent's canonical atom to the operating account's CAIP-10. Without it a
 *      tool stake is attributable to an address and to nothing else, and agent
 *      reputation — half of `docs/12` — has nothing to attach to.
 */

/**
 * Intuition testnet 13579 is the one chain an agent is imported from today: a mint on testnet lands
 * there, so a mint followed by "link your agent wallet" ends here. Base, BSC and Ethereum are shown
 * and not offered (the user, 2026-11-11, task 129): their agents are real, and importing them is not
 * released yet. Every read and write of the import is on 13579 whatever the site's chain toggle says,
 * so a testnet agent's record can never be priced or written on mainnet.
 */
const TESTNET_CHAIN_ID = intuitionTestnet.id;
const IMPORT_CHAIN = choiceFor(false);
const LOOKUP_CHAINS: {id: number; label: string; note: string; soon?: true}[] = [
    {
        id: TESTNET_CHAIN_ID,
        label: "Intuition Testnet (13579)",
        note: "where an agent minted on testnet lands",
    },
    {id: 8453, label: "Base (8453) · soon to be released", note: "", soon: true},
    {id: 56, label: "BSC (56) · soon to be released", note: "", soon: true},
    {id: 1, label: "Ethereum (1) · soon to be released", note: "", soon: true},
];

/** The registry a chain's agents live in: ARP's own on 13579, the canonical one elsewhere. */
function registryOf(chainId: number) {
    return identityRegistryFor(chainId) ?? DEFAULT_IDENTITY_REGISTRY;
}

/**
 * `?chain=13579&id=40`, as a testnet mint links here. A chain not offered drops the id as well: a
 * Base token id read against 13579 would name a different agent.
 */
function prefillOf(params: URLSearchParams): {chainId: number; tokenId: string} {
    const chain = Number(params.get("chain"));
    const id = params.get("id") ?? "";
    const offered = LOOKUP_CHAINS.some(
        (option) => option.id === chain && option.soon === undefined,
    );
    if (!offered) return {chainId: TESTNET_CHAIN_ID, tokenId: ""};
    return {chainId: chain, tokenId: /^\d+$/.test(id) ? id : ""};
}

const inputClass =
    "mt-2 block w-full bg-transparent border border-[color:var(--color-rule-strong)] px-3 py-1.5 " +
    "font-mono focus:border-[color:var(--color-accent)]";

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * The agent's atom, taken from the identity plan once its record is on chain (task 129). The graph
 * finds an agent by its record's name, and a record written from this page is not pinned, so the
 * graph cannot name it yet; the plan already holds its id, which is the one resolution would return.
 */
function withAtom(current: ProvenPhase, plan: IdentityAtomPlan): ProvenPhase {
    return {
        ...current,
        proven: {
            ...current.proven,
            atom: {atomId: plan.identityAtom, label: null, caip19: plan.caip19},
        },
    };
}

export function AgentImport() {
    const {address: connected, isConnected, chainId: walletChainId} = useAccount();
    const {switchChainAsync, isPending: isSwitching} = useSwitchChain();
    const actions = useAgentImport();
    const fieldId = useId();

    const [searchParams] = useSearchParams();
    const [prefill] = useState(() => prefillOf(searchParams));
    const [chainId, setChainId] = useState(prefill.chainId);
    const [tokenId, setTokenId] = useState(prefill.tokenId);
    const [phase, setPhase] = useState<Phase>({step: "idle"});
    /**
     * Bumped by every check and every edit to the chain or token, so a registry reply that lands
     * after either is dropped instead of proving a token no longer on screen.
     */
    const checkRef = useRef(0);

    function resetCheck() {
        checkRef.current += 1;
        setPhase({step: "idle"});
    }

    const trimmedToken = tokenId.trim();
    const isTokenValid = /^\d+$/.test(trimmedToken);
    const chain = IMPORT_CHAIN;
    const onTargetChain = walletChainId === chain.chainId;

    const proven: ProvenAgent | null = phase.step === "proven" ? phase.proven : null;
    const consent = phase.step === "proven" ? phase.consent : null;
    const signed = consent === null ? null : signedConsent(consent);
    const link = phase.step === "proven" ? phase.link : null;
    const plan = link === null ? null : writePlan(link);
    const txs = link === null ? null : writeResult(link);
    const linkStatus = link === null ? "idle" : writeStatus(link);
    const linkError = link === null ? null : writeError(link);
    const consentError = consent?.stage === "unsigned" ? consent.error : null;

    /**
     * Applies `update` to the proven phase only while it is still the one `proven` came from. A
     * reply that lands after the operator checked another token is dropped, not grafted onto it.
     */
    function updateProven(from: ProvenAgent, update: (current: ProvenPhase) => ProvenPhase) {
        setPhase((current) =>
            current.step === "proven" && current.proven === from ? update(current) : current,
        );
    }

    /**
     * The import, complete enough to write from.
     *
     * Composed rather than stored, so the type itself refuses the one
     * combination that must not reach the chain: a link with no canonical atom
     * to hang it on. An agent the graph does not mirror can still be proven and
     * consented to; it simply never produces one of these.
     */
    const imported: ImportedAgent | null =
        proven === null || proven.atom === null || signed === null
            ? null
            : {
                  ref: {
                      chainId: proven.chainId,
                      tokenId: proven.tokenId,
                      registry: registryOf(proven.chainId),
                  },
                  caip19: proven.caip19,
                  owner: proven.owner,
                  agentAtomId: proven.atom.atomId,
                  agentLabel: proven.atom.label,
                  operatingAccount: proven.operatingAccount,
                  ...signed,
              };

    /** The graph does not mirror this agent, so step 3 explains instead of acting. */
    const hasNoCanonicalAtom = proven !== null && proven.atom === null;

    const pendingConsent: ImportConsent | null =
        proven === null
            ? null
            : buildImportConsent({
                  caip19: proven.caip19,
                  operator: proven.owner,
                  operatingAccount: proven.operatingAccount,
                  // Fixed within a render so the preview below shows the values
                  // that will actually be signed; a fresh nonce is drawn when
                  // the operator clicks.
                  nonce: 0n,
                  issuedAt: 0n,
              });

    async function handleCheckOwnership() {
        if (!connected || !isTokenValid) return;
        checkRef.current += 1;
        const check = checkRef.current;
        const settle = (next: Phase) => {
            if (checkRef.current === check) setPhase(next);
        };
        setPhase({step: "checking"});
        try {
            const verdict = await actions.verifyOwnership({
                chainId,
                registry: registryOf(chainId),
                tokenId: trimmedToken,
                connected,
            });
            if (verdict.status !== "owned") {
                settle({step: "refused", verdict});
                return;
            }
            const [atom, operatingAccount] = await Promise.all([
                actions.resolveAtom({
                    chainId,
                    tokenId: trimmedToken,
                    registry: registryOf(chainId),
                }),
                actions.deriveOperatingAccount(verdict.owner),
            ]);
            settle(
                provenPhase({
                    chainId,
                    tokenId: trimmedToken,
                    caip19: verdict.caip19,
                    owner: verdict.owner,
                    atom,
                    operatingAccount,
                }),
            );
        } catch (error) {
            settle({step: "check-failed", message: errorMessage(error)});
        }
    }

    async function handleSignConsent() {
        if (proven === null) return;
        updateProven(proven, (current) => ({
            ...current,
            consent: {stage: "signing", previous: signedConsent(current.consent)},
        }));
        try {
            const next = buildImportConsent({
                caip19: proven.caip19,
                operator: proven.owner,
                operatingAccount: proven.operatingAccount,
            });
            const {signature, chainId: signedOnChainId} = await actions.signConsent(next);
            updateProven(proven, (current) => ({
                ...current,
                consent: {stage: "signed", signed: {consent: next, signature, signedOnChainId}},
            }));
        } catch (error) {
            updateProven(proven, (current) => ({
                ...current,
                consent: {
                    stage: "unsigned",
                    error: errorMessage(error),
                    previous: signedConsent(current.consent),
                },
            }));
        }
    }

    async function handlePlanLink() {
        if (proven === null || imported === null) return;
        updateProven(proven, (current) => ({...current, link: {stage: "pricing"}}));
        try {
            const priced = await actions.planLink(imported);
            updateProven(proven, (current) => ({
                ...current,
                link: {stage: "priced", plan: priced, error: null},
            }));
        } catch (error) {
            updateProven(proven, (current) => ({
                ...current,
                link: {stage: "unpriced", error: errorMessage(error)},
            }));
        }
    }

    async function handlePublishLink() {
        if (proven === null || imported === null || plan === null) return;
        updateProven(proven, (current) => ({...current, link: {stage: "sending", plan}}));
        try {
            const result = await actions.publishLink({imported, plan});
            updateProven(proven, (current) => ({
                ...current,
                link: {stage: "sent", plan, result},
            }));
        } catch (error) {
            updateProven(proven, (current) => ({
                ...current,
                link: {stage: "priced", plan, error: errorMessage(error)},
            }));
        }
    }

    async function handlePlanIdentity() {
        if (proven === null) return;
        updateProven(proven, (current) => ({...current, identity: {stage: "pricing"}}));
        try {
            const priced = await actions.planIdentity({
                chainId: proven.chainId,
                tokenId: proven.tokenId,
                registry: registryOf(proven.chainId),
            });
            updateProven(proven, (current) =>
                priced.calls.length === 0
                    ? withAtom(current, priced)
                    : {...current, identity: {stage: "priced", plan: priced, error: null}},
            );
        } catch (error) {
            updateProven(proven, (current) => ({
                ...current,
                identity: {stage: "unpriced", error: errorMessage(error)},
            }));
        }
    }

    async function handlePublishIdentity() {
        if (phase.step !== "proven") return;
        const identityPlan = writePlan(phase.identity);
        if (identityPlan === null) return;
        const from = phase.proven;
        updateProven(from, (current) => ({
            ...current,
            identity: {stage: "sending", plan: identityPlan},
        }));
        try {
            const result = await actions.publishIdentity(identityPlan);
            // Read back rather than trust the receipts: a write that passed simulation can still
            // revert, and only a plan with nothing left to send proves every term is on chain.
            const after = await actions.planIdentity({
                chainId: from.chainId,
                tokenId: from.tokenId,
                registry: registryOf(from.chainId),
            });
            updateProven(from, (current) => {
                const sent: ProvenPhase = {
                    ...current,
                    identity: {stage: "sent", plan: identityPlan, result: result.txs},
                };
                return after.calls.length === 0
                    ? withAtom(sent, after)
                    : {
                          ...current,
                          identity: {
                              stage: "priced",
                              plan: after,
                              error: "Part of the record is not on chain yet. Write it again.",
                          },
                      };
            });
        } catch (error) {
            updateProven(from, (current) => ({
                ...current,
                identity: {stage: "priced", plan: identityPlan, error: errorMessage(error)},
            }));
        }
    }

    async function handleSwitchChain() {
        if (proven !== null) {
            updateProven(proven, (current) => ({...current, link: withError(current.link, null)}));
        }
        try {
            await switchChainAsync({chainId: chain.chainId});
        } catch (error) {
            if (proven === null) return;
            updateProven(proven, (current) => ({
                ...current,
                link: withError(current.link, errorMessage(error)),
            }));
        }
    }

    return (
        <section>
            {/* An h2: `/start/agent` carries the page's h1 (task 62). */}
            <header className="mb-12">
                <h2 className="type-face text-[28px] leading-none">
                    Import an agent you already have
                </h2>
                <p className="mt-3 max-w-[64ch] text-[color:var(--color-steel)]">
                    Nothing is minted. One link gets published: your agent, tied to the agent wallet
                    that will give support on its behalf.
                </p>
            </header>

            <Step
                index={1}
                title="Prove the agent is yours"
                status={proofStatus(phase)}
                result={
                    phase.step === "check-failed" ? (
                        <Failure message={phase.message} />
                    ) : phase.step === "refused" ? (
                        <Refusal verdict={phase.verdict} />
                    ) : proven !== null ? (
                        <Proof proven={proven} />
                    ) : null
                }
            >
                <form
                    className="max-w-[26rem]"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void handleCheckOwnership();
                    }}
                >
                    <div>
                        <label htmlFor={`${fieldId}-chain`} className={labelClass}>
                            Registry chain
                        </label>
                        <select
                            id={`${fieldId}-chain`}
                            value={chainId}
                            onChange={(event) => {
                                setChainId(Number(event.target.value));
                                resetCheck();
                            }}
                            aria-describedby={`${fieldId}-chain-note`}
                            className={`${inputClass} text-[length:var(--text-body-sm)]`}
                        >
                            {LOOKUP_CHAINS.map((chain) => (
                                <option key={chain.id} value={chain.id} disabled={chain.soon}>
                                    {chain.label}
                                </option>
                            ))}
                        </select>
                        <p
                            id={`${fieldId}-chain-note`}
                            className="mt-2 text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]"
                        >
                            {LOOKUP_CHAINS.find((chain) => chain.id === chainId)?.note}
                        </p>
                    </div>

                    <div className="mt-5">
                        <label htmlFor={`${fieldId}-token`} className={labelClass}>
                            Token id
                        </label>
                        <input
                            id={`${fieldId}-token`}
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={tokenId}
                            onChange={(event) => {
                                setTokenId(event.target.value);
                                resetCheck();
                            }}
                            aria-invalid={trimmedToken !== "" && !isTokenValid}
                            aria-describedby={`${fieldId}-token-help`}
                            className={inputClass}
                        />
                        <p
                            id={`${fieldId}-token-help`}
                            className="mt-2 text-[length:var(--text-body-sm)]"
                        >
                            {trimmedToken !== "" && !isTokenValid
                                ? "Token ids are decimal, for example 2340."
                                : ""}
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={!isConnected || !isTokenValid || phase.step === "checking"}
                        className={`mt-3 ${controlClass}`}
                    >
                        {phase.step === "checking" ? "Reading the registry…" : "Check ownership"}
                    </button>
                    {!isConnected ? (
                        <ConnectPrompt
                            label="Connect the wallet that owns the agent"
                            className="mt-3"
                        />
                    ) : null}
                </form>
            </Step>

            <Step
                index={2}
                title="Sign the statement"
                status={consent === null ? "idle" : consentStatus(consent)}
                disabled={proven === null}
                result={
                    consentError !== null ? (
                        <Failure message={consentError} />
                    ) : signed !== null ? (
                        <Field label="Signature" value={truncateMiddle(signed.signature, 14, 10)} />
                    ) : null
                }
            >
                {pendingConsent !== null ? <ConsentPreview consent={pendingConsent} /> : null}

                <button
                    type="button"
                    onClick={() => void handleSignConsent()}
                    disabled={proven === null || consent?.stage === "signing"}
                    className={`mt-6 ${controlClass}`}
                >
                    {consent?.stage === "signing"
                        ? "Waiting for your wallet…"
                        : "Sign the statement"}
                </button>
            </Step>

            <Step
                index={3}
                title="Publish the link"
                status={linkStatus}
                disabled={imported === null && !hasNoCanonicalAtom}
                result={
                    linkError !== null ? (
                        <Failure message={linkError} />
                    ) : txs !== null ? (
                        <Published txs={txs} explorerUrl={chain.explorerUrl} />
                    ) : null
                }
            >
                {phase.step === "proven" && phase.proven.atom === null ? (
                    <MissingIdentityAtom
                        write={phase.identity}
                        onTargetChain={onTargetChain}
                        chain={chain}
                        walletChainId={walletChainId}
                        isSwitching={isSwitching}
                        onSwitchChain={() => void handleSwitchChain()}
                        onPlan={() => void handlePlanIdentity()}
                        onPublish={() => void handlePublishIdentity()}
                    />
                ) : (
                    <>
                        <p className="mb-6 max-w-[64ch] text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                            One public link on {chain.chain.name}, paid in {chain.symbol}: your
                            agent and your agent wallet are the same.{" "}
                            <Hint label="What gets written">
                                <span className="font-mono">
                                    (agent atom, same as, CAIP-10 of your Smart Account)
                                </span>
                            </Hint>
                        </p>

                        {plan === null ? (
                            <button
                                type="button"
                                onClick={() => void handlePlanLink()}
                                disabled={imported === null || linkStatus === "pending"}
                                className={controlClass}
                            >
                                {linkStatus === "pending" ? "Pricing…" : "Price the link"}
                            </button>
                        ) : (
                            <LinkPlan plan={plan} />
                        )}

                        {plan !== null && txs === null ? (
                            !onTargetChain ? (
                                <div className="mt-6">
                                    <p className="max-w-[64ch] text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                                        Your wallet is on chain {walletChainId ?? "unknown"}. The
                                        write lands on {chain.chain.name} ({chain.chainId}).
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => void handleSwitchChain()}
                                        disabled={isSwitching}
                                        className={`mt-3 ${controlClass}`}
                                    >
                                        {isSwitching
                                            ? "Switching…"
                                            : `Switch to ${chain.chain.name}`}
                                    </button>
                                </div>
                            ) : plan.totalCost === 0n ? (
                                <p className="mt-6 max-w-[64ch] text-[length:var(--text-body-sm)]">
                                    This link is already public. There is nothing to send.
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => void handlePublishLink()}
                                    disabled={linkStatus === "pending" || imported === null}
                                    className={`mt-6 ${controlClass}`}
                                >
                                    {linkStatus === "pending"
                                        ? "Waiting for your wallet…"
                                        : `Publish the link — ${formatTrust(plan.totalCost)} ${plan.chain.symbol}`}
                                </button>
                            )
                        ) : null}
                    </>
                )}
            </Step>

            {/* The rest — Smart Account, delegation, stakes — is not wired for an imported agent:
                `/agent` only recognises ARP's testnet registry and the delegation contracts are
                not on mainnet (ADR `0025`). That is a roadmap, so only the part a reader would
                walk into is on screen. */}
            <section className="mt-16 pl-5 border-l border-l-[color:var(--color-rule-strong)]">
                <p className="max-w-[64ch] text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                    Permissions and support are not wired for an imported agent yet.
                </p>
            </section>
        </section>
    );
}
