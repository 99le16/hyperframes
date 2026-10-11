#!/usr/bin/env python3
"""brand_lookup.py <artifact.html> [brand]  — read a Conquer-style brandbook artifact (the HTML that `Artifact read` saves) and
print the brand's style as JSON: name, statement, note, fonts, gradients (hex stops), background, UI flags (paper, grid, glow,
glass, texture, emblem), copy (stat, sub, cards) and the saved editor settings.
Without [brand] it lists every brand id/name found. Matching is case/accent-insensitive on id, name or surname
("Conquer Finance", "finance", "Finance" all work)."""
import json, re, sys, unicodedata

def norm(s): return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode())

def balanced(s, i, open_ch, close_ch):
    """substring from s[i] (an opening bracket) to its matching close, ignoring brackets inside strings"""
    depth, j, q = 0, i, None
    while j < len(s):
        c = s[j]
        if q:
            if c == "\\": j += 2; continue
            if c == q: q = None
        elif c in "\"'`": q = c
        elif c == open_ch: depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0: return s[i:j + 1]
        j += 1
    return s[i:]

def field(block, key, kind):
    m = re.search(r"\b" + key + r"\s*:\s*" + re.escape(kind[0]), block)
    return balanced(block, m.end() - 1, *kind) if m else None

def strfield(block, key):
    m = re.search(r"\b" + key + r'\s*:\s*"((?:[^"\\]|\\.)*)"', block)
    return m.group(1) if m else None

def main():
    html = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
    brands = []
    for m in re.finditer(r'\{\s*id\s*:\s*"([^"]+)"\s*,\s*name\s*:\s*"([^"]+)"', html):
        blk = balanced(html, m.start(), "{", "}")
        brands.append(dict(id=m.group(1), name=m.group(2), surname=strfield(blk, "surname"), block=blk))
    if len(sys.argv) < 3:
        print(json.dumps([{k: b[k] for k in ("id", "name", "surname")} for b in brands], ensure_ascii=False, indent=1)); return
    want = norm(sys.argv[2]); want_short = norm(re.sub(r"(?i)^conquer\s*", "", sys.argv[2]))
    hit = next((b for b in brands if want in (norm(b["id"]), norm(b["name"]), norm(b["surname"] or ""), norm("conquer" + (b["surname"] or "")))
                or want_short in (norm(b["id"]), norm(b["name"]))), None)
    if not hit:
        print(json.dumps({"error": f"brand '{sys.argv[2]}' not found", "available": [b["name"] for b in brands]}, ensure_ascii=False)); sys.exit(1)
    b = hit["block"]
    fonts = [dict(f=f, w=int(w), d=d) for f, w, d in re.findall(r'\{\s*f\s*:\s*"([^"]+)"\s*,\s*w\s*:\s*(\d+)\s*,\s*d\s*:\s*"([^"]*)"', field(b, "fonts", "[]") or "")]
    grads_raw = field(b, "grads", "[]") or ""
    grads = [dict(name=n, stops=re.findall(r"#[0-9A-Fa-f]{6}", s)) for n, s in re.findall(r'n\s*:\s*"([^"]+)"\s*,\s*s\s*:\s*\[([^\]]*)\]', grads_raw)]
    gm = re.search(r"\bgrads\s*:\s*([A-Z_]+)", b)
    if not grads and (gm or re.match(r"[A-Z_]+", grads_raw.strip("[]"))):   # grads given by a constant ([BLOCKS_GRAD] or BIZ_GRADS)
        const = gm.group(1) if gm else grads_raw.strip("[] ")
        m = re.search(r"\b" + re.escape(const) + r"\s*=\s*", html)
        if m:
            body = balanced(html, m.end(), html[m.end()], "]" if html[m.end()] == "[" else "}")
            named = re.findall(r'n\s*:\s*"([^"]+)"\s*,\s*s\s*:\s*\[([^\]]*)\]', body)
            grads = [dict(name=n, stops=re.findall(r"#[0-9A-Fa-f]{6}", st)) for n, st in named] or [dict(name=const, stops=re.findall(r"#[0-9A-Fa-f]{6}", body[:600]))]
    if not fonts:
        fm = re.search(r"\bfonts\s*:\s*([A-Z_]+)", b) or re.match(r"\s*([A-Z_]+)", (field(b, "fonts", "[]") or "").strip("[]"))
        if fm:
            m = re.search(r"\b" + fm.group(1) + r"\s*=\s*\[", html)
            if m: fonts = [dict(f=f, w=int(w), d=d) for f, w, d in re.findall(r'\{\s*f\s*:\s*"([^"]+)"\s*,\s*w\s*:\s*(\d+)\s*,\s*d\s*:\s*"([^"]*)"', balanced(html, m.end() - 1, "[", "]"))]
    ui = field(b, "u", "{}") or ""
    uiflags = dict(re.findall(r'(\w+)\s*:\s*("?[^,"}]+"?)', ui))
    copy = field(b, "copy", "{}") or ""
    saved = None
    m = re.search(r'"' + re.escape(hit["id"]) + r'"\s*:\s*\{"font"', html)
    if m:
        try: saved = json.loads(balanced(html, m.end() - len('{"font"'), "{", "}"))
        except Exception: saved = None
    out = dict(id=hit["id"], name=hit["name"], surname=hit["surname"], bg=strfield(b, "bg"), light=bool(re.search(r"\blight\s*:\s*true", b)),
               statement=strfield(b, "stmt"), note=strfield(b, "note"), fonts=fonts, gradients=grads,
               ui={k: v.strip('"') for k, v in uiflags.items()}, stat=re.findall(r'stat\s*:\s*\[([^\]]*)\]', copy)[:1],
               sub=strfield(copy, "sub"), cards=re.findall(r'cards\s*:\s*\[([^\]]*)\]', copy)[:1], emblems=re.findall(r'cqs\s*:\s*\[([^\]]*)\]', copy)[:1],
               saved_settings=saved)
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
