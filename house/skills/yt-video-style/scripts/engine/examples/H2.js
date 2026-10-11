L.scene();
L.heroCam(SLOTS.H2.zoom);
// positions measured on the Seedance clip itself (it pushes in): panel at t≈1.8, car t 3.7, plane t 4.56, palm t 6.68
L.tw({
  x: 960,
  y: 190,
  size: 62,
  anchor: "c",
  color: "#2a1a08",
  out: 3.55,
  lines: [
    [
      { t: "El trading ", at: L.at("primero") },
      { hl: "NO ES", at: L.at("no") },
    ],
  ],
});
const X = (x, y, w, lab, out) => {
  L.cross({ x, y, s: 190, t: L.at(w), out });
  L.slab({ text: lab, t: L.at(w), out, x, y: y + 150, size: 58, sfx: "pop", anim: "pop" });
};
X(690, 735, "coches", "coches", L.at("coches") + 1.3);
X(945, 700, "viajes", "viajes", L.at("viajes") + 1.25);
X(1296, 660, "playa", "playa", L.dur);
