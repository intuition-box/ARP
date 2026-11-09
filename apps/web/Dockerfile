# The public site (task 74), built from the repository root:
#   docker build -f apps/web/Dockerfile -t arp-web .
# The app imports two workspace packages (packages/protocol, packages/graphql) and files under
# data/, so the build context is the whole repository; apps/web/Dockerfile.dockerignore keeps it
# to what the build reads. VITE_* values are read at BUILD time and baked into the bundle.

FROM oven/bun:1.3.14 AS build
WORKDIR /repo

ARG VITE_SITE_URL=""
ARG VITE_PUBLIC_RELEASE=""
ARG VITE_ALLOW_MAINNET=""
ARG VITE_WALLETCONNECT_PROJECT_ID=""
ARG VITE_INTUITION_TESTNET_RPC_URL=""
ARG VITE_INTUITION_TESTNET_EXPLORER=""
ARG VITE_ARP_API_URL=""
ARG VITE_ARP_ACTIVITY_URL=""
ARG VITE_ARP_SPONSOR_URL=""
ARG VITE_ARP_SPONSOR_ADDRESS=""
ARG VITE_MAX_STAKE_TRUST=""

# Every workspace's manifest, because bun resolves the whole workspace from the lockfile.
COPY . .
RUN bun install --frozen-lockfile --ignore-scripts

# An empty build argument is dropped rather than passed as "": several of these fall back to a
# default only when the variable is absent.
RUN set -eu; \
    for name in VITE_SITE_URL VITE_PUBLIC_RELEASE VITE_ALLOW_MAINNET VITE_WALLETCONNECT_PROJECT_ID \
        VITE_INTUITION_TESTNET_RPC_URL VITE_INTUITION_TESTNET_EXPLORER VITE_ARP_API_URL \
        VITE_ARP_ACTIVITY_URL VITE_ARP_SPONSOR_URL VITE_ARP_SPONSOR_ADDRESS VITE_MAX_STAKE_TRUST; do \
        value=$(printenv "$name" || true); \
        if [ -z "$value" ]; then unset "$name"; fi; \
    done; \
    bun run --cwd apps/web build

FROM nginx:1.27-alpine AS serve
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
