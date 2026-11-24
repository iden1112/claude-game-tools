// ================= 맵 (훈련장 1v1 경기장) =================
const ARENA = 50;
const ARENA_BOUNDS = { minX: -ARENA, maxX: ARENA, minZ: -ARENA, maxZ: ARENA };
const WORLD = { boxes: [], half: 50, smokes: [], bounds: ARENA_BOUNDS, map: null };
// 맵 여러 개: 같은 자리(가운데)에 만들어 두고, 쓰는 맵만 보이게 + 충돌 상자 바꾸기
const MAPS = {}, MAP_DEFS = {}; let BUILD = null;
function WADD(o) { (BUILD ? BUILD.group : scene).add(o); }

// 상자 하나: 바닥 높이 y0 에서 시작
function addBox(cx, y0, cz, w, h, d, mat, opt = {}) {
  const b = { min: new V3(cx - w / 2, y0, cz - d / 2), max: new V3(cx + w / 2, y0 + h, cz + d / 2), kind: opt.kind || 'solid', pen: opt.pen || 0 };
  WORLD.boxes.push(b); if (BUILD) b.map = BUILD.id;
  if (opt.invisible) return b;
  const ts = opt.texScale === undefined ? 2 : opt.texScale;
  const m = new THREE.Mesh(boxGeo(w, h, d, ts), mat);
  m.position.set(cx, y0 + h / 2, cz);
  m.castShadow = opt.shadow !== false; m.receiveShadow = true;
  WADD(m); b.mesh = m;
  return b;
}
// 중심 대칭 (점대칭) 으로 두 번 놓기: 양쪽이 공평하게
function addSym(cx, y0, cz, w, h, d, mat, opt) { addBox(cx, y0, cz, w, h, d, mat, opt); addBox(-cx, y0, -cz, w, h, d, mat, opt); }

function container(cx, y0, cz, long, alongX, color) {
  const L = long ? 12.2 : 6.1, W = 2.44, H = 2.6;
  const w = alongX ? L : W, d = alongX ? W : L;
  const b = addBox(cx, y0, cz, w, H, d, MAT.cont[color % MAT.cont.length], { texScale: 2.6, kind: 'metal' });
  // 테두리 프레임 (보기용)
  const fm = MAT.dark;
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [sx, sz] of corners) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, H + 0.02, 0.16), fm);
    p.position.set(cx + sx * (w / 2 - 0.07), y0 + H / 2, cz + sz * (d / 2 - 0.07)); p.castShadow = true; WADD(p);
  }
  // 문 쪽 손잡이 막대
  const endX = alongX, sgn = 1;
  for (let k = -1; k <= 1; k += 2) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, H - 0.3, 6), fm);
    if (endX) bar.position.set(cx + sgn * (w / 2 + 0.03), y0 + H / 2, cz + k * 0.45);
    else bar.position.set(cx + k * 0.45, y0 + H / 2, cz + sgn * (d / 2 + 0.03));
    WADD(bar);
  }
  return b;
}
function containerSym(cx, y0, cz, long, alongX, color) { container(cx, y0, cz, long, alongX, color); container(-cx, y0, -cz, long, alongX, color + 1); }

function crate(cx, y0, cz, s = 1.3, rot = 0) {
  const b = addBox(cx, y0, cz, s, s, s, MAT.wood, { texScale: 0, kind: 'wood', pen: 0.4 });
  b.mesh.rotation.y = rot * 0; // 충돌이 AABB라서 회전은 안 함
  return b;
}
function crateSym(cx, y0, cz, s) { crate(cx, y0, cz, s); crate(-cx, y0, -cz, s); }

// 계단: 바닥에서 위로 쌓인 단 (방향 dir: 'x+','x-','z+','z-' 올라가는 쪽)
function stairs(x0, z0, width, steps, rise, run, dir, mat) {
  for (let i = 0; i < steps; i++) {
    const h = rise * (i + 1);
    let cx = x0, cz = z0, w, d;
    if (dir === 'z+') { cz = z0 + run * (i + 0.5); w = width; d = run; }
    if (dir === 'z-') { cz = z0 - run * (i + 0.5); w = width; d = run; }
    if (dir === 'x+') { cx = x0 + run * (i + 0.5); w = run; d = width; }
    if (dir === 'x-') { cx = x0 - run * (i + 0.5); w = run; d = width; }
    addBox(cx, 0, cz, w, h, d, mat, { texScale: 1.5, kind: 'stair' });
  }
}

