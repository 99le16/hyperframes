// Papel motion-ad engine (ref: IG DXG8nysjHqQ). Camera jump-zooms, words behind the head (matte), caption pills,
// full-screen paper scenes: typewriter titles with stamped yellow highlights, spiral notepad cards, cut-outs with yellow outline,
// yellow clock, phone in hands. Everything is built synchronously on one paused GSAP timeline; SFX cues logged to window.__sfx.
// SFX cue kinds (mapped to sounds by scripts/mix.py): whoosh (big, scene entries) · swoosh (soft) · click (the ONE click, only the
// biggest words) · pop · paper (card/scene paper: wave + pop) · tick / tock · cut (camera jump: swoosh only if nothing else lands)
// · zoomin · sub · type (only the first typewriter run of the piece gets real, quiet typing; later runs swoosh).
(function () {
  const C = window.HF,
    W = C.W || 1080,
    H = C.H || 1920;
  const root = document.getElementById("root");
  const tl = gsap.timeline({ paused: true });
  const SFX = (window.__sfx = []);
  const cue = (t, kind, gain) => SFX.push({ t: +(+t).toFixed(3), kind, gain: gain ?? 1 });
  let seed = 777;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const px = (n) => n + "px";
  function el(tag, cls, parent, css, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) Object.assign(e.style, css);
    if (html != null) e.innerHTML = html;
    (parent || root).appendChild(e);
    return e;
  }
  const norm = (s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9%]/g, "");
  function at(word, after = 0, which = "s") {
    const w = C.words.find((x) => x.s >= after - 1e-6 && norm(x.w) === norm(word));
    if (!w) throw new Error("word not found: " + word + " after " + after);
    return w[which];
  }
  // words of the take between [t0,t1)
  const wordsIn = (t0, t1) => C.words.filter((w) => w.s >= t0 - 1e-6 && w.s < t1 - 1e-6);

  // visibility helpers: hard cuts like the ref
  function show(e, t0, t1) {
    tl.set(e, { autoAlpha: 0 }, 0);
    tl.set(e, { autoAlpha: 1 }, t0);
    if (t1 != null) tl.set(e, { autoAlpha: 0 }, t1);
  }

  // ---------- layers ----------
  const camIn = document.getElementById("camIn"),
    cutIn = document.getElementById("cutIn");
  [camIn, cutIn].forEach((e) => {
    e.style.width = px(W);
    e.style.height = px(H);
  });
  const cutLayer = document.getElementById("cutLayer");
  const behind = el("div", "layer", root, { zIndex: 20 });
  const front = el("div", "layer", root, { zIndex: 40 });
  const scenes = el("div", "layer", root, { zIndex: 60 });
  const caps = el("div", "layer", root, { zIndex: 80 });
  el("div", "", root).id = "grain";

  // ---------- camera: jump zooms around the face + slow push inside each shot ----------
  const pieceAt = (t) =>
    C.pieces.find((p) => t >= p.t0 - 1e-6 && t < p.t1 - 1e-6) || C.pieces[C.pieces.length - 1];
  let LIFT = 0; // safe-area lift: camera stretches (behind/front texts + the camera itself) move down by LIFT px
  const setLift = (v) => {
    LIFT = v;
  };
  const SHOTS = [];
  function shot(t, z, o = {}) {
    SHOTS.push(Object.assign({ t, z, push: 1.035 }, o));
  }
  function buildShots() {
    SHOTS.sort((a, b) => a.t - b.t);
    SHOTS.forEach((s, i) => {
      const end = i + 1 < SHOTS.length ? SHOTS[i + 1].t : C.DUR;
      const p = pieceAt(s.t + 0.01);
      const fy = s.fy ?? p.fy,
        fx = s.fx ?? p.fx;
      if (LIFT) {
        s.z = s.z + LIFT / fy + 0.01;
        s.dy = (s.dy || 0) + LIFT;
      }
      const tgt = [camIn, cutIn];
      if (i > 0) cue(s.t, "cut", 0.4);
      tl.set(
        tgt,
        { scale: s.z, x: s.dx || 0, y: s.dy || 0, transformOrigin: `${fx}px ${fy}px` },
        s.t,
      );
      tl.to(tgt, { scale: s.z * s.push, duration: Math.max(0.05, end - s.t), ease: "none" }, s.t);
    });
  }
  // matte (person cut-out) on top of the behind layer
  function matte(t0, t1) {
    tl.set(cutLayer, { opacity: 1 }, t0);
    tl.set(cutLayer, { opacity: 0 }, t1);
  }
  tl.set(cutLayer, { opacity: 0 }, 0);

  // ---------- text blocks ----------
  // word(parent, {text, t, cls, size, x, y, color, anim}) : one absolutely positioned run, appears at t
  function txt(parent, o) {
    const ly = (parent === behind || parent === front) && o.lift !== false ? LIFT : 0;
    const e = el(
      "div",
      "abs " + (o.cls || "hv"),
      parent,
      Object.assign(
        { left: px(o.x), top: px(o.y + ly), fontSize: px(o.size), color: o.color || "#fff" },
        o.css || {},
      ),
      o.html ?? o.text,
    );
    if (o.anchor === "c") e.style.transform = "translateX(-50%)";
    if (o.anchor === "r") e.style.transform = "translateX(-100%)";
    tl.set(e, { autoAlpha: 0 }, 0);
    const a = o.anim || "cut";
    if (a === "cut") tl.set(e, { autoAlpha: 1 }, o.t);
    else if (a === "pop") {
      tl.set(e, { autoAlpha: 1 }, o.t);
      tl.fromTo(
        e,
        { scale: 0.86, filter: "blur(6px)" },
        {
          scale: 1,
          filter: "blur(0px)",
          duration: 0.16,
          ease: "back.out(2)",
          immediateRender: false,
        },
        o.t,
      );
    } else if (a === "rise") {
      tl.set(e, { autoAlpha: 1 }, o.t);
      tl.fromTo(
        e,
        { yPercent: 35, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.2, ease: "power3.out", immediateRender: false },
        o.t,
      );
    }
    if (o.sfx) cue(o.t, o.sfx, 1);
    if (o.out != null) tl.set(e, { autoAlpha: 0 }, o.out);
    return e;
  }
  // a line built word-by-word in sync with the voice: each word appears at its own spoken start
  function line(parent, o) {
    const ws = o.words; // [{w, t}]
    const ly = (parent === behind || parent === front) && o.lift !== false ? LIFT : 0;
    const e = el(
      "div",
      "abs " + (o.cls || "hvs"),
      parent,
      Object.assign(
        { left: px(o.x), top: px(o.y + ly), fontSize: px(o.size), color: o.color || "#fff" },
        o.css || {},
      ),
    );
    if (o.anchor === "c") e.style.transform = "translateX(-50%)";
    if (o.anchor === "r") e.style.transform = "translateX(-100%)";
    ws.forEach((w, i) => {
      const s = el("span", "w", e, null, w.w + (i < ws.length - 1 ? "&nbsp;" : ""));
      tl.set(s, { opacity: 0 }, 0);
      tl.set(s, { opacity: 1 }, w.t);
    });
    if (o.out != null) tl.set(e, { autoAlpha: 0 }, o.out);
    return e;
  }
  const W_ = (list, after) => {
    // ['hoy','puedes',...] -> [{w,t}] using the take's timing
    let a = after;
    return list.map((w) => {
      const t = at(w.replace(/[¿?¡!:]/g, ""), a);
      a = t + 0.01;
      return { w, t };
    });
  };

  // ---------- caption pills ----------
  function pill(t0, t1, text) {
    const e = el("div", "pill", caps, { left: px(W / 2), top: px(C.PILLY || 1277) }, text);
    tl.set(e, { autoAlpha: 0 }, 0);
    tl.set(e, { autoAlpha: 1 }, t0);
    tl.fromTo(
      e,
      { scale: 0.9 },
      { scale: 1, duration: 0.1, ease: "power2.out", immediateRender: false },
      t0,
    );
    tl.set(e, { autoAlpha: 0 }, t1);
  }
  // auto pills over [t0,t1): chunks of <= maxw words / maxc chars, a chunk lasts until the next starts
  function pills(t0, t1, o = {}) {
    const ws = wordsIn(t0, t1),
      maxc = o.maxc || 15,
      out = [];
    let cur = [];
    ws.forEach((w) => {
      const txt_ = cur
        .map((x) => x.w)
        .concat(w.w)
        .join(" ");
      const brk =
        cur.length &&
        (txt_.length > maxc || cur.length >= (o.maxw || 3) || /[.,]$/.test(cur[cur.length - 1].w));
      if (brk) {
        out.push(cur);
        cur = [];
      }
      cur.push(w);
    });
    if (cur.length) out.push(cur);
    out.forEach((c, i) => {
      const s = c[0].s,
        e = i + 1 < out.length ? out[i + 1][0].s : Math.min(t1, c[c.length - 1].e + 0.35);
      pill(s, e, c.map((x) => x.w.replace(/[.,]$/, "")).join(" "));
    });
  }

  let typedOnce = false;
  // ---------- typewriter title ----------
  // lines: [[{t:'Three things your', at}, {hl:'ANSWER FAST', at}], ...]  chars of a plain run type out from `at` at cps
  function type(parent, o) {
    const box = el("div", "tw", parent, {
      left: px(o.x),
      top: px(o.y),
      fontSize: px(o.size || 60),
      color: o.color || "#eeeeea",
      textAlign: o.align || "left",
    });
    if (o.anchor === "c") box.style.transform = "translateX(-50%)";
    const cps = o.cps || 26;
    o.lines.forEach((ln) => {
      const d = el("div", "", box);
      ln.forEach((run) => {
        if (run.hl) {
          const h = el("span", "hl", d, null, run.hl);
          tl.set(h, { opacity: 0 }, 0);
          tl.set(h, { opacity: 1 }, run.at);
          tl.fromTo(
            h,
            { scaleX: 0.2, transformOrigin: "0 50%" },
            { scaleX: 1, duration: 0.12, ease: "power2.out", immediateRender: false },
            run.at,
          );
          cue(run.at, run.sfx || "swoosh", 0.5);
        } else {
          [...run.t].forEach((ch, i) => {
            const c = el("span", "c", d, null, ch === " " ? "&nbsp;" : ch);
            tl.set(c, { opacity: 1 }, run.at + i / cps);
          });
          if (!typedOnce) {
            cue(run.at, "type", 0.55);
            cue(run.at + run.t.length / cps, "type_end");
            typedOnce = true;
          } else cue(run.at - 0.05, "swoosh", 0.5);
        }
      });
    });
    return box;
  }

  // ---------- notepad card ----------
  function card(parent, o) {
    const c = el(
      "div",
      "card",
      parent,
      {
        left: px(o.x),
        top: px(o.y),
        width: px(o.w),
        height: px(o.h),
        fontSize: px(o.size || 44),
        transform: `rotate(${o.rot || 0}deg)`,
      },
      `<span>${o.text}</span>`,
    );
    c.style.setProperty("--cbg", o.bgc || "#16212f");
    const sp = el("div", "spiral", c);
    for (let i = 0; i < (o.rings || 11); i++) el("i", "", sp);
    el("div", "foldcut", c);
    el("div", "fold", c);
    tl.set(c, { autoAlpha: 0 }, 0);
    tl.set(c, { autoAlpha: 1 }, o.t);
    tl.fromTo(
      c,
      { scale: 0.6, rotation: (o.rot || 0) - 8, y: 40 },
      {
        scale: 1,
        rotation: o.rot || 0,
        y: 0,
        duration: 0.28,
        ease: "back.out(1.8)",
        immediateRender: false,
      },
      o.t,
    );
    cue(o.t, "paper", 0.8);
    if (o.num) {
      const n = el(
        "div",
        "num",
        parent,
        {
          left: px(o.x + (o.numdx ?? 20)),
          top: px(o.y - (o.numdy ?? 92)),
          fontSize: px(o.numsize || 84),
        },
        o.num,
      );
      tl.set(n, { autoAlpha: 0 }, 0);
      tl.set(n, { autoAlpha: 1 }, o.t - 0.12);
      tl.fromTo(
        n,
        { scale: 0.5 },
        { scale: 1, duration: 0.18, ease: "back.out(2.4)", immediateRender: false },
        o.t - 0.12,
      );
    }
    return c;
  }

  // ---------- cut-out image ----------
  // anim: 'pop' (scale from 0 w/ overshoot) | 'rise' (slides up from below the frame) | 'drop' | 'cut'
  function cutout(parent, o) {
    const e = el(
      "div",
      "cut",
      parent,
      {
        left: px(o.x),
        top: px(o.y),
        width: px(o.w),
        zIndex: o.z || 2,
        transformOrigin: o.origin || "50% 100%",
      },
      `<img src="${o.src}">`,
    );
    const img = e.firstChild;
    if (o.outline) img.style.filter = outlineF(o.outline, o.ow || 5);
    if (o.gray) img.style.filter = (img.style.filter || "") + " grayscale(1) contrast(1.1)";
    if (o.shadow)
      img.style.filter = (img.style.filter || "") + " drop-shadow(0 14px 18px rgba(0,0,0,.35))";
    tl.set(e, { autoAlpha: 0, rotation: o.rot || 0 }, 0);
    tl.set(e, { autoAlpha: 1 }, o.t);
    const a = o.anim || "pop";
    if (a === "pop") {
      tl.fromTo(
        e,
        { scale: 0 },
        { scale: 1, duration: 0.3, ease: "back.out(2.2)", immediateRender: false },
        o.t,
      );
      cue(o.t, "pop", 0.7);
    }
    if (a === "rise") {
      tl.fromTo(
        e,
        { y: o.riseFrom || 900 },
        { y: 0, duration: o.riseDur || 0.55, ease: "expo.out", immediateRender: false },
        o.t,
      );
      cue(o.t, "whoosh", 0.6);
    }
    if (a === "drop") {
      tl.fromTo(
        e,
        { y: -260, scale: 1.15 },
        { y: 0, scale: 1, duration: 0.32, ease: "bounce.out", immediateRender: false },
        o.t,
      );
      cue(o.t + 0.02, "pop", 0.7);
    }
    if (o.float)
      tl.to(
        e,
        {
          y: "-=" + o.float,
          rotation: (o.rot || 0) + 3,
          duration: 1.6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: 5,
        },
        o.t + 0.35,
      );
    if (o.out != null) tl.set(e, { autoAlpha: 0 }, o.out);
    return e;
  }
  function outlineF(c, w) {
    const d = [];
    for (let a = 0; a < 360; a += 45) {
      const r = (a * Math.PI) / 180;
      d.push(
        `drop-shadow(${(Math.cos(r) * w).toFixed(1)}px ${(Math.sin(r) * w).toFixed(1)}px 0 ${c})`,
      );
    }
    return d.join(" ");
  }

  // ---------- full-screen scene ----------
  function scene(t0, t1, o = {}) {
    const s = el("div", "layer", scenes, { background: o.color || "#111", zIndex: o.z || 1 });
    if (o.bg)
      el("img", "", s, {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }).src = o.bg;
    show(s, t0, t1);
    if (o.sfx !== false) cue(t0, o.sfx || "whoosh", 0.8);
    return s;
  }

  // ---------- yellow clock behind the head ----------
  function clock(parent, o) {
    const r = o.r,
      cx = o.x,
      cy = o.y + (parent === behind || parent === front ? LIFT : 0);
    let ticks = "";
    for (let i = 0; i < 60; i++) {
      const a = (i * 6 * Math.PI) / 180,
        l = i % 5 ? 0.06 : 0.12,
        w = i % 5 ? 4 : 9;
      ticks += `<line x1="${(Math.sin(a) * r * 0.86).toFixed(1)}" y1="${(-Math.cos(a) * r * 0.86).toFixed(1)}" x2="${(Math.sin(a) * r * (0.86 - l)).toFixed(1)}" y2="${(-Math.cos(a) * r * (0.86 - l)).toFixed(1)}" stroke="#111" stroke-width="${w}"/>`;
    }
    const svg = `<svg width="${2 * r}" height="${2 * r}" viewBox="${-r} ${-r} ${2 * r} ${2 * r}" style="overflow:visible">
      <circle r="${r * 0.985}" fill="#111"/><circle r="${r * 0.93}" fill="${o.color || "#FAF400"}"/>${ticks}
      <g class="hh"><rect x="-6" y="${-r * 0.5}" width="12" height="${r * 0.56}" rx="6" fill="#111"/></g>
      <g class="mh"><rect x="-4" y="${-r * 0.74}" width="8" height="${r * 0.8}" rx="4" fill="#111"/></g>
      <g class="sh"><rect x="-1.5" y="${-r * 0.8}" width="3" height="${r * 0.9}" fill="#111"/></g></svg>`;
    const e = el(
      "div",
      "abs",
      parent,
      { left: px(cx - r), top: px(cy - r), width: px(2 * r), height: px(2 * r) },
      svg,
    );
    tl.set(e, { autoAlpha: 0 }, 0);
    tl.set(e, { autoAlpha: 1 }, o.t);
    tl.fromTo(
      e,
      { scale: 0.2, rotation: -40 },
      { scale: 1, rotation: 0, duration: 0.35, ease: "back.out(1.7)", immediateRender: false },
      o.t,
    );
    const d = o.out - o.t;
    tl.fromTo(
      e.querySelector(".mh"),
      { rotation: 0 },
      {
        rotation: 360 * 2.2,
        duration: d,
        ease: "power1.inOut",
        svgOrigin: "0 0",
        immediateRender: false,
      },
      o.t,
    );
    tl.fromTo(
      e.querySelector(".hh"),
      { rotation: 20 },
      {
        rotation: 200,
        duration: d,
        ease: "power1.inOut",
        svgOrigin: "0 0",
        immediateRender: false,
      },
      o.t,
    );
    tl.fromTo(
      e.querySelector(".sh"),
      { rotation: 0 },
      { rotation: 360 * 4, duration: d, ease: "none", svgOrigin: "0 0", immediateRender: false },
      o.t,
    );
    tl.set(e, { autoAlpha: 0 }, o.out);
    cue(o.t, "pop", 0.7);
    let n = 0;
    for (let k = o.t + 0.27; k < o.out - 0.1; k += 0.45) cue(k, n++ % 2 ? "tock" : "tick", 1);
    return e;
  }

  // hand-drawn svg stroke (arrow / scribble / strike) drawn on over dur
  function stroke(parent, o) {
    const ly = (parent === behind || parent === front) && o.lift !== false ? LIFT : 0;
    const s = el(
      "div",
      "abs",
      parent,
      { left: 0, top: px(ly), width: px(W), height: px(H), zIndex: o.z || 5 },
      `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path d="${o.d}" fill="none" stroke="${o.color || "#111"}" stroke-width="${o.w || 6}" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    );
    const p = s.querySelector("path");
    const len = p.getTotalLength ? p.getTotalLength() : 2000;
    p.style.strokeDasharray = len;
    tl.set(s, { autoAlpha: 0 }, 0);
    tl.set(s, { autoAlpha: 1 }, o.t);
    tl.fromTo(
      p,
      { strokeDashoffset: len },
      { strokeDashoffset: 0, duration: o.dur || 0.3, ease: "power1.inOut", immediateRender: false },
      o.t,
    );
    if (o.sfx !== false) cue(o.t - 0.05, o.sfx || "swoosh", 0.5);
    if (o.out != null) tl.set(s, { autoAlpha: 0 }, o.out);
    return s;
  }

  window.E = {
    setLift,
    C,
    W,
    H,
    F: C.F || "V",
    L: (v, sq, h) => ((C.F || "V") === "V" ? v : C.F === "S" ? sq : h),
    tl,
    el,
    px,
    at,
    wordsIn,
    W_,
    cue,
    rnd,
    show,
    behind,
    front,
    scenes,
    caps,
    shot,
    buildShots,
    matte,
    txt,
    line,
    pill,
    pills,
    type,
    card,
    cutout,
    scene,
    clock,
    stroke,
    outlineF,
  };
})();
