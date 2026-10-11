/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// X22 — HERO PILLARS: "un formador… que te enseñe estructura, orden y gestión". A floating METODOLOGÍA roof with the brand
// knight hovers unsupported; three pillars rise under it on each word and it settles on the last one.
(function () {
  for (const f of ["_3dkit", "_pillars"]) {
    const x = new XMLHttpRequest();
    x.open("GET", "../scenes/" + f + ".js", false);
    x.send();
    (0, eval)(x.responseText);
  }
})();
L.scene({ bg: "none" });
const tE = L.at("estructura") - 0.05,
  tO = L.at("orden") - 0.05,
  tG = L.at("gestión") - 0.05;
L.three(async (T, S) => {
  const K = await K3.init(T, S, PIL.stage);
  const P = await PIL.build(T, S, K, {
    names: ["ESTRUCTURA", "ORDEN", "GESTIÓN"],
    rise: [tE - 0.15, tO - 0.15, tG - 0.12],
    lit: [tE + 0.1, tO + 0.1, tG + 0.1],
    spacing: 3.9,
    wordSize: 60,
    roof: { t: 0.15, settle: tG + 0.32, text: "METODOLOGÍA", textT: 0.5, size: 46 },
    knight: { t: 0.45 },
  });
  // camera: low dolly-in under the floating roof, crane up as pillars arrive, punch on the settle
  K.cam(
    [
      [0, [-4.2, 3.4, 13.5, 0, 3.6, 0, 36]],
      [tE - 0.2, [-3.2, 1.2, 15.5, 0, 2.3, 0, 38]],
      [tO, [1.8, 0.9, 15.2, 0, 2.2, 0, 38]],
      [tG + 0.3, [0.6, 1.4, 16.0, 0, 2.4, 0, 38]],
      [L.dur, [0, 1.8, 14.8, 0, 2.6, 0, 38]],
    ],
    L.ease.inOutCubic,
    [
      [tE - 0.05, 0.06, 0.35],
      [tO - 0.05, 0.06, 0.35],
      [tG - 0.05, 0.06, 0.35],
      [P.settle, 0.16, 0.5],
    ],
  );
  S.on((t) => K.focus(S.camera.position.distanceTo(new T.Vector3(0, 1, 0))));
});
L.tw({
  x: 960,
  y: 978,
  size: 46,
  anchor: "c",
  lines: [
    [
      { t: "Un formador que te dé ", at: L.at("formador") - 0.05 },
      { hl: "MÉTODO", at: L.at("enseñe") },
    ],
  ],
});