// 철제 발판 (기둥 + 바닥 + 낮은 난간 + 계단) — 올라가서 싸울 수 있는 높은 곳
function scaffold(cx, cz, w, d, h, stairDir) {
  const deck = 0.2, top = h + deck;
  addBox(cx, h, cz, w, deck, d, MAT.metal, { texScale: 1.5, kind: 'metal' });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) addBox(cx + sx * (w / 2 - 0.12), 0, cz + sz * (d / 2 - 0.12), 0.22, h, 0.22, MAT.dark, { texScale: 0, kind: 'metal' });
  // 난간 (계단 쪽은 비움), 0.9m 라서 넘어갈 수도 있어요
  const rail = (x, z, rw, rd) => addBox(x, top, z, rw, 0.9, rd, MAT.metal, { texScale: 1.5, kind: 'metal' });
  if (stairDir !== 'z-') rail(cx, cz - d / 2 + 0.06, w, 0.12);
  if (stairDir !== 'z+') rail(cx, cz + d / 2 - 0.06, w, 0.12);
  if (stairDir !== 'x-') rail(cx - w / 2 + 0.06, cz, 0.12, d);
  if (stairDir !== 'x+') rail(cx + w / 2 - 0.06, cz, 0.12, d);
  const steps = Math.ceil(top / 0.32), rise = top / steps, run = 0.45;
  if (stairDir === 'z-') stairs(cx, cz - d / 2 - steps * run, Math.min(1.4, w), steps, rise, run, 'z+', MAT.metal);
  if (stairDir === 'z+') stairs(cx, cz + d / 2 + steps * run, Math.min(1.4, w), steps, rise, run, 'z-', MAT.metal);
  if (stairDir === 'x-') stairs(cx - w / 2 - steps * run, cz, Math.min(1.4, d), steps, rise, run, 'x+', MAT.metal);
  if (stairDir === 'x+') stairs(cx + w / 2 + steps * run, cz, Math.min(1.4, d), steps, rise, run, 'x-', MAT.metal);
}
function scaffoldSym(cx, cz, w, d, h, dir) {
  scaffold(cx, cz, w, d, h, dir);
  const flip = { 'z-': 'z+', 'z+': 'z-', 'x-': 'x+', 'x+': 'x-' }[dir];
  scaffold(-cx, -cz, w, d, h, flip);
}
// 계단식 나무상자 더미: 한 칸씩 뛰어 올라가요
function crateSteps(cx, cz, dir) {
  const s = 1.2, dx = dir === 'x' ? 1 : 0, dz = dir === 'z' ? 1 : 0;
  for (let i = 0; i < 3; i++) for (let k = 0; k <= i; k++) crate(cx + dx * i * s, k * s, cz + dz * i * s, s);
}
function crateStepsSym(cx, cz, dir) {
  crateSteps(cx, cz, dir);
  const s = 1.2, dx = dir === 'x' ? 1 : 0, dz = dir === 'z' ? 1 : 0;
  for (let i = 0; i < 3; i++) for (let k = 0; k <= i; k++) crate(-(cx + dx * i * s), k * s, -(cz + dz * i * s), s);
}
function buildWorld() {
  // 바닥
  const g = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), MAT.ground);
  g.rotation.x = -Math.PI / 2; g.position.y = -0.06; g.receiveShadow = true;
  TEX.ground.repeat.set(120, 120);
  scene.add(g);
  const scenery = new THREE.Group(); scene.add(scenery); BUILD = { id: null, group: scenery };
  const sceneryTrees = new THREE.Group(); scene.add(sceneryTrees);
  // 경기장 밖 풍경: 언덕과 나무 (멀리 흐릿하게)
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x6f7d58, roughness: 1, flatShading: true });
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * Math.PI * 2 + rand(-0.05, 0.05), r = rand(170, 320);
    const h = rand(18, 60);
    if (Math.hypot(Math.cos(a) * r - 300, Math.sin(a) * r) < 150) continue; // 훈련장 자리 비우기
    const m = new THREE.Mesh(new THREE.ConeGeometry(rand(40, 90), h, 7), hillMat);
    m.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r); WADD(m);
  }
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x3e5a35, roughness: 1, flatShading: true });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4f3b28, roughness: 1 });
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2, r = rand(60, 150);
    const t = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), trunkMat); tr.position.y = 1.5; t.add(tr);
    const s = rand(0.8, 1.6);
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(2.6 - k * 0.6, 3.2, 7), treeMat); c.position.y = 3.6 + k * 1.8; c.castShadow = false; t.add(c); }
    t.scale.setScalar(s); t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); sceneryTrees.add(t);
  }
  BUILD = null; mergeStatic(scenery); mergeStatic(sceneryTrees);
  window.SCENERY = { hillMat, trees: sceneryTrees };
  // 예전 두 맵 (만드는 함수와 AI 자리)
  MAP_DEFS.arena.build = () => { buildArena(); return [[16, 20], [0, 17], [-19, 13], [6, 8], [-8, 9.5], [30, 14], [-22, 6], [13, 6.5], [0, 7.2]]; };
  MAP_DEFS.duel.build = () => { buildDuel(); return [[0, 4], [6.5, 9.5], [-8, 15], [8, 21], [-3, 26], [10, 2.5], [-10.5, 4.5]]; };
  setMap('duel');
}
// 맵은 처음 쓸 때 만들어요
function ensureMap(id) {
  if (MAPS[id]) return MAPS[id];
  const D = MAP_DEFS[id] || MAP_DEFS.duel;
  if (MAPS[D.id]) return MAPS[D.id];
  let spots = [];
  buildMap(D.id, D.bounds, D.spawnZ, null, () => {
    spots = D.build() || [];
    // AI 자리가 벽 속이면 조금씩 뒤로 옮기기
    const B = D.bounds, v = new V3();
    spots = spots.map(([x, z]) => { for (let k = 0; k < 6; k++) { v.set(x, 1, z); if (!pointInBoxes(v, 0.5)) break; z += 1.5; } return [clamp(x, B.minX + 2, B.maxX - 2), clamp(z, 1, B.maxZ - 6)]; });
  });
  MAPS[D.id].spots = spots.length ? spots : [[0, 8]];
  MAPS[D.id].def = D;
  return MAPS[D.id];
}
// ================= 최적화: 안 움직이는 물체를 재질별로 한 덩어리로 합치기 =================
// (상자 수백 개를 하나씩 그리면 느려서, 같은 재질끼리 묶어 한 번에 그려요)
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  root.traverse(o => {
    if (!o.isMesh || o.userData.keep || Array.isArray(o.material)) return;
    const a = o.geometry.attributes; if (!a.position || !a.normal || !a.uv) return;
    const k = o.material.uuid + '|' + o.castShadow + '|' + o.receiveShadow + '|' + o.renderOrder;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(o);
  });
  const m4 = new THREE.Matrix4(), n3 = new THREE.Matrix3(), v = new V3();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    let nv = 0, ni = 0;
    for (const o of list) { const g = o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), I = new Uint32Array(ni);
    let vo = 0, io = 0;
    for (const o of list) {
      const g = o.geometry, pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv;
      m4.multiplyMatrices(inv, o.matrixWorld); n3.getNormalMatrix(m4);
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m4); P[(vo + i) * 3] = v.x; P[(vo + i) * 3 + 1] = v.y; P[(vo + i) * 3 + 2] = v.z;
        v.fromBufferAttribute(na, i).applyMatrix3(n3).normalize(); N[(vo + i) * 3] = v.x; N[(vo + i) * 3 + 1] = v.y; N[(vo + i) * 3 + 2] = v.z;
        U[(vo + i) * 2] = ua.getX(i); U[(vo + i) * 2 + 1] = ua.getY(i);
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) I[io++] = g.index.getX(i) + vo;
      else for (let i = 0; i < pa.count; i++) I[io++] = i + vo;
      vo += pa.count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    geo.setIndex(new THREE.BufferAttribute(I, 1)); geo.computeBoundingSphere(); geo.computeBoundingBox();
    const f = list[0], mesh = new THREE.Mesh(geo, f.material);
    mesh.castShadow = f.castShadow; mesh.receiveShadow = f.receiveShadow; mesh.renderOrder = f.renderOrder;
    for (const o of list) { o.parent.remove(o); o.geometry.dispose(); }
    root.add(mesh);
  }
}
function buildMap(id, bounds, spawnZ, spots, fn) {
  const M = MAPS[id] = { id, group: new THREE.Group(), bounds, spawnZ, spots, boxes: [] };
  scene.add(M.group); BUILD = M;
  const saved = WORLD.boxes; WORLD.boxes = M.boxes;
  fn();
  mergeStatic(M.group);
  buildNav(bounds); M.nav = { grid: NAV.grid, cover: NAV.cover };
  WORLD.boxes = saved; BUILD = null;
}
function setMap(id) {
  const M = ensureMap(id); id = M.id;
  const extra = WORLD.boxes.filter(b => !b.map);
  WORLD.boxes = M.boxes.concat(extra);
  for (const k in MAPS) MAPS[k].group.visible = k === id;
  NAV.grid = M.nav.grid; NAV.cover = M.nav.cover;
  WORLD.map = M; WORLD.bounds = M.bounds;
  const B = M.bounds; setShadowArea(Math.min(80, Math.max(B.maxX, B.maxZ) + 12));
  if (typeof applyTheme === 'function') applyTheme(M.def ? M.def.theme : 'base');
}
function buildArena() {
  // 경기장 안쪽 바닥(콘크리트 패드)
  const padTex = TEX.concrete.clone(); padTex.needsUpdate = true; padTex.repeat.set(25, 25);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2, ARENA * 2), new THREE.MeshStandardMaterial({ map: padTex, color: 0x8d8a83, roughness: 0.95 }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0; pad.receiveShadow = true; WADD(pad);
  // 페인트 선 (경기장 안내선)
  const lineMat = new THREE.MeshStandardMaterial({ map: TEX.lines, transparent: true, opacity: 0.8, roughness: 0.9, color: 0xc9bb7c, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
  const addLine = (x, z, w, d) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.02, z); l.renderOrder = 1; l.receiveShadow = true; WADD(l); };
  addLine(0, 0, 0.25, ARENA * 2 - 2); addLine(0, -ARENA + 8, 18, 0.25); addLine(0, ARENA - 8, 18, 0.25);
  const circ = new THREE.Mesh(new THREE.RingGeometry(9.6, 9.85, 64), lineMat); circ.rotation.x = -Math.PI / 2; circ.position.y = 0.02; circ.renderOrder = 1; WADD(circ);

  // 바깥 벽
  const H = 5;
  addBox(0, 0, -ARENA - 0.5, ARENA * 2 + 2, H, 1, MAT.concreteDark, { texScale: 3 });
  addBox(0, 0, ARENA + 0.5, ARENA * 2 + 2, H, 1, MAT.concreteDark, { texScale: 3 });
  addBox(-ARENA - 0.5, 0, 0, 1, H, ARENA * 2, MAT.concreteDark, { texScale: 3 });
  addBox(ARENA + 0.5, 0, 0, 1, H, ARENA * 2, MAT.concreteDark, { texScale: 3 });
  // 벽 위 철조망 기둥
  for (let i = -ARENA; i <= ARENA; i += 6) {
    for (const [x, z] of [[i, -ARENA - 0.5], [i, ARENA + 0.5], [-ARENA - 0.5, i], [ARENA + 0.5, i]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), MAT.dark); p.position.set(x, H + 0.7, z); WADD(p);
    }
  }

  // ---- 가운데 2층 건물 (14 x 10) ----
  const T = 0.3, F1 = 3.2, BW = 14, BD = 10, hx = BW / 2, hz = BD / 2;
  const C = MAT.concrete;
  // 남/북 벽: 가운데 문(폭 1.8, 높이 2.3) + 양쪽 창문
  for (const s of [-1, 1]) {
    const z = s * (hz - T / 2);
    // 문 양쪽 벽 (창문 구멍 포함)
    for (const side of [-1, 1]) {
      const segL = hx - 0.9; // 문 옆부터 모서리까지
      const xc = side * (0.9 + segL / 2);
      // 창 구멍: 모서리 쪽 가운데 폭 1.6 높이 1.1~2.1
      const winC = side * (0.9 + segL * 0.55), ww = 1.6;
      const aW = Math.abs(winC - side * 0.9) - ww / 2; // 문~창 사이
      const bW = segL - aW - ww;
      addBox(side * (0.9 + aW / 2), 0, z, aW, F1, T, C);
      addBox(side * (0.9 + aW + ww + bW / 2), 0, z, bW, F1, T, C);
      addBox(winC, 0, z, ww, 1.1, T, C); addBox(winC, 2.1, z, ww, F1 - 2.1, T, C);
      void xc;
    }
    addBox(0, 2.3, z, 1.8, F1 - 2.3, T, C); // 문 위
  }
  // 동/서 벽: 창문 두 개
  for (const s of [-1, 1]) {
    const x = s * (hx - T / 2), L = BD - 2 * T;
    addBox(x, 0, -L / 2 + 1.2, T, F1, 2.4, C);
    addBox(x, 0, 0, T, F1, 1.8, C);
    addBox(x, 0, L / 2 - 1.2, T, F1, 2.4, C);
    for (const zc of [-(0.9 + 0.8), 0.9 + 0.8]) { addBox(x, 0, zc, T, 1.1, 1.6, C); addBox(x, 2.1, zc, T, F1 - 2.1, 1.6, C); }
  }
  // 1층 안쪽 칸막이 (반쪽 벽)
  addBox(-2.5, 0, 0, 0.25, 2.4, 3.4, C);
  addBox(2.5, 0, 0, 0.25, 2.4, 3.4, C);
  // 2층 바닥
  addBox(0, F1, 0, BW, 0.25, BD, MAT.concreteDark, { texScale: 3 });
  // 2층 난간 (낮은 벽, 계단 입구는 비움)
  const P = 1.05, Y2 = F1 + 0.25;
  addBox(0, Y2, -hz + T / 2, BW, P, T, C);       // 남
  addBox(0, Y2, hz - T / 2, BW, P, T, C);        // 북
  // 동쪽 난간: z 1.2~4.7 비움(북쪽 계단 입구)
  addBox(hx - T / 2, Y2, -1.85, T, P, BD - 3.7 - 2 * T + 0.3, C);
  addBox(hx - T / 2, Y2, 4.85, T, P, 0.3, C, { shadow: false });
  // 서쪽 난간: z -4.7~-1.2 비움(남쪽 계단 입구)
  addBox(-hx + T / 2, Y2, 1.85, T, P, BD - 3.7 - 2 * T + 0.3, C);
  addBox(-hx + T / 2, Y2, -4.85, T, P, 0.3, C, { shadow: false });
  // 2층 위의 엄폐용 상자 / 기둥
  addBox(-3.5, Y2, 1.5, 1.2, 1.2, 1.2, MAT.wood, { texScale: 0, kind: 'wood', pen: 0.4 });
  addBox(3.5, Y2, -1.5, 1.2, 1.2, 1.2, MAT.wood, { texScale: 0, kind: 'wood', pen: 0.4 });
  addBox(0, Y2, 0, 0.6, 2.2, 0.6, C);
  // 바깥 계단: 동쪽은 남→북으로 올라감, 서쪽은 북→남 (점대칭)
  const steps = 10, rise = (F1 + 0.25) / steps, run = 0.5;
  stairs(hx + 0.75, -3.0 + 0.0, 1.3, steps, rise, run, 'z+', MAT.metal);
  stairs(-hx - 0.75, 3.0, 1.3, steps, rise, run, 'z-', MAT.metal);
  // 계단 꼭대기 → 2층으로 건너가는 발판
  addBox(hx + 0.4, F1, 2.95, 1.4, 0.25, 2.1, MAT.metal, { texScale: 1.5 });
  addBox(-hx - 0.4, F1, -2.95, 1.4, 0.25, 2.1, MAT.metal, { texScale: 1.5 });
  // 계단 난간 기둥(보기용)
  for (const s of [-1, 1]) for (let i = 0; i <= steps; i += 2) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), MAT.dark);
    p.position.set(s * (hx + 1.38), rise * i + 0.5, s * (-3.0 + run * i)); WADD(p);
  }

  // ---- 컨테이너 ----
  containerSym(-16, 0, -20, true, true, 0);          // 긴 컨테이너 (위로 올라갈 수 있음)
  stairs(-6.3, -20, 1.4, 8, 2.6 / 8, 0.45, 'x-', MAT.metal); // 컨테이너 동쪽 끝 계단 (컨테이너 쪽으로 올라감)
  stairs(6.3, 20, 1.4, 8, 2.6 / 8, 0.45, 'x+', MAT.metal);
  containerSym(19, 0, -13, false, false, 1);
  containerSym(26, 0, -31, false, true, 2);
  containerSym(26, 2.6, -31.6, false, true, 3);      // 위에 하나 더
  containerSym(-31, 0, -38, true, false, 4);
  containerSym(36, 0, -6, false, false, 5);
  containerSym(-38, 0, -4, false, true, 2);

  // ---- 콘크리트 벽 ----
  addSym(-30, 0, -14, 0.5, 3.0, 9, MAT.concrete);     // 높은 벽
  addSym(12, 0, -6, 7, 3.0, 0.5, MAT.concrete);
  addSym(40, 0, -22, 6, 3.0, 0.5, MAT.concrete);
  addSym(-8, 0, -40.5, 7, 3.0, 0.5, MAT.concrete);
  // 낮은 방호벽 (뛰어넘기 가능, 1m)
  addSym(-5, 0, -29, 4.2, 1.0, 0.6, MAT.concrete, { kind: 'barrier' });
  addSym(8, 0, -23, 3.6, 1.0, 0.6, MAT.concrete, { kind: 'barrier' });
  addSym(0, 0, -15.5, 5, 1.0, 0.6, MAT.concrete, { kind: 'barrier' });
  addSym(0, 0, -42, 6, 1.1, 0.6, MAT.concrete, { kind: 'barrier' });   // 시작 지점 엄폐
  addSym(-22, 0, -6, 0.6, 1.0, 4.0, MAT.concrete, { kind: 'barrier' });
  addSym(30, 0, -42, 0.6, 1.0, 4.0, MAT.concrete, { kind: 'barrier' });
  addSym(44, 0, -32, 4.0, 1.0, 0.6, MAT.concrete, { kind: 'barrier' });
  // 모래주머니
  addSym(15, 0, -33, 4.4, 0.95, 0.8, MAT.sandbag, { texScale: 1.6, kind: 'sand', pen: 0 });
  addSym(-13, 0, -9.5, 3.2, 0.95, 0.8, MAT.sandbag, { texScale: 1.6, kind: 'sand' });
  addSym(-40, 0, -24, 0.8, 0.95, 4.4, MAT.sandbag, { texScale: 1.6, kind: 'sand' });
  addSym(22, 0, -2, 0.8, 0.95, 3.2, MAT.sandbag, { texScale: 1.6, kind: 'sand' });
  // 나무 상자 무더기
  crateSym(-22, 0, -34, 1.4); crateSym(-20.6, 0, -34, 1.4); crateSym(-21.3, 1.4, -34, 1.4);
  crateSym(10, 0, -38.5, 1.3); crateSym(11.3, 0, -38.5, 1.3);
  crateSym(-35, 0, -27, 1.4); crateSym(-35, 1.4, -27, 1.4);
  crateSym(31, 0, -18, 1.3); crateSym(31, 0, -16.7, 1.3); crateSym(31, 1.3, -17.35, 1.3);
  crateSym(-26, 0, -26, 1.2);
  crateSym(4, 0, -34, 1.2);
  crateSym(44, 0, -14, 1.4); crateSym(44, 1.4, -14, 1.4);
  crateSym(-44, 0, -42, 1.4);

  // ---- 올라갈 수 있는 곳 더 ----
  scaffoldSym(22, -23, 4.4, 4.4, 2.4, 'x-');       // 철제 발판 (계단 있음)
  scaffoldSym(-40, -12, 4.0, 5.0, 3.0, 'z-');
  scaffoldSym(12, -46, 5.0, 2.6, 1.8, 'x+');        // 시작 지점 옆 낮은 발판
  crateStepsSym(-12, -26, 'x');                     // 계단식 상자 (3단)
  crateStepsSym(34, -38, 'z');
  // 컨테이너 위로 이어지는 상자 디딤돌
  crateSym(28.2, 0, -29.1, 1.3);                    // 2층 컨테이너 옆 디딤돌
  crateSym(-33.2, 0, -32, 1.3);

  // 감시탑(보기용 기둥 + 조명) 네 귀퉁이
  for (const [x, z] of [[-47, -47], [47, -47], [-47, 47], [47, 47]]) {
    addBox(x, 0, z, 0.5, 9, 0.5, MAT.metal, { texScale: 1 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.6), MAT.dark); head.position.set(x, 9.2, z); WADD(head);
    const lamp = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.35), new THREE.MeshBasicMaterial({ color: 0xfff4d0 }));
    lamp.position.set(x * 0.985, 9.2, z * 0.985); lamp.lookAt(0, 0, 0); WADD(lamp);
  }

}


