#!/usr/bin/env python3
"""gen_images.py — generate PNG assets and explanatory images with the OpenAI Images API.

The counterpart to /envato-stock: that one *buys* footage that already exists,
this one *makes* the picture that does not. Same contract in both cases — files on
disk in a folder the caller names, so the compositor never learns where a frame
came from.

    # one asset, cut out on transparency, ready to be animated
    python3 tools-ai/gen_images.py "flat icon of a padlock, one green accent" \
        --out assets/ai/lock.png --transparent --trim

    # a whole set from a spec file (this is the normal way)
    python3 tools-ai/gen_images.py --spec work/ai_assets.json --out-dir assets/ai

    # keep a set visually consistent: hand back what you already made
    python3 tools-ai/gen_images.py "the same object seen from the side" \
        --ref assets/ai/lock.png --out assets/ai/lock_side.png --transparent

Stdlib only — urllib, no `openai` package, nothing to install. PIL is imported
lazily and only for --trim.

Two models, and the difference is not cosmetic:

  * gpt-image-1.5 supports `background: transparent`. It is the only route to a
    cut-out PNG asset, so it is the default whenever --transparent is asked for.
  * gpt-image-2 is the newest and reads a compositional brief best, but it
    REFUSES a transparent background (400 image_generation_user_error). It is the
    default for full-frame explanatory images.

Both write PNG. Every generated file gets a `<name>.gen.json` sidecar recording
the exact prompt, model and settings that produced it: an asset nobody can
re-derive is an asset that cannot be revised, and these get revised.

**Do not ask the model for text.** Every image model still sets type badly, and
this house style has real typography available (gfxlib + Helvetica Now Display).
Generate the picture with "no text, no letters, no words" in the prompt and set
the words in `animate_assets.py`, where they are sharp, correctly spelled and in
the same face as the rest of the edit.

The API key is read from, in order: --api-key, $OPENAI_IMAGE_API_KEY,
$OPENAI_API_KEY, then a KEY=VALUE line in ./.env (walking up to 3 parents). It is
never printed and never written into a sidecar.
"""

import argparse
import base64
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor

API_ROOT = "https://api.openai.com/v1"

# Sizes the image models accept. `auto` lets the model pick from the prompt.
SIZES = ("1024x1024", "1536x1024", "1024x1536", "auto")
QUALITIES = ("low", "medium", "high", "auto")

# Only gpt-image-1 and gpt-image-1.5 will cut an alpha channel. Asking gpt-image-2
# for one is a hard 400, so the check happens here rather than after a round trip.
TRANSPARENT_OK = ("gpt-image-1", "gpt-image-1.5")

DEFAULT_OPAQUE = "gpt-image-2"
DEFAULT_TRANSPARENT = "gpt-image-1.5"

RETRY_STATUS = (408, 409, 429, 500, 502, 503, 504)


# ------------------------------------------------------------------- key ----

