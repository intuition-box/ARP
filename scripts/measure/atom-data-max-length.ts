/**
 * The MultiVault's `getGeneralConfig()` limits on both Intuition chains, read-only, with the block.
 *
 * `atomDataMaxLength` bounds every atom ARP writes, and an x402 payment level carries the exact URL
 * inside one (`MAX_EXACT_ENDPOINT_LENGTH`, `packages/protocol/src/x402-payment.ts`, ADR `0162`).
 * `minDeposit`, `minShare`, `feeDenominator` and `feeThreshold` are the other limits the write paths
 * read at call time. They are governance-configurable (`rules/portability.md`), so this records a
 * dated read and nothing reads the file back as a constant.
 *
 *   bun run scripts/measure/atom-data-max-length.ts --json data/measurements/atom-data-max-length-<date>.json
 */
import { writeFileSync } from 'node:fs';

import { createPublicClient, http, parseAbi, type Hex } from 'viem';

import mainnet from '../../data/deployments/1155.json';
import testnet from '../../data/deployments/13579.json';

const CHAINS = [
  { chainId: testnet.chain.chainId, rpc: testnet.chain.rpcUrl, multiVault: testnet.intuition.multiVault },
  { chainId: mainnet.chain.chainId, rpc: mainnet.chain.rpcUrl, multiVault: mainnet.intuition.multiVault },
] as const;

const abi = parseAbi([
  'function getGeneralConfig() view returns ((address admin, address protocolMultisig, uint256 feeDenominator, address trustBonding, uint256 minDeposit, uint256 minShare, uint256 atomDataMaxLength, uint256 feeThreshold))',
]);

const readings = [];
for (const chain of CHAINS) {
  const client = createPublicClient({ transport: http(chain.rpc) });
  const blockNumber = await client.getBlockNumber();
  const general = await client.readContract({
    address: chain.multiVault as Hex,
    abi,
    functionName: 'getGeneralConfig',
    blockNumber,
  });
  const reading = {
    chainId: chain.chainId,
    multiVault: chain.multiVault,
    blockNumber: blockNumber.toString(),
    atomDataMaxLength: general.atomDataMaxLength.toString(),
    minDeposit: general.minDeposit.toString(),
    minShare: general.minShare.toString(),
    feeDenominator: general.feeDenominator.toString(),
    feeThreshold: general.feeThreshold.toString(),
  };
  readings.push(reading);
  console.log(`--- chain ${reading.chainId} at block ${reading.blockNumber}`);
  for (const key of ['atomDataMaxLength', 'minDeposit', 'minShare', 'feeDenominator', 'feeThreshold'] as const) {
    console.log(`    ${key.padEnd(18)} ${reading[key]}`);
  }
}

const result = {
  script: 'scripts/measure/atom-data-max-length.ts',
  readAt: new Date().toISOString(),
  call: 'MultiVault.getGeneralConfig()',
  readings,
};
const out = process.argv.indexOf('--json');
if (out !== -1 && process.argv[out + 1]) writeFileSync(process.argv[out + 1] as string, `${JSON.stringify(result, null, 1)}\n`);