// ================= 충돌 =================
const BOX_EPS = 1e-4;
// 원(x,z,r) 아래 서 있을 수 있는 가장 높은 바닥 (발 높이 + stepUp 이하)
function groundAt(x, z, r, feetY, stepUp) {
  let best = 0;
  for (const b of WORLD.boxes) {
    if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
    const top = b.max.y;
    if (top <= feetY + stepUp + BOX_EPS && top > best) best = top;
  }
  return best;
}
// 옆으로 밀어내기 (원기둥 vs 상자)
function collideXZ(pos, r, feetY, headY, stepUp) {
  let hit = false;
  for (let iter = 0; iter < 2; iter++) {
    for (const b of WORLD.boxes) {
      if (b.max.y <= feetY + stepUp + BOX_EPS || b.min.y >= headY) continue;
      const cx = clamp(pos.x, b.min.x, b.max.x), cz = clamp(pos.z, b.min.z, b.max.z);
      let dx = pos.x - cx, dz = pos.z - cz; const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      hit = true;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); pos.x = cx + dx / d * r; pos.z = cz + dz / d * r; }
      else { // 상자 안: 가장 가까운 면으로
        const ox = Math.min(pos.x - b.min.x, b.max.x - pos.x), oz = Math.min(pos.z - b.min.z, b.max.z - pos.z);
        if (ox < oz) pos.x = (pos.x - b.min.x < b.max.x - pos.x) ? b.min.x - r : b.max.x + r;
        else pos.z = (pos.z - b.min.z < b.max.z - pos.z) ? b.min.z - r : b.max.z + r;
      }
    }
  }
  const WB = WORLD.bounds; pos.x = clamp(pos.x, WB.minX + r, WB.maxX - r); pos.z = clamp(pos.z, WB.minZ + r, WB.maxZ - r);
  return hit;
}
// 머리 위 천장 높이
function ceilingAt(x, z, r, fromY) {
  let best = Infinity;
  for (const b of WORLD.boxes) {
    if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
    if (b.min.y >= fromY - BOX_EPS && b.min.y < best) best = b.min.y;
  }
  return best;
}
// 점이 상자 안에 있는지
function pointInBoxes(p, pad = 0) {
  for (const b of WORLD.boxes) if (p.x > b.min.x - pad && p.x < b.max.x + pad && p.y > b.min.y - pad && p.y < b.max.y + pad && p.z > b.min.z - pad && p.z < b.max.z + pad) return b;
  return null;
}
// 광선 vs 상자들 → { t, box, normal }
const _rayRes = { t: 0, box: null, normal: new V3() };
function raycastWorld(o, d, maxT, skipPen) {
  let bestT = maxT, bestB = null, bestAxis = 0, bestSign = 0, bestExit = 0;
  const ix = 1 / (d.x || 1e-12), iy = 1 / (d.y || 1e-12), iz = 1 / (d.z || 1e-12);
  for (const b of WORLD.boxes) {
    let t1 = (b.min.x - o.x) * ix, t2 = (b.max.x - o.x) * ix;
    let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2), ax = 0, sg = t1 < t2 ? -1 : 1;
    t1 = (b.min.y - o.y) * iy; t2 = (b.max.y - o.y) * iy;
    let a = Math.min(t1, t2); if (a > tmin) { tmin = a; ax = 1; sg = t1 < t2 ? -1 : 1; } tmax = Math.min(tmax, Math.max(t1, t2));
    t1 = (b.min.z - o.z) * iz; t2 = (b.max.z - o.z) * iz;
    a = Math.min(t1, t2); if (a > tmin) { tmin = a; ax = 2; sg = t1 < t2 ? -1 : 1; } tmax = Math.min(tmax, Math.max(t1, t2));
    if (tmax >= tmin && tmax > 0 && tmin < bestT) {
      if (tmin < 0) continue; // 시작점이 안에 있으면 무시
      bestT = tmin; bestB = b; bestAxis = ax; bestSign = sg; bestExit = tmax;
    }
  }
  // 바닥 (y=0)
  if (d.y < 0) { const t = -o.y / d.y; if (t > 0 && t < bestT) { bestT = t; bestB = { kind: 'ground' }; bestAxis = 1; bestSign = 1; } }
  if (!bestB) return null;
  _rayRes.t = bestT; _rayRes.exit = bestB.kind === 'ground' ? bestT : bestExit; _rayRes.box = bestB; _rayRes.normal.set(0, 0, 0); _rayRes.normal.setComponent(bestAxis, bestSign);
  return _rayRes;
}
// 두 점 사이에 막는 것이 있는지 (연막 포함)
function losClear(a, b, useSmoke = true) {
  _v1.copy(b).sub(a); const L = _v1.length(); if (L < 1e-4) return true; _v1.divideScalar(L);
  if (raycastWorld(a, _v1, L - 0.05)) return false;
  if (useSmoke) for (const s of WORLD.smokes) {
    if (s.radius < 1) continue;
    _v2.copy(s.pos).sub(a); const t = clamp(_v2.dot(_v1), 0, L);
    _v3.copy(a).addScaledVector(_v1, t);
    if (_v3.distanceTo(s.pos) < s.radius * 0.85) return false;
  }
  return true;
}


