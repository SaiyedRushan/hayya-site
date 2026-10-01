#!/usr/bin/env python3
"""
Writes data/zones.json: every IANA time zone with its country and the
coordinates of its main city, from the system's zone.tab.

The home page uses it to show prayer times for the visitor's area the moment it
loads, from the browser's time zone alone: no location prompt, and no request
to any server. "Use my exact location" and the city search refine it.

Usage: tools/build-zones.py [path-to-zone.tab]
"""
import json, re, sys
from pathlib import Path

src = Path(sys.argv[1] if len(sys.argv) > 1 else "/usr/share/zoneinfo/zone.tab")
out = Path(__file__).resolve().parent.parent / "data" / "zones.json"

def deg(s, width):
    sign = -1 if s[0] == "-" else 1
    d, m, sec = int(s[1:1 + width]), int(s[1 + width:3 + width]), int(s[3 + width:5 + width] or 0)
    return round(sign * (d + m / 60 + sec / 3600), 3)

zones = {}
for line in src.read_text().splitlines():
    if not line or line.startswith("#"):
        continue
    cc, coord, tz = line.split("\t")[:3]
    m = re.match(r"([+-]\d+)([+-]\d+)$", coord)
    lat, lng = m.group(1), m.group(2)
    zones[tz] = [deg(lat, 2), deg(lng, 3), cc]

# Older names some browsers still report.
ALIASES = {
    "Asia/Calcutta": "Asia/Kolkata", "Asia/Katmandu": "Asia/Kathmandu", "Asia/Saigon": "Asia/Ho_Chi_Minh",
    "Asia/Rangoon": "Asia/Yangon", "Asia/Dacca": "Asia/Dhaka", "Europe/Kiev": "Europe/Kyiv",
    "America/Buenos_Aires": "America/Argentina/Buenos_Aires", "Asia/Ujung_Pandang": "Asia/Makassar",
    "Asia/Istanbul": "Europe/Istanbul", "US/Eastern": "America/New_York", "US/Central": "America/Chicago",
    "US/Mountain": "America/Denver", "US/Pacific": "America/Los_Angeles", "Canada/Eastern": "America/Toronto",
}
for old, new in ALIASES.items():
    if new in zones:
        zones[old] = zones[new]

out.write_text(json.dumps(zones, separators=(",", ":")) + "\n")
print(f"{len(zones)} zones -> {out}")
