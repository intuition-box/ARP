/**
 * Render the plugin's icon from the Source mark (task 107): `assets/icon.svg`, then `assets/icon.png`
 * at 1024 × 1024 through `rsvg-convert`. `bun run packages` copies the PNG into the plugin; it does not
 * render it, so `--check` needs no rasteriser.
 *
 *     bun scripts/plugin-icon.ts
 *
 * The geometry is `docs/design/brand/v1/HANDOFF.md` §2, the table `SourceMark.tsx` in `apps/web`
 * generates the logo from: dot k of a ring of n at `2πk/n − π/2`, all three rings at this size. The
 * ground is `--color-ground`. Anthropic's plugin directory takes a square PNG of 512 to 2048 px once,
 * the first time the plugin is saved or submitted (`claude plugin validate --profile directory`).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ASSETS = resolve(import.meta.dir, '..', 'assets');
const SIZE = 1024;

const GROUND = '#0E0F10';
const SAFFRON = '#FFB020';
const RINGS = [
  { radius: 18, dots: 6, r: 4.4, fill: '#E6E8E6' },
  { radius: 33, dots: 12, r: 3.4, fill: '#E6E8E6' },
  { radius: 47, dots: 18, r: 2.2, fill: '#8A9096' },
] as const;

/** The mark spans 98.4 of its 108 units; a 136-unit square leaves it room inside a rounded crop. */
const VIEW = 136;
const ORIGIN = 54 - VIEW / 2;

const fixed = (n: number) => n.toFixed(2);
const dots = RINGS.flatMap((ring) =>
  Array.from({ length: ring.dots }, (_, k) => {
    const angle = (2 * Math.PI * k) / ring.dots - Math.PI / 2;
    const cx = 54 + ring.radius * Math.cos(angle);
    const cy = 54 + ring.radius * Math.sin(angle);
    return `<circle cx="${fixed(cx)}" cy="${fixed(cy)}" r="${ring.r}" fill="${ring.fill}"/>`;
  }),
);

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="${ORIGIN} ${ORIGIN} ${VIEW} ${VIEW}">`,
  `<rect x="${ORIGIN}" y="${ORIGIN}" width="${VIEW}" height="${VIEW}" fill="${GROUND}"/>`,
  ...dots,
  `<circle cx="54" cy="54" r="6" fill="${SAFFRON}"/>`,
  '</svg>',
  '',
].join('\n');

mkdirSync(ASSETS, { recursive: true });
const svgPath = join(ASSETS, 'icon.svg');
const pngPath = join(ASSETS, 'icon.png');
writeFileSync(svgPath, svg);
execFileSync('rsvg-convert', ['--width', `${SIZE}`, '--height', `${SIZE}`, '--output', pngPath, svgPath]);
console.log(`wrote ${svgPath} and ${pngPath}`);
