// I30 — real channel video: "La VERDAD sobre las Prop Firms: Elige Bien Antes de PAGAR" (S0VdP9F4Qfg, 10:17)
L.scene();
const SH = ((window.SLOTS[L.id] || {}).shots || []).map((s) => s.t);
const S0 = (t) => {
  let b = 0;
  for (const s of SH) if (s <= t + 0.12) b = s;
  return b;
};
const T = (t) => Math.max(t, S0(t) + 0.02);
const C = (ws, t) => ws.map(([w, x]) => [w, Math.max(x, S0(t) + 0.02)]);
const a = T(L.at("firmas") - 0.03),
  c = T(L.at("funcionan") - 0.03);
L.big({
  text: "firmas",
  t: a,
  size: 290,
  keep: true,
  sfx: "swoosh",
  line: C(L.say("si", "las"), a),
});
L.videoCard({
  x: 1310,
  y: 90,
  w: 520,
  title: "La VERDAD sobre las Prop Firms: Elige Bien Antes de PAGAR",
  thumb: "../yt/S0VdP9F4Qfg.jpg",
  dur: "10:17",
  t: L.at("dejo") - 0.1,
  out: 7.35,
});
L.big({
  text: "funcionan",
  t: c,
  size: 280,
  keep: true,
  sfx: "swoosh",
  line: C(L.say("explicando", "cómo"), c),
});
