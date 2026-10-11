/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// EU AD3 · Hook B + Body + CTA — papel/collage motion (ref IG DXG8nysjHqQ)
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

  // ═════════ A · 0–1.92  "No importa si llevas más de" ═════════
  cue(0, "whoosh", 0.7); // the opener
  shot(0, 1.0);
  matte(0, 6.3);
  txt(behind, {
    t: 0.04,
    out: 1.92,
    text: "No importa",
    size: 210,
    x: 540,
    y: 255,
    anchor: "c",
    color: Y,
    anim: "pop",
    sfx: "swoosh",
  });
  line(front, {
    words: ws("si llevas más de", 1.0),
    size: 62,
    x: 540,
    y: 470,
    anchor: "c",
    out: 1.92,
    cls: "hvs shadowed",
  });

  // ═════════ B · 1.92–3.44  "5 años en el mismo trabajo" ═════════
  shot(1.92, 1.14);
  txt(behind, {
    t: 1.92,
    out: 3.44,
    text: "5 años",
    size: 360,
    x: 540,
    y: 205,
    anchor: "c",
    color: Y,
    anim: "pop",
    sfx: "click",
  });
  line(front, {
    words: ws("en el mismo trabajo", 2.4),
    size: 64,
    x: 600,
    y: 505,
    anchor: "c",
    out: 3.44,
    cls: "hvs shadowed",
  });

  // ═════════ C · 3.44–6.30  "y piensas que es tarde para empezar desde cero" ═════════
  shot(3.44, 1.02);
  line(front, {
    words: ws("y piensas que es", 3.4),
    size: 62,
    x: 540,
    y: 175,
    anchor: "c",
    out: 6.3,
    cls: "hvs shadowed",
  });
  txt(behind, {
    t: 4.5,
    out: 5.62,
    text: "tarde",
    size: 380,
    x: 540,
    y: 240,
    anchor: "c",
    color: Y,
    anim: "pop",
    sfx: "swoosh",
  });
  stroke(behind, {
    t: 4.62,
    dur: 0.35,
    out: 5.62,
    color: "#fff",
    w: 5,
    d: "M 150 470 C 260 545, 840 540, 950 470 C 1010 425, 760 405, 560 415 C 400 425, 250 450, 290 480",
  });
  line(front, {
    words: ws("para empezar desde", 4.6),
    size: 62,
    x: 540,
    y: 600,
    anchor: "c",
    out: 6.3,
    cls: "hvs shadowed",
  });
  shot(5.62, 1.18);
  txt(behind, {
    t: 5.62,
    out: 6.3,
    text: "cero",
    size: 400,
    x: 540,
    y: 205,
    anchor: "c",
    color: Y,
    anim: "pop",
    sfx: "click",
  });

  // ═════════ D · 6.30–9.68  paper ball unfolds → boardwalk: "hoy puedes conseguir un trabajo en remoto y con salarios como estos" ═════════
  {
    const s = scene(6.3, 9.68, { color: "#cfcfcf", sfx: "paper" });
    el("img", "abs", s, { left: 0, top: 0, width: "1080px", height: "1920px" }).src =
      "seed/unfold_remote_last.png";
    put("unfold_remote", s, 0);
    cue(6.95, "whoosh", 0.9);
    line(s, {
      words: ws("hoy puedes conseguir", 6.3),
      size: 58,
      x: 540,
      y: 205,
      anchor: "c",
      color: "#303030",
    });
    line(s, {
      words: ws("un trabajo en", 7.1),
      size: 58,
      x: 540,
      y: 268,
      anchor: "c",
      color: "#303030",
    });
    txt(s, {
      t: 7.76,
      text: "remoto",
      size: 270,
      x: 540,
      y: 318,
      anchor: "c",
      color: INK,
      anim: "pop",
      sfx: "swoosh",
    });
    line(s, {
      words: ws("y con salarios como estos", 8.1),
      size: 54,
      x: 540,
      y: 560,
      anchor: "c",
      color: "#303030",
    });
    type(s, { x: 540, anchor: "c", y: 625, size: 92, lines: [[{ hl: "+3.000 €/MES", at: 9.34 }]] });
    cutout(s, {
      src: "cuts/remote.png",
      t: 7.62,
      x: 300,
      y: 1010,
      w: 480,
      outline: Y,
      ow: 6,
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
        css: { fontSize: "32px", background: "#fff", padding: "2px 8px" },
      });
    lb(7.9, "100% remoto", 150, 1000);
    lb(8.3, "tu horario", 780, 1060);
    cutout(s, {
      src: "cuts/euros.png",
      t: 9.34,
      x: 690,
      y: 1230,
      w: 300,
      rot: 12,
      anim: "pop",
      shadow: true,
    });
  }

  // ═════════ E · 9.68–11.56  clock: "en tan solo 12 meses" ═════════
  shot(9.68, 1.0);
  matte(9.68, 11.56);
  clock(behind, { t: 9.68, out: 11.56, x: 540, y: 560, r: 400 });
  line(front, {
    words: ws("en tan solo", 9.6),
    size: 60,
    x: 250,
    y: 1330,
    cls: "hvs shadowed",
    out: 11.56,
  });
  txt(front, {
    t: 10.5,
    out: 11.56,
    text: "12",
    size: 330,
    x: 530,
    y: 1180,
    color: Y,
    anim: "pop",
    sfx: "click",
    cls: "hvi",
  });
  txt(front, {
    t: 10.94,
    out: 11.56,
    text: "meses",
    size: 92,
    x: 560,
    y: 1450,
    cls: "hvi shadowed",
    anim: "rise",
  });

  // ═════════ F · 11.56–13.24 body: "Soy Bienvenido Sáez y llevo" ═════════
  shot(11.56, 1.0);
  pills(11.56, 13.24);

  // ═════════ G · 13.24–15.62  "más de 17 años formando a profesionales" (ref: pain / relief beside the head) ═════════
  shot(13.24, 1.3, { dx: 150 });
  matte(13.24, 15.62);
  line(front, {
    words: ws("más de", 13.2),
    size: 50,
    x: 50,
    y: 470,
    cls: "hvs shadowed",
    out: 14.4,
  });
  txt(behind, {
    t: 13.6,
    out: 14.4,
    text: "17<br>años",
    size: 190,
    x: 40,
    y: 530,
    color: Y,
    anim: "pop",
    sfx: "click",
  });
  shot(14.4, 1.3, { dx: -20 });
  line(front, {
    words: ws("formando a", 14.3),
    size: 54,
    x: 540,
    y: 150,
    anchor: "c",
    cls: "hvs shadowed",
    out: 15.62,
  });
  txt(behind, {
    t: 15.04,
    out: 15.62,
    text: "profesionales",
    size: 165,
    x: 540,
    y: 215,
    anchor: "c",
    color: Y,
    anim: "pop",
    sfx: "swoosh",
  });

  // ═════════ H · 15.62–18.82 pills ═════════
  shot(15.62, 1.0);
  pills(15.62, 18.82);
  shot(17.7, 1.15);

  // ═════════ I · 18.82–26.30 navy notepad scene ═════════
  {
    const s = scene(18.82, 26.3, { bg: "gen/bg_navy.png", sfx: "whoosh" });
    type(s, {
      x: 70,
      y: 280,
      size: 80,
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
      x: -170,
      y: 1040,
      w: 470,
      anim: "rise",
      z: 1,
      gray: true,
    });
    cutout(s, {
      src: "cuts/tower2.png",
      t: 19.35,
      x: 790,
      y: 960,
      w: 430,
      anim: "rise",
      z: 1,
      gray: true,
    });
    card(s, {
      t: 21.02,
      x: 110,
      y: 640,
      w: 390,
      h: 340,
      rot: -2,
      text: "¿Tu edad?",
      size: 52,
      num: "#1",
    });
    cutout(s, { src: "cuts/cake.png", t: 21.15, x: 380, y: 590, w: 170, z: 4, rot: 8 });
    stroke(s, {
      t: 21.4,
      dur: 0.25,
      z: 6,
      color: "#d11",
      w: 9,
      d: "M 165 815 C 260 790, 360 830, 450 800",
    });
    card(s, {
      t: 21.98,
      x: 580,
      y: 640,
      w: 390,
      h: 340,
      rot: 2,
      text: "¿Título<br>universitario?",
      size: 46,
      num: "#2",
    });
    cutout(s, { src: "cuts/gradcap.png", t: 22.12, x: 830, y: 575, w: 190, z: 4, rot: -10 });
    stroke(s, {
      t: 22.5,
      dur: 0.3,
      z: 6,
      color: "#d11",
      w: 9,
      d: "M 625 780 C 720 760, 840 800, 935 770 M 640 850 C 740 830, 850 865, 925 840",
    });
    card(s, {
      t: 23.22,
      x: 300,
      y: 1170,
      w: 480,
      h: 400,
      rot: -1,
      text: 'Solamente buscan<br>gente que sepa<br><b style="font-weight:700">hacer el trabajo</b>',
      size: 44,
      num: "#3",
    });
    cutout(s, { src: "cuts/toolbox.png", t: 23.45, x: 640, y: 1430, w: 230, z: 4, rot: 6 });
    stroke(s, {
      t: 25.18,
      dur: 0.35,
      z: 6,
      color: Y,
      w: 10,
      d: "M 395 1505 C 470 1525, 560 1515, 690 1500",
    });
  }

  // ═════════ J · 26.30–31.58 "Te hablo de un oficio con 0% de tasa de paro y una demanda que no para de crecer" ═════════
  shot(26.3, 1.0);
  pills(26.3, 27.5);
  shot(27.5, 1.12);
  matte(27.5, 31.58);
  txt(behind, {
    t: 27.5,
    out: 29.24,
    text: "0%",
    size: 430,
    x: 540,
    y: 170,
    anchor: "c",
    color: Y,
    anim: "pop",
    sfx: "click",
  });
  line(front, {
    words: ws("de tasa de paro", 28.0),
    size: 64,
    x: 540,
    y: 525,
    anchor: "c",
    out: 29.24,
    cls: "hvs shadowed",
  });
  shot(29.24, 1.22);
  line(front, {
    words: ws("y una demanda que no para de", 29.2),
    size: 54,
    x: 540,
    y: 160,
    anchor: "c",
    out: 31.58,
    cls: "hvs shadowed",
  });
  txt(behind, {
    t: 31.02,
    out: 31.58,
    text: "crecer",
    size: 300,
    x: 540,
    y: 220,
    anchor: "c",
    color: Y,
    anim: "pop",
    sfx: "swoosh",
  });
  stroke(front, {
    t: 31.1,
    dur: 0.25,
    out: 31.58,
    color: Y,
    w: 12,
    d: "M 930 520 L 1010 260 M 1010 260 L 950 300 M 1010 260 L 1030 330",
  });

  // ═════════ K · 31.58–36.00 pills ═════════
  shot(31.58, 1.0);
  pills(31.58, 33.82);
  shot(33.82, 1.16);
  pills(33.82, 36.0);

  // ═════════ L · 36.00–42.90 office tear: "Lo único que necesitas es tener la certeza de que tu trabajo actual no es donde quieres pasar los próximos 10 años" ═════════
  {
    const s = scene(36.0, 43.16, { color: "#cfcfcf", sfx: "paper" });
    el("img", "abs", s, { left: 0, top: 0, width: "1080px", height: "1920px" }).src =
      "seed/tear_office_last.png";
    put("tear_office", s, 0);
    line(s, {
      words: ws("Lo único que necesitas", 35.9),
      size: 56,
      x: 540,
      y: 190,
      anchor: "c",
      color: "#303030",
    });
    line(s, {
      words: ws("es tener la", 37.5),
      size: 56,
      x: 540,
      y: 252,
      anchor: "c",
      color: "#303030",
    });
    txt(s, {
      t: 38.32,
      text: "certeza",
      size: 250,
      x: 540,
      y: 300,
      anchor: "c",
      color: INK,
      anim: "pop",
      sfx: "swoosh",
    });
    line(s, {
      words: ws("de que tu trabajo actual", 38.8),
      size: 52,
      x: 540,
      y: 530,
      anchor: "c",
      color: "#303030",
    });
    line(s, {
      words: ws("no es donde quieres pasar", 40.3),
      size: 52,
      x: 540,
      y: 590,
      anchor: "c",
      color: "#303030",
    });
    type(s, {
      x: 540,
      anchor: "c",
      y: 655,
      size: 70,
      lines: [[{ hl: "LOS PRÓXIMOS 10 AÑOS", at: 41.52 }]],
    });
    // office workers, clustered like the ref's group; yellow outline + yellow bars over the eyes + tiny labels
    const K = 0.78,
      FEET = 1880;
    const P = [
      // file, raw bbox (x0,y0,x1,y1), x placement, eye(s) in raw px, label
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
    P.forEach(([f, b, x, eyes, lab], i) => {
      const w = (b[2] - b[0]) * K,
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
      const im = el("img", "", g, { width: "100%", display: "block", filter: E.outlineF(Y, 5) });
      im.src = `cuts/${f}.png`;
      eyes.forEach(([ex, ey]) =>
        el("div", "abs", g, {
          left: px((ex - b[0]) * K - 46),
          top: px((ey - b[1]) * K - 13),
          width: "92px",
          height: "26px",
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
      cue(t + 0.02, "pop", 0.7);
      txt(s, {
        t: 40.0 + i * 0.25,
        text: lab,
        x: x + w / 2,
        y: y - 34,
        anchor: "c",
        cls: "lbl",
        size: 24,
        color: "#1a1a1a",
        css: { fontSize: "24px", zIndex: 6 },
      });
    });
  }

  // ═════════ M · 43.16–51.50 phone in hands (CTA) ═════════
  {
    const s = scene(43.16, 51.5, { bg: "gen/bg_paper.png", sfx: "whoosh" });
    const tw = (lines) =>
      type(
        s,
        Object.assign({ x: 540, anchor: "c", y: 250, size: 76, cps: 30, color: "#222" }, { lines }),
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
      d: "M 760 410 C 790 470, 770 520, 720 560 M 720 560 L 735 520 M 720 560 L 760 548",
      w: 4,
      color: "#222",
    });
    // phone group: hands image (1080x1920 space, screen 295,314 488x1079) — inner scale .78 from the bottom, outer zoom into the screen
    const outer = el("div", "abs", s, {
      left: 0,
      top: 0,
      width: "1080px",
      height: "1920px",
      transformOrigin: "539px 1088px",
      zIndex: 3,
    });
    const ph = el("div", "abs", outer, {
      left: 0,
      top: 0,
      width: "1080px",
      height: "1920px",
      transformOrigin: "540px 1920px",
      transform: "scale(.78)",
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
      { y: 900 },
      { y: 0, duration: 0.5, ease: "expo.out", immediateRender: false },
      43.16,
    );
    cutout(s, {
      src: "cuts/stopwatch.png",
      t: 50.38,
      out: 51.02,
      x: 735,
      y: 760,
      w: 250,
      z: 5,
      rot: 12,
      float: 10,
    });
    cutout(s, {
      src: "cuts/clapper.png",
      t: 48.86,
      out: 51.02,
      x: 70,
      y: 820,
      w: 250,
      z: 5,
      rot: -12,
      float: 10,
    });
    // push into the screen (it already plays the camera) and cut back to camera
    tl.to(outer, { scale: 3.4, duration: 0.5, ease: "power3.in" }, 51.0);
    cue(50.95, "zoomin", 0.8); // the push into the phone
  }

  // ═════════ N · 51.50–55.64 CTA camera ═════════
  shot(51.5, 1.0);
  pills(51.5, 52.64);
  matte(52.64, 53.34);
  txt(behind, {
    t: 52.64,
    out: 53.34,
    text: "aquí abajo",
    size: 175,
    x: 540,
    y: 240,
    anchor: "c",
    color: Y,
    anim: "pop",
    sfx: "click",
  });
  stroke(front, {
    t: 52.7,
    dur: 0.3,
    out: 55.64,
    color: Y,
    w: 12,
    d: "M 900 1420 C 940 1560, 930 1680, 880 1800 M 880 1800 L 850 1730 M 880 1800 L 935 1745",
  });
  shot(53.34, 1.16);
  pills(53.34, 54.78);
  shot(54.78, 1.05);
  matte(54.78, 55.64);
  txt(behind, {
    t: 54.78,
    out: 55.64,
    text: "ahora mismo",
    size: 160,
    x: 540,
    y: 220,
    anchor: "c",
    color: Y,
    anim: "pop",
    sfx: "swoosh",
  });

  buildShots();
})();
