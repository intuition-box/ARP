/** File each skill in a first-run list under its category, through the sponsor (task 59, item 6).
 *
 *      bun run scripts/seed/file-categories.ts                     # dry: prints the plan and the cost
 *      bun run scripts/seed/file-categories.ts --send              # posts to the local sponsor
 *      SPONSOR_URL=http://127.0.0.1:3200 bun run scripts/seed/file-categories.ts --send
 *      bun run scripts/seed/file-categories.ts --send --agent 8 --key AGENT_PRIVATE_KEY --expect 0x…
 *
 *  The sponsor writes, as the attestor, under the same rules and daily caps as any proposal (ADR
 *  `0124`), so this is one more client of `/propose-category`, not a seed with its own authority. It
 *  stops at the first `limit` and can be re-run the next day: a filing that is already there comes
 *  back `created: false` and costs nothing.
 *
 *  A new category is added only by a registered agent's signed request (task 73, ADR `0146`), so
 *  `--agent`, `--key` (the NAME of the env variable holding that agent's key, never the key) and
 *  `--expect` (the address it must sign as, checked before anything is sent) sign every filing. Without
 *  them, only tags with an existing category are sent.
 *
 *  A new category is filed once with its parent and reason; every later skill under it is a plain
 *  tag, as the web and `arp_file_category` send it.
 */
import {readFileSync} from "node:fs";

import {signCategoryRequest} from "../../packages/protocol/src/sponsor/category.js";
import {getAddress, keccak256, stringToBytes, type Hex} from "viem";
import {privateKeyToAccount} from "viem/accounts";

type Filing = {url: string; atom: string; category: string; parent?: string; reason?: string};

const file = process.argv.find((value) => value.endsWith(".json")) ?? "data/catalogue/category-first-run-13579.json";
const {chainId, filings} = JSON.parse(readFileSync(file, "utf8")) as {chainId: number; filings: Filing[]};
if (chainId !== 13579) {
    console.error(`${file} is for chain ${chainId}; the sponsor files on testnet 13579 only (ADR 0124)`);
    process.exit(1);
}
const send = process.argv.includes("--send");
const flag = (name: string): string | undefined => {
    const index = process.argv.indexOf(`--${name}`);
    return index === -1 ? undefined : process.argv[index + 1];
};
const agentId = flag("agent");
const keyName = flag("key");
const expected = flag("expect");
if ([agentId, keyName, expected].some((value) => value !== undefined) && [agentId, keyName, expected].some((value) => value === undefined)) {
    console.error("--agent, --key and --expect go together");
    process.exit(1);
}
const deployment = JSON.parse(readFileSync("data/deployments/13579.json", "utf8")) as {arp?: {identityRegistry?: string}};
const signer = (() => {
    if (keyName === undefined || expected === undefined || agentId === undefined) return null;
    const key = process.env[keyName];
    if (key === undefined || key === "") throw new Error(`${keyName} is not set`);
    const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as Hex); // a key is hex
    if (account.address !== getAddress(expected)) throw new Error(`${keyName} signs as ${account.address}, not ${expected}`);
    const registry = deployment.arp?.identityRegistry;
    if (registry === undefined) throw new Error("data/deployments/13579.json has no identityRegistry");
    return {account, agentId, agentRegistry: `eip155:13579:${getAddress(registry)}`};
})();
const sponsor = process.env["SPONSOR_URL"]?.trim() || "http://127.0.0.1:3200";

const newCategories = [...new Set(filings.filter((f) => f.parent !== undefined).map((f) => f.category))];
const counts = new Map<string, number>();
for (const filing of filings) counts.set(filing.category, (counts.get(filing.category) ?? 0) + 1);

console.log(`${file}: ${filings.length} skills, ${counts.size} categories, ${newCategories.length} new (${newCategories.join(", ") || "none"})`);
for (const [category, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${category.padEnd(14)} ${count}`);
}
// Each write is cost + minDeposit, read off testnet 13579 on 2026-11-03 by
// `scripts/measure/domain-seed-costs.ts`: 0.002 per atom, 0.002 per triple. An upper bound: a
// filing already on chain writes nothing.
const triples = filings.length + newCategories.length;
console.log(
    `at most ${newCategories.length} atom(s) + ${triples} triple(s) ≈ ${((newCategories.length + triples) * 0.002).toFixed(3)} tTRUST of ARP's testnet treasury, plus gas`,
);
if (!send) {
    console.log("\ndry run. --send posts each filing to the sponsor.");
    process.exit(0);
}

const filed = new Set<string>();
let done = 0;
for (const filing of filings) {
    const first = filing.parent !== undefined && !filed.has(filing.category);
    if (first && signer === null) {
        console.log(`  SKIPPED ${filing.url} → ${filing.category}: a new category needs --agent, --key and --expect`);
        continue;
    }
    const body =
        signer === null
            ? {label: filing.category, subjectId: filing.atom}
            : {
                  request: await signCategoryRequest(
                      {
                          agent: signer.account.address,
                          agentRegistry: signer.agentRegistry,
                          agentId: signer.agentId,
                          label: filing.category,
                          parent: first ? (filing.parent ?? "") : "",
                          subject: filing.atom as Hex, // a 32-byte atom id in the committed list
                          reason: first ? (filing.reason ?? "") : "",
                          nonce: keccak256(stringToBytes(`file-categories-${filing.atom}-${Date.now()}`)),
                          expiresAt: Math.floor(Date.now() / 1000) + 600,
                      },
                      chainId,
                      signer.account,
                  ),
              };
    let response: Response;
    try {
        response = await fetch(`${sponsor}/propose-category`, {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(180000),
        });
    } catch (error) {
        // A dropped connection says nothing about whether this one landed; a re-run finds out.
        console.log(`stopped after ${done}: the sponsor did not answer for ${filing.url} (${String(error)}); re-run`);
        break;
    }
    const answer = (await response.json().catch(() => null)) as {rule?: string; error?: string; created?: boolean} | null;
    if (!response.ok) {
        console.log(`  REFUSED ${filing.url} → ${filing.category}: ${answer?.rule ?? response.status} ${answer?.error ?? ""}`);
        if (answer?.rule === "limit") {
            console.log(`stopped at the daily limit after ${done}; re-run tomorrow`);
            break;
        }
        continue;
    }
    filed.add(filing.category);
    done += 1;
    console.log(`  ${answer?.created === false ? "already" : "filed  "} ${filing.category.padEnd(14)} ${filing.url}`);
}
console.log(`${done} of ${filings.length} answered`);
