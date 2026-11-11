import {defineConfig} from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        include: ["test/**/*.test.ts"],
        environment: "node",
        coverage: {
            provider: "v8",
            include: ["src/**"],
            thresholds: {lines: 90, branches: 90, functions: 90, statements: 90},
        },
    },
});
