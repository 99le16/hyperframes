// l3d.mjs — Three.js layer for lux scenes. Deterministic: rendered synchronously inside __seek(t).
import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const L = window.L;
async function boot() {
  if (!L._three.length) { window.__3dready = true; return; }
  // v13: real chess knight (Poly Haven «Chess Set», CC0, Riley Queen) — normalised geometry + its normal map, for window.KNIGHT
  try {
    const gl = await new GLTFLoader().loadAsync('../models/chess/chess_set_1k.gltf');
    gl.scene.updateMatrixWorld(true);
    const node = gl.scene.getObjectByName('piece_knight_white_01'); let mesh = null; node.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
    const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld); geo.computeBoundingBox();
    const b = geo.boundingBox, h = b.max.y - b.min.y;
    geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); geo.scale(1 / h, 1 / h, 1 / h);
    window.KNIGHT_GEO = geo; window.KNIGHT_NOR = mesh.material.normalMap || null;
  } catch (e) { console.warn('knight model failed', e); }
  const W = 1920, H = 1080;
  const renderer = new T.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .9; renderer.outputColorSpace = T.SRGBColorSpace;
  const cv = renderer.domElement; Object.assign(cv.style, {position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px'});
  (L.l3dParent || L.stage).insertBefore(cv, L.world);                 // 3D sits between background and the 2D world
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(35, W / H, .1, 500); camera.position.set(0, 0, 12);
  const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new T.AmbientLight(0xffffff, .35));
  const key = new T.DirectionalLight(0xffffff, 2.2); key.position.set(4, 6, 8); scene.add(key);
  const rim = new T.DirectionalLight(0x6a8cff, 2.5); rim.position.set(-6, 3, -6); scene.add(rim);
  const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new T.Vector2(W, H), .6, .5, .82); composer.addPass(bloom); composer.addPass(new OutputPass());
  const ups = [], S = {T, scene, camera, renderer, bloom, composer, key, rim, on: f => ups.push(f), bloomOn: true};
  for (const fn of L._three) await fn(T, S);
  L.on(t => { for (const f of ups) f(t); const b0 = bloom.strength, th0 = bloom.threshold;   // v12: user found the glow too strong
    bloom.strength = Math.min(b0 * .55, .5); bloom.threshold = Math.max(th0, .88);
    if (S.bloomOn) composer.render(); else renderer.render(scene, camera); bloom.strength = b0; bloom.threshold = th0; });
  window.__3dready = true;
}
boot().catch(e => { window.__3derr = String(e && e.stack || e); window.__3dready = true; });
