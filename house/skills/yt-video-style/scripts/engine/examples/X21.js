/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// X21 — "utilizar ese capital para fondear tu propia cuenta… de manera autónoma": coins stream from the FIRMA block to TU CUENTA.
(function () {
  for (const f of ["_3dkit", "_xb"]) {
    const x = new XMLHttpRequest();
    x.open("GET", "../scenes/" + f + ".js", false);
    x.send();
    (0, eval)(x.responseText);
  }
})();
L.scene({ bg: "none" });
const tC = L.at("capital"),
  tFo = L.at("fondear"),
  tCu = L.at("cuenta"),
  tG = L.at("gestionar"),
  tAu = L.at("autónoma");
L.three(async (T, S) => {
  const K = await XB.stage(T, S, { seed: 23 });
  const box = (x, w, h, mat) => {
    const g = new T.Group();
    g.position.set(x, K.floorY, 0);
    S.scene.add(g);
    const b = new T.Mesh(new T.BoxGeometry(w, h, w), mat);
    b.position.y = h / 2;
    g.add(b);
    const e = new T.LineSegments(
      new T.EdgesGeometry(new T.BoxGeometry(w, h, w)),
      new T.LineBasicMaterial({ color: 0xaed916 }),
    );
    e.position.y = h / 2;
    g.add(e);
    g.userData = { b, e, h, w };
    return g;
  };
  const F = box(-4.2, 2.6, 3.6, XB.glassG({ opacity: 0.5 })),
    A = box(4.2, 1.9, 2.4, XB.glassG({ opacity: 0.45 }));
  const fill = (g, n, seed) => {
    const st = K.stack({ x: g.position.x, z: 0, max: n, seed, count: () => 0, drop: 1 });
    return st;
  };
  const fS = K.stack({
    x: -4.2,
    z: 0,
    max: 18,
    seed: 31,
    count: (t) => 18 - 12 * L.ease.inOutCubic(L.p(t, tFo, tAu)),
    drop: 1,
  });
  const aS = K.stack({
    x: 4.2,
    z: 0,
    max: 14,
    seed: 32,
    count: (t) => 14 * L.ease.inOutCubic(L.p(t, tFo + 0.5, tAu + 0.3)),
    drop: 2,
  });
  const curve = new T.CatmullRomCurve3([
    new T.Vector3(-4.2, K.floorY + 3.9, 0),
    new T.Vector3(-1.5, K.floorY + 5.4, 0.4),
    new T.Vector3(1.5, K.floorY + 5.0, 0.4),
    new T.Vector3(4.2, K.floorY + 2.8, 0),
  ]);
  const tube = new T.Mesh(
    new T.TubeGeometry(curve, 100, 0.12, 12),
    new T.MeshBasicMaterial({ color: 0x3ac043, transparent: true, opacity: 0.55 }),
  );
  S.scene.add(tube);
  const tot = tube.geometry.index.count;
  const cg = K.coinGeo(),
    flyers = [...Array(14)].map(() => {
      const m = new T.Mesh(cg, K.gold());
      m.scale.setScalar(0.6);
      S.scene.add(m);
      return m;
    });
  S.on((t) => {
    tube.geometry.setDrawRange(
      0,
      Math.floor((tot * L.ease.inOutCubic(L.p(t, tC, tFo + 0.3))) / 3) * 3,
    );
    flyers.forEach((m, i) => {
      const u = ((t - tFo) * 0.55 + i / flyers.length) % 1;
      const on = t > tFo && t < tAu + 0.5;
      m.visible = on;
      if (on) {
        m.position.copy(curve.getPoint(u));
        m.rotation.set(t * 3 + i, t * 2, 0);
      }
    });
    F.scale.setScalar(Math.max(0.001, L.ease.outBack(L.p(t, 0.05, 0.5))));
    A.scale.setScalar(Math.max(0.001, L.ease.outBack(L.p(t, tCu - 0.3, tCu + 0.2))));
    const glow = L.p(t, tAu, tAu + 0.25);
    A.userData.e.material.color.setHex(glow > 0.5 ? 0xffffff : 0xaed916);
    A.userData.b.material.emissiveIntensity = 0.4 + 2.2 * glow;
  });
  K.cam(
    [
      [0, [-6, 3, 14, -2.5, 1.6, 0]],
      [tFo, [0, 3.6, 16.5, 0, 2.0, 0]],
      [L.dur, [3.5, 3.4, 15, 1.4, 1.8, 0]],
    ],
    L.ease.inOutSine,
    [[tAu + 0.05, 0.08, 0.3]],
  );
  XB.tag(() => new T.Vector3(-4.2, K.floorY + 0.1, 2.0), "FIRMA", 0.4, {
    cls: "hv",
    size: 56,
    color: "#fff",
  });
  XB.tag(() => new T.Vector3(4.2, K.floorY + 0.1, 1.6), "TU CUENTA", tCu, {
    cls: "hv",
    size: 56,
    color: "#fff",
  });
  S.on(() => K.focus(S.camera.position.distanceTo(new T.Vector3(0, 1, 0))));
});
L.tw({
  x: 960,
  y: 70,
  size: 58,
  anchor: "c",
  lines: [
    [
      { t: "Fondea tu ", at: tFo - 0.1 },
      { hl: "PROPIA CUENTA", at: tCu },
    ],
  ],
});
L.tw({
  x: 960,
  y: 140,
  size: 44,
  anchor: "c",
  lines: [
    [
      { t: "de manera ", at: tG },
      { hl: "AUTÓNOMA", at: tAu },
    ],
  ],
});
