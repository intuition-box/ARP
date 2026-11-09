import {describe, expect, it} from "vitest";

import {servedTools} from "../src/served-tools.js";

const names = (mode: {desktop: boolean; readOnly: boolean}) => servedTools(mode).map((tool) => tool.name).sort();

describe("servedTools", () => {
    it("serves Desktop and sponsored the reads, the search's two fallbacks and the loop", () => {
        expect(names({desktop: true, readOnly: true})).toEqual([
            "arp_agent_endpoints",
            "arp_declare_used",
            // Signs with the local agent key, so a sponsored agent can add a category (ADR `0146`).
            "arp_file_category",
            "arp_find_agents",
            "arp_find_tools",
            "arp_get_skill",
            "arp_pulse",
            "arp_tool_reputation",
        ]);
    });

    it("serves the plugin one search and its two reads", () => {
        expect(names({desktop: false, readOnly: true})).toEqual(["arp_agent_endpoints", "arp_pulse", "arp_tool_reputation"]);
    });

    it("serves the unsigned mode the category proposal its declaration asks for (ADR `0146`)", () => {
        expect(names({desktop: false, readOnly: false})).toContain("arp_propose_category");
        expect(names({desktop: true, readOnly: true})).not.toContain("arp_propose_category");
    });

    it("lists each name once", () => {
        for (const mode of [{desktop: true, readOnly: true}, {desktop: false, readOnly: true}, {desktop: false, readOnly: false}]) {
            const listed = names(mode);
            expect(new Set(listed).size).toBe(listed.length);
        }
    });
});
