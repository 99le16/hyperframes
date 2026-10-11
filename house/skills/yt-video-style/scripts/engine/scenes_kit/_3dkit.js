var BRANDN =
  BRANDN ||
  ((window.L && L.G) || ["#AED916", "#74CD2D", "#3AC043"]).map((c) =>
    parseInt(String(c).slice(1), 16),
  );
// _3dkit.js — shared real-3D kit for the v10 chapter carousels and money/number scenes (owned by the 3D fork).
// Load at the top of a scene:
//   (function(){const x=new XMLHttpRequest();x.open('GET','../scenes/_3dkit.js',false);x.send();(0,eval)(x.responseText);})();
// then inside L.three(async (T, S) => { const K = await K3.init(T, S, {...}); ... }).
// Everything is a pure function of scene time t (S.on). Seeded randomness only.
window.K3 = (function () {
  const K = {};
  let T, S;
  const sync = (url) => {
    const x = new XMLHttpRequest();
    x.open("GET", url, false);
    x.send();
    return x.responseText;
  };
  K.rnd = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  K.STEPS = [
    "Estrategia",
    "Mercados",
    "Firmas propietarias",
    "Formador",
    "Demo vs real",
    "Vivir del trading",
  ];
  K.ICONS = ["chart", "forex", "gold", "gradcap", "monitor", "trophy"];

  // ---------- stage: opaque dark world, fog, reflective floor, horizon glow, DOF, bloom ----------
  K.init = async (t_, s_, o = {}) => {
    T = t_;
    S = s_;
    const {
      bg = 0x04060d,
      fog = [18, 70],
      floorY = -2.2,
      glow = 0x2a5cff,
      glow2 = BRANDN[0],
      bokeh = true,
      focus = 12,
      aperture = 0.0012,
      maxblur = 0.009,
      bloom = [0.55, 0.5, 0.93],
      mirror = true,
      horizon = true,
      env = 0.55,
    } = o;
    K.floorY = floorY;
    S.scene.background = new T.Color(bg);
    S.scene.fog = new T.Fog(bg, fog[0], fog[1]);
    S.scene.environmentIntensity = env;
    S.bloom.strength = bloom[0];
    S.bloom.radius = bloom[1];
    S.bloom.threshold = bloom[2];
    S.key.intensity = 1.6;
    S.rim.intensity = 3.0;
    S.rim.color = new T.Color(0x5b7cff);
    K.warm = new T.PointLight(0xffd36a, 30, 30, 1.6);
    K.warm.position.set(5, 3, 6);
    S.scene.add(K.warm);
    if (mirror) {
      const { Reflector } = await import("three/addons/objects/Reflector.js");
      const m = new Reflector(new T.PlaneGeometry(400, 400), {
        textureWidth: 1280,
        textureHeight: 720,
        color: 0x8a8f99,
      });
      m.rotation.x = -Math.PI / 2;
      m.position.y = floorY;
      S.scene.add(m);
      const tint = new T.Mesh(
        new T.PlaneGeometry(400, 400),
        new T.MeshBasicMaterial({ color: bg, transparent: true, opacity: 0.62 }),
      );
      tint.rotation.x = -Math.PI / 2;
      tint.position.y = floorY + 0.004;
      S.scene.add(tint);
      K.floor = tint;
    }
    if (horizon) {
      // glowing horizon band (like the ref's blue floor light)
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 256;
      const g = c.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, "rgba(0,0,0,0)");
      gr.addColorStop(0.55, "rgba(40,90,255,.0)");
      gr.addColorStop(0.78, "rgba(60,120,255,.55)");
      gr.addColorStop(0.86, "rgba(170,200,255,.95)");
      gr.addColorStop(0.9, "rgba(60,120,255,.5)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 16, 256);
      const tex = new T.CanvasTexture(c);
      tex.colorSpace = T.SRGBColorSpace;
      const h = new T.Mesh(
        new T.PlaneGeometry(260, 34),
        new T.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          fog: false,
          blending: T.AdditiveBlending,
          color: glow,
        }),
      );
      h.position.set(0, floorY + 5, -60);
      S.scene.add(h);
      K.horizon = h;
      // soft yellow kicker under the stage
      const c2 = document.createElement("canvas");
      c2.width = c2.height = 128;
      const g2 = c2.getContext("2d");
      const rg = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
      rg.addColorStop(0, "rgba(255,255,255,.9)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      g2.fillStyle = rg;
      g2.fillRect(0, 0, 128, 128);
      K.blobTex = new T.CanvasTexture(c2);
      const spot = new T.Mesh(
        new T.PlaneGeometry(26, 10),
        new T.MeshBasicMaterial({
          map: K.blobTex,
          transparent: true,
          depthWrite: false,
          blending: T.AdditiveBlending,
          color: glow2,
          opacity: 0.045,
        }),
      );
      spot.rotation.x = -Math.PI / 2;
      spot.position.set(0, floorY + 0.02, 0);
      S.scene.add(spot);
      K.spot = spot;
    }
    if (bokeh) {
      const { BokehPass } = await import("three/addons/postprocessing/BokehPass.js");
      K.bok = new BokehPass(S.scene, S.camera, { focus, aperture, maxblur });
      S.composer.insertPass(K.bok, 1);
    }
    return K;
  };
  K.focus = (d) => {
    if (K.bok) K.bok.uniforms.focus.value = d;
  };

  // ---------- assets ----------
  const _tex = {};
  K.tex = (src) =>
    _tex[src] ||
    (_tex[src] = new Promise((r) =>
      new T.TextureLoader().load(src, (tx) => {
        tx.colorSpace = T.SRGBColorSpace;
        tx.anisotropy = 8;
        r(tx);
      }),
    ));
  let _font = null;
  K.font = async () => {
    if (_font) return _font;
    const { FontLoader } = await import("three/addons/loaders/FontLoader.js");
    _font = new FontLoader().parse(
      JSON.parse(sync("../lib/vendor/package/examples/fonts/helvetiker_bold.typeface.json")),
    );
    return _font;
  };
  K.gold = (o = {}) =>
    new T.MeshPhysicalMaterial(
      Object.assign(
        { color: 0xf2c94c, metalness: 1, roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.2 },
        o,
      ),
    );
  K.yellow = (o = {}) =>
    new T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: BRANDN[0],
          metalness: 0.55,
          roughness: 0.22,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          emissive: 0x3a3300,
          emissiveIntensity: 0.35,
        },
        o,
      ),
    );
  K.chrome = (o = {}) =>
    new T.MeshPhysicalMaterial(
      Object.assign({ color: 0xdfe6f2, metalness: 1, roughness: 0.12, clearcoat: 1 }, o),
    );
  K.glass = (o = {}) =>
    new T.MeshPhysicalMaterial(
      Object.assign(
        {
          color: 0x0c1222,
          metalness: 0.35,
          roughness: 0.18,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
        },
        o,
      ),
    );

  // ---------- 3D text ----------
  K.text3d = async (str, { size = 2, depth = 0.5, mat, bevel = true, align = "c" } = {}) => {
    const { TextGeometry } = await import("three/addons/geometries/TextGeometry.js");
    const g = new TextGeometry(str, {
      font: await K.font(),
      size,
      depth,
      curveSegments: 10,
      bevelEnabled: bevel,
      bevelThickness: size * 0.045,
      bevelSize: size * 0.03,
      bevelSegments: 4,
    });
    g.computeBoundingBox();
    const b = g.boundingBox;
    const dx = align === "c" ? -(b.max.x + b.min.x) / 2 : align === "r" ? -b.max.x : -b.min.x;
    g.translate(dx, -(b.max.y + b.min.y) / 2, -depth / 2);
    const m = new T.Mesh(g, mat || K.yellow());
    m.userData.w = b.max.x - b.min.x;
    return m;
  };

  // ---------- glossy icon tile: dark glass rounded body + the PNG icon tile on its face ----------
  K.tile = async (name, { s = 2.2, d = 0.5 } = {}) => {
    const { RoundedBoxGeometry } = await import("three/addons/geometries/RoundedBoxGeometry.js");
    const g = new T.Group();
    const body = new T.Mesh(new RoundedBoxGeometry(s, s, d, 5, s * 0.17), K.glass());
    g.add(body);
    const tx = await K.tex(`../assets/${name}.png`);
    const face = new T.Mesh(
      new T.PlaneGeometry(s * 1.04, s * 1.04),
      new T.MeshStandardMaterial({
        map: tx,
        transparent: true,
        roughness: 0.35,
        metalness: 0,
        color: 0x9a9a9a,
        alphaTest: 0.02,
        envMapIntensity: 0.25,
      }),
    );
    face.position.z = d / 2 + 0.012;
    g.add(face);
    const edge = new T.Mesh(
      new RoundedBoxGeometry(s * 1.02, s * 1.02, d * 0.3, 4, s * 0.18),
      new T.MeshBasicMaterial({
        color: 0x5f86ff,
        transparent: true,
        opacity: 0.0,
        blending: T.AdditiveBlending,
      }),
    );
    edge.position.z = -d * 0.2;
    g.add(edge);
    g.userData.edge = edge;
    g.userData.face = face;
    g.userData.body = body;
    return g;
  };

  // ---------- coins ----------
  let _coinG = null;
  K.coinGeo = () => {
    // coin profile: chamfered rim + raised edge ring + recessed face
    const P = [
      [0, 0.062],
      [0.66, 0.062],
      [0.7, 0.074],
      [0.84, 0.074],
      [0.9, 0.055],
      [0.9, -0.055],
      [0.84, -0.074],
      [0.7, -0.074],
      [0.66, -0.062],
      [0, -0.062],
    ].map(([x, y]) => new T.Vector2(x, y));
    const g = new T.LatheGeometry(P, 64);
    g.computeVertexNormals();
    return g;
  };
  K.coin = () => {
    if (!_coinG) _coinG = K.coinGeo();
    const m = new T.Mesh(_coinG, K.gold());
    return m;
  };
  K.bar = () => {
    // gold bar (trapezoid-ish via scaled box)
    const g = new T.BoxGeometry(1.6, 0.45, 0.8);
    const m = new T.Mesh(g, K.gold({ roughness: 0.16 }));
    return m;
  };

  // ---------- 3D candles (box body + thin wick) ----------
  K.candle = (up, h = 1.2) => {
    const g = new T.Group(),
      col = up ? 0x1fd17a : 0xff3b5c;
    const mat = new T.MeshPhysicalMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 0.25,
      roughness: 0.25,
      clearcoat: 1,
      metalness: 0.2,
    });
    const b = new T.Mesh(new T.BoxGeometry(0.32, h, 0.32), mat);
    g.add(b);
    const w = new T.Mesh(new T.BoxGeometry(0.05, h * 1.7, 0.05), mat);
    g.add(w);
    return g;
  };

  // ---------- dust / bokeh particles for depth ----------
  K.dust = (n = 260, spread = [40, 14, 50], seed = 7, color = 0x9fb6ff) => {
    const r = K.rnd(seed),
      p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (r() - 0.5) * spread[0];
      p[i * 3 + 1] = r() * spread[1] + K.floorY;
      p[i * 3 + 2] = -r() * spread[2] + 8;
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(p, 3));
    const pts = new T.Points(
      g,
      new T.PointsMaterial({
        color,
        size: 0.06,
        map: K.blobTex,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        opacity: 0.7,
      }),
    );
    S.scene.add(pts);
    S.on((t) => {
      pts.rotation.y = t * 0.015;
      pts.position.y = Math.sin(t * 0.3) * 0.15;
    });
    return pts;
  };

  // ---------- light streaks (fast additive bars across depth) ----------
  K.streaks = (n = 10, seed = 3, color = 0x7aa2ff) => {
    const r = K.rnd(seed),
      grp = new T.Group();
    S.scene.add(grp);
    const items = [...Array(n)].map(() => {
      const m = new T.Mesh(
        new T.PlaneGeometry(1, 1),
        new T.MeshBasicMaterial({
          map: K.blobTex,
          color,
          transparent: true,
          depthWrite: false,
          blending: T.AdditiveBlending,
          opacity: 0.55,
        }),
      );
      const o = {
        m,
        x: (r() - 0.5) * 30,
        y: K.floorY + 0.4 + r() * 6,
        z: -5 - r() * 40,
        sp: 6 + r() * 12,
        ph: r() * 40,
        len: 3 + r() * 6,
      };
      m.scale.set(o.len, 0.045, 1);
      grp.add(m);
      return o;
    });
    S.on((t) =>
      items.forEach((o) => {
        o.m.position.set(((o.x + (t + o.ph) * o.sp) % 60) - 30, o.y, o.z);
      }),
    );
    return grp;
  };

  // ---------- 2D label glued to a 3D point (projected each frame) ----------
  const _v = () => new T.Vector3();
  K.label = (target, el, { dx = 0, dy = 0, anchor = "c" } = {}) => {
    const v = _v();
    S.on(() => {
      if (typeof target === "function") v.copy(target());
      else target.getWorldPosition(v);
      v.project(S.camera);
      const x = ((v.x + 1) / 2) * 1920 + dx,
        y = ((1 - v.y) / 2) * 1080 + dy;
      el.style.left = "0px";
      el.style.top = "0px";
      el.style.transform =
        `translate(${x}px,${y}px) translate(${anchor === "c" ? -50 : anchor === "r" ? -100 : 0}%,-50%)` +
        (el._sx ? ` scale(${el._sx})` : "");
      el.style.visibility = v.z < 1 ? "visible" : "hidden";
    });
    return el;
  };

  // ---------- camera keyframes [[t, [px,py,pz, lx,ly,lz, fov?]]] + shake ----------
  K.cam = (keys, ease = L.ease.inOutCubic, shakes = []) => {
    const look = new T.Vector3();
    S.on((t) => {
      const k = L.kf(keys, t, ease);
      let sx = 0,
        sy = 0;
      for (const [ts, amp = 0.12, d = 0.4] of shakes) {
        const u = L.p(t, ts, ts + d);
        if (u > 0 && u < 1) {
          const a = amp * (1 - u);
          sx += Math.sin(t * 83) * a;
          sy += Math.cos(t * 71) * a;
        }
      }
      S.camera.position.set(k[0] + sx, k[1] + sy, k[2]);
      look.set(k[3], k[4], k[5]);
      S.camera.lookAt(look);
      if (k[6]) {
        S.camera.fov = k[6];
        S.camera.updateProjectionMatrix();
      }
    });
  };

  // ---------- flash: a bright additive sprite at a point, used for fly-outs / impacts ----------
  K.flash = (pos, { t0 = 0, d = 0.5, size = 30, color = 0xffffff, peak = 1 } = {}) => {
    const m = new T.Mesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({
        map: K.blobTex,
        color,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: T.AdditiveBlending,
        fog: false,
      }),
    );
    m.position.copy(pos);
    S.scene.add(m);
    S.on((t) => {
      const u = L.p(t, t0, t0 + d);
      const a = u <= 0 || u >= 1 ? 0 : Math.sin(u * Math.PI);
      m.material.opacity = a * peak;
      m.scale.setScalar(size * (0.4 + 0.6 * a));
      m.lookAt(S.camera.position);
      m.visible = a > 0.002;
    });
    return m;
  };

  // ---------- CAROUSEL (ref "Side-Hustle #1"): a row of the 6 step tiles sliding along x; `active` = keyframes [[t, idx]] ----------
  K.carousel = async ({
    gap = 3.1,
    y = 0,
    z0 = -2,
    active = [[0, 0]],
    appear = 0,
    spin = [],
    icons = K.ICONS,
    curve = 0.045,
  } = {}) => {
    const row = new T.Group();
    row.position.set(0, y, z0);
    S.scene.add(row);
    const tiles = [];
    for (let i = 0; i < icons.length; i++) {
      const tile = await K.tile(icons[i]);
      row.add(tile);
      tiles.push(tile);
    }
    S.on((t) => {
      const act = L.kf(active, t, L.ease.inOutCubic);
      tiles.forEach((tile, i) => {
        const dx = (i - act) * gap,
          front = L.clamp(1 - Math.abs(i - act));
        const ap = L.ease.outBack(
          L.p(
            t,
            appear + Math.abs(i - Math.round(act)) * 0.08,
            appear + Math.abs(i - Math.round(act)) * 0.08 + 0.6,
          ),
          1.3,
        );
        tile.position.set(
          dx,
          Math.sin(t * 1.3 + i) * 0.07 + (1 - ap) * -3.5 + front * 0.25,
          -curve * dx * dx + front * 1.4,
        );
        let sp = 0;
        for (const [ts, idx] of spin)
          if (idx === i) sp += L.ease.inOutCubic(L.p(t, ts, ts + 0.8)) * Math.PI * 2;
        tile.rotation.set(
          Math.sin(t * 0.9 + i) * 0.05 - front * 0.06,
          -dx * 0.06 + Math.sin(t * 0.6 + i) * 0.08 + sp,
          0,
        );
        tile.scale.setScalar(Math.max(0.001, ap) * (1 + 0.25 * front));
        tile.userData.edge.material.opacity = 0.4 * front;
        tile.userData.face.material.color.setScalar(0.5 + 0.16 * front);
        tile.userData.face.material.envMapIntensity = 0.25;
        tile.userData.body.material.emissive = new T.Color(0x2a4cff);
        tile.userData.body.material.emissiveIntensity = 0.35 * front;
      });
    });
    return { row, tiles };
  };
  // ---------- instanced coin stack: count(t) coins, falling in from above as they are added ----------
  K.stack = ({ x = 0, z = 0, max = 60, count, mat, jitter = 0.06, seed = 11, drop = 3 } = {}) => {
    if (!_coinG) _coinG = K.coinGeo();
    const im = new T.InstancedMesh(_coinG, mat || K.gold(), max);
    im.position.set(x, K.floorY + 0.08, z);
    im.frustumCulled = false;
    S.scene.add(im);
    const r = K.rnd(seed),
      off = [...Array(max)].map(() => [(r() - 0.5) * jitter, (r() - 0.5) * jitter, r() * 6.28]);
    const M = new T.Matrix4(),
      Q = new T.Quaternion(),
      E = new T.Euler(),
      V = new T.Vector3(),
      Sc = new T.Vector3(1, 1, 1);
    S.on((t) => {
      const n = count(t),
        full = Math.floor(n),
        fr = n - full;
      let k = 0;
      for (let i = 0; i < Math.min(max, Math.ceil(n)); i++) {
        const fall = i < full ? 0 : (1 - L.ease.outCubic(fr)) * drop;
        V.set(off[i][0], i * 0.17 + fall, off[i][1]);
        E.set(0, off[i][2], 0);
        Q.setFromEuler(E);
        M.compose(V, Q, Sc);
        im.setMatrixAt(k++, M);
      }
      im.count = k;
      im.instanceMatrix.needsUpdate = true;
    });
    im.top = (t) => im.position.y + Math.max(0, count(t)) * 0.17;
    return im;
  };
  return K;
})();
// ---------- 2D chapter UI (papel typography) shared by the carousels ----------
window.K3UI = {
  header: (a, hl, t, thl, { y = 86, size = 64 } = {}) =>
    L.tw({
      x: 960,
      y,
      size,
      anchor: "c",
      lines: [
        [
          { t: a + " ", at: t },
          { hl, at: thl != null ? thl : t + (a.length + 1) / 28 + 0.05 },
        ],
      ],
    }),
  progress: (n, pct, t0, from = 0) => {
    const pr = L.el("div", "tw abs", L.world, {
      left: "960px",
      top: "992px",
      fontSize: "34px",
      transform: "translateX(-50%)",
      color: "#cfd6e8",
    });
    L.on((t) => {
      const u = L.ease.outCubic(L.p(t, t0, t0 + 1.1));
      pr.innerHTML = `Paso ${n} · <span style="color:${L.Y}">${Math.round(L.lerp(from, pct, u))} %</span>`;
      pr.style.opacity = L.p(t, t0 - 0.1, t0 + 0.2);
    });
    return pr;
  },
  flashIn: (d = 0.3) => {
    const f = L.el("div", "abs", L.stage, { inset: 0, background: "#fffbe8", zIndex: 50 });
    L.on((t) => {
      f.style.opacity = 1 - L.ease.outCubic(L.p(t, 0, d));
    });
  },
  name: (txt, x, y, t, out) => {
    const e = L.el(
      "div",
      "tw abs",
      L.world,
      { fontSize: "30px", color: "#d6dcef", whiteSpace: "nowrap" },
      txt,
    );
    L.env(e, t, out, { style: "rise", din: 0.35 });
    return e;
  },
};
