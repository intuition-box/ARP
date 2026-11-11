# Task 117 — The deploy: site, sponsor, MCP endpoint and demo seller on Coolify

**Status:** see the completion note at the end.
**ADR:** none. Every setting is DEPLOY.md's (tasks 74, 78, 92, ADR `0149`, `0161`); the key and the hosts are the user's.
**Rules:** `workflow.md`, `claims.md`, `security.md` (the sponsor signs on testnet 13579 only), `portability.md`, `code.md`.
Gates: root `bun run check` and `bun run test`, `apps/cli` `check:node` and `packages --check`, `apps/web` `tsc -b` and lint.
**Required skills:** `arp-contributing`.

## Why

Until today the site ran nowhere public, and the sponsoring service and the MCP endpoint ran only on the
user's machine. A tester on CLI 0.0.3 could not write a line unless they ran a sponsor of their own,
and a client that only takes a URL had no URL to take.

## Do not do in this task

- Read, print or copy the sponsor's key. The user pastes it into Coolify's file mount himself.
- Sign or send anything. The sponsor address was funded by the user.
- `npm publish` or `mcp-publisher publish`. Both need the user's 2FA. Pushing `main` is the orchestrator's job.
- Set `ARP_ALLOW_PRIVATE_PROBE` on any host.

## Deliverables

1. **The four images built and run locally** with their real hosts, before anything went online (2026-11-11,
   Docker 28.3.3, built from `1a291387`). Results:
   - MCP: health check healthy; `/` 200 on `Host: mcp.arp.intuition.box` and 403 on any other;
     `tools/list` listed `arp_pulse`, `arp_tool_reputation`, `arp_agent_endpoints`.
   - Sponsor: run with a throwaway, unfunded key mounted at mode 644. The entrypoint copied it to
     `/dev/shm/arp/sponsor.key`, mode 600, owned by `bun`. `GET /` returned 200 with chain 13579 and the
     limits set; another host got a 403.
   - Seller (`scripts/demo/x402-seller.Dockerfile`, task 118): health check healthy;
     `/x402-demo/no-delivery` returned 402 with `resource.url` on `https://seller.arp.intuition.box`;
     `/` returned 404. It has no Host restriction: it holds no key and delivers nothing.
   - Site: built with `VITE_PUBLIC_RELEASE=1`, `VITE_SITE_URL=https://arp.intuition.box` and
     `VITE_ARP_SPONSOR_URL=https://sponsor.arp.intuition.box`. nginx was healthy; `/agents` and
     `/atom/0xabc` returned 200 on reload; a missing `/assets/…` returned 404; `robots.txt` and
     `sitemap.xml` name `https://arp.intuition.box`.
   No image needed a fix.
2. **The deploy sheet** for the user: Coolify fields and variables per app, in this order: MCP, sponsor,
   site, seller. It was kept in the session's scratchpad and relayed by the orchestrator. The sponsor's
   values come from what the local ledger shows it paid:
   - `SPONSOR_DEPOSIT_WEI=1000000000000000`
   - `SPONSOR_APPROVAL_GAS_WEI=100000000000000`
   - `SPONSOR_MINT_GAS_WEI=100000000000000`
   - `SPONSOR_DAILY_BUDGET_WEI=1000000000000000000`
   - `SPONSOR_REGISTRIES=eip155:13579:0xC165A2AD2E540A4069E02834009161E2b4490d5A`
   - `SPONSOR_ALLOWED_ORIGINS=https://arp.intuition.box`
3. **The key.** The user's choice (a): the hosted sponsor signs with `0x77939A4c276f3E549276CEB3A09CDa1fF58b7ec9`,
   the key he created for it on 2026-11-09 (task 78). It was already in `arp.sponsor`,
   `ARP_DOMAIN_ATTESTORS` and `OUR_WALLETS`, so no address changed in the repo. On 2026-11-11, before the
   deploy, it held 10.4 tTRUST with nonce 0 (`eth_getBalance` and `eth_getTransactionCount` on 13579).
   DEPLOY.md advises 3 or less on a hosted key. The local sponsor's key, `~/.arp/sponsor.key`, is the
   deployer `0xE596…1AA1` (`arp.sponsorV1`); only its address was derived, never its contents.
4. **Verified online by `curl`, 2026-11-11:**
   - `https://mcp.arp.intuition.box/`: 200. `/mcp` `tools/list` listed the three read tools. A real
     search answered in 6.9 s (orchestrator's run).
   - `https://seller.arp.intuition.box/x402-demo/no-delivery`: 402 with the public URL.
   - `https://sponsor.arp.intuition.box/`: `sponsor` `0x77939A4c…7ec9`, chain 13579, `identity` and
     `publish` enabled, the deposit and mint-gas values above. `OPTIONS /list-tool` with
     `Origin: https://arp.intuition.box` returned 204 with that origin allowed.
   - `https://arp.intuition.box/agents` and `/atom/0xabc`: 200 on reload. `robots.txt` names
     `https://arp.intuition.box/sitemap.xml`, and the sitemap lists `https://arp.intuition.box/…`.
5. **Task 122 merged** (line request v5), so the sponsor built from `main` and CLI 0.0.4 ship together.
   STATE and the indexes were resolved by keeping both sides and regenerating.
6. **CLI 0.0.4 prepared, not published:**
   - `config.sponsorDefault=https://sponsor.arp.intuition.box`.
   - Version 0.0.4 in `apps/cli/package.json`, `server.json` and `packaging/` (regenerated).
   - `server.json` gains `remotes`: `streamable-http`, `https://mcp.arp.intuition.box/mcp`.
   - `CHANGELOG.md`: Unreleased is now 0.0.4, with the hosted default and the v5 breaking note. 0.0.3 is
     marked published 2026-11-10.
7. **Docs** where "not hosted" was now false (claims check 5: grepped "not hosted", "not live",
   `127.0.0.1:3200`, `ARP_SPONSOR=`):
   - `install.md` gives the hosted MCP URL as a route.
   - `README.md`, `DEPLOY.md` (the testers' paragraph and the hosted hosts), `architecture.md`, `cli.md`,
     `developers.md`, `mcp-tools.md`, `local-memory.md`, `docs/22`, `docs/23`, `docs/31` (struck in
     place, amended) and `skills/arp/SKILL.md`.
   - One code comment, `apps/web/src/services/start-steps.ts`.

   Kept as they are: the probe's "not hosted yet" in `x402-feed.md` (the probe really is not hosted), and
   `@arp-protocol/cli@0.0.3` in the install commands until 0.0.4 is on npm.

## Not settled

- **The order of release.** The hosted sponsor runs `1a291387`, which has line request v4. Once this
  branch is on `main` and the sponsor is redeployed, 0.0.3's lines get a 401. 0.0.4's lines get a 401
  against the sponsor running now. So: merge, redeploy the sponsor, publish 0.0.4, all in one go.
- The hosted connector has not been added in Claude Desktop or claude.ai; only `curl` has called it.
- After 0.0.4 is on npm, `install.md`'s `@0.0.3` commands and its "0.0.4 prepared" become 0.0.4.
