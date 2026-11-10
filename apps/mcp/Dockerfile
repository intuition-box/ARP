# ARP's hosted MCP endpoint, read-only (task 92, ADR 0161). Testnet 13579 only.
#   docker build -f apps/mcp/Dockerfile -t arp-mcp .
# The build context is the repository root: the server imports packages/protocol and reads
# data/deployments and data/catalogue. apps/mcp/Dockerfile.dockerignore is an allowlist.
#
# The image holds no key and needs no volume. The server refuses to start in hosted mode unless it
# serves ARP_TOOLS=read on ARP_TARGET=testnet, with no key in its environment and a public name in
# ARP_PUBLIC_HOST (apps/mcp/src/hosted.ts). It logs no tool argument.
#
# Node, not oven/bun alone: arp_pulse runs `npx skills@1.7.6 find`, and the bun image has no npx.

FROM oven/bun:1.3.14 AS bun

FROM node:22-bookworm-slim
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /repo

COPY . .
RUN bun install --frozen-lockfile --ignore-scripts \
    && bun run --cwd packages/protocol build

ENV ARP_HOSTED=1 \
    ARP_TOOLS=read \
    ARP_TARGET=testnet \
    ARP_HOST=0.0.0.0 \
    PORT=3002 \
    ARP_HOME=/home/node/.arp

USER node
# The search package, fetched once at build so the first search does not wait for it. Same directory
# and prefix the server uses (`searchInvocation`, handlers/pulse.ts); a failure here only means the
# first search downloads it.
RUN mkdir -p -m 700 "$ARP_HOME/skills-cli" \
    && cd "$ARP_HOME/skills-cli" \
    && HOME="$ARP_HOME/skills-cli" npx --prefix "$ARP_HOME/skills-cli" --yes --logs-max=0 skills@1.7.6 --version \
    || echo "skills@1.7.6 not cached at build; the first search fetches it"

EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD bun -e "fetch('http://127.0.0.1:3002/').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["bun", "run", "apps/mcp/src/server.ts"]
