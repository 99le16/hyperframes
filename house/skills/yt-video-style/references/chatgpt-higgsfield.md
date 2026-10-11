# ChatGPT images + Higgsfield Seedance

The user wants images made «con ChatGPT» in the **chatgpt.com web app through Claude in Chrome** (their Plus account), not
the API (the OpenAI keys in .env have repeatedly had no credits) and not Higgsfield's image models unless asked. Seedance
(video) runs through the `higgsfield` CLI with the user's app credits («si necesitas más tokens de higgsfield me avisas»).

## ChatGPT web flow (one chat per batch — consistency of style)

1. `tabs_context_mcp` → navigate the MCP tab to https://chatgpt.com/ (normal chat; temporary chats can't generate images).
2. `find` "file input for attaching photos" → `file_upload` the references (≤10 MB, JPG): style reference(s) + the presenter
   photo (for avatars). Click the prompt box (≈(700, 497) on a fresh page; ≈(700–800, 768–798) in a chat — re-screenshot if
   the window size changed: a click that misses the box means the prompt never gets sent), type, Return.
3. Wait from OUTSIDE page JS: the page freezes while rendering → use `computer wait 10` ×3–4, then a JS check < 30 s:

```js
window.__wait = async (ms = 25000) => {
  const t0 = Date.now();
  let ready = false;
  while (Date.now() - t0 < ms) {
    const im = [...document.querySelectorAll('main img[alt^="Imagen generada"]')].pop();
    const prev = /Vista previa|Creando imagen|\d\d%/.test(
      document.querySelector("main").innerText.slice(-600),
    );
    ready = !prev && !!im && im.src !== window.__lastsrc;
    if (ready) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return ready;
};
window.__arm = async () => {
  const im = [...document.querySelectorAll('main img[alt^="Imagen generada"]')].pop();
  const b = await (await fetch(im.src)).blob();
  window.__lastsrc = im.src;
  window.__copied = 0;
  document.addEventListener(
    "click",
    () =>
      navigator.clipboard.write([new ClipboardItem({ [b.type]: b })]).then(
        () => (window.__copied = 1),
        (e) => (window.__copied = String(e)),
      ),
    { capture: true, once: true },
  );
  return { type: b.type, size: b.size, w: im.naturalWidth, h: im.naturalHeight };
};
```

4. Save: `__arm()` → `computer left_click` on an empty area (real gesture → clipboard allowed) → `__copied === 1` →
   `scripts/clip2png.sh <name>` (osascript writes «class PNGf» to gen_hero/<name>.png). 16:9 comes back 1672×941.
   Downloads (`<a download>`, viewer button) never land on disk — don't try.

## Prompts (Spanish works; repeat the style every time, ask for empty space where text goes, "Sin texto ni logos")

**Heroes — cinematic stylised 3D illustration** (refs: assets/ref_hero_pedestal.jpg + ref_hero_slot.jpg):
"Voy a pedirte varias imágenes 16:9 para un vídeo, TODAS en exactamente el estilo de estas dos referencias: ilustración 3D
estilizada con textura pintada suave, iluminación cinematográfica oscura con un foco cálido y reflejos azules, profundidad de
campo, bokeh, sin personas salvo que lo pida, sin texto ni letras ni logos. Primera imagen: …" then one per message:
"Siguiente, mismo estilo exacto: <escena concreta, encuadre (plano frontal / centrado), dónde queda vacío para el texto>."
Trading-13 heroes: dark trading room with 3 monitors (centre screen centred), pedestal under red velvet with a golden «?»,
vintage slot machine whose reels show car/plane/palm, low chess shot with red rim light, bronze bull (green light) vs bear
(red light), retro arcade with an empty glowing cyan screen, street drain swallowing dollar bills.
**Avatars — flat 2D bitmoji** (refs: assets/ref_avatar_flat_wide.png + ref_avatar_flat_user.jpg + a frame of the presenter):
"La primera imagen es la referencia de ESTILO exacto: ilustración plana tipo avatar (Bitmoji), cabeza grande, cara sencilla
con ojos grandes, contornos finos marrón oscuro, colores planos con degradados suaves y textura de grano, skyline de ciudad al
atardecer… el personaje debe ser el hombre de la segunda foto dibujado en ese mismo estilo: <pelo, barba sí/no, gafas
sí/no, ropa>… personaje en el centro-izquierda; la mitad derecha vacía para texto." Then "mismo estilo y el MISMO personaje: <escena>".
Never: glossy semi-3D cartoons, vaults/gold rooms, retirement beaches (vendehumos).

## Seedance 1.5 (`scripts/seedance_heroes.py`, `higgsfield generate create seedance1_5`)

- `--start-image <png> --duration 4|8 --resolution 1080p --aspect_ratio 16:9 --generate_audio false --wait --json`; ≈12 cr
  per 4 s, 24 per 8 s (1080p). 4 jobs in parallel; a 503/520 just needs a retry. Check `higgsfield account status` first.
- Prompt = the motion + a KEEP clause: "Keep the exact stylised 3D illustrated look, colours and lighting of the image;
  cinematic, smooth, physically plausible motion; no new objects, no people, no text or letters appearing." For flat avatars:
  "This is a FLAT 2D illustration: keep it a flat 2D cartoon drawing exactly like the image … subtle, slow, clean movement;
  no morphing, no 3D look, static or very slow camera."
- Motion verbs that worked: slow push-in, reels spin then stop, cloth pulled away revealing smoke, water swirling into a drain,
  CRT screen flicker, ship sailing, intern balancing coffee cups.
- REVIEW every clip (strip at 1.5 fps + frames at the words) before using it: Seedance invents things (a floating monitor
  appeared in one avatar clip → that one stayed a still with a push). Retime to the slot with setpts (compose does it).
- MG on top: overlay scene with `L.heroCam(zoom)`; positions measured on the CLIP frames (Seedance pushes in on its own);
  end with a dive into a screen/object → the next scene opens from a white flash / bright point.

## Glossy 3D tiles (icons) without ChatGPT

`scripts/gen_tiles_higgsfield.py` (higgsfield `gpt_image_2`, ~1 cr each) on a flat #00FF00 / #FF00FF background +
`scripts/chroma_key.py` (despill, trim). Its `--background transparent` draws a fake checkerboard and the bg-remover eats the
tile face — don't use them. 23 ready tiles are in assets/tiles.
