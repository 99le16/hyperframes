#!/usr/bin/env python3
"""mix_base.py (copied to <edit>/work/mix.py by new_project.sh) — generic programme-audio helpers for yt-video-style. Programme audio = source clock (no inserts), numpy 48 kHz stereo.
    python3 work/mix.py [--no-music] [--no-sfx] [--out build/v1_audio.wav]
voice : the master's audio, untouched.
music : CUES (programme s). Every cue STARTS ON A PLATE CUT and its track is entered on a DOWNBEAT
        (librosa beat grid, work/beats/<file>.json), so the music restarts in time with the animation. Cues
        are set to `lufs` (measured), faded, ducked under the voice; a cue can end in a hard stop (fo tiny)
        so a line lands in silence. Optional `hits`: an impact sfx on the downbeat at a plate cut.
sfx   : whoosh into every plate (peak on the cut), swoosh back to camera, chalk grain per chalk stroke
        (chalk_events.json), and the event list sfx_cues.json (spec-derived pops/stamps/coins...).
master: loudnorm two-pass to -14 LUFS / -1.5 dBTP."""
import json, os, subprocess, sys, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); PROJ = os.path.dirname(HERE)
SR = 48000; FPS = 30
PLAN = json.load(open(os.path.join(HERE, os.environ.get("PLAN", "plan.json")))); IT = {p["id"]: p for p in PLAN["items"]}
_PRJ = json.load(open(os.path.join(HERE, os.path.dirname(os.environ.get("PLAN", "style/plan.json")), "project.json")))
MASTER = os.path.join(PROJ, "master.mp4"); DUR = round(_PRJ["duration"] * FPS) / FPS
rng = np.random.default_rng(11)
db = lambda d: 10 ** (d / 20)

