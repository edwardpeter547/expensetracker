#!/usr/bin/env bash
# Resolve the macOS host's active LAN IPv4 address for local development.
#
# The interface is derived from the system's default route rather than assumed
# to be en0. An explicit LOCAL_SERVER_IP override always wins.

set -euo pipefail

if [ -n "${LOCAL_SERVER_IP:-}" ]; then
    printf '%s\n' "$LOCAL_SERVER_IP"
    exit 0
fi

active_interface="$(route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}')"
if [ -n "$active_interface" ]; then
    lan_ip="$(ipconfig getifaddr "$active_interface" 2>/dev/null || true)"
fi

# Fallback for environments where the routing socket is unavailable: select
# the first active, non-loopback interface with a routable IPv4 address.
if [ -z "${lan_ip:-}" ]; then
    lan_ip="$(ifconfig 2>/dev/null | awk '
        /^[a-zA-Z0-9]+:/ { iface=$1; sub(/:$/, "", iface); active="" }
        /status: active/ { active=1 }
        /inet / && active && iface != "lo0" {
            for (i=1; i<=NF; i++) {
                if ($i == "inet") { split($(i+1), a, ":"); ip=a[1];
                    if (ip !~ /^127\./ && ip !~ /^169\.254\./) { print ip; exit } }
            }
        }
    ')"
fi

if [ -z "$lan_ip" ]; then
    echo "ERROR: could not determine an active LAN IPv4 address" >&2
    echo "       Set LOCAL_SERVER_IP to an explicit address, or connect to a network." >&2
    exit 1
fi

printf '%s\n' "$lan_ip"
