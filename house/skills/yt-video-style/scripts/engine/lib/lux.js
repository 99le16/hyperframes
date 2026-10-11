/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// lux.js — Gadzhi-look components. Everything is a pure function of scene time t (seconds): window.__seek(t).
// A scene file calls L.scene({dur, bg}) then adds components; times are scene-relative seconds.
(function () {
  const L = (window.L = {});
  const parts = [];
  L.W = 1920;
  L.H = 1080;
  L.FPS = 30;
  L.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  L.lerp = (a, b, u) => a + (b - a) * u;
  L.p = (t, a, b) => L.clamp((t - a) / (b - a));
  L.ease = {
    lin: (u) => u,
    outCubic: (u) => 1 - Math.pow(1 - u, 3),
    outQuint: (u) => 1 - Math.pow(1 - u, 5),
    outExpo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
    inCubic: (u) => u * u * u,
    inOutCubic: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    inOutSine: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
    outBack: (u, s = 1.6) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2),
  };
  // seeded noise for drift
  L.rnd = ((seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  })(12345);
  L.on = (fn) => parts.push(fn);
  L.sfxs = [];
  L.sfx = (name, t, db) => {
    if (t != null && isFinite(t)) L.sfxs.push([name, +t.toFixed(3), db]);
  };
  L.el = (tag, cls, parent, css, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) Object.assign(e.style, css);
    if (html != null) e.innerHTML = html;
    (parent || L.world).appendChild(e);
    return e;
  };
  // keyframe interpolation: keys = [[t, value], ...] (numbers or arrays), eased per segment
  L.kf = (keys, t, ease = L.ease.inOutCubic) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++)
      if (t <= keys[i][0]) {
        const [t0, a] = keys[i - 1],
          [t1, b] = keys[i],
          u = ease((t - t0) / (t1 - t0 || 1));
        return Array.isArray(a) ? a.map((v, j) => L.lerp(v, b[j], u)) : L.lerp(a, b, u);
      }
    return keys[keys.length - 1][1];
  };

  L.scene = ({ dur, bg = "none", meta = {} } = {}) => {
    L.id = new URLSearchParams(location.search).get("id");
    // Two accents (project.json): SUBTITLES (key words on camera / clips, typewriter highlights) keep `subtitle_color` (papel yellow by
    // default — the user rejected brand-coloured subtitles); text INSIDE brand motion-graphics scenes (ids starting with "X", or listed in
    // brand_text_ids / scenes/_green.js) uses the channel's `brand_gradient` from the brandbook.
    {
      const PR = window.PROJECT || {},
        G = PR.brand_gradient || ["#AED916", "#74CD2D", "#3AC043"],
        SUB = PR.subtitle_color || "#FAF400";
      const brandIds = (PR.brand_text_ids || []).concat(window.GREEN_IDS || []);
      const isBrand = /^X/.test(L.id) || brandIds.includes(L.id),
        r = document.documentElement.style;
      L.G = G;
      L.GB = `linear-gradient(120deg,${G[0]} 0%,${G[1] || G[0]} 50%,${G[2] || G[1] || G[0]} 100%)`;
      if (isBrand) {
        L.Y = G[0];
        L.GRAD = L.GB;
      } else {
        L.Y = SUB;
        L.GRAD = `linear-gradient(120deg,${SUB} 0%,${SUB} 100%)`;
      }
      r.setProperty("--y", L.Y);
      r.setProperty("--grad", L.GRAD);
      r.setProperty("--g1", G[0]);
      r.setProperty("--g2", G[1] || G[0]);
      r.setProperty("--g3", G[2] || G[1] || G[0]);
    }
    if (dur == null) dur = window.SLOTS[L.id].dur;
    L.dur = dur;
    L.meta = meta;
    L.stage = document.getElementById("stage");
    if (bg === "aurora") L.bg = L.aurora();
    else if (bg && bg !== "none") L.el("div", "abs", L.stage, { inset: 0, background: bg });
    L.behind = L.el("div", "", L.stage);
    L.behind.id = "behind";
    L.world = L.el("div", "", L.stage);
    L.world.id = "world";
    const lay = new URLSearchParams(location.search).get("layer");
    if (lay) document.body.classList.add("layer-" + lay);
  };
  // camera move on the whole world: keys [[t, [scale, x, y, rotY, rotX]]]
  L.camera = (keys, ease) => {
    L.stage.style.perspective = "2200px";
    L.on((t) => {
      const [s, x, y, ry = 0, rx = 0] = L.kf(keys, t, ease);
      L.world._cam = `translate(${x}px,${y}px) scale(${s}) rotateY(${ry}deg) rotateX(${rx}deg)`;
      L.world.style.transform = L.world._cam;
    });
  };

  // ---------- aurora background (near-black + drifting blue/violet blobs) ----------
  L.aurora = (blobs) => {
    const a = L.el("div", "aur", L.stage);
    blobs = blobs || [
      { x: -260, y: -200, r: 760, c: "#1748ff", o: 0.85, sx: 30, sy: 20, ph: 0 },
      { x: -200, y: 620, r: 620, c: "#3a1cff", o: 0.55, sx: 25, sy: 30, ph: 1.7 },
      { x: 1500, y: 700, r: 720, c: "#5b22ff", o: 0.75, sx: 35, sy: 25, ph: 3.1 },
      { x: 1640, y: -300, r: 560, c: "#1d3cff", o: 0.45, sx: 20, sy: 25, ph: 4.4 },
    ];
    const els = blobs.map((b) =>
      L.el("div", "blob", a, {
        left: b.x + "px",
        top: b.y + "px",
        width: b.r + "px",
        height: b.r + "px",
        background: `radial-gradient(circle, ${b.c} 0%, ${b.c}cc 30%, transparent 70%)`,
        opacity: b.o,
      }),
    );
    L.on((t) =>
      els.forEach((e, i) => {
        const b = blobs[i];
        e.style.transform = `translate(${Math.sin(t * 0.35 + b.ph) * b.sx}px,${Math.cos(t * 0.28 + b.ph) * b.sy}px) scale(${1 + 0.05 * Math.sin(t * 0.3 + b.ph)})`;
      }),
    );
    return a;
  };

  // ---------- sparkle ✦ ----------
  let spkN = 0;
  L.sparkleSVG = (size = 46, c1 = "#7fb2ff", c2 = "#7a4dff") => {
    const id = "sg" + spkN++;
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <path d="M50 0 C54 32 68 46 100 50 C68 54 54 68 50 100 C46 68 32 54 0 50 C32 46 46 32 50 0Z" fill="url(#${id})"/></svg>`;
  };

  // ---------- typed text ----------
  // returns {el, end}: chars appear at cps; each char fades in over 50 ms
  L.typed = (
    parent,
    text,
    t0,
    { cps = 24, size = 64, weight = 700, color, cls = "tx", css = {} } = {},
  ) => {
    const el = L.el(
      "div",
      cls,
      parent,
      Object.assign({ fontSize: size + "px", fontWeight: weight }, color ? { color } : {}, css),
    );
    const chs = [...text].map((c) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = c;
      el.appendChild(s);
      return s;
    });
    L.on((t) =>
      chs.forEach((s, i) => {
        s.style.opacity = L.p(t, t0 + i / cps, t0 + i / cps + 0.05);
      }),
    );
    return { el, end: t0 + chs.length / cps };
  };

  // ---------- fade/blur in-out envelope for any element ----------
  // enter at t0 (dur din), leave at t1 (dur dout). style: 'blur' (default) | 'rise' | 'pop'
  L.env = (el, t0, t1, { din = 0.45, dout = 0.35, style = "blur", dy = 24, base = "" } = {}) => {
    L.on((t) => {
      const a = L.ease.outCubic(L.p(t, t0, t0 + din)),
        b = t1 == null ? 0 : L.ease.inCubic(L.p(t, t1 - dout, t1));
      const o = a * (1 - b),
        bl = (1 - a) * 14 + b * 14;
      let tr = base;
      if (style === "rise") tr += ` translateY(${(1 - a) * dy - b * dy * 0.5}px)`;
      if (style === "pop")
        tr += ` scale(${L.lerp(0.7, 1, L.ease.outBack(L.p(t, t0, t0 + din))) * (1 - 0.1 * b)})`;
      el.style.opacity = o;
      el.style.filter = bl > 0.05 ? `blur(${bl}px)` : "none";
      el.style.transform = tr;
    });
  };

  // ---------- bullets: [{t, text}] stacked, sparkle + typed white text ----------
  L.bullets = ({
    x = 150,
    y = 150,
    size = 64,
    gap,
    items,
    out,
    spark = true,
    cps = 24,
    align = "left",
    lh,
  } = {}) => {
    const box = L.el("div", "abs", L.world, { left: x + "px", top: y + "px" });
    gap = gap || size * 1.32;
    let yy = 0;
    const rows = [];
    items.forEach((it) => {
      const row = L.el("div", "row", box, { top: yy + "px", left: 0, gap: size * 0.32 + "px" });
      if (align === "right")
        Object.assign(row.style, { left: "auto", right: 0, flexDirection: "row-reverse" });
      let sp = null;
      if (spark && it.spark !== false) {
        sp = L.el(
          "div",
          "spk",
          row,
          { width: size * 0.62 + "px", height: size * 0.62 + "px" },
          L.sparkleSVG(size * 0.62),
        );
        L.on((t) => {
          const u = L.p(t, it.t - 0.15, it.t + 0.2);
          sp.style.opacity = u;
          sp.style.transform = `scale(${L.ease.outBack(u)}) rotate(${(1 - u) * -90}deg)`;
        });
      } else if (!spark || it.spark === false)
        L.el("div", "", row, { width: (spark ? size * 0.62 : 0) + "px" });
      L.sfx("tick", it.t - 0.12);
      const tp = L.typed(row, it.text, it.t, { cps: it.cps || cps, size: it.size || size });
      rows.push({ row, tp });
      yy += (it.size || size) * ((it.lines || 1) * 1.08) + (gap - size);
    });
    if (out != null) L.env(box, -1, out, { din: 0.01, dout: 0.35 });
    return { box, rows, height: yy };
  };

  // ---------- neon script lines written on left→right ----------
  L.script = ({ x, y, size = 80, lines, out, gap, rot = -2, spc = 0.055 } = {}) => {
    const box = L.el("div", "abs", L.world, {
      left: x + "px",
      top: y + "px",
      transform: `rotate(${rot}deg)`,
    });
    gap = gap || size * 0.95;
    lines.forEach((ln, i) => {
      const e = L.el(
        "div",
        "scr abs",
        box,
        { left: (ln.dx || 0) + "px", top: i * gap + "px", fontSize: (ln.size || size) + "px" },
        ln.text,
      );
      const d = ln.dur || Math.max(0.35, ln.text.length * spc);
      L.sfx("scribble", ln.t);
      L.on((t) => {
        const u = L.ease.inOutSine(L.p(t, ln.t, ln.t + d));
        e.style.clipPath = `inset(-40% ${(1 - u) * 100}% -60% -10%)`;
        e.style.opacity = u > 0 ? 1 : 0;
      });
    });
    if (out != null) L.env(box, -1, out, { din: 0.01, dout: 0.35, base: `rotate(${rot}deg)` });
    return box;
  };

  // ---------- glossy 3D tile (PNG with alpha) popping in, floating, blurring out ----------
  L.tile = ({
    src,
    x,
    y,
    size = 330,
    t,
    out,
    label,
    labelSize = 70,
    from = 0,
    tilt = 8,
    ph = 0,
  } = {}) => {
    const w = L.el("div", "abs", L.world, { left: x + "px", top: y + "px", width: size + "px" });
    L.sfx("pop", t);
    const im = L.el("img", "", w, {
      width: size + "px",
      height: size + "px",
      display: "block",
      objectFit: "contain",
      filter: "drop-shadow(0 26px 40px rgba(0,0,0,.45))",
    });
    im.src = src;
    L.on((t2) => {
      const u = L.p(t2, t, t + 0.5),
        a = L.ease.outBack(u, 1.4),
        b = out == null ? 0 : L.ease.inCubic(L.p(t2, out - 0.35, out));
      const fl = Math.sin((t2 - t) * 1.5 + ph) * 7,
        rr = Math.sin((t2 - t) * 1.1 + ph) * 2.5;
      const bl = (1 - L.ease.outCubic(u)) * 22 + b * 20;
      w.style.opacity = L.ease.outCubic(u) * (1 - b);
      w.style.filter = bl > 0.05 ? `blur(${bl}px)` : "none";
      w.style.transform = `translate(${(1 - L.ease.outCubic(u)) * from}px,${fl + (1 - a) * 40}px) scale(${L.lerp(0.6, 1, a) * (1 - 0.12 * b)}) perspective(900px) rotateY(${tilt * Math.sin((t2 - t) * 0.8 + ph)}deg) rotate(${rr}deg)`;
    });
    if (label)
      L.script({
        x: x + size * 0.12,
        y: y + size + 8,
        size: labelSize,
        lines: [{ t: t + 0.35, text: label }],
        out,
        rot: -3,
      });
    return w;
  };

  // ---------- glass card ----------
  const GLOW = {
    green: ["#19c45a", "#0b5c2a"],
    cyan: ["#21b6ff", "#0b4f7a"],
    violet: ["#8a3cff", "#3f1a8c"],
    blue: ["#2b6bff", "#122f7a"],
    red: ["#ff3b5c", "#7a1022"],
    gold: ["#ffb02b", "#7a4a0b"],
    none: ["transparent", "transparent"],
  };
  L.GLOW = GLOW;
  L.card = ({
    x,
    y,
    w,
    h,
    color = "green",
    glow = "br",
    t,
    out,
    html = "",
    css = {},
    style = "rise",
    strength = 1,
  } = {}) => {
    const c = L.el(
      "div",
      "card",
      L.world,
      Object.assign({ left: x + "px", top: y + "px", width: w + "px", height: h + "px" }, css),
    );
    const [g1] = GLOW[color] || GLOW.green;
    const pos =
      { br: "100% 100%", bl: "0% 100%", tr: "100% 0%", b: "50% 120%", r: "120% 50%" }[glow] || glow;
    L.el("div", "glow", c, {
      background: `radial-gradient(ellipse 90% 110% at ${pos}, ${g1} 0%, ${g1}88 30%, transparent 70%)`,
      opacity: strength,
    });
    const ct = L.el("div", "ct", c, {}, html);
    if (t != null) {
      L.env(c, t, out, { style, din: 0.55 });
      L.sfx("card", t);
    }
    c.ct = ct;
    return c;
  };

  // ---------- glowing liquid capsule ----------
  let tubeN = 0;
  L.tube = ({ x, y, w = 130, h = 330, color = "green", level = () => 0.5, t, out } = {}) => {
    const id = "tb" + tubeN++,
      col =
        { green: "#22e36a", cyan: "#2cc8ff", violet: "#9b35ff", red: "#ff3b5c", gold: "#ffc23a" }[
          color
        ] || color;
    const e = L.el("div", "abs", L.world, {
      left: x + "px",
      top: y + "px",
      width: w + "px",
      height: h + "px",
    });
    const r = w / 2;
    e.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible;filter:drop-shadow(0 0 18px ${col}cc) drop-shadow(0 0 40px ${col}66)">
  <defs><clipPath id="${id}c"><rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="${r - 6}"/></clipPath>
  <linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="${col}" stop-opacity=".75"/><stop offset=".45" stop-color="${col}"/><stop offset="1" stop-color="${col}" stop-opacity=".7"/></linearGradient>
  <linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".18" stop-color="#fff" stop-opacity=".35"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
  <rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="${r - 3}" fill="rgba(255,255,255,.04)"/>
  <g clip-path="url(#${id}c)"><path class="liq" fill="url(#${id}g)"/><path class="liq2" fill="#fff" opacity=".18"/></g>
  <rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="${r - 3}" fill="url(#${id}s)"/>
  <rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="${r - 3}" fill="none" stroke="rgba(255,255,255,.88)" stroke-width="4"/></svg>`;
    const liq = e.querySelector(".liq"),
      liq2 = e.querySelector(".liq2");
    L.on((tt) => {
      const lv = L.clamp(level(tt)),
        top = 6 + (h - 12) * (1 - lv);
      const wav = (ph, amp) => {
        let d = `M0 ${h}`;
        for (let i = 0; i <= 20; i++) {
          const xx = (i / 20) * w;
          d += ` L${xx} ${top + Math.sin((i / 20) * 6.28 + tt * 3 + ph) * amp}`;
        }
        return d + ` L${w} ${h} Z`;
      };
      liq.setAttribute("d", wav(0, 6));
      liq2.setAttribute(
        "d",
        wav(1.7, 4).replace(`L${w} ${h} Z`, `L${w} ${top + 10} L0 ${top + 10} Z`),
      );
    });
    if (t != null) L.env(e, t, out, { style: "rise", din: 0.6 });
    return e;
  };

  // ---------- number counter ----------
  L.fmt = (v, dec = 0) =>
    v.toLocaleString("es-ES", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
      useGrouping: "always",
    });
  L.counter = (el, { t0, t1, from = 0, to, dec = 0, pre = "", suf = "" }) => {
    L.on((t) => {
      const u = L.ease.outExpo(L.p(t, t0, t1));
      el.textContent = pre + L.fmt(L.lerp(from, to, u), dec) + suf;
    });
  };

  // ---------- window with mock UI + PiP hole (compose pastes the camera into meta.pip) ----------
  L.window = ({ x = 38, y = 131, w = 1394, h = 817, t, out, html = "", bg = "#fff" } = {}) => {
    const e = L.el(
      "div",
      "win",
      L.world,
      { left: x + "px", top: y + "px", width: w + "px", height: h + "px", background: bg },
      html,
    );
    if (t != null) L.env(e, t, out, { style: "rise", din: 0.5 });
    return e;
  };

  // ---------- PiP layout: aurora with a rounded hole where compose pastes the camera (PIP rect, same as compose.py) ----------
  L.PIP = [1469, 131, 1882, 948];
  L.pipHole = () => {
    const [x0, y0, x1, y1] = L.PIP,
      r = 16;
    const rr = `M${x0 + r} ${y0} H${x1 - r} A${r} ${r} 0 0 1 ${x1} ${y0 + r} V${y1 - r} A${r} ${r} 0 0 1 ${x1 - r} ${y1} H${x0 + r} A${r} ${r} 0 0 1 ${x0} ${y1 - r} V${y0 + r} A${r} ${r} 0 0 1 ${x0 + r} ${y0} Z`;
    const cp = `path(evenodd, 'M0 0 H1920 V1080 H0 Z ${rr}')`;
    if (L.bg) L.bg.style.clipPath = cp;
    L.stage.style.clipPath = cp;
  };

  // ---------- candlestick chart window (dark trading platform, generic — no brand) ----------
  // returns {svg, X(i), Y(price), c: candles[], g: overlay group}; candles reveal left→right from t over `grow` s
  L.svgNS = "http://www.w3.org/2000/svg";
  L.sv = (tag, attrs, parent) => {
    const e = document.createElementNS(L.svgNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  L.walk = (n, seed = 7, start = 100, vol = 1.2, drift = 0) => {
    let s = seed,
      r = () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
    const c = [];
    let p = start;
    for (let i = 0; i < n; i++) {
      const o = p,
        cl = o + (r() - 0.5) * vol * 2 + drift;
      const hi = Math.max(o, cl) + r() * vol * 0.8,
        lo = Math.min(o, cl) - r() * vol * 0.8;
      c.push({ o, c: cl, h: hi, l: lo });
      p = cl;
    }
    return c;
  };
  L.chartWin = ({
    x = 38,
    y = 131,
    w = 1394,
    h = 817,
    t = 0,
    out,
    candles,
    title = "EUR/USD · 1H",
    grow = 1.2,
    price = true,
  } = {}) => {
    const win = L.window({ x, y, w, h, t, out, bg: "#0d1018" });
    win.style.color = "#cfd6e4";
    const top = L.el(
      "div",
      "",
      win,
      {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: "54px",
        borderBottom: "1px solid #1d2230",
        display: "flex",
        alignItems: "center",
        gap: "18px",
        padding: "0 22px",
        fontSize: "20px",
        fontFamily: "Satoshi",
        fontWeight: 700,
      },
      `<span style="display:flex;gap:8px"><i style="width:12px;height:12px;border-radius:6px;background:#ff5f57;display:block"></i><i style="width:12px;height:12px;border-radius:6px;background:#febc2e;display:block"></i><i style="width:12px;height:12px;border-radius:6px;background:#28c840;display:block"></i></span>
     <span style="margin-left:14px">${title}</span><span style="color:#6b7489;font-weight:500">Velas · Indicadores · Alertas</span>`,
    );
    const pw = w - 110,
      ph = h - 54 - 40;
    const svg = L.sv(
      "svg",
      { width: w, height: h - 54, style: "position:absolute;left:0;top:54px;overflow:visible" },
      win,
    );
    const lo = Math.min(...candles.map((c) => c.l)),
      hi = Math.max(...candles.map((c) => c.h)),
      pad = (hi - lo) * 0.12;
    const X = (i) => 30 + ((i + 0.5) * pw) / candles.length,
      Y = (v) => 20 + (1 - (v - lo + pad) / (hi - lo + 2 * pad)) * ph;
    for (let i = 0; i <= 6; i++)
      L.sv(
        "line",
        {
          x1: 0,
          x2: w,
          y1: 20 + (i * ph) / 6,
          y2: 20 + (i * ph) / 6,
          stroke: "#171c28",
          "stroke-width": 1,
        },
        svg,
      );
    for (let i = 0; i <= 6; i++) {
      const v = hi + pad - (i * (hi - lo + 2 * pad)) / 6;
      const tx = L.sv(
        "text",
        {
          x: w - 70,
          y: 20 + (i * ph) / 6 + 6,
          fill: "#566078",
          "font-size": 16,
          "font-family": "Satoshi",
        },
        svg,
      );
      tx.textContent = v.toFixed(2);
    }
    const cw = (pw / candles.length) * 0.62,
      els = candles.map((c, i) => {
        const up = c.c >= c.o,
          col = up ? "#22c58b" : "#ff4d5e",
          g = L.sv("g", {}, svg);
        L.sv(
          "line",
          { x1: X(i), x2: X(i), y1: Y(c.h), y2: Y(c.l), stroke: col, "stroke-width": 2 },
          g,
        );
        L.sv(
          "rect",
          {
            x: X(i) - cw / 2,
            y: Y(Math.max(c.o, c.c)),
            width: cw,
            height: Math.max(2, Math.abs(Y(c.o) - Y(c.c))),
            fill: col,
            rx: 1.5,
          },
          g,
        );
        return g;
      });
    let pl, pt;
    if (price) {
      pl = L.sv(
        "line",
        { x1: 0, x2: pw + 30, stroke: "#3d7bff", "stroke-width": 1.5, "stroke-dasharray": "6 6" },
        svg,
      );
      pt = L.sv("rect", { x: w - 82, width: 74, height: 26, rx: 4, fill: "#3d7bff" }, svg);
    }
    const g = L.sv("g", {}, svg);
    L.on((tt) => {
      const n = Math.floor(L.clamp((tt - t) / grow) * candles.length);
      els.forEach((e, i) => (e.style.opacity = i < n ? 1 : 0));
      if (pl) {
        const cl = candles[Math.max(0, n - 1)].c;
        pl.setAttribute("y1", Y(cl));
        pl.setAttribute("y2", Y(cl));
        pt.setAttribute("y", Y(cl) - 13);
      }
    });
    return { win, svg, X, Y, c: candles, g, cw };
  };
  // draw-on polyline in an svg group
  L.drawLine = (g, pts, t, dur = 0.8, { color = "#fff", width = 4, glow = true, dash } = {}) => {
    const d = "M" + pts.map((p) => p.join(" ")).join(" L");
    const e = L.sv(
      "path",
      {
        d,
        fill: "none",
        stroke: color,
        "stroke-width": width,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        style: glow ? `filter:drop-shadow(0 0 8px ${color})` : "",
      },
      g,
    );
    const len = pts.reduce(
      (a, p, i) => (i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0),
      0,
    );
    if (dash) e.setAttribute("stroke-dasharray", dash);
    L.on((tt) => {
      const u = L.ease.inOutCubic(L.p(tt, t, t + dur));
      if (!dash) {
        e.setAttribute("stroke-dasharray", `${len} ${len}`);
        e.setAttribute("stroke-dashoffset", (1 - u) * len);
      } else e.style.opacity = u;
    });
    return e;
  };
  // pill label (HTML) positioned over the stage
  L.pill = ({ x, y, text, color = "#3d7bff", t, out, size = 26, fg = "#fff" } = {}) => {
    const e = L.el(
      "div",
      "abs",
      L.world,
      {
        left: x + "px",
        top: y + "px",
        background: color,
        color: fg,
        fontWeight: 700,
        fontSize: size + "px",
        padding: `${size * 0.3}px ${size * 0.6}px`,
        borderRadius: size * 0.5 + "px",
        boxShadow: `0 0 24px ${color}88`,
        whiteSpace: "nowrap",
      },
      text,
    );
    L.env(e, t, out, { style: "pop", din: 0.35 });
    L.sfx("pop", t);
    return e;
  };

  // ---------- "otro vídeo" card (YouTube-style suggestion), channel Conquer Finance ----------
  L.videoCard = ({ x = 1290, y = 90, w = 560, title, t, out, thumb, dur = "12:04" } = {}) => {
    const h = (w * 9) / 16;
    const c = L.el("div", "abs", L.world, { left: x + "px", top: y + "px", width: w + "px" });
    const th = L.el("div", "", c, {
      position: "relative",
      width: w + "px",
      height: h + "px",
      borderRadius: "18px",
      overflow: "hidden",
      background: thumb
        ? `url(${thumb}) center/cover`
        : "linear-gradient(135deg,#0b1030,#2a1170 55%,#1748ff)",
      boxShadow: "0 30px 70px rgba(0,0,0,.55), 0 0 0 1.5px rgba(255,255,255,.15)",
    });
    if (!thumb)
      L.el(
        "div",
        "tx",
        th,
        {
          position: "absolute",
          left: "28px",
          top: "26px",
          right: "28px",
          fontSize: w * 0.085 + "px",
          whiteSpace: "normal",
          lineHeight: 1.05,
        },
        title,
      );
    L.el(
      "div",
      "",
      th,
      {
        position: "absolute",
        left: "50%",
        top: "58%",
        width: "86px",
        height: "60px",
        marginLeft: "-43px",
        marginTop: "-30px",
        background: "#ff1f1f",
        borderRadius: "16px",
        boxShadow: "0 6px 24px rgba(255,0,0,.5)",
      },
      '<svg width="86" height="60"><path d="M35 18 L56 30 L35 42Z" fill="#fff"/></svg>',
    );
    L.el(
      "div",
      "",
      th,
      {
        position: "absolute",
        right: "12px",
        bottom: "12px",
        background: "rgba(0,0,0,.8)",
        borderRadius: "6px",
        padding: "3px 8px",
        fontSize: "20px",
        fontWeight: 700,
      },
      dur,
    );
    L.el("div", "tx", c, { fontSize: "30px", marginTop: "16px", whiteSpace: "normal" }, title);
    L.el(
      "div",
      "",
      c,
      {
        fontSize: "22px",
        color: "rgba(255,255,255,.7)",
        marginTop: "6px",
        fontWeight: 500,
        textShadow: "0 2px 8px rgba(0,0,0,.6)",
      },
      "Conquer Finance · Vídeo",
    );
    L.env(c, t, out, { style: "pop", din: 0.5 });
    L.sfx("pop", t);
    return c;
  };

  // ---------- check row (glass) ----------
  L.checkRow = ({ x, y, w = 900, text, t, out, color = "green", size = 46 } = {}) => {
    const c = L.card({ x, y, w, h: size * 2.3, color, glow: "l", t, out, strength: 0.6 });
    const col = { green: "#22e36a", cyan: "#2cc8ff", violet: "#9b35ff" }[color] || color;
    const ck = L.el(
      "div",
      "",
      c,
      {
        position: "absolute",
        left: size * 0.55 + "px",
        top: "50%",
        marginTop: -size * 0.55 + "px",
        width: size * 1.1 + "px",
        height: size * 1.1 + "px",
        borderRadius: "50%",
        background: col,
        boxShadow: `0 0 22px ${col}`,
      },
      `<svg width="${size * 1.1}" height="${size * 1.1}" viewBox="0 0 40 40"><path d="M11 21 L18 28 L30 13" fill="none" stroke="#04110a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    );
    L.on((tt) => {
      const u = L.ease.outBack(L.p(tt, t + 0.25, t + 0.6));
      ck.style.transform = `scale(${u})`;
    });
    L.typed(c, text, t + 0.35, {
      size,
      css: {
        position: "absolute",
        left: size * 2.1 + "px",
        top: "50%",
        transform: "translateY(-50%)",
      },
    });
    return c;
  };

  // ---------- words helper: time (scene-relative) of the n-th occurrence of a word in this slot ----------
  L.at = (word, n = 1, fallback) => {
    const norm = (s) =>
      s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    const ws = ((window.SLOTS && window.SLOTS[L.id]) || {}).words || [];
    let k = 0;
    for (const [w, s] of ws) if (norm(w) === norm(word) && ++k === n) return s;
    if (fallback != null) return fallback;
    throw new Error(`L.at: '${word}' #${n} not in slot ${L.id}`);
  };

  // ===================== v9 papel typography =====================
  L.Y = "#AED916";
  L.G = ["#AED916", "#74CD2D", "#3AC043"];
  L.GRAD = "linear-gradient(120deg,#AED916 0%,#74CD2D 50%,#3AC043 100%)";
  const _slot = () => (window.SLOTS && window.SLOTS[L.id]) || {};
  // head box of the camera shot active at scene time t (from plan9 shots): {cx, top, w, chin}
  L.head = (t) => {
    const sh = _slot().shots || [];
    let h = sh.length ? sh[0].head : { cx: 960, top: 140, w: 400, chin: 560 };
    for (const s of sh) if (s.t <= t + 1e-3) h = s.head;
    return h;
  };
  L.shotStart = (t) => {
    const sh = _slot().shots || [];
    let a = 0;
    for (const s of sh) if (s.t <= t + 1e-3) a = s.t;
    return a;
  };
  L.shotEnd = (t) => {
    const sh = _slot().shots || [];
    for (const s of sh) if (s.t > t + 1e-3) return s.t;
    return L.dur;
  };
  // measured fit: shrink an element so its width stays ≤ maxW (measured lazily, after fonts load)
  const _fit = (e, maxW) => {
    if (e._fs == null) {
      const w = e.scrollWidth || e.offsetWidth;
      e._fs = w > maxW ? maxW / w : 1;
    }
    return e._fs;
  };
  // giant yellow word BEHIND the head (compose puts the person matte on top). anim: pop | rise | slam
  L.FEW = () => ["ov", "stock", "meme", "av"].includes(_slot().kind); // v10: on camera / clips only the key words
  L._dummy = () => {
    const e = document.createElement("div");
    e.side = "l";
    e.X = 0;
    e.Y = 0;
    return e;
  };
  L.big = ({
    text,
    t,
    out,
    size = 290,
    keep,
    side = "auto",
    tuck = 45,
    dy = 0,
    x,
    y,
    color = L.Y,
    anim = "pop",
    behind = true,
    sfx = "click",
    cls = "hv",
    maxW,
    line,
    lineSize = 58,
    below,
  } = {}) => {
    if (L.FEW() && !keep && sfx !== "click") return L._dummy();
    // the camera has no headroom → the word sits BESIDE the head, its inner edge tucked behind it (v6 bigwords recipe)
    if (out == null && L.shotEnd(t) - t < 0.45 && L.shotEnd(t) < L.dur - 0.5)
      t = L.shotEnd(t) + 0.02; // would flash before a cut → next shot
    out = out == null ? Math.min(L.shotEnd(t), L.dur) : out;
    const t0shot = L.shotStart(t);
    const h = L.head(t),
      par = behind ? L.behind : L.world;
    const hl = h.cx - h.w / 2,
      hr = h.cx + h.w / 2;
    if (side === "auto") side = h.cx > 1060 ? "l" : h.cx < 860 ? "r" : hl > 1920 - hr ? "l" : "r";
    const X = x != null ? x : side === "l" ? hl + tuck : hr - tuck,
      room = side === "l" ? X - 70 : 1850 - X;
    const Y = y != null ? y : h.top + (h.chin - h.top) * 0.42 + dy;
    const e = L.el(
      "div",
      cls + " abs" + (color === L.Y ? " gradtxt" : ""),
      par,
      { fontSize: size + "px", color, left: 0, top: 0, paddingBottom: ".08em" },
      text,
    );
    const sh = text.length > 0 ? L.el("div", "", e, {}) : null;
    L.sfx(sfx, t);
    L.on((tt) => {
      const k = _fit(e, maxW || room),
        u = L.p(tt, t, t + 0.18),
        b = L.ease.inCubic(L.p(tt, out - 0.14, out));
      const sc =
        (anim === "slam"
          ? L.lerp(1.6, 1, L.ease.outCubic(u))
          : anim === "rise"
            ? 1
            : L.lerp(0.86, 1, L.ease.outBack(u, 1.8))) *
        (1 - 0.08 * b);
      const ty = anim === "rise" ? (1 - L.ease.outCubic(u)) * 120 : 0;
      e.style.opacity = (u > 0 ? 1 : 0) * (1 - b);
      const bl = (1 - u) * 6 + b * 6;
      e.style.filter = bl > 0.05 ? `blur(${bl}px)` : "none";
      e.style.transformOrigin = side === "l" ? "100% 50%" : "0 50%";
      e.style.transform = `translate(${X}px,${Y + ty}px) translate(${side === "l" ? -100 : 0}%,-50%) scale(${sc * k})`;
    });
    if (line && line.length) {
      // small white line built word by word, aligned to the big word's outer edge
      const ln = L.el("div", "hvs shadowed abs", L.world, {
        fontSize: lineSize + "px",
        color: "#fff",
        left: 0,
        top: 0,
      });
      const sp = line.map(([w]) => {
        const q = document.createElement("span");
        q.textContent = w + " ";
        q.style.opacity = 0;
        ln.appendChild(q);
        return q;
      });
      L.on((tt) => {
        const k = _fit(e, maxW || room),
          wd = e.scrollWidth * k,
          b = L.ease.inCubic(L.p(tt, out - 0.14, out));
        sp.forEach((q, i) => (q.style.opacity = tt >= Math.max(line[i][1] - 0.03, t0shot) ? 1 : 0));
        ln.style.opacity = tt >= t0shot ? 1 - b : 0;
        const lw = Math.max(wd - size * k * 0.06, 360),
          lx = side === "l" ? X - wd + size * k * 0.04 : X + size * k * 0.04;
        ln.style.width = lw + "px";
        ln.style.whiteSpace = "normal";
        ln.style.lineHeight = "1.05";
        const lh = ln.offsetHeight || lineSize;
        const ly = below ? Y + size * k * 0.44 + 12 : Y - size * k * 0.44 - lh - lineSize * 0.1;
        ln.style.transform = `translate(${lx}px,${ly}px)`;
      });
    }
    e.side = side;
    e.X = X;
    e.Y = Y;
    return e;
  };
  // small white line that builds word by word on the voice. words: [[w, t], ...] or use L.say(first, last)
  L.say = (first, last, n1 = 1) => {
    // slot words from the n1-th occurrence of `first` through `last`
    const ws = _slot().words || [],
      norm = (s) =>
        s
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
    let i0 = -1,
      k = 0;
    for (let i = 0; i < ws.length; i++)
      if (norm(ws[i][0]) === norm(first) && ++k === n1) {
        i0 = i;
        break;
      }
    if (i0 < 0) throw new Error(`L.say: '${first}' not in ${L.id}`);
    let i1 = i0;
    if (last) {
      for (let i = i0; i < ws.length; i++)
        if (norm(ws[i][0]) === norm(last)) {
          i1 = i;
          break;
        }
    }
    return ws.slice(i0, i1 + 1).map((w) => [w[0], w[1]]);
  };
  L.words = ({
    words,
    x,
    y,
    size = 58,
    anchor = "c",
    out,
    cls = "hvs shadowed",
    color = "#fff",
    maxW = 1700,
    keep,
  } = {}) => {
    if (L.FEW() && !keep) return L._dummy();
    const e = L.el("div", cls + " abs", L.world, { fontSize: size + "px", color, left: 0, top: 0 });
    const sp = words.map(([w]) => {
      const s = document.createElement("span");
      s.textContent = w + " ";
      s.style.opacity = 0;
      e.appendChild(s);
      return s;
    });
    out = out == null ? Math.min(L.shotEnd(words[0][1]), L.dur) : out;
    L.on((tt) => {
      const k = _fit(e, maxW),
        b = L.ease.inCubic(L.p(tt, out - 0.14, out));
      sp.forEach((s, i) => (s.style.opacity = tt >= words[i][1] - 0.03 ? 1 : 0));
      e.style.opacity = 1 - b;
      e.style.transform = `translate(${x}px,${y}px) translate(${anchor === "c" ? -50 : anchor === "r" ? -100 : 0}%,0) scale(${k})`;
      e.style.transformOrigin = anchor === "c" ? "50% 0" : anchor === "r" ? "100% 0" : "0 0";
    });
    return e;
  };
  // typewriter title with yellow stamped highlights: lines = [[{t:'text', at}, {hl:'TEXT', at}], ...]
  L.tw = ({ x, y, size = 64, lines, cps = 28, out, color, anchor = "l", parent } = {}) => {
    const box = L.el("div", "abs", parent || L.world, { left: x + "px", top: y + "px" });
    if (anchor === "c") box.style.transform = "translateX(-50%)";
    let first = true;
    lines.forEach((ln, li) => {
      const row = L.el("div", "tw", box, {
        position: "relative",
        fontSize: size + "px",
        textAlign: anchor === "c" ? "center" : "left",
      });
      if (color) row.style.color = color;
      ln.forEach((r) => {
        if (r.hl) {
          const h = L.el("span", "hl", row, {}, r.hl);
          L.sfx("swoosh", r.at);
          L.on((tt) => {
            const u = L.p(tt, r.at, r.at + 0.12);
            h.style.opacity = u > 0 ? 1 : 0;
            h.style.transform = `scaleX(${L.lerp(0.2, 1, L.ease.outCubic(u))})`;
          });
        } else {
          const cs = [...r.t].map((c) => {
            const s = document.createElement("span");
            s.className = "c";
            s.textContent = c;
            row.appendChild(s);
            return s;
          });
          if (first) {
            L.sfx("type", r.at);
            first = false;
          }
          L.on((tt) => cs.forEach((s, i) => (s.style.opacity = tt >= r.at + i / cps ? 1 : 0)));
        }
      });
    });
    if (out != null)
      L.env(box, -1, out, { din: 0.01, dout: 0.2, base: anchor === "c" ? "translateX(-50%)" : "" });
    return box;
  };
  // quick camera punch inside a full scene: L.punch(t, scale, x, y) — snap zoom on the world
  L.punches = [];
  L.punch = (t, s = 1.15, x = 960, y = 540, d = 0.22) => {
    L.punches.push({ t, s, x, y, d });
    L.sfx("swoosh", t);
  };
  L.shake = (t, amp = 14, d = 0.35) => {
    L.punches.push({ t, shake: amp, d });
  };
  L.cutin = (t) => L.sfx("whoosh", t);
  // hero clips: the 2D world follows the compositor's dive exactly (same keys [[t, z, cx, cy]...] and easing as compose.py)
  L.heroZ = (ks, t) => {
    if (t <= ks[0][0]) return ks[0].slice(1);
    if (t >= ks[ks.length - 1][0]) return ks[ks.length - 1].slice(1);
    let j = 0;
    for (let i = 0; i < ks.length; i++) if (ks[i][0] <= t) j = i;
    const a = ks[j],
      b = ks[j + 1];
    let u = (t - a[0]) / (b[0] - a[0]);
    u = b[1] > a[1] * 1.5 ? u * u * u : u * u * (3 - 2 * u);
    return [1, 2, 3].map((i) => a[i] + (b[i] - a[i]) * u);
  };
  L.heroCam = (ks) => {
    L.world.style.transformOrigin = "960px 540px";
    L.on((t) => {
      const [z, cx, cy] = L.heroZ(ks, t);
      L.world.style.transform = `translate(${z * (960 - cx)}px,${z * (540 - cy)}px) scale(${z})`;
    });
  };
  // white flash at the end of a dive (lands on the next scene's own flash)
  L.flashOut = (t0, d = 0.25) => {
    const f = L.el("div", "abs", L.stage, { inset: 0, background: "#fff", opacity: 0, zIndex: 50 });
    L.on((t) => (f.style.opacity = L.ease.inCubic(L.p(t, t0, t0 + d))));
  };
  // big glowing 3D-ish word (white/coloured, extruded shadow stack) for hero overlays
  L.slab = ({
    text,
    t,
    out,
    x = 960,
    y = 540,
    size = 200,
    color = "#fff",
    glow = "rgba(255,255,255,.5)",
    depth = 10,
    anim = "slam",
    sfx = "click",
    rot = 0,
  } = {}) => {
    const e = L.el("div", "hv abs", L.world, {
      left: 0,
      top: 0,
      fontSize: size + "px",
      color,
      whiteSpace: "nowrap",
      textShadow:
        [...Array(depth)]
          .map((_, i) => `${i + 1}px ${i + 1}px 0 rgba(0,0,0,${0.55 - i * 0.03})`)
          .join(",") + `,0 0 40px ${glow}`,
    });
    e.textContent = text;
    L.sfx(sfx, t);
    L.on((tt) => {
      const u = L.p(tt, t, t + 0.22),
        b = out == null ? 0 : L.ease.inCubic(L.p(tt, out - 0.15, out));
      const sc =
        anim === "slam" ? L.lerp(2.2, 1, L.ease.outCubic(u)) : L.lerp(0.6, 1, L.ease.outBack(u));
      e.style.opacity = (u > 0 ? Math.min(1, u * 3) : 0) * (1 - b);
      const bl = (1 - u) * 10 + b * 8;
      e.style.filter = bl > 0.05 ? `blur(${bl}px)` : "none";
      e.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${rot}deg) scale(${sc * (1 - 0.1 * b)})`;
    });
    return e;
  };
  // red marker X drawn on
  L.cross = ({ x, y, s = 160, t, color = "#ff2a3a", w = 16, out } = {}) => {
    const g = L.el(
      "div",
      "abs",
      L.world,
      { left: x - s / 2 + "px", top: y - s / 2 + "px", width: s + "px", height: s + "px" },
      `<svg width="${s}" height="${s}" viewBox="0 0 100 100" style="overflow:visible;filter:drop-shadow(0 0 10px ${color})"><path d="M14 16 L86 86" stroke="${color}" stroke-width="${(w * 100) / s}" stroke-linecap="round" fill="none" pathLength="1" stroke-dasharray="1" class="a"/><path d="M86 14 L16 86" stroke="${color}" stroke-width="${(w * 100) / s}" stroke-linecap="round" fill="none" pathLength="1" stroke-dasharray="1" class="b"/></svg>`,
    );
    const a = g.querySelector(".a"),
      b = g.querySelector(".b");
    L.sfx("swoosh", t);
    L.on((tt) => {
      a.style.strokeDashoffset = 1 - L.ease.outCubic(L.p(tt, t, t + 0.14));
      b.style.strokeDashoffset = 1 - L.ease.outCubic(L.p(tt, t + 0.12, t + 0.26));
      g.style.opacity = out != null && tt > out ? 0 : 1;
    });
    return g;
  };

  const _guard = () => {
    // v12: no text may run off screen / get cut at the edges
    const k = ((window.SLOTS && window.SLOTS[L.id]) || {}).kind;
    if (k === "full" || k === "pip" || k === "hero") return;
    document.querySelectorAll(".hv,.hvs,.hvi,.tw,.slabw").forEach((e) => {
      if (e.closest(".tw") && !e.classList.contains("tw")) return;
      e.style.translate = "";
      e.style.scale = "";
      if (+getComputedStyle(e).opacity === 0) return;
      const r = e.getBoundingClientRect();
      if (!r.width) return;
      const M = 36,
        W = 1920 - 2 * M;
      let sc = 1,
        dx = 0;
      if (r.width > W) sc = W / r.width;
      const w = r.width * sc,
        cx = r.left + r.width / 2,
        left = cx - w / 2,
        right = cx + w / 2;
      if (left < M) dx = M - left;
      else if (right > 1920 - M) dx = 1920 - M - right;
      if (sc < 1) e.style.scale = sc;
      if (dx) e.style.translate = dx + "px 0";
    });
  };
  window.__seek = (t) => {
    for (const f of parts) f(t);
    _guard();
    if (L.punches && L.punches.length) {
      let sc = 1,
        ox = 0,
        oy = 0,
        px = 960,
        py = 540;
      for (const p of L.punches) {
        if (t < p.t) continue;
        if (p.shake) {
          const u = L.p(t, p.t, p.t + p.d);
          if (u < 1) {
            const a = p.shake * (1 - u);
            ox += Math.sin(t * 90) * a;
            oy += Math.cos(t * 73) * a;
          }
        } else {
          const u = L.ease.outCubic(L.p(t, p.t, p.t + p.d));
          sc = L.lerp(sc, p.s, u);
          px = p.x;
          py = p.y;
        }
      }
      const base = L.world.style.transform && !L.world._pt ? L.world.style.transform : "";
      L.world.style.transformOrigin = `${px}px ${py}px`;
      L.world.style.transform = (L.world._cam || "") + ` translate(${ox}px,${oy}px) scale(${sc})`;
    }
  };
  // 3D: L.three(async (T, S) => {...}) — run by l3d.mjs once three is loaded; S = {scene, camera, renderer, on(fn), add...}
  L._three = [];
  L.three = (fn) => L._three.push(fn);
  // v12: one proper Staunton chess knight for every 3D scene (Conquer Finance emblem). Base on y=0, total height H.
  window.KNIGHT = (T, mat, H = 3.8, yaw = 0) => {
    if (window.KNIGHT_GEO) {
      // v13: the real CC0 model
      const m = mat.clone ? mat.clone() : mat;
      if (window.KNIGHT_NOR && m.isMeshStandardMaterial) {
        m.normalMap = window.KNIGHT_NOR;
        m.normalScale = new T.Vector2(1, 1);
      }
      const mesh = new T.Mesh(window.KNIGHT_GEO, m);
      mesh.scale.setScalar(H);
      mesh.rotation.y = (window.KNIGHT_YAW == null ? -1.15 : window.KNIGHT_YAW) + yaw;
      const root = new T.Group();
      root.add(mesh);
      root.userData.h = H;
      return root;
    }
    return window._KNIGHT_OLD(T, mat, H);
  };
  window._KNIGHT_OLD = (T, mat, H = 3.8) => {
    const g = new T.Group(),
      P = (x, y) => new T.Vector2(x, y);
    const sh = new T.Shape();
    sh.moveTo(-0.3, 0);
    sh.lineTo(0.3, 0);
    sh.splineThru([
      P(0.33, 0.08),
      P(0.31, 0.2),
      P(0.36, 0.34),
      P(0.45, 0.45),
      P(0.6, 0.53),
      P(0.74, 0.57),
      P(0.83, 0.62),
    ]);
    sh.lineTo(0.77, 0.665);
    sh.lineTo(0.85, 0.69); // mouth
    sh.splineThru([P(0.87, 0.75), P(0.82, 0.81), P(0.66, 0.87), P(0.52, 0.93), P(0.45, 0.99)]);
    sh.splineThru([P(0.42, 1.06), P(0.36, 1.14), P(0.29, 1.21)]); // ear
    sh.lineTo(0.23, 1.1);
    sh.lineTo(0.15, 1.07);
    sh.lineTo(0.06, 1.06);
    const mane = [
      [-0.06, 1.0],
      [-0.03, 0.95],
      [-0.16, 0.92],
      [-0.12, 0.86],
      [-0.25, 0.82],
      [-0.21, 0.75],
      [-0.33, 0.7],
      [-0.29, 0.62],
      [-0.4, 0.57],
    ];
    mane.forEach(([x, y]) => sh.lineTo(x, y));
    sh.splineThru([P(-0.43, 0.45), P(-0.39, 0.31), P(-0.41, 0.17), P(-0.33, 0.05), P(-0.3, 0)]);
    const eye = new T.Path();
    eye.absarc(0.5, 0.84, 0.04, 0, Math.PI * 2, true);
    sh.holes.push(eye);
    const nos = new T.Path();
    nos.absarc(0.79, 0.73, 0.022, 0, Math.PI * 2, true);
    sh.holes.push(nos);
    const geo = new T.ExtrudeGeometry(sh, {
      depth: 0.36,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.055,
      bevelSegments: 8,
      curveSegments: 40,
    });
    geo.translate(-0.2, 0, -0.18);
    const base = [
      [0, 0],
      [0.62, 0],
      [0.64, 0.04],
      [0.6, 0.09],
      [0.62, 0.12],
      [0.55, 0.16],
      [0.45, 0.19],
      [0.42, 0.23],
      [0.47, 0.26],
      [0.47, 0.3],
      [0.38, 0.32],
      [0.36, 0.35],
      [0, 0.35],
    ];
    const bm = new T.Mesh(
      new T.LatheGeometry(
        base.map(([x, y]) => P(x, y)),
        96,
      ),
      mat,
    );
    const head = new T.Mesh(geo, mat);
    head.position.y = 0.33;
    const k = H / 1.6;
    g.add(bm);
    g.add(head);
    g.scale.setScalar(k);
    g.userData.h = H;
    const root = new T.Group();
    root.add(g);
    root.userData.h = H;
    return root;
  };
  window.__meta = () => ({
    dur: L.dur,
    meta: L.meta,
    sfx: L.sfxs,
    behind: L.behind && L.behind.children.length > 0,
  });
})();
