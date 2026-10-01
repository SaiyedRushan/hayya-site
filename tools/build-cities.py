#!/usr/bin/env python3
"""
Writes data/cities.json: every place in GeoNames with 15,000 people or more,
as [name, latitude, longitude, country code].

"Use my exact location" on the home page names the visitor's city by finding
the nearest one in this list, in the browser. That keeps the page's promise
that a location never leaves it: no reverse-geocoding service is asked.
The file is only downloaded when someone presses the button.

GeoNames data is CC BY 4.0 (https://www.geonames.org); the page credits it.

Usage: tools/build-cities.py
"""
import io, json, urllib.request, zipfile
from pathlib import Path

URL = "https://download.geonames.org/export/dump/cities15000.zip"
out = Path(__file__).resolve().parent.parent / "data" / "cities.json"

raw = urllib.request.urlopen(URL).read()
text = zipfile.ZipFile(io.BytesIO(raw)).read("cities15000.txt").decode("utf-8")
# Neighbourhoods (PPLX) would name downtown Toronto "Moss Park"; historical,
# abandoned and destroyed places are no one's city.
SKIP = {"PPLX", "PPLH", "PPLQ", "PPLW"}
rows = []
for line in text.splitlines():
    f = line.split("\t")
    if f[7] in SKIP:
        continue
    # name, latitude, longitude, country code
    rows.append([f[1], round(float(f[4]), 3), round(float(f[5]), 3), f[8]])
out.write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"{len(rows)} cities -> {out} ({out.stat().st_size // 1024} KB)")
