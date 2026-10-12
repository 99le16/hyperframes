# filmed-screen

Your scene, filmed off a screen. The live DOM is captured through HTML-in-Canvas every frame and
shaded by one WebGL pass: a tilted screen plane in perspective, depth of field that follows an
element you name, chromatic fringing, LED sub-pixels, a per-shot colour grade, bloom, vignette and
grain. Shots glide into each other and focus racks smoothly between elements. The element in focus stays sharp: inside its box the pass turns off
blur, LED-cell snapping and fringing, and fades back in over ~160 px around it.

Ported from the virtual-camera pass in [ff-tracking](https://github.com/mrsarac/ff-tracking)
(`lens.sksl`), with one change to its maths: each colour channel is weighted by its own sample in
the bokeh average, where the original weighted all three by the green one and tinted blurred
texture green.

## Mounting

Paste `filmed-screen.html` into the composition that owns the scene and put the scene inside
`.hf-filmed-screen-scene`:

```html
<canvas
  class="hf-filmed-screen"
  layoutsubtree
  width="1920"
  height="1080"
  style="position:absolute;left:0;top:0;width:1920px;height:1080px"
>
  <div
    class="hf-filmed-screen-scene"
    style="position:absolute;left:0;top:0;width:1920px;height:1080px"
  >
    ...scene...
  </div>
</canvas>
```

Then edit the `HFFilmedScreen.mount()` call at the bottom of the snippet. It works at the root and
inside a `data-composition-src` sub-composition; shot times are read from the owning composition's
timeline.

## Shots

```js
HFFilmedScreen.mount({
  canvas: ".hf-filmed-screen",
  shots: [
    {
      until: 3,
      palette: ["#08060a", "#2a1405", "#8a4a10", "#ffb340", "#fff1d6"],
      tilt: [0.16, -0.22, 0.03],
      zoom: [1.0, 1.2],
      blur: 1.0,
      focus: (t) => document.getElementById(t < 1.4 ? "title" : "sub"),
    },
    {
      until: 6,
      palette: null,
      focus: (t, local) => document.querySelectorAll(".tile")[Math.min(2, local | 0)],
    },
  ],
});
```

| field      | default            | notes                                                                                              |
| ---------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| until      | —                  | End of the shot, in seconds of the owning composition. Shots cut here.                             |
| palette    | null               | Five hex colours, dark → light. `null` keeps true colour.                                          |
| invert     | false              | Flips brightness and keeps hue, so light pages read as dark screens.                               |
| tilt       | [0.1, -0.15, 0.02] | Screen plane rotation `[x, y, roll]` in radians.                                                   |
| zoom       | [1.1, 1.3]         | Eased across the shot.                                                                             |
| blur       | 0.9                | Depth-of-field strength; ~0.6–1.2 reads as a phone camera.                                         |
| center     | canvas centre      | Where the camera points when nothing is in focus.                                                  |
| focus      | —                  | `(t, local) → Element \| {x,y,w,h} \| array`; the last entry is the focus.                         |
| transition | "glide"            | `"glide"` eases camera, grade and colour mode in from the previous shot; `"cut"` cuts with a tear. |
| glide      | 1.2                | Seconds a glide takes.                                                                             |

`mount()` also takes `rack` (default 0.7): the seconds a focus change takes to settle. Focus is a
weighted average of where it was over that window, so it eases on an S-curve and any seek order
renders the same frame.

A `<canvas>` without `layoutsubtree` (p5, three.js, a 2D canvas) is sampled directly instead; give
`focus` rectangles in its pixel space.

## Requirements and costs

- **HTML-in-Canvas** (`drawElementImage`), which the HyperFrames renderer's Chrome has. Without it
  the snippet moves the scene back into the page and renders it unfilmed, with one console warning.
- **Keep the `<canvas layoutsubtree>` in the HTML.** The renderer picks screenshot capture for
  compositions that declare one. Created from script, it is never seen, the frame handshake is
  skipped and frames come out blank.
- **`.hf-filmed-screen-scene` needs a pixel size.** `inset: 0` inside a layoutsubtree canvas
  measures 0×0 and captures nothing.
- **Renders use screenshot capture on one worker**, so they are slower than drawElement capture.
- The scene is stamped with `data-layout-allow-occlusion` at mount, because `check` otherwise reports
  every filmed line of text as hidden under the output canvas. Elements added after mount are not
  stamped.
