/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// X25 — "cuando depende de ti, tienes que conocerte, dedicar tiempo a tu desarrollo personal": the brand knight alone on a
// dark chessboard under a spotlight; rings of light pulse out on "conocerte"; it rises on a growing stack of green rings.
(function () {
  const x = new XMLHttpRequest();
  x.open("GET", "../scenes/_fc.js", false);
  x.send();
  (0, eval)(x.responseText);
})();
FC.load();
L.scene({ bg: "none" });
const tD = L.at("depende") - 0.05,
  tC = L.at("conocerte") - 0.05,
  tDe = L.at("desarrollo") - 0.05;
L.three(async (T, S) => {
  const K = await FC.stage(T, S, { grid: false });
  const board = FC.board(T, { s: 0.95, y: K.floorY + 0.06 });
  S.scene.add(board);
  const kn = PIL.knight(
    T,
    K.yellow({ emissive: 0x3ac043, emissiveIntensity: 0.15, roughness: 0.16, metalness: 0.7 }),
  );
  S.scene.add(kn);
  const ray = PIL.ray(T, S, new T.Vector3(0, K.floorY, 0), { h: 10, r: 2.2, peak: 0.06 });
  const rings = [...Array(4)].map(() => {
    const m = new T.Mesh(
      new T.TorusGeometry(1, 0.011, 10, 128),
      new T.MeshBasicMaterial({ color: 0xaed916, transparent: true, opacity: 0 }),
    );
    m.rotation.x = Math.PI / 2;
    S.scene.add(m);
    return m;
  });
  const steps = [...Array(4)].map((_, i) => {
    const m = new T.Mesh(
      new T.CylinderGeometry(0.95 - i * 0.08, 1.0 - i * 0.08, 0.22, 64),
      FC.green(T, { emissiveIntensity: 0.25 }),
    );
    S.scene.add(m);
    return m;
  });
  S.on((t) => {
    ray.material.opacity = 0.06 * L.p(t, 0, 0.4);
    let lift = 0;
    steps.forEach((m, i) => {
      const u = L.ease.outBack(L.p(t, tDe - 0.15 + i * 0.1, tDe + 0.2 + i * 0.1), 1.6);
      m.scale.set(1, Math.max(0.001, u), 1);
      m.position.y = K.floorY + 0.12 + 0.11 + i * 0.22;
      m.visible = u > 0;
      lift += 0.22 * Math.max(0, Math.min(1, u));
    });
    const a = L.ease.outBack(L.p(t, 0.05, 0.6), 1.5);
    kn.position.set(0, K.floorY + 0.12 + lift, 0);
    kn.scale.setScalar(1.0 * Math.max(0.001, a));
    kn.rotation.y = -0.35 + Math.sin(t * 0.7) * 0.25 + (1 - a) * 2;
    rings.forEach((m, i) => {
      const u = L.p(t, tC + i * 0.22, tC + i * 0.22 + 1.1);
      m.position.y = K.floorY + 0.2;
      m.scale.setScalar(0.8 + u * 5);
      m.material.opacity = u <= 0 || u >= 1 ? 0 : 0.8 * (1 - u);
    });
  });
  K.cam(
    [
      [0, [6.5, 3.4, 9.5, 0, -0.9, 0, 36]],
      [tD, [4.0, 1.6, 9.2, 0, -0.8, 0, 36]],
      [tC, [-1.8, 0.9, 8.6, 0, -0.6, 0, 36]],
      [L.dur, [-4.6, 1.6, 7.6, 0, -0.3, 0, 36]],
    ],
    L.ease.inOutCubic,
  );
  S.on((t) => K.focus(S.camera.position.distanceTo(kn.position)));
});
L.tw({
  x: 960,
  y: 64,
  size: 52,
  anchor: "c",
  lines: [
    [
      { t: "Depende de ", at: L.at("depende") - 0.05 },
      { hl: "TI", at: L.at("ti") },
    ],
  ],
});
L.tw({
  x: 960,
  y: 980,
  size: 44,
  anchor: "c",
  lines: [
    [
      { t: "Conócete. ", at: L.at("conocerte") },
      { hl: "DESARRÓLLATE", at: L.at("desarrollo") },
    ],
  ],
});
