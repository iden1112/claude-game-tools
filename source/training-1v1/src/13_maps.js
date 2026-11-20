// ================= 모드별 맵 (1대1 · 2대2 · 3대3 · 4대4 각 4개) =================
// 모든 맵은 가운데를 기준으로 점대칭이라 양쪽 팀이 공평해요.
// 맵은 처음 쓸 때 만들어요 (게임 시작이 느려지지 않게).

// ---- 테마별 바닥·벽 질감 ----
TEX.sand = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#d2b884'; g.fillRect(0, 0, w, h); blotches(g, w, h, 90, 'rgba(180,150,100,A)', 20, 90, 0.25); blotches(g, w, h, 60, 'rgba(235,215,170,A)', 15, 70, 0.25); noiseFill(g, w, h, 0, 22); });
TEX.snow = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#e9eef3'; g.fillRect(0, 0, w, h); blotches(g, w, h, 80, 'rgba(190,205,220,A)', 20, 100, 0.25); blotches(g, w, h, 40, 'rgba(255,255,255,A)', 15, 60, 0.4); noiseFill(g, w, h, 0, 10); });
TEX.grass = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5f7a3e'; g.fillRect(0, 0, w, h); blotches(g, w, h, 120, 'rgba(70,95,40,A)', 15, 80, 0.3); blotches(g, w, h, 70, 'rgba(130,140,70,A)', 10, 60, 0.25); noiseFill(g, w, h, 0, 26); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${rand(40, 110)},${rand(80, 140)},${rand(30, 60)},0.6)`; g.fillRect(Math.random() * w, Math.random() * h, 1, 3); } });
TEX.dirt = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#7b6650'; g.fillRect(0, 0, w, h); blotches(g, w, h, 100, 'rgba(95,78,58,A)', 20, 90, 0.3); blotches(g, w, h, 60, 'rgba(150,130,100,A)', 10, 50, 0.25); noiseFill(g, w, h, 0, 28); });
TEX.rock = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8a8378'; g.fillRect(0, 0, w, h); blotches(g, w, h, 60, 'rgba(60,56,50,A)', 8, 40, 0.35); blotches(g, w, h, 40, 'rgba(170,165,150,A)', 8, 30, 0.3); noiseFill(g, w, h, 0, 30); for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(40,36,32,0.45)'; g.lineWidth = 1.5; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += rand(-30, 30); y += rand(-30, 30); g.lineTo(x, y); } g.stroke(); } });
TEX.plaster = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d9c29a'; g.fillRect(0, 0, w, h); blotches(g, w, h, 40, 'rgba(180,150,110,A)', 10, 60, 0.3); blotches(g, w, h, 20, 'rgba(240,225,195,A)', 10, 40, 0.3); noiseFill(g, w, h, 0, 16); });
TEX.cobble = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6d6a66'; g.fillRect(0, 0, w, h); const s = 32; for (let y = 0; y < h; y += s) for (let x = (y / s) % 2 ? -s / 2 : 0; x < w; x += s) { g.fillStyle = `rgb(${120 + rand(-25, 25)},${116 + rand(-25, 20)},${110 + rand(-20, 20)})`; g.beginPath(); g.roundRect ? g.roundRect(x + 2, y + 2, s - 4, s - 4, 6) : g.rect(x + 2, y + 2, s - 4, s - 4); g.fill(); } noiseFill(g, w, h, 0, 18); });
TEX.hay = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#c9a24e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(${rand(150, 230)},${rand(120, 190)},${rand(40, 80)},0.7)`; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.lineTo(x + rand(-6, 6), y + rand(4, 10)); g.stroke(); } });
TEX.log = canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#5b3f28'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 4) { g.fillStyle = `rgba(${rand(30, 90)},${rand(20, 60)},${rand(10, 40)},0.5)`; g.fillRect(x, 0, 2, h); } noiseFill(g, w, h, 0, 20); });
TEX.plank = canvasTex(256, 256, (g, w, h) => { const c = ['#7a5636', '#6d4a2d', '#835d3b']; for (let y = 0; y < h; y += 32) { g.fillStyle = c[(y / 32) % 3]; g.fillRect(0, y, w, 32); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y, w, 2); } noiseFill(g, w, h, 0, 18); });

const M2 = {
  sand: new THREE.MeshStandardMaterial({ map: TEX.sand, roughness: 1 }),
  snow: new THREE.MeshStandardMaterial({ map: TEX.snow, roughness: 0.9 }),
  grass: new THREE.MeshStandardMaterial({ map: TEX.grass, roughness: 1 }),
  dirt: new THREE.MeshStandardMaterial({ map: TEX.dirt, roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ map: TEX.rock, roughness: 0.95 }),
  rockSnow: new THREE.MeshStandardMaterial({ map: TEX.rock, color: 0xdfe6ee, roughness: 0.9 }),
  plaster: new THREE.MeshStandardMaterial({ map: TEX.plaster, roughness: 0.95 }),
  white: new THREE.MeshStandardMaterial({ map: TEX.plaster, color: 0xf2f0ea, roughness: 0.95 }),
  cobble: new THREE.MeshStandardMaterial({ map: TEX.cobble, roughness: 0.95 }),
  hay: new THREE.MeshStandardMaterial({ map: TEX.hay, roughness: 1 }),
  log: new THREE.MeshStandardMaterial({ map: TEX.log, roughness: 0.95 }),
  plank: new THREE.MeshStandardMaterial({ map: TEX.plank, roughness: 0.9 }),
  redwood: new THREE.MeshStandardMaterial({ map: TEX.plank, color: 0xc0574a, roughness: 0.9 }),
  stone: new THREE.MeshStandardMaterial({ map: TEX.rock, color: 0xcfc6b5, roughness: 0.95 }),
  snowCap: new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.85 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x3e5a35, roughness: 1, flatShading: true }),
  leafSnow: new THREE.MeshStandardMaterial({ color: 0x506b55, roughness: 1, flatShading: true }),
  leafRound: new THREE.MeshStandardMaterial({ color: 0x4f7438, roughness: 1, flatShading: true }),
  palm: new THREE.MeshStandardMaterial({ color: 0x5c8a3a, roughness: 1, side: THREE.DoubleSide }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x4f3b28, roughness: 1 }),
  water: new THREE.MeshStandardMaterial({ color: 0x2f5f7a, roughness: 0.15, metalness: 0.4 }),
  cloth: [0xb83a2e, 0x2e6fb8, 0xd9b23a, 0x3a9a5a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide })),
  tent: new THREE.MeshStandardMaterial({ color: 0x5d6b45, roughness: 1, side: THREE.DoubleSide }),
  tank: new THREE.MeshStandardMaterial({ color: 0xb9bcbf, roughness: 0.5, metalness: 0.6 }),
  roofTile: new THREE.MeshStandardMaterial({ color: 0x8a3b2c, roughness: 0.9 }),
};

