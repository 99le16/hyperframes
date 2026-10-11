"""beats.py <audio> <out.json> — librosa beat grid + downbeats (bar phase = the beat offset 0..3 whose beats carry
the most low-frequency onset energy)."""
import json, sys, os
import numpy as np, librosa
y, sr = librosa.load(sys.argv[1], sr=22050, mono=True)
tempo, bf = librosa.beat.beat_track(y=y, sr=sr, units="frames")
bt = librosa.frames_to_time(bf, sr=sr)
S = np.abs(librosa.stft(y)); low = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S[:40]), sr=sr)
e = low[np.clip(bf, 0, len(low) - 1)]
ph = int(np.argmax([e[k::4].mean() for k in range(4)]))
db_ = bt[ph::4]
bar = float(np.median(np.diff(db_))) if len(db_) > 2 else 2.0
os.makedirs(os.path.dirname(sys.argv[2]), exist_ok=True)
json.dump({"tempo": float(np.atleast_1d(tempo)[0]), "beats": [round(float(x), 4) for x in bt], "downbeats": [round(float(x), 4) for x in db_], "bar": bar}, open(sys.argv[2], "w"))
print(os.path.basename(sys.argv[1]), "tempo", float(np.atleast_1d(tempo)[0]), "bar", bar, len(db_), "downbeats")
