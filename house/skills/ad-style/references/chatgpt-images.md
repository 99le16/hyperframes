# Images with ChatGPT (web app, through Claude in Chrome)

The OpenAI image API has had no credits (`OPENAI_IMAGE_API_KEY` empty, main key →
429 "no credits remaining"); the user's flow is **ChatGPT web**. Test the API once;
if it fails, go straight to the browser.

## Session

1. `tabs_context_mcp {createIfEmpty:true}` → navigate `https://chatgpt.com/` (logged in).
   Use a **normal** chat (temporary chats can't generate images). Keep ONE chat for the
   whole edit — "exactly the same background" only works inside the same chat.
2. First message: attach 2 reference stills (`find` "file input for attaching photos" →
   `file_upload` with paths under the repo, e.g. `reference/navy.jpg`,
   `reference/gray_people.jpg`) and say: you'll ask image by image, **never any text or
   letters in the images**.
3. Helpers (inject once per page load):

```js
window.__gens = () =>
  [...document.querySelectorAll("main img")].filter(
    (i) => i.alt.startsWith("Imagen generada") && i.naturalWidth > 300,
  );
window.__send = async (txt) => {
  const ed = document.querySelector('.ProseMirror[contenteditable="true"]');
  ed.focus();
  document.execCommand("insertText", false, txt);
  return "typed";
}; // then press Return with computer key (the send button has no testid)
window.__wait = async (ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const last = window.__gens().at(-1);
    const tail = document.querySelector("main").innerText.slice(-300);
    const busy = /Vista previa|\d+%|Creando|Haciendo/.test(tail);
    if (last && last.src !== window.__lastsrc && !busy)
      return ["done", last.naturalWidth, last.naturalHeight];
    await new Promise((r) => setTimeout(r, 2000));
  }
  return ["wait"];
};
window.__arm = async () => {
  const im = window.__gens().at(-1);
  const blob = await (await fetch(im.src)).blob();
  window.__lastsrc = im.src;
  document.addEventListener(
    "click",
    () => navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]),
    { capture: true, once: true },
  );
  return [blob.type, blob.size, im.naturalWidth, im.naturalHeight];
};
```

4. Per image: `__send(prompt)` → `computer key Return` → poll `__wait(30000)` (JS calls
   die at 45 s — wait in ≤30 s chunks; one generation takes 40–90 s) → `__arm()` →
   `computer left_click` on an empty area (real gesture → clipboard) →
   `scripts/saveclip.sh <abs path>.png`. Downloads never land on disk; the clipboard does.
5. Read every image before using it. Close the tab at the end.

## Prompts that worked (Spanish, one per message)

- **Navy background**: «genera solo el FONDO de la primera captura, vertical 9:16: papel/lienzo azul marino muy oscuro con textura grunge, polvo, arañazos y viñeta suave, exactamente esa textura, completamente vacío (sin torres, sin notas, sin texto).»
- **Grey cloud paper**: «el FONDO de la segunda captura, vertical 9:16: papel gris claro con nubes en blanco y negro, textura de papel de periódico reciclado con granulado y fotocopia, muy sutil, completamente vacío…»
- **Seedance start frame**: «EXACTAMENTE ese mismo fondo gris de nubes que acabas de hacer (idéntico, mismo encuadre 9:16), pero con una pequeña bola de papel de periódico arrugada en el centro (~15% del ancho), en blanco y negro, con sombra suave. Nada más, sin texto.»
- **Seedance end frame (unfold)**: «fotograma FINAL de la bola desplegándose, mismo encuadre y fondo de nubes arriba: la bola se ha abierto en una gran hoja de periódico rasgada y arrugada que ocupa la mitad inferior, y por el agujero rasgado se ve, como collage fotográfico, <ESCENA: un paseo marítimo soleado con mar y palmeras>, el suelo llega hasta abajo. Sin personas, sin texto legible.»
- **Seedance end frame (tear)**: «…el papel del fondo se ha RASGADO por la mitad inferior, bordes irregulares de papel blanco rasgado, y por la rotura se ve <ESCENA: una oficina gris de cubículos con fluorescentes>, colores muy apagados… sin personas, sin texto legible.»
- **Person cut-out**: «foto realista recortada de <persona>, de cuerpo entero, <pose con objeto>, vista de frente. Sobre fondo blanco puro liso (#FFFFFF), sin sombra en el suelo, formato vertical 2:3, sin texto.»
- **Group**: «grupo de 5 <oficinistas>… de pie en fila como en la referencia… caras de cansancio… fondo blanco puro (#FFFFFF), sin sombras, horizontal 3:2.»
- **Hands + phone**: «dos manos sujetando un smartphone en vertical, primera persona desde abajo, las manos entran desde la parte inferior. La pantalla VERDE CROMA puro (#00FF00) uniforme. Fondo blanco puro. 9:16, sin texto.»
- **Prop sheet**: «una hoja con 6 objetos recortados estilo collage, bien SEPARADOS (ninguno se toca), fondo blanco puro, sin sombras: 1) … 6) … Fotos realistas, cuadrícula 3x2, horizontal 3:2, sin texto.» (colour props; landmarks/clocks in «blanco y negro»)
- **Landmarks**: «dos rascacielos art déco, fotos recortadas en blanco y negro, altos y estrechos, SEPARADOS, de frente y un poco desde abajo, fondo blanco puro, vertical 2:3.»
- **Light phone-scene paper**: «textura de fondo vertical 9:16: papel gris muy claro casi blanco con grano de fotocopia, manchas suaves y arañazos sutiles. Abstracta y vacía, sin objetos ni letras.»
  (A version asking for «letras de periódico» was REFUSED by the content filter — leave lettering out.)

Results come back 941×1672 (9:16), 1024×1536, 1536×1024. Upscale backgrounds/frames
to 1080×1920 with lanczos.

## Cutting out (`scripts/whitekey.py`)

`hyperframes remove-background` (u2net) keeps people but **drops chairs, laptops,
props** — use the white key for anything generated on #FFFFFF:

```bash
python3 whitekey.py gen/x.png cuts/x.png 28 [--holes 1500]      # border-connected white removed; --holes also kills enclosed white gaps (chair frames)
python3 whitekey.py gen/group.png cuts/office.png 28 --holes 800 --split 20000   # one PNG per object/person
SPECK=0.0003 python3 whitekey.py …      # keep tiny parts (candle flames); default drops specks < 0.4%
```

Prop sheets: crop each grid cell first (with margin, cells can overlap), then key.
Green phone screens: key the green separately (`g>180, r<120, b<120`) and measure the
screen rect — the engine needs it.
