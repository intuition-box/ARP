/** What x402 Doctor's Trust Index says about the endpoints ARP knows (task 101, ADR `0170`).
 *
 *      bun run scripts/measure/x402-trust-index.ts --json data/measurements/x402-trust-index-<stamp>.json
 *      bun run scripts/build/build-outside-signals.ts
 *
 *  Read-only. Signs nothing, needs no credential. Reads the dataset Fizzl publishes on Hugging Face,
 *  `x402Fizzl/x402-trust-index`, under CC BY 4.0, credited as its card asks:
 *  "x402 Trust Index by x402 Doctor (fizzl.eu)" (`TRUST_INDEX_CREDIT`). The same files sit on the
 *  `trust-data` branch of `Fizzl13/x402-doctor`, whose README states no licence and whose code is
 *  AGPL-3.0, so the dataset with the stated licence is the one read.
 *
 *  Pinned: the dataset's commit is read first and every file is fetched at that commit, so the bytes
 *  can be fetched again. `data/endpoints.jsonl` (one row per endpoint of the latest scan, about 24 MB)
 *  is streamed and only the rows ARP asks about are kept, by exact URL and by host:
 *
 *    - every endpoint an agent of ARP's directory declared, from the sieve's walk
 *      (`data/catalogue/agent-sieve-13579.json` names it);
 *    - every remote endpoint in `data/catalogue/remote-endpoints.json`.
 *
 *  The scan's day is the last row of `data/daily.csv`.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import sieve from '../../data/catalogue/agent-sieve-13579.json';
import remote from '../../data/catalogue/remote-endpoints.json';
import {
  summariseTrustIndex,
  TRUST_INDEX_CREDIT,
  TRUST_INDEX_LICENCE,
  type TrustIndexRow,
} from '../../packages/protocol/src/outside-signals.ts';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const DATASET = 'x402Fizzl/x402-trust-index';

const urls = new Set<string>();
const addUrl = (raw: unknown) => {
  if (typeof raw !== 'string') return;
  const url = raw.trim();
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') urls.add(url);
  } catch {
    // Not a URL an index could list: an agent's own text, kept out.
  }
};
const sieveSource = (sieve as { source: string }).source;
for (const line of readFileSync(sieveSource, 'utf8').split('\n')) {
  if (line.trim() === '') continue;
  const row = JSON.parse(line) as { endpoints?: { url?: unknown }[] }; // the sieve's own JSONL
  for (const endpoint of row.endpoints ?? []) addUrl(endpoint.url);
}
for (const entry of (remote as { endpoints: { endpoint?: unknown }[] }).endpoints)
  addUrl(entry.endpoint);
const hosts = new Set([...urls].map((url) => new URL(url).hostname.toLowerCase()));

const info = (await (
  await fetch(`https://huggingface.co/api/datasets/${DATASET}`, {
    signal: AbortSignal.timeout(30_000),
  })
).json()) as {
  sha?: unknown;
  lastModified?: unknown;
  cardData?: { license?: unknown };
}; // the Hub's dataset info, read field by field
if (typeof info.sha !== 'string') throw new Error('the dataset info carries no commit');
const revision = info.sha;
const licence = info.cardData?.license;
if (licence !== 'cc-by-4.0')
  throw new Error(
    `the dataset's licence is ${String(licence)}, not cc-by-4.0: stop and read it again`,
  );
const file = (path: string) =>
  `https://huggingface.co/datasets/${DATASET}/resolve/${revision}/${path}`;

const daily = (
  await (await fetch(file('data/daily.csv'), { signal: AbortSignal.timeout(30_000) })).text()
)
  .trim()
  .split('\n');
const scan = daily.at(-1)?.split(',')[0] ?? null;

const response = await fetch(file('data/endpoints.jsonl'), {
  signal: AbortSignal.timeout(300_000),
});
if (!response.ok || response.body === null)
  throw new Error(`endpoints.jsonl: HTTP ${response.status}`);

async function* lines(stream: ReadableStream<Uint8Array>): AsyncGenerator<TrustIndexRow> {
  const decoder = new TextDecoder();
  let carry = '';
  for await (const chunk of stream) {
    carry += decoder.decode(chunk, { stream: true });
    let at = carry.indexOf('\n');
    while (at !== -1) {
      const line = carry.slice(0, at).trim();
      carry = carry.slice(at + 1);
      if (line !== '') yield parse(line);
      at = carry.indexOf('\n');
    }
  }
  if (carry.trim() !== '') yield parse(carry.trim());
}
function parse(line: string): TrustIndexRow {
  try {
    return JSON.parse(line) as TrustIndexRow; // fields checked one by one in summariseTrustIndex
  } catch {
    return {};
  }
}

const rows: TrustIndexRow[] = [];
for await (const row of lines(response.body)) rows.push(row);
const summary = summariseTrustIndex(rows, { urls, hosts });
const verdicts = { go: 0, caution: 0, no_go: 0, error: 0 };
for (const row of rows) {
  if (
    row.verdict === 'go' ||
    row.verdict === 'caution' ||
    row.verdict === 'no_go' ||
    row.verdict === 'error'
  )
    verdicts[row.verdict] += 1;
}

console.log(
  `dataset ${DATASET} at ${revision.slice(0, 12)}, scan ${scan}, licence ${TRUST_INDEX_LICENCE}`,
);
console.log(
  `rows ${summary.rows} (${summary.malformed} without the documented fields): ${verdicts.go} go, ${verdicts.caution} caution, ${verdicts.no_go} no_go, ${verdicts.error} error (not on the card: unreachable)`,
);
console.log(`asked: ${urls.size} URLs on ${hosts.size} hosts`);
console.log(
  `found: ${Object.keys(summary.urls).length} URLs exactly, ${Object.keys(summary.hosts).length} hosts with at least one listed endpoint`,
);
for (const [host, row] of Object.entries(summary.hosts)) {
  console.log(
    `  ${host}: ${row.endpoints} listed, ${row.go} go, ${row.caution} caution, ${row.noGo} no_go, ${row.error} error`,
  );
}

const jsonPath = arg('json');
if (jsonPath !== undefined) {
  writeFileSync(
    jsonPath,
    `${JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        source: `huggingface.co/datasets/${DATASET}`,
        revision,
        lastModified: info.lastModified,
        scan,
        licence: TRUST_INDEX_LICENCE,
        credit: TRUST_INDEX_CREDIT,
        dataset: { rows: summary.rows, malformed: summary.malformed, ...verdicts },
        asked: { sieve: sieveSource, urls: [...urls].sort(), hosts: [...hosts].sort() },
        urls: summary.urls,
        hosts: summary.hosts,
      },
      null,
      1,
    )}\n`,
  );
  console.log(`written to ${jsonPath}`);
}

export {};
