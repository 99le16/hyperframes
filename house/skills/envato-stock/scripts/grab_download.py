#!/usr/bin/env python3
"""Wait for the browser download started after T0 and file it in DEST.

    T0=$(date +%s); <click Download in the browser>; \
    python3 grab_download.py --since "$T0" --dest <folder> --name <clean-name>

Watches every folder the browser may save into (Brave's configured download
directory, ~/Downloads, plus any --watch), takes the one media/zip file that
appeared after --since, waits until it stops growing, and moves it to
<dest>/<name>.<ext>. A zip holding one video/photo is unpacked. If Brave still
shows its native "Guardar" dialog (ask-where-to-save left on), it presses Save.

Refuses instead of guessing: exits 1 when nothing arrived, 2 when two different
new files arrived (Envato fires twice; the "(1)" twin is deleted, anything else
is ambiguous).
"""
import argparse, json, os, re, shutil, subprocess, sys, time, zipfile

MEDIA = {".mp4", ".mov", ".m4v", ".webm", ".jpg", ".jpeg", ".png", ".webp",
         ".tif", ".tiff", ".wav", ".mp3", ".aif", ".aiff", ".zip"}
PARTIAL = (".crdownload", ".download", ".part", ".tmp")
PREFS = os.path.expanduser(
    "~/Library/Application Support/BraveSoftware/Brave-Browser/Default/Preferences")


def watch_dirs(extra):
    dirs = [os.path.expanduser("~/Downloads")] + list(extra)
    try:
        d = json.load(open(PREFS)).get("download", {}).get("default_directory")
        if d:
            dirs.insert(0, d)
    except Exception:
        pass
    return [d for d in dict.fromkeys(dirs) if os.path.isdir(d)]


def press_save_if_asked():
    script = ('tell application "System Events" to tell process "Brave Browser" to '
              'if exists window "Guardar" then click button "Guardar" of window "Guardar"')
    subprocess.run(["osascript", "-e", script], capture_output=True, timeout=10)


def scan(dirs, since):
    done, partial = [], []
    for d in dirs:
        for f in os.listdir(d):
            if f.startswith("._") or f.startswith(".com.brave"):
                continue
            p = os.path.join(d, f)
            try:
                st = os.stat(p)
            except FileNotFoundError:
                continue
            if st.st_mtime < since or not os.path.isfile(p):
                continue
            ext = os.path.splitext(f)[1].lower()
            if ext in PARTIAL:
                partial.append(p)
            elif ext in MEDIA:
                done.append(p)
    return done, partial


def stable(p, secs=3):
    s = os.path.getsize(p)
    time.sleep(secs)
    return os.path.exists(p) and os.path.getsize(p) == s and s > 0


def unzip_single(zp, dest, name):
    with zipfile.ZipFile(zp) as z:
        members = [m for m in z.namelist()
                   if not os.path.basename(m).startswith("._") and "__MACOSX" not in m
                   and os.path.splitext(m)[1].lower() in MEDIA - {".zip"}]
        if len(members) != 1:
            return None  # keep the zip; caller decides
        m = members[0]
        out = os.path.join(dest, name + os.path.splitext(m)[1].lower())
        with z.open(m) as src, open(out, "wb") as dst:
            shutil.copyfileobj(src, dst)
    os.remove(zp)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", type=float, required=True, help="epoch secs before the click")
    ap.add_argument("--dest", required=True)
    ap.add_argument("--name", required=True, help="clean file name, no extension")
    ap.add_argument("--timeout", type=int, default=600)
    ap.add_argument("--watch", action="append", default=[])
    ap.add_argument("--keep-zip", action="store_true")
    a = ap.parse_args()

    os.makedirs(a.dest, exist_ok=True)
    t_end = time.time() + a.timeout
    since = a.since - 2
    while time.time() < t_end:
        press_save_if_asked()
        dirs = watch_dirs(a.watch)  # re-read: Brave creates a missing folder on first save
        done, partial = scan(dirs, since)
        if done and not partial:
            twins = [p for p in done if re.search(r" \(\d+\)\.[^.]+$", p)]
            originals = [p for p in done if p not in twins]
            for t in twins:  # Envato's second fire of the same file
                if originals:
                    os.remove(t)
            picks = originals or twins[:1]
            if len(picks) > 1:
                print("AMBIGUOUS: " + " | ".join(picks), file=sys.stderr)
                sys.exit(2)
            p = picks[0]
            if not stable(p):
                continue
            ext = os.path.splitext(p)[1].lower()
            out = None
            if ext == ".zip" and not a.keep_zip:
                tmp = os.path.join(a.dest, a.name + ".zip")
                shutil.move(p, tmp)
                out = unzip_single(tmp, a.dest, a.name) or tmp
            else:
                out = os.path.join(a.dest, a.name + ext)
                shutil.move(p, out)
            print(f"OK {out} {os.path.getsize(out)/1e6:.1f}MB (from {p})")
            return
        time.sleep(2)
    print(f"NOTHING ARRIVED in {watch_dirs(a.watch)} since {a.since}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