// 테마: 하늘·안개·빛 색 + 바닥 + 둘레벽
const THEMES = {
  base: { bg: 0xaec4d6, fog: 0xb7c6d2, near: 90, far: 420, sky: 0xd8e6f5, gnd: 0x6f604c, hemiI: 0.55, sun: 0xfff1dc, sunI: 2.1, hill: 0x6f7d58, trees: true },
  snow: { bg: 0xcdd8e3, fog: 0xd9e2ea, near: 50, far: 300, sky: 0xe6eef7, gnd: 0x9aa4ae, hemiI: 0.75, sun: 0xf3f6ff, sunI: 1.7, hill: 0xdfe6ee, trees: true },
  desert: { bg: 0xe2cfa6, fog: 0xe6d3ad, near: 70, far: 380, sky: 0xf6e6c4, gnd: 0x9a7b52, hemiI: 0.6, sun: 0xffe2b0, sunI: 2.4, hill: 0xc9a46c, trees: false },
  forest: { bg: 0xa9c2c4, fog: 0x9fb6a8, near: 45, far: 260, sky: 0xcfe2d8, gnd: 0x4d5a36, hemiI: 0.6, sun: 0xfff0d0, sunI: 1.8, hill: 0x4f6a40, trees: true },
  gray: { bg: 0xa9b1b8, fog: 0xa5adb4, near: 60, far: 320, sky: 0xc8d0d8, gnd: 0x5c5a56, hemiI: 0.7, sun: 0xf2f0ea, sunI: 1.6, hill: 0x6d7468, trees: true },
  dusk: { bg: 0xe0b48c, fog: 0xd6a888, near: 70, far: 360, sky: 0xffd6b0, gnd: 0x6a4e3c, hemiI: 0.6, sun: 0xffc48a, sunI: 2.0, hill: 0x7a6a50, trees: true },
};
function applyTheme(name) {
  const T = THEMES[name] || THEMES.base;
  scene.background.setHex(T.bg); scene.fog.color.setHex(T.fog); scene.fog.near = T.near; scene.fog.far = T.far;
  hemi.color.setHex(T.sky); hemi.groundColor.setHex(T.gnd); hemi.intensity = T.hemiI;
  sun.color.setHex(T.sun); sun.intensity = T.sunI;
  if (window.SCENERY) { SCENERY.hillMat.color.setHex(T.hill); SCENERY.trees.visible = T.trees; }
}

// ---- 맵 만들 때 쓰는 도구 ----
let MR = Math.random; // 맵마다 같은 모양이 나오게 씨앗 있는 난수 (멀티에서 모두 같은 맵)
function seeded(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mr = (a, b) => a + MR() * (b - a);
let MSPOTS = null;
// 지역 좌표틀: 90도 단위로 돌려서 놓기 (local +z = 앞, 적 쪽)
function LF(x, z, rot = 0) {
  rot = ((rot % 4) + 4) % 4;
  const a = rot * Math.PI / 2, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a)), odd = rot % 2 === 1;
  const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const F = {
    rot, P, odd, x, z,
    box(lx, y, lz, w, h, d, mat, opt) { const [px, pz] = P(lx, lz); return addBox(px, y, pz, odd ? d : w, h, odd ? w : d, mat, opt); },
    mesh(m, lx, ly, lz, ry = 0) { const [px, pz] = P(lx, lz); m.position.set(px, ly, pz); m.rotation.y += a + ry; m.castShadow = m.castShadow !== false; m.receiveShadow = true; WADD(m); return m; },
    dir(d) { const v = { 'x+': [1, 0], 'x-': [-1, 0], 'z+': [0, 1], 'z-': [0, -1] }[d]; const wx = v[0] * c + v[1] * s, wz = -v[0] * s + v[1] * c; return wx > 0 ? 'x+' : wx < 0 ? 'x-' : wz > 0 ? 'z+' : 'z-'; },
    stairs(lx0, lz0, width, steps, rise, run, dir, mat) { const [px, pz] = P(lx0, lz0); stairs(px, pz, width, steps, rise, run, F.dir(dir), mat); },
  };
  return F;
}
// 점대칭으로 두 번 놓기 (내 쪽 + 상대 쪽)
const NOPOS = new Set();
const callP = (fn, F, args) => NOPOS.has(fn) ? fn(F, ...args) : fn(F, 0, 0, ...args);
function S(fn, x, z, rot, ...args) {
  callP(fn, LF(x, z, rot), args); callP(fn, LF(-x, -z, rot + 2), args);
  if (MSPOTS) { const bz = z < 0 ? -z : z, bx = z < 0 ? -x : x; MSPOTS.push([bx, bz + 2.2]); }
}
// 가운데에 한 번만 (그 자체가 대칭인 것)
function C(fn, x, z, rot, ...args) { callP(fn, LF(x, z, rot), args); if (MSPOTS) MSPOTS.push([x, z + 4]); }

