"""mix.py <project_dir> [silent.mp4 out.mp4] — voice + ducked music bed + the add-style SFX palette -> mix/final.wav (+ mux).

Reads comp/sfx.json (cue kinds the engine logs) and project.json (voice, music {track, offset}).
The palette is the one the user signed off on (EU AD3 papel v6, 6 Oct 2026):
  * ONE click (sfx/user_click.wav, the user's own) — only on the biggest words (spec: txt({... sfx:'click'})), ~6 per minute max.
  * whooshes everywhere else: 'whoosh' = big (scene entries, opener), 'swoosh' = soft (highlights, other big words,
    strokes, later typewriter lines, camera jump cuts when nothing else lands there).
  * pops: single-bubble only (pop_a/pop_b) — multi-bubble rattles and double mouse clicks sounded wrong.
  * clock: tick / tock (Envato "Clock Tick Tock 01", tock = tick pitched to 0.8).
  * typing: one short quiet run (≤0.7 s, −27 dB) on the first typewriter title only.
  * levels (dB after normalising every file's loudest 25 ms to −14 dBFS): whooshes loud, music 2.5 dB under the old bed.
Never two sounds of the same kind within 0.12 s; a soft swoosh is dropped when a click / big whoosh / pop lands within 0.15 s."""
import json, os, subprocess, sys, wave
import numpy as np
P = os.path.abspath(sys.argv[1])
vin = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else None; out = os.path.abspath(sys.argv[3]) if len(sys.argv) > 3 else None
os.chdir(P)
SK = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); FX = os.path.join(SK, 'sfx')
cfg = json.load(open('project.json'))
SR = 48000; S = json.load(open('comp/sfx.json')); DUR = S['dur']; N = int(DUR * SR)

def load(p):
    return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-af', f'aresample={SR}', '-ac', '2', '-f', 'f32le', '-'],
                                        capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).copy()
bus = np.zeros((N, 2), np.float32)
def add(x, t):
    i = int(round(t * SR))
    if i < 0: x = x[-i:]; i = 0
    if i >= N: return
    n = min(len(x), N - i); bus[i:i + n] += x[:n]

PAL = {
    'big':   ['whoosh_standard.wav', 'whoosh_big.wav', 'whoosh_fast.wav'],
    'soft':  ['swoosh_fast.wav', 'whoosh_standard.wav', 'whoosh_fast.wav'],
    'wave':  ['whoosh_wave.wav'],
    'pop':   ['pop_a.wav', 'pop_b.wav'],
    'click': ['user_click.wav'],
    'tick':  ['tick.wav'], 'tock': ['tock.wav'],
    'sub':   ['sub_swoosh.wav'],
    'type':  ['typing.wav'],
}
WH = {'big', 'soft', 'wave', 'sub'}          # aligned on their loudest point; the rest on their onset
TRIM = {'pop': 0.35}
LV = {'big': -5, 'soft': -10, 'wave': -10, 'pop': -9, 'click': -9, 'tick': -13, 'tock': -13, 'sub': -10, 'type': -27}
cache = {}
def snd(cat, i):
    p = os.path.join(FX, PAL[cat][i % len(PAL[cat])])
    if p not in cache:
        x = load(p); e = np.sqrt(np.convolve(x[:, 0]**2, np.ones(1200) / 1200, 'same'))
        pk = int(np.argmax(e)); on = int(np.argmax(e > e.max() * 0.08))
        if cat not in WH: x = x[on:].copy(); pk -= on
        if cat in TRIM: x = x[:int(TRIM[cat] * SR)].copy(); g = int(0.03 * SR); x[-g:] *= (np.linspace(1, 0, g)**2)[:, None]
        x *= 10**(-14 / 20) / max(e.max(), 1e-6)
        f = min(len(x), int(0.004 * SR)); x[:f] *= np.linspace(0, 1, f)[:, None]
        g = min(len(x), int(0.08 * SR)); x[-g:] *= np.linspace(1, 0, g)[:, None]
        cache[p] = (x, pk / SR)
    return cache[p]

