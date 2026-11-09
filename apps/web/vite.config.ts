import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { buildLlmsFull, buildLlmsIndex } from './src/docs/llms';
import { DOC_SECTIONS } from './src/docs/manifest';

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), llmsTxt()],
});
