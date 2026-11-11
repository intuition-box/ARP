# ARP's probe, hosted (task 140, ADR 0200): whether each catalogued MCP endpoint answers, and what
# each package's registry says, every five minutes.
#   docker build -f apps/probe/Dockerfile -t arp-probe .
# The build context is the repository root: the service imports packages/protocol and bundles
# data/catalogue/package-identity-13579.json and data/catalogue/remote-endpoints.json.
# apps/probe/Dockerfile.dockerignore is an allowlist: only the files named there enter the context.
#
# The image holds no secret and the service needs none. At run time it needs:
#   - PROBE_PUBLIC_HOST, the name the proxy forwards;
#   - a persistent volume on /data, where probe.sqlite lives (the history, append only).
# It refuses private addresses whatever the environment says: nothing here reads ARP_ALLOW_PRIVATE_PROBE.

FROM oven/bun:1.3.14
WORKDIR /repo

COPY . .
# No build of packages/protocol: under bun, its `package.json` exports resolve to `src/` (task 124).
RUN bun install --frozen-lockfile --ignore-scripts

# The volume mounted here is created from this directory the first time, so it belongs to `bun`.
RUN mkdir -p /data && chown bun:bun /data && chmod 700 /data

ENV ARP_DATA_DIR=/data \
    PROBE_LISTEN=0.0.0.0 \
    PROBE_PORT=8788

USER bun
EXPOSE 8788
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD bun -e "fetch('http://127.0.0.1:8788/healthz').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["bun", "run", "apps/probe/src/main.ts"]
