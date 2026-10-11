/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// EU AD3 · Hook B + Body + CTA — papel/collage motion (ref IG DXG8nysjHqQ), all three formats.
// L(vertical, square, horizontal). Vertical values are the delivered v6 layout, unchanged. Times are identical in every format
// (the v6 mix is reused as is).
(function () {
  const {
    tl,
    el,
    px,
    at,
    W_,
    cue,
    behind,
    front,
    scenes,
    shot,
    buildShots,
    matte,
    txt,
    line,
    pills,
    type,
    card,
    cutout,
    scene,
    clock,
    stroke,
    L,
    F,
    W,
    H,
  } = E;
  const Y = "#FAF400",
    INK = "#1f1f1f";
  const vid = (id) => document.getElementById(id);
  const put = (id, parent, z) => {
    const v = vid(id);
    parent.appendChild(v);
    v.style.zIndex = z || 0;
    return v;
  };
  const ws = (s, after) => W_(s.split(" "), after);
  E.setLift(L(0, 60, 0)); // safe area: camera stretches sit lower (IG/feed UI covers the top)
  const sfx = { V: "", S: "_s", H: "_h" }[F]; // asset suffix per format
  const full = (s, src) =>
    (el("img", "abs", s, { left: 0, top: 0, width: px(W), height: px(H) }).src = src);
  // camera stretches: small companion line + big yellow word. S: line at the top, word under it; H: both in the left half.
  const SM = { cls: "hvs shadowed" };
  const smallAt = (o) =>
    Object.assign(
      {
        x: L(o.vx ?? 540, 540, o.hx ?? 430),
        y: L(o.vy, o.sy ?? 22, o.hy ?? 250),
        size: L(o.vs ?? 62, 44, 54),
        anchor: "c",
      },
      SM,
    );
  const bigAt = (o) => ({
    x: L(o.vx ?? 540, 540, o.hx ?? 430),
    y: L(o.vy, o.sy ?? 72, o.hy ?? 310),
    size: L(o.vs, o.ss, o.hs),
    anchor: "c",
  });

  // ═════════ A · 0–1.92  "No importa si llevas más de" ═════════
  shot(0, 1.0);
  matte(0, 6.3);
  txt(
    behind,
    Object.assign(
      { t: 0.04, out: 1.92, text: "No importa", color: Y, anim: "pop" },
      bigAt({ vy: 255, vs: 210, ss: 160, hs: 150 }),
    ),
  );
  line(
    front,
    Object.assign(
      { words: ws("si llevas más de", 1.0), out: 1.92 },
      smallAt({ vy: 470, sy: 22, hy: 250 }),
    ),
  );
  cue(0, "whoosh", 0.7);

  // ═════════ B · 1.92–3.44  "5 años en el mismo trabajo" ═════════
  shot(1.92, 1.14);
  txt(
    behind,
    Object.assign(
      { t: 1.92, out: 3.44, text: "5 años", color: Y, anim: "pop" },
      bigAt({ vy: 205, vs: 360, ss: 230, hs: 260 }),
    ),
  );
  line(
    front,
    Object.assign(
      { words: ws("en el mismo trabajo", 2.4), out: 3.44 },
      smallAt({ vy: 505, vx: 600, sy: 22, hy: 560 }),
    ),
  );
  cue(1.92, "hit", 0.6);

  // ═════════ C · 3.44–6.30  "y piensas que es tarde para empezar desde cero" ═════════
  shot(3.44, 1.02);
  line(
    front,
    Object.assign(
      { words: ws("y piensas que es", 3.4), out: 4.5 },
      smallAt({ vy: 175, sy: 22, hy: 250 }),
    ),
  );
  if (F === "V")
    line(front, {
      words: ws("y piensas que es", 3.4),
      size: 62,
      x: 540,
      y: 175,
      anchor: "c",
      out: 6.3,
      cls: "hvs shadowed",
    });
  txt(
    behind,
    Object.assign(
      { t: 4.5, out: 5.62, text: "tarde", color: Y, anim: "pop" },
      bigAt({ vy: 240, vs: 380, ss: 240, hs: 270 }),
    ),
  );
  stroke(behind, {
    t: 4.62,
    dur: 0.35,
    out: 5.62,
    color: "#fff",
    w: 5,
    d: L(
      "M 150 470 C 260 545, 840 540, 950 470 C 1010 425, 760 405, 560 415 C 400 425, 250 450, 290 480",
      "M 240 275 C 320 320, 760 318, 840 275 C 880 245, 700 232, 560 238 C 440 244, 320 262, 350 282",
      "M 150 560 C 230 615, 700 612, 790 560 C 840 528, 650 512, 480 520 C 350 528, 210 548, 240 572",
    ),
  });
  line(
    front,
    Object.assign(
      { words: ws("para empezar desde", 4.6), out: 6.3 },
      smallAt({ vy: 600, sy: 22, hy: 250 }),
    ),
  );
  shot(5.62, 1.18);
  txt(
    behind,
    Object.assign(
      { t: 5.62, out: 6.3, text: "cero", color: Y, anim: "pop" },
      bigAt({ vy: 205, vs: 400, ss: 250, hs: 320 }),
    ),
  );
  cue(5.62, "hit", 0.6);

  // ═════════ D · 6.30–9.68  paper ball unfolds → boardwalk ═════════
  {
    const s = scene(6.3, 9.68, { color: "#cfcfcf", sfx: "paper" });
    full(s, `seed/unfold_remote${sfx}_last.png`);
    put("unfold_remote", s, 0);
    cue(6.95, "whoosh", 0.9);
    const cx = W / 2,
      G = "#303030";
    line(s, {
      words: ws("hoy puedes conseguir", 6.3),
      size: L(58, 46, 50),
      x: cx,
      y: L(205, 90, 90),
      anchor: "c",
      color: G,
    });
    line(s, {
      words: ws("un trabajo en", 7.1),
      size: L(58, 46, 50),
      x: cx,
      y: L(268, 140, 145),
      anchor: "c",
      color: G,
    });
    txt(s, {
      t: 7.76,
      text: "remoto",
      size: L(270, 190, 210),
      x: cx,
      y: L(318, 178, 190),
      anchor: "c",
      color: INK,
      anim: "pop",
    });
    cue(7.76, "hit", 0.5);
    line(s, {
      words: ws("y con salarios como estos", 8.1),
      size: L(54, 42, 46),
      x: cx,
      y: L(560, 350, 370),
      anchor: "c",
      color: G,
    });
    type(s, {
      x: cx,
      anchor: "c",
      y: L(625, 400, 422),
      size: L(92, 64, 70),
      lines: [[{ hl: "+3.000 €/MES", at: 9.34 }]],
    });
    cutout(s, {
      src: "cuts/remote.png",
      t: 7.62,
      x: L(300, 410, 830),
      y: L(1010, 520, 520),
      w: L(480, 270, 290),
      outline: Y,
      ow: L(6, 4, 4),
      anim: "drop",
    });
    const lb = (t, text, x, y) =>
      txt(s, {
        t,
        text,
        size: 32,
        x,
        y,
        cls: "lbl",
        color: "#1a1a1a",
        css: { fontSize: L("32px", "26px", "28px"), background: "#fff", padding: "2px 8px" },
      });
    lb(7.9, "100% remoto", L(150, 200, 600), L(1000, 540, 540));
    lb(8.3, "tu horario", L(780, 700, 1150), L(1060, 580, 580));
    cutout(s, {
      src: "cuts/euros.png",
      t: 9.34,
      x: L(690, 740, 1220),
      y: L(1230, 780, 760),
      w: L(300, 220, 240),
      rot: 12,
      anim: "pop",
      shadow: true,
    });
  }

  // ═════════ E · 9.68–11.56  clock: "en tan solo 12 meses" ═════════
  shot(9.68, 1.0);
  matte(9.68, 11.56);
  clock(behind, { t: 9.68, out: 11.56, x: W / 2, y: L(560, 330, 330), r: L(400, 270, 270) });
  line(front, {
    words: ws("en tan solo", 9.6),
    size: L(60, 44, 50),
    x: L(250, 300, 1240),
    y: L(1330, 785, 640),
    cls: "hvs shadowed",
    out: 11.56,
  });
  txt(front, {
    t: 10.5,
    out: 11.56,
    text: "12",
    size: L(330, 220, 250),
    x: L(530, 560, 1250),
    y: L(1180, 690, 690),
    color: Y,
    anim: "pop",
    cls: "hvi",
  });
  txt(front, {
    t: 10.94,
    out: 11.56,
    text: "meses",
    size: L(92, 64, 76),
    x: L(560, 580, 1270),
    y: L(1450, 870, 900),
    cls: "hvi shadowed",
    anim: "rise",
  });
  cue(10.5, "hit", 0.6);

  // ═════════ F · 11.56–13.24 body: "Soy Bienvenido Sáez y llevo" ═════════
  shot(11.56, 1.0);
  pills(11.56, 13.24);

  // ═════════ G · 13.24–15.62  "más de 17 años formando a profesionales" ═════════
  shot(13.24, 1.3, { dx: L(150, 140, 0) });
  matte(13.24, 15.62);
  line(front, {
    words: ws("más de", 13.2),
    size: L(50, 42, 54),
    x: L(50, 40, 140),
    y: L(470, 200, 300),
    cls: "hvs shadowed",
    out: 14.4,
  });
  txt(behind, {
    t: 13.6,
    out: 14.4,
    text: "17<br>años",
    size: L(190, 150, 230),
    x: L(40, 30, 130),
    y: L(530, 250, 360),
    color: Y,
    anim: "pop",
  });
  shot(14.4, 1.3, { dx: L(-20, -20, 0) });
  line(front, {
    words: ws("formando a", 14.3),
    size: L(54, 42, 54),
    x: L(W / 2, W / 2, 430),
    y: L(150, 20, 270),
    anchor: "c",
    cls: "hvs shadowed",
    out: 15.62,
  });
  txt(behind, {
    t: 15.04,
    out: 15.62,
    text: "profesionales",
    size: L(165, 125, 120),
    x: L(W / 2, W / 2, 430),
    y: L(215, 70, 335),
    anchor: "c",
    color: Y,
    anim: "pop",
  });

  // ═════════ H · 15.62–18.82 pills ═════════
  shot(15.62, 1.0);
  pills(15.62, 18.82);
  shot(17.7, 1.15);

  // ═════════ I · 18.82–26.30 navy notepad scene ═════════
  {
    const s = scene(18.82, 26.3, { bg: `gen/bg_navy${sfx}.png`, sfx: "whoosh" });
    type(s, {
      x: L(70, 50, 230),
      y: L(280, 90, 90),
      size: L(80, 60, 84),
      cps: 28,
      lines: [
        [{ t: "A las empresas hoy", at: 18.86 }],
        [
          { t: "no le ", at: 19.78 },
          { hl: "IMPORTAN", at: 20.3 },
        ],
      ],
    });
    cutout(s, {
      src: "cuts/tower1.png",
      t: 19.05,
      x: L(-170, -110, -90),
      y: L(1040, 600, 330),
      w: L(470, 320, 400),
      anim: "rise",
      z: 1,
      gray: true,
    });
    cutout(s, {
      src: "cuts/tower2.png",
      t: 19.35,
      x: L(790, 850, 1650),
      y: L(960, 560, 290),
      w: L(430, 300, 380),
      anim: "rise",
      z: 1,
      gray: true,
    });
    const cw = L(390, 300, 440),
      ch = L(340, 260, 370),
      cy = L(640, 380, 410),
      nd = { numsize: L(84, 62, 84), numdy: L(92, 70, 92) };
    const x1 = L(110, 40, 230),
      x2 = L(580, 390, 740),
      x3 = L(300, 740, 1250),
      y3 = L(1170, cy, cy),
      w3 = L(480, cw, cw),
      h3 = L(400, ch, ch);
    card(
      s,
      Object.assign(
        {
          t: 21.02,
          x: x1,
          y: cy,
          w: cw,
          h: ch,
          rot: -2,
          text: "¿Tu edad?",
          size: L(52, 40, 50),
          num: "#1",
        },
        nd,
      ),
    );
    cutout(s, {
      src: "cuts/cake.png",
      t: 21.15,
      x: x1 + cw - L(120, 90, 110),
      y: cy - L(50, 40, 50),
      w: L(170, 125, 160),
      z: 4,
      rot: 8,
    });
    const m1 = cy + ch / 2,
      m2 = cy + ch / 2;
    stroke(s, {
      t: 21.4,
      dur: 0.25,
      z: 6,
      color: "#d11",
      w: L(9, 7, 8),
      d: `M ${x1 + 0.14 * cw} ${m1 + 5} C ${x1 + 0.38 * cw} ${m1 - 20}, ${x1 + 0.64 * cw} ${m1 + 20}, ${x1 + 0.87 * cw} ${m1 - 10}`,
    });
    card(
      s,
      Object.assign(
        {
          t: 21.98,
          x: x2,
          y: cy,
          w: cw,
          h: ch,
          rot: 2,
          text: "¿Título<br>universitario?",
          size: L(46, 34, 44),
          num: "#2",
        },
        nd,
      ),
    );
    cutout(s, {
      src: "cuts/gradcap.png",
      t: 22.12,
      x: x2 + cw - L(140, 110, 130),
      y: cy - L(65, 50, 60),
      w: L(190, 140, 180),
      z: 4,
      rot: -10,
    });
    stroke(s, {
      t: 22.5,
      dur: 0.3,
      z: 6,
      color: "#d11",
      w: L(9, 7, 8),
      d: `M ${x2 + 0.12 * cw} ${m2 - 25} C ${x2 + 0.36 * cw} ${m2 - 45}, ${x2 + 0.66 * cw} ${m2 - 5}, ${x2 + 0.9 * cw} ${m2 - 35} M ${x2 + 0.16 * cw} ${m2 + 40} C ${x2 + 0.4 * cw} ${m2 + 20}, ${x2 + 0.66 * cw} ${m2 + 55}, ${x2 + 0.88 * cw} ${m2 + 30}`,
    });
    card(
      s,
      Object.assign(
        {
          t: 23.22,
          x: x3,
          y: y3,
          w: w3,
          h: h3,
          rot: -1,
          text: 'Solamente buscan<br>gente que sepa<br><b style="font-weight:700">hacer el trabajo</b>',
          size: L(44, 28, 40),
          num: "#3",
        },
        nd,
      ),
    );
    cutout(s, {
      src: "cuts/toolbox.png",
      t: 23.45,
      x: L(x3 + w3 - 140, x3 + 40, x3 + w3 - 150),
      y: y3 + h3 - L(140, 40, 120),
      w: L(230, 150, 210),
      z: 4,
      rot: 6,
    });
    const uy = y3 + h3 * L(0.835, 0.79, 0.79);
    stroke(s, {
      t: 25.18,
      dur: 0.35,
      z: 6,
      color: Y,
      w: L(10, 8, 9),
      d: `M ${x3 + 0.2 * w3} ${uy} C ${x3 + 0.36 * w3} ${uy + 18}, ${x3 + 0.55 * w3} ${uy + 10}, ${x3 + 0.82 * w3} ${uy - 5}`,
    });
  }

  // ═════════ J · 26.30–31.58 "… 0% de tasa de paro y una demanda que no para de crecer" ═════════
  shot(26.3, 1.0);
  pills(26.3, 27.5);
  shot(27.5, L(1.12, 1.0, 1.12));
  matte(27.5, 31.58);
  txt(
    behind,
    Object.assign(
      { t: 27.5, out: 29.24, text: "0%", color: Y, anim: "pop" },
      bigAt({ vy: 170, vs: 430, ss: 260, hs: 380, hy: 250 }),
    ),
  );
  cue(27.5, "hit", 0.6);
  line(
    front,
    Object.assign(
      { words: ws("de tasa de paro", 28.0), out: 29.24 },
      smallAt({ vy: 525, sy: 22, hy: 590 }),
    ),
  );
  shot(29.24, L(1.22, 1.06, 1.22));
  line(
    front,
    Object.assign(
      { words: ws("y una demanda que no para de", 29.2), out: 31.58 },
      smallAt({ vy: 160, vs: 54, sy: 22, hy: 250 }),
    ),
  );
  txt(
    behind,
    Object.assign(
      { t: 31.02, out: 31.58, text: "crecer", color: Y, anim: "pop" },
      bigAt({ vy: 220, vs: 300, ss: 210, hs: 220 }),
    ),
  );
  stroke(front, {
    t: 31.1,
    dur: 0.25,
    out: 31.58,
    color: Y,
    w: 12,
    d: L(
      "M 930 520 L 1010 260 M 1010 260 L 950 300 M 1010 260 L 1030 330",
      "M 900 300 L 960 100 M 960 100 L 915 135 M 960 100 L 978 155",
      "M 700 300 L 760 110 M 760 110 L 718 140 M 760 110 L 775 165",
    ),
  });

  // ═════════ K · 31.58–36.00 pills ═════════
  shot(31.58, 1.0);
  pills(31.58, 33.82);
  shot(33.82, 1.16);
  pills(33.82, 36.0);

  // ═════════ L · 36.00–43.16 office tear ═════════
  {
    const s = scene(36.0, 43.16, { color: "#cfcfcf", sfx: "paper" });
    full(s, `seed/tear_office${sfx}_last.png`);
    put("tear_office", s, 0);
    const cx = W / 2,
      G = "#303030";
    line(s, {
      words: ws("Lo único que necesitas", 35.9),
      size: L(56, 44, 48),
      x: cx,
      y: L(190, 90, 90),
      anchor: "c",
      color: G,
    });
    line(s, {
      words: ws("es tener la", 37.5),
      size: L(56, 44, 48),
      x: cx,
      y: L(252, 140, 142),
      anchor: "c",
      color: G,
    });
    txt(s, {
      t: 38.32,
      text: "certeza",
      size: L(250, 180, 200),
      x: cx,
      y: L(300, 175, 180),
      anchor: "c",
      color: INK,
      anim: "pop",
    });
    cue(38.32, "hit", 0.5);
    line(s, {
      words: ws("de que tu trabajo actual", 38.8),
      size: L(52, 40, 44),
      x: cx,
      y: L(530, 335, 355),
      anchor: "c",
      color: G,
    });
    line(s, {
      words: ws("no es donde quieres pasar", 40.3),
      size: L(52, 40, 44),
      x: cx,
      y: L(590, 382, 405),
      anchor: "c",
      color: G,
    });
    type(s, {
      x: cx,
      anchor: "c",
      y: L(655, 430, 455),
      size: L(70, 52, 58),
      lines: [[{ hl: "LOS PRÓXIMOS 10 AÑOS", at: 41.52 }]],
    });
    const K = L(0.78, 0.5, 0.55),
      FEET = L(1880, 1070, 1070),
      X0 = L(0, 540 - (1071 * 0.5) / 0.78 / 2, 960 - (1071 * 0.55) / 0.78 / 2);
    const P = [
      ["office_0", [16, 20, 343, 977], 0, [[200, 118]], "otro lunes"],
      [
        "office_1",
        [345, 16, 929, 992],
        215,
        [
          [495, 150],
          [745, 138],
        ],
        "mismo sueldo",
      ],
      ["office_2", [931, 94, 1165, 973], 640, [[1035, 160]], "sin crecer"],
      ["office_3", [1169, 44, 1529, 978], 790, [[1335, 118]], "¿10 años más?"],
    ];
    const bw = (92 * K) / 0.78,
      bh = (26 * K) / 0.78;
    P.forEach(([f, b, xv, eyes, lab], i) => {
      const x = X0 + (xv * K) / 0.78,
        w = (b[2] - b[0]) * K,
        h = (b[3] - b[1]) * K,
        y = FEET - h,
        t = 38.9 + i * 0.12;
      const g = el("div", "abs", s, {
        left: px(x),
        top: px(y),
        width: px(w),
        height: px(h),
        zIndex: 3 + (i % 2),
        transformOrigin: "50% 100%",
      });
      const im = el("img", "", g, {
        width: "100%",
        display: "block",
        filter: E.outlineF(Y, L(5, 3.5, 4)),
      });
      im.src = `cuts/${f}.png`;
      eyes.forEach(([ex, ey]) =>
        el("div", "abs", g, {
          left: px((ex - b[0]) * K - bw / 2),
          top: px((ey - b[1]) * K - bh / 2),
          width: px(bw),
          height: px(bh),
          background: Y,
        }),
      );
      tl.set(g, { autoAlpha: 0 }, 0);
      tl.set(g, { autoAlpha: 1 }, t);
      tl.fromTo(
        g,
        { y: -220, scale: 1.1 },
        { y: 0, scale: 1, duration: 0.34, ease: "bounce.out", immediateRender: false },
        t,
      );
      cue(t + 0.15, "hit", 0.35);
      txt(s, {
        t: 40.0 + i * 0.25,
        text: lab,
        x: x + w / 2,
        y: y - L(34, 26, 28),
        anchor: "c",
        cls: "lbl",
        size: 24,
        color: "#1a1a1a",
        css: { fontSize: L("24px", "18px", "20px"), zIndex: 6 },
      });
    });
  }

  // ═════════ M · 43.16–51.50 phone in hands (CTA) ═════════
  {
    const s = scene(43.16, 51.5, { bg: `gen/bg_paper${sfx}.png`, sfx: "whoosh" });
    const tw = (lines) =>
      type(
        s,
        Object.assign(
          L(
            { x: 540, anchor: "c", y: 250, size: 76 },
            { x: 540, anchor: "c", y: 80, size: 54 },
            { x: 140, y: 380, size: 78 },
          ),
          { cps: 30, color: "#222", lines },
        ),
      );
    const T = [
      [43.16, 45.06, [[{ t: "Para que veas", at: 43.16 }], [{ hl: "QUÉ PROFESIÓN ES", at: 44.1 }]]],
      [45.06, 46.12, [[{ t: "por qué es tan", at: 45.06 }], [{ hl: "DEMANDADA", at: 45.66 }]]],
      [
        46.12,
        48.36,
        [[{ t: "y cómo puedes acceder", at: 46.12 }], [{ hl: "PASO A PASO", at: 47.42 }]],
      ],
      [
        48.36,
        49.72,
        [[{ t: "te he grabado un", at: 48.36 }], [{ hl: "VÍDEO GRATUITO", at: 48.86 }]],
      ],
      [49.72, 51.5, [[{ t: "de tan solo", at: 49.72 }], [{ hl: "15 MINUTOS", at: 50.38 }]]],
    ];
    T.forEach(([a, b, l]) => {
      const e = tw(l);
      tl.set(e, { autoAlpha: 0 }, Math.min(b, 51.02));
    });
    stroke(s, {
      t: 50.6,
      dur: 0.25,
      out: 51.02,
      w: 4,
      color: "#222",
      d: L(
        "M 760 410 C 790 470, 770 520, 720 560 M 720 560 L 735 520 M 720 560 L 760 548",
        "M 780 164 C 820 194, 820 224, 790 254 M 790 254 L 792 224 M 790 254 L 820 244",
        "M 640 560 C 760 600, 860 600, 960 560 M 960 560 L 925 552 M 960 560 L 935 585",
      ),
    });
    // hands image (1080x1920 space, screen 295,314 488x1079): ph = hands scaled k from its bottom centre, placed with that point at (cx, H)
    const k = L(0.78, 0.5, 0.64),
      cx = L(540, 540, 1280);
    const scx = cx + (539 - 540) * k,
      scy = H + (853 - 1920) * k;
    const push = Math.max(W / (488 * k), H / (1079 * k)) * 1.06;
    const outer = el("div", "abs", s, {
      left: 0,
      top: 0,
      width: px(W),
      height: px(H),
      transformOrigin: `${scx}px ${scy}px`,
      zIndex: 3,
    });
    const ph = el("div", "abs", outer, {
      left: px(cx - 540),
      top: px(H - 1920),
      width: "1080px",
      height: "1920px",
      transformOrigin: "540px 1920px",
      transform: `scale(${k})`,
    });
    const scr = el("div", "abs", ph, {
      left: "295px",
      top: "314px",
      width: "488px",
      height: "1079px",
      background: "#fafafa",
      overflow: "hidden",
      borderRadius: "52px",
    });
    el(
      "div",
      "abs",
      scr,
      {
        left: 0,
        right: 0,
        top: "38%",
        textAlign: "center",
        fontSize: "64px",
        color: "#222",
        lineHeight: 1,
      },
      '<span class="hand">¿qué<br>profesión?</span>',
    );
    const pc = put("phone_cam", scr, 1);
    pc.style.objectFit = "cover";
    const hands = el("img", "abs", ph, {
      left: 0,
      top: 0,
      width: "1080px",
      height: "1920px",
      zIndex: 2,
    });
    hands.src = "cuts/hands_phone.png";
    tl.fromTo(
      outer,
      { y: L(900, 600, 600) },
      { y: 0, duration: 0.5, ease: "expo.out", immediateRender: false },
      43.16,
    );
    cutout(s, {
      src: "cuts/stopwatch.png",
      t: 50.38,
      out: 51.02,
      x: L(735, 790, 1530),
      y: L(760, 330, 300),
      w: L(250, 180, 220),
      z: 5,
      rot: 12,
      float: 10,
    });
    cutout(s, {
      src: "cuts/clapper.png",
      t: 48.86,
      out: 51.02,
      x: L(70, 90, 860),
      y: L(820, 420, 520),
      w: L(250, 180, 220),
      z: 5,
      rot: -12,
      float: 10,
    });
    tl.to(outer, { scale: L(3.4, push, 2.6), duration: 0.5, ease: "power3.in" }, 51.0);
    cue(50.95, "zoomin", 0.8);
  }

  // ═════════ N · 51.50–55.64 CTA camera ═════════
  shot(51.5, 1.0);
  pills(51.5, 52.64);
  matte(52.64, 53.34);
  txt(
    behind,
    Object.assign(
      { t: 52.64, out: 53.34, text: "aquí abajo", color: Y, anim: "pop" },
      bigAt({ vy: 240, vs: 175, ss: 140, hs: 150, sy: 40, hy: 300 }),
    ),
  );
  stroke(front, {
    t: 52.7,
    dur: 0.3,
    out: 55.64,
    color: Y,
    w: 12,
    lift: false,
    d: L(
      "M 900 1420 C 940 1560, 930 1680, 880 1800 M 880 1800 L 850 1730 M 880 1800 L 935 1745",
      "M 930 700 C 960 800, 955 900, 920 1000 M 920 1000 L 893 940 M 920 1000 L 965 955",
      "M 1660 640 C 1700 760, 1695 880, 1660 1000 M 1660 1000 L 1632 940 M 1660 1000 L 1705 955",
    ),
  });
  shot(53.34, 1.16);
  pills(53.34, 54.78);
  shot(54.78, 1.05);
  matte(54.78, 55.64);
  txt(
    behind,
    Object.assign(
      { t: 54.78, out: 55.64, text: "ahora mismo", color: Y, anim: "pop" },
      bigAt({ vy: 220, vs: 160, ss: 130, hs: 120, hx: 400, sy: 40, hy: 300 }),
    ),
  );
  cue(54.78, "hit", 0.6);

  buildShots();
})();