// ---- 조립 부품 ----
function lwall(F, along, fixed, a0, a1, h, T, mat, holes = [], ts = 2) {
  const put = (c, len, y0, hh) => { if (len < 0.02 || hh < 0.02) return; along === 'x' ? F.box(c, y0, fixed, len, hh, T, mat, { texScale: ts }) : F.box(fixed, y0, c, T, hh, len, mat, { texScale: ts }); };
  let cur = a0;
  for (const o of holes.slice().sort((p, q) => p.c - q.c)) {
    const l = o.c - o.w / 2, r = o.c + o.w / 2;
    put((cur + l) / 2, l - cur, 0, h); put(o.c, o.w, 0, o.y0); put(o.c, o.w, o.y1, h - o.y1); cur = r;
  }
  put((cur + a1) / 2, a1 - cur, 0, h);
}
// 집: o.door / o.win = ['f','b','l','r'] (f = 적 쪽), o.roof 지붕 위 올라가기, o.stairs 계단 쪽
function house(F, w, d, h, mat, o = {}) {
  const T = 0.3, door = { w: 1.4, y0: 0, y1: 2.3 }, win = { w: 1.5, y0: 1.05, y1: 2.05 };
  const holes = (side, len) => { const r = []; if ((o.door || []).includes(side)) r.push({ c: 0, ...door }); if ((o.win || []).includes(side)) r.push({ c: (o.door || []).includes(side) ? (len / 2 - 1.3 > 1.6 ? len / 2 - 1.4 : 99) : 0, ...win }); return r.filter(x => x.c < 50); };
  if (!o.ruin || o.ruin < 1) {
    lwall(F, 'x', d / 2 - T / 2, -w / 2, w / 2, h, T, mat, holes('f', w));
    lwall(F, 'x', -d / 2 + T / 2, -w / 2, w / 2, h, T, mat, holes('b', w));
    lwall(F, 'z', -w / 2 + T / 2, -d / 2 + T, d / 2 - T, h, T, mat, holes('l', d));
    lwall(F, 'z', w / 2 - T / 2, -d / 2 + T, d / 2 - T, h, T, mat, holes('r', d));
  }
  // o.roof: true = 올라갈 수 있는 지붕, false = 지붕 없음, 그 외 = 평평한 지붕 / o.pitched = 뾰족 지붕
  if (!o.ruin && (o.roof !== false || o.pitched)) {
    if (!o.pitched || o.roof) F.box(0, h, 0, w, 0.25, d, o.roofMat || MAT.concreteDark, { texScale: 3 });
    else F.box(0, h, 0, w, 0.25, d, o.pitchMat || M2.roofTile, { texScale: 3 });
    if (o.roof === true) { // 올라갈 수 있는 지붕: 앞쪽 난간 + 계단
      F.box(0, h + 0.25, d / 2 - 0.15, w, 0.85, 0.3, o.roofMat || MAT.concrete);
      const steps = Math.ceil((h + 0.25) / 0.33), rise = (h + 0.25) / steps, run = 0.45;
      const st = o.stairs || 'b';
      if (st === 'b') F.stairs(w / 2 - 0.9, -d / 2 - steps * run, 1.2, steps, rise, run, 'z+', MAT.metal);
      if (st === 'l') F.stairs(-w / 2 - steps * run, -d / 2 + 0.8, 1.2, steps, rise, run, 'x+', MAT.metal);
      if (st === 'r') F.stairs(w / 2 + steps * run, -d / 2 + 0.8, 1.2, steps, rise, run, 'x-', MAT.metal);
    } else if (o.pitched) { // 뾰족 지붕 (보기용)
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.01, Math.max(w, d) * 0.62, 1.8, 4, 1), o.pitchMat || M2.roofTile);
      r.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); F.mesh(r, 0, h + 0.25 + 0.9, 0, Math.PI / 4);
    }
  }
  if (o.ruin) ruinWalls(F, w, d, h, mat);
}
NOPOS.add(house);
function ruinWalls(F, w, d, h, mat) { // 무너진 집: 벽이 군데군데 남아 있음
  const T = 0.35, seg = 1.5;
  const side = (along, fixed, len) => { for (let a = -len / 2; a < len / 2 - 0.1; a += seg) { const hh = MR() < 0.25 ? 0 : mr(0.8, h); const l = Math.min(seg, len / 2 - a); if (hh > 0.3) (along === 'x' ? F.box(a + l / 2, 0, fixed, l, hh, T, mat) : F.box(fixed, 0, a + l / 2, T, hh, l, mat)); } };
  side('x', d / 2, w); side('x', -d / 2, w); side('z', -w / 2, d - 0.4); side('z', w / 2, d - 0.4);
  for (let i = 0; i < 3; i++) F.box(mr(-w / 3, w / 3), 0, mr(-d / 3, d / 3), mr(0.6, 1.2), mr(0.3, 0.7), mr(0.6, 1.2), M2.rock, { kind: 'solid' });
}
function wallL(F, lx, lz, len, h, alongX, mat, ts = 2) { alongX ? F.box(lx, 0, lz, len, h, 0.5, mat, { texScale: ts }) : F.box(lx, 0, lz, 0.5, h, len, mat, { texScale: ts }); }
function broken(F, lx, lz, len, alongX, mat) {
  const n = Math.max(2, Math.round(len / 1.4)), sl = len / n;
  for (let i = 0; i < n; i++) { const hh = mr(0.9, 2.8), c = -len / 2 + sl * (i + 0.5); if (MR() < 0.18) continue; alongX ? F.box(lx + c, 0, lz, sl, hh, 0.5, mat) : F.box(lx, 0, lz + c, 0.5, hh, sl, mat); }
}
function pillar(F, lx, lz, s = 0.9, h = 4, mat = M2.stone) {
  F.box(lx, 0, lz, s, h, s, mat, { invisible: true });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.45, s * 0.5, h, 10), mat); F.mesh(m, lx, h / 2, lz);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(s * 1.15, 0.25, s * 1.15), mat); F.mesh(cap, lx, h - 0.12, lz);
}
const _dodeca = new THREE.DodecahedronGeometry(1, 0);
function rock(F, lx, lz, w = 2, h = 1.4, d, snowy) {
  d = d || w * 0.85;
  // 충돌: 바위 모양(둥근 12면체)에 맞게 층마다 팔각형(상자 2개를 엇갈려)으로 — 큰 상자 하나면 모서리 빈 곳도 막혀요
  for (const [y0, y1, f] of [[0, 0.22, 0.66], [0.22, 0.7, 0.92], [0.7, 0.92, 0.72]]) {
    const bh = (y1 - y0) * h;
    F.box(lx, y0 * h, lz, w * f, bh, d * f * 0.62, M2.rock, { invisible: true, kind: 'solid' });
    F.box(lx, y0 * h, lz, w * f * 0.62, bh, d * f, M2.rock, { invisible: true, kind: 'solid' });
  }
  const m = new THREE.Mesh(_dodeca, snowy ? M2.rockSnow : M2.rock);
  m.scale.set(w / 1.86, h / 1.7, d / 1.86); m.rotation.set(mr(-0.12, 0.12), 0, mr(-0.12, 0.12)); F.mesh(m, lx, h / 2 - 0.05, lz, MR() < 0.5 ? 0 : Math.PI);
}
function pine(F, lx, lz, s = 1, snowy) {
  F.box(lx, 0, lz, 0.55 * s, 3.2 * s, 0.55 * s, M2.trunk, { invisible: true, kind: 'wood' });
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.3 * s, 3.4 * s, 7), M2.trunk); F.mesh(tr, lx, 1.7 * s, lz);
  for (let k = 0; k < 3; k++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry((2.2 - k * 0.55) * s, 2.8 * s, 8), snowy ? M2.leafSnow : M2.leaf); F.mesh(c, lx, (3.2 + k * 1.5) * s, lz);
    if (snowy) { const cap = new THREE.Mesh(new THREE.ConeGeometry((1.3 - k * 0.3) * s, 1.4 * s, 8), M2.snowCap); F.mesh(cap, lx, (3.9 + k * 1.5) * s, lz); }
  }
}
function tree(F, lx, lz, s = 1) { // 둥근 나무
  F.box(lx, 0, lz, 0.6 * s, 3 * s, 0.6 * s, M2.trunk, { invisible: true, kind: 'wood' });
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.32 * s, 3.2 * s, 7), M2.trunk); F.mesh(tr, lx, 1.6 * s, lz);
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry((1.6 - k * 0.2) * s, 0), M2.leafRound); F.mesh(b, lx + mr(-0.7, 0.7) * s, (3.6 + k * 0.7) * s, lz + mr(-0.7, 0.7) * s); }
}
function palm(F, lx, lz, s = 1) {
  F.box(lx, 0, lz, 0.5, 3, 0.5, M2.trunk, { invisible: true, kind: 'wood' });
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.26 * s, 5.5 * s, 7), M2.trunk); tr.rotation.z = 0.12; F.mesh(tr, lx, 2.75 * s, lz);
  for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.7 * s, 3 * s), M2.palm); l.rotation.set(1.1, 0, 0); const g = new THREE.Group(); g.add(l); l.position.set(0, 0, 1.3 * s); g.rotation.y = k * Math.PI / 3; F.mesh(g, lx + 0.3 * s, 5.4 * s, lz); }
}
function logs(F, lx, lz, len = 4, alongX = true) {
  alongX ? F.box(lx, 0, lz, len, 1.1, 1.3, M2.log, { invisible: true, kind: 'wood' }) : F.box(lx, 0, lz, 1.3, 1.1, len, M2.log, { invisible: true, kind: 'wood' });
  const g = new THREE.CylinderGeometry(0.3, 0.3, len, 10);
  for (const [o, y] of [[-0.32, 0.3], [0.32, 0.3], [0, 0.82]]) { const m = new THREE.Mesh(g, M2.log); m.rotation.z = Math.PI / 2; if (!alongX) m.rotation.set(Math.PI / 2, 0, 0); F.mesh(m, lx + (alongX ? 0 : o), y, lz + (alongX ? o : 0)); }
}
function hay(F, lx, lz, n = 1) { for (let i = 0; i < n; i++) F.box(lx + (i % 2) * 1.25, i >= 2 ? 1.0 : 0, lz, 1.2, 1.0, 1.2, M2.hay, { texScale: 1.2, kind: 'sand', pen: 0.5 }); }
function tent(F, lx, lz) {
  F.box(lx, 0, lz, 2.8, 1.5, 3.4, M2.tent, { invisible: true, kind: 'wood', pen: 0.6 });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3.4, 3, 1, true), M2.tent); m.rotation.set(Math.PI / 2, 0, 0); m.rotation.z = Math.PI; m.scale.set(0.95, 1, 1.05);
  F.mesh(m, lx, 0.85, lz);
}
function tankV(F, lx, lz, r = 2, h = 6, mat = M2.tank) {
  F.box(lx, 0, lz, r * 1.8, h, r * 1.8, mat, { invisible: true, kind: 'metal' });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 18), mat); F.mesh(m, lx, h / 2, lz);
  const top = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat); top.scale.y = 0.35; F.mesh(top, lx, h, lz);
  for (let k = 1; k < 4; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.02, 0.05, 4, 24), MAT.dark); ring.rotation.x = Math.PI / 2; F.mesh(ring, lx, h * k / 4, lz); }
}
function pipe(F, lx, lz, len, y = 2, alongX = true) {
  alongX ? F.box(lx, y - 0.35, lz, len, 0.7, 0.7, M2.tank, { invisible: true, kind: 'metal' }) : F.box(lx, y - 0.35, lz, 0.7, 0.7, len, M2.tank, { invisible: true, kind: 'metal' });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, len, 12), M2.tank); m.rotation.set(alongX ? 0 : Math.PI / 2, 0, alongX ? Math.PI / 2 : 0); F.mesh(m, lx, y, lz);
  for (let a = -len / 2 + 1; a < len / 2; a += 4) { alongX ? F.box(lx + a, 0, lz, 0.25, y - 0.35, 0.25, MAT.dark, { texScale: 0 }) : F.box(lx, 0, lz + a, 0.25, y - 0.35, 0.25, MAT.dark, { texScale: 0 }); }
}
function crateF(F, lx, lz, y = 0, s = 1.3) { const [px, pz] = F.P(lx, lz); crate(px, y, pz, s); }
function crates(F, lx, lz) { crateF(F, lx, lz, 0, 1.3); crateF(F, lx + 1.3, lz, 0, 1.3); crateF(F, lx, lz, 1.3, 1.3); crateF(F, lx, lz + 1.3, 0, 1.2); }
function cont(F, lx, lz, long, alongX, color, y0 = 0) { const [px, pz] = F.P(lx, lz); container(px, y0, pz, long, F.odd ? !alongX : alongX, color); }
function scaf(F, lx, lz, w, d, h, dir) { const [px, pz] = F.P(lx, lz); scaffold(px, pz, F.odd ? d : w, F.odd ? w : d, h, F.dir(dir)); }
function carF(F, lx, lz, alongZ, color = 0) { const [px, pz] = F.P(lx, lz); car(px, pz, F.odd ? !alongZ : alongZ, color); }
function barrelF(F, lx, lz) { const [px, pz] = F.P(lx, lz); barrel(px, pz); }
function barrels(F, lx, lz) { barrelF(F, lx, lz); barrelF(F, lx + 0.66, lz); barrelF(F, lx + 0.33, lz + 0.6); }
function sandbag(F, lx, lz, len = 3, alongX = true) { alongX ? F.box(lx, 0, lz, len, 0.95, 0.8, MAT.sandbag, { texScale: 1.6, kind: 'sand' }) : F.box(lx, 0, lz, 0.8, 0.95, len, MAT.sandbag, { texScale: 1.6, kind: 'sand' }); }
function jersey(F, lx, lz, len = 3, alongX = true) { alongX ? F.box(lx, 0, lz, len, 1.05, 0.6, MAT.concrete, { kind: 'barrier' }) : F.box(lx, 0, lz, 0.6, 1.05, len, MAT.concrete, { kind: 'barrier' }); }
function fence(F, lx, lz, len, alongX = true, mat = M2.plank) {
  alongX ? F.box(lx, 0, lz, len, 1.1, 0.12, mat, { invisible: true, kind: 'wood', pen: 0.3 }) : F.box(lx, 0, lz, 0.12, 1.1, len, mat, { invisible: true, kind: 'wood', pen: 0.3 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.08, 0.12, alongX ? 0.08 : len), mat);
  for (const y of [0.45, 0.95]) F.mesh(rail.clone(), lx, y, lz);
  for (let a = -len / 2; a <= len / 2 + 0.01; a += 1.5) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.12), mat); F.mesh(p, lx + (alongX ? a : 0), 0.575, lz + (alongX ? 0 : a)); }
}
function fountain(F) {
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = 3; F.box(Math.cos(a) * r, 0, Math.sin(a) * r, 1.4, 0.75, 1.4, M2.stone); }
  F.box(0, 0, 0, 1.2, 2.2, 1.2, M2.stone);
  const w = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.1, 24), M2.water); w.castShadow = false; F.mesh(w, 0, 0.5, 0);
}
NOPOS.add(fountain);
function well(F) {
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; F.box(Math.cos(a) * 1.4, 0, Math.sin(a) * 1.4, 1.0, 1.0, 1.0, M2.plaster); }
  for (const sx of [-1, 1]) F.box(sx * 1.5, 1.0, 0, 0.2, 1.8, 0.2, M2.plank, { texScale: 0 });
  F.box(0, 2.8, 0, 3.6, 0.15, 1.6, M2.roofTile, { texScale: 0 });
}
NOPOS.add(well);
function stall(F, lx, lz, color = 0) {
  F.box(lx, 0, lz, 2.6, 1.0, 1.1, M2.plank, { kind: 'wood', pen: 0.4 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), M2.plank); F.mesh(p, lx + sx * 1.3, 1.2, lz + sz * 0.7); }
  const c = new THREE.Mesh(new THREE.BoxGeometry(3, 0.06, 2), M2.cloth[color % M2.cloth.length]); c.rotation.x = 0.12; F.mesh(c, lx, 2.45, lz);
}
function arch(F, lx, lz, span = 5, h = 4.5, alongX = true, mat = M2.stone) {
  const off = span / 2 + 0.6;
  alongX ? (F.box(lx - off, 0, lz, 1.2, h, 1.2, mat), F.box(lx + off, 0, lz, 1.2, h, 1.2, mat), F.box(lx, h - 1, lz, span + 2.4, 1, 1.2, mat))
    : (F.box(lx, 0, lz - off, 1.2, h, 1.2, mat), F.box(lx, 0, lz + off, 1.2, h, 1.2, mat), F.box(lx, h - 1, lz, 1.2, 1, span + 2.4, mat));
}
// 올라갈 수 있는 단 (dirs: 계단 방향 목록, 'z-' 는 내 쪽에서 올라가는 계단)
function platform(F, lx, lz, w, d, h, mat, dirs = ['z-'], rail = true) {
  F.box(lx, 0, lz, w, h, d, mat, { texScale: 2.5 });
  const steps = Math.ceil(h / 0.33), rise = h / steps, run = 0.45;
  for (const dir of dirs) {
    if (dir === 'z-') F.stairs(lx, lz - d / 2 - steps * run, 1.6, steps, rise, run, 'z+', mat);
    if (dir === 'z+') F.stairs(lx, lz + d / 2 + steps * run, 1.6, steps, rise, run, 'z-', mat);
    if (dir === 'x-') F.stairs(lx - w / 2 - steps * run, lz, 1.6, steps, rise, run, 'x+', mat);
    if (dir === 'x+') F.stairs(lx + w / 2 + steps * run, lz, 1.6, steps, rise, run, 'x-', mat);
  }
  if (rail) { F.box(lx - w / 2 + 0.6, h, lz + d / 2 - 0.2, 1.2, 0.9, 0.4, mat); F.box(lx + w / 2 - 0.6, h, lz - d / 2 + 0.2, 1.2, 0.9, 0.4, mat); }
}
function mesa(F, lx, lz, w, d, h) {
  F.box(lx, 0, lz, w, h, d, M2.rock, { texScale: 4 });
  F.box(lx + mr(-w / 5, w / 5), h, lz + mr(-d / 5, d / 5), w * mr(0.4, 0.7), mr(0.8, 2), d * mr(0.4, 0.7), M2.rock, { texScale: 4 });
  for (let i = 0; i < 3; i++) rock(F, lx + mr(-w / 2, w / 2), lz + (MR() < 0.5 ? -1 : 1) * (d / 2 + 0.6), mr(1.2, 2.2), mr(0.8, 1.6));
}
function palis(F, lx, lz, len, alongX = true, h = 3.6, gaps = []) {
  let cur = -len / 2;
  for (const gp of gaps.concat([{ c: len / 2 + 99, w: 0 }]).sort((a, b) => a.c - b.c)) {
    const l = Math.min(gp.c - gp.w / 2, len / 2) - cur;
    if (l > 0.1) { const c = cur + l / 2; alongX ? F.box(lx + c, 0, lz, l, h, 0.6, M2.log, { invisible: true, kind: 'wood' }) : F.box(lx, 0, lz + c, 0.6, h, l, M2.log, { invisible: true, kind: 'wood' });
      const g = new THREE.CylinderGeometry(0.28, 0.28, h, 7); for (let a = cur + 0.3; a < cur + l; a += 0.56) { const m = new THREE.Mesh(g, M2.log); F.mesh(m, lx + (alongX ? a : 0), h / 2, lz + (alongX ? 0 : a)); } }
    cur = gp.c + gp.w / 2; if (cur > len / 2) break;
  }
}
function bus(F, lx, lz, alongZ = true, color = 1) {
  const W = 2.5, L = 10;
  alongZ ? F.box(lx, 0.3, lz, W, 2.6, L, MAT.car[color % MAT.car.length], { texScale: 0, kind: 'metal' }) : F.box(lx, 0.3, lz, L, 2.6, W, MAT.car[color % MAT.car.length], { texScale: 0, kind: 'metal' });
  alongZ ? F.box(lx, 0, lz, W - 0.3, 0.3, L - 1, MAT.dark, { texScale: 0 }) : F.box(lx, 0, lz, L - 1, 0.3, W - 0.3, MAT.dark, { texScale: 0 });
  const win = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? W + 0.02 : L - 1, 0.8, alongZ ? L - 1 : W + 0.02), MAT.glass); win.castShadow = false; F.mesh(win, lx, 2.2, lz);
}
function bunker(F) { // ㄷ자 모래주머니 진지
  sandbag(F, 0, 1.6, 4, true); sandbag(F, -2, 0.4, 2.4, false); sandbag(F, 2, 0.4, 2.4, false);
}
NOPOS.add(bunker);
TEX.facade = canvasTex(256, 256, (g, w, h) => { // 창문 있는 건물 벽 (한 장 = 가로 3m · 세로 3.2m 두 칸)
  g.fillStyle = '#9a9690'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 0, 18);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { const x = c * 128 + 34, y = r * 128 + 34; g.fillStyle = '#26323e'; g.fillRect(x, y, 60, 56); g.fillStyle = 'rgba(160,190,210,0.25)'; g.fillRect(x + 4, y + 4, 24, 20); g.fillStyle = '#5c5a56'; g.fillRect(x - 4, y + 56, 68, 6); }
});
const FACADE = [0xffffff, 0xc98a76, 0xe6d6b4, 0xa9b4bf].map(c => new THREE.MeshStandardMaterial({ map: TEX.facade, color: c, roughness: 0.9 }));
function block(F, lx, lz, w, d, h, mat) { // 들어갈 수 없는 큰 건물 (도심) — 창문은 벽 그림으로 (가볍게)
  const fm = FACADE[mat === MAT.brick ? 1 : mat === M2.plaster ? 2 : mat === MAT.concrete ? 0 : 3];
  F.box(lx, 0, lz, w, h, d, fm, { texScale: 6 });
  F.box(lx, h, lz, w + 0.3, 0.4, d + 0.3, MAT.concreteDark, { texScale: 3 });
}
function snowTop(F, lx, lz, w, d, y) { const m = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.12, d + 0.1), M2.snowCap); m.castShadow = false; F.mesh(m, lx, y + 0.06, lz); }

