var BRANDN =
  BRANDN ||
  ((window.L && L.G) || ["#AED916", "#74CD2D", "#3AC043"]).map((c) =>
    parseInt(String(c).slice(1), 16),
  );
// _pillars.js — v11 PILLARS look (owned by fork C). Premium fluted marble pillars rising out of a reflective brand-dark floor,
// green god-rays, dust bursts, a glowing word on each pillar, a roof slab landing, the Conquer Finance chess knight on top.
// Load AFTER _3dkit.js:
//   (function(){for(const f of ['_3dkit','_pillars']){const x=new XMLHttpRequest();x.open('GET','../scenes/'+f+'.js',false);x.send();(0,eval)(x.responseText);}})();
// In L.three: const K = await K3.init(T, S, PIL.stage); const P = await PIL.build(T, S, K, {...});
window.PIL = (function () {
  const G1 = BRANDN[0],
    G2 = BRANDN[1],
    G3 = BRANDN[2];
  const PIL = {};
  PIL.stage = {
    bg: 0x030503,
    fog: [16, 60],
    glow: G3,
    glow2: G1,
    horizon: false,
    aperture: 0.001,
    maxblur: 0.007,
    bloom: [0.42, 0.5, 0.97],
    env: 0.32,
  };
  const canvasTex = (T, w, h, draw) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const tx = new T.CanvasTexture(c);
    tx.colorSpace = T.SRGBColorSpace;
    return tx;
  };

  // ---------- brand set dressing: green horizon band, floor grid, rim colours ----------
  PIL.dress = (T, S, K, { grid = true } = {}) => {
    if (!K.blobTex)
      K.blobTex = canvasTex(T, 128, 128, (g) => {
        const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        rg.addColorStop(0, "rgba(255,255,255,.9)");
        rg.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = rg;
        g.fillRect(0, 0, 128, 128);
      });
    S.rim.color = new T.Color(0x9fe870);
    S.rim.intensity = 2.4;
    S.key.intensity = 0.9;
    K.warm.color = new T.Color(0xfff1c8);
    K.warm.intensity = 6;
    const band = canvasTex(T, 16, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, "rgba(0,0,0,0)");
      gr.addColorStop(0.6, "rgba(58,192,67,0)");
      gr.addColorStop(0.8, "rgba(116,205,45,.5)");
      gr.addColorStop(0.87, "rgba(210,245,120,.95)");
      gr.addColorStop(0.91, "rgba(58,192,67,.45)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 16, 256);
    });
    const h = new T.Mesh(
      new T.PlaneGeometry(260, 30),
      new T.MeshBasicMaterial({
        map: band,
        transparent: true,
        depthWrite: false,
        fog: false,
        blending: T.AdditiveBlending,
        opacity: 0.8,
      }),
    );
    h.position.set(0, K.floorY + 4.5, -58);
    S.scene.add(h);
    if (grid) {
      const gh = new T.GridHelper(120, 120, G3, G3);
      gh.position.y = K.floorY + 0.01;
      gh.material.transparent = true;
      gh.material.opacity = 0.11;
      gh.material.depthWrite = false;
      S.scene.add(gh);
    }
    const spot = new T.Mesh(
      new T.PlaneGeometry(30, 12),
      new T.MeshBasicMaterial({
        map: K.blobTex,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        color: G2,
        opacity: 0.12,
      }),
    );
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, K.floorY + 0.02, 0);
    S.scene.add(spot);
    return { band: h };
  };

  // ---------- geometry ----------
  let _shaft = null;
  const shaftGeo = (T, r = 0.42, h = 4.2) => {
    if (_shaft) return _shaft;
    const g = new T.CylinderGeometry(r * 0.9, r, h, 96, 24, false);
    const p = g.attributes.position,
      v = new T.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const rr = Math.hypot(v.x, v.z);
      if (rr < 1e-4) continue;
      const a = Math.atan2(v.z, v.x),
        fl = 1 - 0.055 * Math.pow(0.5 + 0.5 * Math.cos(a * 20), 3);
      const ent = 1 + 0.025 * Math.sin((v.y / h + 0.5) * Math.PI); // entasis
      p.setXYZ(i, (v.x / rr) * rr * fl * ent, v.y, (v.z / rr) * rr * fl * ent);
    }
    g.computeVertexNormals();
    g.translate(0, h / 2, 0);
    _shaft = g;
    return g;
  };
  const marble = (T, seed = 1) => {
    const tx = canvasTex(T, 512, 512, (g, w, h) => {
      g.fillStyle = "#8f948c";
      g.fillRect(0, 0, w, h);
      let s = seed * 9301;
      const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 26; i++) {
        g.strokeStyle = `rgba(${90 + r() * 40},${100 + r() * 40},${95 + r() * 30},${0.08 + r() * 0.14})`;
        g.lineWidth = 0.6 + r() * 2.4;
        g.beginPath();
        let x = r() * w,
          y = 0;
        g.moveTo(x, y);
        while (y < h) {
          x += (r() - 0.5) * 46;
          y += 12 + r() * 30;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    });
    tx.wrapS = tx.wrapT = T.RepeatWrapping;
    return new T.MeshPhysicalMaterial({
      map: tx,
      color: 0xffffff,
      roughness: 0.34,
      metalness: 0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.14,
      envMapIntensity: 0.55,
    });
  };
  // chess knight silhouette (Conquer Finance emblem), extruded + bevelled, on a turned base
  PIL.knight = (T, mat) => window.KNIGHT(T, mat, 2.45);
  PIL._oldKnight = (T, mat) => {
    const sh = new T.Shape();
    sh.moveTo(-0.62, 0);
    sh.lineTo(0.62, 0);
    sh.lineTo(0.6, 0.16);
    sh.lineTo(0.44, 0.26);
    sh.splineThru([
      new T.Vector2(0.4, 0.5),
      new T.Vector2(0.5, 0.9),
      new T.Vector2(0.56, 1.18),
      new T.Vector2(0.78, 1.33),
      new T.Vector2(0.74, 1.52),
      new T.Vector2(0.48, 1.68),
      new T.Vector2(0.36, 1.93),
      new T.Vector2(0.22, 2.12),
      new T.Vector2(0.1, 1.92),
      new T.Vector2(-0.18, 1.86),
      new T.Vector2(-0.42, 1.6),
      new T.Vector2(-0.52, 1.2),
      new T.Vector2(-0.46, 0.8),
      new T.Vector2(-0.42, 0.5),
      new T.Vector2(-0.46, 0.26),
    ]);
    sh.lineTo(-0.6, 0.16);
    sh.lineTo(-0.62, 0);
    const g = new T.ExtrudeGeometry(sh, {
      depth: 0.46,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.06,
      bevelSegments: 6,
      curveSegments: 24,
    });
    g.translate(0, 0.22, -0.23);
    const grp = new T.Group();
    const body = new T.Mesh(g, mat);
    grp.add(body);
    const eye = new T.Mesh(
      new T.SphereGeometry(0.055, 16, 12),
      new T.MeshBasicMaterial({ color: 0x0a0f05 }),
    );
    eye.position.set(0.42, 1.72, 0.33);
    grp.add(eye);
    const eye2 = eye.clone();
    eye2.position.z = -0.33;
    grp.add(eye2);
    const base = new T.Mesh(
      new T.LatheGeometry(
        [
          [0, 0],
          [0.78, 0],
          [0.8, 0.06],
          [0.72, 0.12],
          [0.74, 0.2],
          [0.6, 0.24],
          [0, 0.24],
        ].map(([x, y]) => new T.Vector2(x, y)),
        64,
      ),
      mat,
    );
    grp.add(base);
    return grp;
  };
  // ---------- one pillar ----------
  PIL.pillar = (T, S, K, { x = 0, z = 0, seed = 1, h = 4.2 } = {}) => {
    const g = new T.Group(),
      mat = marble(T, seed),
      dark = new T.MeshPhysicalMaterial({
        color: 0x101511,
        roughness: 0.25,
        metalness: 0.4,
        clearcoat: 1,
      });
    const plinth = new T.Mesh(new T.BoxGeometry(1.3, 0.3, 1.3), dark);
    plinth.position.y = 0.15;
    g.add(plinth);
    const torus = new T.Mesh(new T.CylinderGeometry(0.56, 0.62, 0.16, 64), mat);
    torus.position.y = 0.38;
    g.add(torus);
    const shaft = new T.Mesh(shaftGeo(T, 0.42, h), mat);
    shaft.position.y = 0.46;
    g.add(shaft);
    const neck = new T.Mesh(new T.CylinderGeometry(0.6, 0.4, 0.24, 64), mat);
    neck.position.y = 0.46 + h + 0.12;
    g.add(neck);
    const abacus = new T.Mesh(new T.BoxGeometry(1.26, 0.2, 1.26), mat);
    abacus.position.y = 0.46 + h + 0.34;
    g.add(abacus);
    // glowing brand strip that lights up on the word
    const strip = new T.Mesh(
      new T.BoxGeometry(0.07, h * 0.86, 0.07),
      new T.MeshBasicMaterial({ color: G1, transparent: true, opacity: 0 }),
    );
    strip.position.set(0, 0.46 + h * 0.5, 0.43);
    g.add(strip);
    const gl = new T.PointLight(G2, 0, 7, 1.8);
    gl.position.set(0, 0.8, 1.2);
    g.add(gl);
    g.position.set(x, K.floorY, z);
    S.scene.add(g);
    g.userData = { top: 0.46 + h + 0.44, strip, gl };
    return g;
  };
  // dust burst sprites (pure function of t)
  PIL.burst = (T, S, K, pos, t0, { n = 40, seed = 5, color = 0xd8f5a0 } = {}) => {
    const r = K.rnd(seed),
      grp = new T.Group();
    grp.position.copy(pos);
    S.scene.add(grp);
    const ps = [...Array(n)].map(() => {
      const m = new T.Mesh(
        new T.PlaneGeometry(1, 1),
        new T.MeshBasicMaterial({
          map: K.blobTex,
          color,
          transparent: true,
          depthWrite: false,
          blending: T.AdditiveBlending,
          opacity: 0,
        }),
      );
      grp.add(m);
      const a = r() * 6.28;
      return { m, a, v: 0.8 + r() * 1.8, up: 0.2 + r() * 1.1, s: 0.08 + r() * 0.2 };
    });
    S.on((t) => {
      const u = L.p(t, t0, t0 + 1.3);
      ps.forEach((o) => {
        const k = L.ease.outCubic(u);
        o.m.position.set(Math.cos(o.a) * o.v * k * 1.6, o.up * k, Math.sin(o.a) * o.v * k);
        o.m.scale.setScalar(o.s * (1 + k * 2));
        o.m.material.opacity = u <= 0 || u >= 1 ? 0 : 0.22 * (1 - u);
        o.m.lookAt(S.camera.position);
      });
    });
    return grp;
  };
  // fake volumetric god-ray cone from above
  PIL.ray = (T, S, pos, { h = 9, r = 1.25, color = G1, peak = 0.03 } = {}) => {
    const tx = canvasTex(T, 4, 128, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, "rgba(255,255,255,0.9)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 4, 128);
    });
    const m = new T.Mesh(
      new T.CylinderGeometry(0.18, r, h, 48, 1, true),
      new T.MeshBasicMaterial({
        map: tx,
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: T.AdditiveBlending,
        side: T.DoubleSide,
        fog: false,
      }),
    );
    m.position.set(pos.x, pos.y + h / 2, pos.z);
    S.scene.add(m);
    m.userData.peak = peak;
    return m;
  };
  // 2D glowing word glued to a 3D point
  PIL.word = (
    K,
    target,
    text,
    t,
    { size = 74, out, dy = 0, cls = "hv gradtxt", sfx = "pop" } = {},
  ) => {
    const e = L.el(
      "div",
      cls + " abs",
      L.world,
      {
        fontSize: size + "px",
        whiteSpace: "nowrap",
        filter: "drop-shadow(0 0 14px rgba(116,205,45,.45)) drop-shadow(0 4px 10px rgba(0,0,0,.9))",
        padding: ".22em .05em .1em",
        lineHeight: 1,
      },
      text,
    );
    K.label(target, e, { dy });
    L.sfx(sfx, t);
    L.on((tt) => {
      const u = L.p(tt, t, t + 0.3),
        b = out == null ? 0 : L.p(tt, out - 0.2, out);
      e.style.opacity = L.ease.outCubic(u) * (1 - b);
      e._sx = L.lerp(0.7, 1, L.ease.outBack(u, 1.8));
    });
    return e;
  };

  // ---------- the whole set ----------
  // o: {names:[...], rise:[t...], lit:[t...], spacing, roof:{t, text}, knight:{t}, z}
  PIL.build = async (T, S, K, o) => {
    const {
      names,
      rise,
      lit = rise,
      spacing = 3.3,
      z = 0,
      roof,
      knight,
      h = 4.2,
      wordSize = 74,
      seed = 1,
    } = o;
    PIL.dress(T, S, K);
    const n = names.length,
      xs = names.map((_, i) => (i - (n - 1) / 2) * spacing);
    const pillars = xs.map((x, i) => PIL.pillar(T, S, K, { x, z, seed: seed + i, h }));
    const rays = xs.map((x) => PIL.ray(T, S, new T.Vector3(x, K.floorY, z)));
    pillars.forEach((p, i) =>
      PIL.burst(T, S, K, new T.Vector3(xs[i], K.floorY + 0.05, z + 0.2), rise[i] + 0.25, {
        seed: 3 + i * 7,
      }),
    );
    S.on((t) =>
      pillars.forEach((p, i) => {
        const u = L.ease.outBack(L.p(t, rise[i], rise[i] + 0.75), 1.15),
          d = p.userData;
        p.position.y = K.floorY - (1 - u) * (d.top + 0.4);
        p.rotation.y = (1 - u) * 0.6;
        const l = L.ease.outCubic(L.p(t, lit[i], lit[i] + 0.35));
        d.strip.material.opacity = l * (0.75 + 0.25 * Math.sin(t * 6 + i));
        d.gl.intensity = l * 9;
        rays[i].material.opacity =
          rays[i].userData.peak * L.p(t, rise[i] - 0.2, rise[i] + 0.3) * (0.7 + 0.3 * l);
      }),
    );
    names.forEach((nm, i) =>
      PIL.word(K, () => new T.Vector3(xs[i], K.floorY + 0.46 + h * 0.55, z + 0.6), nm, lit[i], {
        size: wordSize,
      }),
    );
    const out = { pillars, xs, rays };
    if (roof) {
      const w = (n - 1) * spacing + 1.9,
        mat = marble(T, 77);
      const slab = new T.Group();
      const b1 = new T.Mesh(new T.BoxGeometry(w, 0.42, 1.55), mat);
      slab.add(b1);
      const b2 = new T.Mesh(new T.BoxGeometry(w + 0.3, 0.2, 1.75), mat);
      b2.position.y = 0.31;
      slab.add(b2);
      const frieze = new T.Mesh(
        new T.BoxGeometry(w * 0.96, 0.06, 0.02),
        new T.MeshBasicMaterial({ color: G1, transparent: true, opacity: 0 }),
      );
      frieze.position.set(0, 0, 0.79);
      slab.add(frieze);
      S.scene.add(slab);
      const topY = K.floorY + pillars[0].userData.top + 0.21;
      const st = roof.settle != null ? roof.settle : roof.t + 0.5; // floating roof: appears at t, hovers, settles at `settle`
      S.on((t) => {
        const u = L.p(t, roof.t, roof.t + 0.6),
          f = L.ease.outCubic(u),
          sv = L.ease.inCubic(L.p(t, st - 0.32, st));
        const hover = roof.settle != null ? (1.15 + Math.sin(t * 2.1) * 0.1) * (1 - sv) : 0;
        slab.position.set(0, topY + hover + (1 - f) * 7, z);
        slab.visible = u > 0;
        slab.rotation.z =
          (1 - f) * 0.08 + (roof.settle != null ? Math.sin(t * 1.4) * 0.025 * (1 - sv) : 0);
        frieze.material.opacity = L.p(t, st, st + 0.4);
      });
      PIL.burst(T, S, K, new T.Vector3(0, topY, z), st, { n: 60, seed: 41, color: 0xf2ffd0 });
      out.settle = st;
      if (roof.text)
        PIL.word(
          K,
          () => slab.position.clone().add(new T.Vector3(0, 0.02, 0.95)),
          roof.text,
          roof.textT != null ? roof.textT : roof.t + 0.5,
          { size: roof.size || 58, cls: "tw", sfx: "click" },
        );
      out.slab = slab;
      out.topY = topY + 0.41;
      if (knight) {
        const kn = PIL.knight(
          T,
          K.yellow({ emissive: G3, emissiveIntensity: 0.18, roughness: 0.18, metalness: 0.7 }),
        );
        kn.scale.setScalar(1.05);
        S.scene.add(kn);
        S.on((t) => {
          const u = L.ease.outBack(L.p(t, knight.t, knight.t + 0.6), 1.6);
          kn.visible = u > 0;
          kn.position.set(
            0,
            slab.position.y + 0.41 + (1 - L.p(t, knight.t, knight.t + 0.35)) * 2.5,
            z,
          );
          kn.scale.setScalar(1.05 * Math.max(0.001, u));
          kn.rotation.y =
            -0.32 +
            (1 - L.ease.outCubic(L.p(t, knight.t, knight.t + 1.2))) * 3.6 +
            Math.sin(t * 0.8) * 0.1;
        });
        const kl = new T.PointLight(G1, 0, 9, 1.6);
        S.scene.add(kl);
        S.on((t) => {
          kl.position.set(0, slab.position.y + 3.2, z + 2);
          kl.intensity = 6 * L.p(t, knight.t, knight.t + 0.4);
        });
        out.knight = kn;
      }
    }
    K.dust(320, [36, 12, 46], 13, 0xc8f08a);
    return out;
  };
  return PIL;
})();
