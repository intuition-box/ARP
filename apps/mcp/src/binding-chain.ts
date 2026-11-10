import type { HandshakeChain } from '@arp-protocol/core';
import { type Address, type Hex, parseAbi, verifyMessage } from 'viem';

const OWNER_ABI = parseAbi(['function ownerOf(uint256) view returns (address)']);

/** The two reads a binding needs, as a viem public client offers them. */
export type BindingClient = {
  readContract(args: { address: Address; abi: typeof OWNER_ABI; functionName: 'ownerOf'; args: [bigint] }): Promise<Address>;
  verifyMessage(args: { address: Address; message: string; signature: Hex }): Promise<boolean>;
};

/**
 * The registry reads a binding's proofs are checked with, for one read. Every proof under one agent names the same
 * token, so its owner is asked once, not once per proof (task 113: seven `ownerOf` for one agent's seven claims).
 * A signature is recovered here first, which an EOA's always is; only one that does not recover to the address is
 * asked of the chain, which is what an owner that is a contract account (ERC-1271) needs. The verdict is the same.
 */
export function bindingChain(client: BindingClient): HandshakeChain {
  const owners = new Map<string, Promise<Address>>();
  return {
    ownerOf: ({ chainId, registry, agentId }) => {
      const key = `${chainId}:${registry.toLowerCase()}:${agentId}`;
      const known = owners.get(key);
      if (known !== undefined) return known;
      const asked = client.readContract({ address: registry, abi: OWNER_ABI, functionName: 'ownerOf', args: [agentId] });
      owners.set(key, asked);
      // A failed read is not kept, so a second proof asks again rather than inheriting a passing failure.
      asked.catch(() => owners.delete(key));
      return asked;
    },
    verifyMessage: async ({ address, message, signature }) =>
      (await verifyMessage({ address, message, signature }).catch(() => false)) ||
      client.verifyMessage({ address, message, signature }),
  };
}
