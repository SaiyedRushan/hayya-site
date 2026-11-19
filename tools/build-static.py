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

- the Hadith section's shelf of books and the first book's card, from
  data/hadith-books.json (tools/export-hadith-books.mjs), between
  <!-- hadith-shelf:start/end --> and <!-- hadith-card:start/end -->. home.js
  redraws the card when a book is picked, so keep hadith_card() here and card()
  in startHadith() alike.

Run after tools/sync-duas.sh, after tools/export-hadith-books.mjs, and after
editing the FAQ:

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


# Hadith: the shelf, and the card for the first book, as home.js draws them.
GOALS = (1, 3, 5, 10)

def duration(days):
    if days <= 60:
        return f"{days} day" if days == 1 else f"{days} days"
    if days <= 730:
        return f"about {round(days / 30)} months"
    return f"about {round(days / 365)} years"

def hadith_card(b, goal=1):
    first = b["first"]
    head = f'{esc(first["label"])}: {esc(first["en"])}' if first["label"] else f'The first {len(first["shown"])} hadiths'
    ar = f' <span lang="ar" dir="rtl">{esc(first["ar"])}</span>' if first["label"] else ""
    size = f'{b["hadiths"]:,} hadiths in {b["chapters"]} chapters' if b["chapters"] > 1 else f'{b["hadiths"]:,} hadiths'
    chips = "".join(
        f'<button type="button" data-goal="{g}" aria-pressed="{str(g == goal).lower()}">{g}</button>' for g in GOALS
    )
    rows = "".join(
        f'''
                <li class="hb-row"><button type="button" class="hb-tick" role="checkbox" aria-checked="false" data-n="{esc(h["n"])}" aria-label="Mark hadith {esc(h["n"])} as read"></button><a href="{esc(h["url"])}" target="_blank" rel="noopener">Hadith {esc(h["n"])}<small>sunnah.com<svg aria-hidden="true"><use href="#i-out"/></svg></small></a></li>'''
        for h in first["shown"]
    )
    more = first["size"] - len(first["shown"])
    where = "chapter" if first["label"] else "book"
    more_line = f'\n              <p class="hb-more">{more:,} more in this {where}.</p>' if more > 0 else ""
    return f'''
            <div class="hb-top">
              <div>
                <h3 class="hb-title">{esc(b["title"])}</h3>
                <p class="hb-by">{esc(b["by"])}</p>
              </div>
              <p class="hb-title-ar" lang="ar" dir="rtl">{esc(b["arabic"])}</p>
            </div>
            <p class="hb-size">{size}</p>
            <div class="hb-goal">
              <p class="hb-label" id="hb-goal-label">How many do you want to read a day?</p>
              <div class="hb-chips" role="group" aria-labelledby="hb-goal-label">{chips}</div>
              <p class="hb-est" aria-live="polite">At {goal} a day, you finish it in {duration(-(-b["hadiths"] // goal))}.</p>
            </div>
            <div class="hb-chapter">
              <p class="hb-ch">{head}{ar}</p>
              <p class="hb-progress" aria-live="polite">0 of {first["size"]:,} read</p>
              <div class="hb-bar"><i></i></div>
              <ul class="hb-rows">{rows}
              </ul>{more_line}
            </div>'''

hb = json.loads((root / "data" / "hadith-books.json").read_text())["books"]
shelf = "".join(
    f'''
          <button type="button" class="hb-book" data-book="{b["id"]}" aria-pressed="{str(i == 0).lower()}" aria-label="{esc(b["title"])}, {b["hadiths"]:,} hadiths" style="--leather: {b["leather"]}">
            <span class="hb-cover"><svg aria-hidden="true"><use href="#i-rosette"/></svg><span class="hb-cover-ar" lang="ar" dir="rtl">{esc(b["arabic"])}</span></span>
            <span class="hb-name">{esc(b["title"])}</span>
          </button>'''
    for i, b in enumerate(hb)
)
s = between(s, "hadith-shelf", shelf, 10)
s = between(s, "hadith-card", hadith_card(hb[0]), 12)
page.write_text(s)
print(f"{len(cards)} dua cards, {len(items)} FAQ answers -> {page.name}")
