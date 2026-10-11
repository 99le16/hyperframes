# The meme beat

A meme beat is a cut where the picture is the joke. The narrator says something
with an edge — "it was a tremendous pain", "Base44 is just a wrapper round
Claude", "two of them were unemployed" — and the screen answers it rather than
illustrating it. It is a different job from a schema, which explains, and from
stock, which shows.

Three things make it work.

## 1. It is drawn, not screenshotted

The frustration beat for "I tried to build it with one of those website
builders and it was a tremendous pain" is a flat illustration on cream: a person
at a desk, a dense grid of tiny drag-handles and toolbars, one element refusing
to line up. It is deliberately **not** a real product's UI. Naming a real tool
in a complaint you did not verify is a different claim from making a joke about
a category, and the drawing makes the joke without making the claim.

Same for the "wrapper" insult: a vast unlabelled engine crate with a thin
cardboard sleeve slipped over it. The insult drawn straight, at the moment it is
quoted.

The exception is when the line points at a _specific real thing_ everybody can
check — the actual clip circulating, the game's real early build. Then it is a
download, not a drawing (`yt-dlp.md`).

## 2. It is short and it butts the line

Meme plates run 1.4–3 s. They open on the word that carries the joke and get out
before the next clause. A joke plate that outstays the sentence stops being a
joke and becomes a slide.

And the presenter beats the graphic on a joke. If the funny thing is his
delivery, the frame belongs to him — one edit's note on this was blunt: _"que se
le vea en pantalla completa, quita esa animación"_. Cover the line only when the
picture is funnier than the face.

## 3. The sound has to land on the cut — and usually does not

This is the trap, and it is invisible.

A cue is placed with `adelay=at*1000`, which **starts the file at `at`**. The
field is called `at` and the code comment says "the moment the hit LANDS", so it
is natural to write the cut time into it and assume the hit sounds there.

A licensed `meme_impact.wav` came with **451 ms of digital silence before the
peak**. Ten meme plates were delivered with `at` on their first frame, so every
hit landed 0.45 s late — on plates of 1.4–1.9 s, that is past the halfway point.
Nothing reports it: the file exists, the cue is placed, the render succeeds, and
the edit just feels slightly wrong.

**Measure the peak of every effect before using it, not just its duration:**

```python
mono = [max(abs(a[i]), abs(a[i+1])) for i in range(0, len(a), 2)]
pk = max(mono)
print('peak at', mono.index(pk) / sr * 1000, 'ms')
```

If it has a silent head, **trim the file** (`ffmpeg -ss`) rather than
compensating with a negative `at`. Trimming makes `at` mean what it says; a
negative `at` obliges you to remember the correction at every future cue. The
fixed file — peak at 51 ms — took all 17 cues.

The same arithmetic runs the other way for a whoosh: a whoosh must start
_before_ the cut so that its peak lands on it. Both cases are the same
discipline — place the peak, not the file.
