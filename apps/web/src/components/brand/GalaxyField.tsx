import {useEffect, useRef} from "react";

import {elbowLine, type Point} from "../atom/claim-field-geometry";
import type {LandingField} from "../../services/landing-field";
import {
    assignStars,
    atomAlpha,
    atomRadius,
    buildStars,
    cameraAt,
    cameraEase,
    cameraFor,
    claimLook,
    clamp,
    fieldVisibility,
    GLIDE,
    joinAt,
    lerp,
    mixHex,
    PHONE_MAX_WIDTH,
    projection,
    READER_INDEX,
    READER_SLOT,
    readingAt,
    RING_NAMES,
    RING_RADII,
    slotOf,
    STAR_TONES,
    starAlpha,
    starRadius,
    SUBJECT,
    WORDS_AT,
    type Camera,
} from "./galaxy-geometry";
import {arrivalOf, useDeck, type DeckState} from "./scene-context";

/**
 * The landing's world: a galaxy of stars, one camera through it, and the claim field of one tool
 * drawn from its stars (task 81, ADR `0152`). It replaced `SourceField`'s dive and seeds.
 *
 * ## What it draws
 *
 * Every word of the public graph is a star. Scenes 1 to 4 pull a few stars out and set them in
 * place around one tool atom as the atom page's claim field (`ClaimField`, `docs/17`): one ring per
 * predicate, one dot per claim, filled when a position stands behind it, sized by position count.
 * **A dot is never created or deleted on screen**: it leaves its star with the star's exact
 * radius, colour and opacity, becomes the claim on the way, and going back turns into the star
 * again where the star was. The user's last correction was about exactly that.
 *
 * ## The rules it obeys
 *
 * - **Canvas 2D, no dependency** (`docs/18` §6): 3,500 points and a few circles.
 * - **No pointer** (`rules/ui.md`): the camera follows the deck's scene, nothing else. The loupe
 *   tours on a clock; the panel row it reads is a fact the page already holds.
 * - **Real data only**: the field is the most declared tool's real claims, or the empty field.
 * - **Saffron** on the subject atom, your agent, and a claim while it is being written or read —
 *   a selected state in motion (ADR `0067`), gone when the motion settles.
 * - **Reduced motion**: every scene jumps to its end state; the loupe holds on the first reading.
 */

type Atom = {
    key: string;
    k: number;
    kind: "tool" | "reader" | "claim";
    label: string | null;
    isId: boolean;
    ring: number;
    positions: number;
    slot: Point;
    /** When it joins in scene 1, in seconds after the camera settles. */
    at: number;
    /** Gone from the data: it glides home and is dropped. */
    leaving: boolean;
    v: number;
    from: number;
    to: number;
    t0: number;
    dur: number;
    hl: number;
    labelA: number;
};

type Palette = {
    ground: string;
    fg: string;
    steel: string;
    accent: string;
    ruleStrong: string;
    track: string;
    mono: string;
};

function readPalette(): Palette {
    const css = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    return {
        ground: token("--color-ground", "#0b0c0d"),
        fg: token("--color-fg", "#e6e8e6"),
        steel: token("--color-steel", "#8a9096"),
        accent: token("--color-accent", "#ffb020"),
        ruleStrong: token("--color-rule-strong", "#43474b"),
        track: token("--color-rule-strong", "#43474b"),
        mono: token("--font-mono", "ui-monospace, monospace"),
    };
}

