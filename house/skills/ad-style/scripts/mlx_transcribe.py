"""Local Whisper (mlx large-v3-turbo) -> same files tools/transcript.mjs writes.
OpenAI API was out of credits on 2026-10-01."""
import json, sys, subprocess, os
import mlx_whisper
media, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
wav = os.path.join(out, 'audio16k.wav')
if not os.path.exists(wav):
    subprocess.run(['ffmpeg','-v','error','-y','-i',media,'-vn','-ac','1','-ar','16000',wav], check=True)
r = mlx_whisper.transcribe(wav, path_or_hf_repo='mlx-community/whisper-large-v3-turbo',
                           language='es', word_timestamps=True, verbose=False,
                           condition_on_previous_text=False)
words, segs = [], []
for s in r['segments']:
    segs.append({'text': s['text'].strip(), 'start': round(s['start'],3), 'end': round(s['end'],3)})
    for w in s.get('words', []):
        words.append({'text': w['word'], 'start': round(w['start'],3), 'end': round(w['end'],3)})
json.dump(words, open(f'{out}/transcript.json','w'), ensure_ascii=False, indent=1)
json.dump(segs, open(f'{out}/segments.json','w'), ensure_ascii=False, indent=1)
open(f'{out}/transcript.txt','w').write(r['text'].strip()+'\n')
def ts(t):
    h,m=int(t//3600),int(t%3600//60); s=int(t%60); ms=int(round((t-int(t))*1000))
    if ms==1000: ms=999
    return f'{h:02}:{m:02}:{s:02},{ms:03}'
open(f'{out}/transcript.srt','w').write('\n'.join(f"{i+1}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['text']}\n" for i,s in enumerate(segs)))
print(len(words), 'words', len(segs), 'segments')
