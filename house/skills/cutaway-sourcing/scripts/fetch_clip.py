#!/usr/bin/env python3
"""fetch_clip.py — find and download the real clip a line points at.

The counterpart to `gen_images.py` / `animate_seedance.py`: those two make a
picture that does not exist, this one fetches a picture that does. Use it when
the narration names a specific thing everybody can check — a scene from a named
film, the actual clip circulating, a game's real early build — which stock
cannot supply and a generated image would only fabricate.

    # 1. see what is out there, download nothing
    python3 fetch_clip.py --search "jurassic park frog scene" -n 6

    # 2. read the rungs for one candidate
    python3 fetch_clip.py --formats aqz-KE-bpKQ

    # 3. fetch it (picks the largest rung by pixel area, writes a sidecar)
    python3 fetch_clip.py aqz-KE-bpKQ --out assets/src/

    # ...or name the rung yourself, which is always safer
    python3 fetch_clip.py aqz-KE-bpKQ --format 136 --out assets/src/

Everything it knows is in `../references/yt-dlp.md`. Three things it does for
you, because each one cost a cycle to learn:

  * **Client fallback.** Some videos answer the default player client with
    `HTTP 403: Forbidden` *after* the metadata fetch has already succeeded, so
    it looks like the clip exists but is blocked. This script retries through
    `web_embedded,mweb`, which is what worked. (The default client is fine most
    of the time — the fallback only fires when it is not.)

  * **Rung choice by pixel area, never by height.** `height<=1080` picks the
    wrong rung on a VERTICAL video, because there the height is the long side:
    it will quietly hand you 480x854 when 720x1280 exists. Choosing by
    width*height cannot make that mistake.

  * **A crop report after the download.** Film uploads carry baked letterbox
    (the bars are pixels, not metadata) and a published "vertical" clip is often
    a landscape triptych with the real video in the middle column. Both look
    fine in a player and ruin the plate. `ffmpeg cropdetect` catches them, so it
    runs automatically and prints what it found.

Requires `yt-dlp` and `ffmpeg` on PATH. No API key, no account.
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

CLIENT_CHAIN = [
    None,                       # whatever yt-dlp defaults to today
    "web_embedded,mweb",        # the fallback that cleared a 403 on 2026-09-09
]


INSTALL_HINT = {
    "yt-dlp": "macOS:  brew install yt-dlp\n"
              "Linux:  pipx install yt-dlp   (or: python3 -m pip install -U yt-dlp)\n"
              "Any:    https://github.com/yt-dlp/yt-dlp#installation\n"
              "It updates often, and a stale copy is the most common cause of a\n"
              "download that suddenly stops working — run `yt-dlp -U` first.",
    "ffmpeg": "macOS:  brew install ffmpeg\n"
              "Linux:  apt install ffmpeg   (or your distro's equivalent)\n"
              "Any:    https://ffmpeg.org/download.html",
    "ffprobe": "ffprobe ships with ffmpeg — installing ffmpeg gives you both.",
}


def need(tool):
    if shutil.which(tool) is None:
        sys.exit("error: `%s` is not installed (not on PATH).\n\n%s"
                 % (tool, INSTALL_HINT.get(tool, "")))


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def client_args(client):
    return [] if client is None else ["--extractor-args", "youtube:player_client=" + client]


def search(query, n):
    need("yt-dlp")
    r = run(["yt-dlp", "ytsearch%d:%s" % (n, query), "--skip-download",
             "--print", "%(duration)s\t%(id)s\t%(title)s"])
    if r.returncode != 0:
        sys.exit("error: search failed\n" + r.stderr.strip())
    print("%-9s %-13s %s" % ("DURATION", "ID", "TITLE"))
    for line in r.stdout.strip().splitlines():
        parts = line.split("\t")
        if len(parts) != 3:
            continue
        secs, vid, title = parts
        try:
            mm, ss = divmod(int(secs), 60)
            dur = "%d:%02d" % (mm, ss)
        except ValueError:
            dur = secs
        print("%-9s %-13s %s" % (dur, vid, title[:78]))


def list_formats(target):
    """Parsed rungs: [{id, w, h, ext, note}], video-only or muxed, largest first."""
    need("yt-dlp")
    for client in CLIENT_CHAIN:
        r = run(["yt-dlp", *client_args(client), "-F", url_of(target)])
        if r.returncode == 0:
            break
    else:
        sys.exit("error: could not list formats\n" + r.stderr.strip())

    rungs = []
    for line in r.stdout.splitlines():
        m = re.match(r"^(\S+)\s+(\w+)\s+(\d+)x(\d+)\b", line)
        if m:
            fid, ext, w, h = m.group(1), m.group(2), int(m.group(3)), int(m.group(4))
            rungs.append({"id": fid, "ext": ext, "w": w, "h": h,
                          "area": w * h, "audio": "video only" not in line})
    rungs.sort(key=lambda f: f["area"], reverse=True)
    return rungs


def url_of(target):
    return target if "://" in target else "https://www.youtube.com/watch?v=" + target


def crop_report(path):
    """What cropdetect sees — catches baked letterbox and the triptych."""
    need("ffmpeg")
    r = run(["ffmpeg", "-hide_banner", "-ss", "2", "-i", str(path),
             "-vf", "cropdetect=24:2:0", "-frames:v", "60", "-f", "null", "-"])
    crops = re.findall(r"crop=(\d+):(\d+):(\d+):(\d+)", r.stderr)
    if not crops:
        return None
    w, h, x, y = map(int, crops[-1])
    return {"w": w, "h": h, "x": x, "y": y}


def probe(path):
    need("ffmpeg")
    r = run(["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height,r_frame_rate",
             "-show_entries", "format=duration", "-of", "json", str(path)])
    try:
        d = json.loads(r.stdout)
        s = d["streams"][0]
        return {"w": s["width"], "h": s["height"], "fps": s.get("r_frame_rate"),
                "duration": float(d["format"]["duration"])}
    except Exception:
        return {}


def fetch(target, out_dir, fmt, audio_fmt, keep_client=None):
    need("yt-dlp")
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    url = url_of(target)

    if fmt is None:
        rungs = list_formats(target)
        if not rungs:
            sys.exit("error: no video rungs found")
        best = rungs[0]
        fmt = best["id"]
        print("picked rung %s (%dx%d, largest by area)" % (fmt, best["w"], best["h"]))
        if not best["audio"]:
            fmt = "%s+%s" % (fmt, audio_fmt)

    template = str(out_dir / "%(id)s.%(ext)s")
    last = None
    for client in ([keep_client] if keep_client else CLIENT_CHAIN):
        cmd = ["yt-dlp", *client_args(client), "-f", fmt,
               "--merge-output-format", "mp4", "--no-progress", "-o", template, url]
        r = run(cmd)
        last = r
        if r.returncode == 0:
            used = client or "(default)"
            break
        if "403" in r.stderr or "Forbidden" in r.stderr:
            print("403 on client %s — retrying" % (client or "(default)"), file=sys.stderr)
            continue
        break
    else:
        client = None
    if last is None or last.returncode != 0:
        sys.exit("error: download failed\n" + (last.stderr.strip() if last else ""))

    written = sorted(out_dir.glob("*.mp4"), key=lambda p: p.stat().st_mtime)[-1]
    info = probe(written)
    crop = crop_report(written)

    print("\n%s" % written)
    if info:
        print("  %dx%d  %.2fs  %s fps" % (info["w"], info["h"], info["duration"], info["fps"]))
    if crop and (crop["w"] != info.get("w") or crop["h"] != info.get("h")):
        print("  ⚠ cropdetect says the real picture is %dx%d at +%d+%d — "
              "baked letterbox or a triptych. Crop to that before compositing."
              % (crop["w"], crop["h"], crop["x"], crop["y"]))
    elif crop:
        print("  cropdetect: full frame, nothing baked in")

    sidecar = written.with_suffix(".src.json")
    sidecar.write_text(json.dumps({
        "url": url, "format": fmt, "client": used,
        "probe": info, "cropdetect": crop,
    }, indent=1) + "\n")
    print("  sidecar %s" % sidecar.name)
    return written


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("target", nargs="?", help="video id or URL")
    p.add_argument("--search", help="search instead of downloading")
    p.add_argument("-n", type=int, default=6, help="how many search results (default 6)")
    p.add_argument("--formats", metavar="TARGET", help="list the rungs and exit")
    p.add_argument("--out", default="assets/src", help="destination dir (default assets/src)")
    p.add_argument("--format", dest="fmt", help="explicit yt-dlp format id — always safer")
    p.add_argument("--audio-format", default="140", help="audio rung to merge (default 140)")
    p.add_argument("--client", help="force one player client, skipping the fallback chain")
    args = p.parse_args()

    if args.search:
        return search(args.search, args.n)
    if args.formats:
        rungs = list_formats(args.formats)
        print("%-6s %-6s %-11s %s" % ("ID", "EXT", "SIZE", "HAS AUDIO"))
        for f in rungs:
            print("%-6s %-6s %-11s %s" % (f["id"], f["ext"],
                                          "%dx%d" % (f["w"], f["h"]),
                                          "yes" if f["audio"] else "no"))
        return
    if not args.target:
        p.error("give a video id/URL, or --search, or --formats")
    fetch(args.target, args.out, args.fmt, args.audio_format, args.client)


if __name__ == "__main__":
    main()
