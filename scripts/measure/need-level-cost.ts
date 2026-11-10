/** What task 97's level costs on testnet 13579: `(T4, needs, <name>)` on a failure, `(T3, with, <name>)` on a
 *  worked line (ADR `0166`). Reads the MultiVault through the package's own reads; holds no key, sends nothing.
 *
 *      bun run scripts/measure/need-level-cost.ts
 *
 *  Prints the atom and triple costs and `minDeposit` read from the chain, and whether each predicate atom
 *  already exists, so a reader can tell a fee paid once (a new word) from one paid per line (the triple).
 */
import {stringToHex, type Address} from "viem";

import deployment from "../../data/deployments/13579.json";
import {multiVaultReads} from "../../packages/protocol/src/declare/multivault.ts";

const reads = multiVaultReads({
    address: deployment.intuition.multiVault as Address, // an address in this repo's record
    chainId: deployment.chain.chainId,
    rpcUrl: deployment.chain.rpcUrl,
});

const [atomCost, tripleCost, minDeposit] = await Promise.all([reads.atomCost(), reads.tripleCost(), reads.minDeposit()]);
const predicateExists: Record<string, boolean> = {};
for (const word of ["needs", "with"]) predicateExists[word] = await reads.termExists(await reads.atomId(stringToHex(word)));

console.log(
    JSON.stringify(
        {
            chainId: deployment.chain.chainId,
            at: new Date().toISOString(),
            atomCostWei: atomCost.toString(),
            tripleCostWei: tripleCost.toString(),
            minDepositWei: minDeposit.toString(),
            predicateExists,
            // What a planner sends as `value`, as `prepareUsageContext` computes it.
            levelTripleWei: (tripleCost + minDeposit).toString(),
            newAtomWei: (atomCost + minDeposit).toString(),
        },
        null,
        2,
    ),
);
