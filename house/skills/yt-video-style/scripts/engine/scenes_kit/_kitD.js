var BRANDN =
  BRANDN ||
  ((window.L && L.G) || ["#AED916", "#74CD2D", "#3AC043"]).map((c) =>
    parseInt(String(c).slice(1), 16),
  );
// _kitD.js — fork D helpers on top of _3dkit.js: brand-green stage (Conquer Finance #AED916 → #74CD2D → #3AC043).
(function () {
  const x = new XMLHttpRequest();
  x.open("GET", "../scenes/_3dkit.js", false);
  x.send();
  (0, eval)(x.responseText);
})();
window.D = (function () {
  const D = {};
  let T, S, K;
  D.GREEN = [BRANDN[0], BRANDN[1], BRANDN[2]];
  D.stage = async (t_, s_, o = {}) => {
    T = t_;
    S = s_;
    K = await K3.init(
      T,
      S,
      Object.assign(
        { glow: BRANDN[2], glow2: BRANDN[0], horizon: false, bg: 0x030604, fog: [16, 80] },
        o,
      ),
    );
    S.rim.color = new T.Color(0x6f9cff);
    S.rim.intensity = 2.4;
    // green horizon band
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 256;
    const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(0.6, "rgba(58,192,67,0)");
    gr.addColorStop(0.8, "rgba(116,205,45,.5)");
    gr.addColorStop(0.87, "rgba(210,245,120,.95)");
    gr.addColorStop(0.91, "rgba(58,192,67,.45)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 16, 256);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    const h = new T.Mesh(
      new T.PlaneGeometry(300, 34),
      new T.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        fog: false,
        blending: T.AdditiveBlending,
      }),
    );
    h.position.set(0, K.floorY + 5, -70);
    S.scene.add(h);
    K.horizon = h;
    // blob texture + green floor pool
    const c2 = document.createElement("canvas");
    c2.width = c2.height = 128;
    const g2 = c2.getContext("2d");
    const rg = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, "rgba(255,255,255,.9)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g2.fillStyle = rg;
    g2.fillRect(0, 0, 128, 128);
    K.blobTex = new T.CanvasTexture(c2);
    const pool = new T.Mesh(
      new T.PlaneGeometry(22, 10),
      new T.MeshBasicMaterial({
        map: K.blobTex,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        color: BRANDN[2],
        opacity: 0.16,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, K.floorY + 0.02, 0);
    S.scene.add(pool);
    K.pool = pool;
    // faint grid on the floor (brand: grid)
    const grid = new T.GridHelper(120, 120, 0x1d3a1f, 0x0f1f10);
    grid.position.y = K.floorY + 0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    S.scene.add(grid);
    return K;
  };
  D.green = (o = {}) =>
    new T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: BRANDN[1],
          metalness: 0.45,
          roughness: 0.22,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          emissive: BRANDN[2],
          emissiveIntensity: 0.3,
        },
        o,
      ),
    );
  D.lime = (o = {}) =>
    new T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: BRANDN[0],
          metalness: 0.5,
          roughness: 0.2,
          clearcoat: 1,
          emissive: 0x6a8a08,
          emissiveIntensity: 0.35,
        },
        o,
      ),
    );
  D.glow = (col = BRANDN[0]) => new T.MeshBasicMaterial({ color: col, toneMapped: false });
  D.blob = (pos, size, color = BRANDN[0], op = 0.5) => {
    const m = new T.Mesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({
        map: K.blobTex,
        color,
        transparent: true,
        opacity: op,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    m.position.copy(pos);
    m.scale.setScalar(size);
    S.scene.add(m);
    S.on(() => m.lookAt(S.camera.position));
    return m;
  };
  // text plane with accents (helvetiker 3D font has none): canvas → emissive plane, width in world units
  D.ctext = (
    str,
    {
      w = 3,
      px = 160,
      color = "#d9ff6a",
      font = '700 {px}px "Helvetica Neue", Inter, sans-serif',
      glow = 24,
      bg,
    } = {},
  ) => {
    const c = document.createElement("canvas"),
      g = c.getContext("2d");
    const f = font.replace("{px}", px);
    g.font = f;
    const tw = Math.ceil(g.measureText(str).width) + glow * 4,
      th = Math.ceil(px * 1.35) + glow * 2;
    c.width = tw;
    c.height = th;
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, tw, th);
    }
    g.font = f;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = color;
    g.shadowBlur = glow;
    g.fillStyle = color;
    g.fillText(str, tw / 2, th / 2 + px * 0.04);
    g.shadowBlur = 0;
    g.fillStyle = "#ffffff";
    g.globalAlpha = 0.55;
    g.fillText(str, tw / 2, th / 2 + px * 0.04);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 8;
    const m = new T.Mesh(
      new T.PlaneGeometry(w, (w * th) / tw),
      new T.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    return m;
  };
  return D;
})();
