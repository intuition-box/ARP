import type {ReactNode} from "react";

/**
 * One choice out of a few, as a list in the tools rail: the same rows as `DomainRail`, so the
 * index, the order and the domains read as one column (user, 2026-11-09). Buttons with
 * `aria-pressed`, one pressed at a time.
 */
export function RailChoice<Id extends string>({
    label,
    options,
    selected,
    onChange,
    aside,
}: {
    label: string;
    /** `count` is `null` while unknown, shown as "—"; left out, the row shows none. */
    options: readonly {id: Id; label: string; title?: string; count?: number | null}[];
    selected: Id;
    onChange: (next: Id) => void;
    /** Beside the heading, right-aligned: a `Hint` or a short state. */
    aside?: ReactNode;
}) {
    return (
        <div role="group" aria-label={label}>
            <div className="flex items-baseline justify-between gap-3 border-b border-[color:var(--color-rule-strong)] pb-2">
                <h2 className="font-mono text-[length:var(--text-label)] tracking-[0.08em] text-[color:var(--color-steel)] uppercase">
                    {label}
                </h2>
                {aside}
            </div>
            <ul className="mt-1">
                {options.map((option) => {
                    const isOn = option.id === selected;
                    return (
                        <li key={option.id}>
                            <button
                                type="button"
                                aria-pressed={isOn}
                                onClick={() => onChange(option.id)}
                                {...(option.title === undefined ? {} : {title: option.title})}
                                // Banged for the same reason as `DomainRail`: the unlayered
                                // `button` block in `index.css` beats any utility.
                                className={`flex w-full items-baseline justify-between gap-3 border-0! px-0! py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--color-accent)] ${
                                    isOn
                                        ? "bg-transparent! text-[color:var(--color-accent)]!"
                                        : "bg-transparent! text-[color:var(--color-silver)]! hover:text-[color:var(--color-fg)]!"
                                }`}
                            >
                                <span className="min-w-0 truncate text-[length:var(--text-body-sm)]">
                                    {option.label}
                                </span>
                                {option.count === undefined ? null : (
                                    <span className="shrink-0 font-mono text-[length:var(--text-label)] tabular-nums text-[color:var(--color-steel)]">
                                        {option.count === null
                                            ? "—"
                                            : option.count.toLocaleString("en-US")}
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
