import {custom, encodeAbiParameters} from "viem";
import {describe, expect, it} from "vitest";

import {resolveRef} from "../src/caip.js";
import {erc8004RegistrySource} from "../src/sources/erc8004-registry/index.js";
import {recordedEthCall} from "./helpers.js";

const OWNER = "0x729a121c347cd89C14f5FF9CD289cA8c70B1de1d";

/** A registry source whose token 1 carries `tokenURI` as given. */
function sourceWithUri(tokenUri: string) {
    return erc8004RegistrySource({
        transports: {
            8453: custom({
                request: recordedEthCall({
                    "8453:1": {
                        ownerOf: encodeAbiParameters([{type: "address"}], [OWNER]),
                        tokenURI: encodeAbiParameters([{type: "string"}], [tokenUri]),
                    },
                }),
            }),
        },
    });
}

const REF = resolveRef({chainId: 8453, tokenId: "1"});
const EMPTY = {name: null, description: null, image: null, url: null, isFallback: false};

describe("erc8004RegistrySource, the inline registration file", () => {
    it("reads a percent-encoded data URI and trims its fields", async () => {
        const doc = encodeURIComponent(
            JSON.stringify({name: "  Loop  ", description: "", image: 7}),
        );
        const identity = await sourceWithUri(`data:application/json,${doc}`).resolveAgent(REF);
        expect(identity?.owner).toBe(OWNER);
        expect(identity?.metadata).toEqual({...EMPTY, name: "Loop"});
    });

    it("reads nothing from a hosted file, a data URI with no comma, a non-object or a broken document", async () => {
        for (const uri of [
            "https://agent.example/registration.json",
            "data:application/json",
            `data:application/json,${encodeURIComponent("42")}`,
            "data:application/json,%E0%A4%A",
            "data:application/json,{not json",
        ]) {
            const identity = await sourceWithUri(uri).resolveAgent(REF);
            expect(identity?.registrationFile).toBe(uri);
            expect(identity?.metadata).toEqual(EMPTY);
        }
    });

    it("returns null for a chain it has no definition for", async () => {
        const identity = await sourceWithUri("x").resolveAgent(
            resolveRef({chainId: 999_999, tokenId: "1", registry: OWNER}),
        );
        expect(identity).toBeNull();
    });

    it("answers a second read on the same chain the same way, in the same number of round trips", async () => {
        let calls = 0;
        const recorded = recordedEthCall({
            "8453:1": {
                ownerOf: encodeAbiParameters([{type: "address"}], [OWNER]),
                tokenURI: encodeAbiParameters([{type: "string"}], ["https://a"]),
            },
        });
        const source = erc8004RegistrySource({
            transports: {
                8453: custom({
                    request: async (args: {method: string; params?: unknown}) => {
                        calls += 1;
                        return recorded(args);
                    },
                }),
            },
        });
        const first = await source.resolveAgent(REF);
        const after = calls;
        const second = await source.resolveAgent(REF);
        expect(second).toEqual(first);
        expect(calls - after).toBe(after);
        expect(await source.getAssessments(REF)).toEqual([]);
    });
});
