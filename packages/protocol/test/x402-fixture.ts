import {readFileSync} from "node:fs";

import {getAddress, hexToBigInt, TransactionReceiptNotFoundError, type Address, type Hex} from "viem";

import type {X402TransferReads} from "../src/x402-payment.js";

/** A USDC settlement on Base, recorded 2026-11-09 (`fixtures/x402-base-usdc-3009.json`). No network in a test. */
export type Fixture = {
    network: string;
    receipt: {transactionHash: Hex; status: Hex; blockNumber: Hex; from: Address; logs: {address: Address; topics: Hex[]; data: Hex}[]};
    block: {timestamp: Hex};
};
export const FIXTURE = JSON.parse(readFileSync(new URL("./fixtures/x402-base-usdc-3009.json", import.meta.url), "utf8")) as Fixture; // written by task 89
export const TX = FIXTURE.receipt.transactionHash;
export const PAYER = getAddress("0x31cf39f6f50aea9ea53b726f747560e52727f691");
export const PAY_TO = getAddress("0x7284d41b5b852f2bd4c99bdf95043d84452d299c");
export const FACILITATOR = getAddress(FIXTURE.receipt.from);

/** The recorded chain: one transaction, one block. No network. */
export function recordedReads(fixture: Fixture = FIXTURE, overrides: Partial<{status: "success" | "reverted"}> = {}): X402TransferReads {
    return {
        async getTransactionReceipt({hash}) {
            if (hash.toLowerCase() !== fixture.receipt.transactionHash.toLowerCase()) {
                throw new TransactionReceiptNotFoundError({hash});
            }
            return {
                status: overrides.status ?? (fixture.receipt.status === "0x1" ? "success" : "reverted"),
                blockNumber: hexToBigInt(fixture.receipt.blockNumber),
                logs: fixture.receipt.logs,
            };
        },
        async getBlock() {
            return {timestamp: hexToBigInt(fixture.block.timestamp)};
        },
    };
}

