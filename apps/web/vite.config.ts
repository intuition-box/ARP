import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import {defineConfig, loadEnv, type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import {buildLlmsFull, buildLlmsIndex} from './src/docs/llms';
import {DOC_SECTIONS} from './src/docs/manifest';
import {LEGAL_SLUGS} from './src/services/legal';

const DOCS_DIR = fileURLToPath(new URL('./public/docs/', import.meta.url));

const readPage = (slug: string): string => readFileSync(`${DOCS_DIR}${slug}.md`, 'utf8');

/**
 * `/llms.txt` and `/llms-full.txt` from `public/docs/*.md`: served in dev, emitted at build. They
 * are generated rather than committed so the pages stay the only copy of the text.
 */
function llmsTxt(): Plugin {
  const files: Record<string, () => string> = {
    '/llms.txt': () => buildLlmsIndex(DOC_SECTIONS),
    '/llms-full.txt': () => buildLlmsFull(DOC_SECTIONS, readPage),
  };
  return {
    name: 'arp-llms-txt',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname;
        const build = Object.hasOwn(files, path) ? files[path] : undefined;
        if (build === undefined) return next();
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        response.end(build());
      });
    },
    generateBundle() {
      for (const [path, build] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName: path.slice(1), source: build() });
      }
    },
  };
}

/** The pages a crawler is told about. A path here that no route answers would be a 404 in the index. */
const SITEMAP_PATHS = [
    '/',
    '/agents',
    '/tools',
    '/activity',
    '/search',
    '/start/claude',
    '/start/agent',
    '/start/tool',
    '/docs',
    '/test-identities',
    ...LEGAL_SLUGS.map((slug) => `/${slug}`),
];

/**
 * The public site's build (task 74).
 *
 * - A **release** build (`VITE_PUBLIC_RELEASE=1`) needs `VITE_SITE_URL`. The legal pages block
 *   nothing: an unset `VITE_LEGAL_*` variable leaves its line out (the user, 2026-11-09).
 * - `robots.txt` and `sitemap.xml` are written with `VITE_SITE_URL`, the address the site is served
 *   at; without it there is no absolute URL to give, so no sitemap is written and robots says so.
 */
function publicSite(env: Record<string, string>): Plugin {
    const siteUrl = (env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');
    return {
        name: 'arp-public-site',
        apply: 'build',
        buildStart() {
            if (env.VITE_PUBLIC_RELEASE !== '1') return;
            if (siteUrl === '') this.error('VITE_PUBLIC_RELEASE=1 needs VITE_SITE_URL, the address the site is served at.');
        },
        generateBundle() {
            const robots = ['User-agent: *', 'Allow: /'];
            if (siteUrl !== '') robots.push(`Sitemap: ${siteUrl}/sitemap.xml`);
            this.emitFile({type: 'asset', fileName: 'robots.txt', source: `${robots.join('\n')}\n`});
            if (siteUrl === '') return;
            const urls = SITEMAP_PATHS.map((path) => `  <url><loc>${siteUrl}${path === '/' ? '/' : path}</loc></url>`);
            this.emitFile({
                type: 'asset',
                fileName: 'sitemap.xml',
                source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
            });
        },
        transformIndexHtml(html) {
            // Open Graph wants absolute URLs. Without a site URL the tags that need one are left out.
            const tags =
                siteUrl === ''
                    ? ''
                    : `    <meta property="og:url" content="${siteUrl}/" />\n    <meta property="og:image" content="${siteUrl}/og.png" />\n    <meta name="twitter:image" content="${siteUrl}/og.png" />\n`;
            return html.replace('</head>', `${tags}  </head>`);
        },
    };
}

// https://vite.dev/config/
export default defineConfig(({mode}) => {
    const env = {...loadEnv(mode, process.cwd(), 'VITE_'), ...pickVite(process.env)};
    return {
        plugins: [react(), tailwindcss(), llmsTxt(), publicSite(env)],
    };
});

function pickVite(source: NodeJS.ProcessEnv): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(source)) {
        if (key.startsWith('VITE_') && value !== undefined) out[key] = value;
    }
    return out;
}
