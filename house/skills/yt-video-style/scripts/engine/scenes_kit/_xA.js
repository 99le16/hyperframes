var BRANDN =
  BRANDN ||
  ((window.L && L.G) || ["#AED916", "#74CD2D", "#3AC043"]).map((c) =>
    parseInt(String(c).slice(1), 16),
  );
// _xA.js — fork A helpers for the v11 brand-green 3D inserts (X01…X12). Load after _3dkit.js:
//   (function(){for(const f of ['_3dkit','_xA']){const x=new XMLHttpRequest();x.open('GET','../scenes/'+f+'.js',false);x.send();(0,eval)(x.responseText);}})();
window.XA = (function () {
  const A = {};
  A.G1 = BRANDN[0];
  A.G2 = BRANDN[1];
  A.G3 = BRANDN[2];
  // brand stage: green horizon + lime floor kicker, cold rim
  A.init = async (T, S, o = {}) => {
    const K = await K3.init(
      T,
      S,
      Object.assign({ glow: A.G3, glow2: A.G1, bg: 0x030605, bloom: [0.5, 0.45, 0.96] }, o),
    );
    S.rim.color = new T.Color(0xcfe6ff);
    S.rim.intensity = 1.0;
    S.rim.position.set(-4, 9, -3);
    K.warm.color = new T.Color(0xe8ffd0);
    K.warm.intensity = 12;
    if (K.spot) K.spot.material.opacity = 0.07;
    A.T = T;
    A.S = S;
    A.K = K;
    return K;
  };
  // overhead spotlight with a soft cone, aimed at a target object
  A.spot = (target, { color = 0xe9ffd0, intensity = 260, pos = [0, 9, 2], angle = 0.38 } = {}) => {
    const T = A.T,
      sp = new T.SpotLight(color, intensity, 30, angle, 0.6, 1.4);
    sp.position.set(...pos);
    sp.target = target;
    A.S.scene.add(sp);
    return sp;
  };
  A.green = (o = {}) =>
    new A.T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: A.G2,
          metalness: 0.45,
          roughness: 0.22,
          clearcoat: 1,
          clearcoatRoughness: 0.06,
          emissive: A.G3,
          emissiveIntensity: 0.32,
        },
        o,
      ),
    );
  A.lime = (o = {}) =>
    new A.T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: A.G1,
          metalness: 0.5,
          roughness: 0.2,
          clearcoat: 1,
          emissive: A.G1,
          emissiveIntensity: 0.28,
        },
        o,
      ),
    );
  A.dark = (o = {}) =>
    new A.T.MeshPhysicalMaterial(
      Object.assign(
        { color: 0x10151a, metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 },
        o,
      ),
    );
  A.marble = (o = {}) =>
    new A.T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: 0xa9ada6,
          metalness: 0.05,
          roughness: 0.38,
          clearcoat: 0.8,
          clearcoatRoughness: 0.2,
        },
        o,
      ),
    );
  A.glow = (color, op = 1) =>
    new A.T.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: op,
      blending: A.T.AdditiveBlending,
      depthWrite: false,
    });
  A.red = (o = {}) =>
    new A.T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: 0xff2e44,
          metalness: 0.3,
          roughness: 0.25,
          clearcoat: 1,
          emissive: 0xff1030,
          emissiveIntensity: 0.55,
        },
        o,
      ),
    );
  // canvas texture drawn by fn(ctx, w, h)
  A.ctex = (w, h, fn) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    fn(c.getContext("2d"), w, h);
    const t = new A.T.CanvasTexture(c);
    t.colorSpace = A.T.SRGBColorSpace;
    t.anisotropy = 8;
    t._c = c;
    return t;
  };
  // the Conquer Finance emblem: a chess knight (extruded silhouette on a lathed base)
  A.knight = (mat) => window.KNIGHT(A.T, mat || A.green(), 3.8);
  A._oldKnight = (mat) => {
    const T = A.T,
      g = new T.Group();
    const sh = new T.Shape();
    sh.moveTo(-0.92, 0);
    sh.lineTo(0.92, 0);
    sh.lineTo(0.88, 0.32);
    sh.quadraticCurveTo(0.5, 0.5, 0.62, 1.0); // chest
    sh.quadraticCurveTo(0.8, 1.5, 1.18, 1.85); // throat → jaw
    sh.quadraticCurveTo(1.36, 2.05, 1.24, 2.3); // muzzle
    sh.quadraticCurveTo(1.1, 2.5, 0.72, 2.56); // nose bridge
    sh.quadraticCurveTo(0.55, 2.7, 0.46, 3.0); // ear front
    sh.lineTo(0.26, 2.78);
    sh.quadraticCurveTo(-0.1, 2.95, -0.42, 2.6); // mane top
    sh.quadraticCurveTo(-0.82, 2.1, -0.78, 1.3); // mane back
    sh.quadraticCurveTo(-0.74, 0.7, -0.94, 0.34);
    sh.closePath();
    const eye = new T.Path();
    eye.absarc(0.62, 2.25, 0.09, 0, Math.PI * 2, true);
    sh.holes.push(eye);
    const head = new T.Mesh(
      new T.ExtrudeGeometry(sh, {
        depth: 0.78,
        bevelEnabled: true,
        bevelThickness: 0.12,
        bevelSize: 0.09,
        bevelSegments: 5,
        curveSegments: 8,
      }),
      mat || A.green(),
    );
    head.position.set(-0.05, 0.62, -0.39);
    g.add(head);
    const base = new T.Mesh(
      new T.LatheGeometry(
        [
          [0, 0],
          [1.25, 0],
          [1.25, 0.16],
          [1.08, 0.26],
          [1.0, 0.42],
          [0.86, 0.5],
          [0.9, 0.62],
          [0, 0.62],
        ].map(([x, y]) => new T.Vector2(x, y)),
        64,
      ),
      mat || A.green(),
    );
    g.add(base);
    g.userData.h = 3.8;
    return g;
  };
  // dark glossy chess board (n×n) with green-glass squares
  A.board = (n = 8, s = 1, y = 0) => {
    const T = A.T,
      g = new T.Group();
    const geo = new T.BoxGeometry(s, 0.18, s),
      mA = new T.MeshPhysicalMaterial({
        color: 0x0b0f12,
        metalness: 0.2,
        roughness: 0.42,
        clearcoat: 0.25,
        clearcoatRoughness: 0.35,
        envMapIntensity: 0.25,
      }),
      mB = new T.MeshPhysicalMaterial({
        color: 0x163d22,
        metalness: 0.2,
        roughness: 0.38,
        clearcoat: 0.25,
        clearcoatRoughness: 0.35,
        emissive: A.G3,
        emissiveIntensity: 0.08,
        envMapIntensity: 0.25,
      });
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const m = new T.Mesh(geo, (i + j) % 2 ? mA : mB);
        m.position.set((i - n / 2 + 0.5) * s, y, (j - n / 2 + 0.5) * s);
        g.add(m);
      }
    const frame = new T.Mesh(
      new T.BoxGeometry(n * s + 0.5, 0.14, n * s + 0.5),
      A.dark({ color: 0x07090b }),
    );
    frame.position.y = y - 0.05;
    g.add(frame);
    return g;
  };
  A.pawn = (mat) =>
    new A.T.Mesh(
      new A.T.LatheGeometry(
        [
          [0, 0],
          [0.5, 0],
          [0.5, 0.12],
          [0.36, 0.22],
          [0.24, 0.5],
          [0.18, 0.95],
          [0.3, 1.05],
          [0.16, 1.12],
          [0.26, 1.3],
          [0.27, 1.45],
          [0.2, 1.6],
          [0, 1.66],
        ].map(([x, y]) => new A.T.Vector2(x, y)),
        48,
      ),
      mat,
    );
  // 2D gradient slab word (brand gradient fill) — wraps L.slab but with the gradient class
  A.word = (o) => L.slab(Object.assign({ color: L.G[0], glow: "rgba(116,205,45,.55)" }, o));
  A.load = "";
  return A;
})();
