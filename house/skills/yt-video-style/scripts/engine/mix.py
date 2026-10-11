#!/usr/bin/env python3
"""mix.py — the audio. Imports ../mix.py (= mix_base.py copied to the work dir by new_project.sh): voice untouched, music beds
entered on librosa downbeats with a voice duck, loudnorm −14 LUFS / −1.5 dBTP.
Music follows WHAT IS SAID: one cue per section from music.json, dips into near-silence before punchlines, a hit on re-entries.
SFX = the approved palette in the skill's assets/sfx (levels in references/sound-and-rhythm.md): whoosh into/out of every scene ·
clip · meme, soft swoosh on every camera cut, sub-swoosh on snap-zooms, click only on key words, single pops, typing on the first
typewriter run. Memes keep their own audio unless listed in music.json "mute_memes".
  music.json {"cues": [{"id","f": "<file in ../../assets/music/masters>","a","b"|null,"lufs": -32,"fi","fo","hit": "hit"|"boom"|null,
              "from": s,"loop": s}], "dips": [[a, b, dB]], "mute_memes": ["M04"]}
    python3 mix.py [--out ../../build/audio.wav]"""
import json, os, sys, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); WORK = os.path.dirname(HERE); PROJ = os.path.dirname(WORK)
os.environ["PLAN"] = os.path.basename(HERE) + "/plan.json"
sys.path.insert(0, WORK)
import mix as M
import numpy as np
P = M.PLAN["items"]; IT = {p["id"]: p for p in P}
MUSIC = json.load(open(os.path.join(HERE, "music.json")))
MEMES = [p for p in P if p["kind"] == "meme"]
DIPS = [tuple(d) for d in MUSIC.get("dips", [])] + [(m["s"], m["e"], -13) for m in MEMES]
M.CUES = [dict(c, b=c.get("b"), fi=c.get("fi", .02), fo=c.get("fo", 1.0), lufs=c.get("lufs", -32),
               dips=[d for d in DIPS if c["a"] < d[0] < (c.get("b") or 1e9)], **{"from": c.get("from", 0), "loop_from": c.get("loop", c.get("from", 0))})
          for c in MUSIC["cues"]]
SFXD = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "assets", "sfx")
SFXD = os.environ.get("YTSTYLE_SFX", SFXD if os.path.isdir(SFXD) else os.path.join(HERE, "sfx"))
_cache = {}
def S(name):
    """ad-style sfx normalised so its loudest 25 ms sits at −14 dBFS; returns (audio, peak time s)"""
    if name not in _cache:
        x = M.load(os.path.join(SFXD, name + ".wav")); n = int(.025 * M.SR)
        e = np.sqrt(np.convolve((x ** 2).mean(1), np.ones(n) / n, "same")); i = int(e.argmax())
        _cache[name] = (x * (M.db(-14) / max(e[i], 1e-6)), i / M.SR)
    return _cache[name]
ROT = {"whoosh": ["whoosh_standard", "whoosh_fast", "whoosh_big"], "swoosh": ["swoosh_fast", "sub_swoosh"], "pop": ["pop_a", "pop_b"]}
_r = {}
def rot(k): i = _r.get(k, 0); _r[k] = i + 1; return ROT[k][i % len(ROT[k])]
LEVEL = {"whoosh": -5, "swoosh": -10, "cut": -13, "snap": -9, "click": -9, "pop": -9, "card": -10, "type": -27, "tick": -16, "scribble": -12}

def build_sfx(voice):
    out = np.zeros_like(voice); ev = []
    cam = lambda p: p["kind"] in ("ov", "cam")
    for i, p in enumerate(P):                                           # transitions (whip zooms in compose)
        prv = P[i - 1] if i else None
        if prv is not None and (not cam(p) or not cam(prv)): ev.append((p["s"], "whoosh", 0))
        if cam(p):
            for j, sh in enumerate(p["shots"][1:], 1):                  # every camera cut / snap-zoom
                ev.append((p["s"] + sh["t"], "snap" if sh["z"] > p["shots"][j - 1]["z"] + .05 else "cut", 0))
    for p in P:                                                          # component cues logged by the scenes
        f = os.path.join(HERE, "out", p["id"] + ".sfx.json")
        if not os.path.exists(f): continue
        for name, t, db in json.load(open(f)):
            if 0 <= t <= p["e"] - p["s"] - .05: ev.append((p["s"] + t, {"tick": "swoosh"}.get(name, name), db or 0))
    ev.sort(); last = {}; n = 0
    big = [t for t, k, _ in ev if k in ("whoosh", "click", "pop")]
    for t, k, dbx in ev:
        if k in ("cut", "swoosh", "snap", "scribble") and any(abs(t - b) < .15 for b in big): continue   # a stronger sound is there
        if t - last.get(k, -9) < .12: continue
        last[k] = t
        name = {"whoosh": rot("whoosh"), "swoosh": "swoosh_fast", "cut": "swoosh_fast", "snap": "sub_swoosh", "click": "user_click",
                "pop": rot("pop"), "card": "whoosh_wave", "type": "typing", "scribble": "swoosh_fast", "tick": "swoosh_fast"}.get(k)
        if not name: continue
        x, pk = S(name)
        if k == "type": x = x[:int(.7 * M.SR)]
        M.place(out, x, t - pk, M.db(LEVEL.get(k, -12))); n += 1
        if k == "card": y, pk2 = S(rot("pop")); M.place(out, y, t + .05 - pk2, M.db(-12))
    for m in MEMES:                                                     # the memes' own audio (v11: Stonks muted)
        if m["id"] in MUSIC.get("mute_memes", []): continue
        a = M.load(os.path.join(HERE, m["audio"])) if os.path.exists(os.path.join(HERE, m["audio"])) else None
        if a is not None: M.place(out, a[:int((m["e"] - m["s"]) * M.SR)], m["s"], M.db(-4))
    for c in M.CUES:
        if c.get("hit"): x, pk = S({"hit": "whoosh_big", "boom": "whoosh_wave"}.get(c["hit"], c["hit"])); M.place(out, x, c["a"] - pk, M.db(-8))
    print("sfx events", n)
    return out

if __name__ == "__main__":
    a = sys.argv[1:]
    outp = a[a.index("--out") + 1] if "--out" in a else os.path.join(PROJ, "build", "audio.wav")
    v = M.load(M.MASTER)[:int(M.DUR * M.SR)]
    if len(v) < int(M.DUR * M.SR): v = np.concatenate([v, np.zeros((int(M.DUR * M.SR) - len(v), 2), np.float32)])
    m = M.build_music(v); s = build_sfx(v); mix = v + m + s
    M.save(os.path.join(PROJ, "build", "music.wav"), m); M.save(os.path.join(PROJ, "build", "sfx.wav"), s)
    raw = os.path.join(PROJ, "build", "mix_raw.wav"); M.save(raw, mix * 0.7)
    o = subprocess.run(["ffmpeg", "-v", "info", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    j = json.loads(o[o.rindex("{"):o.rindex("}") + 1])
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af",
                    f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000",
                    "-c:a", "pcm_s16le", outp], check=True)
    print("wrote", outp)