// ================= 1:1 대결 맵 "벽돌 골목" (좁고 길쭉한 도시 골목) =================
const DUEL_BOUNDS = { minX: -14, maxX: 14, minZ: -36, maxZ: 36 };
function car(cx, cz, alongZ, color) {
  const L = 4.4, W = 1.9, w = alongZ ? W : L, d = alongZ ? L : W;
  addBox(cx, 0, cz, w, 1.1, d, MAT.car[color % MAT.car.length], { texScale: 0, kind: 'metal' });
  addBox(cx, 1.1, cz, w - (alongZ ? 0.25 : 2.0), 0.62, d - (alongZ ? 2.0 : 0.25), MAT.glass, { texScale: 0, kind: 'metal' });
  const wg = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12);
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    const wh = new THREE.Mesh(wg, MAT.dark);
    if (alongZ) { wh.rotation.z = Math.PI / 2; wh.position.set(cx + a * (W / 2 + 0.02), 0.36, cz + b * 1.35); }
    else { wh.rotation.x = Math.PI / 2; wh.position.set(cx + b * 1.35, 0.36, cz + a * (W / 2 + 0.02)); }
    WADD(wh);
  }
}
function carSym(cx, cz, alongZ, color) { car(cx, cz, alongZ, color); car(-cx, -cz, alongZ, color + 1); }
const _barrelGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.95, 14);
function barrel(x, z) {
  addBox(x, 0, z, 0.62, 0.95, 0.62, MAT.barrel, { invisible: true, kind: 'metal' });
  const m = new THREE.Mesh(_barrelGeo, MAT.barrel); m.position.set(x, 0.475, z); m.castShadow = true; m.receiveShadow = true; WADD(m);
}
function barrelSym(x, z) { barrel(x, z); barrel(-x, -z); }
// 구멍(문·창문) 뚫린 벽: along 'x' 면 z 고정, 'z' 면 x 고정
function holeWall(along, fixed, a0, a1, h, T, mat, holes) {
  const put = (c, len, y0, hh) => { if (len < 0.02 || hh < 0.02) return; along === 'x' ? addBox(c, y0, fixed, len, hh, T, mat) : addBox(fixed, y0, c, T, hh, len, mat); };
  let cur = a0;
  for (const o of holes.slice().sort((p, q) => p.c - q.c)) {
    const l = o.c - o.w / 2, r = o.c + o.w / 2;
    put((cur + l) / 2, l - cur, 0, h);
    put(o.c, o.w, 0, o.y0); put(o.c, o.w, o.y1, h - o.y1);
    cur = r;
  }
  put((cur + a1) / 2, a1 - cur, 0, h);
}
// 작은 벽돌집: 가운데 쪽으로 문, 적 쪽과 뒤쪽에 창문, 뒤 계단으로 지붕 올라가기
function shack(cx, cz) {
  const w = 6.5, d = 6, h = 3, T = 0.3, sx = Math.sign(cx), sz = Math.sign(cz), B = MAT.brick;
  const door = { c: cz, w: 1.4, y0: 0, y1: 2.3 }, win = (c) => ({ c, w: 1.5, y0: 1.05, y1: 2.05 });
  holeWall('z', cx - sx * (w / 2 - T / 2), cz - d / 2, cz + d / 2, h, T, B, [door]);            // 가운데 쪽: 문
  holeWall('z', cx + sx * (w / 2 - T / 2), cz - d / 2, cz + d / 2, h, T, B, [win(cz)]);         // 바깥 벽 쪽: 창문
  holeWall('x', cz - sz * (d / 2 - T / 2), cx - w / 2 + T, cx + w / 2 - T, h, T, B, [win(cx + sx * 1.2)]); // 적 쪽 창문
  holeWall('x', cz + sz * (d / 2 - T / 2), cx - w / 2 + T, cx + w / 2 - T, h, T, B, [{ c: cx + sx * 1.6, w: 1.2, y0: 0, y1: 2.3 }]); // 뒤쪽 작은 문
  addBox(cx, h, cz, w, 0.25, d, MAT.concreteDark, { texScale: 3 });                              // 지붕
  addBox(cx, h + 0.25, cz - sz * (d / 2 - 0.15), w, 0.85, 0.3, MAT.concrete);                    // 지붕 앞 난간 (엄폐)
  addBox(cx + sx * (w / 2 - 0.15), h + 0.25, cz, 0.3, 0.85, d, MAT.concrete);                     // 바깥 쪽 난간
  const steps = 10, rise = (h + 0.25) / steps, run = 0.45;
  stairs(cx - sx * 1.7, cz + sz * (d / 2 + steps * run), 1.2, steps, rise, run, sz < 0 ? 'z+' : 'z-', MAT.metal);
  // 안쪽 상자
  crate(cx + sx * 1.6, 0, cz - sz * 1.4, 1.1);
}
function buildDuel() {
  const B = DUEL_BOUNDS, W = B.maxX - B.minX, L = B.maxZ - B.minZ;
  const at = TEX.asphalt.clone(); at.needsUpdate = true; at.repeat.set(W / 6, L / 6);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ map: at, roughness: 0.97 }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0; pad.receiveShadow = true; WADD(pad);
  // 도로 노란 점선 + 흰 주차선
  const lm = new THREE.MeshStandardMaterial({ color: 0xd9b23a, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
  const wm = new THREE.MeshStandardMaterial({ color: 0xd8d8d2, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
  const decal = (x, z, w, d, m) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.015, z); l.renderOrder = 1; l.receiveShadow = true; WADD(l); };
  for (let z = -33; z <= 33; z += 4) decal(0, z, 0.22, 2.2, lm);
  for (const s of [-1, 1]) { for (let k = 0; k < 4; k++) decal(s * 9, s * (-30 + k * 3), 4.5, 0.15, wm); decal(0, s * -31.5, 10, 0.3, wm); }
  // 바깥 벽 (벽돌) + 위 테두리
  const H = 5.5;
  addBox(0, 0, B.minZ - 0.5, W + 2, H, 1, MAT.brick, { texScale: 2 });
  addBox(0, 0, B.maxZ + 0.5, W + 2, H, 1, MAT.brick, { texScale: 2 });
  addBox(B.minX - 0.5, 0, 0, 1, H, L, MAT.brick, { texScale: 2 });
  addBox(B.maxX + 0.5, 0, 0, 1, H, L, MAT.brick, { texScale: 2 });
  const cap = new THREE.MeshStandardMaterial({ color: 0x55534f, roughness: 0.9 });
  for (const [x, z, w, d] of [[0, B.minZ - 0.5, W + 2.4, 1.3], [0, B.maxZ + 0.5, W + 2.4, 1.3], [B.minX - 0.5, 0, 1.3, L + 2], [B.maxX + 0.5, 0, 1.3, L + 2]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), cap); m.position.set(x, H + 0.15, z); m.castShadow = true; WADD(m);
  }
  // 벽 너머 높은 건물들 (보기용)
  const bm = [0x6e6a64, 0x7d5a4b, 0x5d6168].map(c => new THREE.MeshStandardMaterial({ map: TEX.concrete, color: c, roughness: 0.95 }));
  const winMat = new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.2, metalness: 0.7 });
  for (const s of [-1, 1]) for (let z = -40; z <= 40; z += 13) {
    const h = rand(12, 22), m = new THREE.Mesh(new THREE.BoxGeometry(10, h, 12), bm[(Math.abs(z) + (s > 0 ? 1 : 0)) % 3]);
    m.position.set(s * 21, h / 2, z); m.castShadow = true; m.receiveShadow = true; WADD(m);
    for (let y = 3; y < h - 1; y += 3.2) for (let k = -1; k <= 1; k++) { const wi = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), winMat); wi.position.set(s * 15.98, y, z + k * 3.6); wi.rotation.y = -s * Math.PI / 2; WADD(wi); }
  }
  for (const s of [-1, 1]) { const h = rand(14, 20), m = new THREE.Mesh(new THREE.BoxGeometry(40, h, 10), bm[2]); m.position.set(0, h / 2, s * 43); m.castShadow = true; WADD(m); }
  // 가로등
  for (const s of [-1, 1]) for (let z = -27; z <= 27; z += 18) {
    const x = s * 13.6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 6, 8), MAT.dark); pole.position.set(x, 3, z); WADD(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), MAT.dark); arm.position.set(x - s * 0.6, 6, z); WADD(arm);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), new THREE.MeshBasicMaterial({ color: 0xffe9b0 })); lamp.position.set(x - s * 1.15, 5.94, z); WADD(lamp);
  }

  // ---- 가운데: 콘크리트 블록 (상자 밟고 올라가요) ----
  addBox(0, 0, 0, 3.6, 2.2, 3.6, MAT.concrete);
  crateSym(2.5, 0, -1.1, 1.2);
  // ---- 양쪽 벽돌집 ----
  shack(-8, -15); shack(8, 15);
  // ---- 자동차 ----
  carSym(5.8, -8.5, true, 0);
  carSym(-2.8, -24.5, false, 2);
  carSym(-11.2, -27, true, 3);
  // ---- 엄폐물 ----
  addSym(-3.8, 0, -6, 3.2, 1.0, 0.6, MAT.concrete, { kind: 'barrier' });
  addSym(10.6, 0, -17, 0.6, 1.0, 3.2, MAT.concrete, { kind: 'barrier' });
  addSym(0, 0, -29.5, 5, 1.1, 0.6, MAT.concrete, { kind: 'barrier' });     // 시작 지점 엄폐
  addSym(8.5, 0, -29.5, 0.6, 1.0, 2.6, MAT.concrete, { kind: 'barrier' });
  addSym(3.6, 0, -18.5, 0.5, 3.0, 5.0, MAT.brick, { texScale: 2 });           // 골목 나누는 높은 벽
  addSym(11.2, 0, -5, 3.2, 0.95, 0.8, MAT.sandbag, { texScale: 1.6, kind: 'sand' });
  addSym(-1.5, 0, -14, 2.6, 0.95, 0.8, MAT.sandbag, { texScale: 1.6, kind: 'sand' });
  barrelSym(12.6, -23.5); barrelSym(12.6, -22.8); barrelSym(11.95, -23.15);
  barrelSym(-12.7, -3.2); barrelSym(-12.7, -2.5);
  crateSym(12.7, 0, -12, 1.25); crateSym(12.7, 1.25, -12, 1.25); crateSym(12.7, 0, -10.75, 1.25);
  crateSym(-5.5, 0, -33.5, 1.2);
}

