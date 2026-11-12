import {describe, expect, it} from "vitest";

import {arpPayersFor, sponsorAddressFor} from "../sponsor";

const SPONSOR = "0x906f3A52ec089f8D4E9127F91C6bE5Ae0d18f91f";

describe("sponsorAddressFor", () => {
    it("is null until one is configured, so Signals has nothing to show", () => {
        expect(sponsorAddressFor(13579, undefined)).toBeNull();
        expect(sponsorAddressFor(13579, "")).toBeNull();
    });

    it("returns the configured address on testnet", () => {
        expect(sponsorAddressFor(13579, ` ${SPONSOR} `)).toBe(SPONSOR);
    });

    it("has none on mainnet, whatever the environment says", () => {
        // The sponsoring service is testnet-only; a mainnet figure read off a testnet
        // key would be two chains in one number.
        expect(sponsorAddressFor(1155, SPONSOR)).toBeNull();
    });

    it("falls back to the recorded address when the environment leaves it unset or blank (task 58)", () => {
        const RECORDED = "0xE596096F4176b682E300d73963e7B04B383C1AA1";
        expect(sponsorAddressFor(13579, undefined, RECORDED)).toBe(RECORDED);
        expect(sponsorAddressFor(13579, "", RECORDED)).toBe(RECORDED);
        expect(sponsorAddressFor(13579, "   ", RECORDED)).toBe(RECORDED);
        expect(sponsorAddressFor(13579, SPONSOR, RECORDED)).toBe(SPONSOR);
        expect(sponsorAddressFor(1155, undefined, RECORDED)).toBeNull();
    });

    it("drops a malformed value rather than guessing", () => {
        expect(sponsorAddressFor(13579, "0x1234")).toBeNull();
        expect(sponsorAddressFor(13579, "0x%")).toBeNull();
    });
});

describe("arpPayersFor", () => {
    const recorded = {
        deployer: "0xe596096f4176b682e300d73963e7b04b383c1aa1",
        sponsor: "0x77939A4c276f3E549276CEB3A09CDa1fF58b7ec9",
    };

    it("names the deployer and the sponsor on testnet, checksummed and once each (task 144)", () => {
        expect(arpPayersFor(13579, undefined, recorded)).toEqual([
            "0xE596096F4176b682E300d73963e7B04B383C1AA1",
            "0x77939A4c276f3E549276CEB3A09CDa1fF58b7ec9",
        ]);
    });

    it("adds a configured sponsoring address that differs from the record", () => {
        expect(arpPayersFor(13579, "0x906f3a52ec089f8d4e9127f91c6be5ae0d18f91f", recorded)).toHaveLength(3);
    });

    it("drops a malformed address rather than passing it to a query", () => {
        expect(arpPayersFor(13579, undefined, {...recorded, deployer: "not an address"})).toEqual([
            "0x77939A4c276f3E549276CEB3A09CDa1fF58b7ec9",
        ]);
    });

    it("names nobody on mainnet, where the service does not run", () => {
        expect(arpPayersFor(1155, undefined, recorded)).toEqual([]);
    });
});
