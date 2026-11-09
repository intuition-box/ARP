// Embed every text in texts.json with a pinned local model.
// usage: node embed.mjs <pkg-dir> <models-dir> <texts.json> <out.json> <model-id> <revision> <pooling> [query-prefix]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const [pkgDir, modelsDir, textsPath, outPath, modelId, revision, pooling, queryPrefix = ""] =
  process.argv.slice(2);
const entry = join(pkgDir, "node_modules/@huggingface/transformers/dist/transformers.node.mjs");
const { pipeline, env } = await import(pathToFileURL(entry).href);
env.cacheDir = modelsDir;
env.allowLocalModels = false;

const texts = JSON.parse(readFileSync(textsPath, "utf8"));
const extractor = await pipeline("feature-extraction", modelId, { revision, dtype: "fp32" });

async function embedAll(list) {
  const out = [];
  for (let i = 0; i < list.length; i += 32) {
    const t = await extractor(list.slice(i, i + 32), { pooling, normalize: true });
    const [n, d] = t.dims;
    for (let j = 0; j < n; j++) out.push(Array.from(t.data.slice(j * d, (j + 1) * d), (x) => +x.toFixed(6)));
  }
  return out;
}

const nodeIds = Object.keys(texts.nodeText);
const full = await embedAll(nodeIds.map((k) => texts.nodeText[k]));
const sub = await embedAll(nodeIds.map((k) => texts.nodeSubtreeText[k]));
const rows = await embedAll(texts.rows.map((r) => queryPrefix + r.text));
writeFileSync(
  outPath,
  JSON.stringify({
    model: modelId, revision, pooling, dtype: "fp32", queryPrefix,
    nodeFull: Object.fromEntries(nodeIds.map((k, i) => [k, full[i]])),
    nodeSubtree: Object.fromEntries(nodeIds.map((k, i) => [k, sub[i]])),
    rows: Object.fromEntries(texts.rows.map((r, i) => [r.url, rows[i]])),
  }),
);
console.log(`embedded ${nodeIds.length} nodes x2, ${texts.rows.length} rows, dim ${rows[0].length}`);
