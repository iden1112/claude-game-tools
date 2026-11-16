/*
 * models3d.js — 코드로 만드는 저폴리(low-poly) 3D 모델 모음 (Three.js r128 이상, 의존성 없음)
 *
 *   const fish = MODELS3D.fish({ length: 1.2, body: 0x4aa0e0, belly: 0xf0f4f8, shape: 'round' });
 *   scene.add(fish);
 *   // 움직이는 모델은 userData.update(t, dt) 가 있어요. 매 프레임 불러 주세요.
 *   MODELS3D.updateAll(scene, t, dt);
 *
 * 모든 함수는 THREE.Group 을 돌려줘요. 바닥(y=0) 위에 서도록 만들어요.
 * seed 를 주면 같은 seed 에서 항상 같은 모양이 나와요.
 */
(function (root) {
  'use strict';
  const T = () => root.THREE;
  const M = {};

  // ---------- 기본 도구 ----------
  M.rng = function (seed) { let s = (seed >>> 0) || 0x9e3779b9; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
  function hash(x, y, seed) { let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  /** 0~1 값 노이즈 (부드러운 언덕 모양) */
  M.noise2 = function (x, y, seed = 0) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const s = (t) => t * t * (3 - 2 * t), u = s(xf), v = s(yf);
    const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  M.fbm2 = function (x, y, seed = 0, oct = 4) { let f = 0, a = 0.5, s = 1, n = 0; for (let i = 0; i < oct; i++) { f += a * M.noise2(x * s, y * s, seed + i * 17); n += a; a *= 0.5; s *= 2; } return f / n; };
  const col = (c) => new (T().Color)(c);

  /**
   * 재질. style: 'flat'(각진 저폴리, 기본) | 'toon'(만화풍 3단 음영) | 'smooth' | 'basic'(빛 무시)
   */
  M.material = function (color, o = {}) {
    const THREE = T(), style = o.style || M.defaultStyle || 'flat';
    const base = { color: col(color), vertexColors: !!o.vertexColors, transparent: !!o.transparent, opacity: o.opacity == null ? 1 : o.opacity, side: o.side || THREE.FrontSide };
    if (o.emissive != null) base.emissive = col(o.emissive);
    if (o.map) base.map = o.map;
    if (style === 'toon') return new THREE.MeshToonMaterial(Object.assign(base, { gradientMap: toonRamp() }));
    if (style === 'basic') { delete base.emissive; return new THREE.MeshBasicMaterial(base); }
    if (style === 'smooth') return new THREE.MeshPhongMaterial(Object.assign(base, { shininess: o.shininess || 20 }));
    return new THREE.MeshPhongMaterial(Object.assign(base, { flatShading: true, shininess: o.shininess || 6 }));
  };
  let _ramp = null;
  function toonRamp() {
    if (_ramp) return _ramp;
    const THREE = T(), c = document.createElement('canvas'); c.width = 3; c.height = 1;
    const g = c.getContext('2d'); ['#555', '#aaa', '#fff'].forEach((v, i) => { g.fillStyle = v; g.fillRect(i, 0, 1, 1); });
    _ramp = new THREE.CanvasTexture(c); _ramp.magFilter = THREE.NearestFilter; _ramp.minFilter = THREE.NearestFilter; _ramp.generateMipmaps = false;
    return _ramp;
  }
  /** 픽셀 텍스처: draw(ctx, w, h) 로 그려요. 확대해도 픽셀이 또렷해요 */
  M.pixelTexture = function (w, h, draw, o = {}) {
    const THREE = T(), c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
    return t;
  };
  function mesh(geo, mat, cast = true) { const m = new (T().Mesh)(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; }
  /** 정점 색칠: fn(x, y, z) → THREE.Color. 흰 재질 + vertexColors 와 같이 써요 */
  M.paint = function (geo, fn) {
    const THREE = T(), pos = geo.attributes.position, n = pos.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const c = fn(pos.getX(i), pos.getY(i), pos.getZ(i), i); arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  };
  /** 정점 흔들기: 같은 위치의 정점은 같은 양만큼 움직여서 틈이 안 생겨요 */
  M.jitter = function (geo, amount, seed = 1) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = (a) => (M.noise2(x * 3.1 + a, z * 3.1 + y * 2.3, seed) - 0.5) * 2 * amount;
      pos.setXYZ(i, x + k(11), y + k(23), z + k(37));
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
    return geo;
  };
  function flatShape(points) { const s = new (T().Shape)(); points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; }

  // ---------- 물고기 ----------
  /**
   * shape: 'round'(붕어형) | 'long'(가늘고 긴) | 'flat'(넙치) | 'shark'(상어) | 'puffer'(복어)
   * body, belly, fin: 색 / stripes: 줄무늬 수 / stripeColor / spots: 점 개수 / length: 길이(미터)
   */
  M.fish = function (o = {}) {
    const THREE = T();
    const L = o.length || 1, shape = o.shape || 'round';
    const prof = { round: [1, 0.55, 0.28], long: [1, 0.28, 0.2], flat: [1, 0.16, 0.6], shark: [1, 0.32, 0.3], puffer: [0.75, 0.7, 0.7] }[shape] || [1, 0.5, 0.3];
    const g = new THREE.Group(); g.name = 'fish';
    const bodyC = col(o.body || 0x4aa0e0), bellyC = col(o.belly || 0xf2f4f6), finC = o.fin || (o.body || 0x4aa0e0), stripeC = col(o.stripeColor || 0x1a2a40);
    const geo = new THREE.SphereGeometry(0.5, 14, 10);
    geo.scale(prof[0] * L, prof[1] * L, prof[2] * L);
    // 앞은 둥글고 뒤는 가늘게
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / L, t = (0.5 - x); // 0 앞 .. 1 뒤
      const k = shape === 'shark' ? 1 - Math.pow(Math.max(0, t), 1.6) * 0.75 : 1 - Math.pow(Math.max(0, t - 0.15), 2) * 0.9;
      pos.setY(i, pos.getY(i) * k); pos.setZ(i, pos.getZ(i) * (shape === 'flat' ? 1 : k));
    }
    geo.computeVertexNormals();
    const rnd = M.rng(o.seed || 7), spots = [];
    for (let i = 0; i < (o.spots || 0); i++) spots.push([(rnd() - 0.55) * 0.8 * L, (rnd() - 0.3) * prof[1] * 0.6 * L]);
    M.paint(geo, (x, y) => {
      const ny = y / (prof[1] * L * 0.5);
      let c = bodyC.clone().lerp(bellyC, Math.min(1, Math.max(0, (-ny + 0.15) * 1.4)));
      if (o.stripes && ny > -0.4) { const s = Math.sin((x / L + 0.5) * Math.PI * o.stripes * 2); if (s > 0.55) c = c.lerp(stripeC, 0.75); }
      for (const [sx, sy] of spots) if (Math.hypot(x - sx, y - sy) < 0.05 * L) c = c.lerp(stripeC, 0.8);
      return c;
    });
    const body = mesh(geo, M.material(0xffffff, { vertexColors: true, style: o.style }));
    g.add(body);
    // 꼬리 (축을 중심으로 흔들려요)
    const tail = new THREE.Group(); tail.position.x = -prof[0] * L * 0.45; g.add(tail);
    const tw = shape === 'shark' ? 0.42 : 0.3;
    const tailShape = shape === 'shark'
      ? flatShape([[0, 0], [-0.32, 0.36], [-0.2, 0.02], [-0.26, -0.22]])
      : flatShape([[0, 0], [-tw, tw * 0.9], [-tw * 0.75, 0], [-tw, -tw * 0.9]]);
    const tailGeo = new THREE.ShapeGeometry(tailShape); tailGeo.scale(L, L, L);
    const finMat = M.material(finC, { side: THREE.DoubleSide, style: o.style });
    tail.add(mesh(tailGeo, finMat));
    // 등지느러미, 가슴지느러미
    const dorsal = shape === 'shark' ? flatShape([[-0.12, 0], [0.02, 0.3], [0.12, 0]]) : flatShape([[-0.22, 0], [-0.05, 0.16], [0.12, 0]]);
    const dg = new THREE.ShapeGeometry(dorsal); dg.scale(L, L, L);
    const d = mesh(dg, finMat); d.position.y = prof[1] * L * 0.42; g.add(d);
    const pg = new THREE.ShapeGeometry(flatShape([[0, 0], [-0.16, 0.05], [-0.12, -0.08]])); pg.scale(L, L, L);
    const pL = mesh(pg, finMat), pR = mesh(pg, finMat);
    pL.position.set(prof[0] * L * 0.12, -prof[1] * L * 0.15, prof[2] * L * 0.42); pL.rotation.x = 0.6;
    pR.position.set(prof[0] * L * 0.12, -prof[1] * L * 0.15, -prof[2] * L * 0.42); pR.rotation.x = -0.6;
    g.add(pL, pR);
    // 눈
    const eyeW = M.material(0xffffff, { style: 'smooth' }), eyeB = M.material(0x111111, { style: 'smooth' });
    for (const s of [1, -1]) {
      const e = mesh(new THREE.SphereGeometry(0.055 * L, 8, 6), eyeW, false);
      e.position.set(prof[0] * L * 0.32, prof[1] * L * 0.12, s * prof[2] * L * 0.36);
      const p = mesh(new THREE.SphereGeometry(0.032 * L, 8, 6), eyeB, false); p.position.set(0.012 * L, 0, s * 0.03 * L); e.add(p);
      g.add(e);
    }
    const speed = o.swimSpeed || 9, phase = Math.random() * 6;
    g.userData.update = (t) => {
      tail.rotation.y = Math.sin(t * speed + phase) * 0.45;
      body.rotation.y = Math.sin(t * speed + phase + 1.2) * 0.06;
      pL.rotation.z = Math.sin(t * speed * 0.6) * 0.3; pR.rotation.z = -pL.rotation.z;
    };
    return g;
  };

  // ---------- 자연 ----------
  /** 나무. type: 'round'(활엽수) | 'pine'(침엽수) | 'palm'(야자수) | 'bush'(덤불) */
  M.tree = function (o = {}) {
    const THREE = T(), type = o.type || 'round', H = o.height || 3, rnd = M.rng(o.seed || 3);
    const g = new THREE.Group(); g.name = 'tree';
    const trunkMat = M.material(o.trunk || 0x7a5030, { style: o.style }), leafMat = M.material(o.leaf || (type === 'pine' ? 0x2f7a46 : 0x4a9a3e), { style: o.style });
    const leafMat2 = M.material(col(o.leaf || (type === 'pine' ? 0x2f7a46 : 0x4a9a3e)).multiplyScalar(0.82), { style: o.style });
    if (type === 'pine') {
      g.add(mesh(new THREE.CylinderGeometry(0.08 * H, 0.12 * H, 0.35 * H, 6).translate(0, 0.175 * H, 0), trunkMat));
      for (let i = 0; i < 3; i++) {
        const r = (0.36 - i * 0.09) * H, h = (0.42 - i * 0.06) * H;
        const c = mesh(M.jitter(new THREE.ConeGeometry(r, h, 7, 1).translate(0, (0.3 + i * 0.22) * H + h / 2, 0), 0.03 * H, i + (o.seed || 0)), i % 2 ? leafMat2 : leafMat);
        g.add(c);
      }
    } else if (type === 'palm') {
      const segs = 6, bend = 0.25 * H;
      let prev = new THREE.Vector3(0, 0, 0);
      for (let i = 1; i <= segs; i++) {
        const t = i / segs, p = new THREE.Vector3(bend * t * t, H * t, 0);
        const len = prev.distanceTo(p), seg = mesh(new THREE.CylinderGeometry(0.07 * H * (1 - t * 0.4), 0.08 * H * (1 - t * 0.4), len, 6), trunkMat);
        seg.position.copy(prev).add(p).multiplyScalar(0.5); seg.lookAt(p); seg.rotateX(Math.PI / 2);
        g.add(seg); prev = p;
      }
      for (let i = 0; i < 7; i++) {
        const leaf = mesh(new THREE.ConeGeometry(0.12 * H, 0.75 * H, 4, 1).scale(1, 1, 0.25).translate(0, 0.375 * H, 0), i % 2 ? leafMat2 : leafMat);
        leaf.position.copy(prev); leaf.rotation.set(0, (i / 7) * Math.PI * 2, 1.15 + rnd() * 0.3, 'YXZ');
        g.add(leaf);
      }
    } else {
      const bush = type === 'bush';
      if (!bush) g.add(mesh(new THREE.CylinderGeometry(0.07 * H, 0.11 * H, 0.5 * H, 6).translate(0, 0.25 * H, 0), trunkMat));
      const n = bush ? 3 : 4;
      for (let i = 0; i < n; i++) {
        const r = (bush ? 0.3 : 0.28) * H * (0.75 + rnd() * 0.45);
        const b = mesh(M.jitter(new THREE.IcosahedronGeometry(r, 0), 0.06 * r, i + (o.seed || 0)), i % 2 ? leafMat2 : leafMat);
        const a = rnd() * Math.PI * 2, d = i ? 0.22 * H : 0;
        b.position.set(Math.cos(a) * d, (bush ? 0.25 : 0.68) * H + (i ? rnd() * 0.15 * H : 0.12 * H), Math.sin(a) * d);
        g.add(b);
      }
    }
    const sway = o.sway == null ? 0.02 : o.sway, ph = rnd() * 6;
    g.userData.update = (t) => { g.rotation.z = Math.sin(t * 1.3 + ph) * sway; };
    return g;
  };
  /** 바위: 울퉁불퉁한 저폴리 돌 */
  M.rock = function (o = {}) {
    const THREE = T(), s = o.size || 1;
    const geo = new THREE.IcosahedronGeometry(0.5 * s, o.detail == null ? 1 : o.detail);
    geo.scale(1, o.flat || 0.7, 1);
    M.jitter(geo, 0.12 * s, o.seed || 5);
    geo.translate(0, 0.25 * s * (o.flat || 0.7), 0);
    const c = col(o.color || 0x8a8a90), moss = o.moss ? col(o.moss) : null;
    M.paint(geo, (x, y) => (moss && y > 0.35 * s ? moss.clone() : c.clone().multiplyScalar(0.85 + 0.25 * M.noise2(x * 4, y * 4, 9))));
    const g = new THREE.Group(); g.name = 'rock';
    g.add(mesh(geo, M.material(0xffffff, { vertexColors: true, style: o.style })));
    return g;
  };
  /**
   * 섬/지형: 가운데가 솟고 가장자리가 물 아래로 내려가요. 높이에 따라 모래 → 풀 → 바위 색
   * radius, height, seed, segments, colors: { sand, grass, rock, under }
   * 결과 group.userData.heightAt(x, z) 로 지면 높이를 알 수 있어요 (캐릭터 세우기용)
   */
  M.island = function (o = {}) {
    const THREE = T(), R = o.radius || 10, H = o.height || 3, seg = o.segments || 48, seed = o.seed || 11;
    const C = Object.assign({ sand: 0xe8d49a, grass: 0x6abe4a, rock: 0x8a8478, under: 0xc8b07a }, o.colors || {});
    const hAt = (x, z) => {
      const d = Math.hypot(x, z) / R;
      const fall = 1 - Math.pow(Math.min(1, d), 2.2);
      const n = M.fbm2(x / R * 2.2 + 10, z / R * 2.2 + 10, seed);
      return fall * H * (0.55 + 0.9 * n) - (d > 0.85 ? (d - 0.85) * H * 3 : 0) - 0.15;
    };
    const geo = new THREE.PlaneGeometry(R * 2.4, R * 2.4, seg, seg); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, hAt(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    const cs = col(C.sand), cg = col(C.grass), cr = col(C.rock), cu = col(C.under);
    M.paint(geo, (x, y) => (y < 0 ? cu.clone() : y < 0.35 ? cs.clone() : y < H * 0.85 ? cg.clone().multiplyScalar(0.9 + 0.2 * M.noise2(x, y, 3)) : cr.clone()));
    const g = new THREE.Group(); g.name = 'island';
    const m = mesh(geo, M.material(0xffffff, { vertexColors: true, style: o.style }), false); g.add(m);
    g.userData.heightAt = hAt;
    return g;
  };
  /**
   * 물: 정점이 출렁여요. size, color, deep(깊은 색), waves(파도 높이), segments, opacity
   * 매 프레임 userData.update(t) 필요 (MODELS3D.updateAll 로 한 번에)
   */
  M.water = function (o = {}) {
    const THREE = T(), S = o.size || 40, seg = o.segments || 40, A = o.waves == null ? 0.12 : o.waves;
    const geo = new THREE.PlaneGeometry(S, S, seg, seg); geo.rotateX(-Math.PI / 2);
    const mat = M.material(o.color || 0x3a9ad8, { transparent: true, opacity: o.opacity == null ? 0.85 : o.opacity, style: o.style, shininess: 60 });
    const m = mesh(geo, mat, false);
    const pos = geo.attributes.position, base = Float32Array.from(pos.array);
    const g = new THREE.Group(); g.name = 'water'; g.add(m);
    g.userData.update = (t) => {
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2];
        pos.setY(i, Math.sin(x * 0.45 + t * 1.3) * A + Math.sin(z * 0.6 + t * 0.9) * A * 0.7 + Math.sin((x + z) * 1.3 + t * 2.1) * A * 0.25);
      }
      pos.needsUpdate = true; geo.computeVertexNormals();
    };
    g.userData.heightAt = (x, z, t) => Math.sin(x * 0.45 + t * 1.3) * A + Math.sin(z * 0.6 + t * 0.9) * A * 0.7 + Math.sin((x + z) * 1.3 + t * 2.1) * A * 0.25;
    return g;
  };
  /** 풀밭: InstancedMesh 라서 수천 개도 가벼워요 */
  M.grass = function (o = {}) {
    const THREE = T(), n = o.count || 400, W = o.width || 10, D = o.depth || 10, rnd = M.rng(o.seed || 4);
    const geo = new THREE.ConeGeometry(0.04, 0.35, 3, 1).translate(0, 0.175, 0);
    // 인스턴스마다 색을 주니 재질은 흰색 (색이 곱해져 어두워지지 않게)
    const im = new THREE.InstancedMesh(geo, M.material(0xffffff, { style: o.style }), n);
    const d = new THREE.Object3D(), c = col(o.color || 0x5aa040);
    for (let i = 0; i < n; i++) {
      const x = (rnd() - 0.5) * W, z = (rnd() - 0.5) * D, y = o.heightAt ? o.heightAt(x, z) : 0;
      d.position.set(x, y, z); d.rotation.set((rnd() - 0.5) * 0.4, rnd() * 6, (rnd() - 0.5) * 0.4); const s = 0.6 + rnd() * 0.8; d.scale.set(s, s, s); d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
      if (im.setColorAt) im.setColorAt(i, c.clone().multiplyScalar(0.8 + rnd() * 0.4));
    }
    const g = new THREE.Group(); g.name = 'grass'; g.add(im);
    return g;
  };

  // ---------- 탈것 / 건물 / 소품 ----------
  /** 배. length, hull(선체 색), deck, cabin(true면 선실), sail(true면 돛), mast */
  M.boat = function (o = {}) {
    const THREE = T(), L = o.length || 4, W = L * 0.36, Hh = L * 0.16;
    const g = new THREE.Group(); g.name = 'boat';
    // 위에서 본 선체 모양 → 아래로 밀어내기
    const top = flatShape([[-L / 2, -W / 2], [L * 0.22, -W / 2], [L / 2, 0], [L * 0.22, W / 2], [-L / 2, W / 2]]);
    const hullGeo = new THREE.ExtrudeGeometry(top, { depth: Hh, bevelEnabled: false });
    hullGeo.rotateX(Math.PI / 2); // 위 → 아래로
    hullGeo.translate(0, Hh, 0);
    const pos = hullGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < Hh * 0.5) { pos.setZ(i, pos.getZ(i) * 0.55); pos.setX(i, pos.getX(i) * 0.92); }
    hullGeo.computeVertexNormals();
    const hullC = col(o.hull || 0xb83a2a), stripe = col(o.stripe || 0xf4ecd8);
    M.paint(hullGeo, (x, y) => (y > Hh * 0.78 ? stripe.clone() : hullC.clone()));
    g.add(mesh(hullGeo, M.material(0xffffff, { vertexColors: true, style: o.style })));
    const deck = mesh(new THREE.BoxGeometry(L * 0.86, 0.04 * L, W * 0.86).translate(-L * 0.04, Hh - 0.01 * L, 0), M.material(o.deck || 0xc89a5a, { style: o.style }));
    g.add(deck);
    if (o.cabin !== false) {
      const cab = mesh(new THREE.BoxGeometry(L * 0.28, L * 0.18, W * 0.6).translate(-L * 0.18, Hh + L * 0.09, 0), M.material(o.cabinColor || 0xf4f0e6, { style: o.style }));
      const roof = mesh(new THREE.BoxGeometry(L * 0.32, L * 0.03, W * 0.68).translate(-L * 0.18, Hh + L * 0.195, 0), M.material(o.roof || 0x2a5a8a, { style: o.style }));
      const win = mesh(new THREE.BoxGeometry(0.01, L * 0.06, W * 0.4).translate(-L * 0.04 + 0.005, Hh + L * 0.12, 0), M.material(0x9ad8ff, { style: 'smooth', shininess: 90 }));
      g.add(cab, roof, win);
    }
    if (o.sail) {
      g.add(mesh(new THREE.CylinderGeometry(0.02 * L, 0.025 * L, L * 0.9, 6).translate(L * 0.05, Hh + L * 0.45, 0), M.material(o.mast || 0x6a4a2a, { style: o.style })));
      const sg = new THREE.ShapeGeometry(flatShape([[0, 0], [0, L * 0.75], [-L * 0.42, 0]]));
      const sail = mesh(sg, M.material(o.sailColor || 0xf8f4ea, { side: THREE.DoubleSide, style: o.style }));
      sail.position.set(L * 0.04, Hh + L * 0.1, 0); g.add(sail);
      g.userData.sail = sail;
    }
    const ph = Math.random() * 6;
    g.userData.update = (t) => {
      g.position.y = (g.userData.baseY || 0) + Math.sin(t * 1.6 + ph) * 0.04 * L;
      g.rotation.z = Math.sin(t * 1.2 + ph) * 0.03; g.rotation.x = Math.sin(t * 0.9 + ph) * 0.02;
      if (g.userData.sail) g.userData.sail.scale.x = 1 + Math.sin(t * 2 + ph) * 0.04;
    };
    return g;
  };
  /** 집. width, depth, wall, roof, door, floors */
  M.house = function (o = {}) {
    const THREE = T(), W = o.width || 4, D = o.depth || 3.5, Hw = (o.floors || 1) * 2.2;
    const g = new THREE.Group(); g.name = 'house';
    g.add(mesh(new THREE.BoxGeometry(W, Hw, D).translate(0, Hw / 2, 0), M.material(o.wall || 0xf0e2c4, { style: o.style })));
    // 박공지붕: 옆에서 본 삼각형을 집 너비만큼 밀어내요
    const over = 0.25, RW = W + over * 2;
    const roofGeo = new THREE.ExtrudeGeometry(flatShape([[-D / 2 - over, 0], [D / 2 + over, 0], [0, D * 0.42]]), { depth: RW, bevelEnabled: false });
    roofGeo.rotateY(Math.PI / 2); roofGeo.translate(-RW / 2, Hw, 0);
    g.add(mesh(roofGeo, M.material(o.roof || 0xb84a3a, { style: o.style })));
    g.add(mesh(new THREE.BoxGeometry(0.8, 1.4, 0.06).translate(0, 0.7, D / 2 + 0.03), M.material(o.door || 0x6a4024, { style: o.style })));
    const winMat = M.material(o.window || 0x9ad8ff, { style: 'smooth', shininess: 80, emissive: o.lit ? 0x806020 : undefined });
    for (const x of [-W * 0.3, W * 0.3]) g.add(mesh(new THREE.BoxGeometry(0.7, 0.6, 0.06).translate(x, Hw * 0.62, D / 2 + 0.03), winMat));
    if (o.chimney !== false) g.add(mesh(new THREE.BoxGeometry(0.4, 1, 0.4).translate(W * 0.28, Hw + D * 0.35, -D * 0.12), M.material(0x8a6a5a, { style: o.style })));
    return g;
  };
  /** 나무 상자 */
  M.crate = function (o = {}) {
    const THREE = T(), s = o.size || 0.8;
    const tex = M.pixelTexture(16, 16, (g) => {
      g.fillStyle = '#b07a3a'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#8a5a2a'; g.fillRect(0, 0, 16, 2); g.fillRect(0, 14, 16, 2); g.fillRect(0, 0, 2, 16); g.fillRect(14, 0, 2, 16);
      g.fillStyle = '#9a6a32'; for (let i = 2; i < 14; i++) g.fillRect(i, i, 2, 1);
      g.fillStyle = '#6a4220'; [[1, 1], [14, 1], [1, 14], [14, 14]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
    });
    const g = new THREE.Group(); g.name = 'crate';
    g.add(mesh(new THREE.BoxGeometry(s, s, s).translate(0, s / 2, 0), M.material(0xffffff, { map: tex, style: o.style })));
    return g;
  };
  /** 등불: light=true면 진짜 빛(PointLight)도 넣어요 (많이 쓰면 무거워요) */
  M.lantern = function (o = {}) {
    const THREE = T(), g = new THREE.Group(); g.name = 'lantern';
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 6).translate(0, 0.8, 0), M.material(0x3a3a40, { style: o.style })));
    const glow = mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24).translate(0, 1.75, 0), M.material(o.color || 0xffd27a, { style: 'basic' }), false);
    g.add(glow, mesh(new THREE.ConeGeometry(0.2, 0.14, 4).rotateY(Math.PI / 4).translate(0, 1.97, 0), M.material(0x3a3a40, { style: o.style })));
    if (o.light) { const L = new THREE.PointLight(o.color || 0xffd27a, o.intensity || 1, o.distance || 6); L.position.y = 1.75; g.add(L); }
    return g;
  };

  // ---------- 캐릭터 ----------
  /**
   * 블록형 사람 (크로시 로드/로블록스 느낌). skin, shirt, pants, hair, hat(색 또는 null), height
   * userData.walk(t, amount): amount 0=가만히 1=걷기 2=달리기
   * userData.parts: { head, body, armL, armR, legL, legR } — 팔에 낚싯대 같은 걸 붙일 수 있어요
   */
  M.humanoid = function (o = {}) {
    const THREE = T(), H = o.height || 1.6, u = H / 1.6;
    const g = new THREE.Group(); g.name = 'humanoid';
    const mat = (c) => M.material(c, { style: o.style });
    const skin = mat(o.skin || 0xf4c8a0), shirt = mat(o.shirt || 0x3a7ad8), pants = mat(o.pants || 0x3a4060), hair = mat(o.hair || 0x4a2a1a), shoe = mat(o.shoes || 0x2a2020);
    const hips = new THREE.Group(); hips.position.y = 0.7 * u; g.add(hips);
    const body = mesh(new THREE.BoxGeometry(0.46 * u, 0.55 * u, 0.26 * u).translate(0, 0.275 * u, 0), shirt); hips.add(body);
    const head = new THREE.Group(); head.position.y = 0.58 * u; hips.add(head);
    head.add(mesh(new THREE.BoxGeometry(0.36 * u, 0.36 * u, 0.34 * u).translate(0, 0.18 * u, 0), skin));
    head.add(mesh(new THREE.BoxGeometry(0.38 * u, 0.12 * u, 0.36 * u).translate(0, 0.33 * u, -0.01 * u), hair));
    head.add(mesh(new THREE.BoxGeometry(0.38 * u, 0.22 * u, 0.06 * u).translate(0, 0.25 * u, -0.17 * u), hair));
    const eye = M.material(0x1a1a1a, { style: 'basic' });
    for (const s of [-1, 1]) head.add(mesh(new THREE.BoxGeometry(0.05 * u, 0.07 * u, 0.02 * u).translate(s * 0.08 * u, 0.2 * u, 0.175 * u), eye, false));
    if (o.hat) {
      head.add(mesh(new THREE.CylinderGeometry(0.3 * u, 0.3 * u, 0.03 * u, 12).translate(0, 0.38 * u, 0), mat(o.hat)));
      head.add(mesh(new THREE.CylinderGeometry(0.18 * u, 0.2 * u, 0.16 * u, 12).translate(0, 0.46 * u, 0), mat(o.hat)));
    }
    const limb = (w, h, m, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); p.add(mesh(new THREE.BoxGeometry(w, h, w).translate(0, -h / 2, 0), m)); return p; };
    const armL = limb(0.13 * u, 0.5 * u, shirt, -0.3 * u, 0.53 * u), armR = limb(0.13 * u, 0.5 * u, shirt, 0.3 * u, 0.53 * u);
    for (const a of [armL, armR]) a.add(mesh(new THREE.BoxGeometry(0.12 * u, 0.1 * u, 0.12 * u).translate(0, -0.53 * u, 0), skin));
    const legL = limb(0.17 * u, 0.62 * u, pants, -0.11 * u, 0), legR = limb(0.17 * u, 0.62 * u, pants, 0.11 * u, 0);
    for (const l of [legL, legR]) l.add(mesh(new THREE.BoxGeometry(0.18 * u, 0.08 * u, 0.24 * u).translate(0, -0.66 * u, 0.03 * u), shoe));
    hips.add(armL, armR, legL, legR);
    g.userData.parts = { hips, body, head, armL, armR, legL, legR };
    let ph = 0;
    g.userData.walk = (t, amount = 1, dt = 1 / 60) => {
      ph += dt * (6 + amount * 3);
      const a = Math.min(1, amount) * 0.7 + Math.max(0, amount - 1) * 0.3, s = Math.sin(ph);
      legL.rotation.x = s * a; legR.rotation.x = -s * a; armL.rotation.x = -s * a * 0.9; armR.rotation.x = s * a * 0.9;
      hips.position.y = 0.7 * u + Math.abs(Math.cos(ph)) * 0.04 * u * amount + (amount === 0 ? Math.sin(t * 2) * 0.008 * u : 0);
      body.rotation.y = s * 0.08 * amount;
    };
    g.userData.update = (t, dt) => { if (!g.userData.manual) g.userData.walk(t, g.userData.moving || 0, dt); };
    return g;
  };

  // ---------- 배치 / 갱신 ----------
  /** 흩뿌리기: make(i, rnd) 가 만든 모델을 영역에 무작위로 놓아요. heightAt 를 주면 지면에 맞춰요 */
  M.scatter = function (parent, make, count, o = {}) {
    const rnd = M.rng(o.seed || 21), W = o.width || 20, D = o.depth || 20, out = [];
    for (let i = 0, tries = 0; i < count && tries < count * 20; tries++) {
      const x = (o.x || 0) + (rnd() - 0.5) * W, z = (o.z || 0) + (rnd() - 0.5) * D;
      if (o.where && !o.where(x, z)) continue;
      const m = make(i, rnd); m.position.set(x, o.heightAt ? o.heightAt(x, z) : 0, z); m.rotation.y = rnd() * Math.PI * 2;
      const s = (o.minScale || 0.8) + rnd() * ((o.maxScale || 1.2) - (o.minScale || 0.8)); m.scale.multiplyScalar(s);
      parent.add(m); out.push(m); i++;
    }
    return out;
  };
  /** 장면 안의 모든 움직이는 모델(userData.update)을 한 번에 갱신 */
  M.updateAll = function (root3d, t, dt) { root3d.traverse((o) => { if (o.userData && o.userData.update) o.userData.update(t, dt); }); };
  /** 다 쓴 모델의 메모리 해제 (지오메트리·재질·텍스처) */
  M.dispose = function (obj) {
    obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); });
    obj.parent && obj.parent.remove(obj);
  };

  root.MODELS3D = M;
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);