// ---- 바닥 + 둘레 ----
function mapFloor(W, L, mat, rep = 8) {
  const t = mat.map.clone(); t.needsUpdate = true; t.repeat.set((W + 160) / rep, (L + 160) / rep);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W + 160, L + 160), new THREE.MeshStandardMaterial({ map: t, color: mat.color, roughness: 1 }));
  m.rotation.x = -Math.PI / 2; m.position.y = -0.005; m.receiveShadow = true; WADD(m);
}
function perimeter(W, L, type) {
  const hw = W / 2, hl = L / 2;
  const solid = (mat, H, ts = 2) => {
    addBox(0, 0, -hl - 0.5, W + 2, H, 1, mat, { texScale: ts }); addBox(0, 0, hl + 0.5, W + 2, H, 1, mat, { texScale: ts });
    addBox(-hw - 0.5, 0, 0, 1, H, L, mat, { texScale: ts }); addBox(hw + 0.5, 0, 0, 1, H, L, mat, { texScale: ts });
  };
  const F = LF(0, 0, 0);
  if (type === 'rock' || type === 'rockSnow') { // 바위 절벽
    const snowy = type === 'rockSnow';
    solid(M2.rock, 3.2, 4);
    const saved = WORLD.boxes; WORLD.boxes = [];
    for (const [ax, len, fixed] of [['x', W + 6, -hl - 2.2], ['x', W + 6, hl + 2.2], ['z', L, -hw - 2.2], ['z', L, hw + 2.2]])
      for (let a = -len / 2; a < len / 2; a += mr(3, 5)) { const w = mr(3.5, 6), h = mr(5, 11); ax === 'x' ? rock(F, a, fixed, w, h, 4, snowy) : rock(F, fixed, a, 4, h, w, snowy); }
    WORLD.boxes = saved;
    return;
  }
  if (type === 'fence') { // 철망 (보이지 않는 높은 벽 + 기둥)
    for (const [x, z, w, d] of [[0, -hl - 0.3, W + 1, 0.4], [0, hl + 0.3, W + 1, 0.4], [-hw - 0.3, 0, 0.4, L], [hw + 0.3, 0, 0.4, L]]) addBox(x, 0, z, w, 6, d, MAT.metal, { invisible: true, kind: 'metal' });
    const mesh = new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.5, metalness: 0.7, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
    for (const [x, z, len, rx] of [[0, -hl - 0.3, W, 0], [0, hl + 0.3, W, 0], [-hw - 0.3, 0, L, 1], [hw + 0.3, 0, L, 1]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(len, 3.2), mesh); p.position.set(x, 1.6, z); if (rx) p.rotation.y = Math.PI / 2; p.castShadow = false; WADD(p);
      for (let a = -len / 2; a <= len / 2; a += 3) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.3, 6), MAT.dark); post.position.set(rx ? x : a, 1.65, rx ? a : z); WADD(post); }
    }
    return;
  }
  if (type === 'palis') { for (const [x, z, len, ax] of [[0, -hl - 0.4, W + 1, true], [0, hl + 0.4, W + 1, true], [-hw - 0.4, 0, L, false], [hw + 0.4, 0, L, false]]) palis(F, x, z, len, ax, 4.4); return; }
  const mat = { brick: MAT.brick, plaster: M2.plaster, concrete: MAT.concreteDark, stone: M2.stone, plank: M2.plank }[type] || MAT.concreteDark;
  solid(mat, type === 'concrete' ? 6 : 5);
}
function outskirts(W, L, kind) { // 둘레 바깥 꾸미기 (보기용, 충돌 없음)
  const hw = W / 2, hl = L / 2, F = LF(0, 0, 0);
  const ring = (fn, gap = 7) => { for (let a = -hw - 10; a <= hw + 10; a += gap) { fn(a, -hl - mr(6, 14)); fn(a, hl + mr(6, 14)); } for (let a = -hl; a <= hl; a += gap) { fn(-hw - mr(6, 14), a); fn(hw + mr(6, 14), a); } };
  const visualOnly = (build) => { const saved = WORLD.boxes; WORLD.boxes = []; build(); WORLD.boxes = saved; };
  visualOnly(() => {
    if (kind === 'pines' || kind === 'snowpines') ring((x, z) => pine(F, x, z, mr(1, 1.7), kind === 'snowpines'), 5);
    if (kind === 'trees') ring((x, z) => tree(F, x, z, mr(1, 1.6)), 6);
    if (kind === 'palms') ring((x, z) => { if (MR() < 0.4) palm(F, x, z, mr(0.9, 1.3)); else rock(F, x, z, mr(2, 5), mr(1, 3)); }, 8);
    if (kind === 'city') ring((x, z) => { const h = mr(10, 24); block(F, x, z, mr(6, 9), mr(6, 9), h, [MAT.brick, MAT.concrete, M2.plaster][(MR() * 3) | 0]); }, 9);
    if (kind === 'cranes') ring((x, z) => { if (MR() < 0.15) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 22, 1), new THREE.MeshStandardMaterial({ color: 0xd9a531 })); m.position.set(x, 11, z); WADD(m); const arm = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 0.8), m.material); arm.position.set(x, 21.5, z); WADD(arm); } else if (MR() < 0.5) { const [px, pz] = F.P(x, z); container(px, 0, pz, MR() < 0.5, MR() < 0.5, (MR() * 6) | 0); } }, 8);
  });
}

