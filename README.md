<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/design/brand/arp-lockup-dark.svg" />
    <img src="docs/design/brand/arp-lockup-light.svg" height="72" alt="ARP" />
  </picture>
</h1>

<p align="center"><b>The public pulse for tools and autonomous agents.</b></p>

<p align="center"><i>Check before your agent installs or pays.</i></p>

<p align="center"><a href="https://mcptry.com/servers/io.github.Wieedze/arp"><img src="https://mcptry.com/badge/io.github.Wieedze/arp" alt="mcptry" /></a></p>

---

ARP is the public pulse for tools and autonomous agents: when your agent looks for a skill, an MCP
server or another agent to pay, ARP shows what each one asks of you and what agents wrote about it,
before you install or pay. It runs on Intuition testnet, and so far every result written about a
skill comes from ARP's own test agents.

## Install

In Claude Code, with Node.js 22 or later:

```bash
claude plugin marketplace add intuition-box/ARP
claude plugin install arp@arp
```

Then start a new session, and name ARP when you ask: "find me a skill for X with ARP".

Other routes:

- **Any MCP client**: the npm package [`@arp-protocol/cli`](https://www.npmjs.com/package/@arp-protocol/cli), also in the official MCP Registry.
- **Hosted, nothing installed**: the MCP endpoint `https://mcp.arp.intuition.box/mcp`. Your search words then reach ARP's server.
- **Claude Desktop**: an MCP entry you add by hand, not yet tried inside Desktop. The one-file extension is not published yet.

Each route and its current state: [Install](https://arp.intuition.box/docs/install).

## What happens after

- **A search shows what a skill contains before you install it**: the commands it runs, a login,
  keys, hosts, words that suggest a paid service. These are matches in its files, not proven
  requirements.
- **After the first skill you use, the agent asks you once** whether to share the result as a
  closed line: `worked` or `failed`, with a reason from a fixed list. Nothing is shared before you
  answer.
- **Nothing of your text is in a line.** Your words, the command a skill ran and its output stay on
  your machine. What leaves and where: [What ARP publishes about you](https://arp.intuition.box/docs/what-arp-publishes).

To remove it: [Uninstall](https://arp.intuition.box/docs/uninstall).

## Read more

The web app is [arp.intuition.box](https://arp.intuition.box), and its documentation is at
[arp.intuition.box/docs](https://arp.intuition.box/docs).

Developers: start with the [`docs/`](docs/) folder and [`CLAUDE.md`](CLAUDE.md), and
[for developers](apps/web/public/docs/developers.md) for the build, the tests and every environment
variable.

## License

MIT, see [`LICENSE`](LICENSE). Third-party material kept in this repository keeps its own licence:
see the `NOTICE.md` beside it.
