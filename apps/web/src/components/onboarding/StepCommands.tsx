import {useState} from "react";

import {SHARE_OFFER, shareOfferLines} from "@arp-protocol/core";

import {Install} from "../atom/AtomPageParts";
import {Hint} from "../brand/Hint";
import type {StartStep} from "../../services/start-steps";

/** The steps that install ARP: they offer sharing (task 88, ADR `0157`). */
const INSTALL_STEPS = new Set(["init", "connect"]);

/**
 * A step's commands, and for an install step the sharing offer: a checkbox, unticked, that changes the
 * commands shown. `arp init` takes `--share`; the Claude Code plugin has no install flag, so the person types
 * `/arp:share-on` once it is installed. Nothing is stored or sent from this page.
 */
export function StepCommands({step}: {step: StartStep}) {
    const [share, setShare] = useState(false);
    const commands = step.commands ?? [];
    const offers = INSTALL_STEPS.has(step.id) && commands.length > 0;
    const shown = offers && share && step.id === "init"
        ? commands.map((command) => (command.endsWith(" init") ? `${command} --share` : command))
        : commands;
    // The plugin takes no install flag: the person types this in Claude Code once it is installed.
    const typed = offers && share && step.id === "connect" ? "/arp:share-on" : null;
    const id = `share-${step.id}`;
    return (
        <>
            {shown.map((command) => (
                <Install key={command} command={command} />
            ))}
            {typed !== null && <Install command={typed} prompt="›" />}
            {offers && (
                <div className="mt-3 flex items-center gap-2 text-[length:var(--text-body-sm)] text-[color:var(--color-silver)]">
                    <input
                        id={id}
                        type="checkbox"
                        checked={share}
                        onChange={(event) => setShare(event.target.checked)}
                        className="accent-[color:var(--color-accent)]"
                    />
                    <label htmlFor={id}>{SHARE_OFFER.question}</label>
                    <Hint label="What sharing sends">{shareOfferLines().join(" ")}</Hint>
                </div>
            )}
        </>
    );
}
