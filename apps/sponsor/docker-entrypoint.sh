#!/bin/sh
# Starts the sponsoring service in its container (task 78, ADR 0149).
#
# The service refuses a key file that its group or others can read (ADR 0089 §3, ADR 0116). A file
# mounted by the host often is, so this script is stricter: unless the file is mode 600 and owned by
# the container's user, it is copied to /dev/shm, which is memory and never the image or the
# volume, with mode 600, and the service reads the copy. The mounted file must be readable by that
# user (uid 1000). The key's value is never put in the environment or printed.
set -eu

key="${SPONSOR_KEY_FILE:?SPONSOR_KEY_FILE must name the mounted key file}"
if [ ! -r "$key" ]; then
  echo "SPONSOR_KEY_FILE $key is missing or not readable by uid $(id -u)" >&2
  exit 1
fi

if [ "$(stat -c %a "$key")" != "600" ] || [ "$(stat -c %u "$key")" != "$(id -u)" ]; then
  umask 077
  mkdir -p /dev/shm/arp
  chmod 700 /dev/shm/arp
  cp "$key" /dev/shm/arp/sponsor.key
  chmod 600 /dev/shm/arp/sponsor.key
  SPONSOR_KEY_FILE=/dev/shm/arp/sponsor.key
  export SPONSOR_KEY_FILE
fi

cd /repo
exec bun run apps/sponsor/src/main.ts
