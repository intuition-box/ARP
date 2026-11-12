/** The share card, `apps/web/public/og.png`: the landing's top, 1200×630, from the built site (task 145).
 *
 *      cd apps/web && bun run build && bunx vite preview --port 4173 &
 *      bun run scripts/build/og-image.ts [url]
 *
 *  `og:image` and `twitter:image`, written into the built page by `apps/web/vite.config.ts` from `VITE_SITE_URL`,
 *  name this file. It was a screenshot taken once on
 *  2026-11-09 and nothing redid it, so a shared link kept showing a landing that no longer existed. This
 *  script redoes it the same way every time.
 *
 *  It drives Chromium over the DevTools Protocol with `fetch` and a `WebSocket`, as
 *  `scripts/measure/landing-fit.ts` does, so it adds no dependency. The browser is `ARP_CHROME`, else
 *  Playwright's cached Chromium under `/root` or the user's home. Reduced motion is forced, so the
 *  landing's first scene shows its end state rather than a frame of its animation.
 */
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
const PORT = 9334;
const SETTLE_MS = 4000;

/** The Chromium to drive: the variable when set, else the first cached one that exists. */
export function chromePath(env: Record<string, string | undefined>, home: string, exists: (path: string) => boolean): string {
  const given = env['ARP_CHROME'];
  if (given !== undefined && given !== '') return given;
  const cached = 'ms-playwright/chromium-1140/chrome-linux/chrome';
  const found = [join('/root/.cache', cached), join(home, '.cache', cached)].find(exists);
  if (found === undefined) throw new Error('no Chromium: set ARP_CHROME, or install one with `npx playwright install chromium`');
  return found;
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function send(socket: WebSocket, pending: Map<number, (value: unknown) => void>, id: number, method: string, params: Record<string, unknown> = {}) {
  const reply = new Promise<unknown>((done) => pending.set(id, done));
  socket.send(JSON.stringify({ id, method, params }));
  return reply;
}

if (import.meta.main) {
  const url = process.argv[2] ?? 'http://localhost:4173/';
  const out = resolve(import.meta.dir, '..', '..', 'apps', 'web', 'public', 'og.png');
  const chrome = chromePath(process.env, homedir(), existsSync);
  const profile = `/tmp/arp-og-${process.pid}`;
  const child = Bun.spawn(
    [
      chrome,
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-prefers-reduced-motion',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdout: 'ignore', stderr: 'ignore' },
  );
  try {
    let socketUrl: string | undefined;
    for (let attempt = 0; attempt < 60 && socketUrl === undefined; attempt += 1) {
      await sleep(250);
      try {
        const targets = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[]; // CDP's own listing
        socketUrl = targets.find((target) => target.type === 'page')?.webSocketDebuggerUrl;
      } catch {
        // Not listening yet.
      }
    }
    if (socketUrl === undefined) throw new Error(`Chromium did not expose a page on ${PORT}`);
    const socket = new WebSocket(socketUrl);
    await new Promise<void>((done, fail) => {
      socket.addEventListener('open', () => done(), { once: true });
      socket.addEventListener('error', () => fail(new Error('CDP socket failed')), { once: true });
    });
    const pending = new Map<number, (value: unknown) => void>();
    socket.addEventListener('message', (event) => {
      const frame = JSON.parse(String(event.data)) as { id?: number; result?: unknown }; // a CDP frame
      if (frame.id !== undefined) pending.get(frame.id)?.(frame.result);
    });
    let id = 0;
    const call = (method: string, params?: Record<string, unknown>) => send(socket, pending, (id += 1), method, params);
    await call('Page.enable');
    await call('Emulation.setDeviceMetricsOverride', { width: OG_WIDTH, height: OG_HEIGHT, deviceScaleFactor: 1, mobile: false });
    await call('Page.navigate', { url });
    await sleep(SETTLE_MS);
    await call('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => true)', awaitPromise: true });
    const shot = (await call('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: OG_WIDTH, height: OG_HEIGHT, scale: 1 } })) as { data: string }; // CDP returns base64
    writeFileSync(out, Buffer.from(shot.data, 'base64'));
    socket.close();
    console.log(`wrote ${out} from ${url}`);
  } finally {
    child.kill();
    rmSync(profile, { recursive: true, force: true });
  }
}