/** The atoms the field asks for, in the order scene 1 writes them. */
function atomsFor(
    field: LandingField | null,
): Omit<Atom, "v" | "from" | "to" | "t0" | "dur" | "hl" | "labelA" | "leaving">[] {
    const out: Omit<Atom, "v" | "from" | "to" | "t0" | "dur" | "hl" | "labelA" | "leaving">[] = [];
    out.push({
        key: "tool",
        k: 0,
        kind: "tool",
        label: field?.tool?.name ?? null,
        isId: false,
        ring: -1,
        positions: 0,
        slot: SUBJECT,
        at: WORDS_AT.tool,
    });
    const rings = field?.rings ?? [];
    const placed = new Map<
        string,
        {
            ring: number;
            position: number;
            drawn: number;
            claim: (typeof rings)[number]["claims"][number];
        }
    >();
    rings.forEach((ring, r) =>
        ring.claims.forEach((claim, position) =>
            placed.set(claim.key, {ring: r, position, drawn: ring.claims.length, claim}),
        ),
    );
    const line = field?.line ?? null;
    const first: [string | null | undefined, number][] = [
        [line?.keys.agent, WORDS_AT.agent],
        [line?.keys.context, WORDS_AT.context],
        [line?.keys.outcome, WORDS_AT.outcome],
    ];
    const order: [string, number | null][] = [];
    for (const [key, at] of first)
        if (key !== null && key !== undefined && placed.has(key)) order.push([key, at]);
    // The rest, one ring after another in turn, so the field fills evenly.
    const rest = rings.map((ring) =>
        ring.claims.filter((claim) => !order.some(([key]) => key === claim.key)),
    );
    for (let i = 0; rest.some((list) => list.length > i); i += 1) {
        for (const list of rest) {
            const claim = list[i];
            if (claim !== undefined) order.push([claim.key, null]);
        }
    }
    const others = order.filter(([, at]) => at === null).length;
    let j = 0;
    order.forEach(([key, at], index) => {
        const where = placed.get(key);
        if (where === undefined) return;
        out.push({
            key,
            k: index + 1,
            kind: "claim",
            label: where.claim.label,
            isId: where.claim.isId,
            ring: where.ring,
            positions: where.claim.positions,
            slot: slotOf(where.ring, where.position, where.drawn),
            at: at ?? (line === null ? WORDS_AT.context + 0.5 * j : joinAt(j, others)),
        });
        if (at === null) j += 1;
    });
    out.push({
        key: "reader",
        k: READER_INDEX,
        kind: "reader",
        label: "Your agent",
        isId: false,
        ring: -2,
        positions: 0,
        slot: READER_SLOT,
        at: 0,
    });
    return out;
}

