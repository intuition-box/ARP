# Limits

What ARP does not do yet, or does only in part. Each limit is stated once here, so the other pages can describe what works without repeating it.

## What a line can tell you

- **No third party has reported a result on a skill yet.** As of 2026-11-09, every line that says a skill worked or failed was written by ARP's own test agents (`bun run scripts/measure/proof-of-work.ts`). Other wallets have written lines saying they used a tool, without a result. To count them yourself, from a checkout of the repository: `bun run scripts/measure/proof-of-work.ts`.
- **A line is a declaration, not a proof.** It is an agent's word with its address on it. Nothing in ARP shows that the use it describes happened.
- **Several wallets can be one person.** The order of a search moves only when at least 3 wallets say the same thing, and a fee is paid per line, but one person can still create and fund three wallets. Defences against that are not built.
- **A line is a state, not a history.** If one wallet says a skill worked and later that it failed in the same domain, both are read, with no order between them.
- **An empty opposing side means nobody bothered.** Anyone can support the opposite of a line at the same price, and almost nobody does. Read no opposition as silence, never as agreement.
- **Whether a line shown to an agent changes its choice is not measured.**
- **The words are closed.** A result is `worked` or `failed`; a reason is one of `missing-key`, `missing-program`, `missing-file`, `not-the-right-tool`; a domain is a category that already exists. Anything else cannot be said in a line.

## What runs on your machine

- **The hook sees failures, never success.** It can tell that a command a skill asked for failed, and why in closed words. It cannot tell that something worked, so a `worked` line always comes from an agent or a person saying so.
- **One search vendor.** Search goes through skills.sh, run as `npx skills`. When that does not run, the plugin has no other search and says so.
- **GitHub's limit without a token.** Reading a skill's files uses the GitHub API, which allows 60 requests an hour per address without a token, and every search spends some of them.
- **The plugin does not pay.** It holds no key that moves value. Calling a paid agent needs a wallet outside the plugin.
- **Untested platforms.** Windows and macOS have not been tested, for the CLI or for Claude Desktop.

## Writing

- **The sponsoring service may be unavailable.** Where it will be hosted is not decided. Without it, `arp line` and `arp share send` name the service and fail. You can still write a line by signing and paying for the calls yourself.
- **Lines with a domain, a result or a reason are testnet only.** Two questions block them on mainnet: proving that the writer controls the agent it writes for, and the fact that holding up an existing line with deposits costs far less than writing one.
- **Writing a declaration on mainnet cannot be planned today.** The cost preview the planner relies on fails on mainnet 1155 and answers on testnet. The cause is not established.
- **Nothing to find on mainnet yet.** As of 2026-11-09, no tool or skill from ARP's catalogue is listed on mainnet 1155, so a tool search there returns nothing.

## Getting a skill

- **Serving a skill with a signed receipt needs a content server you run**, and only covers skills whose files ARP could fetch. It works in the sponsored setup on testnet only.
- **A receipt records access, not use.** It shows a skill's files were served to an agent, not that the agent ran them.

## Agents and nodes

- **No stable node address with a quick tunnel.** With a quick tunnel, the address changes at each start and the binding has to be made again. Earlier addresses stay on record and stop answering. A tunnel you run, set in `ARP_NODE_PUBLIC_URL`, keeps one address.
- **Nothing before paying says what a node will return.** You see its address, whether it answers, and the lines about it, not what you will get for the payment.
- **So far ARP knows of no node run by anyone but its own test agents.**
- **Whether an endpoint answers is a moment, not a record.** The probe that checks listed MCP endpoints is not deployed publicly, so its history is not public, and it does not check skills, APIs or agents' own endpoints.

## Money

- **No money reaches a tool.** Money following use is a goal, not a feature.
- **Spending limits for agents are set aside.** The cap enforcer exists on both chains, but agent permissions are not part of the product today. The copy on mainnet is an earlier version, in which anyone could fill another permission's spending counter; it has never been used by a real redemption.

See [Networks and contracts](/docs/networks) for what is deployed where, and [Lines](/docs/lines) for what a line can say.
