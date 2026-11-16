/*
 * fx3d.js v2 — 3D 게임용 이펙트 라이브러리 (Three.js r128 이상, 의존성 없음)
 *
 *   const fx = new FX3D(scene, { pixelRatioHeight: renderer.domElement.height, look: 'toon' });
 *   fx.update(dt, camera);                      // 매 프레임
 *   fx.splash(pos); fx.rarity(pos, 2); fx.explosion(pos); fx.text(pos, "+120G");
 *   const fire = fx.fire(pos);  fire.stop();     // 계속 나오는 이펙트는 핸들
 *
 * 보이는 방식(look)
 *   'toon'  : 또렷한 모양 + 단계 색 + 점 패턴(디더링)으로 사라짐. 저폴리·만화풍 게임 (기본)
 *   'pixel' : toon 과 같은데 파티클 하나하나가 작은 픽셀 그림처럼 보여요. 픽셀풍 3D 게임
 *   'soft'  : 부드럽게 번지는 일반 파티클
 *
 * 파티클은 카메라를 보는 작은 판(인스턴싱)이라 수천 개도 드로우콜 2개예요.
 * 빠르게 움직이는 파티클(물방울, 불똥)은 속도 방향으로 늘어나 꼬리가 생겨요.
 */
(function (root) {
  'use strict';
  const T = () => root.THREE;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const v3 = (p) => ({ x: p.x || 0, y: p.y || 0, z: p.z || 0 });
  const rgb = (c) => { const k = new (T().Color)(c); return [k.r, k.g, k.b]; };
  const hsl = (h, s, l) => { const k = new (T().Color)(); k.setHSL(((h % 1) + 1) % 1, s, l); return [k.r, k.g, k.b]; };
  const ease = {
    out: (t) => 1 - (1 - t) * (1 - t),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    outBack: (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  };
  // PIXELFX 번들은 전역 var 또는 const 로 있을 수 있어요
  // eslint-disable-next-line no-undef
  const pixelfxLib = () => root.PIXELFX || (typeof PIXELFX !== 'undefined' ? PIXELFX : null);

  // ---------- 색 묶음 (어두움 → 밝음, 이펙트가 쓰는 기본 팔레트) ----------
  const RAMPS = {
    water: [0xffffff, 0xd8f4ff, 0x8fd2f4, 0x4a9ad0],
    foam: [0xffffff, 0xeaf6ff, 0xb8dcf0],
    fire: [0xfffbe0, 0xffe066, 0xffa02a, 0xe04a1a, 0x7a2a1a],
    ember: [0xffffff, 0xffe066, 0xff8a2a, 0xd03a10],
    smoke: [0x6a625a, 0x8a8278, 0xa8a096, 0xc4beb4],
    dark: [0x3a302a, 0x4a4038, 0x5a5048, 0x6a6058],
    dust: [0xe0d4b8, 0xc8b89a, 0xa8987a],
    gold: [0xffffff, 0xfff4a0, 0xffd23a, 0xe09414, 0xa05c0c],
    silver: [0xffffff, 0xeef4ff, 0xc8d4e8, 0x8a9ab8],
    bronze: [0xffe8c8, 0xf0b070, 0xc87a3a, 0x8a4a1a],
    heal: [0xffffff, 0xd0ffd8, 0x7dff9a, 0x2ab04a],
    magic: [0xffffff, 0xe0d0ff, 0xa080ff, 0x6040d0],
    leaf: [0x8fd16a, 0x5aa040, 0x3a7a2a],
    wood: [0xd8a868, 0xa87038, 0x6a4220],
  };
  const SHAPE = { circle: 0, ring: 1, star: 2, spark: 3, puff: 4, square: 5, drop: 6, heart: 7 };

  // ---------- 셰이더 ----------
  const VERT = `
    attribute vec3 iPos; attribute vec3 iVel; attribute vec4 iCol; attribute vec4 iData;
    varying vec2 vUv; varying vec4 vCol; varying float vShape;
    void main(){
      vUv = uv; vCol = iCol; vShape = iData.w;
      vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
      float size = iData.x, rot = iData.y, stretch = iData.z;
      vec2 ax = vec2(cos(rot), sin(rot)); float len = size;
      if (stretch > 0.0) {
        vec2 vv = (modelViewMatrix * vec4(iVel, 0.0)).xy;
        float sp = length(vv);
        if (sp > 0.0001) { ax = vv / sp; len = size + sp * stretch; }
      }
      vec2 ay = vec2(-ax.y, ax.x);
      mv.xy += ax * position.x * len + ay * position.y * size;
      gl_Position = projectionMatrix * mv;
    }`;
  const FRAG = `
    uniform float uPix; uniform float uMode; // 0 toon(디더) 1 glow(가산) 2 soft
    varying vec2 vUv; varying vec4 vCol; varying float vShape;
    float bayer(vec2 p){ vec2 q = mod(floor(p), 4.0); float a = mod(q.x,2.0)*2.0 + mod(q.y,2.0); float b = mod(floor(q.x/2.0),2.0)*2.0 + mod(floor(q.y/2.0),2.0);
      return (a*4.0 + b + 0.5) / 16.0; }
    void main(){
      vec2 uv = vUv;
      if (uPix > 0.5) uv = (floor(uv * uPix) + 0.5) / uPix;
      vec2 p = uv * 2.0 - 1.0; float r = length(p); float m = 0.0; float shade = 1.0;
      int s = int(vShape + 0.5);
      if (s == 0) { m = step(r, 0.95); }
      else if (s == 1) { m = step(r, 0.95) * step(0.62, r); }
      else if (s == 2) { vec2 a = abs(p); m = step(a.x * a.y * 9.0 + max(a.x, a.y) * 0.55, 0.62) * step(r, 1.0); }
      else if (s == 3) { vec2 a = abs(p); m = step(a.x + a.y * 2.2, 1.0); }
      else if (s == 4) { m = step(r, 0.95); vec3 n = vec3(p, sqrt(max(0.0, 1.0 - r * r)));
        float l = dot(n, normalize(vec3(-0.55, 0.65, 0.55))); shade = l > 0.62 ? 1.12 : (l > 0.2 ? 0.92 : 0.72); }
      else if (s == 5) { m = step(max(abs(p.x), abs(p.y)), 0.9); }
      else if (s == 6) { m = step(r, 0.95); shade = (p.x < -0.2 && p.y > 0.1) ? 1.25 : 1.0; }
      else { vec2 q = p * vec2(1.0, -1.0) * 1.15 + vec2(0.0, 0.25); float a = atan(q.x, q.y) / 3.14159; float h = abs(a);
        float d = (13.0*h - 22.0*h*h + 10.0*h*h*h) / (6.0 - 5.0*h); m = step(length(q), d * 0.95); }
      if (m < 0.5) discard;
      vec3 col = vCol.rgb * shade;
      if (uMode < 0.5) {
        if (vCol.a < bayer(gl_FragCoord.xy)) discard;
        gl_FragColor = vec4(col, 1.0);
      } else if (uMode < 1.5) {
        gl_FragColor = vec4(col * vCol.a, 1.0);
      } else {
        float soft = 1.0 - smoothstep(0.2, 1.0, r);
        gl_FragColor = vec4(col, vCol.a * (s == 4 || s == 0 ? soft : 1.0));
      }
    }`;

  class Batch {
    constructor(fx, mode, max) {
      const THREE = T();
      this.max = max; this.ps = []; this.mode = mode;
      const quad = new THREE.PlaneGeometry(1, 1);
      const g = new THREE.InstancedBufferGeometry();
      g.index = quad.index; g.attributes.position = quad.attributes.position; g.attributes.uv = quad.attributes.uv;
      this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
      this.aVel = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
      this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
      this.aDat = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
      for (const a of [this.aPos, this.aVel, this.aCol, this.aDat]) a.setUsage && a.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('iPos', this.aPos); g.setAttribute('iVel', this.aVel); g.setAttribute('iCol', this.aCol); g.setAttribute('iData', this.aDat);
      g.instanceCount = 0;
      const modeNum = mode === 'toon' ? 0 : mode === 'glow' ? 1 : 2;
      this.mat = new THREE.ShaderMaterial({
        uniforms: { uPix: fx.pixU, uMode: { value: modeNum } },
        vertexShader: VERT, fragmentShader: FRAG,
        transparent: mode !== 'toon', depthWrite: mode === 'toon', depthTest: true,
        blending: mode === 'glow' ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      this.mesh = new THREE.Mesh(g, this.mat);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = mode === 'glow' ? 5 : 4;
      this.geo = g;
      fx.root.add(this.mesh);
    }
    add(p) { if (this.ps.length < this.max) this.ps.push(p); else this.ps[(Math.random() * this.max) | 0] = p; }
    update(dt, t) {
      const ps = this.ps; let n = 0;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        if (p.delay > 0) { p.delay -= dt; ps[n++] = p; continue; }
        p.age += dt;
        if (p.age >= p.life) continue;
        if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; p.vz *= d; }
        p.vy -= p.grav * dt;
        if (p.wobble) { p.vx += Math.sin(p.age * 7 + p.seed) * p.wobble * dt; p.vz += Math.cos(p.age * 6 + p.seed) * p.wobble * dt; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.spin * dt;
        if (p.floor != null && p.y < p.floor) {
          p.y = p.floor;
          if (p.bounce && Math.abs(p.vy) > 0.6) { p.vy = -p.vy * p.bounce; p.vx *= 0.6; p.vz *= 0.6; p.spin *= 0.5; }
          else { p.vy = 0; p.vx *= 0.8; p.vz *= 0.8; p.spin *= 0.8; if (p.dieOnFloor) p.age = p.life; }
        }
        ps[n++] = p;
      }
      ps.length = n;
      const P = this.aPos.array, V = this.aVel.array, C = this.aCol.array, D = this.aDat.array;
      let k = 0;
      for (let i = 0; i < n; i++) {
        const p = ps[i];
        if (p.delay > 0) continue;
        const u = p.age / p.life;
        P[k * 3] = p.x; P[k * 3 + 1] = p.y; P[k * 3 + 2] = p.z;
        V[k * 3] = p.vx; V[k * 3 + 1] = p.vy; V[k * 3 + 2] = p.vz;
        let c;
        if (p.rainbow) c = hsl(p.seed * 0.11 + t * 0.7, 0.95, 0.62);
        else { const R = p.ramp; c = R[Math.min(R.length - 1, Math.floor(u * R.length))]; }
        C[k * 4] = c[0]; C[k * 4 + 1] = c[1]; C[k * 4 + 2] = c[2];
        const fin = p.fadeIn ? Math.min(1, p.age / p.fadeIn) : 1;
        const fo = u < p.fadeAt ? 1 : 1 - (u - p.fadeAt) / (1 - p.fadeAt);
        C[k * 4 + 3] = p.alpha * fin * fo;
        let s = p.s0 + (p.s1 - p.s0) * (p.sizeEase ? p.sizeEase(u) : u);
        if (p.pop) s *= Math.min(1, p.age / p.pop);
        if (p.twinkle) s *= Math.sin(p.age * p.twinkle + p.seed) > -0.4 ? 1 : 0.45;
        D[k * 4] = s; D[k * 4 + 1] = p.rot; D[k * 4 + 2] = p.stretch; D[k * 4 + 3] = p.shape;
        k++;
      }
      this.geo.instanceCount = k;
      this.aPos.needsUpdate = this.aVel.needsUpdate = this.aCol.needsUpdate = this.aDat.needsUpdate = true;
    }
    dispose() { this.geo.dispose(); this.mat.dispose(); this.mesh.parent && this.mesh.parent.remove(this.mesh); }
  }

  // ---------- 메시 이펙트용 셰이더 (고리·기둥·물기둥: 단계 색 + 디더 사라짐) ----------
  function toonSurfaceMaterial(color, o = {}) {
    const THREE = T();
    return new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color(color) }, uCol2: { value: new THREE.Color(o.color2 != null ? o.color2 : color) }, uA: { value: 1 }, uT: { value: 0 }, uBands: { value: o.bands || 0 }, uFadeTop: { value: o.fadeTop ? 1 : 0 }, uRim: { value: o.rim ? 1 : 0 } },
      vertexShader: 'varying vec2 vUv; varying float vRim; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vec3 n = normalize(normalMatrix * normal); vRim = 1.0 - abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform vec3 uCol; uniform vec3 uCol2; uniform float uA; uniform float uT; uniform float uBands; uniform float uFadeTop; uniform float uRim; varying vec2 vUv; varying float vRim;
        float bayer(vec2 p){ vec2 q = mod(floor(p), 4.0); float a = mod(q.x,2.0)*2.0 + mod(q.y,2.0); float b = mod(floor(q.x/2.0),2.0)*2.0 + mod(floor(q.y/2.0),2.0); return (a*4.0 + b + 0.5) / 16.0; }
        void main(){
          float a = uA;
          if (uFadeTop > 0.5) a *= vUv.y < 0.35 ? 1.0 : (vUv.y < 0.7 ? 0.6 : 0.25);
          if (uRim > 0.5) a *= vRim > 0.75 ? 1.0 : (vRim > 0.45 ? 0.55 : 0.12);
          if (uBands > 0.5) { float b = fract(vUv.y * uBands - uT); if (b > 0.55) a *= 0.45; }
          if (a < bayer(gl_FragCoord.xy)) discard;
          vec3 c = mix(uCol, uCol2, step(0.5, vUv.y));
          if (uRim > 0.5 && vRim > 0.75) c = mix(c, vec3(1.0), 0.35);
          gl_FragColor = vec4(c, 1.0);
        }`,
      side: THREE.DoubleSide, transparent: false, depthWrite: true,
    });
  }

  // ---------- 메인 클래스 ----------
  class FX3D {
    /**
     * @param scene  이펙트를 붙일 THREE.Scene (또는 Group)
     * @param opt.look  'toon' | 'pixel' | 'soft'
     * @param opt.unit  게임의 1미터가 몇 유닛인지 (기본 1)
     * @param opt.quality  0.5면 파티클 수 절반 (모바일)
     * @param opt.pixel  look:'pixel' 일 때 파티클 한 개를 몇 칸 픽셀로 그릴지 (기본 7)
     */
    constructor(scene, opt = {}) {
      const THREE = T();
      if (!THREE) throw new Error('FX3D: THREE 가 먼저 로드되어야 해요');
      this.root = new THREE.Group(); this.root.name = 'FX3D'; scene.add(this.root);
      this.unit = opt.unit || 1;
      this.quality = opt.quality == null ? 1 : opt.quality;
      this.pixU = { value: 0 };
      this.batches = {}; this.meshes = []; this.sources = []; this.pixels = [];
      this.t = 0; this.camera = null;
      this.setLook(opt.look || 'toon', opt.pixel);
    }
    /** 보이는 방식 바꾸기. 이미 떠 있는 파티클에도 바로 적용돼요 */
    setLook(look, pixel) {
      this.look = look; this.pixU.value = look === 'pixel' ? (pixel || 7) : 0;
    }
    resize() {} // v1 호환 (v2 는 화면 크기와 상관없이 월드 크기로 그려요)
    batch(mode) { return this.batches[mode] || (this.batches[mode] = new Batch(this, mode, 4000)); }
    n(count) { return Math.max(1, Math.round(count * this.quality)); }

    /**
     * 파티클 하나. 크기·속도는 unit 배율 적용.
     * shape: circle ring star spark puff square drop heart / glow:true 면 가산 발광
     * ramp: 색 배열(수명 따라 단계로 바뀜) 또는 color 하나
     * stretch: 속도 방향으로 늘어나는 정도(물방울·불똥 0.04~0.1)
     */
    emit(pos, o) {
      const U = this.unit, v = o.vel || { x: 0, y: 0, z: 0 };
      const mode = o.glow ? 'glow' : this.look === 'soft' ? 'soft' : 'toon';
      let ramp = o.ramp || [o.color != null ? o.color : 0xffffff];
      ramp = ramp.map((c) => (Array.isArray(c) ? c : rgb(c)));
      const s0 = (o.size != null ? o.size : 0.3) * U;
      this.batch(mode).add({
        x: pos.x + (o.ox || 0) * U, y: pos.y + (o.oy || 0) * U, z: pos.z + (o.oz || 0) * U,
        vx: v.x * U, vy: v.y * U, vz: v.z * U,
        grav: (o.gravity || 0) * U, drag: o.drag || 0, wobble: (o.wobble || 0) * U,
        floor: o.floor != null ? o.floor : null, bounce: o.bounce || 0, dieOnFloor: !!o.dieOnFloor,
        life: o.life || 1, age: 0, delay: o.delay || 0, fadeIn: o.fadeIn || 0, fadeAt: o.fadeAt == null ? 0.6 : o.fadeAt,
        s0, s1: o.size2 != null ? o.size2 * U : s0, sizeEase: o.sizeEase || null, pop: o.pop || 0,
        alpha: o.alpha == null ? 1 : o.alpha, ramp, rainbow: !!o.rainbow, twinkle: o.twinkle || 0, seed: Math.random() * 100,
        shape: SHAPE[o.shape || 'circle'] != null ? SHAPE[o.shape || 'circle'] : 0,
        rot: o.rot != null ? o.rot : Math.random() * Math.PI * 2, spin: o.spin || 0, stretch: o.stretch || 0,
      });
    }

    // ================= 물 =================
    /** 물보라: 물기둥이 솟고, 물방울이 꼬리를 끌며 튀고, 물결이 퍼져요 */
    splash(pos, o = {}) {
      const p = v3(pos), s = o.size || 1, R = o.ramp || RAMPS.water;
      this.crown(p, { size: s, color: R[1], color2: R[0] });
      for (let i = 0, n = this.n(22 * s); i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(0.8, 2.4) * s, up = rand(3, 5.5) * Math.sqrt(s);
        this.emit(p, { ox: Math.cos(a) * 0.2 * s, oz: Math.sin(a) * 0.2 * s, vel: { x: Math.cos(a) * sp, y: up, z: Math.sin(a) * sp }, gravity: 14, life: rand(0.6, 0.95), size: rand(0.07, 0.12) * s, stretch: 0.06, ramp: [R[0], R[1], R[1], R[2]], shape: 'drop', floor: p.y, dieOnFloor: true, fadeAt: 0.85 });
      }
      for (let i = 0, n = this.n(8 * s); i < n; i++) {
        this.emit(p, { vel: { x: rand(-0.3, 0.3), y: rand(5.5, 7.5) * Math.sqrt(s), z: rand(-0.3, 0.3) }, gravity: 14, life: rand(0.7, 0.9), size: rand(0.1, 0.16) * s, stretch: 0.05, ramp: [R[0], R[1]], shape: 'drop', floor: p.y, dieOnFloor: true });
      }
      this.ripple(p, { radius: 1.3 * s, count: 2, color: R[0] });
      for (let i = 0, n = this.n(6 * s); i < n; i++) {
        const a = Math.random() * Math.PI * 2, d = rand(0.2, 0.5) * s;
        this.emit(p, { ox: Math.cos(a) * d, oy: 0.02, oz: Math.sin(a) * d, vel: { x: Math.cos(a) * 0.4, y: 0, z: Math.sin(a) * 0.4 }, drag: 2, life: rand(0.8, 1.2), size: rand(0.18, 0.28) * s, size2: 0.05, ramp: RAMPS.foam, shape: 'circle', fadeAt: 0.3 });
      }
    }
    /** 물기둥(왕관 모양으로 솟았다 무너지는 물) — splash 가 써요 */
    crown(pos, o = {}) {
      const THREE = T(), p = v3(pos), s = (o.size || 1) * this.unit, seg = 18;
      const geo = new THREE.CylinderGeometry(0.35 * s, 0.25 * s, 0.6 * s, seg, 2, true);
      const pa = geo.attributes.position;
      for (let i = 0; i < pa.count; i++) if (pa.getY(i) > 0.29 * s) { const a = Math.atan2(pa.getZ(i), pa.getX(i)); pa.setY(i, pa.getY(i) + (Math.round(a / (Math.PI * 2 / seg)) % 2 ? 0.22 : -0.05) * s); pa.setX(i, pa.getX(i) * 1.35); pa.setZ(i, pa.getZ(i) * 1.35); }
      geo.translate(0, 0.3 * s, 0);
      const mat = toonSurfaceMaterial(o.color || 0xd8f4ff, { color2: o.color2 || 0xffffff });
      const m = new THREE.Mesh(geo, mat); m.position.set(p.x, p.y, p.z);
      this.addMesh(m, o.life || 0.55, 0, (u) => {
        const up = u < 0.35 ? ease.outBack(u / 0.35) : 1 - ease.inOut((u - 0.35) / 0.65) * 0.9;
        m.scale.set(1 + u * 1.2, Math.max(0.05, up), 1 + u * 1.2);
        mat.uniforms.uA.value = u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5;
      });
    }
    /** 물결: 수면에 또렷한 고리가 퍼져요 */
    ripple(pos, o = {}) {
      const p = v3(pos), count = o.count || 1;
      for (let i = 0; i < count; i++) this.ring(p, { color: o.color || 0xffffff, from: 0.15, to: (o.radius || 1) * (1 - i * 0.3), life: (o.life || 0.9) + i * 0.15, delay: i * 0.16, width: 0.07, alpha: 0.9 });
    }
    /** 거품: 계속 올라오는 물방울. 핸들의 stop()으로 멈춰요 */
    bubbles(pos, o = {}) {
      return this.source(pos, o.rate || 7, (p) => {
        this.emit(p, { ox: rand(-0.25, 0.25), oz: rand(-0.25, 0.25), vel: { x: 0, y: rand(0.6, 1.1), z: 0 }, wobble: 1.6, life: rand(1, 1.8), size: rand(0.08, 0.16), size2: 0.18, ramp: RAMPS.foam, shape: 'ring', pop: 0.15, fadeAt: 0.9 });
      }, o);
    }

    // ================= 반짝임 / 보상 =================
    /** 반짝이: 별이 터져 나와 깜빡이며 사라져요 */
    sparkle(pos, o = {}) {
      const p = v3(pos), R = o.ramp || RAMPS.gold, r = o.radius || 1;
      for (let i = 0, n = this.n(o.count || 18); i < n; i++) {
        const a = Math.random() * Math.PI * 2, e = rand(-0.4, 1), sp = rand(1.5, 3.5) * r;
        this.emit(p, { vel: { x: Math.cos(a) * Math.cos(e) * sp, y: Math.sin(e) * sp + 0.6, z: Math.sin(a) * Math.cos(e) * sp }, drag: 3.2, gravity: 0.5, life: rand(0.7, 1.2), size: rand(0.22, 0.42) * r, size2: 0.06, sizeEase: ease.out, ramp: R.slice(0, 3), shape: 'star', twinkle: 26, rainbow: !!o.rainbow, rot: 0, pop: 0.06 });
      }
      for (let i = 0, n = this.n((o.count || 18) * 0.6); i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(3, 6) * r;
        this.emit(p, { vel: { x: Math.cos(a) * sp, y: rand(-1, 3) * r, z: Math.sin(a) * sp }, drag: 5, life: rand(0.3, 0.5), size: 0.07 * r, stretch: 0.05, ramp: [R[0], R[1], R[2]], shape: 'spark', rainbow: !!o.rainbow });
      }
      this.flash(p, { color: R[1], size: 0.8 * r, life: 0.16 });
    }
    /** 등급 연출 0=동 1=은 2=금 3=무지개 */
    rarity(pos, grade = 0, o = {}) {
      const p = v3(pos), R = [RAMPS.bronze, RAMPS.silver, RAMPS.gold, RAMPS.gold][grade] || RAMPS.gold, rb = grade === 3;
      this.sparkle(p, { ramp: R, count: [10, 16, 24, 34][grade], radius: 0.8 + grade * 0.2, rainbow: rb });
      if (grade >= 1) this.ring(p, { color: R[1], to: 1.4 + grade * 0.5, life: 0.6, width: 0.1, rainbow: rb });
      const ground = o.ground != null ? o.ground : p.y - 1.7 * this.unit;
      if (grade >= 2) this.pillar({ x: p.x, y: ground, z: p.z }, { color: R[2], color2: R[1], height: 3 + grade, radius: 0.32 + grade * 0.05, life: 1.2 + grade * 0.3, rainbow: rb });
      if (grade >= 3) { this.confetti({ x: p.x, y: p.y + 0.6, z: p.z }, { count: 50 }); this.ring(p, { color: 0xffffff, to: 3.2, life: 0.9, width: 0.06, delay: 0.15, rainbow: true }); }
    }
    /** 동전: 튀어 올라 빙글빙글 돌며 바닥에 튕겨요 */
    coins(pos, o = {}) {
      const p = v3(pos), floor = o.floor != null ? o.floor : p.y;
      for (let i = 0, n = this.n(o.count || 12); i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(0.6, 1.8);
        this.emit(p, { vel: { x: Math.cos(a) * sp, y: rand(4, 6), z: Math.sin(a) * sp }, gravity: 14, floor, bounce: 0.45, life: rand(1.4, 1.9), size: 0.2, ramp: [0xffe066], shape: 'circle', twinkle: 18, fadeAt: 0.8 });
      }
      this.sparkle({ x: p.x, y: p.y + 0.3, z: p.z }, { ramp: RAMPS.gold, count: 8, radius: 0.6 });
    }
    /** 색종이: 위로 터진 뒤 팔랑팔랑 떨어져요 */
    confetti(pos, o = {}) {
      const p = v3(pos), cols = o.colors || [0xff4a5a, 0xff9a2a, 0xffe03c, 0x5ad84a, 0x3cc8ff, 0x7a6cff, 0xf53cd1];
      for (let i = 0, n = this.n(o.count || 60); i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(1, 3.5), c = cols[i % cols.length];
        this.emit(p, { vel: { x: Math.cos(a) * sp, y: rand(3, 6), z: Math.sin(a) * sp }, gravity: 5, drag: 1.8, wobble: 2.5, life: rand(2.2, 3.2), size: rand(0.12, 0.18), ramp: [c], shape: 'square', spin: rand(-8, 8), twinkle: 7, fadeAt: 0.75, floor: p.y - 3 });
      }
    }
    /** 레벨업: 빛기둥 + 고리 + 하트·별 + 글자 */
    levelUp(pos, o = {}) {
      const p = v3(pos), R = o.ramp || RAMPS.heal;
      this.pillar(p, { color: R[2], color2: R[1], height: 4, radius: 0.5, life: 1.6 });
      this.ring({ x: p.x, y: p.y + 0.05, z: p.z }, { color: R[1], to: 2.2, life: 0.7, width: 0.12 });
      this.sparkle({ x: p.x, y: p.y + 1.2, z: p.z }, { ramp: R, count: 22, radius: 1 });
      this.text({ x: p.x, y: p.y + 2.3, z: p.z }, o.label || 'LEVEL UP!', { color: o.textColor || '#eaffd0', size: 0.55, life: 1.8 });
      for (let i = 0, n = this.n(16); i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = rand(0.3, 0.8);
        this.emit(p, { ox: Math.cos(a) * r, oz: Math.sin(a) * r, vel: { x: 0, y: rand(1.4, 2.6), z: 0 }, life: rand(0.9, 1.4), size: 0.14, ramp: R.slice(1), shape: i % 3 ? 'square' : 'heart', rot: 0, delay: rand(0, 0.6) });
      }
    }
    /** 오라: 대상 주변에 빛 알갱이가 계속 올라가요 */
    aura(target, o = {}) {
      const R = o.ramp || RAMPS.magic, r = o.radius || 0.55;
      return this.source(target, o.rate || 14, (p) => {
        const a = Math.random() * Math.PI * 2;
        this.emit(p, { ox: Math.cos(a) * r, oy: rand(0, 0.4), oz: Math.sin(a) * r, vel: { x: 0, y: rand(0.7, 1.3), z: 0 }, life: rand(0.8, 1.2), size: rand(0.08, 0.13), ramp: R.slice(0, 3), shape: 'square', rot: Math.PI / 4, rainbow: !!o.rainbow, pop: 0.1 });
      }, o);
    }

    // ================= 전투 / 충격 =================
    /** 타격: 십자 섬광 + 꼬리 달린 불똥 */
    hit(pos, o = {}) {
      const p = v3(pos), R = o.ramp || RAMPS.ember;
      this.flash(p, { color: R[1], size: 0.9, life: 0.12 });
      for (let i = 0, n = this.n(12); i < n; i++) {
        const a = Math.random() * Math.PI * 2, e = rand(-0.3, 0.9), sp = rand(4, 8);
        this.emit(p, { vel: { x: Math.cos(a) * Math.cos(e) * sp, y: Math.sin(e) * sp, z: Math.sin(a) * Math.cos(e) * sp }, gravity: 10, drag: 3.5, life: rand(0.25, 0.45), size: rand(0.08, 0.12), stretch: 0.06, ramp: R, shape: 'spark' });
      }
      this.ring(p, { color: R[1], to: 0.7, life: 0.16, width: 0.22, flat: false });
    }
    /** 폭발: 섬광 → 단계 색 불덩이 → 굴러가는 연기, 충격파, 파편 */
    explosion(pos, o = {}) {
      const p = v3(pos), s = o.size || 1, floor = o.floor != null ? o.floor : p.y - 0.4 * s;
      this.flash(p, { color: 0xfff2c0, size: 2.2 * s, life: 0.15 });
      for (let i = 0, n = this.n(18 * s); i < n; i++) {
        const a = Math.random() * Math.PI * 2, e = rand(-0.1, 1.2), sp = rand(1.5, 3.5) * s;
        this.emit(p, { vel: { x: Math.cos(a) * Math.cos(e) * sp, y: Math.sin(e) * sp, z: Math.sin(a) * Math.cos(e) * sp }, drag: 3.5, gravity: -1, life: rand(0.55, 0.9), size: rand(0.45, 0.8) * s, size2: 0.9 * s, sizeEase: ease.outCubic, pop: 0.05, ramp: RAMPS.fire, shape: 'puff', fadeAt: 0.7 });
      }
      for (let i = 0, n = this.n(12 * s); i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(0.6, 1.6) * s;
        this.emit(p, { vel: { x: Math.cos(a) * sp, y: rand(1, 2), z: Math.sin(a) * sp }, drag: 1.4, life: rand(1.3, 2), delay: rand(0.15, 0.35), size: rand(0.5, 0.8) * s, size2: 1.2 * s, sizeEase: ease.out, pop: 0.1, ramp: RAMPS.dark.concat(RAMPS.smoke.slice(2)), shape: 'puff', fadeAt: 0.55 });
      }
      for (let i = 0, n = this.n(12 * s); i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(4, 8) * s;
        this.emit(p, { vel: { x: Math.cos(a) * sp, y: rand(3, 7), z: Math.sin(a) * sp }, gravity: 14, life: rand(0.5, 0.9), size: 0.09 * s, stretch: 0.05, ramp: RAMPS.ember, shape: 'spark' });
      }
      this.debris(p, { count: 8, floor, colors: [0x3a2a20, 0x5a4a3a] });
      this.ring({ x: p.x, y: floor + 0.05, z: p.z }, { color: 0xfff0c0, to: 3.5 * s, life: 0.45, width: 0.15 });
    }
    /** 펑: 만화 같은 연기 공이 퍼지고 별이 튀어요 (사라짐, 소환) */
    poof(pos, o = {}) {
      const p = v3(pos), s = o.size || 1;
      for (let i = 0, n = this.n(10 * s); i < n; i++) {
        const a = (i / 10) * Math.PI * 2, sp = rand(1.6, 2.4) * s;
        this.emit(p, { oy: 0.3 * s, vel: { x: Math.cos(a) * sp, y: rand(0, 1), z: Math.sin(a) * sp }, drag: 4.5, life: rand(0.55, 0.8), size: rand(0.35, 0.5) * s, size2: 0.15 * s, sizeEase: ease.inOut, pop: 0.06, ramp: [0xffffff, 0xeeeaf6, 0xd0cce0], shape: 'puff', fadeAt: 0.7 });
      }
      for (let i = 0; i < this.n(5); i++) {
        const a = Math.random() * Math.PI * 2;
        this.emit(p, { oy: 0.4 * s, vel: { x: Math.cos(a) * 2.5, y: rand(1.5, 3), z: Math.sin(a) * 2.5 }, drag: 2.5, gravity: 3, life: 0.6, size: 0.18 * s, ramp: [0xffe066], shape: 'star', rot: 0, spin: 6 });
      }
    }
    /** 먼지: 착지, 달리기, 나무 쓰러짐 */
    dust(pos, o = {}) {
      const p = v3(pos), s = o.size || 1;
      for (let i = 0, n = this.n(8 * s); i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(0.8, 1.6) * s;
        this.emit(p, { oy: 0.1, vel: { x: Math.cos(a) * sp, y: rand(0.2, 0.6), z: Math.sin(a) * sp }, drag: 3.5, life: rand(0.45, 0.7), size: rand(0.18, 0.3) * s, size2: 0.06, sizeEase: ease.inOut, ramp: o.ramp || RAMPS.dust, shape: 'puff', fadeAt: 0.6 });
      }
    }
    /** 파편: 나무 조각, 돌 조각, 흙덩이 (빙글빙글 돌며 튕김) */
    debris(pos, o = {}) {
      const p = v3(pos), cols = o.colors || RAMPS.wood;
      for (let i = 0, n = this.n(o.count || 10); i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(1, 3);
        this.emit(p, { vel: { x: Math.cos(a) * sp, y: rand(2.5, 5), z: Math.sin(a) * sp }, gravity: 16, life: rand(0.8, 1.2), size: rand(0.08, 0.14), ramp: [cols[i % cols.length]], shape: 'square', spin: rand(-12, 12), floor: o.floor != null ? o.floor : p.y, bounce: 0.35, fadeAt: 0.8 });
      }
    }
    /** 나뭇잎이 흔들리며 떨어져요 */
    leaves(pos, o = {}) {
      const p = v3(pos), cols = o.colors || RAMPS.leaf;
      for (let i = 0, n = this.n(o.count || 12); i < n; i++) {
        this.emit(p, { ox: rand(-1, 1), oy: rand(-0.3, 0.6), oz: rand(-1, 1), vel: { x: rand(-0.4, 0.4), y: rand(0, 0.6), z: rand(-0.4, 0.4) }, gravity: 1, drag: 1.6, wobble: 3.5, life: rand(1.8, 2.8), size: rand(0.1, 0.15), ramp: [cols[i % cols.length]], shape: 'drop', spin: rand(-5, 5), floor: o.floor != null ? o.floor : p.y - 3, fadeAt: 0.8 });
      }
    }

    // ================= 계속 나오는 것 (핸들) =================
    /** 불꽃: 아래는 하얗고 위로 갈수록 주황·빨강. 혀 모양 불길이 겹쳐 올라가요 */
    fire(pos, o = {}) {
      const s = o.size || 1;
      return this.source(pos, (o.rate || 70) * s, (p) => {
        const a = Math.random() * Math.PI * 2, d = Math.pow(Math.random(), 1.5) * 0.28 * s;
        const tall = 1 - d / (0.3 * s);
        this.emit(p, { ox: Math.cos(a) * d, oz: Math.sin(a) * d, vel: { x: -Math.cos(a) * d * 0.8, y: rand(1, 1.8) * s * (0.6 + tall * 0.6), z: -Math.sin(a) * d * 0.8 }, wobble: 0.6, life: rand(0.45, 0.7) * (0.7 + tall * 0.5), size: rand(0.38, 0.52) * s * (0.6 + tall * 0.5), size2: 0.04 * s, stretch: 0.1, ramp: tall > 0.55 ? RAMPS.fire : RAMPS.fire.slice(1), shape: 'drop', fadeAt: 0.8 });
        if (Math.random() < 0.12) this.emit(p, { vel: { x: rand(-0.5, 0.5), y: rand(2, 3.2), z: rand(-0.5, 0.5) }, wobble: 2.5, life: rand(0.7, 1.2), size: 0.05 * s, stretch: 0.04, ramp: RAMPS.ember, shape: 'spark' });
        if (Math.random() < 0.08) this.emit(p, { oy: 0.9 * s, vel: { x: rand(-0.2, 0.2), y: rand(0.6, 1), z: rand(-0.2, 0.2) }, life: rand(1.2, 1.8), size: 0.18 * s, size2: 0.5 * s, ramp: [0x5a524a, 0x7a7268, 0x9a948a], shape: 'puff', alpha: 0.8, fadeAt: 0.3 });
      }, o);
    }
    /** 연기 기둥 (굴뚝) — 둥근 연기 공이 커지며 흩어져요 */
    smoke(pos, o = {}) {
      const s = o.size || 1;
      return this.source(pos, (o.rate || 5) * s, (p) => {
        this.emit(p, { ox: rand(-0.08, 0.08), oz: rand(-0.08, 0.08), vel: { x: rand(-0.08, 0.08) + (o.wind || 0.15), y: rand(0.6, 0.9), z: rand(-0.08, 0.08) }, wobble: 0.3, life: rand(2.4, 3.2), size: 0.15 * s, size2: 0.6 * s, sizeEase: ease.out, ramp: o.ramp || [0xe8e4e0, 0xd0cac4, 0xb8b2ac], shape: 'puff', alpha: 0.95, fadeAt: 0.4 });
      }, o);
    }
    /** 꼬리: 움직이는 물체를 따라가는 빛 조각 */
    trail(object, o = {}) {
      const R = o.ramp || (o.color != null ? [0xffffff, o.color] : RAMPS.foam);
      return this.source(object, o.rate || 40, (p) => {
        this.emit(p, { ox: rand(-0.06, 0.06), oy: rand(-0.06, 0.06), oz: rand(-0.06, 0.06), life: o.life || 0.5, size: o.size || 0.16, size2: 0.02, ramp: R, shape: o.shape || 'circle', rainbow: !!o.rainbow, fadeAt: 0.4, glow: !!o.glow });
      }, o);
    }
    /** 소스: rate(초당 개수)로 spawn(pos)을 계속 불러요. target이 Object3D면 따라다녀요 */
    source(target, rate, spawn, o = {}) {
      const h = { target, rate: rate * this.quality, acc: 0, spawn, alive: true, offset: o.offset || { x: 0, y: 0, z: 0 }, life: o.duration || Infinity, age: 0, stop() { this.alive = false; }, _pos: new (T().Vector3)() };
      this.sources.push(h);
      return h;
    }

    // ================= 메시 이펙트 =================
    /** 고리(충격파). flat=false 면 카메라를 봐요 */
    ring(pos, o = {}) {
      const THREE = T(), p = v3(pos), w = o.width || 0.08;
      const mat = toonSurfaceMaterial(o.color || 0xffffff);
      const m = new THREE.Mesh(new THREE.RingGeometry(1 - w, 1, 40, 1), mat);
      m.position.set(p.x, p.y + 0.03, p.z);
      if (o.flat !== false) m.rotation.x = -Math.PI / 2;
      const U = this.unit, from = (o.from || 0.2) * U, to = (o.to || 2) * U, a0 = o.alpha == null ? 1 : o.alpha;
      this.addMesh(m, o.life || 0.6, o.delay || 0, (u, t) => {
        const k = from + (to - from) * ease.outCubic(u); m.scale.set(k, k, k);
        mat.uniforms.uA.value = a0 * (u < 0.4 ? 1 : 1 - (u - 0.4) / 0.6);
        if (o.rainbow) mat.uniforms.uCol.value.setHSL((t * 0.8) % 1, 0.9, 0.6);
        if (o.flat === false && this.camera) m.quaternion.copy(this.camera.quaternion);
      });
    }
    /** 빛기둥: 반투명 기둥 안으로 빛줄기가 솟아올라요 (희귀 아이템, 레벨업). pos 는 바닥 */
    pillar(pos, o = {}) {
      const THREE = T(), p = v3(pos), U = this.unit, h = (o.height || 4) * U, r = (o.radius || 0.5) * U;
      const c1 = o.color || 0xffd23a, c2 = o.color2 != null ? o.color2 : 0xfff6c0;
      const mat = toonSurfaceMaterial(c1, { color2: c2, fadeTop: true, rim: true });
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.2, h, 20, 1, true).translate(0, h / 2, 0), mat);
      m.position.set(p.x, p.y, p.z);
      let acc = 0;
      this.addMesh(m, o.life || 1.4, o.delay || 0, (u, t) => {
        const grow = ease.outBack(Math.min(1, u * 5)), fade = u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35;
        m.scale.set(grow * 0.8 + 0.2, Math.min(1, u * 6), grow * 0.8 + 0.2);
        mat.uniforms.uA.value = 0.95 * fade;
        if (o.rainbow) mat.uniforms.uCol.value.setHSL((t * 0.6) % 1, 0.85, 0.6);
        acc += (u < 0.75 ? 90 : 0) * this.quality / 60;
        while (acc >= 1) {
          acc -= 1;
          const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r * 0.9;
          this.emit(p, { ox: Math.cos(a) * d / U, oz: Math.sin(a) * d / U, oy: rand(0, 0.6), vel: { x: 0, y: rand(4, 8), z: 0 }, life: rand(0.35, 0.6), size: rand(0.05, 0.09), stretch: 0.09, ramp: [0xffffff, c2, c1], shape: 'spark', rainbow: !!o.rainbow, fadeAt: 0.5 });
        }
      });
      this.ring({ x: p.x, y: p.y, z: p.z }, { color: c2, from: r / U, to: r / U * 2.6, life: 0.8, width: 0.16, delay: o.delay || 0, rainbow: !!o.rainbow });
    }
    /** 섬광: 순간적으로 번쩍 (star:true 면 십자 모양) */
    flash(pos, o = {}) {
      const p = v3(pos), size = o.size || 1;
      this.emit(p, { life: o.life || 0.14, size: size, size2: size * 0.2, sizeEase: ease.out, ramp: [0xffffff, o.color || 0xffffff], shape: 'star', rot: Math.random() < 0.5 ? 0 : Math.PI / 4, fadeAt: 0.5 });
      this.emit(p, { life: (o.life || 0.14) * 0.7, size: size * 0.35, size2: size * 0.1, ramp: [0xffffff], shape: 'circle', fadeAt: 0.5 });
    }
    /** 떠오르는 글자 (데미지, +골드). 통 튀어나왔다가 떠오르며 사라져요 */
    text(pos, str, o = {}) {
      const THREE = T(), p = v3(pos);
      const fs = 72, font = `900 ${fs}px ${o.font || 'system-ui, -apple-system, sans-serif'}`;
      const m0 = document.createElement('canvas').getContext('2d'); m0.font = font;
      const w = Math.ceil(m0.measureText(str).width) + 28, h = fs + 28;
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.lineWidth = 14; g.strokeStyle = o.outline || '#2a1408'; g.strokeText(str, w / 2, h / 2 + 4);
      g.fillStyle = o.shadow || 'rgba(0,0,0,0.35)'; g.fillText(str, w / 2 + 3, h / 2 + 7);
      g.fillStyle = o.color || '#ffffff'; g.fillText(str, w / 2, h / 2 + 2);
      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
      const s = new THREE.Sprite(mat); s.renderOrder = 20;
      const H = (o.size || 0.5) * this.unit, W = H * (w / h), rise = (o.rise == null ? 0.9 : o.rise) * this.unit;
      s.position.set(p.x, p.y, p.z);
      this.addMesh(s, o.life || 1.2, o.delay || 0, (u) => {
        const pop = u < 0.12 ? ease.outBack(u / 0.12) : 1;
        s.scale.set(W * pop, H * pop, 1);
        s.position.y = p.y + rise * ease.outCubic(u);
        mat.opacity = u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1;
      }, () => tex.dispose());
    }
    addMesh(obj, life, delay, tick, onEnd) {
      obj.visible = !(delay > 0);
      this.root.add(obj);
      this.meshes.push({ obj, life, delay, age: 0, tick, onEnd });
    }

    // ================= pixelfx 연결 =================
    /** pixelfx 이펙트를 카메라를 보는 판으로 3D 공간에 띄워요 (PIXELFX 번들 필요) */
    pixel(pos, name, opts = {}, o = {}) {
      const THREE = T(), PX = pixelfxLib();
      if (!PX || !PX.fx[name]) { console.warn('FX3D.pixel: PIXELFX 번들 또는 이펙트가 없어요', name); return null; }
      const mod = PX.fx[name], [w, h] = mod.meta.size, [ox, oy] = mod.meta.origin;
      const frame = PX.core.createFrame(w, h, -ox, -oy);
      const fx = PX.core.createFx(mod, Object.assign({ x: 0, y: 0, seed: (Math.random() * 9999) | 0 }, opts));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'), img = g.createImageData(w, h);
      const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      const s = new THREE.Sprite(mat);
      const px = (o.pixel || 0.03) * this.unit;
      s.scale.set(w * px, h * px, 1); s.center.set(ox / w, 1 - oy / h);
      const p = v3(pos); s.position.set(p.x, p.y, p.z); s.renderOrder = 6;
      this.root.add(s);
      const e = { s, fx, frame, g, img, tex, mat, life: o.life || Infinity, age: 0, stop() { fx.stop(); } };
      this.pixels.push(e);
      return e;
    }

    // ================= 매 프레임 =================
    update(dt, camera) {
      if (camera) this.camera = camera;
      dt = Math.min(dt, 0.1); this.t += dt;
      for (let i = this.sources.length - 1; i >= 0; i--) {
        const h = this.sources[i]; h.age += dt;
        if (!h.alive || h.age > h.life || (h.target && h.target.isObject3D && h.target.parent === null)) { this.sources.splice(i, 1); continue; }
        if (h.target && h.target.isObject3D) h.target.getWorldPosition(h._pos); else h._pos.set(h.target.x || 0, h.target.y || 0, h.target.z || 0);
        h._pos.x += h.offset.x; h._pos.y += h.offset.y; h._pos.z += h.offset.z;
        h.acc += h.rate * dt;
        while (h.acc >= 1) { h.acc -= 1; h.spawn(h._pos); }
      }
      for (let i = this.meshes.length - 1; i >= 0; i--) {
        const m = this.meshes[i];
        if (m.delay > 0) { m.delay -= dt; if (m.delay > 0) continue; m.obj.visible = true; }
        m.age += dt;
        const u = Math.min(1, m.age / m.life);
        m.tick(u, this.t);
        if (u >= 1) {
          this.root.remove(m.obj);
          m.obj.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
          if (m.onEnd) m.onEnd();
          this.meshes.splice(i, 1);
        }
      }
      if (this.pixels.length) {
        const K = pixelfxLib().core;
        for (let i = this.pixels.length - 1; i >= 0; i--) {
          const e = this.pixels[i];
          e.age += dt; e.fx.update(dt);
          if (e.age > e.life) e.fx.stop();
          if (e.fx.done()) { this.root.remove(e.s); e.tex.dispose(); e.mat.dispose(); this.pixels.splice(i, 1); continue; }
          K.clearFrame(e.frame); e.fx.draw(e.frame); K.composite(e.frame, e.img.data, null); e.g.putImageData(e.img, 0, 0); e.tex.needsUpdate = true;
        }
      }
      for (const k in this.batches) this.batches[k].update(dt, this.t);
    }
    count() { let n = 0; for (const k in this.batches) n += this.batches[k].ps.length; return n; }
    clear() {
      for (const k in this.batches) this.batches[k].ps.length = 0;
      for (const m of this.meshes) this.root.remove(m.obj);
      this.meshes.length = 0; this.sources.length = 0;
      for (const e of this.pixels) this.root.remove(e.s);
      this.pixels.length = 0;
    }
    dispose() {
      this.clear();
      for (const k in this.batches) this.batches[k].dispose();
      this.batches = {};
      this.root.parent && this.root.parent.remove(this.root);
    }
  }
  FX3D.ease = ease; FX3D.RAMPS = RAMPS; FX3D.SHAPES = Object.keys(SHAPE);
  root.FX3D = FX3D;
  if (typeof module !== 'undefined' && module.exports) module.exports = FX3D;
})(typeof window !== 'undefined' ? window : globalThis);