def load(path, ss=0.0, t=None):
    a = ["ffmpeg", "-v", "error", "-ss", str(ss), "-i", path]
    if t: a += ["-t", str(t)]
    raw = subprocess.run(a + ["-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()

def save(path, x):
    os.makedirs(os.path.dirname(path), exist_ok=True); y = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes())

def lufs(x):
    tmp = "/private/tmp/claude-501/t13_meas.wav"; save(tmp, x)
    o = subprocess.run(["ffmpeg", "-v", "info", "-i", tmp, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    for ln in reversed(o.splitlines()):
        if ln.strip().startswith("I:"): return float(ln.split()[1])
    return -70.0

def place(buf, x, t, gain=1.0):
    i = int(round(t * SR))
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), len(buf) - i)
    if n > 0: buf[i:i + n] += x[:n] * gain

# ------------------------------------------------------------------ music
MUS = os.path.join(PROJ, "assets", "music", "masters")
S = lambda pid: IT[pid]["s"]; E = lambda pid: IT[pid]["e"]
CUES = json.load(open(os.path.join(HERE, "music_cues.json"))) if os.path.exists(os.path.join(HERE, "music_cues.json")) else []

def beats(f):
    j = os.path.join(HERE, "beats", os.path.basename(f) + ".json")
    if not os.path.exists(j):
        subprocess.run([os.path.expanduser("~/.venvs/mlxw/bin/python"), os.path.join(HERE, "beats.py"), f, j], check=True)
    return json.load(open(j))

def make_bed(c, need):
    path = os.path.join(MUS, c["f"]) if not os.path.isabs(c["f"]) else c["f"]
    trk = load(path); L = len(trk) / SR; bt = beats(path)
    db_ = [d for d in bt["downbeats"] if d >= c.get("from", 0)]
    src_in = db_[0] if db_ else c.get("from", 0)
    loop_db = [d for d in bt["downbeats"] if d >= c.get("loop_from", c.get("from", 0))]
    bar = bt["bar"]; tail = c.get("tail", 8.0)
    # loop point = a downbeat; loop end = the last downbeat before L - tail, so the loop keeps the bar grid
    end = max([d for d in bt["downbeats"] if d <= L - tail] or [L - tail])
    out = trk[int(src_in * SR):int(end * SR)]
    lp_in = loop_db[0] if loop_db else src_in
    while len(out) < (need + 1) * SR:
        nxt = trk[int(lp_in * SR):int(end * SR)]; x = int(0.04 * SR)
        r = np.linspace(0, 1, x)[:, None]; out = np.concatenate([out[:-x], out[-x:] * (1 - r) + nxt[:x] * r, nxt[x:]])
    return out[:int(need * SR)], src_in, bar

def movavg(x, k):
    c = np.cumsum(np.concatenate([np.zeros(1), x])); h = k // 2
    i0 = np.clip(np.arange(len(x)) - h, 0, len(x)); i1 = np.clip(np.arange(len(x)) + k - h, 0, len(x))
    return (c[i1] - c[i0]) / k

def env_follow(v, win=0.05):
    return np.sqrt(np.maximum(movavg((v ** 2).mean(1), int(win * SR)), 0))

def build_music(voice):
    out = np.zeros_like(voice); venv = env_follow(voice)
    talk = np.clip((20 * np.log10(venv + 1e-6) + 45) / 15, 0, 1); talk = movavg(talk, int(.35 * SR))
    log = []
    for c in CUES:
        a, b = c["a"], c.get("b") or DUR; need = b - a
        x, si, bar = make_bed(c, need)
        x = x * db(c["lufs"] - lufs(x[:int(min(need, 60) * SR)]))
        n = len(x); t = np.arange(n) / SR
        ge = np.minimum(1, t / max(c.get("fi", .02), 1e-3)) * np.minimum(1, (need - t) / max(c.get("fo", 1.5), 1e-3))
        for d0, d1, dd in c.get("dips", []):
            ge *= np.interp(t, [d0 - a - .25, d0 - a, d1 - a, d1 - a + .25], [1, db(dd), db(dd), 1])
        duck = db(c.get("duck", -6)) ** talk[int(a * SR):int(a * SR) + n]
        place(out, x * (ge * duck)[:, None], a)
        log.append((c["id"], c["f"], round(a, 2), round(b, 2), round(si, 3), round(bar, 3)))
    for l in log: print("  cue", l)
    return out

# ------------------------------------------------------------------ sfx
SFXD = os.path.join(PROJ, "assets", "sfx")
_sfx = {}
# v7: the synthesized whoosh family is replaced by the ad-style SFX the user approved (real Envato whooshes, single pops, one click)
SWAP = {"whoosh": ["wh_std", "wh_fast"], "big_whoosh": ["wh_std", "wh_big", "wh_fast"], "swoosh": ["sw_fast", "wh_fast"],
        "pop_lo": ["pop_a", "pop_b"], "pop": ["pop_a", "pop_b"], "click": ["uclick"]}
_rot = {}
PEAKF = json.load(open(os.path.join(HERE, "sfx_peaks.json"))) if os.path.exists(os.path.join(HERE, "sfx_peaks.json")) else {}
def resolve(name):
    if name in SWAP:
        k = _rot.get(name, 0); _rot[name] = k + 1; f = SWAP[name][k % len(SWAP[name])]
        return f, PEAKF.get(f, 0)
    return name, PEAK.get(name, 0)
def sfx(name):
    if name not in _sfx: _sfx[name] = load(os.path.join(SFXD, name + ".wav"))
    return _sfx[name]
PEAK = {"whoosh": .462, "swoosh": .279, "riser": 1.528, "glitch": .139, "big_whoosh": .704}

def bp(x, lo, hi, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (lo / np.maximum(f, 1)) ** order) / (1 + (f / hi) ** order), len(x))

