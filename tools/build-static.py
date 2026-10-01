#!/usr/bin/env python3
"""
Writes the parts of index.html that are generated, so they are in the HTML
itself rather than only built by home.js in the browser:

- the 39 duʿā cards, from data/duas.json, between <!-- duas:start/end -->.
  Search engines and AI crawlers that don't run JavaScript (ChatGPT's, Claude's
  and Perplexity's among them) read these; home.js replaces them with the same
  markup when it adds search and filters, so keep the two templates alike.
- the FAQ's structured data (schema.org FAQPage), between <!-- faq-ld:start/end -->,
  copied from the visible FAQ so the two can't disagree.

Run after tools/sync-duas.sh, and after editing the FAQ:

  tools/build-static.py
"""
import html, json, re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
page = root / "index.html"
s = page.read_text()
esc = lambda t: html.escape(str(t), quote=True)

def between(text, name, body, indent):
    pattern = re.compile(rf"(<!-- {name}:start -->)(.*?)(\n[ ]*<!-- {name}:end -->)", re.S)
    if not pattern.search(text):
        raise SystemExit(f"index.html has no <!-- {name}:start --> marker")
    return pattern.sub(lambda m: m.group(1) + body + m.group(3), text)

# Dua cards: the same markup as card() in home.js.
data = json.loads((root / "data" / "duas.json").read_text())
cards = []
for d in data["duas"]:
    places = " · ".join(esc(p["label"]) for p in d["places"])
    rep = f'<span class="dua-rep">{d["repeat"]} times</span>' if d["repeat"] > 1 else ""
    remark = f'<span>{esc(d["remark"])}</span>' if d.get("remark") else ""
    cards.append(f'''
          <details class="dua" id="dua-{d["id"]}">
            <summary>
              <span class="dua-head">
                <span class="dua-name"><span class="dua-title">{esc(d["title"])}</span><span class="dua-places">{places}</span></span>
                {rep}
              </span>
              <span class="dua-peek" lang="ar">{esc(d["arabic"].split(chr(10))[0])}</span>
              <span class="dua-more">Read the full duʿā</span>
            </summary>
            <div class="dua-body">
              <p class="dua-ar" lang="ar" dir="rtl">{esc(d["arabic"])}</p>
              <p class="dua-tr">{esc(d["transliteration"])}</p>
              <p class="dua-en">{esc(d["english"])}</p>
              <p class="dua-src"><span>{esc(d["source"])}</span>{remark}</p>
            </div>
          </details>''')
s = between(s, "duas", "".join(cards), 10)

# FAQPage from the visible questions and answers.
faq_html = re.search(r'<div class="faq[^"]*">(.*?)\n        </div>\n      </div>\n    </section>', s, re.S).group(1)
text = lambda frag: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", frag))).strip()
items = []
for q, body in re.findall(r"<summary>(.*?)</summary>(.*?)</details>", faq_html, re.S):
    answer = " ".join(text(p) for p in re.findall(r"<p>(.*?)</p>", body, re.S))
    items.append({"@type": "Question", "name": text(q), "acceptedAnswer": {"@type": "Answer", "text": answer}})
ld = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": items}, ensure_ascii=False, indent=2)
s = between(s, "faq-ld", "\n  <script type=\"application/ld+json\">\n  " + ld.replace("\n", "\n  ") + "\n  </script>", 2)

page.write_text(s)
print(f"{len(cards)} dua cards, {len(items)} FAQ answers -> {page.name}")
