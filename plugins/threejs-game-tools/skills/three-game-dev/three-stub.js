/*
 * three-stub.js — 화면 없이(Node) 게임 로직을 돌려 보기 위한 가짜 THREE (Three.js r128 API 일부)
 *
 * 인터넷이 막혀 진짜 three.js 를 받을 수 없을 때, 코드가 오류 없이 도는지·숫자가 맞는지 확인하는 용도예요.
 * 그림은 그리지 않아요. 정점 위치·회전·크기 변환과 씬 트리는 진짜처럼 계산해요.
 * r128 에 없는 것(CapsuleGeometry 등)은 일부러 없어서, 쓰면 바로 오류가 나요.
 *
 *   node -e "require('./three-stub.js').install(); require('./models3d.js'); ..."
 *   require('./three-stub.js').install()  →  globalThis.THREE, document, window 를 깔아요
 */
'use strict';
class Vector2 { constructor(x = 0, y = 0) { this.x = x; this.y = y; } set(x, y) { this.x = x; this.y = y; return this; } }
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; this.isVector3 = true; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setX(v) { this.x = v; return this; } setY(v) { this.y = v; return this; } setZ(v) { this.z = v; return this; }
  addScalar(s) { this.x += s; this.y += s; this.z += s; return this; }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  normalize() { const l = this.length() || 1; return this.multiplyScalar(1 / l); }
  lerpVectors(a, b, t) { this.x = a.x + (b.x - a.x) * t; this.y = a.y + (b.y - a.y) * t; this.z = a.z + (b.z - a.z) * t; return this; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
}
const NAMED = { white: 0xffffff, black: 0, red: 0xff0000, green: 0x008000, blue: 0x0000ff, orange: 0xffa500, yellow: 0xffff00, gold: 0xffd700 };
class Color {
  constructor(c) { this.r = 1; this.g = 1; this.b = 1; this.isColor = true; if (c !== undefined) this.set(c); }
  set(c) {
    if (c && c.isColor) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
    if (typeof c === 'string') { c = c.startsWith('#') ? parseInt(c.slice(1).length === 3 ? c.slice(1).replace(/./g, '$&$&') : c.slice(1), 16) : NAMED[c]; if (c === undefined) throw new Error('Color: 모르는 색 이름'); }
    if (typeof c !== 'number' || !isFinite(c)) throw new Error('Color: 잘못된 값 ' + c);
    this.r = ((c >> 16) & 255) / 255; this.g = ((c >> 8) & 255) / 255; this.b = (c & 255) / 255; return this;
  }
  setHSL(h, s, l) {
    const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    this.r = f(0); this.g = f(8); this.b = f(4); return this;
  }
  clone() { return new Color(this); }
  copy(c) { return this.set(c); }
  lerp(c, t) { this.r += (c.r - this.r) * t; this.g += (c.g - this.g) * t; this.b += (c.b - this.b) * t; return this; }
  multiplyScalar(s) { this.r *= s; this.g *= s; this.b *= s; return this; }
  getHex() { return (Math.round(this.r * 255) << 16) | (Math.round(this.g * 255) << 8) | Math.round(this.b * 255); }
}
class Euler { constructor() { this.x = 0; this.y = 0; this.z = 0; this.order = 'XYZ'; } set(x, y, z, o) { this.x = x; this.y = y; this.z = z; if (o) this.order = o; return this; } }
class Quaternion { constructor() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; } copy(q) { Object.assign(this, { x: q.x, y: q.y, z: q.z, w: q.w }); return this; } }
class Matrix4 { constructor() { this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; } }