// ---- 맵 정의 ----
// size: 한 팀 인원 (1~4), W·L: 크기, theme: 하늘색, floor: 바닥, wall: 둘레
const MAP_LIST = { 1: [], 2: [], 3: [], 4: [] };
function defMap(id, name, size, W, L, theme, build) {
  MAP_DEFS[id] = { id, name, size, theme, bounds: { minX: -W / 2, maxX: W / 2, minZ: -L / 2, maxZ: L / 2 }, spawnZ: -(L / 2 - 3.5), W, L, build };
  MAP_LIST[size].push(id);
}
function mapBuilder(seed, W, L, floor, wall, outside, layout) {
  return () => {
    MR = seeded(seed); MSPOTS = [];
    mapFloor(W, L, floor); perimeter(W, L, wall); if (outside) outskirts(W, L, outside);
    layout(W / 2, L / 2);
    const spots = MSPOTS; MSPOTS = null; MR = Math.random;
    return spots;
  };
}

// 기존 두 맵도 목록에 넣기
defMap('duel', '벽돌 골목', 1, 28, 72, 'base', null);
defMap('arena', '훈련장', 4, 100, 100, 'base', null);

// ===== 1대1 =====
defMap('d_snow', '눈 덮인 산장', 1, 30, 72, 'snow', mapBuilder(101, 30, 72, M2.snow, 'rockSnow', 'snowpines', (hw, hl) => {
  C(house, 0, 0, 0, 7, 5, 3, M2.log, { door: ['l', 'r'], win: ['f', 'b'], roof: false, pitched: true, pitchMat: M2.snowCap });
  S(pine, -10.5, -8, 0, 1.1, true); S(pine, -5.5, -15, 0, 1, true); S(pine, 10, -18, 0, 1.2, true); S(pine, 4, -7, 0, 0.9, true); S(pine, 12, -3, 0, 1, true); S(pine, -12, -22, 0, 1.1, true);
  S(rock, -2.5, -12, 0, 2.6, 1.5, 0, true); S(rock, 7.5, -11, 0, 3, 1.3, 0, true); S(rock, -8.5, -18, 0, 2, 2.2, 0, true);
  S(logs, 2.5, -24, 0, 4, true); S(logs, -10, -3, 0, 3.5, false);
  S(house, 9, -27, 0, 5, 4, 2.6, M2.plank, { door: ['f'], win: ['l'], roof: true, stairs: 'l' });
  S(rock, -4.5, -29, 0, 2.6, 1.3, 0, true); S(logs, 4.5, -30.5, 0, 3.5, true);
  S(fence, 0, -18.5, 0, 6, true, M2.plank);
  S(scaf, -11.5, -13, 0, 3, 3, 3, 'z-');
}));
defMap('d_desert', '사막 마을', 1, 32, 70, 'desert', mapBuilder(102, 32, 70, M2.sand, 'plaster', 'palms', (hw, hl) => {
  C(well, 0, 0, 0);
  S(house, -9.5, -12, 0, 7, 6, 3.2, M2.plaster, { door: ['r'], win: ['f', 'l'], roof: true, stairs: 'b' });
  S(house, 10.5, -22, 0, 6, 5, 3, M2.plaster, { door: ['l', 'f'], win: ['r'], roof: false });
  S(stall, 5, -6, 0, 0); S(stall, -4.5, -3.5, 0, 2);
  S(wallL, 5, -16, 0, 6, 2.2, true, M2.plaster); S(wallL, -12.8, -26, 0, 5, 1.2, false, M2.plaster);
  S(palm, -13.5, -4, 0, 1); S(palm, 13.5, -11, 0, 1.1); S(palm, -3.5, -23, 0, 0.9);
  S(crates, 6, -12, 0); S(barrels, 12, -5, 0);
  S(wallL, 0, -29, 0, 5, 1.1, true, M2.plaster); S(crates, -9, -30, 0);
  S(arch, 0, -19.5, 0, 3.4, 4, true, M2.plaster);
}));
defMap('d_harbor', '컨테이너 부두', 1, 30, 74, 'gray', mapBuilder(103, 30, 74, MAT.asphalt, 'fence', 'cranes', (hw, hl) => {
  C(cont, 0, 0, 0, true, true, 2);
  S(cont, -9, -10, 0, false, false, 0); S(cont, 8, -14, 0, false, false, 1); S(cont, 8, -14, 0, false, false, 3, 2.6);
  S(crates, 3.5, -18.5, 0); S(cont, -4, -23, 0, false, true, 4);
  S(barrels, 12, -5, 0); S(barrels, -13, -18, 0); S(jersey, 2, -8, 0, 3.2, true); S(jersey, -12.5, -3, 0, 3, false);
  S(scaf, 11.5, -26, 0, 3, 3, 3.2, 'z-');
  S(jersey, 0, -30, 0, 5, true); S(crates, -10, -31, 0); S(carF, 5, -27, 0, false, 2);
}));

