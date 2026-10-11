"""RobustVideoMatting (person-only alpha, temporally stable) -> grayscale matte mp4 (white = person)."""
import torch, sys, subprocess, numpy as np
src, out = sys.argv[1], sys.argv[2]
dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
model = torch.hub.load('PeterL1n/RobustVideoMatting', 'resnet50', trust_repo=True).eval().to(dev)
w, h = [int(x) for x in subprocess.run(['ffprobe','-v','error','-select_streams','v','-show_entries','stream=width,height','-of','csv=p=0',src],capture_output=True,text=True).stdout.strip().split(',')]
dec = subprocess.Popen(['ffmpeg','-v','error','-i',src,'-f','rawvideo','-pix_fmt','rgb24','-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','gray','-s',f'{w}x{h}','-r','30','-i','-','-c:v','libx264','-crf','12','-pix_fmt','yuv420p',out], stdin=subprocess.PIPE)
rec = [None]*4; ratio = 0.25 if max(w,h) >= 1900 else 0.4
# warm the recurrent state on the first second (otherwise the first frames come out half-transparent)
warm = subprocess.Popen(['ffmpeg','-v','error','-i',src,'-frames:v','25','-f','rawvideo','-pix_fmt','rgb24','-'], stdout=subprocess.PIPE)
with torch.no_grad():
    for _ in range(2):
        frames = []
        while True:
            b = warm.stdout.read(w*h*3) if warm else b''
            if len(b) < w*h*3: break
            frames.append(b)
        warm = None
        for b in (frames if _ == 0 else []): pass
    for b in frames:
        x = torch.from_numpy(np.frombuffer(b,np.uint8).reshape(h,w,3).copy()).to(dev).permute(2,0,1).float().div(255).unsqueeze(0)
        _f, _p, *rec = model(x, *rec, downsample_ratio=ratio)
with torch.no_grad():
    while True:
        b = dec.stdout.read(w*h*3)
        if len(b) < w*h*3: break
        x = torch.from_numpy(np.frombuffer(b,np.uint8).reshape(h,w,3).copy()).to(dev).permute(2,0,1).float().div(255).unsqueeze(0)
        fgr, pha, *rec = model(x, *rec, downsample_ratio=ratio)
        enc.stdin.write((pha[0,0].clamp(0,1).mul(255).byte().cpu().numpy()).tobytes())
enc.stdin.close(); enc.wait(); print('ok', out)