class Object3D {
  constructor() {
    this.isObject3D = true; this.type = 'Object3D'; this.name = ''; this.parent = null; this.children = [];
    this.position = new Vector3(); this.rotation = new Euler(); this.scale = new Vector3(1, 1, 1); this.quaternion = new Quaternion();
    this.matrix = new Matrix4(); this.visible = true; this.userData = {}; this.castShadow = false; this.receiveShadow = false; this.renderOrder = 0; this.frustumCulled = true;
  }
  add(...os) { for (const o of os) { if (!o || !o.isObject3D) throw new Error('add: Object3D 가 아니에요'); if (o.parent) o.parent.remove(o); o.parent = this; this.children.push(o); } return this; }
  remove(o) { const i = this.children.indexOf(o); if (i >= 0) { this.children.splice(i, 1); o.parent = null; } return this; }
  traverse(fn) { fn(this); for (const c of this.children.slice()) c.traverse(fn); }
  getWorldPosition(t) { // 회전은 무시하고 위치·크기만 누적 (테스트용 근사)
    t.copy(this.position); let p = this.parent; while (p) { t.x = t.x * p.scale.x + p.position.x; t.y = t.y * p.scale.y + p.position.y; t.z = t.z * p.scale.z + p.position.z; p = p.parent; } return t;
  }
  lookAt() { return this; } rotateX(a) { this.rotation.x += a; return this; } rotateY(a) { this.rotation.y += a; return this; } rotateZ(a) { this.rotation.z += a; return this; }
  updateMatrix() {} updateMatrixWorld() {}
  localToWorld(v) { const w = this.getWorldPosition(new Vector3()); return v.add(w); }
  worldToLocal(v) { const w = this.getWorldPosition(new Vector3()); return v.sub(w); }
  updateWorldMatrix() {}
}
class Group extends Object3D { constructor() { super(); this.type = 'Group'; this.isGroup = true; } }
class Scene extends Object3D { constructor() { super(); this.type = 'Scene'; this.isScene = true; this.background = null; this.fog = null; } }
class Mesh extends Object3D { constructor(geometry, material) { super(); this.type = 'Mesh'; this.isMesh = true; if (!geometry || !geometry.isBufferGeometry) throw new Error('Mesh: geometry 가 BufferGeometry 가 아니에요'); this.geometry = geometry; this.material = material; } }
class Points extends Mesh { constructor(g, m) { super(g, m); this.type = 'Points'; this.isPoints = true; } }
class InstancedMesh extends Mesh { constructor(g, m, count) { super(g, m); this.count = count; this.isInstancedMesh = true; this.mats = []; this.cols = []; } setMatrixAt(i, m) { if (i >= this.count) throw new Error('setMatrixAt 범위 밖'); this.mats[i] = m; } setColorAt(i, c) { this.cols[i] = c; } }
class Line extends Mesh { constructor(g, m) { super(g, m); this.type = 'Line'; this.isLine = true; } }
class Sprite extends Object3D { constructor(material) { super(); this.type = 'Sprite'; this.isSprite = true; this.material = material; this.center = new Vector2(0.5, 0.5); } }
class Light extends Object3D { constructor(color, intensity = 1) { super(); this.color = new Color(color); this.intensity = intensity; this.isLight = true; } }
class PointLight extends Light { constructor(c, i, d = 0) { super(c, i); this.distance = d; } }
class DirectionalLight extends Light { constructor(c, i) { super(c, i); this.target = new Object3D(); this.shadow = { mapSize: new Vector2(512, 512), camera: {} }; } }
class AmbientLight extends Light {}
class HemisphereLight extends Light { constructor(a, b, i) { super(a, i); this.groundColor = new Color(b); } }
class PerspectiveCamera extends Object3D { constructor(fov = 50, aspect = 1, near = 0.1, far = 2000) { super(); Object.assign(this, { fov, aspect, near, far, isCamera: true }); } updateProjectionMatrix() {} }

