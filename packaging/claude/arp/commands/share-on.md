---
description: Turn on sharing of this machine's results, and show the lines that would be public. They go at the end of each session
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/bin/arp.js" share on)
---

!`node "${CLAUDE_PLUGIN_ROOT}/bin/arp.js" share on`

Say what the output above says, briefly, and that the hook sends them at the end of each session, or `/arp:share-send` now. Run nothing else.