def chalk_grain(d):
    n = max(int(.03 * SR), int(d * SR)); x = bp(rng.standard_normal(n + 2000), 1800, 7000)[2000:]
    k = max(2, int(d * 60)); mod = np.interp(np.arange(n), np.linspace(0, n, k), .3 + .7 * rng.random(k))
    e = np.minimum(1, np.minimum(np.arange(n) / (.008 * SR), (n - np.arange(n)) / (.02 * SR))); y = x * mod * e
    return np.stack([y, y * .92], 1)

def build_sfx(voice):
    out = np.zeros_like(voice)
    items = sorted([i for i in PLAN["items"] if i.get("kind") != "bigword"], key=lambda p: p["s"])
    for i, p in enumerate(items):                          # transitions
        prev_e = items[i - 1]["e"] if i else -9
        if abs(p["s"] - prev_e) > 0.05:                     # coming from camera
            f, pk = resolve("whoosh"); place(out, sfx(f), p["s"] - pk, db(-24))
        else:                                               # plate -> plate
            f, pk = resolve("swoosh"); place(out, sfx(f), p["s"] - pk, db(-27))
        nxt_s = items[i + 1]["s"] if i + 1 < len(items) else 1e9
        if abs(nxt_s - p["e"]) > 0.05 and p["e"] < DUR - 1:  # back to camera
            f, pk = resolve("swoosh"); place(out, sfx(f), p["e"] - pk, db(-30))
    ev = json.load(open(os.path.join(HERE, "chalk_events.json"))) if os.path.exists(os.path.join(HERE, "chalk_events.json")) and not os.environ.get("NOCHALK") else {}
    for pid, strokes in ev.items():
        if pid not in IT: continue
        s0, lim = IT[pid]["s"], IT[pid]["e"] - IT[pid]["s"]
        for t0, t1, L in strokes:
            if t0 > lim: continue
            d = min(t1, lim) - max(t0, 0)
            if d > .02: place(out, chalk_grain(d), s0 + max(t0, 0), db(-42))
    f = os.path.join(HERE, "sfx_cues.json")
    stock = [(i["s"], i["e"]) for i in PLAN["items"] if i.get("kind") in ("stock", "seed")]
    if os.path.exists(f):
        for c in json.load(open(f)):
            if c.get("plate") and any(a - .05 <= c["t"] < b for a, b in stock): continue          # the plate under a stock window is not seen
            f, pk = resolve(c["name"]); place(out, sfx(f), c["t"] - pk, db(c.get("db", -22) - (2 if f.startswith(("wh_", "sw_")) else 0)))
    for a, b in [(i["s"], i["e"]) for i in PLAN["items"] if i.get("kind") == "stock"]:   # the window opening
        place(out, sfx("thump"), a, db(-24))
    for c in CUES:                                          # impacts on cue entries
        if c.get("hit"): place(out, sfx(c["hit"]), c["a"] - PEAK.get(c["hit"], 0), db(c.get("hit_db", -18)))
    return out

if __name__ == "__main__":
    a = sys.argv[1:]
    outp = a[a.index("--out") + 1] if "--out" in a else os.path.join(PROJ, "build", "v1_audio.wav")
    v = load(MASTER)[:int(DUR * SR)]
    if len(v) < int(DUR * SR): v = np.concatenate([v, np.zeros((int(DUR * SR) - len(v), 2), np.float32)])
    print("voice", len(v) / SR, "s; LUFS", lufs(v)); mix = v.copy()
    if "--no-music" not in a:
        m = build_music(v); save(os.path.join(PROJ, "build", "music_only.wav"), m); mix += m; print("music LUFS", lufs(m))
    if "--no-sfx" not in a:
        s = build_sfx(v); save(os.path.join(PROJ, "build", "sfx_only.wav"), s); mix += s
    raw = os.path.join(PROJ, "build", "mix_raw.wav"); save(raw, mix * 0.7)
    o = subprocess.run(["ffmpeg", "-v", "info", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    j = json.loads(o[o.rindex("{"):o.rindex("}") + 1])
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af",
                    f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000",
                    "-c:a", "pcm_s16le", outp], check=True)
    print("wrote", outp, DUR, "s")