class BufferAttribute {
  constructor(array, itemSize) { if (!ArrayBuffer.isView(array)) throw new Error('BufferAttribute: 타입 배열이 필요해요'); this.array = array; this.itemSize = itemSize; this.count = array.length / itemSize; this.needsUpdate = false; }
  getX(i) { return this.array[i * this.itemSize]; } getY(i) { return this.array[i * this.itemSize + 1]; } getZ(i) { return this.array[i * this.itemSize + 2]; }
  setX(i, v) { this.array[i * this.itemSize] = v; return this; } setY(i, v) { this.array[i * this.itemSize + 1] = v; return this; } setZ(i, v) { this.array[i * this.itemSize + 2] = v; return this; }
  setXYZ(i, x, y, z) { const j = i * this.itemSize; this.array[j] = x; this.array[j + 1] = y; this.array[j + 2] = z; return this; }
}
const Float32BufferAttribute = class extends BufferAttribute { constructor(a, s) { super(new Float32Array(a), s); } };
class BufferGeometry {
  constructor() { this.isBufferGeometry = true; this.attributes = {}; this.drawRange = { start: 0, count: Infinity }; this.index = null; this.disposed = false; }
  setAttribute(n, a) { this.attributes[n] = a; return this; } getAttribute(n) { return this.attributes[n]; }
  setDrawRange(s, c) { this.drawRange.start = s; this.drawRange.count = c; }
  _map(fn) { const p = this.attributes.position; if (!p) return this; for (let i = 0; i < p.count; i++) { const v = fn(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, v[0], v[1], v[2]); } return this; }
  translate(x, y, z) { return this._map((a, b, c) => [a + x, b + y, c + z]); }
  scale(x, y, z) { return this._map((a, b, c) => [a * x, b * y, c * z]); }
  rotateX(t) { const c = Math.cos(t), s = Math.sin(t); return this._map((x, y, z) => [x, y * c - z * s, y * s + z * c]); }
  rotateY(t) { const c = Math.cos(t), s = Math.sin(t); return this._map((x, y, z) => [x * c + z * s, y, -x * s + z * c]); }
  rotateZ(t) { const c = Math.cos(t), s = Math.sin(t); return this._map((x, y, z) => [x * c - y * s, x * s + y * c, z]); }
  computeVertexNormals() {} computeBoundingBox() {} computeBoundingSphere() {}
  dispose() { this.disposed = true; }
  clone() { const g = new BufferGeometry(); for (const k in this.attributes) g.setAttribute(k, new BufferAttribute(this.attributes[k].array.slice(), this.attributes[k].itemSize)); return g; }
}
function fromPts(pts) { const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(pts.flat()), 3)); return g; }
function ring(r, y, n) { const o = []; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; o.push([Math.sin(a) * r, y, Math.cos(a) * r]); } return o; }
class SphereGeometry extends BufferGeometry { constructor(r = 1, w = 8, h = 6) { super(); const p = []; for (let j = 0; j <= h; j++) { const v = j / h, phi = v * Math.PI; for (let i = 0; i <= w; i++) { const t = (i / w) * Math.PI * 2; p.push([-r * Math.cos(t) * Math.sin(phi), r * Math.cos(phi), r * Math.sin(t) * Math.sin(phi)]); } } Object.assign(this, fromPts(p)); this.isBufferGeometry = true; } }
class BoxGeometry extends BufferGeometry { constructor(w = 1, h = 1, d = 1) { super(); const p = []; for (const x of [-w / 2, w / 2]) for (const y of [-h / 2, h / 2]) for (const z of [-d / 2, d / 2]) p.push([x, y, z]); Object.assign(this, fromPts(p)); } }
class CylinderGeometry extends BufferGeometry { constructor(rt = 1, rb = 1, h = 1, rs = 8) { super(); Object.assign(this, fromPts([...ring(rt, h / 2, rs), ...ring(rb, -h / 2, rs)])); } }
class ConeGeometry extends CylinderGeometry { constructor(r = 1, h = 1, rs = 8) { super(0, r, h, rs); } }
class IcosahedronGeometry extends BufferGeometry { constructor(r = 1, detail = 0) { super(); const t = (1 + Math.sqrt(5)) / 2; const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((a) => { const l = Math.hypot(...a); return a.map((c) => (c / l) * r); }); const p = []; for (let k = 0; k <= detail; k++) p.push(...v); Object.assign(this, fromPts(p)); } }
class RingGeometry extends BufferGeometry { constructor(ri = 0.5, ro = 1, n = 8) { super(); Object.assign(this, fromPts([...ring(ri, 0, n), ...ring(ro, 0, n)].map(([x, , z]) => [x, z, 0]))); } }
class PlaneGeometry extends BufferGeometry { constructor(w = 1, h = 1, ws = 1, hs = 1) { super(); const p = [], uv = []; for (let j = 0; j <= hs; j++) for (let i = 0; i <= ws; i++) { p.push([(i / ws - 0.5) * w, (0.5 - j / hs) * h, 0]); uv.push(i / ws, 1 - j / hs); } Object.assign(this, fromPts(p)); this.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2)); this.index = { array: new Uint16Array(ws * hs * 6), count: ws * hs * 6 }; } }
class CircleGeometry extends BufferGeometry { constructor(r = 1, n = 8) { super(); Object.assign(this, fromPts([[0, 0, 0], ...ring(r, 0, n).map(([x, , z]) => [x, z, 0])])); } }
class Shape { constructor() { this.pts = []; } moveTo(x, y) { this.pts.push([x, y]); return this; } lineTo(x, y) { this.pts.push([x, y]); return this; } closePath() { return this; } quadraticCurveTo(cx, cy, x, y) { this.pts.push([x, y]); return this; } }
class ShapeGeometry extends BufferGeometry { constructor(s) { super(); if (!(s instanceof Shape)) throw new Error('ShapeGeometry: Shape 가 필요해요'); Object.assign(this, fromPts(s.pts.map(([x, y]) => [x, y, 0]))); } }
class ExtrudeGeometry extends BufferGeometry { constructor(s, o = {}) { super(); const d = o.depth == null ? 1 : o.depth; Object.assign(this, fromPts([...s.pts.map(([x, y]) => [x, y, 0]), ...s.pts.map(([x, y]) => [x, y, d])])); } }

