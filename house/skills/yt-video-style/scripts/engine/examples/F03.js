/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// F03 — "Tu hoja de ruta": the 6 steps as glossy 3D tiles on a reflective floor; the row slides to the step he names.
(function () {
  const x = new XMLHttpRequest();
  x.open("GET", "../scenes/_3dkit.js", false);
  x.send();
  (0, eval)(x.responseText);
})();
L.scene({ bg: "none" });
const tR = L.at("rentable"),
  tC = L.at("capitalizar"),
  tV = L.at("vivir");
L.three(async (T, S) => {
  const K = await K3.init(T, S, { aperture: 0.0011 });
  await K.carousel({
    active: [
      [0, 2.5],
      [tR - 0.3, 2.5],
      [tR + 0.3, 0],
      [tC - 0.3, 0],
      [tC + 0.3, 2],
      [tV - 0.3, 2],
      [tV + 0.3, 5],
      [L.dur, 5],
    ],
    appear: 0.1,
    spin: [
      [tR, 0],
      [tC, 2],
      [tV, 5],
    ],
  });
  K.dust(280);
  K.streaks(10);
  K.cam(
    [
      [0, [0, 5.5, 19, 0, -0.4, -2]],
      [tR - 0.2, [0, 2.4, 12.5, 0, 0, -2]],
      [tR + 0.4, [-0.6, 1.4, 9, 0, 0.2, -1]],
      [tC, [0.6, 1.6, 9.6, 0, 0.2, -1]],
      [tV, [-0.4, 1.2, 9.2, 0, 0.2, -1]],
      [L.dur, [0.4, 1.0, 8.4, 0, 0.25, -1]],
    ],
    L.ease.inOutCubic,
    [
      [tR + 0.02, 0.08, 0.3],
      [tC + 0.02, 0.08, 0.3],
      [tV + 0.02, 0.1, 0.35],
    ],
  );
  S.on((t) => K.focus(S.camera.position.distanceTo(new T.Vector3(0, 0.2, -0.6))));
});
K3UI.header("Tu hoja de", "RUTA", 0.1, 0.55);
L.tw({
  x: 960,
  y: 170,
  size: 40,
  anchor: "c",
  lines: [
    [
      { t: "rentable y ", at: tR },
      { hl: "CONSISTENTE", at: L.at("consistente") },
    ],
  ],
  out: tC - 0.1,
});
L.tw({
  x: 960,
  y: 170,
  size: 40,
  anchor: "c",
  lines: [
    [
      { t: "de ser rentable a ", at: tC },
      { hl: "VIVIR DEL TRADING", at: tV },
    ],
  ],
});
// name of the active step under the row
[
  [0.6, tR - 0.05, "6 pasos"],
  [tR, tC - 0.05, "#1 Estrategia"],
  [tC, tV - 0.05, "#3 Firmas propietarias"],
  [tV, L.dur, "#6 Vivir del trading"],
].forEach(([a, b, n]) => {
  const e = L.el(
    "div",
    "tw abs",
    L.world,
    {
      left: "960px",
      top: "850px",
      fontSize: "46px",
      transform: "translateX(-50%)",
      whiteSpace: "nowrap",
    },
    n,
  );
  L.env(e, a, b, { style: "rise", din: 0.3, dout: 0.15, base: "translateX(-50%)" });
});