// ================= AI 길찾기 격자 =================
const NAV = { size: 1, n: 120, off: 60, grid: null, cover: null };
function buildNav(B = ARENA_BOUNDS) {
  const n = NAV.n; NAV.grid = new Uint8Array(n * n);
  const r = 0.45;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = i - NAV.off + 0.5, z = j - NAV.off + 0.5;
    let blocked = x < B.minX + 1 || x > B.maxX - 1 || z < B.minZ + 1 || z > B.maxZ - 1;
    if (!blocked) for (const b of WORLD.boxes) {
      if (b.min.y > 1.6 || b.max.y < 0.35) continue;
      if (x + r > b.min.x && x - r < b.max.x && z + r > b.min.z && z - r < b.max.z) { blocked = true; break; }
    }
    NAV.grid[i + j * n] = blocked ? 1 : 0;
  }
  // 엄폐물 옆 칸 표시
  NAV.cover = new Uint8Array(n * n);
  for (let i = 1; i < n - 1; i++) for (let j = 1; j < n - 1; j++) {
    if (NAV.grid[i + j * n]) continue;
    let c = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (NAV.grid[i + a + (j + b) * n]) c++;
    NAV.cover[i + j * n] = c;
  }
}
const navCell = (x, z) => [clamp(Math.floor(x + NAV.off), 0, NAV.n - 1), clamp(Math.floor(z + NAV.off), 0, NAV.n - 1)];
const navFree = (i, j) => i >= 0 && j >= 0 && i < NAV.n && j < NAV.n && !NAV.grid[i + j * NAV.n];
function navNearestFree(i, j) {
  if (navFree(i, j)) return [i, j];
  for (let r = 1; r < 8; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (navFree(i + a, j + b)) return [i + a, j + b];
  return [i, j];
}
function navLine(x0, z0, x1, z1) { // 격자 위 직선으로 갈 수 있는지
  const d = Math.hypot(x1 - x0, z1 - z0), steps = Math.ceil(d / 0.4);
  for (let k = 0; k <= steps; k++) {
    const t = k / Math.max(1, steps), [i, j] = navCell(lerp(x0, x1, t), lerp(z0, z1, t));
    if (!navFree(i, j)) return false;
  }
  return true;
}
function findPath(fx, fz, tx, tz) {
  const n = NAV.n;
  let [si, sj] = navNearestFree(...navCell(fx, fz)); let [ti, tj] = navNearestFree(...navCell(tx, tz));
  const start = si + sj * n, goal = ti + tj * n;
  const g = new Float32Array(n * n).fill(Infinity), came = new Int32Array(n * n).fill(-1), closed = new Uint8Array(n * n);
  g[start] = 0;
  const h = (k) => { const i = k % n, j = (k / n) | 0; const dx = Math.abs(i - ti), dz = Math.abs(j - tj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  // 이진 힙 (가장 작은 f 먼저) — 예전 방식보다 훨씬 빨라요
  const hk = [], hf = [];
  const push = (k, f) => { let i = hk.length; hk.push(k); hf.push(f); while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hk[i] = hk[p]; hf[i] = hf[p]; i = p; } hk[i] = k; hf[i] = f; };
  const pop = () => { const top = hk[0], lk = hk.pop(), lf = hf.pop(); if (hk.length) { let i = 0; const L = hk.length; for (;;) { let c = 2 * i + 1; if (c >= L) break; if (c + 1 < L && hf[c + 1] < hf[c]) c++; if (hf[c] >= lf) break; hk[i] = hk[c]; hf[i] = hf[c]; i = c; } hk[i] = lk; hf[i] = lf; } return top; };
  push(start, h(start));
  let iter = 0;
  while (hk.length && iter++ < 8000) {
    const cur = pop();
    if (closed[cur]) continue;
    if (cur === goal) break;
    closed[cur] = 1;
    const ci = cur % n, cj = (cur / n) | 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      if (!a && !b) continue; const ni = ci + a, nj = cj + b;
      if (!navFree(ni, nj)) continue;
      if (a && b && (!navFree(ci + a, cj) || !navFree(ci, cj + b))) continue;
      const nk = ni + nj * n; if (closed[nk]) continue;
      const ng = g[cur] + (a && b ? 1.414 : 1) + (NAV.cover[nk] ? 0 : 0.15);
      if (ng < g[nk]) { g[nk] = ng; came[nk] = cur; push(nk, ng + h(nk)); }
    }
  }
  if (came[goal] < 0 && goal !== start) return null;
  const pts = []; let k = goal;
  while (k >= 0 && k !== start) { pts.push(new V3((k % n) - NAV.off + 0.5, 0, ((k / n) | 0) - NAV.off + 0.5)); k = came[k]; }
  pts.reverse();
  // 경로 다듬기
  const out = []; let cx = fx, cz = fz, idx = 0;
  while (idx < pts.length) {
    let far = idx;
    for (let k2 = pts.length - 1; k2 > idx; k2--) if (navLine(cx, cz, pts[k2].x, pts[k2].z)) { far = k2; break; }
    out.push(pts[far]); cx = pts[far].x; cz = pts[far].z; idx = far + 1;
  }
  return out;
}
