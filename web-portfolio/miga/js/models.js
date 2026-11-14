// Free 3D models (CC0, see CREDITS.md), loaded once and cloned where a scene needs more than one.
import * as THREE from 'three';
import { GLTFLoader } from '../assets/vendor/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();

/** Load assets/models/<name>.glb once. Resolves to the glTF scene (do not add it twice; use model()). */
function raw(name) {
  if (!cache.has(name)) cache.set(name, loader.loadAsync(`assets/models/${name}.glb`).then(g => g.scene));
  return cache.get(name);
}

/**
 * A ready-to-place copy of a model: centred on x/z, sitting on y = 0, scaled so its largest
 * horizontal size (or height, with by: 'h') equals `size`.
 */
export async function model(name, { size = 1, by = 'w', only = null } = {}) {
  const src = await raw(name);
  let obj = src.clone(true);
  if (only) { const keep = obj.getObjectByName(only); obj = new THREE.Group(); keep.position.set(0, 0, 0); obj.add(keep); }
  const box = new THREE.Box3().setFromObject(obj), s = new THREE.Vector3(); box.getSize(s);
  const k = size / (by === 'h' ? s.y : Math.max(s.x, s.z));
  const c = new THREE.Vector3(); box.getCenter(c);
  obj.position.set(-c.x, -box.min.y, -c.z);
  const wrap = new THREE.Group(); wrap.add(obj); wrap.scale.setScalar(k);
  wrap.userData.height = s.y * k;
  wrap.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.envMapIntensity = 1; } });
  return wrap;
}

export const preload = names => Promise.all(names.map(raw));
