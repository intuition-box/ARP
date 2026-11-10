import {describe, expect, it} from "vitest";

import bundled from "../data/skill-contents.json";
import {contentsOf, lineUrl, type SkillContentsEntry, type SkillContentsReading} from "./skill-contents";

// The shape `build-skill-contents.ts` writes, which the hook casts to.
const reading = bundled as SkillContentsReading;

const entry = (over: Partial<SkillContentsEntry> = {}): SkillContentsEntry => ({
    commit: "ca45fc496a3436251f191354091d557da31c15b5",
    directory: "",
    programs: [],
    packages: [],
    settings: [],
    keys: [],
    scripts: [],
    fetchAndRun: [],
    domains: [],
    hidden: [],
    skipped: [],
    cut: [],
    ...over,
});

describe("skill contents", () => {
    it("the bundled reading is dated and every entry has the fields the page reads", () => {
        expect(reading.measuredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        const entries = Object.values(reading.skills);
        expect(entries.length).toBeGreaterThan(0);
        for (const value of entries) {
            expect(value.commit).toMatch(/^[0-9a-f]{40}$/);
            expect(typeof value.directory).toBe("string");
            for (const list of [value.programs, value.packages, value.settings, value.keys, value.scripts, value.skipped, value.fetchAndRun, value.domains, value.hidden, value.cut]) {
                expect(Array.isArray(list)).toBe(true);
            }
        }
    });

    it("finds a skill by its label, and nothing for one the reading did not cover", () => {
        const [label] = Object.keys(reading.skills);
        expect(contentsOf(reading, label ?? null)).not.toBeNull();
        expect(contentsOf(reading, "github.com/nobody/nothing?skill=none")).toBeNull();
        expect(contentsOf(reading, null)).toBeNull();
    });

    it("links a line at the commit, under the skill's directory, or at the root", () => {
        expect(lineUrl("a/b", entry({directory: "skills/x y"}), {file: "SKILL.md", line: 4})).toBe(
            "https://github.com/a/b/blob/ca45fc496a3436251f191354091d557da31c15b5/skills/x%20y/SKILL.md#L4",
        );
        expect(lineUrl("a/b", entry(), {file: "SKILL.md", line: 1})).toBe(
            "https://github.com/a/b/blob/ca45fc496a3436251f191354091d557da31c15b5/SKILL.md#L1",
        );
    });
});
