# ARP's sponsoring service, hosted (task 78, ADR 0149). Testnet 13579 only: it refuses any other chain.
#   docker build -f apps/sponsor/Dockerfile -t arp-sponsor .
# The build context is the repository root: the service imports packages/protocol and reads
# data/deployments/13579.json and data/catalogue/domains.proposal.json at start.
# apps/sponsor/Dockerfile.dockerignore is an allowlist: only the files named there enter the context.
#
# The image holds no key and no ledger. At run time it needs:
#   - the treasury key, a file mounted by the host and named by SPONSOR_KEY_FILE;
#   - a persistent volume on /data, where the ledger and the category log live;
#   - one container at a time on that volume (apps/web/DEPLOY.md, "The sponsor").

FROM oven/bun:1.3.14
WORKDIR /repo

COPY . .
RUN bun install --frozen-lockfile --ignore-scripts \
    && bun run --cwd packages/protocol build

# The volume mounted here is created from this directory the first time, so it belongs to `bun`.
RUN mkdir -p /data && chown bun:bun /data && chmod 700 /data \
    && chmod 755 apps/sponsor/docker-entrypoint.sh

ENV ARP_HOME=/data \
    SPONSOR_LISTEN=0.0.0.0 \
    SPONSOR_PORT=3200

USER bun
EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD bun -e "fetch('http://127.0.0.1:3200/').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
ENTRYPOINT ["/repo/apps/sponsor/docker-entrypoint.sh"]
