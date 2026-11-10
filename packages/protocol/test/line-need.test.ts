import {describe, expect, it} from "vitest";

import {namedInSkill, needKindOf, needShapeProblem, publishableNeed} from "../src/declare/line-need.js";

const SKILL = `---
name: cut-silences
description: Cut the silences out of a video.
---

# Cut silences

Requires FFmpeg on the PATH, and \`OPENAI_API_KEY\` for the transcript.

\`\`\`bash
ffmpeg -i input.mp4 -af silencedetect out.mp4
\`\`\`

Optional: ffmpeg.wasm in the browser. Uses yt-dlp.
`;

describe("the shape of a need (ADR 0166)", () => {
    it("tells a program from a key, and anything else from both", () => {
        expect(needKindOf("ffmpeg")).toBe("program");
        expect(needKindOf("yt-dlp")).toBe("program");
        expect(needKindOf("OPENAI_API_KEY")).toBe("key");
        for (const text of ["", "/usr/bin/ffmpeg", "ffmpeg -i x", "sk-ABC", "Ffmpeg", "AB", "my file.mp4", "a".repeat(41), "~/bin/x", "KEY=value"]) {
            expect(needKindOf(text)).toBeNull();
        }
    });

    it("fits a need to its outcome and reason", () => {
        expect(needShapeProblem({need: "", outcome: "failed", reason: "missing-file"})).toBeNull();
        expect(needShapeProblem({need: "ffmpeg", outcome: "failed", reason: "missing-program"})).toBeNull();
        expect(needShapeProblem({need: "OPENAI_API_KEY", outcome: "failed", reason: "missing-key"})).toBeNull();
        expect(needShapeProblem({need: "ffmpeg", outcome: "worked", reason: ""})).toBeNull();
        expect(needShapeProblem({need: "ffmpeg", outcome: "failed", reason: "missing-key"})).not.toBeNull();
        expect(needShapeProblem({need: "ffmpeg", outcome: "failed", reason: "not-the-right-tool"})).not.toBeNull();
        expect(needShapeProblem({need: "ffmpeg", outcome: "worked", reason: "missing-program"})).not.toBeNull();
    });
});

describe("the guard: only a word the skill already published (ADRs 0155, 0166)", () => {
    it("publishes a program or a key the SKILL.md names", () => {
        expect(publishableNeed("ffmpeg", SKILL, "program")).toBe("ffmpeg");
        expect(publishableNeed("yt-dlp", SKILL)).toBe("yt-dlp");
        expect(publishableNeed("OPENAI_API_KEY", SKILL, "key")).toBe("OPENAI_API_KEY");
    });

    it("publishes nothing the SKILL.md does not name, even when the error did", () => {
        // A program on the person's machine, a path of theirs, a variable of theirs: none is in the skill.
        expect(publishableNeed("whisper", SKILL, "program")).toBeNull();
        expect(publishableNeed("ACME_INTERNAL_TOKEN", SKILL, "key")).toBeNull();
        expect(publishableNeed("/home/max/clients/acme/ffmpeg", SKILL, "program")).toBeNull();
        expect(publishableNeed("wedding-video.mp4", SKILL, "program")).toBeNull();
    });

    it("matches whole words only", () => {
        expect(namedInSkill("ffmpe", SKILL)).toBe(false);
        expect(namedInSkill("wasm", SKILL)).toBe(false);
        expect(namedInSkill("OPENAI_API", SKILL)).toBe(false);
        expect(namedInSkill("API_KEY", SKILL)).toBe(false);
        expect(namedInSkill("yt", SKILL)).toBe(false);
        expect(namedInSkill("dlp", SKILL)).toBe(false);
    });

    it("reads a key's name in its own case only", () => {
        expect(namedInSkill("OPENAI_API_KEY", SKILL.replace("OPENAI_API_KEY", "openai_api_key"))).toBe(false);
    });

    it("refuses a name of the wrong kind for the reason", () => {
        expect(publishableNeed("ffmpeg", SKILL, "key")).toBeNull();
        expect(publishableNeed("OPENAI_API_KEY", SKILL, "program")).toBeNull();
    });
});