export function GalaxyField({
    field,
    beats,
    readRow,
}: {
    field: LandingField | null;
    /** Real lines on the chain: the pulse beats only when there is something to beat for. */
    beats: number;
    /** Scene 2's panel row for a reading, so the loupe's line can run to it. */
    readRow: (index: number) => HTMLElement | null;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const deck = useDeck();
    const live = useRef<{
        deck: DeckState;
        field: LandingField | null;
        beats: number;
        readRow: typeof readRow;
    }>({
        deck,
        field,
        beats,
        readRow,
    });
    useEffect(() => {
        live.current = {deck, field, beats, readRow};
    });

    useEffect(() => {
        const element = canvasRef.current;
        const context = element?.getContext("2d") ?? null;
        if (element === null || element === undefined || context === null) return;
        const canvas: HTMLCanvasElement = element;
        const ctx = context;
        const palette = readPalette();
        const stars = buildStars();
        const starOf = assignStars(stars);
        const beat = new Float32Array(stars.length);

        let width = 0;
        let height = 0;
        let frame = 0;
        let last = performance.now();
        /** Scene 0's beats: one per real line, once each time the pulse is shown. */
        let beatsLeft = 0;
        let nextBeat = 0;

        let seenChange = -1;
        let beatsFor = -1;
        let seenScene = 0;
        let camFrom: Camera = cameraFor(0, window.innerWidth);
        let camTo: Camera = camFrom;
        let camStart = 0;
        let camDur = 1;
        let camNow: Camera = camFrom;

        let seenField: LandingField | null | undefined;
        let atoms: Atom[] = [];
        const loupe = {x: 0, y: 0, set: false, a: 0, reading: -1};
        let emptyA = 0;
        const ringNameA = [0, 0, 0];

        function fit() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const box = canvas.getBoundingClientRect();
            width = box.width;
            height = box.height;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            camFrom = cameraFor(seenScene, window.innerWidth);
            camTo = camFrom;
            camNow = camFrom;
        }

        function syncField(field: LandingField | null) {
            if (field === seenField) return;
            seenField = field;
            const wanted = atomsFor(field);
            const keep = new Map(atoms.map((atom) => [atom.key, atom]));
            const next: Atom[] = [];
            for (const def of wanted) {
                const known = keep.get(def.key);
                keep.delete(def.key);
                next.push(
                    known === undefined
                        ? {
                              ...def,
                              leaving: false,
                              v: 0,
                              from: 0,
                              to: 0,
                              t0: 0,
                              dur: 1,
                              hl: 0,
                              labelA: 0,
                          }
                        : {...known, ...def, k: known.k, leaving: false},
                );
            }
            for (const gone of keep.values())
                if (gone.v > 0.001) next.push({...gone, leaving: true});
            atoms = next;
        }

        function label(
            text: string,
            x: number,
            y: number,
            alpha: number,
            style: {mono: boolean; size: number; colour: string; border: string | null},
        ) {
            if (alpha <= 0.01) return;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `${style.mono ? 500 : 600} ${style.size}px ${style.mono ? palette.mono : "Archivo, system-ui, sans-serif"}`;
            const w = ctx.measureText(text).width;
            const padX = style.border === null ? 0 : 8;
            const boxW = w + padX * 2;
            const boxH = style.size + 8;
            const cx = Math.max(boxW / 2 + 8, Math.min(width - boxW / 2 - 8, x));
            const top = y - boxH;
            if (style.border !== null) {
                ctx.fillStyle = palette.ground;
                ctx.strokeStyle = style.border;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(cx - boxW / 2, top, boxW, boxH, 6);
                ctx.globalAlpha = alpha * 0.85;
                ctx.fill();
                ctx.globalAlpha = alpha;
                ctx.stroke();
            }
            ctx.fillStyle = style.colour;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, cx, top + boxH / 2 + 0.5);
            ctx.restore();
        }

        function draw(now: number) {
            frame = requestAnimationFrame(draw);
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const box = canvas.getBoundingClientRect();
            if (box.bottom <= 0 || box.width === 0) return;
            if (Math.abs(box.width - width) > 0.5 || Math.abs(box.height - height) > 0.5) fit();

            const {deck, field, beats: beatCount, readRow} = live.current;
            const still = deck.still;
            const current = deck.current;
            syncField(field);

            // The camera: a new scene starts a new tween from wherever the camera is now.
            if (deck.changedAt !== seenChange) {
                seenChange = deck.changedAt;
                seenScene = current;
                camFrom = camNow;
                camTo = cameraFor(current, window.innerWidth);
                camStart = deck.changedAt;
                camDur = still ? 0 : Math.max(1, deck.settleMs);
            }
            const k = camDur === 0 ? 1 : clamp((now - camStart) / camDur);
            camNow = cameraAt(camFrom, camTo, cameraEase(k));
            const view = projection(camNow, width, height);
            const vis = fieldVisibility(camNow);
            const since = (now - arrivalOf(deck)) / 1000;
            const mono = current === 4;
            const small = window.innerWidth <= PHONE_MAX_WIDTH;
            const sA = starAlpha(camNow.dim);
            const ease = (rate: number) => (still ? 1 : 1 - Math.exp(-dt * rate));

            ctx.fillStyle = palette.ground;
            ctx.fillRect(0, 0, width, height);

            // The pulse: one beat per real line on the chain, when scene 0 arrives, and then still.
            // No line, no beat; nothing here loops to suggest activity the chain does not have.
            if (deck.changedAt !== beatsFor) {
                beatsFor = deck.changedAt;
                beatsLeft = current === 0 && !still ? Math.min(beatCount, 8) : 0;
                nextBeat = now + 400;
            }
            if (beatsLeft > 0 && now >= nextBeat) {
                beatsLeft -= 1;
                nextBeat = now + 600;
                beat[Math.floor(Math.random() * stars.length)] = 1;
            }

            // Which stars are away, being atoms right now.
            const away = new Set<number>();
            for (const atom of atoms) if (atom.v > 0.001) away.add(starOf[atom.k] ?? -1);

            for (const [i, star] of stars.entries()) {
                if (away.has(i)) continue;
                const X = view.x(star.x);
                const Y = view.y(star.y);
                if (X < -20 || X > width + 20 || Y < -20 || Y > height + 20) continue;
                let r = starRadius(star, view.near);
                let colour: string = STAR_TONES[star.t];
                let a = sA;
                const b = beat[i] ?? 0;
                if (b > 0) {
                    r *= 1 + b * 1.6;
                    colour = palette.fg;
                    a = Math.max(a, b);
                    beat[i] = Math.max(0, b - 0.012);
                }
                ctx.globalAlpha = a;
                ctx.fillStyle = colour;
                ctx.beginPath();
                ctx.arc(X, Y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            const zoom = clamp(Math.sqrt(view.scale / 12), 0.55, 1.25);
            const cx = view.x(SUBJECT.x);
            const cy = view.y(SUBJECT.y);
            const claims = atoms.filter((atom) => atom.kind === "claim" && !atom.leaving);

            // The rings, as their atoms arrive. With no claim at all, the empty field: one dashed
            // ring, as `ClaimField`'s `arp-cf-zero` draws it.
            const ringA =
                clamp(
                    Math.max(0, ...atoms.filter((a) => a.kind === "claim").map((a) => a.v)) * 1.2,
                ) * vis;
            ctx.strokeStyle = palette.track;
            ctx.lineWidth = 1;
            RING_RADII.forEach((r, ring) => {
                if (!atoms.some((a) => a.kind === "claim" && a.ring === ring)) return;
                ctx.globalAlpha = ringA;
                ctx.beginPath();
                ctx.arc(cx, cy, r * view.scale, 0, Math.PI * 2);
                ctx.stroke();
            });
            emptyA = lerp(
                emptyA,
                claims.length === 0 && current >= 1 && current <= 4 && field !== null ? vis : 0,
                ease(5),
            );
            if (emptyA > 0.01) {
                ctx.globalAlpha = emptyA;
                ctx.setLineDash([3, 4]);
                ctx.beginPath();
                ctx.arc(cx, cy, RING_RADII[2] * view.scale, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.globalAlpha = 1;

            const readings = field?.readings ?? [];
            const reading = current === 2 ? readingAt(since, readings.length, still) : -1;
            const readKey = reading >= 0 ? readings[reading]?.claimKey : undefined;

            const n = atoms.length;
            const where = new Map<string, {x: number; y: number; r: number}>();
            for (const [order, atom] of atoms.entries()) {
                let target = 0;
                if (!atom.leaving) {
                    if (atom.kind === "reader") target = current >= 2 && current <= 4 ? 1 : 0;
                    else if (current === 1)
                        target = still || deck.previous >= 2 || since > atom.at ? 1 : 0;
                    else if (current >= 2 && current <= 4) target = 1;
                }
                if (target !== atom.to) {
                    atom.from = atom.v;
                    atom.to = target;
                    // By place in the list, last written first. Not by `k`: your agent's slot is
                    // the last index, and a delay below zero would start it half way home.
                    atom.t0 =
                        now + (target === 0 && !still ? (n - 1 - order) * GLIDE.staggerMs : 0);
                    atom.dur = target === 1 ? GLIDE.inMs : GLIDE.outMs;
                }
                const q = still ? 1 : clamp((now - atom.t0) / atom.dur);
                atom.v = lerp(atom.from, atom.to, cameraEase(q));
                if (atom.v <= 0.001) continue;

                const star = stars[starOf[atom.k] ?? -1];
                if (star === undefined) continue;
                const e = atom.v;
                const X = view.x(lerp(star.x, atom.slot.x, e));
                const Y = view.y(lerp(star.y, atom.slot.y, e));
                const look = claimLook(e);
                const starR = starRadius(star, view.near);
                const starTone = STAR_TONES[star.t];
                const alpha = atomAlpha(e, sA, vis);
                const lit =
                    !mono &&
                    atom.kind === "claim" &&
                    ((current === 1 && !still && since > atom.at + 0.6 && since < atom.at + 1.8) ||
                        (readKey !== undefined && readKey === atom.key));
                atom.hl += ((lit ? 1 : 0) - atom.hl) * ease(7);
                const r = atomRadius(e, starR, {
                    kind: atom.kind,
                    positions: atom.positions,
                    lit: atom.hl,
                    zoom,
                });
                where.set(atom.key, {x: X, y: Y, r});

                if (atom.kind !== "claim") {
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = mixHex(starTone, mono ? palette.steel : palette.accent, look);
                    ctx.beginPath();
                    ctx.arc(X, Y, r, 0, Math.PI * 2);
                    ctx.fill();
                    continue;
                }
                const filled = atom.positions > 0;
                const restTone = filled ? (mono ? palette.steel : palette.fg) : palette.steel;
                const tone = atom.hl > 0.05 ? palette.accent : restTone;
                // The star's light fades as the claim's outline, and its fill when a position stands
                // behind it, come in.
                const fillA = filled || atom.hl > 0.05 ? 1 : 1 - look;
                ctx.globalAlpha = alpha * fillA;
                ctx.fillStyle =
                    atom.hl > 0.05
                        ? mixHex(filled ? palette.fg : palette.ground, palette.accent, atom.hl)
                        : mixHex(
                              starTone,
                              filled ? (mono ? palette.steel : palette.fg) : starTone,
                              look,
                          );
                ctx.beginPath();
                ctx.arc(X, Y, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = alpha * look;
                ctx.strokeStyle = tone;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(X, Y, Math.max(0.5, r - 0.75), 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            atoms = atoms.filter((atom) => !(atom.leaving && atom.v <= 0.001 && atom.to === 0));

            // The loupe, in scene 2: it glides to the claim being read, and its line leaves the
            // rim at 35°, then runs level to the panel row that says it.
            const target = readKey === undefined ? undefined : where.get(readKey);
            loupe.a += ((target !== undefined ? 1 : 0) - loupe.a) * ease(6);
            if (target !== undefined) {
                if (!loupe.set) {
                    loupe.x = target.x;
                    loupe.y = target.y;
                    loupe.set = true;
                }
                loupe.reading = reading;
                const f = still ? 1 : 1 - Math.exp((-dt * 1000) / 160);
                loupe.x += (target.x - loupe.x) * f;
                loupe.y += (target.y - loupe.y) * f;
            } else if (loupe.a <= 0.02) {
                loupe.set = false;
            }
            if (loupe.a > 0.02 && loupe.set) {
                const R = 15 * zoom;
                const row = readRow(loupe.reading);
                const panel = row?.closest<HTMLElement>("[data-panel]") ?? null;
                ctx.globalAlpha = loupe.a;
                if (row !== null && panel !== null) {
                    const rr = row.getBoundingClientRect();
                    const pr = panel.getBoundingClientRect();
                    // Beside the field (desktop) the line runs level to the row it reads. Above it (a
                    // phone) it rises to the panel's lower edge and runs a short way along it, so it
                    // never hooks round the side of the screen.
                    const above = pr.bottom - box.top < loupe.y - R;
                    const barY = above ? pr.bottom - box.top : rr.top + rr.height / 2 - box.top;
                    const rise = Math.abs(loupe.y - barY) / Math.tan((35 * Math.PI) / 180);
                    const endX = above
                        ? Math.min(pr.right - box.left - 16, loupe.x + rise + 28)
                        : pr.left - box.left;
                    const [start, corner, end] = elbowLine(
                        {x: loupe.x, y: loupe.y},
                        {radius: R, barY, endX, cornerMaxX: endX - 14},
                    );
                    ctx.strokeStyle = palette.steel;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(corner.x, corner.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.stroke();
                }
                ctx.strokeStyle = palette.accent;
                ctx.lineWidth = 1.25;
                ctx.beginPath();
                ctx.arc(loupe.x, loupe.y, R, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Each ring names itself at twelve o'clock.
            RING_NAMES.forEach((name, ring) => {
                const shown =
                    atoms.some((a) => a.kind === "claim" && a.ring === ring && a.v > 0.6) &&
                    current >= 1 &&
                    current <= 3 &&
                    vis > 0.5 &&
                    !(small && current !== 1 && ring !== 2);
                ringNameA[ring] = lerp(ringNameA[ring] ?? 0, shown ? 1 : 0, ease(10));
                const r = RING_RADII[ring] ?? 0;
                ctx.save();
                ctx.letterSpacing = "1.5px";
                label(name.toUpperCase(), cx, cy - r * view.scale - 6, ringNameA[ring] ?? 0, {
                    mono: true,
                    size: 11,
                    colour: palette.steel,
                    border: null,
                });
                ctx.restore();
            });

            // The words beside their dots.
            const line = field?.line ?? null;
            for (const atom of atoms) {
                const at = where.get(atom.key);
                let show = current >= 1 && current <= 3 && vis > 0.5;
                if (atom.kind === "tool") show = current >= 1 && current <= 4;
                if (atom.kind === "reader") show = current === 2 || current === 3;
                if (current === 2 && atom.kind === "claim") show = show && readKey === atom.key;
                if (current === 3 && atom.kind === "claim") show = false;
                // Scene 1 names only the line's own words and the claim being written: six agents'
                // ids side by side cover each other and the ring's name.
                const ownWord =
                    atom.key === line?.keys.agent ||
                    atom.key === line?.keys.context ||
                    atom.key === line?.keys.outcome;
                if (current === 1 && atom.kind === "claim" && !ownWord && atom.hl < 0.3)
                    show = false;
                show =
                    show &&
                    at !== undefined &&
                    atom.v > 0.8 &&
                    atom.label !== null &&
                    !atom.leaving;
                atom.labelA = lerp(atom.labelA, show ? 1 : 0, ease(10));
                if (at === undefined || atom.label === null) continue;
                if (atom.kind === "tool") {
                    label(atom.label, at.x, at.y - at.r - 8, atom.labelA, {
                        mono: true,
                        size: 12,
                        colour: palette.fg,
                        border: palette.ruleStrong,
                    });
                } else if (atom.kind === "reader") {
                    label(atom.label, at.x, at.y - at.r - 6, atom.labelA, {
                        mono: true,
                        size: 11.5,
                        colour: palette.fg,
                        border: palette.accent,
                    });
                } else {
                    label(atom.label, at.x, at.y - at.r - 4, atom.labelA, {
                        mono: true,
                        size: 11,
                        colour: atom.hl > 0.05 ? palette.fg : palette.steel,
                        border: palette.ruleStrong,
                    });
                }
            }
        }

        fit();
        frame = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(frame);
    }, []);

    return <canvas ref={canvasRef} className="arp-gx-canvas" aria-hidden="true" />;
}