class InstancedBufferGeometry extends BufferGeometry { constructor() { super(); this.isInstancedBufferGeometry = true; this.instanceCount = Infinity; } }
class InstancedBufferAttribute extends BufferAttribute { constructor(a, s) { super(a, s); this.isInstancedBufferAttribute = true; } setUsage() { return this; } }
class TorusGeometry extends BufferGeometry { constructor(r = 1, t = 0.4, rs = 8, ts = 6, arc = Math.PI * 2) { super(); const p = []; for (let i = 0; i <= ts; i++) { const a = (i / ts) * arc; p.push([Math.cos(a) * r, Math.sin(a) * r, 0]); } Object.assign(this, fromPts(p)); } }
class Texture { constructor(image) { this.image = image; this.isTexture = true; this.repeat = new Vector2(1, 1); this.needsUpdate = false; this.disposed = false; } dispose() { this.disposed = true; } }
class CanvasTexture extends Texture {}
class DataTexture extends Texture {}
class Material {
  constructor(p = {}) { this.isMaterial = true; this.transparent = false; this.opacity = 1; this.disposed = false; this.setValues(p); }
  setValues(p) { for (const k in p) { if (p[k] === undefined) throw new Error(`Material: '${k}' 값이 undefined 예요`); this[k] = k === 'color' || k === 'emissive' ? new Color(p[k]) : p[k]; } if (!this.color) this.color = new Color(0xffffff); }
  clone() { const m = new this.constructor({}); for (const k in this) m[k] = this[k] && this[k].isColor ? this[k].clone() : this[k]; m.disposed = false; return m; }
  dispose() { this.disposed = true; }
}
const MATS = ['MeshBasicMaterial', 'MeshLambertMaterial', 'MeshPhongMaterial', 'MeshStandardMaterial', 'MeshToonMaterial', 'SpriteMaterial', 'PointsMaterial', 'ShaderMaterial', 'LineBasicMaterial'];
const T = {
  REVISION: '128-stub', Vector2, Vector3, Color, Euler, Quaternion, Matrix4, Object3D, Group, Scene, Mesh, Points, Line, InstancedMesh, Sprite,
  PointLight, DirectionalLight, AmbientLight, HemisphereLight, PerspectiveCamera,
  BufferAttribute, Float32BufferAttribute, BufferGeometry, InstancedBufferGeometry, InstancedBufferAttribute, TorusGeometry, DynamicDrawUsage: 35048, StaticDrawUsage: 35044, SphereGeometry, BoxGeometry, CylinderGeometry, ConeGeometry, IcosahedronGeometry, RingGeometry, PlaneGeometry, CircleGeometry, Shape, ShapeGeometry, ExtrudeGeometry,
  Texture, CanvasTexture, DataTexture, Material,
  FrontSide: 0, BackSide: 1, DoubleSide: 2, NormalBlending: 1, AdditiveBlending: 2, NearestFilter: 1003, LinearFilter: 1006, RepeatWrapping: 1000, ClampToEdgeWrapping: 1001,
  MathUtils: { clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, t) => a + (b - a) * t, degToRad: (d) => (d * Math.PI) / 180 },
};
for (const n of MATS) T[n] = class extends Material {};
T.WebGLRenderer = class { constructor(o = {}) { this.domElement = o.canvas || fakeCanvas(); this.shadowMap = {}; this._pr = 1; } setSize() {} setPixelRatio(r) { this._pr = r; } getPixelRatio() { return this._pr; } render() {} setClearColor() {} dispose() {} };
T.Fog = class { constructor(c, n, f) { this.color = new Color(c); this.near = n; this.far = f; } };
T.FogExp2 = class { constructor(c, d) { this.color = new Color(c); this.density = d; } };

function fakeCanvas() {
  const ctx = new Proxy({}, { get: (o, k) => {
    if (k === 'measureText') return (s) => ({ width: String(s).length * 30 });
    if (k === 'createImageData' || k === 'getImageData') return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
    if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (k in o) return o[k];
    return () => {};
  }, set: (o, k, v) => { o[k] = v; return true; } });
  return { width: 300, height: 150, style: {}, getContext: () => ctx, addEventListener() {}, toDataURL: () => 'data:,' };
}
function install(target = globalThis) {
  target.THREE = T;
  if (!target.document) target.document = { createElement: (t) => (t === 'canvas' ? fakeCanvas() : { style: {}, appendChild() {}, addEventListener() {} }), body: { appendChild() {} } };
  if (!target.window) target.window = target;
  if (!target.innerHeight) { target.innerHeight = 800; target.innerWidth = 1200; }
  return T;
}
module.exports = { install, THREE: T };
