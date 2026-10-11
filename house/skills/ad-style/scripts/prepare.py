"""prepare.py <project_dir> <source.mp4> [--crop x:y:w:h] [--ss A --to B]
Builds the three inputs the engine needs from a finished talking-head cut:
  work/base.mp4   1080x1920 25 fps, dense keyframes (-g 5: hyperframes seeks without freezes)
  work/voice.wav  48 kHz stereo, the take's own audio (the mix re-processes it)
  work/cut.webm   person-only alpha matte (hyperframes remove-background) — words go BEHIND the head
  work/tr/transcript.json  word timings (OpenAI Whisper via transcribe-media; falls back to local mlx-whisper)
A 16:9 source is centre-cropped to 9:16 unless --crop is given (crop on the face, never by guess: look at a frame)."""
import json, os, subprocess, sys
P, src = sys.argv[1], sys.argv[2]; a = sys.argv[3:]
opt = lambda k: a[a.index(k) + 1] if k in a else None
W = os.path.join(P, 'work'); os.makedirs(W, exist_ok=True)
SK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', src], capture_output=True, text=True).stdout)['streams'][0]
w, h = pr['width'], pr['height']
crop = opt('--crop') or (f'{int(h*9/16)//2*2}:{h}:{(w-int(h*9/16))//2}:0' if w > h else f'{w}:{h}:0:0')
cut = (['-ss', opt('--ss')] if opt('--ss') else []) + (['-to', opt('--to')] if opt('--to') else [])
run = lambda *c: subprocess.run(list(c), check=True)
run('ffmpeg', '-v', 'error', '-y', *cut, '-i', src, '-vf', f'crop={crop},scale=1080:1920:flags=lanczos,fps=25', '-an', '-c:v', 'libx264', '-crf', '14', '-g', '5', '-pix_fmt', 'yuv420p', f'{W}/base.mp4')
run('ffmpeg', '-v', 'error', '-y', *cut, '-i', src, '-vn', '-ac', '2', '-ar', '48000', f'{W}/voice.wav')
run('npx', 'hyperframes', 'remove-background', f'{W}/base.mp4', '-o', f'{W}/cut.webm', '--quality', 'best')
tr = f'{W}/tr'
r = subprocess.run(['bash', os.path.join(SK, '..', 'transcribe-media', 'scripts', 'transcribe.sh'), f'{W}/voice.wav', tr, 'es'])
if r.returncode != 0 or not os.path.exists(f'{tr}/transcript.json'):
    print('OpenAI transcription failed (no credits?) -> local mlx-whisper')
    run(os.path.expanduser('~/.venvs/mlxw/bin/python'), os.path.join(SK, 'scripts', 'mlx_transcribe.py'), f'{W}/voice.wav', tr)
print('ready:', W, '— now set project.json "pieces" (face x/y per camera set) and write spec.js')
