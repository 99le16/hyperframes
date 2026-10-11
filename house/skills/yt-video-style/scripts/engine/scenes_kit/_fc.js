/* oxlint-disable */ // house/: example and engine code kept as shipped in production
var BRANDN =
  BRANDN ||
  ((window.L && L.G) || ["#AED916", "#74CD2D", "#3AC043"]).map((c) =>
    parseInt(String(c).slice(1), 16),
  );
// _fc.js — fork C helpers for v11 3D inserts (brand-green stage, gears, phone screen, rings). Load after _3dkit + _pillars.
window.FC = (function () {
  const FC = {},
    G1 = BRANDN[0],
    G2 = BRANDN[1],
    G3 = BRANDN[2];
  FC.G = [G1, G2, G3];
  FC.load = () => {
    for (const f of ["_3dkit", "_pillars"]) {
      const x = new XMLHttpRequest();
      x.open("GET", "../scenes/" + f + ".js", false);
      x.send();
      (0, eval)(x.responseText);
    }
  };
  FC.stage = async (T, S, o = {}) => {
    const K = await K3.init(T, S, Object.assign({}, PIL.stage, o));
    PIL.dress(T, S, K, o);
    K.dust(260, [34, 12, 44], 21, 0xc8f08a);
    return K;
  };
  FC.green = (T, o = {}) =>
    new T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: G2,
          metalness: 0.75,
          roughness: 0.22,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          emissive: G3,
          emissiveIntensity: 0.12,
        },
        o,
      ),
    );
  FC.dark = (T, o = {}) =>
    new T.MeshPhysicalMaterial(
      Object.assign(
        { color: 0x141a16, metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 },
        o,
      ),
    );
  // gear (extruded toothed disc with a hole)
  FC.gear = (T, { r = 1.6, teeth = 14, depth = 0.45, mat } = {}) => {
    const sh = new T.Shape(),
      n = teeth * 4,
      ri = r * 0.84;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2,
        k = i % 4,
        rr = k === 1 || k === 2 ? r : ri;
      const x = Math.cos(a) * rr,
        y = Math.sin(a) * rr;
      i ? sh.lineTo(x, y) : sh.moveTo(x, y);
    }
    const hole = new T.Path();
    hole.absarc(0, 0, r * 0.3, 0, Math.PI * 2, true);
    sh.holes.push(hole);
    for (let j = 0; j < 5; j++) {
      const a = (j / 5) * Math.PI * 2,
        h = new T.Path();
      h.absarc(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58, r * 0.14, 0, Math.PI * 2, true);
      sh.holes.push(h);
    }
    const g = new T.ExtrudeGeometry(sh, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 3,
      curveSegments: 18,
    });
    g.translate(0, 0, -depth / 2);
    return new T.Mesh(g, mat || FC.green(T));
  };
  // canvas screen texture redrawn every frame by draw(g, w, h, t)
  FC.screen = (T, S, w, h, draw) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    const tx = new T.CanvasTexture(c);
    tx.colorSpace = T.SRGBColorSpace;
    S.on((t) => {
      draw(g, w, h, t);
      tx.needsUpdate = true;
    });
    return tx;
  };
  FC.box = (T, w, h, d, r, mat) =>
    import("three/addons/geometries/RoundedBoxGeometry.js").then(
      ({ RoundedBoxGeometry }) => new T.Mesh(new RoundedBoxGeometry(w, h, d, 6, r), mat),
    );
  // checker board (8x8) group
  FC.board = (T, { s = 0.9, y } = {}) => {
    const g = new T.Group(),
      a = FC.dark(T, { color: 0x0d120e }),
      b = new T.MeshPhysicalMaterial({
        color: 0x3c4a3c,
        metalness: 0.3,
        roughness: 0.3,
        clearcoat: 1,
      });
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++) {
        const m = new T.Mesh(new T.BoxGeometry(s, 0.12, s), (i + j) % 2 ? a : b);
        m.position.set((i - 3.5) * s, 0, (j - 3.5) * s);
        g.add(m);
      }
    const rim = new T.Mesh(new T.BoxGeometry(s * 8.4, 0.1, s * 8.4), FC.dark(T));
    rim.position.y = -0.04;
    g.add(rim);
    g.position.y = y;
    return g;
  };
  // a simple turned pawn / piece for crowd scenes
  FC.pawn = (T, mat) =>
    new T.Mesh(
      new T.LatheGeometry(
        [
          [0, 0],
          [0.42, 0],
          [0.42, 0.1],
          [0.3, 0.18],
          [0.18, 0.55],
          [0.26, 0.62],
          [0.16, 0.7],
          [0.2, 0.86],
          [0.16, 0.98],
          [0, 1.02],
        ].map(([x, y]) => new T.Vector2(x, y)),
        48,
      ),
      mat,
    );
  return FC;
})();
