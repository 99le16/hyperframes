/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// _roadmap.js — shared ROADMAP grid + chapter capsule for fork-1 scenes (F03 F05 F11 F16 F17).
// Load from a scene with:  (function(){const x=new XMLHttpRequest();x.open('GET','../scenes/_roadmap.js',false);x.send();(0,eval)(x.responseText);})();
window.RM = (function () {
  const STEPS = [
    "Estrategia",
    "Mercados",
    "Firmas propietarias",
    "Formador",
    "Demo vs real",
    "Vivir del trading",
  ];
  const COL = ["green", "green", "cyan", "cyan", "violet", "violet"];
  const mask = (s) => s.replace(/[^ ]/g, "*");
  const pillsSVG = (n, filled) => {
    let o = `<svg width="${n * 26}" height="34" viewBox="0 0 ${n * 26} 34">`;
    for (let i = 0; i < n; i++)
      o += `<g transform="translate(${i * 26 + 4},3) rotate(20 9 14)"><rect x="0" y="0" width="17" height="28" rx="8.5" fill="${i < filled ? "rgba(255,255,255,.85)" : "none"}" stroke="rgba(255,255,255,.8)" stroke-width="2.4"/><line x1="0" y1="14" x2="17" y2="14" stroke="rgba(255,255,255,.8)" stroke-width="2.4"/></g>`;
    return o + "</svg>";
  };
  // header (v9 papel): typewriter title + yellow stamped highlight, centred at x (default 960)
  function header(
    text,
    t,
    { y = 110, size = 66, x = 960, hl = null, thl = null, anchor = "c" } = {},
  ) {
    const ln = [{ t: text + (hl ? " " : ""), at: t }];
    if (hl) ln.push({ hl, at: thl != null ? thl : t + (text.length + 1) / 28 + 0.05 });
    return L.tw({ x, y, size, anchor, lines: [ln] });
  }
  // grid: 6 cards in a 3D plane. opts.reveal = {index: time} unmask (typed); opts.lift = {index: time}
  // opts.view = keyframes [[t, [rx, ry, rz, s, x, y]]] for the plane; opts.focus = keyframes [[t, idx]] (DOF), opts.dof = blur px
  function grid({
    t = 0,
    reveal = {},
    lift = {},
    view,
    focus,
    dof = 0,
    stagger = 0.08,
    x = 960,
    y = 620,
  } = {}) {
    L.stage.style.perspective = "1800px";
    const plane = L.el("div", "abs", L.world, {
      left: x - 790 + "px",
      top: y - 415 + "px",
      width: "1580px",
      height: "830px",
      transformStyle: "preserve-3d",
    });
    const cards = [];
    const pos = [
      [0, 0, 760, 270],
      [790, 0, 790, 270],
      [0, 300, 505, 270],
      [535, 300, 505, 270],
      [1070, 300, 510, 270],
      [0, 600, 1580, 0],
    ];
    // layout: row1 two wide (1,2), row2 three (3,4,5), row3 one wide (6) — like ref 2+3 grid
    const P = [
      [0, 0, 770, 270],
      [800, 0, 780, 270],
      [0, 300, 505, 270],
      [535, 300, 510, 270],
      [1075, 300, 505, 270],
      [0, 600, 1580, 230],
    ];
    STEPS.forEach((name, i) => {
      const [cx, cy, cw, ch] = P[i];
      const c = L.card({
        x: cx,
        y: cy,
        w: cw,
        h: ch,
        color: COL[i],
        glow: "br",
        strength: 0.85,
        css: { transformStyle: "preserve-3d" },
      });
      plane.appendChild(c);
      L.el(
        "div",
        "tag",
        c.ct,
        { position: "absolute", left: "34px", right: "40%", top: "26px" },
        `Paso #${i + 1}`,
      );
      const title = L.el(
        "div",
        "tx",
        c.ct,
        { position: "absolute", left: "34px", top: "86px", fontSize: "50px" },
        mask(name),
      );
      const pills = L.el(
        "div",
        "",
        c.ct,
        { position: "absolute", left: "30px", bottom: "22px" },
        pillsSVG(3, Math.min(3, Math.floor(i / 2) + 1)),
      );
      const t0 = t + i * stagger,
        tr = reveal[i + 1],
        tl = lift[i + 1];
      L.on((tt) => {
        const u = L.ease.outCubic(L.p(tt, t0, t0 + 0.55));
        const lz = tl != null ? L.ease.outBack(L.p(tt, tl, tl + 0.5)) * 60 : 0;
        let blur = (1 - u) * 16;
        if (focus && dof) {
          const f = L.kf(focus, tt);
          blur += Math.min(1, Math.abs(f - (i + 1)) / 2) * dof;
        }
        c.style.opacity = u;
        c.style.filter = blur > 0.1 ? `blur(${blur}px)` : "none";
        c.style.transform = `translateY(${(1 - u) * 40}px) translateZ(${lz}px)`;
        if (tr != null) {
          const k = Math.floor(L.clamp((tt - tr) * 22, 0, name.length));
          title.textContent = name.slice(0, k) + mask(name.slice(k));
        }
        if (tl != null) c.querySelector(".glow").style.opacity = 0.85 + 0.6 * L.p(tt, tl, tl + 0.4);
      });
      cards.push(c);
    });
    if (view)
      L.on((tt) => {
        const [rx, ry, rz, s, vx, vy] = L.kf(view, tt);
        plane.style.transform = `translate(${vx}px,${vy}px) scale(${s}) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
      });
    return { plane, cards, P };
  }
  // capsule chapter: tube + 'Paso N' + counter %, visible [t0, t1)
  function capsule({ t0 = 0, t1, label, pct, color = "green", fillFrom = 0 } = {}) {
    const box = L.el("div", "abs", L.world, { left: 0, top: 0, width: "1920px", height: "1080px" });
    const w = L.world;
    L.world = box;
    L.tube({
      x: 700,
      y: 210,
      w: 250,
      h: 640,
      color,
      level: (tt) => L.lerp(fillFrom, pct / 100, L.ease.outCubic(L.p(tt, t0 + 0.2, t0 + 1.4))),
    });
    const lab = L.el(
      "div",
      "tw abs",
      box,
      { left: "1010px", top: "360px", fontSize: "84px" },
      label,
    );
    const num = L.el("div", "hv abs", box, {
      left: "1000px",
      top: "480px",
      fontSize: "300px",
      color: L.Y,
    });
    L.counter(num, { t0: t0 + 0.2, t1: t0 + 1.4, from: fillFrom * 100, to: pct, suf: "%" });
    L.world = w;
    L.on((tt) => {
      const a = L.ease.outCubic(L.p(tt, t0, t0 + 0.35)),
        b = t1 == null ? 0 : L.ease.inCubic(L.p(tt, t1 - 0.45, t1));
      box.style.opacity = a * (1 - b);
      const bl = (1 - a) * 12 + b * 26;
      box.style.filter = bl > 0.1 ? `blur(${bl}px)` : "none";
      box.style.transform = `scale(${(1 + 0.04 * L.p(tt, t0, t1 || t0 + 3)) * (1 + 0.5 * b)})`;
    });
    return box;
  }
  // wrap a group so it fades/blurs in at t0 (from zoom) and out at t1
  function phase(el, t0, t1, { zin = 0.85 } = {}) {
    L.on((tt) => {
      const a = L.ease.outCubic(L.p(tt, t0, t0 + 0.5)),
        b = t1 == null ? 0 : L.ease.inCubic(L.p(tt, t1 - 0.4, t1));
      el.style.opacity = a * (1 - b);
      const bl = (1 - a) * 18 + b * 18;
      el.style.filter = bl > 0.1 ? `blur(${bl}px)` : "none";
    });
  }
  // view vector [rx, ry, rz, s, vx, vy] that puts card i (1-based) centre at (Tx, Ty) at scale s (grid centred at gx, gy)
  const P = [
    [0, 0, 770, 270],
    [800, 0, 780, 270],
    [0, 300, 505, 270],
    [535, 300, 510, 270],
    [1075, 300, 505, 270],
    [0, 600, 1580, 230],
  ];
  function aim(i, s, Tx, Ty, rx = 0, ry = 0, rz = 0, gx = 960, gy = 650) {
    const [cx, cy, cw, ch] = P[i - 1],
      ccx = gx - 790 + cx + cw / 2,
      ccy = gy - 415 + cy + ch / 2;
    return [rx, ry, rz, s, Tx - gx - s * (ccx - gx), Ty - gy - s * (ccy - gy)];
  }
  // standard chapter: capsule → closeup on card n (revealed at tr), returns grid
  function chapter({
    n,
    label,
    pct,
    color,
    tcut,
    tr,
    header: hd,
    th,
    s = 1.35,
    Tx = 960,
    Ty = 360,
    dof = 12,
  }) {
    capsule({ t0: 0, t1: tcut + 0.1, label, pct, color, fillFrom: Math.max(0, pct - 15) / 100 });
    const v0 = aim(n, s * 1.12, Tx, Ty + 30, 16, -12, 3),
      v1 = aim(n, s, Tx, Ty, 12, -9, 2);
    const g = grid({
      t: tcut - 0.25,
      y: 650,
      reveal: tr != null ? { [n]: tr } : {},
      lift: { [n]: tcut + 0.2 },
      view: [
        [tcut - 0.25, v0],
        [tcut + 1.2, v1],
        [L.dur, aim(n, s * 0.97, Tx + 20, Ty, 10, -6, 1.5)],
      ],
      focus: [[0, n]],
      dof,
      stagger: 0.04,
    });
    if (hd) header(hd, th != null ? th : tcut + 0.2, { y: 80, size: 62 });
    return g;
  }
  return { STEPS, COL, mask, header, grid, capsule, phase, pillsSVG, aim, chapter };
})();
