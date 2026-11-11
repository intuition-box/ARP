import {defineConfig} from "vitest/config";

export default defineConfig({
    test: {
        include: ["test/**/*.test.ts"],
        environment: "node",
        coverage: {
            provider: "v8",
            include: ["src/**"],
            exclude: [
                // Command-line entrypoints: each reads process.argv and calls process.exit at import, so importing one runs it.
                "src/fetch-skill.ts",
                "src/session-log.ts",
            ],
            thresholds: {lines: 90, branches: 90, functions: 90, statements: 90},
        },
    },
});
