/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// ad-style devices: high-level, format-aware beats on top of engine.js (window.E).
// Every device places itself from the head geometry (piece focus + camera zoom) and measured text widths,
// so one module works in V (1080x1920), S (1080x1080) and H (1920x1080). Words a device shows are "covered";
// fillPills() captions every other spoken word with the white pills.
(function () {
  const E = window.E;
  const {
    C,
    W,
    H,
    F,
    L,
    tl,
    el,
    px,
    at,
    W_,
    cue,
    behind,
    front,
    shot,
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
    outlineF,
  } = E;
  const Y = "#FAF400",
    INK = "#1f1f1f",
    G = "#303030";
  const FH = { V: 470, S: 300, H: 290 }[F]; // normalised face height per format (pieces.py)
  const MT = { V: 150, S: 88, H: 88 }[F]; // minimum glyph top (safe area)
  const LIFT = { V: 0, S: 60, H: 0 }[F];
  E.setLift(LIFT);
  const sfxSuf = { V: "", S: "_s", H: "_h" }[F];

  // ---------- measuring ----------
  const cv = document.createElement("canvas").getContext("2d");
  function tw(text, size, weight = 700, ls = -0.055, family = '"Helvetica Neue", Inter') {
    const t = String(text)
      .replace(/<br>/g, "\n")
      .split("\n")
      .sort((a, b) => b.length - a.length)[0];
    cv.font = `${weight} ${size}px ${family}`;
    return cv.measureText(t).width + ls * size * t.length;
  }
  const lines = (t) => String(t).split("<br>").length;

  // ---------- words / time ----------
  const ws = (s, after) => W_(s.split(" "), after);
  const piece = (id) => C.pieces.find((p) => p.id === id);
  const wAt = (word, after) => at(word, after);
  const wEnd = (word, after) => at(word, after, "e");

  // ---------- camera ----------
  const Z = [];
  function cam(t, z, o = {}) {
    Z.push(Object.assign({}, o, { t: t + E.getOff(), z }));
    shot(t, z, o);
  }
  const pieceAt = (t) =>
    C.pieces.find((p) => t >= p.t0 - 1e-6 && t < p.t1 - 1e-6) || C.pieces[C.pieces.length - 1];
  function camAt(t) {
    let s = { z: 1, dx: 0 };
    for (const q of Z) if (q.t <= t + 1e-6) s = q;
    return s;
  } // absolute t
  // head box from the person matte (HF.head: [t, top, x0, x1] in base px every 0.2 s), mapped through the camera at t
  function head(t, t2) {
    const ta = t + E.getOff(),
      tb = (t2 ?? t + 0.6) + E.getOff();
    const p = pieceAt(ta + 0.01),
      c = camAt(ta + 0.01);
    const z = (c.z + (LIFT ? LIFT / p.fy + 0.01 : 0)) * 1.035,
      dx = c.dx || 0,
      dy = LIFT;
    const S = (C.head || []).filter((q) => q[1] != null && q[0] >= ta - 0.1 && q[0] <= tb + 0.1);
    if (!S.length)
      return {
        cx: p.fx + dx,
        cy: p.fy + dy,
        top: p.fy - 0.78 * FH * z + dy,
        half: 0.62 * FH * z,
        z,
      };
    const top = Math.min(...S.map((q) => q[1])),
      x0 = Math.min(...S.map((q) => q[2])),
      x1 = Math.max(...S.map((q) => q[3]));
    const mx = (v) => p.fx + (v - p.fx) * z + dx,
      my = (v) => p.fy + (v - p.fy) * z + dy;
    return {
      cx: (mx(x0) + mx(x1)) / 2,
      cy: my(top) + 0.55 * FH * z,
      top: my(top),
      half: (mx(x1) - mx(x0)) / 2,
      z,
    };
  }

  // ---------- coverage (words shown by a device: no pill there) ----------
  const COV = [];
  const cover = (a, b) => COV.push([a + E.getOff(), b + E.getOff()]);
  function fillPills() {
    E.setOff(0);
    const isCov = (w) => COV.some(([a, b]) => w.s >= a - 0.02 && w.s < b - 0.02);
    const runs = [];
    let cur = null;
    C.words.forEach((w) => {
      if (isCov(w)) {
        cur = null;
        return;
      }
      if (cur && w.s - cur.e < 1.2) {
        cur.e = w.e;
        cur.ls = w.s;
      } else {
        cur = { s: w.s, e: w.e, ls: w.s };
        runs.push(cur);
      }
    });
    runs.forEach((r) => pills(r.s - 0.01, r.ls + 0.01, { end: r.e + 0.3 }));
  }

  // ---------- big yellow word behind the head (+ companion small line) ----------
  // o: { t, out, text, small:'words…', smallAfter, sfx, max, side:'above'|'below' }
  function big(o) {
    const h = head(o.t, o.out);
    const sm = o.small ? ws(o.small, o.smallAfter ?? o.t - 3) : null;
    const ssz = L(60, 44, 52);
    let x, y, size, sx, sy;
    if (F !== "H") {
      const maxW = 0.9 * W;
      size = Math.min(o.max || L(400, 250, 0), maxW / (tw(o.text, 100) / 100));
      o.side = "above"; // a small line under the word would sit on the face
      const nl = lines(o.text),
        above = sm ? ssz * 1.3 : 0;
      const wCap = size;
      size = Math.min(
        wCap,
        Math.max(L(130, 100, 0), Math.min(size, (h.top - MT - above) / (0.58 + 0.93 * (nl - 1)))),
      );
      const gTop = Math.max(MT + above, h.top - size * (0.58 + 0.93 * (nl - 1)));
      x = W / 2;
      y = gTop + 0.186 * size - LIFT;
      if (sm) {
        sx = W / 2;
        sy = (o.side === "below" ? gTop + 0.93 * size * nl + 4 : gTop - ssz * 1.25) - LIFT;
      }
    } else {
      const right = h.cx - h.half - 50,
        left = 70,
        cxr = (left + right) / 2;
      size = Math.min(o.max || 300, (0.94 * (right - left)) / (tw(o.text, 100) / 100));
      const blockH = 0.93 * size * lines(o.text) + (sm ? ssz * 1.3 : 0);
      const gTop = Math.max(MT, h.cy - 0.15 * FH - blockH / 2);
      x = cxr;
      y = gTop + (sm ? ssz * 1.3 : 0) + 0.186 * size;
      if (sm) {
        sx = cxr;
        sy = gTop;
      }
    }
    if (F !== "H") matte(o.t, o.out);
    const e = txt(behind, {
      t: o.t,
      out: o.out,
      html: o.text,
      text: o.text,
      size,
      x,
      y,
      anchor: "c",
      color: o.color || Y,
      anim: "pop",
      sfx: o.sfx || "swoosh",
      css: lines(o.text) > 1 ? { textAlign: "center" } : {},
    });
    if (sm)
      line(front, {
        words: sm,
        size: ssz,
        x: sx,
        y: sy,
        anchor: "c",
        out: o.out,
        cls: "hvs shadowed",
      });
    cover(
      (sm ? Math.min(sm[0].t, o.t) : o.t) - 0.08,
      o.coverTo ?? Math.max(o.t, sm ? sm[sm.length - 1].t : 0) + 0.35,
    );
    return { e, size, x, y };
  }
  // side word (ref "pain / relief"): camera reframes so the word sits beside the head
  function side(o) {
    const s = o.dir || 1; // +1: head pushed right, word on the left
    if (F !== "H") cam(o.t, o.z || 1.3, { dx: s * L(150, 140, 0) });
    const h = head(o.t, o.out);
    const sm = o.small ? ws(o.small, o.smallAfter ?? o.t - 3) : null;
    const ssz = L(50, 42, 52);
    let colL, colR;
    // the word may run ~35% of the way behind the head (matte) — the ref's side words are big
    if (s > 0) {
      colL = L(40, 30, 70);
      colR = h.cx - h.half * L(0.8, 0.8, 0.9);
    } else {
      colL = h.cx + h.half * L(0.8, 0.8, 0.9);
      colR = W - L(40, 30, 70);
    }
    const size = Math.min(
      o.max || L(210, 160, 260),
      (0.96 * (colR - colL)) / (tw(o.text, 100) / 100),
    );
    const gTop = Math.max(MT + (sm ? ssz * 1.3 : 0), h.cy - 0.55 * FH - (F === "H" ? 0 : 0));
    const x = (colL + colR) / 2;
    if (F !== "H") matte(o.t, o.out);
    txt(behind, {
      t: o.t,
      out: o.out,
      html: o.text,
      text: o.text,
      size,
      x,
      y: gTop + 0.186 * size - LIFT,
      anchor: "c",
      color: Y,
      anim: "pop",
      sfx: o.sfx || "swoosh",
      css: { textAlign: "center" },
    });
    if (sm)
      line(front, {
        words: sm,
        size: ssz,
        x,
        y: gTop - ssz * 1.25 - LIFT,
        anchor: "c",
        out: o.out,
        cls: "hvs shadowed",
      });
    cover(
      (sm ? Math.min(sm[0].t, o.t) : o.t) - 0.08,
      o.coverTo ?? Math.max(o.t, sm ? sm[sm.length - 1].t : 0) + 0.35,
    );
  }

  // ---------- yellow clock behind the head ----------
  // o: { t, out, pre:'en tan solo', preAfter, num:'12', tNum, unit:'meses', tUnit }
  function clockBeat(o) {
    const h = head(o.t, o.out);
    const r = L(400, 220, 250);
    matte(o.t, o.out);
    clock(behind, {
      t: o.t,
      out: o.out,
      x: h.cx,
      y: Math.max(r + L(140, 30, 30), h.top + r * 0.25) - LIFT,
      r,
    });
    const pre = o.pre ? ws(o.pre, o.preAfter ?? o.t - 1) : null;
    if (F === "H") {
      const x = h.cx + h.half + 120;
      if (pre) line(front, { words: pre, size: 50, x, y: 560, cls: "hvs shadowed", out: o.out });
      if (o.num)
        txt(front, {
          t: o.tNum,
          out: o.out,
          text: o.num,
          size: 250,
          x,
          y: 610,
          color: Y,
          anim: "pop",
          cls: "hvi",
          sfx: o.numSfx || "click",
        });
      if (o.unit)
        txt(front, {
          t: o.tUnit,
          out: o.out,
          text: o.unit,
          size: 76,
          x: x + 20,
          y: 830,
          cls: "hvi shadowed",
          anim: "rise",
        });
    } else {
      if (pre)
        line(front, {
          words: pre,
          size: L(60, 44, 0),
          x: L(250, 300, 0),
          y: L(1330, 725, 0),
          cls: "hvs shadowed",
          out: o.out,
        });
      if (o.num)
        txt(front, {
          t: o.tNum,
          out: o.out,
          text: o.num,
          size: L(330, 220, 0),
          x: L(530, 560, 0),
          y: L(1180, 630, 0),
          color: Y,
          anim: "pop",
          cls: "hvi",
          sfx: o.numSfx || "click",
        });
      if (o.unit)
        txt(front, {
          t: o.tUnit,
          out: o.out,
          text: o.unit,
          size: L(92, 64, 0),
          x: L(560, 580, 0),
          y: L(1450, 810, 0),
          cls: "hvi shadowed",
          anim: "rise",
        });
    }
    cover(pre ? pre[0].t : o.t, Math.max(o.tUnit || 0, o.tNum || 0, o.t) + 0.35);
  }

  // ---------- navy notepad list ----------
  // o: { t0, t1, title:[[runs]], items:[{t, text, size?, prop, mark:'x'|'ok'|null}], towers }
  function navyList(o) {
    const s = scene(o.t0, o.t1, { bg: `gen/bg_navy${sfxSuf}.png`, sfx: "whoosh" });
    const tx = L(70, 50, 230),
      maxc = Math.max(
        ...o.title.map((ln) => ln.reduce((n, r) => n + (r.t || r.hl).length + (r.hl ? 0.6 : 0), 0)),
      );
    type(s, {
      x: tx,
      y: L(280, 90, 90),
      size: Math.min(L(80, 60, 84), (W - tx - 40) / (maxc * 0.62)),
      cps: 28,
      lines: o.title,
    });
    if (o.towers !== false) {
      cutout(s, {
        src: "cuts/tower1.png",
        t: o.t0 + 0.2,
        x: L(-170, -110, -90),
        y: L(1040, 600, 330),
        w: L(470, 320, 400),
        anim: "rise",
        z: 1,
        gray: true,
      });
      cutout(s, {
        src: "cuts/tower2.png",
        t: o.t0 + 0.5,
        x: L(790, 850, 1650),
        y: L(960, 560, 290),
        w: L(430, 300, 380),
        anim: "rise",
        z: 1,
        gray: true,
      });
    }
    const n = o.items.length;
    // layout: V = 2 columns (rows of 2, last centred); S/H = one row
    const slots = [];
    if (F === "V") {
      const cw = 390,
        ch = n > 3 ? 300 : 340,
        gx = 80,
        top = 640,
        gy = ch + 150;
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / 2),
          c = i % 2,
          inRow = Math.min(2, n - r * 2);
        const x0 = inRow === 1 ? (W - cw) / 2 : [110, 580][c];
        slots.push({ x: x0, y: top + r * gy, w: cw, h: ch });
      }
    } else {
      const cw = L(0, n > 3 ? 236 : 300, n > 3 ? 360 : 440),
        ch = L(0, n > 3 ? 230 : 260, 370),
        gap = L(0, 18, 40);
      const tot = n * cw + (n - 1) * gap,
        x0 = (W - tot) / 2,
        y0 = L(0, 380, 410);
      for (let i = 0; i < n; i++) slots.push({ x: x0 + i * (cw + gap), y: y0, w: cw, h: ch });
    }
    o.items.forEach((it, i) => {
      const sl = slots[i],
        fs = it.size ? it.size * (sl.w / 390) : Math.min(sl.w / 7.2, (52 * sl.w) / 390);
      card(s, {
        t: it.t,
        x: sl.x,
        y: sl.y,
        w: sl.w,
        h: sl.h,
        rot: [-2, 2, -1, 1.5][i % 4],
        text: it.text,
        size: fs,
        num: `#${i + 1}`,
        numsize: L(84, 62, 80) * (n > 3 ? 0.85 : 1),
        numdy: L(92, 70, 88) * (n > 3 ? 0.85 : 1),
      });
      if (it.prop)
        cutout(s, {
          src: `cuts/${it.prop}.png`,
          t: it.t + 0.13,
          x: sl.x + sl.w - sl.w * L(0.3, 0.3, 0.3),
          y: sl.y - sl.h * L(0.34, 0.34, 0.32),
          w: sl.w * (it.propW ? it.propW * 0.8 : L(0.34, 0.34, 0.34)),
          z: 4,
          rot: [8, -10, 6, -6][i % 4],
          shadow: true,
        });
      const my = sl.y + sl.h / 2;
      if (it.mark === "x")
        stroke(s, {
          t: it.t + 0.35,
          dur: 0.25,
          z: 6,
          color: "#d11",
          w: L(9, 7, 8),
          d: `M ${sl.x + 0.12 * sl.w} ${my + 8} C ${sl.x + 0.38 * sl.w} ${my - 18}, ${sl.x + 0.64 * sl.w} ${my + 22}, ${sl.x + 0.88 * sl.w} ${my - 8}`,
        });
      if (it.mark === "ok")
        stroke(s, {
          t: it.t + 0.4,
          dur: 0.35,
          z: 6,
          color: Y,
          w: L(10, 8, 9),
          d: `M ${sl.x + 0.18 * sl.w} ${sl.y + sl.h * 0.84} C ${sl.x + 0.36 * sl.w} ${sl.y + sl.h * 0.84 + 16}, ${sl.x + 0.56 * sl.w} ${sl.y + sl.h * 0.84 + 8}, ${sl.x + 0.84 * sl.w} ${sl.y + sl.h * 0.82}`,
        });
    });
    cover(o.t0, o.t1);
    return s;
  }

  // ---------- light paper scene (optionally a Seedance clip) ----------
  // o: { t0, t1, clip, bg, pre:[line…], bigw:{text,t}, post:[line | {hl,at}], person, labels:[[t,text,{V,S,H}]], props, group }
  //   line = 'words as spoken' (built word by word from the take, searched after t0) or {w, after}
  function paper(o) {
    const s = E.scene(o.t0, o.t1, {
      color: "#cfcfcf",
      bg: o.clip ? null : o.bg || `gen/bg_gray${sfxSuf}.png`,
      sfx: o.sfxIn || "paper",
    });
    if (o.clip) {
      el("img", "abs", s, {
        left: 0,
        top: 0,
        width: px(W),
        height: px(H),
      }).src = `seed/${o.clip}${sfxSuf}_last.png`;
      mediaPut(o.clip, s, o.t0);
    }
    const cx = W / 2,
      maxW = 0.92 * W;
    const LS = L(58, 44, 40),
      BS = L(270, 190, 160),
      HS = L(88, 62, 56);
    let y = L(205, 90, 60) - LS * 0.12,
      after = o.t0 - 0.3;
    const addLine = (ln) => {
      if (ln.hl) {
        const sz = Math.min(HS, maxW / (ln.hl.length * 0.64));
        type(s, {
          x: cx,
          anchor: "c",
          y: y + 6,
          size: sz,
          lines: [[{ hl: ln.hl, at: ln.at, sfx: ln.sfx }]],
        });
        y += sz * 1.28;
        return;
      }
      const w = typeof ln === "string" ? ln : ln.w;
      const ws_ = ws(w, typeof ln === "string" ? after : ln.after);
      after = ws_[ws_.length - 1].t;
      const sz = Math.min(LS, maxW / (tw(w, 100, 500, -0.04) / 100));
      line(s, {
        words: ws_,
        size: sz,
        x: cx,
        y,
        anchor: "c",
        color: G,
        css: { textShadow: "0 0 10px rgba(225,225,222,.95), 0 0 22px rgba(225,225,222,.8)" },
      });
      y += sz * 1.16;
    };
    (o.pre || []).forEach(addLine);
    if (o.bigw) {
      const sz = Math.min(BS, maxW / (tw(o.bigw.text, 100) / 100));
      y -= sz * 0.06;
      txt(s, {
        t: o.bigw.t,
        text: o.bigw.text,
        size: sz,
        x: cx,
        y,
        anchor: "c",
        color: INK,
        anim: "pop",
        sfx: o.bigw.sfx || "swoosh",
        css: { textShadow: "0 0 18px rgba(225,225,222,.85)" },
      });
      y += sz * (/[gjpqy]/.test(o.bigw.text) ? 1.14 : 0.9);
    }
    (o.post || []).forEach(addLine);
    let dyP = 0;
    if (o.person) {
      const pp = Object.assign(
        { outline: Y, ow: L(6, 4, 4), anim: "drop" },
        o.person,
        L(o.person.V || {}, o.person.S || {}, o.person.H || {}),
      );
      dyP = Math.max(0, y + 12 - pp.y);
      const room = H - (pp.y + dyP);
      if (room < pp.w * 1.1) {
        const nw = Math.max(pp.w * 0.7, room / 1.1);
        pp.x += (pp.w - nw) / 2;
        pp.w = nw;
      }
      pp.y += dyP;
      cutout(s, pp);
    }
    (o.labels || []).forEach(([t, text, pos]) => {
      const [x, yy0] = L(pos.V, pos.S, pos.H);
      const yy = yy0 + dyP;
      txt(s, {
        t,
        text,
        size: 32,
        x,
        y: yy,
        cls: "lbl",
        color: "#1a1a1a",
        css: {
          fontSize: L("32px", "26px", "28px"),
          background: "#fff",
          padding: "2px 8px",
          zIndex: 6,
        },
      });
    });
    (o.props || []).forEach((p) =>
      cutout(
        s,
        Object.assign({ anim: "pop", shadow: true, z: 5 }, p, L(p.V || {}, p.S || {}, p.H || {})),
      ),
    );
    if (o.group) group(s, o.group);
    cover(o.t0, o.t1);
    return s;
  }
  // office-style group of people with yellow outline, eye bars and tiny labels (ref "you're losing")
  function group(s, g) {
    const K = L(g.kV || 0.78, g.kS || 0.5, g.kH || 0.55),
      FEET = L(1880, 1070, 1070),
      span = g.span;
    const X0 = W / 2 - (span * K) / 0.78 / 2,
      bw = (92 * K) / 0.78,
      bh = (26 * K) / 0.78;
    g.people.forEach(([f, b, xv, eyes, lab], i) => {
      const x = X0 + (xv * K) / 0.78,
        w = (b[2] - b[0]) * K,
        hh = (b[3] - b[1]) * K,
        y = FEET - hh,
        t = g.t + i * 0.12;
      const d = el("div", "abs", s, {
        left: px(x),
        top: px(y),
        width: px(w),
        height: px(hh),
        zIndex: 3 + (i % 2),
        transformOrigin: "50% 100%",
      });
      el("img", "", d, {
        width: "100%",
        display: "block",
        filter: outlineF(Y, L(5, 3.5, 4)),
      }).src = `cuts/${f}.png`;
      if (g.bars !== false)
        eyes.forEach(([ex, ey]) =>
          el("div", "abs", d, {
            left: px((ex - b[0]) * K - bw / 2),
            top: px((ey - b[1]) * K - bh / 2),
            width: px(bw),
            height: px(bh),
            background: Y,
          }),
        );
      tl.set(d, { autoAlpha: 0 }, -0);
      tl.set(d, { autoAlpha: 1 }, t);
      tl.fromTo(
        d,
        { y: -220, scale: 1.1 },
        { y: 0, scale: 1, duration: 0.34, ease: "bounce.out", immediateRender: false },
        t,
      );
      cue(t + 0.02, "pop", 0.7);
      if (lab)
        txt(s, {
          t: (g.tLab || g.t + 1) + i * 0.25,
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
  const OFFICE = {
    span: 1071,
    people: [
      ["office_0", [16, 20, 343, 977], 0, [[200, 118]]],
      [
        "office_1",
        [345, 16, 929, 992],
        215,
        [
          [495, 150],
          [745, 138],
        ],
      ],
      ["office_2", [931, 94, 1165, 973], 640, [[1035, 160]]],
      ["office_3", [1169, 44, 1529, 978], 790, [[1335, 118]]],
    ],
  };

  // ---------- media (Seedance clips): registered on pass 1, moved into place on pass 2 ----------
  const MEDIA = (window.__mediaReq = []);
  const MCLIPS = {
    // clip id -> [mstart, max duration] (retimed / trimmed versions)
    unfold_remote: {
      src: {
        V: "seed/unfold_remote_fast.mp4",
        S: "seed/unfold_remote_s_fast.mp4",
        H: "seed/unfold_remote_h_fast.mp4",
      },
      mstart: 0,
      d: 2.0,
    },
    tear_office: {
      src: {
        V: "seed/tear_office_25.mp4",
        S: "seed/tear_office_s_25.mp4",
        H: "seed/tear_office_h_25.mp4",
      },
      mstart: { V: 0.3, S: 1.0, H: 1.0 },
      d: 3.0,
    },
  };
  E.MCLIPS = MCLIPS;
  function mediaPut(id, parent, t0) {
    const m = MCLIPS[id];
    const t = t0 ?? parent.__t0;
    const uid = `${id}_${Math.round(((t ?? 0) + E.getOff()) * 100)}`;
    const ms = typeof m.mstart === "object" ? m.mstart[F] : m.mstart;
    const ta = t + E.getOff();
    MEDIA.push({ id: uid, src: m.src[F], t: +ta.toFixed(3), d: m.d, mstart: ms });
    const v = document.getElementById(uid);
    if (v) {
      parent.appendChild(v);
      v.style.zIndex = 0;
    }
  }
  // scene() records its start so mediaPut can default to it
  const _scene = scene;
  E.scene = function (t0, t1, o) {
    const s = _scene(t0, t1, o);
    s.__t0 = t0;
    return s;
  };

  // ---------- phone in hands (CTA) ----------
  // o: { t0, t1, titles:[[a,b,lines]], screen:'¿qué<br>profesión?', camAt, props:[{src,t,V:{x,y,w},S:{},H:{}}], arrowAt }
  function phone(o) {
    const s = E.scene(o.t0, o.t1, { bg: `gen/bg_paper${sfxSuf}.png`, sfx: "whoosh" });
    const push = o.t1 - 0.5;
    const tw_ = (lines) =>
      type(
        s,
        Object.assign(
          L(
            { x: 540, anchor: "c", y: 250, size: 76 },
            { x: 540, anchor: "c", y: 80, size: 54 },
            { x: 110, y: 400, size: 62 },
          ),
          { cps: 30, color: "#222", lines },
        ),
      );
    o.titles.forEach(([a, b, l]) => {
      const e = tw_(l);
      tl.set(e, { autoAlpha: 0 }, Math.min(b, push + 0.02));
    });
    if (o.arrowAt)
      stroke(s, {
        t: o.arrowAt,
        dur: 0.25,
        out: push + 0.02,
        w: 4,
        color: "#222",
        d: L(
          "M 760 410 C 790 470, 770 520, 720 560 M 720 560 L 735 520 M 720 560 L 760 548",
          "M 780 164 C 820 194, 820 224, 790 254 M 790 254 L 792 224 M 790 254 L 820 244",
          "M 640 560 C 760 600, 860 600, 960 560 M 960 560 L 925 552 M 960 560 L 935 585",
        ),
      });
    const k = L(0.78, 0.5, 0.64),
      cx = L(540, 540, 1420);
    const scx = cx + (539 - 540) * k,
      scy = H + (853 - 1920) * k;
    const pushS = Math.max(W / (488 * k), H / (1079 * k)) * 1.06;
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
      `<span class="hand">${o.screen || "¿qué<br>profesión?"}</span>`,
    );
    // the screen plays the camera from camAt
    const ca = o.camAt + E.getOff();
    const uid = `phone_cam_${Math.round(ca * 100)}`;
    MEDIA.push({
      id: uid,
      src: "cam.mp4",
      t: +ca.toFixed(3),
      d: +(o.t1 - o.camAt).toFixed(3),
      mstart: +ca.toFixed(3),
    });
    const pc = document.getElementById(uid);
    if (pc) {
      scr.appendChild(pc);
      pc.style.zIndex = 1;
      pc.style.objectFit = "cover";
    }
    el("img", "abs", ph, { left: 0, top: 0, width: "1080px", height: "1920px", zIndex: 2 }).src =
      "cuts/hands_phone.png";
    tl.fromTo(
      outer,
      { y: L(900, 600, 600) },
      { y: 0, duration: 0.5, ease: "expo.out", immediateRender: false },
      o.t0,
    );
    (o.props || []).forEach((p) =>
      cutout(s, Object.assign({ z: 5, float: 10, out: push + 0.02 }, p, L(p.V, p.S, p.H))),
    );
    tl.to(outer, { scale: L(3.4, pushS, 2.6), duration: 0.5, ease: "power3.in" }, push);
    cue(push - 0.05, "zoomin", 0.8);
    cover(o.t0, o.t1);
  }

  // ---------- question box (AD4 "caja de preguntas"): IG-style sticker, the question builds word by word ----------
  // o: { t0, t1, q:'whole question as spoken', after, header }
  function question(o) {
    const words = ws(o.q, o.after ?? o.t0 - 0.5);
    const box = L(
      { x: 90, y: 1060, w: 900 },
      { x: 140, y: 780, w: 800 },
      { x: 90, y: 250, w: 760 },
    );
    const fs = L(54, 40, 46);
    const d = el("div", "abs", front, {
      left: px(box.x),
      top: px(box.y + (F === "S" ? 0 : 0)),
      width: px(box.w),
      borderRadius: "34px",
      background: "#fff",
      boxShadow: "0 18px 40px rgba(0,0,0,.35)",
      overflow: "hidden",
      zIndex: 8,
      transformOrigin: "50% 0%",
    });
    el(
      "div",
      "",
      d,
      {
        background: "#151515",
        color: "#fff",
        fontFamily: '"Helvetica Neue", Inter',
        fontWeight: 700,
        fontSize: px(fs * 0.62),
        letterSpacing: "-.02em",
        padding: `${fs * 0.42}px ${fs * 0.6}px`,
        textAlign: "center",
      },
      o.header || "Me preguntáis",
    );
    const body = el("div", "", d, {
      color: "#151515",
      fontFamily: '"Helvetica Neue", Inter',
      fontWeight: 600,
      fontSize: px(fs),
      lineHeight: 1.16,
      letterSpacing: "-.03em",
      padding: `${fs * 0.5}px ${fs * 0.6}px ${fs * 0.62}px`,
      textAlign: "center",
    });
    words.forEach((w, i) => {
      const sp = el("span", "", body, null, w.w + (i < words.length - 1 ? " " : ""));
      tl.set(sp, { opacity: 0 }, -0);
      tl.set(sp, { opacity: 1 }, w.t);
    });
    tl.set(d, { autoAlpha: 0 }, -0);
    tl.set(d, { autoAlpha: 1 }, o.t0);
    tl.fromTo(
      d,
      { scale: 0.6, y: 40 },
      { scale: 1, y: 0, duration: 0.35, ease: "back.out(1.8)", immediateRender: false },
      o.t0,
    );
    cue(o.t0, "pop", 0.8);
    tl.to(d, { scale: 0.85, autoAlpha: 0, duration: 0.18, ease: "power2.in" }, o.t1 - 0.18);
    cover(o.t0, o.t1);
    return d;
  }

  // ---------- job offer card (generic, unbranded) next to the presenter ----------
  // o: { t0, t1, title, rows:[[t,text]], badge }
  function offer(o) {
    const box = L(
      { x: 120, y: 1040, w: 840 },
      { x: 600, y: 300, w: 440 },
      { x: 1180, y: 250, w: 640 },
    );
    const fs = L(46, 30, 38);
    const d = el("div", "abs", front, {
      left: px(box.x),
      top: px(box.y),
      width: px(box.w),
      borderRadius: "24px",
      background: "#fff",
      boxShadow: "0 18px 40px rgba(0,0,0,.35)",
      padding: px(fs * 0.7),
      boxSizing: "border-box",
      zIndex: 8,
      fontFamily: '"Helvetica Neue", Inter',
      color: "#151515",
    });
    const hd = el("div", "", d, {
      display: "flex",
      alignItems: "center",
      gap: px(fs * 0.4),
      marginBottom: px(fs * 0.4),
    });
    el(
      "div",
      "",
      hd,
      {
        width: px(fs * 1.6),
        height: px(fs * 1.6),
        borderRadius: px(fs * 0.3),
        background: "#1f1f1f",
        flex: "0 0 auto",
      },
      `<div style="color:${Y};font-weight:800;font-size:${fs}px;line-height:${fs * 1.6}px;text-align:center">&lt;/&gt;</div>`,
    );
    el(
      "div",
      "",
      hd,
      { fontWeight: 700, fontSize: px(fs), lineHeight: 1.05, letterSpacing: "-.03em" },
      o.title,
    );
    if (o.badge)
      el(
        "div",
        "",
        d,
        {
          display: "inline-block",
          background: Y,
          fontFamily: '"Special Elite"',
          fontSize: px(fs * 0.7),
          padding: `2px ${fs * 0.3}px`,
          marginBottom: px(fs * 0.3),
        },
        o.badge,
      );
    o.rows.forEach(([t, text]) => {
      const r = el(
        "div",
        "",
        d,
        {
          fontSize: px(fs * 0.86),
          fontWeight: 500,
          padding: `${fs * 0.18}px 0`,
          borderTop: "1px solid #e4e4e4",
          letterSpacing: "-.02em",
        },
        "✓ " + text,
      );
      tl.set(r, { opacity: 0 }, -0);
      tl.set(r, { opacity: 1 }, t);
      tl.fromTo(
        r,
        { x: -20 },
        { x: 0, duration: 0.2, ease: "power2.out", immediateRender: false },
        t,
      );
      cue(t, "pop", 0.6);
    });
    tl.set(d, { autoAlpha: 0 }, -0);
    tl.set(d, { autoAlpha: 1 }, o.t0);
    tl.fromTo(
      d,
      { y: 80, rotation: -4, scale: 0.8 },
      {
        y: 0,
        rotation: o.rot ?? -2,
        scale: 1,
        duration: 0.4,
        ease: "back.out(1.6)",
        immediateRender: false,
      },
      o.t0,
    );
    cue(o.t0, "whoosh", 0.8);
    tl.to(d, { y: -40, autoAlpha: 0, duration: 0.2, ease: "power2.in" }, o.t1 - 0.2);
    return d;
  }

  // ---------- job-offer cards behind the presenter (ref: green-screen offers) ----------
  // o: { t0, t1, cards:[{t, title, chips:[..], salary}] } — matte on, cards fanned around the head on the behind layer
  function offerWall(o) {
    const h = head(o.t0);
    const n = o.cards.length;
    const cw = L(500, 330, 470),
      fs = L(35, 23, 30);
    const pos =
      F === "H"
        ? [
            [h.cx - h.half - cw - 30, 150, -5],
            [h.cx + h.half + 30, 120, 4],
            [h.cx - h.half - cw + 60, 520, 3],
            [h.cx + h.half - 30, 520, -3],
          ]
        : F === "S"
          ? [
              [30, 170, -6],
              [W - cw - 30, 130, 5],
              [W / 2 - cw / 2, 40, -2],
              [W / 2 - cw / 2, 40, 2],
            ]
          : [
              [20, 300, -6],
              [W - cw - 20, 360, 5],
              [W / 2 - cw / 2 - 40, 150, -3],
              [W / 2 - cw / 2, 150, 2],
            ];
    if (F !== "H") matte(o.t0, o.t1);
    o.cards.forEach((c, i) => {
      const [x, y, r] = pos[i % pos.length];
      const d = el("div", "abs", behind, {
        left: px(x),
        top: px(y + LIFT),
        width: px(cw),
        background: "#fff",
        borderRadius: px(fs * 0.7),
        boxShadow: "0 14px 30px rgba(0,0,0,.4)",
        padding: px(fs * 0.8),
        boxSizing: "border-box",
        fontFamily: '"Helvetica Neue", Inter',
        color: "#151515",
        transform: `rotate(${r}deg)`,
      });
      const hd = el("div", "", d, { display: "flex", alignItems: "center", gap: px(fs * 0.5) });
      el(
        "div",
        "",
        hd,
        {
          width: px(fs * 2),
          height: px(fs * 2),
          borderRadius: px(fs * 0.4),
          background: "#1f1f1f",
          flex: "0 0 auto",
          color: Y,
          fontWeight: 800,
          fontSize: px(fs * 0.9),
          lineHeight: px(fs * 2),
          textAlign: "center",
        },
        "&lt;/&gt;",
      );
      el(
        "div",
        "",
        hd,
        { fontWeight: 700, fontSize: px(fs * 1.05), lineHeight: 1.05, letterSpacing: "-.03em" },
        c.title,
      );
      if (c.salary)
        el(
          "div",
          "",
          d,
          {
            display: "inline-block",
            marginTop: px(fs * 0.5),
            background: Y,
            fontFamily: '"Special Elite"',
            fontSize: px(fs * 1.05),
            padding: `2px ${fs * 0.35}px`,
          },
          c.salary,
        );
      const ch = el("div", "", d, {
        display: "flex",
        flexWrap: "wrap",
        gap: px(fs * 0.3),
        marginTop: px(fs * 0.5),
      });
      (c.chips || []).forEach((t) =>
        el(
          "span",
          "",
          ch,
          {
            border: "2px solid #1f1f1f",
            borderRadius: px(fs),
            padding: `${fs * 0.12}px ${fs * 0.45}px`,
            fontSize: px(fs * 0.72),
            fontWeight: 600,
          },
          t,
        ),
      );
      tl.set(d, { autoAlpha: 0 }, -0);
      tl.set(d, { autoAlpha: 1 }, c.t);
      tl.fromTo(
        d,
        { scale: 0.3, y: 60 },
        { scale: 1, y: 0, duration: 0.32, ease: "back.out(1.8)", immediateRender: false },
        c.t,
      );
      cue(c.t, "pop", 0.7);
      tl.set(d, { autoAlpha: 0 }, o.t1);
    });
  }

  E.D = {
    Y,
    INK,
    G,
    FH,
    MT,
    LIFT,
    tw,
    ws,
    piece,
    wAt,
    wEnd,
    cam,
    head,
    cover,
    fillPills,
    big,
    side,
    clockBeat,
    navyList,
    paper,
    group,
    OFFICE,
    phone,
    question,
    offer,
    offerWall,
    mediaPut,
  };
})();