queue = []
def put(cat, t, db=0.0, maxlen=None): queue.append((t, cat, db, maxlen))
cues = sorted(S['sfx'], key=lambda c: c['t'])
near = lambda t, kinds, w: any(abs(t - q['t']) < w for q in cues if q['kind'] in kinds)
for c in cues:
    k, t = c['kind'], c['t']
    if k == 'whoosh': put('big', t)
    elif k == 'swoosh': put('soft', t - 0.02)
    elif k == 'paper': put('wave', t, -1); put('pop', t + 0.05, -3)
    elif k == 'pop': put('pop', t)
    elif k == 'click': put('click', t)
    elif k in ('tick', 'tock'): put(k, t)
    elif k == 'sub': put('sub', t, -2)
    elif k == 'zoomin': put('big', t + 0.4); put('sub', t + 0.5, -2)
    elif k == 'cut':
        if not near(t, ('click', 'swoosh', 'pop', 'paper', 'whoosh', 'zoomin'), 0.2): put('soft', t, -1)
    elif k == 'type':
        end = min([q['t'] for q in cues if q['kind'] == 'type_end' and q['t'] > t] + [t + 1.0])
        put('type', t, 0, min(0.7, end - t))
keep = []
for t, cat, db, ml in sorted(queue):
    if any(c == cat and abs(t - u) < 0.12 for u, c, _, _ in keep): continue
    keep.append((t, cat, db, ml))
keep = [k for k in keep if not (k[1] == 'soft' and any(c in ('click', 'big', 'pop') and abs(k[0] - u) < 0.15 for u, c, _, _ in keep))]
rot = {}
for t, cat, db, ml in keep:
    i = rot.get(cat, 0); rot[cat] = i + 1; x, pk = snd(cat, i)
    if ml: x = x[:int(ml * SR)].copy(); g = min(len(x), int(0.12 * SR)); x[-g:] *= np.linspace(1, 0, g)[:, None]
    add(x * 10**((LV[cat] + db) / 20), t - (pk if cat in WH else 0))
print('sfx', len(keep), {k: sum(1 for _, c, _, _ in keep if c == k) for k in PAL})

voice = load(cfg['voice']); vo = np.zeros((N, 2), np.float32); vo[:min(N, len(voice))] = voice[:N]
env = np.sqrt(np.convolve(vo[:, 0]**2, np.ones(2400) / 2400, 'same')); sp = (env > 10**(-40 / 20)).astype(np.float32)
k = int(0.3 * SR); sp = np.clip(np.convolve(sp, np.ones(k) / k, 'same') * 1.8, 0, 1)
mu = np.zeros((N, 2), np.float32)
M = cfg.get('music')
if M:
    m = load(M['track'])[int(M.get('offset', 0) * SR):]; mu[:min(N, len(m))] = m[:N]
    duck = -19.5 - 6 * sp                     # bed −19.5 dB in gaps, −25.5 under speech (user: "un pelín" lower than −17/−23)
    vend = len(voice) / SR
    if N > int(vend * SR): duck[int(vend * SR):] = np.linspace(-19.5, -12, N - int(vend * SR))
    mu *= (10**(duck / 20))[:, None]
    f = int(0.9 * SR); mu[-f:] *= np.linspace(1, 0, f)[:, None]
os.makedirs('mix', exist_ok=True)
def wr(p, x):
    with wave.open(p, 'w') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
wr('mix/voice.wav', vo); wr('mix/bed.wav', mu + bus)
fc = ('[0:a]highpass=f=85,afftdn=nr=6:nf=-45,acompressor=threshold=-21dB:ratio=3.2:attack=4:release=110:makeup=4.5,equalizer=f=180:t=q:w=1:g=1.5,equalizer=f=3800:t=q:w=1.3:g=2.5,'
      'alimiter=limit=0.89[vv];[vv][1:a]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.2:LRA=7[a]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'mix/voice.wav', '-i', 'mix/bed.wav', '-filter_complex', fc, '-map', '[a]', '-ar', '48000', 'mix/final.wav'], check=True)
if vin and out:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', vin, '-i', 'mix/final.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-shortest', '-movflags', '+faststart', out], check=True)
r = subprocess.run(['ffmpeg', '-i', 'mix/final.wav', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print([l.strip() for l in r.splitlines() if l.strip().startswith(('I:', 'LRA:', 'Peak:'))][-3:])