// ===== 2대2 =====
defMap('t2_farm', '시골 농장', 2, 44, 84, 'base', mapBuilder(201, 44, 84, M2.grass, 'palis', 'trees', (hw, hl) => {
  C(house, 0, 0, 0, 10, 8, 4.5, M2.redwood, { door: ['f', 'b'], win: ['l', 'r'], roof: false, pitched: true });
  S(hay, -3, -2, 0, 2); S(hay, 3.2, 1.5, 0, 1);
  S(tankV, -15, -14, 0, 2.2, 9, M2.tank);
  S(hay, 6, -12, 0, 3); S(hay, -8, -21, 0, 2); S(hay, 13, -27, 0, 4);
  S(fence, -6, -8, 0, 8, true); S(fence, 15, -6, 0, 9, false); S(fence, -16, -24, 0, 8, true);
  S(carF, 9, -19, 0, true, 3);
  S(house, -12, -31, 0, 9, 7, 3.2, M2.plank, { door: ['f', 'r'], win: ['l', 'b', 'f'], roof: true, stairs: 'l' });
  S(tree, 17, -14, 0, 1.3); S(tree, -18, -4, 0, 1.2); S(tree, 3, -33, 0, 1.1); S(tree, 18, -33, 0, 1.4);
  S(hay, -4, -36, 0, 2); S(hay, 7, -36.5, 0, 2);
  S(logs, 18, -20, 0, 4, false);
}));
defMap('t2_ruins', '돌 유적', 2, 44, 84, 'dusk', mapBuilder(202, 44, 84, M2.dirt, 'rock', null, (hw, hl) => {
  C(platform, 0, 0, 0, 8, 8, 1.6, M2.stone, ['z-', 'z+']);
  S(pillar, -3.2, -3.2, 0, 0.9, 4.5); S(pillar, 3.2, -3.2, 0, 0.9, 4.5);
  S(pillar, -9, -6, 0); S(pillar, -9, -12, 0); S(pillar, 9, -8, 0, 0.9, 2.5);
  S(broken, -12, -15, 0, 8, true, M2.stone); S(broken, 5, -20, 0, 10, true, M2.stone); S(broken, -17, -27, 0, 6, false, M2.stone); S(broken, 15, -11, 0, 7, false, M2.stone);
  S(arch, 0, -27, 0, 6, 4.5, true); S(rock, 10, -30, 0, 3, 1.6); S(rock, -6, -9, 0, 2, 1.2); S(rock, 17, -22, 0, 2.6, 2);
  S(platform, -15, -33, 0, 6, 4, 2.2, M2.stone, ['z-']);
  S(broken, -3, -36, 0, 7, true, M2.stone); S(broken, 9, -36, 0, 4, true, M2.stone);
}));
defMap('t2_forest', '숲 속 캠프', 2, 44, 84, 'forest', mapBuilder(203, 44, 84, M2.grass, 'palis', 'pines', (hw, hl) => {
  S(logs, 0, -2.8, 0, 3.2, true); S(logs, -2.8, 0, 1, 3.2, true);
  S(pine, -6, -6, 0, 1.2); S(pine, 8, -4, 0, 1.4); S(pine, -14, -12, 0, 1.3); S(pine, 4, -15, 0, 1.1); S(pine, 16, -16, 0, 1.5); S(pine, -9, -24, 0, 1.2); S(pine, 12, -30, 0, 1.3); S(pine, -18, -36, 0, 1.4); S(pine, 0, -26, 0, 1);
  S(tent, -6, -15, 0); S(tent, 9, -24, 1);
  S(scaf, 15, -9, 0, 3, 3, 4, 'z-');
  S(rock, -16, -4, 0, 3, 1.8); S(rock, 3, -9, 0, 2.2, 1.3); S(rock, -3, -33, 0, 3, 1.4); S(rock, 19, -24, 0, 2.4, 2.4);
  S(logs, 10, -14, 0, 4, false); S(logs, -12, -30, 0, 4, true);
  S(house, -14, -20, 0, 6, 5, 3, M2.log, { door: ['f', 'r'], win: ['l'], roof: false, pitched: true });
  S(logs, 5, -36, 0, 4, true);
}));
defMap('t2_town', '마을 광장', 2, 44, 84, 'base', mapBuilder(204, 44, 84, M2.cobble, 'brick', 'city', (hw, hl) => {
  C(fountain, 0, 0, 0);
  S(house, -12, -10, 0, 8, 7, 3.2, M2.white, { door: ['f', 'r'], win: ['l', 'b'], roof: true, stairs: 'l' });
  S(house, 12, -21, 0, 7, 6, 3, MAT.brick, { door: ['l'], win: ['f', 'b'], roof: true, stairs: 'b' });
  S(stall, 6, -7, 0, 1); S(stall, -4, -15, 0, 3);
  S(carF, -3, -25, 0, false, 0); S(carF, 17, -5, 0, true, 2);
  S(tree, 8, -13, 0, 1.1); S(tree, -18, -23, 0, 1.3);
  S(wallL, -8, -4, 0, 3, 1.0, true, M2.stone); S(wallL, 15, -32, 0, 4, 1.0, false, M2.stone);
  S(house, -14, -32, 0, 7, 6, 3.2, M2.plaster, { door: ['f', 'b'], win: ['r'], roof: false, pitched: true });
  S(carF, 5, -36, 0, false, 1); S(wallL, -5, -37, 0, 4, 1.0, true, M2.stone);
}));

