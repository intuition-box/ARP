#!/bin/sh
# Starts ARP's hosted content server in its container (task 131, ADR 0196).
#
# The key reader refuses a file its group or others can read (ADR 0116). A file mounted by the host
# often is, so, as apps/sponsor/docker-entrypoint.sh does: unless the file is mode 600 and owned by
# the container's user, it is copied to /dev/shm, which is memory and never the image, with mode
# 600, and the server reads the copy. The mounted file must be readable by that user (uid 1000).
# The key's value is never put in the environment or printed.
set -eu

key="${ARP_RECEIPT_KEY_FILE:?ARP_RECEIPT_KEY_FILE must name the mounted receipt key file}"
if [ ! -r "$key" ]; then
  echo "ARP_RECEIPT_KEY_FILE $key is missing or not readable by uid $(id -u)" >&2
  exit 1
fi

if [ "$(stat -c %a "$key")" != "600" ] || [ "$(stat -c %u "$key")" != "$(id -u)" ]; then
  umask 077
  mkdir -p /dev/shm/arp
  chmod 700 /dev/shm/arp
  cp "$key" /dev/shm/arp/receipt.key
  chmod 600 /dev/shm/arp/receipt.key
  ARP_RECEIPT_KEY_FILE=/dev/shm/arp/receipt.key
  export ARP_RECEIPT_KEY_FILE
fi

cd /repo
exec bun run apps/mcp/src/content-server.ts
