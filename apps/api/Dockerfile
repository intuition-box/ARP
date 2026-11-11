# ARP's facts API, hosted (task 140, ADR 0200): GitHub's and skills.sh's figures, cached and dated.
#   docker build -f apps/api/Dockerfile -t arp-api .
# The build context is the repository root: the service imports packages/protocol and bundles
# data/catalogue/skills-13579.json and data/catalogue/tools.json.
# apps/api/Dockerfile.dockerignore is an allowlist: only the files named there enter the context.
#
# The image holds no secret. At run time it needs:
#   - API_PUBLIC_HOST, the name the proxy forwards;
#   - a persistent volume on /data, where api.sqlite lives (the cache and the cycle's cursor);
#   - GITHUB_TOKEN, optional, a classic token with no scopes, set as a runtime variable.

FROM oven/bun:1.3.14
WORKDIR /repo

COPY . .
# No build of packages/protocol: under bun, its `package.json` exports resolve to `src/` (task 124).
RUN bun install --frozen-lockfile --ignore-scripts

# The volume mounted here is created from this directory the first time, so it belongs to `bun`.
RUN mkdir -p /data && chown bun:bun /data && chmod 700 /data

ENV ARP_DATA_DIR=/data \
    API_LISTEN=0.0.0.0 \
    API_PORT=8787

USER bun
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD bun -e "fetch('http://127.0.0.1:8787/healthz').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["bun", "run", "apps/api/src/main.ts"]
