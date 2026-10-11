// _ytD.js — real YouTube suggestion card (Conquer Finance channel video): thumbnail + duration, avatar, title, channel ✓; slides in with a 3D turn, cursor clicks it.
window.YTD = ({ x = 1262, y = 96, w = 600, id, title, dur, t, out, click = true } = {}) => {
  const h = (w * 9) / 16;
  const wrap = L.el("div", "abs", L.world, {
    left: x + "px",
    top: y + "px",
    width: w + "px",
    perspective: "1400px",
  });
  const c = L.el("div", "", wrap, {
    width: w + "px",
    background: "rgba(15,15,15,.94)",
    borderRadius: "22px",
    padding: "14px 14px 18px",
    boxSizing: "border-box",
    boxShadow:
      "0 40px 90px rgba(0,0,0,.6), 0 0 0 1.5px rgba(174,217,22,.35), 0 0 40px rgba(58,192,67,.25)",
    transformOrigin: "100% 50%",
  });
  const th = L.el("div", "", c, {
    position: "relative",
    width: "100%",
    height: ((w - 28) * 9) / 16 + "px",
    borderRadius: "14px",
    overflow: "hidden",
    background: `url(../yt/${id}.jpg) center/cover`,
  });
  L.el(
    "div",
    "",
    th,
    {
      position: "absolute",
      right: "10px",
      bottom: "10px",
      background: "rgba(0,0,0,.82)",
      color: "#fff",
      borderRadius: "6px",
      padding: "3px 8px",
      font: '700 21px "Helvetica Neue", Inter, sans-serif',
    },
    dur,
  );
  const prog = L.el("div", "", th, {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: "5px",
    width: "0%",
    background: "#ff0033",
  });
  const row = L.el("div", "", c, {
    display: "flex",
    gap: "14px",
    marginTop: "14px",
    alignItems: "flex-start",
  });
  L.el("div", "", row, {
    flex: "none",
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    background: "url(../yt/cf_logo.png) center/cover #111",
    boxShadow: "0 0 0 2px rgba(174,217,22,.6)",
  });
  const col = L.el("div", "", row, { flex: 1, minWidth: 0 });
  L.el(
    "div",
    "",
    col,
    {
      color: "#f1f1f1",
      font: '700 27px/1.18 "Helvetica Neue", Inter, sans-serif',
      letterSpacing: "-.01em",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    },
    title,
  );
  L.el(
    "div",
    "",
    col,
    { color: "#aaaaaa", font: '500 21px "Helvetica Neue", Inter, sans-serif', marginTop: "6px" },
    'Conquer Finance <svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:-2px"><circle cx="12" cy="12" r="10" fill="#aaa"/><path d="M7 12.5l3 3 7-7" stroke="#0f0f0f" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
  );
  // cursor
  const cur = L.el(
    "div",
    "abs",
    L.world,
    { left: 0, top: 0, width: "46px", height: "46px", zIndex: 5 },
    '<svg width="46" height="46" viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.6L10 19z" fill="#fff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  );
  const tc = t + 0.75;
  L.sfx("whoosh", t);
  if (click) L.sfx("click", tc);
  L.on((tt) => {
    const u = L.ease.outCubic(L.p(tt, t, t + 0.55)),
      b = out == null ? 0 : L.ease.inCubic(L.p(tt, out - 0.3, out));
    const press = click ? Math.max(0, 1 - Math.abs(tt - tc) / 0.12) : 0;
    c.style.transform = `translateX(${(1 - u) * 260 + b * 120}px) rotateY(${(1 - u) * -38 + b * 20}deg) scale(${(1 - 0.03 * press) * (1 - 0.06 * b)})`;
    wrap.style.opacity = Math.min(1, u * 1.6) * (1 - b);
    const bl = (1 - u) * 10 + b * 10;
    wrap.style.filter = bl > 0.05 ? `blur(${bl}px)` : "none";
    prog.style.width = (click ? 100 * L.ease.inOutCubic(L.p(tt, tc, tc + 1.6)) * 0.35 : 0) + "%";
    const cu = L.ease.inOutCubic(L.p(tt, t + 0.2, tc)),
      cx = L.lerp(x + w + 120, x + w * 0.55, cu),
      cy = L.lerp(y + h + 240, y + h * 0.5, cu);
    cur.style.transform = `translate(${cx}px,${cy}px) scale(${1 - 0.18 * press})`;
    cur.style.opacity = click
      ? L.p(tt, t + 0.15, t + 0.35) * (1 - L.p(tt, tc + 0.6, tc + 0.9)) * (1 - b)
      : 0;
  });
  return wrap;
};
