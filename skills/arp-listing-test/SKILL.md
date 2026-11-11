---
name: arp-listing-test
description: A fixture for ARP's own tests of adding a skill to the index. It does nothing; do not install it.
license: MIT
metadata:
  internal: true
---

# ARP listing test

This skill exists so ARP can test adding a skill to its index without listing somebody else's
work. It has no instructions to follow.

`metadata.internal: true` hides it from `npx skills add intuition-box/ARP`; naming it with
`--skill arp-listing-test` still installs it, and there is no reason to.
