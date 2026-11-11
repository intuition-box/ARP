# The demo x402 seller of task 91, hosted (task 118): takes 0.001 test USDC on Base Sepolia and delivers
# nothing, so the x402 test feed can carry a line whose endpoint is a public URL.
#   docker build -f scripts/demo/x402-seller.Dockerfile -t arp-x402-seller .
# The build context is the repository root, as for apps/sponsor/Dockerfile: `bun install --frozen-lockfile`
# resolves @x402/core and @x402/evm 2.28.0 and viem 2.52.0 from the root lockfile.
# scripts/demo/x402-seller.Dockerfile.dockerignore is an allowlist: only the files named there enter the context.
#
# The image holds no key and signs nothing: the facilitator (x402.org by default) submits the payer's
# EIP-3009 authorisation and pays the gas. It offers one thing, and the code refuses any other: network
# eip155:84532, its USDC, the payee ARP_SELLER_PAY_TO, 1000 units. At run time it needs:
#   - ARP_SELLER_PUBLIC_URL, the origin it is reached at, e.g. https://seller.arp.intuition.box;
#   - ARP_SELLER_PAY_TO, the payee (the runbook expects 0x000000000000000000000000000000000000dEaD).

FROM oven/bun:1.3.14
WORKDIR /repo

COPY . .
RUN bun install --frozen-lockfile --ignore-scripts

ENV ARP_SELLER_LISTEN=0.0.0.0 \
    PORT=4021 \
    ARP_SELLER_PAY_TO=0x000000000000000000000000000000000000dEaD

USER bun
EXPOSE 4021
# Any answer at all is alive: the seller answers 404 off its one path.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD bun -e "fetch('http://127.0.0.1:' + (process.env.PORT ?? '4021') + '/x402-demo/no-delivery').then(r => process.exit(r.status === 402 ? 0 : 1), () => process.exit(1))"
CMD ["bun", "run", "scripts/demo/x402-fake-seller.ts"]
