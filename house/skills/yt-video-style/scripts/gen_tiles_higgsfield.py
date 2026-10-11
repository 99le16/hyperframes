#!/usr/bin/env python3
"""gen_assets.py [ids...] — GPT Image 2 via higgsfield (OpenAI API key has no credits). Tiles (transparent) + avatar stills.
Skips existing files. Writes gen/<id>.png."""
import json, os, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
HERE = os.getcwd()   # run from work/style; style reference = skill assets/ref_tile_style.png
TILE = ("A single glossy 3D app-icon tile in EXACTLY the style of the reference image: a chunky soft-white squircle tile with a thick "
        "rounded bevel and soft studio lighting, seen almost straight-on with a slight 3D tilt; on its face a raised, glossy, embossed {icon}. "
        "Clean, premium, minimal. Only ONE tile, centred, filling ~80% of the canvas. The background is a perfectly flat, uniform, solid {key} chroma-key colour "
        "(no gradient, no checkerboard, no floor, no shadow on the background). No text, no letters.")
TILES = {
 "chart": "candlestick chart with three green and two red candles", "chest": "golden padlock with a keyhole", "car": "red sports car (side view)",
 "plane": "white-and-blue airplane", "beach": "beach umbrella with orange and white stripes", "gradcap": "black graduation cap with a gold tassel",
 "warning": "orange warning triangle with an exclamation mark", "box": "brown cardboard shipping box", "monitor": "computer monitor showing a green rising chart",
 "barrel": "black oil barrel with a blue band", "wheat": "golden wheat ear", "sugar": "three white sugar cubes", "coffee": "brown coffee beans pile",
 "bitcoin": "orange bitcoin coin", "stocks": "blue bar chart with a green arrow going up", "gold": "shiny gold bar ingot", "oil": "glossy black oil drop",
 "forex": "two coins, a euro coin and a dollar coin, overlapping, gold and silver", "play": "red rounded-rectangle video play button",
 "camera": "camera glyph on a purple-orange-pink gradient rounded square (social photo app)", "people": "group of three people silhouettes in violet",
 "trophy": "golden trophy cup", "books": "stack of three books, blue, orange and white",
}
STYLE_AV = ("Image 1 is the CHARACTER and STYLE reference: a cartoon of the presenter (short black hair, clean-shaven with light stubble, brown eyes, "
            "mauve t-shirt, black smartwatch). Keep exactly that illustration style (soft painterly semi-3D cartoon, clean outlines, warm rim light, "
            "rich navy-blue and warm orange palette, cinematic lighting). 16:9 frame. No text, no letters, no logos anywhere. ")
AVS = {
 "AV2": "Draw a DIFFERENT character in the same style (NOT the presenter): a flashy fake 'trading guru', slicked-back hair, mirrored sunglasses, "
        "open shirt, gold chain, showing off a big gold watch on his raised wrist, leaning on a red Lamborghini-like supercar in front of a modern "
        "white mansion with palm trees at golden-hour sunset. Character in the left half; the right third has calm sky for text.",
 "AV3": "The presenter, smiling, kneeling and watering a small young tree whose leaves are shiny gold coins, in a cosy garden at dusk with warm "
        "lights; a glowing city skyline far behind. Character and tree in the left 45% of the frame; right third calm and empty for text.",
 "AV4": "No people. A big cargo ship loaded with colourful containers and stacked coffee sacks sailing across a calm ocean at sunset from one "
        "port to another, cranes of the destination port glowing on the horizon. Ship in the left-centre; right third calm sky for text.",
 "AV5": "The presenter standing in front of a huge round glowing bank-vault door that is opening with golden light pouring out, holding a big "
        "golden key, impressed smile. Presenter on the left, vault centre-left; right third darker empty for text.",
 "AV6": "The presenter as a young office intern, wearing a lanyard badge, carefully balancing a tall tower of takeaway coffee cups while walking "
        "through a modern office at night with blue monitors. Character in the left half, right third empty wall for text.",
 "AV7": "The presenter, older and relaxed, sitting on a lounge chair on a terrace above the sea at sunset with a laptop on his knees showing "
        "a green chart, a drink on the table. Character in the left half, right third calm sunset sky for text.",
 "AV8": "The presenter relaxing, half lying, on a giant comfy cushion made of stacked green banknotes, in a cosy living room at night with warm "
        "lamp light, content smile. Character in the left half, right third empty for text.",
}
def run(job):
    jid, kind, prompt, refs, extra = job
    out = f"gen/{jid}.png"
    if os.path.exists(out): return f"skip {jid}"
    cmd = ["higgsfield", "generate", "create", "gpt_image_2", "--prompt", prompt, "--quality", "medium", "--wait", "--json"] + extra
    for r in refs: cmd += ["--image", r]
    o = subprocess.run(cmd, capture_output=True, text=True)
    try:
        d = json.loads(o.stdout); d = d[0] if isinstance(d, list) else d; url = d["result_url"]
    except Exception:
        return f"FAIL {jid}: {o.stdout[-300:]} {o.stderr[-300:]}"
    urllib.request.urlretrieve(url, out); return f"ok {jid}"
GREENISH = {"chart", "stocks", "monitor"}
key = lambda k: "pure magenta (#FF00FF)" if k in GREENISH else "pure green (#00FF00)"
jobs = [(k, "tile", TILE.format(icon=v, key=key(k)), [os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "ref_tile_style.png")], ["--aspect_ratio", "1:1", "--resolution", "1k", "--background", "opaque"]) for k, v in TILES.items()]
jobs += [(k, "av", STYLE_AV + v, ["gen/avatar_test.png"], ["--aspect_ratio", "16:9", "--resolution", "2k"]) for k, v in AVS.items()]
want = sys.argv[1:]
if want: jobs = [j for j in jobs if j[0] in want]
os.makedirs("gen", exist_ok=True)
with ThreadPoolExecutor(4) as ex:
    for r in ex.map(run, jobs): print(r, flush=True)
