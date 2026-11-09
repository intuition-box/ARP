import {useState} from "react";

import {useDomainTree} from "../../hooks/use-domain-tree";
import {useProposeCategory} from "../../hooks/use-propose-category";
import {controlClass} from "../../lib/control-class";
import {proposeCategoryMessage} from "../../services/propose-category";

/**
 * File the tool just listed under a category that already exists (task 59, the user's decision of
 * 2026-11-03). Creating a category is for agents, through their signed request (task 73, ADR
 * `0146`), so a person here only picks from the tree.
 *
 * Renders nothing without a sponsor: the public site runs none (task 74), and a step that can only
 * fail is not offered.
 */
export function ChooseCategory({subjectId}: {subjectId: string}) {
    const {options, error} = useDomainTree();
    const proposal = useProposeCategory();
    const [choice, setChoice] = useState("");
    const caption =
        "font-mono text-[length:var(--text-label)] uppercase tracking-[0.08em] text-[color:var(--color-steel)]";

    if (!proposal.available) return null;

    return (
        <form
            className="mt-6 flex flex-col gap-3 border-t border-[color:var(--color-rule)] pt-5"
            onSubmit={(event) => {
                event.preventDefault();
                if (proposal.pending || choice === "") return;
                proposal.submit({label: choice, subjectId});
            }}
        >
            <label htmlFor="start-category" className={caption}>
                Category
            </label>
            <select
                id="start-category"
                value={choice}
                onChange={(event) => setChoice(event.target.value)}
                className="min-w-0 rounded-[var(--radius-control)] border border-[color:var(--color-rule-strong)] bg-[color:var(--color-bg)] px-3.5 py-2.5 text-[14px]"
            >
                <option value="" disabled>
                    Choose one
                </option>
                {/* Sorted by label, not in tree order, so no indent: it would sit under the wrong parent. */}
                {options.map((option) => (
                    <option key={option.label} value={option.label}>
                        {option.label}
                    </option>
                ))}
            </select>
            <div>
                <button
                    type="submit"
                    disabled={proposal.pending || choice === ""}
                    className={controlClass}
                >
                    File it
                </button>
            </div>
            <p
                aria-live="polite"
                className="min-h-5 text-[length:var(--text-body-sm)] text-[color:var(--color-silver)]"
            >
                {proposal.pending
                    ? "Filing…"
                    : proposal.result !== null
                      ? proposeCategoryMessage(proposal.result)
                      : error !== null && "The categories could not be read."}
            </p>
        </form>
    );
}
