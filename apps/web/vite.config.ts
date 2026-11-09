import {defineConfig, loadEnv, type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import {LEGAL_SLUGS, remainingPlaceholders} from './src/services/legal';

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
 * - A **release** build (`VITE_PUBLIC_RELEASE=1`) fails while a legal page still holds a
 *   `[… À COMPLÉTER]` placeholder, so the site cannot go online with them unfilled.
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
            const left = remainingPlaceholders();
            if (left.length > 0) {
                this.error(
                    `VITE_PUBLIC_RELEASE=1 but the legal pages still hold ${left.length} placeholder(s), ` +
                        `in apps/web/src/services/legal.ts: ${[...new Set(left)].join(', ')}`,
                );
            }
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
                    : `    <link rel="canonical" href="${siteUrl}/" />\n    <meta property="og:url" content="${siteUrl}/" />\n    <meta property="og:image" content="${siteUrl}/og.png" />\n    <meta name="twitter:image" content="${siteUrl}/og.png" />\n`;
            return html.replace('</head>', `${tags}  </head>`);
        },
    };
}

// https://vite.dev/config/
export default defineConfig(({mode}) => {
    const env = {...loadEnv(mode, process.cwd(), 'VITE_'), ...pickVite(process.env)};
    return {
        plugins: [react(), tailwindcss(), publicSite(env)],
    };
});

function pickVite(source: NodeJS.ProcessEnv): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(source)) {
        if (key.startsWith('VITE_') && value !== undefined) out[key] = value;
    }
    return out;
}
