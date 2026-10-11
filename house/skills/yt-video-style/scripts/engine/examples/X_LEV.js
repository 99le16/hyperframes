/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// X_LEV — "mi primera recomendación… el apalancamiento de las firmas propietarias" (replaces the vault illustration):
// a long 3D lever on a fulcrum; one small green coin on the long arm lifts a huge stack of gold coins on the short arm.
(function () {
  for (const f of ["_3dkit", "_xb"]) {
    const x = new XMLHttpRequest();
    x.open("GET", "../scenes/" + f + ".js", false);
    x.send();
    (0, eval)(x.responseText);
  }
})();
L.scene({ bg: "none" });
const tR = L.at("recomendación"),
  tU = L.at("utilices"),
  tA = L.at("apalancamiento"),
  tF = L.at("firmas");
L.three(async (T, S) => {
  const K = await XB.stage(T, S, { seed: 21 });
  const piv = new T.Vector3(2.2, K.floorY + 1.55, 0);
  const ful = new T.Mesh(new T.ConeGeometry(1.0, 1.6, 3), K.chrome({ roughness: 0.15 }));
  ful.position.set(piv.x, K.floorY + 0.8, 0);
  ful.rotation.y = Math.PI / 2;
  S.scene.add(ful);
  const arm = new T.Group();
  arm.position.copy(piv);
  S.scene.add(arm);
  const beam = new T.Mesh(new T.BoxGeometry(11, 0.28, 1.3), XB.green());
  beam.position.x = -2.3;
  arm.add(beam); // long arm to the left (x -7.8), short to the right (x +3.2)
  const edge = new T.Mesh(
    new T.BoxGeometry(11.04, 0.05, 1.34),
    new T.MeshBasicMaterial({ color: 0xd5ff7a }),
  );
  edge.position.set(-2.3, 0.15, 0);
  arm.add(edge);
  const plate = new T.Mesh(new T.CylinderGeometry(1.15, 1.15, 0.12, 48), K.chrome());
  plate.position.set(2.4, 0.2, 0);
  arm.add(plate);
  const stack = new T.Group();
  stack.position.set(2.4, 0.26, 0);
  arm.add(stack);
  const cg = K.coinGeo(),
    gm = K.gold();
  for (let c = 0; c < 3; c++)
    for (let i = 0; i < 16; i++) {
      const m = new T.Mesh(cg, gm);
      m.position.set((c - 1) * 0.62 + Math.sin(i) * 0.03, i * 0.17, (c % 2) * 0.35 - 0.17);
      m.rotation.y = i;
      stack.add(m);
    }
  const coin = new T.Mesh(cg, XB.lime());
  coin.scale.setScalar(1.25);
  arm.add(coin);
  S.on((t) => {
    const d = L.ease.outBounce ? 0 : 0;
    const drop = L.p(t, tU - 0.2, tU + 0.35),
      dropE = drop * drop; // small coin falls onto the far end
    coin.position.set(-7.3, 0.25 + (1 - dropE) * 6, 0);
    coin.rotation.set(0, t * 3, (1 - drop) * 1.2);
    const lift = L.ease.outBack(L.p(t, tU + 0.3, tA + 0.2), 1.1); // lever tips: long arm down, load up
    arm.rotation.z = L.lerp(-0.17, 0.19, lift) + Math.sin(t * 7) * 0.006 * (1 - lift);
    stack.scale.setScalar(Math.max(0.001, L.ease.outBack(L.p(t, 0.05, 0.6))));
  });
  K.flash(new T.Vector3(-5.2, K.floorY + 0.4, 0), {
    t0: tU + 0.32,
    d: 0.45,
    size: 3,
    color: 0xd5ff7a,
  });
  K.cam(
    [
      [0, [6.5, 2.4, 13, 1.5, 0.4, 0]],
      [tU, [1, 2.0, 14, -1.2, 0.2, 0]],
      [tA, [2.4, 3.8, 13.5, 0, 1.4, 0]],
      [L.dur, [2.0, 4.4, 13.8, -0.2, 1.8, 0]],
    ],
    L.ease.inOutSine,
    [
      [tU + 0.33, 0.14, 0.4],
      [tA + 0.05, 0.08, 0.3],
    ],
  );
  XB.tag(
    () => coin.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.9, 0)),
    "TU EVALUACIÓN",
    tU + 0.4,
    { size: 30, color: "#e6ffc2" },
  );
  XB.tag(
    () => stack.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 3.2, 0)),
    "Capital de la firma",
    tF,
    { cls: "hv", size: 52, color: "#fff" },
  );
  S.on(() => K.focus(S.camera.position.distanceTo(piv)));
});
L.tw({
  x: 960,
  y: 66,
  size: 56,
  anchor: "c",
  lines: [
    [
      { t: "Recomendación ", at: tR - 0.3 },
      { hl: "#1", at: tR + 0.3 },
    ],
  ],
});
L.tw({ x: 960, y: 136, size: 64, anchor: "c", lines: [[{ hl: "APALANCAMIENTO", at: tA }]] });