// ===== 3대3 =====
defMap('t3_factory', '공장', 3, 60, 96, 'gray', mapBuilder(301, 60, 96, MAT.concrete, 'concrete', 'city', (hw, hl) => {
  C(house, 0, 0, 0, 14, 10, 5, MAT.metal, { door: ['f', 'b', 'l', 'r'], win: [], roofMat: MAT.metal });
  S(crates, -3, -1.5, 0); S(cont, 4, 2.5, 0, false, true, 1);
  S(tankV, -20, -12, 0, 3, 7); S(tankV, -13.5, -13, 0, 2.2, 5.5);
  S(pipe, 8, -19, 0, 18, 2.1, true);
  S(cont, 20, -12, 0, false, false, 2); S(cont, 20, -12, 0, false, false, 4, 2.6); S(crates, 17, -17.5, 0);
  S(scaf, -6, -26, 0, 10, 2.5, 3.5, 'x-');
  S(house, 18, -38, 0, 8, 6, 3.2, MAT.concrete, { door: ['f', 'l'], win: ['b'], roof: true, stairs: 'r' });
  S(barrels, 3, -31, 0); S(jersey, -16, -24, 0, 4, true); S(jersey, 8, -10, 0, 3, false);
  S(bus, -22, -33, 0, true, 2); S(cont, -10, -40, 0, true, true, 0); S(jersey, 4, -43, 0, 6, true);
}));
defMap('t3_snowbase', '설원 기지', 3, 60, 96, 'snow', mapBuilder(302, 60, 96, M2.snow, 'fence', 'snowpines', (hw, hl) => {
  C(platform, 0, 0, 0, 5, 5, 3, MAT.metal, ['z-', 'z+']);
  S(bunker, -10, -13, 0); S(bunker, 14, -6, 1);
  S(cont, 16, -14, 0, false, false, 0); S(snowTop, 16, -14, 0, 2.44, 6.1, 2.6);
  S(cont, -18, -6, 0, true, true, 2); S(snowTop, -18, -6, 0, 12.2, 2.44, 2.6);
  S(house, -18, -30, 0, 12, 6, 3, M2.plank, { door: ['f', 'r'], win: ['f', 'b', 'l'], roof: true, stairs: 'l', roofMat: M2.snowCap });
  S(pine, 24, -24, 0, 1.3, true); S(pine, -26, -18, 0, 1.4, true); S(pine, 6, -26, 0, 1.1, true); S(pine, -4, -38, 0, 1.2, true);
  S(rock, 9, -20, 0, 3, 1.5, 0, true); S(rock, -5, -20, 0, 2.4, 1.2, 0, true); S(rock, 22, -36, 0, 4, 2, 0, true);
  S(tankV, 22, -2, 0, 2, 4, M2.tank); S(jersey, 2, -12, 0, 4, true); S(jersey, -2, -40.5, 0, 6, true); S(crates, 14, -42, 0);
  S(scaf, 26, -40, 0, 3, 3, 4, 'z-');
}));
defMap('t3_canyon', '사막 협곡', 3, 60, 96, 'desert', mapBuilder(303, 60, 96, M2.sand, 'rock', 'palms', (hw, hl) => {
  C(mesa, 0, 0, 0, 6, 6, 2.6); S(rock, 4.5, -3.5, 0, 1.6, 1.3);
  S(mesa, -17, -10, 0, 10, 14, 7); S(mesa, 18, -24, 0, 12, 10, 6); S(mesa, -6, -32, 0, 8, 6, 4.5);
  S(rock, 6, -10, 0, 3, 1.6); S(rock, -4, -18, 0, 2.6, 1.3); S(rock, 24, -8, 0, 3.5, 2); S(rock, -24, -28, 0, 3, 1.8);
  S(carF, 8, -16, 0, false, 0); S(barrels, -10, -22, 0);
  S(house, 8, -38, 0, 7, 6, 3, M2.plaster, { door: ['f', 'l'], win: ['r'], roof: true, stairs: 'b' });
  S(platform, -22, -40, 0, 6, 5, 2.4, M2.rock, ['x+']);
  S(wallL, 0, -40.5, 0, 6, 1.1, true, M2.plaster); S(palm, 20, -42, 0, 1.1); S(palm, -14, -44, 0, 1);
}));
defMap('t3_village', '폐허 마을', 3, 60, 96, 'gray', mapBuilder(304, 60, 96, M2.dirt, 'stone', 'trees', (hw, hl) => {
  C(platform, 0, 0, 0, 5, 5, 3, M2.stone, ['x-', 'x+']);
  S(house, -14, -12, 0, 8, 7, 3, MAT.brick, { ruin: 1 }); S(house, 13, -8, 0, 7, 6, 3, M2.plaster, { ruin: 1 });
  S(house, -4, -26, 0, 9, 6, 3, MAT.brick, { ruin: 1 }); S(house, 20, -30, 0, 8, 8, 3.2, M2.stone, { door: ['f', 'l'], win: ['r', 'b'], roof: true, stairs: 'b' });
  S(rock, 6, -16, 0, 2, 1); S(rock, -22, -24, 0, 2.6, 1.4); S(rock, 2, -10, 0, 1.6, 0.9);
  S(carF, -18, -36, 0, true, 3); S(broken, 9, -42, 0, 8, true, MAT.brick); S(broken, -10, -42, 0, 6, true, MAT.brick);
  S(tree, 25, -14, 0, 1.2); S(tree, -25, -6, 0, 1.3); S(tree, 0, -36, 0, 1);
  S(broken, -24, -14, 0, 6, false, M2.stone); S(broken, 25, -20, 0, 6, false, M2.stone);
}));

