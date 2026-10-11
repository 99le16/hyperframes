var BRANDN =
  BRANDN ||
  ((window.L && L.G) || ["#AED916", "#74CD2D", "#3AC043"]).map((c) =>
    parseInt(String(c).slice(1), 16),
  );
// _xb.js — fork B helpers on top of _3dkit.js: brand-green stage, materials, labels. Load after _3dkit.js.
window.XB = {
  load: () => {},
  stage: async (T, S, o = {}) => {
    const K = await K3.init(
      T,
      S,
      Object.assign(
        { glow: BRANDN[2], glow2: BRANDN[0], aperture: 0.0011, bloom: [0.6, 0.5, 0.9] },
        o,
      ),
    );
    S.rim.color = new T.Color(0x6f8dff);
    S.rim.intensity = 2.6;
    const g = new T.PointLight(BRANDN[1], 40, 26, 1.6);
    g.position.set(-5, 2.5, 3);
    S.scene.add(g);
    XB.gl = g;
    if (o.dust !== false) K.dust(240, undefined, o.seed || 5, 0xc6f58a);
    if (o.streaks !== false) K.streaks(8, (o.seed || 5) + 1, 0x8fe35a);
    XB.K = K;
    XB.T = T;
    XB.S = S;
    return K;
  },
  green: (o = {}) =>
    new XB.T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: BRANDN[1],
          metalness: 0.45,
          roughness: 0.22,
          clearcoat: 1,
          clearcoatRoughness: 0.06,
          emissive: 0x1c4a06,
          emissiveIntensity: 0.55,
        },
        o,
      ),
    ),
  lime: (o = {}) =>
    new XB.T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: BRANDN[0],
          metalness: 0.5,
          roughness: 0.2,
          clearcoat: 1,
          emissive: 0x3a4a05,
          emissiveIntensity: 0.6,
        },
        o,
      ),
    ),
  glassG: (o = {}) =>
    new XB.T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: 0x0f1a10,
          metalness: 0.1,
          roughness: 0.08,
          transmission: 0.55,
          thickness: 0.6,
          transparent: true,
          opacity: 0.55,
          clearcoat: 1,
          emissive: 0x0d2a06,
          emissiveIntensity: 0.4,
        },
        o,
      ),
    ),
  marble: (o = {}) =>
    new XB.T.MeshPhysicalMaterial(
      Object.assign({ color: 0xd9dde3, metalness: 0.05, roughness: 0.32, clearcoat: 0.7 }, o),
    ),
  red: (o = {}) =>
    new XB.T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: 0xff3b5c,
          metalness: 0.3,
          roughness: 0.25,
          clearcoat: 1,
          emissive: 0x4a0510,
          emissiveIntensity: 0.6,
        },
        o,
      ),
    ),
  // a 2D label (papel typewriter / hv) glued to a 3D object or point, entering at t
  tag: (
    target,
    html,
    t,
    { cls = "tw", size = 34, color = "#eef3e4", dy = 0, out, anchor = "c", hl = false } = {},
  ) => {
    const e = L.el("div", cls + " abs", L.world, {
      fontSize: size + "px",
      color,
      whiteSpace: "nowrap",
      left: 0,
      top: 0,
    });
    e.innerHTML = hl ? `<span class="hl">${html}</span>` : html;
    XB.K.label(target, e, { dy, anchor });
    L.on((tt) => {
      const a = L.ease.outBack(L.p(tt, t, t + 0.3)),
        b = out == null ? 0 : L.p(tt, out - 0.2, out);
      e.style.opacity = Math.min(1, a * 1.5) * (1 - b);
      e._sx = 0.7 + 0.3 * a;
    });
    return e;
  },
  pop:
    (t, d = 0.45, s = 1.4) =>
    (tt) =>
      L.ease.outBack(L.p(tt, t, t + d), s),
};
