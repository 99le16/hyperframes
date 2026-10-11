# Download the real clip

> **Runnable version:** `scripts/fetch_clip.py` implements everything below —
> search, rung listing, the client fallback, rung choice by pixel area, and an
> automatic crop report. Verified end to end on 17 Sep 2026 with yt-dlp
> 2026.07.04: search → `-F` → download → a real 1280×720 h264+aac file, and
> cropdetect correctly reporting `1280x536 at +0+92` on a deliberately
> letterboxed clip. Use the script; the prose here is why it does what it does.

Some lines point at **a specific thing that exists**: a scene from a named film,
the actual AI slop circulating on TikTok, the early build of a game everybody
has seen. Stock cannot supply any of it — stock is generic by construction — and
a generated version would be a fabrication presented as a record. The route is
to download the real clip.

Treat this as a standing option, not something to raise each time. Licensing is
the editor's judgement call, the same as with any other footage; what follows is
how to get the frames once that call is made.

## What you need first

Two binaries, no key, no account, nothing to sign up for:

```bash
brew install yt-dlp ffmpeg      # macOS
# Linux: pipx install yt-dlp  +  apt install ffmpeg
```

`yt-dlp -U` before a session that matters. YouTube changes things and a stale
copy is the single most common cause of "it worked last month". The recipes
below were run on 2026.07.04.

## Find candidates without downloading anything

```bash
yt-dlp "ytsearch6:<query>" --skip-download \
       --print "%(duration)s | %(id)s | %(title)s"
```

Duration first, because it tells you immediately whether you are looking at the
scene or at a 40-minute compilation that contains it.

## Download

Verified 9 Sep 2026 on yt-dlp 2026.07.04:

```bash
yt-dlp --extractor-args "youtube:player_client=web_embedded,mweb" \
       -f "<explicit format id>+140" --merge-output-format mp4 \
       -o "assets/src/<id>.%(ext)s" "https://www.youtube.com/watch?v=<id>"
```

## Three traps, each of which cost a cycle

1. **403 on the media URL — on some videos.** This is not universal, and it is
   worth being precise about it: on a check run 17 Sep 2026 the default client
   downloaded a public clip without complaint. But on the film-clip uploads this
   was first hit on (9 Sep 2026), the default client and `android_music` failed
   with `HTTP Error 403: Forbidden` _after_ the metadata fetch had already
   succeeded — which makes it look like the clip exists but is blocked. `tv`
   answered "The page needs to be reloaded"; `ios` offered images only.
   `web_embedded` and `mweb` both worked. `--cookies-from-browser chrome` is
   **not** the fix: it extracts 0 cookies while Chrome is running.

   So: try the default, and when a 403 appears _after_ metadata, fall back to
   `--extractor-args "youtube:player_client=web_embedded,mweb"`.
   `scripts/fetch_clip.py` does exactly that, automatically.

2. **`height<=1080` picks the wrong rung on a vertical video**, because there
   the height is the _long_ side. It silently downloaded 480×854 when 720×1280
   existed, and nothing reported a problem until the plate looked soft. Run
   `-F`, read the list, and name the format id explicitly.

3. **A published "vertical" clip is often a landscape triptych** — a static art
   panel on the left, the real vertical video in the middle, another panel on
   the right, all inside a 1920×1080 frame. Measure the centre column off a
   full-res frame and crop to it. Do not scale the whole frame; you will ship
   the panels.

A fourth, from a different source: **YouTube uploads of films carry baked
letterbox**. A scope scene inside a 16:9 container means the black bars are
pixels, not metadata, so a reframe crops nothing and the plate ships with bars.
Run `cropdetect` on every downloaded source before compositing.

## Find the exact moment without scrubbing

Scrubbing a 40-minute clip for one shot is the slow way. Two faster ones:

**Transcribe the clip and grep the word.** The frog scene in Jurassic Park was
located by searching the word "frog" in the downloaded clip's own transcript,
not by reading frames.

**Then find the cut frame by differencing thumbnails.** Extract 64×36
thumbnails at 0.04 s steps and compare the sum of channel means between
consecutive frames: a cut shows as a delta above ~25 against ~1 for ordinary
motion. That gave 175.16 s exactly, which is what let the frog land on the word
"rana".

**Always check where the shot ends, too.** That frog shot is only 2.99 s long
and the slot needed 3.03 s. Without the check the compositor would have frozen
its last frame — it was retimed to 0.85× instead. Every downloaded shot has two
boundaries and the second one is the one people forget.

## Grade it against the master

A downloaded clip is lit by whoever shot it. Measure the mean luma of the master
and of the clip, grade the clip to match — and then **re-measure the rendered
plate**, because the grade is applied in the render chain and the number you
predicted is not always the number you get.