// ===== 4대4 =====
defMap('t4_city', '도심', 4, 80, 110, 'base', mapBuilder(401, 80, 110, MAT.asphalt, 'concrete', 'city', (hw, hl) => {
  C(fountain, 0, 0, 0); S(bus, 8, -6, 0, true, 1);
  S(block, -26, -14, 0, 14, 12, 14, MAT.brick); S(block, 26, -30, 0, 12, 14, 18, MAT.concrete); S(block, -24, -40, 0, 14, 10, 10, M2.plaster);
  S(house, 14, -16, 0, 10, 8, 3.4, M2.white, { door: ['f', 'b', 'l'], win: ['r'], roof: true, stairs: 'r' });
  S(house, -10, -28, 0, 8, 7, 3.2, MAT.brick, { door: ['f', 'r'], win: ['l', 'b'], roof: true, stairs: 'l' });
  S(carF, -4, -12, 0, true, 0); S(carF, 4, -26, 0, false, 2); S(carF, 34, -12, 0, true, 3); S(carF, -34, -24, 0, true, 1);
  S(jersey, 0, -38, 0, 6, true); S(jersey, 10, -44, 0, 4, false); S(jersey, -14, -50, 0, 5, true);
  S(scaf, 32, -48, 0, 3, 3, 4, 'z-'); S(barrels, -2, -20, 0); S(crates, 22, -4, 0); S(bus, -16, -4, 0, false, 2);
}));
defMap('t4_port', '항구', 4, 80, 110, 'gray', mapBuilder(402, 80, 110, MAT.concrete, 'fence', 'cranes', (hw, hl) => {
  C(cont, 0, 0, 0, true, true, 0); C(cont, 0, 0, 0, false, true, 1, 2.6);
  S(cont, -14, -8, 0, true, true, 2); S(cont, -14, -8, 0, false, true, 3, 2.6); S(cont, 14, -14, 0, false, false, 4);
  S(cont, -28, -14, 0, false, false, 5); S(cont, -28, -14, 0, false, false, 1, 2.6); S(cont, 30, -6, 0, true, false, 0);
  S(house, -18, -30, 0, 16, 10, 6, MAT.metal, { door: ['f', 'b', 'r'], win: [], roofMat: MAT.metal });
  S(crates, -21, -31, 0); S(cont, -14, -30, 0, false, false, 2);
  S(cont, 18, -28, 0, true, true, 3); S(crates, 10, -24, 0); S(scaf, 32, -36, 0, 4, 4, 4.5, 'z-');
  S(barrels, 4, -12, 0); S(jersey, 6, -40, 0, 6, true); S(jersey, -6, -48, 0, 4, false); S(carF, 24, -48, 0, false, 1);
  S(crates, 34, -20, 0); S(cont, 0, -34, 0, false, true, 4);
}));
defMap('t4_fort', '숲 속 요새', 4, 80, 110, 'forest', mapBuilder(403, 80, 110, M2.grass, 'rock', 'pines', (hw, hl) => {
  // 가운데 나무 요새: 양쪽에 문, 모서리에 망루
  C(palis, 0, -9, 0, 18, true, 3.4, [{ c: 0, w: 3 }]); C(palis, 0, 9, 0, 18, true, 3.4, [{ c: 0, w: 3 }]);
  C(palis, -9, 0, 0, 18, false, 3.4, [{ c: 0, w: 2.5 }]); C(palis, 9, 0, 0, 18, false, 3.4, [{ c: 0, w: 2.5 }]);
  S(scaf, -7, -7, 0, 2.6, 2.6, 4, 'x+'); S(scaf, 7, -7, 0, 2.6, 2.6, 4, 'x-');
  C(house, 0, 0, 0, 5, 4, 2.6, M2.log, { door: ['l', 'r'], win: ['f', 'b'], roof: false, pitched: true });
  S(pine, -16, -6, 0, 1.4); S(pine, 18, -12, 0, 1.5); S(pine, -24, -20, 0, 1.3); S(pine, 6, -22, 0, 1.2); S(pine, 28, -26, 0, 1.6); S(pine, -8, -34, 0, 1.3); S(pine, 16, -40, 0, 1.4); S(pine, -30, -42, 0, 1.5); S(pine, 34, -8, 0, 1.3);
  S(tent, -16, -28, 0); S(tent, 22, -34, 1); S(logs, -4, -18, 0, 4, true); S(logs, 26, -18, 0, 4, false);
  S(rock, -30, -10, 0, 4, 2.4); S(rock, 12, -28, 0, 3, 1.6); S(rock, -18, -48, 0, 3.5, 1.8); S(rock, 4, -46, 0, 3, 1.4);
  S(house, -30, -32, 0, 6, 5, 3, M2.log, { door: ['f', 'r'], win: ['b'], roof: true, stairs: 'l' });
  S(scaf, 30, -48, 0, 3, 3, 4, 'z-');
}));
