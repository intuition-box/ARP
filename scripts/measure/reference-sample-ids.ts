/**
 * Whether the landing reference's sample agent ids are real ERC-8004 tokens on Base (task 81).
 *
 *      bun run scripts/measure/reference-sample-ids.ts
 *
 * `docs/design/landing-galaxy/landing-galaxy-reference.html` names its sample agents `8453:3107`,
 * `8453:5512`, `8453:7720` and `8453:2418`. If `ownerOf` answers for one, it is a real agent, and a
 * sample line in its name puts a use in the mouth of an agent that never declared it. The landing's
 * own sample (`apps/web/src/services/landing-sample.ts`) uses `agent A` to `agent E` instead.
 * The last id is a control that should not exist, so a revert is told apart from a dead RPC.
 */
import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';

const REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const IDS = [3107n, 5512n, 7720n, 2418n, 999_999_999n];

const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });
const abi = parseAbi(['function ownerOf(uint256 tokenId) view returns (address)']);

for (const id of IDS) {
  try {
    const owner = await client.readContract({
      address: REGISTRY,
      abi,
      functionName: 'ownerOf',
      args: [id],
    });
    console.log(`8453:${id}\texists\towner ${owner}`);
  } catch (error) {
    const reason = error instanceof Error ? error.message.split('\n')[0] : String(error);
    console.log(`8453:${id}\tno owner\t${reason}`);
  }
}