def find_key(explicit=None):
    if explicit:
        return explicit
    for var in ("OPENAI_IMAGE_API_KEY", "OPENAI_API_KEY"):
        v = os.environ.get(var)
        if v:
            return v.strip()
    # .env in the project root, or up to three directories above it. The image
    # key wins wherever it appears in the file — it is normally written *after*
    # the transcription key, and taking the first match would silently hand every
    # generation to whichever key happened to be declared first.
    here = os.path.abspath(os.getcwd())
    for _ in range(4):
        path = os.path.join(here, ".env")
        if os.path.exists(path):
            found = {}
            with open(path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    for var in ("OPENAI_IMAGE_API_KEY", "OPENAI_API_KEY"):
                        if line.startswith(var + "="):
                            found[var] = line.split("=", 1)[1].strip().strip('"').strip("'")
            for var in ("OPENAI_IMAGE_API_KEY", "OPENAI_API_KEY"):
                if found.get(var):
                    return found[var]
        parent = os.path.dirname(here)
        if parent == here:
            break
        here = parent
    raise SystemExit(
        "no API key: set OPENAI_IMAGE_API_KEY (or OPENAI_API_KEY) in the "
        "environment or in .env, or pass --api-key"
    )


# ------------------------------------------------------------------ http ----

def _request(req, timeout, tries=4):
    """Send `req`, retrying the statuses that are worth retrying.

    Image generation is slow (10-90 s for one high-quality frame) and 429s are
    routine when a spec fans out, so a failure here is usually a wait, not a bug.
    """
    delay = 4.0
    last = None
    for attempt in range(1, tries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            try:
                msg = json.loads(body)["error"]["message"]
            except Exception:
                msg = body[:400]
            last = "HTTP %d: %s" % (e.code, msg)
            if e.code not in RETRY_STATUS or attempt == tries:
                raise SystemExit(last)
            wait = float(e.headers.get("retry-after") or delay)
        except urllib.error.URLError as e:
            last = "network: %s" % e.reason
            if attempt == tries:
                raise SystemExit(last)
            wait = delay
        sys.stderr.write("  retry %d/%d in %.0fs — %s\n" % (attempt, tries - 1, wait, last))
        time.sleep(wait)
        delay *= 2
    raise SystemExit(last or "request failed")


def post_json(path, payload, key, timeout):
    req = urllib.request.Request(
        API_ROOT + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
        method="POST",
    )
    return _request(req, timeout)


def post_multipart(path, fields, files, key, timeout):
    """POST multipart/form-data without the `requests` package.

    `fields` is {name: str}; `files` is [(field_name, path)] — the edits endpoint
    takes repeated `image[]` parts, which is how a set stays visually consistent.
    """
    boundary = "----gen-images-" + uuid.uuid4().hex
    body = bytearray()
    for name, value in fields.items():
        if value is None:
            continue
        body += ("--%s\r\nContent-Disposition: form-data; name=\"%s\"\r\n\r\n%s\r\n"
                 % (boundary, name, value)).encode("utf-8")
    for name, path_ in files:
        fn = os.path.basename(path_)
        ctype = mimetypes.guess_type(fn)[0] or "application/octet-stream"
        with open(path_, "rb") as f:
            blob = f.read()
        body += ("--%s\r\nContent-Disposition: form-data; name=\"%s\"; filename=\"%s\"\r\n"
                 "Content-Type: %s\r\n\r\n" % (boundary, name, fn, ctype)).encode("utf-8")
        body += blob + b"\r\n"
    body += ("--%s--\r\n" % boundary).encode("utf-8")

    req = urllib.request.Request(
        API_ROOT + path, data=bytes(body),
        headers={"Authorization": "Bearer " + key,
                 "Content-Type": "multipart/form-data; boundary=" + boundary},
        method="POST",
    )
    return _request(req, timeout)


# ---------------------------------------------------------------- images ----

def decode_image(item, timeout):
    """Every gpt-image-* model returns b64_json; dall-e-* can return a URL."""
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    if item.get("url"):
        with urllib.request.urlopen(item["url"], timeout=timeout) as r:
            return r.read()
    raise SystemExit("response carried neither b64_json nor url")


def trim_alpha(path, pad=8):
    """Crop a transparent PNG to its ink, plus a little breathing room.

    A cut-out asset arrives centred in a 1024 square with an arbitrary amount of
    empty space around it, so two assets that should read as the same size do not.
    Trimming to the alpha bbox makes `width_pct` in the animation mean what it
    says, and makes centre-anchored placement land on the object's optical centre
    instead of the model's framing.
    """
    from PIL import Image

    im = Image.open(path).convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    if bbox is None:
        return None
    x0, y0, x1, y1 = bbox
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(im.width, x1 + pad), min(im.height, y1 + pad)
    im.crop((x0, y0, x1, y1)).save(path)
    return (x1 - x0, y1 - y0)


def opaque_fraction(path):
    """How much of a supposedly-transparent asset is actually opaque.

    A cut-out that comes back ~100% opaque is a model that ignored the request
    and handed back a filled rectangle — worth knowing before it lands in a
    composite as a grey slab.
    """
    from PIL import Image

    a = Image.open(path).convert("RGBA").getchannel("A")
    h = a.histogram()
    total = sum(h) or 1
    return h[255] / total


def one_job(job, key, args):
    """Generate one asset. Returns a manifest row."""
    model = job.get("model") or args.model or (
        DEFAULT_TRANSPARENT if job.get("transparent") else DEFAULT_OPAQUE)
    if job.get("transparent") and model not in TRANSPARENT_OK:
        raise SystemExit(
            "%s: %s cannot cut a transparent background — use %s for cut-out assets"
            % (job["id"], model, DEFAULT_TRANSPARENT))

    refs = job.get("ref") or []
    for r in refs:
        if not os.path.exists(r):
            raise SystemExit("%s: reference image missing: %s" % (job["id"], r))

    n = int(job.get("n", 1))
    size = job.get("size") or args.size
    quality = job.get("quality") or args.quality
    background = "transparent" if job.get("transparent") else "opaque"

    t0 = time.time()
    if refs:
        # /images/edits with one or more reference images: the route for a SET
        # that has to look like one set. Hand it the asset you already approved
        # and describe only what changes.
        fields = {"model": model, "prompt": job["prompt"], "n": str(n),
                  "size": size, "quality": quality, "output_format": "png"}
        if model in TRANSPARENT_OK:
            fields["background"] = background
        if job.get("mask"):
            files = [("image", refs[0]), ("mask", job["mask"])]
        else:
            files = [("image[]", r) for r in refs]
        resp = post_multipart("/images/edits", fields, files, key, args.timeout)
    else:
        payload = {"model": model, "prompt": job["prompt"], "n": n,
                   "size": size, "quality": quality, "output_format": "png"}
        if model in TRANSPARENT_OK:
            payload["background"] = background
        resp = post_json("/images/generations", payload, key, args.timeout)
    took = time.time() - t0

    written = []
    for i, item in enumerate(resp.get("data") or []):
        out = job["out"] if n == 1 else "%s-%d%s" % (
            os.path.splitext(job["out"])[0], i + 1, os.path.splitext(job["out"])[1])
        os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
        with open(out, "wb") as f:
            f.write(decode_image(item, args.timeout))

        row = {"file": out}
        if job.get("transparent"):
            frac = opaque_fraction(out)
            row["opaque_pct"] = round(100 * frac, 1)
            if frac > 0.97:
                row["warning"] = ("came back effectively opaque — the model ignored the "
                                  "cut-out; re-prompt with 'isolated on a plain "
                                  "transparent background, no ground, no shadow'")
        if args.trim and job.get("transparent"):
            got = trim_alpha(out, args.pad)
            if got:
                row["trimmed_to"] = "%dx%d" % got
        written.append(row)

    manifest = {
        "id": job["id"],
        "prompt": job["prompt"],
        "model": model,
        "size": resp.get("size", size),
        "quality": resp.get("quality", quality),
        "background": resp.get("background", background),
        "refs": refs,
        "endpoint": "edits" if refs else "generations",
        "created": resp.get("created"),
        "usage": resp.get("usage"),
        "seconds": round(took, 1),
        "files": written,
    }
    # The sidecar is what makes an asset revisable six weeks later: same prompt,
    # one word changed, same everything else.
    for row in written:
        with open(os.path.splitext(row["file"])[0] + ".gen.json", "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
    return manifest


# ------------------------------------------------------------------ main ----

def build_jobs(args):
    if args.spec:
        with open(args.spec, encoding="utf-8") as f:
            spec = json.load(f)
        rows = spec["assets"] if isinstance(spec, dict) else spec
        jobs = []
        for i, r in enumerate(rows):
            if r.get("skip"):
                continue
            jid = r.get("id") or "asset%02d" % (i + 1)
            out = r.get("out") or os.path.join(args.out_dir, jid + ".png")
            jobs.append({**r, "id": jid, "out": out,
                         "transparent": bool(r.get("transparent", args.transparent))})
        return jobs
    if not args.prompt:
        raise SystemExit("give a prompt, or --spec a file of them")
    out = args.out or os.path.join(args.out_dir, "image.png")
    return [{"id": os.path.splitext(os.path.basename(out))[0], "prompt": args.prompt,
             "out": out, "transparent": args.transparent, "n": args.n,
             "ref": args.ref or [], "mask": args.mask}]


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("prompt", nargs="?", help="what to draw (omit when using --spec)")
    p.add_argument("--spec", help="JSON file: a list of {id, prompt, transparent, size, ...}")
    p.add_argument("--out", help="output PNG path for a single prompt")
    p.add_argument("--out-dir", default="assets/ai", help="where spec assets land (default assets/ai)")
    p.add_argument("--model", help="gpt-image-2 (default) / gpt-image-1.5 (default when --transparent)")
    p.add_argument("--size", default="1024x1024", choices=SIZES)
    p.add_argument("--quality", default="medium", choices=QUALITIES,
                   help="low for drafts, medium for most plates, high for a hero frame")
    p.add_argument("--n", type=int, default=1, help="how many takes of the same prompt")
    p.add_argument("--transparent", action="store_true", help="cut-out PNG (alpha)")
    p.add_argument("--trim", action="store_true", help="crop transparent PNGs to their ink")
    p.add_argument("--pad", type=int, default=8, help="px kept around the ink when trimming")
    p.add_argument("--ref", nargs="+", help="reference PNG(s) — routes through /images/edits")
    p.add_argument("--mask", help="RGBA mask for an inpaint (transparent = repaint here)")
    p.add_argument("--jobs", type=int, default=3, help="parallel requests for a spec")
    p.add_argument("--timeout", type=int, default=300)
    p.add_argument("--api-key", help="overrides the environment and .env")
    p.add_argument("--dry", action="store_true", help="print the work-list, call nothing")
    args = p.parse_args()

    jobs = build_jobs(args)
    if args.dry:
        print(json.dumps([{k: v for k, v in j.items() if k != "prompt"} | {
            "prompt": j["prompt"][:80] + ("…" if len(j["prompt"]) > 80 else "")}
            for j in jobs], ensure_ascii=False, indent=2))
        return

    key = find_key(args.api_key)
    sys.stderr.write("generating %d asset(s)…\n" % len(jobs))
    if len(jobs) == 1:
        out = [one_job(jobs[0], key, args)]
    else:
        with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
            out = list(pool.map(lambda j: one_job(j, key, args), jobs))
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
