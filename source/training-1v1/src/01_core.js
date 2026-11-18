'use strict';
const GAME_BUILD = 29; // 게임 버전 번호 (올릴 때마다 1씩 올려요)
// ================= 기본 도구 =================
const V3 = THREE.Vector3;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3();

const SETTINGS = {
  sens: 1.0, adsSens: 0.8, fov: 75, difficulty: 1, armor: 2, volume: 0.8,
  aimMode: 'pubg', crouchMode: 'toggle', leanMode: 'hold', sprintMode: 'hold', nick: '', quality: 'mid',
};
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem('tg1v1_settings') || '{}')); } catch (e) {}
function saveSettings() { try { localStorage.setItem('tg1v1_settings', JSON.stringify(SETTINGS)); } catch (e) {} }

// ================= 렌더러 =================
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaec4d6);
scene.fog = new THREE.Fog(0xb7c6d2, 90, 420);
const camera = new THREE.PerspectiveCamera(SETTINGS.fov, innerWidth / innerHeight, 0.05, 2000);
const NICK = () => (SETTINGS.nick || '').trim() || '나';
scene.add(camera);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});

// 빛
const hemi = new THREE.HemisphereLight(0xd8e6f5, 0x6f604c, 0.55);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.1);
sun.position.set(-60, 95, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
const SC = sun.shadow.camera; SC.left = -70; SC.right = 70; SC.top = 70; SC.bottom = -70; SC.near = 10; SC.far = 260;
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
scene.add(sun); scene.add(sun.target);
const amb = new THREE.AmbientLight(0x9aa8b8, 0.12); scene.add(amb);
// 그래픽 품질: 높음 / 보통 /낮음 (낮을수록 빨라요)
let SHADOW_HALF = 70;
function applyQuality() {
  const q = SETTINGS.quality || 'mid';
  renderer.setPixelRatio(q === 'high' ? Math.min(window.devicePixelRatio || 1, 1.5) : q === 'mid' ? 1 : 0.75);
  renderer.setSize(innerWidth, innerHeight);
  const want = q === 'low' ? 0 : q === 'mid' ? 2048 : 4096;
  if (!want) { sun.castShadow = false; }
  else {
    sun.castShadow = true;
    if (sun.shadow.mapSize.x !== want) { sun.shadow.mapSize.set(want, want); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  }
}
function setShadowArea(half) { // 맵 크기에 맞춰 그림자 범위를 줄이면 그림자가 더 선명하고 빨라요
  SHADOW_HALF = half; SC.left = -half; SC.right = half; SC.top = half; SC.bottom = -half; SC.updateProjectionMatrix();
}
const ENV = null;

// 하늘
(function sky() {
  const geo = new THREE.SphereGeometry(1500, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: sun.position.clone().normalize() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec3 vP; uniform vec3 sunDir;
      void main(){ float h = vP.y;
        vec3 top = vec3(0.36,0.55,0.80), mid = vec3(0.70,0.80,0.89), hor = vec3(0.86,0.88,0.87);
        vec3 c = mix(hor, mid, smoothstep(0.0,0.18,h)); c = mix(c, top, smoothstep(0.18,0.75,h));
        if (h < 0.0) c = mix(hor, vec3(0.62,0.62,0.58), smoothstep(0.0,-0.2,h));
        float s = max(dot(normalize(vP), sunDir), 0.0);
        c += vec3(1.0,0.9,0.7) * (pow(s, 900.0)*3.0 + pow(s, 12.0)*0.18);
        gl_FragColor = vec4(c,1.0); }`,
  });
  const m = new THREE.Mesh(geo, mat); m.renderOrder = -10; m.frustumCulled = false;
  scene.add(m);
  // 구름 (평면 위 얇은 덩어리)
  const cmat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, fog: false, depthWrite: false });
  for (let i = 0; i < 26; i++) {
    const g = new THREE.Group();
    const a = Math.random() * Math.PI * 2, r = rand(300, 900);
    for (let k = 0; k < 5; k++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(rand(25, 55), 10, 6), cmat);
      s.scale.y = 0.28; s.position.set(rand(-60, 60), rand(-4, 4), rand(-30, 30)); g.add(s);
    }
    g.position.set(Math.cos(a) * r, rand(170, 260), Math.sin(a) * r);
    scene.add(g);
  }
})();

// ================= 텍스처 =================
const MAXANI = renderer.capabilities.getMaxAnisotropy();
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = MAXANI;
  if (srgb) t.encoding = THREE.sRGBEncoding;
  return t;
}
function noiseFill(g, w, h, base, amt, scale = 1) {
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    d[i] = clamp(d[i] + n, 0, 255); d[i + 1] = clamp(d[i + 1] + n, 0, 255); d[i + 2] = clamp(d[i + 2] + n, 0, 255);
  }
  g.putImageData(img, 0, 0);
}
function blotches(g, w, h, n, color, rmin, rmax, alpha) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = rand(rmin, rmax);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color.replace('A', alpha)); gr.addColorStop(1, color.replace('A', 0));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
const TEX = {};
TEX.concrete = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#a7a59f'; g.fillRect(0, 0, w, h);
  blotches(g, w, h, 60, 'rgba(90,88,82,A)', 20, 90, 0.18);
  blotches(g, w, h, 40, 'rgba(200,198,190,A)', 20, 70, 0.15);
  noiseFill(g, w, h, 0, 26);
  g.strokeStyle = 'rgba(60,60,58,0.35)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, h - 2); g.lineTo(w, h - 2); g.moveTo(w - 2, 0); g.lineTo(w - 2, h); g.stroke();
  for (let i = 0; i < 6; i++) { // 작은 금
    g.strokeStyle = 'rgba(50,50,48,0.25)'; g.lineWidth = 1; g.beginPath();
    let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += rand(-18, 18); y += rand(-18, 18); g.lineTo(x, y); } g.stroke();
  }
});
TEX.container = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#dcdcdc'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 16) { // 골판 주름
    const gr = g.createLinearGradient(x, 0, x + 16, 0);
    gr.addColorStop(0, '#9c9c9c'); gr.addColorStop(0.25, '#f2f2f2'); gr.addColorStop(0.55, '#d6d6d6'); gr.addColorStop(0.8, '#a8a8a8'); gr.addColorStop(1, '#9c9c9c');
    g.fillStyle = gr; g.fillRect(x, 0, 16, h);
  }
  blotches(g, w, h, 18, 'rgba(110,60,30,A)', 6, 30, 0.35); // 녹
  noiseFill(g, w, h, 0, 18);
});
TEX.wood = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#9b7444'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) {
    g.fillStyle = `rgb(${140 + rand(-15, 15)},${102 + rand(-12, 12)},${58 + rand(-10, 10)})`; g.fillRect(0, y + 1, w, 30);
    for (let k = 0; k < 14; k++) { g.strokeStyle = 'rgba(70,45,20,0.25)'; g.beginPath(); const yy = y + rand(3, 29); g.moveTo(0, yy); g.bezierCurveTo(w * 0.3, yy + rand(-3, 3), w * 0.6, yy + rand(-3, 3), w, yy + rand(-2, 2)); g.stroke(); }
    g.fillStyle = 'rgba(40,25,10,0.7)'; g.fillRect(0, y, w, 2);
  }
  g.strokeStyle = '#5b3d1c'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
  g.lineWidth = 12; g.beginPath(); g.moveTo(10, 10); g.lineTo(w - 10, h - 10); g.stroke();
  noiseFill(g, w, h, 0, 20);
});
TEX.ground = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#8f8a78'; g.fillRect(0, 0, w, h);
  blotches(g, w, h, 160, 'rgba(110,100,78,A)', 20, 120, 0.25);
  blotches(g, w, h, 120, 'rgba(170,165,145,A)', 10, 80, 0.2);
  blotches(g, w, h, 50, 'rgba(95,105,70,A)', 10, 60, 0.18);
  noiseFill(g, w, h, 0, 30);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${rand(60, 200)},${rand(60, 190)},${rand(50, 170)},0.5)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
});
TEX.sandbag = canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = '#857655'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 4; r++) for (let c = -1; c < 5; c++) {
    const x = c * 64 + (r % 2) * 32, y = r * 32;
    const gr = g.createRadialGradient(x + 32, y + 14, 4, x + 32, y + 16, 36);
    gr.addColorStop(0, '#b5a47c'); gr.addColorStop(0.7, '#8f7f5c'); gr.addColorStop(1, '#4e4532');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x + 32, y + 16, 31, 15, 0, 0, Math.PI * 2); g.fill();
  }
  noiseFill(g, w, h, 0, 26);
});
TEX.metal = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#6f7277'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) {
    g.save(); g.translate(x + 8 + ((y / 16) % 2) * 0, y + 8); g.rotate(((x + y) / 16) % 2 ? 0.7 : -0.7);
    g.fillStyle = '#8d9096'; g.fillRect(-6, -1.5, 12, 3); g.restore();
  }
  noiseFill(g, w, h, 0, 16);
});
TEX.brick = canvasTex(256, 256, (g, w, h) => { // 붉은 벽돌 (1:1 대결 맵)
  g.fillStyle = '#5a4a40'; g.fillRect(0, 0, w, h);
  const bh = 32, bw = 64;
  for (let r = 0; r < h / bh; r++) for (let c = -1; c < w / bw + 1; c++) {
    const x = c * bw + (r % 2) * bw / 2, y = r * bh;
    g.fillStyle = `rgb(${150 + rand(-22, 18)},${70 + rand(-14, 12)},${52 + rand(-10, 10)})`; g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
  }
  blotches(g, w, h, 14, 'rgba(40,30,25,A)', 10, 50, 0.25);
  noiseFill(g, w, h, 0, 22);
});
TEX.asphalt = canvasTex(512, 512, (g, w, h) => { // 아스팔트 바닥
  g.fillStyle = '#4b4c4e'; g.fillRect(0, 0, w, h);
  blotches(g, w, h, 70, 'rgba(30,30,32,A)', 15, 80, 0.25);
  blotches(g, w, h, 40, 'rgba(120,118,112,A)', 10, 50, 0.12);
  noiseFill(g, w, h, 0, 34);
  for (let i = 0; i < 5; i++) { g.strokeStyle = 'rgba(20,20,22,0.5)'; g.lineWidth = 2; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += rand(-25, 25); y += rand(-25, 25); g.lineTo(x, y); } g.stroke(); }
});
TEX.lines = canvasTex(512, 512, (g, w, h) => { // 바닥 페인트 선
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(235,225,180,0.85)'; g.fillRect(0, 0, w, h);
  noiseFill(g, w, h, 0, 40);
  for (let i = 0; i < 80; i++) { g.clearRect(Math.random() * w, Math.random() * h, rand(4, 30), rand(2, 10)); }
});
TEX.decal = canvasTex(64, 64, (g, w, h) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  gr.addColorStop(0, 'rgba(10,10,10,1)'); gr.addColorStop(0.25, 'rgba(25,22,20,0.95)'); gr.addColorStop(0.45, 'rgba(60,55,50,0.5)'); gr.addColorStop(1, 'rgba(60,55,50,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
TEX.flash = canvasTex(128, 128, (g, w, h) => {
  g.translate(64, 64);
  for (let i = 0; i < 7; i++) {
    g.rotate(Math.PI * 2 / 7 + rand(-0.2, 0.2));
    const gr = g.createLinearGradient(0, 0, 60, 0); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(1, 'rgba(255,150,40,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -6); g.lineTo(rand(40, 62), 0); g.lineTo(0, 6); g.fill();
  }
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 26); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(1, 'rgba(255,180,60,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 26, 0, Math.PI * 2); g.fill();
});
TEX.smokeBig = canvasTex(128, 128, (g, w, h) => { // 더 진한 연막 덩어리 (판 수를 줄여도 꽉 차 보이게)
  for (let i = 0; i < 22; i++) {
    const x = rand(30, 98), y = rand(30, 98), r = rand(22, 40);
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.65)'); gr.addColorStop(0.6, 'rgba(240,240,240,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
});
TEX.smoke = canvasTex(128, 128, (g, w, h) => {
  for (let i = 0; i < 14; i++) {
    const x = rand(36, 92), y = rand(36, 92), r = rand(18, 36);
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
});

// UV 를 실제 크기에 맞춘 상자 (텍스처가 늘어나지 않게)
function boxGeo(w, h, d, texScale) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (texScale) {
    const uv = geo.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
      const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / texScale, uv.getY(i) * dims[f][1] / texScale);
    }
    uv.needsUpdate = true;
  }
  return geo;
}

const MAT = {
  concrete: new THREE.MeshStandardMaterial({ map: TEX.concrete, color: 0xd8d5ce, roughness: 0.92, metalness: 0.0 }),
  concreteDark: new THREE.MeshStandardMaterial({ map: TEX.concrete, color: 0x8c8a84, roughness: 0.95 }),
  wood: new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.85 }),
  sandbag: new THREE.MeshStandardMaterial({ map: TEX.sandbag, roughness: 1.0 }),
  metal: new THREE.MeshStandardMaterial({ map: TEX.metal, roughness: 0.55, metalness: 0.6 }),
  ground: new THREE.MeshStandardMaterial({ map: TEX.ground, color: 0xb0ab9c, roughness: 1.0 }),
  cont: [0xa83a2c, 0x2c5e8a, 0x3f6f3a, 0xc27a1f, 0x6d6f73, 0x8a2f55].map(c => new THREE.MeshStandardMaterial({ map: TEX.container, color: c, roughness: 0.6, metalness: 0.35 })),
  dark: new THREE.MeshStandardMaterial({ color: 0x2a2c2f, roughness: 0.7, metalness: 0.3 }),
  brick: new THREE.MeshStandardMaterial({ map: TEX.brick, roughness: 0.95 }),
  asphalt: new THREE.MeshStandardMaterial({ map: TEX.asphalt, roughness: 0.97 }),
  car: [0x8e2a24, 0x2b4f7a, 0xc9c4b8, 0x3d5a3a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.5 })),
  glass: new THREE.MeshStandardMaterial({ color: 0x1c2630, roughness: 0.15, metalness: 0.8 }),
  barrel: new THREE.MeshStandardMaterial({ color: 0x2f5d8a, roughness: 0.6, metalness: 0.4 }),
};

// ================= 소리 (WebAudio 합성) =================
const AU = (() => {
  let ctx = null, master = null, noiseBuf = null, grit = null, gritBus = null, lastTail = 0, muffle = null, postBus = null, ringG = null;
  const voiceEnds = [];
  function voices(t) { while (voiceEnds.length && voiceEnds[0] < t) voiceEnds.shift(); return voiceEnds.length; }
  function addVoice(end, n) { for (let i = 0; i < n; i++) voiceEnds.push(end); voiceEnds.sort((a, b) => a - b); }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = SETTINGS.volume * 1.2; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6; comp.knee.value = 10; comp.attack.value = 0.003; comp.release.value = 0.2;
    grit = ctx.createWaveShaper(); const cv = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; cv[i] = Math.tanh(x * 3.2); } grit.curve = cv; grit.oversample = '2x';
    // 마지막 안전장치: 소리가 아무리 겹쳐도 찢어지지 않게 막는 리미터
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1;
    // 이명용 먹먹함 필터: 평소엔 다 통과, 폭발·섬광 맞으면 잠깐 소리가 뭉개져요
    muffle = ctx.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 20000; muffle.Q.value = 0.7;
    master.disconnect(); master.connect(muffle); muffle.connect(comp); comp.connect(lim); lim.connect(ctx.destination); postBus = comp;
    // 묵직한 쿵 소리용 공용 일그러뜨리기 통로 (총 쏠 때마다 새로 만들지 않음)
    gritBus = ctx.createGain(); gritBus.gain.value = 0.8; gritBus.connect(grit); grit.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    try { buildGunSounds(); } catch (e) {}
  }
  function setVol(v) { if (master) master.gain.value = v * 1.2; }
  // 소리 위치 → 음량, 좌우, 먹먹함
  const sA = new V3(), sB = new V3();
  function spatial(pos) {
    if (!pos) return { vol: 1, pan: 0, lp: 20000, dist: 0 };
    const d = camera.position.distanceTo(pos);
    sA.copy(pos).sub(camera.position); sA.y = 0;
    const right = sB.set(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
    const pan = sA.lengthSq() > 0.01 ? clamp(sA.normalize().dot(right), -1, 1) * 0.85 : 0;
    return { vol: 1 / (1 + d / 14), pan, lp: clamp(18000 / (1 + d / 25), 900, 18000), dist: d };
  }
  function chain(s, extra) { // gain → filter → pan → master
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = s.lp;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    g.connect(f); if (p) { p.pan.value = s.pan; f.connect(p); p.connect(master); } else f.connect(master);
    return g;
  }
  function noise(out, t, dur, type, freq, q, vol, attack = 0.002) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = rand(0.9, 1.1);
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out); src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
    return f;
  }
  function tone(out, t, dur, f0, f1, vol, type = 'sine') {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  const P = { // 총 종류별 소리 성격 (crack 날카로움, body 몸통, boom 쿵, sub 저음, tail 울림)
    AR: { body: 1300, len: 0.34, boom: 95, bLen: 0.26, sub: 0, tail: 0.9, vol: 1.3 },
    SMG: { body: 1800, len: 0.22, boom: 120, bLen: 0.16, sub: 0, tail: 0.6, vol: 1.05 },
    DMR: { body: 1000, len: 0.5, boom: 75, bLen: 0.42, sub: 0.5, tail: 1.4, vol: 1.5 },
    SR: { body: 760, len: 0.85, boom: 58, bLen: 0.75, sub: 1, tail: 2.6, vol: 1.85 },
    SG: { body: 650, len: 0.6, boom: 60, bLen: 0.5, sub: 0.7, tail: 1.3, vol: 1.6 },
    LMG: { body: 1150, len: 0.36, boom: 85, bLen: 0.3, sub: 0.2, tail: 1.0, vol: 1.35 },
    HG: { body: 1600, len: 0.24, boom: 110, bLen: 0.18, sub: 0, tail: 0.6, vol: 1.05 },
  };
  // ---- 총소리 샘플 미리 만들기 (한 번만 계산 → 쏠 때는 재생만 해서 가볍고 풍성하게) ----
  const BUF = {};
  function biq(x, type, f, q, sr) { // RBJ 바이쿼드 필터 (배열 직접 처리)
    const w = 2 * Math.PI * f / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2, a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
    if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
    else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }
    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) { const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y; }
    return x;
  }
  const nz = (n) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1; return a; };
  const SND = { // crack 날카로움, body 폭발음 대역, boom 쿵 높이, punch 몸통 길이, sub 저음, tail 메아리 길이, mech 쇳소리
    AR: { crack: 1.0, body: 1500, boom: 105, punch: 0.07, sub: 0.25, tail: 1.3, mech: 0.35, drive: 2.6 },
    SMG: { crack: 0.9, body: 2100, boom: 135, punch: 0.045, sub: 0, tail: 0.9, mech: 0.45, drive: 2.2 },
    DMR: { crack: 1.15, body: 1200, boom: 85, punch: 0.1, sub: 0.6, tail: 1.9, mech: 0.3, drive: 3.0 },
    SR: { crack: 1.35, body: 950, boom: 62, punch: 0.16, sub: 1.0, tail: 3.0, mech: 0.0, drive: 3.4 },
    SG: { crack: 0.8, body: 800, boom: 70, punch: 0.14, sub: 0.85, tail: 1.8, mech: 0.25, drive: 3.2 },
    LMG: { crack: 1.05, body: 1350, boom: 95, punch: 0.08, sub: 0.4, tail: 1.5, mech: 0.4, drive: 2.8 },
    HG: { crack: 0.85, body: 1900, boom: 125, punch: 0.05, sub: 0.1, tail: 1.0, mech: 0.3, drive: 2.2 },
  };
  // 총마다 다른 소리 (배그 느낌 기준): 5.56mm는 날카롭고 가볍게, 7.62mm는 낮고 묵직하게,
  // 9mm 기관단총은 가볍고 빠르게, .45는 둔하게, 저격총은 크게 '쾅' + 긴 메아리, 산탄총은 넓게 '퍽'
  const SND_W = {
    m416: { crack: 1.0, body: 1700, boom: 115, punch: 0.06, sub: 0.15 }, scar: { crack: 0.85, body: 1500, boom: 108, punch: 0.065, sub: 0.15, tail: 1.1, vol: 0.85 },
    aug: { crack: 1.05, body: 1750, boom: 118, punch: 0.06, sub: 0.15 }, g36c: { body: 1650, boom: 112, punch: 0.06, sub: 0.15 }, qbz: { body: 1600, boom: 110, punch: 0.062, sub: 0.15 },
    m16: { crack: 1.1, body: 1850, boom: 122, punch: 0.055, sub: 0.12 }, famas: { crack: 1.0, body: 1950, boom: 126, punch: 0.05, sub: 0.1 },
    akm: { crack: 1.1, body: 1150, boom: 86, punch: 0.088, sub: 0.5, drive: 3.0, vol: 1.08 }, beryl: { crack: 1.1, body: 1200, boom: 90, punch: 0.082, sub: 0.45, drive: 3.0, vol: 1.05 },
    groza: { body: 1250, boom: 94, punch: 0.075, sub: 0.38 }, mk47: { crack: 1.2, body: 1100, boom: 84, punch: 0.09, sub: 0.5, vol: 1.08 }, ace32: { body: 1180, boom: 90, punch: 0.08, sub: 0.42 },
    ump: { crack: 0.55, body: 1300, boom: 100, punch: 0.06, sub: 0.2 }, tommy: { crack: 0.5, body: 1150, boom: 90, punch: 0.07, sub: 0.28 },
    vector: { crack: 0.7, body: 2300, boom: 150, punch: 0.04, vol: 0.9 }, uzi: { crack: 0.6, body: 2450, boom: 160, punch: 0.035, vol: 0.85 }, mp5k: { body: 2100, boom: 140, punch: 0.042 },
    bizon: { body: 2000, boom: 135, punch: 0.045, vol: 0.85 }, p90: { crack: 1.0, body: 2500, boom: 150, punch: 0.04 }, js9: { body: 2150, boom: 140, punch: 0.042 },
    sks: { crack: 1.2, body: 1150, boom: 80, punch: 0.1, sub: 0.6 }, slr: { crack: 1.25, body: 1050, boom: 76, punch: 0.11, sub: 0.7 }, mk14: { crack: 1.3, body: 1050, boom: 74, punch: 0.11, sub: 0.72 },
    dragunov: { crack: 1.3, body: 1000, boom: 72, punch: 0.12, sub: 0.75 }, mini14: { crack: 1.25, body: 1600, boom: 105, punch: 0.07, sub: 0.62, tail: 1.6 }, qbu: { crack: 1.2, body: 1550, boom: 100, punch: 0.072, sub: 0.62 },
    mk12: { crack: 1.25, body: 1500, boom: 98, punch: 0.075, sub: 0.62 },
    kar98k: { crack: 1.35, body: 950, boom: 62, punch: 0.16, sub: 1.0, tail: 3.0 }, mosin: { crack: 1.3, body: 900, boom: 60, punch: 0.17, sub: 1.05, tail: 3.0 },
    m24: { crack: 1.45, body: 1100, boom: 66, punch: 0.14, sub: 0.9, tail: 2.9 }, awm: { crack: 1.6, body: 850, boom: 52, punch: 0.2, sub: 1.3, tail: 3.4, drive: 3.8, vol: 1.12 },
    lynx: { crack: 1.7, body: 700, boom: 45, punch: 0.25, sub: 1.6, tail: 3.6, drive: 4.0, vol: 1.2 }, win94: { crack: 0.8, body: 1000, boom: 76, punch: 0.12, sub: 0.7, tail: 2.2 },
    s686: { body: 750, boom: 62, punch: 0.16, sub: 0.95 }, s1897: { body: 700, boom: 58, punch: 0.17, sub: 0.95 }, s12k: { body: 850, boom: 68, punch: 0.13, sub: 0.8 },
    dbs: { body: 780, boom: 64, punch: 0.15, sub: 0.9 }, o12: { body: 900, boom: 70, punch: 0.13, sub: 0.8 }, sawed: { body: 650, boom: 55, punch: 0.18, sub: 1.0, vol: 1.08 },
    m249: { body: 1600, boom: 110, punch: 0.065, sub: 0.25 }, dp28: { crack: 1.1, body: 1050, boom: 82, punch: 0.09, sub: 0.55 }, mg3: { crack: 1.15, body: 1250, boom: 90, punch: 0.07, sub: 0.45 },
    p92: { crack: 0.75, body: 2000, boom: 140, punch: 0.045 }, p18c: { crack: 0.7, body: 2200, boom: 150, punch: 0.04, vol: 0.9 }, p1911: { crack: 0.6, body: 1500, boom: 110, punch: 0.06, sub: 0.2 },
    r45: { crack: 0.7, body: 1300, boom: 100, punch: 0.07, sub: 0.3 }, r1895: { crack: 0.8, body: 1200, boom: 95, punch: 0.075, sub: 0.35 },
    deagle: { crack: 1.1, body: 1000, boom: 80, punch: 0.1, sub: 0.6, tail: 1.6, vol: 1.1 }, skorpion: { crack: 0.6, body: 2400, boom: 160, punch: 0.035, vol: 0.85 },
  };
  const _pending = {};
  function prepGun(id, cat) { // 이 총 소리를 미리 만들어 둬요 (처음 쏠 때 멈추지 않게 조금 뒤에)
    if (!ctx || !SND_W[id] || BUF[id] || _pending[id] || !SND[cat]) return;
    _pending[id] = 1;
    setTimeout(() => { try { const p = Object.assign({}, SND[cat], SND_W[id]); const a = makeGunSound(p, false); BUF[id] = [a, { dry: makeGunSound(p, false, true).dry, tail: a.tail }]; } catch (e) {} }, 30 + Math.random() * 200);
  }
  function makeGunSound(p, suppressed, noTail) {
    const sr = ctx.sampleRate, n = Math.floor(sr * 0.45), x = new Float32Array(n);
    const ex = (t, tau) => Math.exp(-t / tau);
    if (!suppressed) {
      // 1) 날카로운 '딱' (초음속 크랙 + 화약 터지는 앞소리)
      const c = biq(nz(n), 'hp', 1800, 0.7, sr);
      for (let i = 0; i < n; i++) { const t = i / sr; x[i] += c[i] * ex(t, 0.0045 + p.crack * 0.002) * 1.3 * p.crack; }
      // 2) '쾅' 몸통: 대역이 넓은 폭발 소리 (짧게 커졌다 줄어듦)
      const b = biq(biq(nz(n), 'lp', p.body, 0.9, sr), 'hp', 90, 0.7, sr);
      for (let i = 0; i < n; i++) { const t = i / sr; x[i] += b[i] * Math.min(1, t / 0.0006) * ex(t, p.punch * 0.55) * 1.6; }
      // 3) 공명 '웅' (총열·공기 울림)
      const r = biq(nz(n), 'bp', p.boom * 3.2, 2.2, sr);
      for (let i = 0; i < n; i++) { const t = i / sr; x[i] += r[i] * ex(t, p.punch * 0.9) * 2.2; }
      // 4) 가슴 치는 쿵 (내려가는 저음)
      let ph = 0;
      for (let i = 0; i < n; i++) { const t = i / sr, f = p.boom * 0.55 + p.boom * 1.9 * ex(t, 0.018); ph += 2 * Math.PI * f / sr; x[i] += Math.sin(ph) * ex(t, p.punch * 1.1) * 0.9; }
      if (p.sub) { ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += 2 * Math.PI * (34 + 30 * ex(t, 0.05)) / sr; x[i] += Math.sin(ph) * Math.min(1, t / 0.004) * ex(t, 0.13) * 0.8 * p.sub; } }
    } else if (p.sub >= 0.6) {
      // 저격총·지정사수 소음기: 배그처럼 '피슝~' (날카로운 '피' + 바람 가르는 '슝')
      const c = biq(biq(nz(n), 'hp', 1900, 0.7, sr), 'lp', 6000, 0.7, sr);
      for (let i = 0; i < n; i++) { const t = i / sr; x[i] += c[i] * ex(t, 0.006) * 1.0; }
      const sh = biq(biq(nz(n), 'bp', 1450, 0.9, sr), 'hp', 380, 0.7, sr);
      for (let i = 0; i < n; i++) { const t = i / sr; const a = Math.min(1, t / 0.008); x[i] += sh[i] * a * ex(t, 0.055) * 1.5; }
      let ph = 0;
      for (let i = 0; i < n; i++) { const t = i / sr, f = 430 + 1250 * ex(t, 0.07); ph += 2 * Math.PI * f / sr; x[i] += Math.sin(ph) * Math.min(1, t / 0.01) * ex(t, 0.09) * 0.32; }
      ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += 2 * Math.PI * (50 + 100 * ex(t, 0.012)) / sr; x[i] += Math.sin(ph) * ex(t, 0.05) * 0.7; }
    } else {
      // 소음기: '퓻' 하는 둔한 공기 소리
      const b = biq(biq(nz(n), 'lp', 1700, 0.8, sr), 'hp', 180, 0.7, sr);
      for (let i = 0; i < n; i++) { const t = i / sr; x[i] += b[i] * Math.min(1, t / 0.001) * ex(t, 0.022) * 1.3; }
      let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += 2 * Math.PI * (90 + 160 * ex(t, 0.01)) / sr; x[i] += Math.sin(ph) * ex(t, 0.03) * 0.5; }
    }
    // 5) 쇳소리 (노리쇠가 철컥)
    const m = Math.max(p.mech, suppressed ? 0.5 : 0);
    if (m) {
      const mk = biq(nz(n), 'bp', 3400, 6, sr), mk2 = biq(nz(n), 'bp', 2300, 5, sr);
      const t1 = 0.012 + Math.random() * 0.004, t2 = 0.055 + Math.random() * 0.01;
      for (let i = 0; i < n; i++) { const t = i / sr; if (t > t1) x[i] += mk[i] * ex(t - t1, 0.006) * 0.7 * m; if (t > t2) x[i] += mk2[i] * ex(t - t2, 0.008) * 0.55 * m; }
    }
    // 부드럽게 꽉 채우기 (소프트 클리핑) + 정규화
    const dr = suppressed ? (p.sub >= 0.6 ? 1.8 : 1.4) : p.drive, nd = Math.tanh(dr);
    let pk = 0; for (let i = 0; i < n; i++) { x[i] = Math.tanh(x[i] * dr) / nd; pk = Math.max(pk, Math.abs(x[i])); }
    for (let i = 0; i < n; i++) x[i] *= 0.92 / (pk || 1);
    for (let i = n - 400; i < n; i++) x[i] *= (n - i) / 400;
    const dry = ctx.createBuffer(1, n, sr); dry.getChannelData(0).set(x);
    if (noTail) return { dry, tail: null };
    // 6) 메아리 (스테레오): 넓은 울림 + 건물에 튕겨 돌아오는 소리 몇 번
    const tl = (suppressed ? 0.5 : p.tail), m2 = Math.floor(sr * tl), tail = ctx.createBuffer(2, m2, sr);
    const echoes = suppressed ? [] : [[0.085, 0.55, -0.6], [0.16, 0.42, 0.7], [0.29, 0.3, -0.3], [0.47, 0.2, 0.5], [0.72, 0.12, -0.7]];
    const burst = biq(nz(Math.floor(sr * 0.25)), 'lp', p.body * 0.55, 0.7, sr);
    for (let ch = 0; ch < 2; ch++) {
      const y = new Float32Array(m2), wn = biq(biq(nz(m2), 'lp', 900, 0.6, sr), 'hp', 70, 0.7, sr), dk = biq(nz(m2), 'lp', 260, 0.7, sr);
      for (let i = 0; i < m2; i++) { const t = i / sr, a = Math.min(1, t / 0.012); y[i] = (wn[i] * ex(t, tl * 0.18) * 0.55 + dk[i] * ex(t, tl * 0.32) * 0.9) * a; }
      for (const [d, g, pan] of echoes) {
        const o = Math.floor(sr * d * (tl / 2)), gg = g * (ch ? 1 + pan * 0.6 : 1 - pan * 0.6);
        for (let i = 0; i < burst.length && o + i < m2; i++) y[o + i] += burst[i] * ex(i / sr, 0.05) * gg * 1.4;
      }
      for (let i = m2 - 800; i < m2; i++) if (i >= 0) y[i] *= (m2 - i) / 800;
      tail.getChannelData(ch).set(y);
    }
    let tp = 0; for (let ch = 0; ch < 2; ch++) for (const v of tail.getChannelData(ch)) tp = Math.max(tp, Math.abs(v));
    for (let ch = 0; ch < 2; ch++) { const d = tail.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] *= 0.8 / (tp || 1); }
    return { dry, tail };
  }
  function buildGunSounds() { // 한 번에 다 만들면 잠깐 멈출 수 있어서 종류별로 나눠서 만들어요
    Object.keys(SND).forEach((k, i) => setTimeout(() => {
      try {
        const a = makeGunSound(SND[k], false), sa = makeGunSound(SND[k], true);
        const v = [a, { dry: makeGunSound(SND[k], false, true).dry, tail: a.tail }, { dry: makeGunSound(SND[k], false, true).dry, tail: a.tail }];
        BUF[k] = v; BUF[k + '_s'] = [sa, { dry: makeGunSound(SND[k], true, true).dry, tail: sa.tail }];
      } catch (e) {}
    }, 20 + i * 60));
  }
  function playBuf(out, buf, t, vol, rate) {
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = vol; src.connect(g); g.connect(out); src.start(t);
  }
  const api = {
    init, setVol,
    get ctx() { return ctx; },
    get _buf() { return BUF; },
    prep(id, cat) { prepGun(id, cat); },
    shot(pos, cat, suppressed, local, id) {
      if (!ctx) return; const s = spatial(local ? null : pos), t = ctx.currentTime, p = P[cat] || P.AR;
      // 동시에 나는 소리가 너무 많으면 줄이기 (소리 깨짐·끊김 방지)
      const busy = voices(t);
      if (busy > 34 || (!local && busy > 22 && s.vol < 0.25)) return;
      const lite = busy > 14;
      const delay = local ? 0 : s.dist / 343 * 0.35;
      const out = chain(s), T0 = t + delay;
      const V = s.vol * p.vol;
      if (cat === 'XB') { // 석궁: 줄이 튕기는 '팅~' + 둔한 '퉁'
        tone(out, T0, 0.22, 210, 120, 0.7 * s.vol, 'triangle');
        tone(out, T0, 0.12, 95, 55, 0.9 * s.vol);
        noise(out, T0, 0.07, 'bandpass', 1400, 1.2, 0.8 * s.vol);
        noise(out, T0 + 0.005, 0.25, 'bandpass', 380, 3, 0.4 * s.vol, 0.004);
        addVoice(T0 + 0.25, 4); return;
      }
      if (id && !suppressed && SND_W[id] && !BUF[id]) prepGun(id, cat);
      const bk = (!suppressed && id && BUF[id]) || BUF[(SND[cat] ? cat : 'AR') + (suppressed ? '_s' : '')];
      const gv = (!suppressed && id && SND_W[id] && SND_W[id].vol) || 1;
      if (bk) {
        const b = pick(bk), rate = rand(0.95, 1.05) * (suppressed ? 1 : 1);
        // 멀리서 쏘면 앞소리는 작아지고 메아리 비율이 커져요
        playBuf(out, b.dry, T0, gv * (suppressed ? (SND[cat] && SND[cat].sub >= 0.6 ? 0.68 : 0.5) : 0.8) * V, rate);
        let n = 1, tailEnd = T0 + b.dry.duration;
        if (!lite && (T0 - lastTail > (cat === 'SR' || cat === 'SG' || cat === 'DMR' ? 0 : 0.11) || suppressed)) {
          lastTail = T0;
          const tv = (suppressed ? 0.08 : 0.27 + Math.min(0.35, s.dist / 90)) * V;
          playBuf(chain({ ...s, lp: Math.min(s.lp, 9000) }), b.tail, T0 + 0.01, tv, rate); n++; tailEnd = T0 + b.tail.duration;
        }
        addVoice(Math.min(tailEnd, T0 + 0.6), n);
        return;
      }
      if (suppressed) {
        noise(out, T0, 0.09, 'bandpass', 2600, 0.8, 0.5 * V);
        if (!lite) noise(out, T0, 0.16, 'lowpass', 700, 0.7, 0.35 * s.vol);
        addVoice(T0 + 0.16, lite ? 1 : 2);
        return;
      }
      // 탕! 하는 날카로운 앞소리 + 몸통 + 쿵
      noise(out, T0, 0.05, 'highpass', 2600, 0.7, 1.1 * V);
      noise(out, T0, p.len, 'lowpass', p.body, 0.8, 1.25 * V, 0.001);
      tone(local && gritBus ? gritBus : out, T0, p.bLen, p.boom * 2.4, p.boom * 0.55, 0.9 * V);
      let n = 3;
      if (!lite) {
        noise(out, T0, p.len * 0.5, 'bandpass', p.body * 0.6, 1.4, 0.6 * V);
        if (p.sub) { tone(out, T0, p.bLen * 1.3, 62, 32, 0.9 * p.sub * V); n++; }
        n++;
      }
      // 울림: 연사 중엔 가끔만 (소리가 쌓여서 깨지지 않게)
      if (!lite && (T0 - lastTail > 0.28 || p.sub >= 0.5)) {
        lastTail = T0;
        noise(out, T0 + 0.03, p.tail, 'lowpass', 520, 0.5, (0.18 + Math.min(0.35, s.dist / 200)) * V, 0.02); n++;
      }
      addVoice(T0 + Math.max(p.len, p.bLen), n);
    },
    punch(hit, pos) { // 주먹: 휙 + (맞으면) 퍽
      if (!ctx) return; const s = spatial(pos || null); if (s.dist > 40) return; const out = chain(s), t = ctx.currentTime;
      noise(out, t, 0.12, 'bandpass', 900, 0.8, 0.35 * s.vol, 0.03);
      if (hit) { noise(out, t + 0.06, 0.08, 'lowpass', 500, 1, 0.9 * s.vol); tone(out, t + 0.06, 0.09, 130, 60, 0.6 * s.vol); }
    },
    crack(pos) { // 총알이 옆을 스치는 소리
      if (!ctx) return; const s = spatial(pos), out = chain({ ...s, vol: 1, lp: 18000 });
      noise(out, ctx.currentTime, 0.05, 'highpass', 4500, 1, 0.5);
    },
    click(vol = 0.3, f = 2400) { if (!ctx) return; const out = chain(spatial(null)); tone(out, ctx.currentTime, 0.035, f, f * 0.7, vol, 'square'); },
    reload(dur) {
      if (!ctx) return; const out = chain(spatial(null)), t = ctx.currentTime;
      noise(out, t + 0.15, 0.06, 'bandpass', 1800, 2, 0.35);
      noise(out, t + dur * 0.45, 0.08, 'bandpass', 1300, 2, 0.4);
      tone(out, t + dur * 0.45, 0.04, 900, 500, 0.2, 'square');
      noise(out, t + dur * 0.85, 0.05, 'bandpass', 2600, 3, 0.5);
      tone(out, t + dur * 0.85, 0.03, 1600, 900, 0.18, 'square');
    },
    bolt() {
      if (!ctx) return; const out = chain(spatial(null)), t = ctx.currentTime + 0.25;
      noise(out, t, 0.05, 'bandpass', 2200, 3, 0.35); noise(out, t + 0.28, 0.06, 'bandpass', 1500, 3, 0.4);
    },
    step(pos, local, soft) {
      if (!ctx) return; const s = spatial(local ? null : pos); if (s.dist > 45) return;
      const out = chain(s); const v = (local ? 0.12 : 0.55) * s.vol * (soft ? 0.4 : 1);
      noise(out, ctx.currentTime, 0.09, 'lowpass', 520, 0.8, v);
      noise(out, ctx.currentTime + 0.01, 0.05, 'bandpass', 2200, 1.2, v * 0.35);
    },
    land() { if (!ctx) return; const out = chain(spatial(null)); noise(out, ctx.currentTime, 0.14, 'lowpass', 300, 0.7, 0.35); },
    hit(head) {
      if (!ctx) return; const out = chain(spatial(null)), t = ctx.currentTime;
      if (head) { tone(out, t, 0.3, 2500, 2400, 0.28); tone(out, t, 0.35, 3800, 3700, 0.12); }
      else noise(out, t, 0.05, 'bandpass', 1700, 2, 0.5);
    },
    hurt() { if (!ctx) return; const out = chain(spatial(null)); noise(out, ctx.currentTime, 0.12, 'lowpass', 600, 1, 0.6); tone(out, ctx.currentTime, 0.15, 160, 70, 0.35); },
    explosion(pos) {
      if (!ctx) return; const s = spatial(pos), out = chain(s), t = ctx.currentTime + s.dist / 343 * 0.3;
      noise(out, t, 0.25, 'highpass', 1500, 0.5, 0.8 * s.vol + 0.1);
      noise(out, t, 2.2, 'lowpass', 380, 0.6, 1.6 * s.vol + 0.15, 0.01);
      tone(out, t, 0.9, 90, 28, 1.2 * s.vol + 0.1);
    },
    pin() { if (!ctx) return; const out = chain(spatial(null)); tone(out, ctx.currentTime, 0.08, 3200, 2600, 0.15, 'triangle'); noise(out, ctx.currentTime + 0.05, 0.05, 'bandpass', 3000, 3, 0.25); },
    bounce(pos) { if (!ctx) return; const s = spatial(pos); if (s.dist > 40) return; const out = chain(s); tone(out, ctx.currentTime, 0.06, 900, 500, 0.3 * s.vol, 'triangle'); },
    smoke(pos) { if (!ctx) return; const s = spatial(pos), out = chain(s); noise(out, ctx.currentTime, 3.0, 'bandpass', 2400, 0.4, 0.5 * s.vol + 0.05, 0.2); },
    flash(pos) { if (!ctx) return; const s = spatial(pos), out = chain(s); noise(out, ctx.currentTime, 0.4, 'highpass', 1200, 0.5, 1.2 * s.vol + 0.1); },
    ring(sec) { this.deafen(sec, 0.6); },
    deafen(sec, k = 1) { // 이명: 삐~ 소리 + 주변 소리가 먹먹해졌다가 천천히 돌아와요 (배그처럼)
      if (!ctx || !muffle) return; const t = ctx.currentTime; k = clamp(k, 0, 1); sec = clamp(sec, 1, 9);
      const f = muffle.frequency; f.cancelScheduledValues(t); f.setValueAtTime(Math.min(f.value, 20000), t);
      f.exponentialRampToValueAtTime(lerp(1400, 280, k), t + 0.05); f.setValueAtTime(lerp(1400, 280, k), t + sec * 0.35);
      f.exponentialRampToValueAtTime(20000, t + sec);
      if (ringG) { try { ringG.gain.cancelScheduledValues(t); ringG.gain.setTargetAtTime(0.0001, t, 0.05); } catch (e) {} }
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(); ringG = g;
      o.type = 'sine'; o.frequency.value = 3900 + Math.random() * 300; o2.type = 'sine'; o2.frequency.value = o.frequency.value * 1.004;
      const v = (0.05 + 0.1 * k) * SETTINGS.volume;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.04); g.gain.setValueAtTime(v, t + sec * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
      o.connect(g); o2.connect(g); g.connect(postBus || master); o.start(t); o2.start(t); o.stop(t + sec + 0.1); o2.stop(t + sec + 0.1);
    },
    beep(f = 880, d = 0.12, v = 0.25) { if (!ctx) return; const out = chain(spatial(null)); tone(out, ctx.currentTime, d, f, f, v, 'sine'); },
    empty() { this.click(0.25, 1500); },
  };
  // 소리 쪽에서 오류가 나도 게임은 멈추지 않게
  for (const k of Object.keys(api)) if (typeof api[k] === 'function') { const f = api[k]; api[k] = function () { try { return f.apply(api, arguments); } catch (e) { return undefined; } }; }
  return api;
})();

// ================= 입력 =================
const INPUT = {
  keys: {}, pressed: {}, mdx: 0, mdy: 0, lmb: false, rmb: false, lmbPressed: false, rmbPressed: false, rmbReleased: false, lmbReleased: false, wheel: 0,
  locked: false,
  consume() { this.pressed = {}; this.mdx = 0; this.mdy = 0; this.lmbPressed = this.rmbPressed = this.rmbReleased = this.lmbReleased = false; this.wheel = 0; },
};
const BLOCK_KEYS = ['Tab', 'AltLeft', 'AltRight', 'Space', 'Backquote', 'KeyQ', 'KeyE', 'F1'];
addEventListener('keydown', (e) => {
  if (BLOCK_KEYS.includes(e.code) || (INPUT.locked && e.code !== 'Escape')) e.preventDefault();
  if (!INPUT.keys[e.code]) INPUT.pressed[e.code] = true;
  INPUT.keys[e.code] = true;
});
addEventListener('keyup', (e) => { INPUT.keys[e.code] = false; if (BLOCK_KEYS.includes(e.code)) e.preventDefault(); });
addEventListener('blur', () => { INPUT.keys = {}; INPUT.lmb = INPUT.rmb = false; });
const canvasEl = renderer.domElement;
addEventListener('mousemove', (e) => { if (INPUT.locked) { INPUT.mdx += e.movementX; INPUT.mdy += e.movementY; } });
addEventListener('mousedown', (e) => {
  if (!INPUT.locked) return;
  if (e.button === 0) { INPUT.lmb = true; INPUT.lmbPressed = true; }
  if (e.button === 2) { INPUT.rmb = true; INPUT.rmbPressed = true; }
});
addEventListener('mouseup', (e) => {
  if (e.button === 0) { INPUT.lmb = false; INPUT.lmbReleased = true; }
  if (e.button === 2) { INPUT.rmb = false; INPUT.rmbReleased = true; }
});
addEventListener('wheel', (e) => { if (INPUT.locked) INPUT.wheel += Math.sign(e.deltaY); }, { passive: true });
addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerlockchange', () => {
  INPUT.locked = document.pointerLockElement === canvasEl;
  if (!INPUT.locked) { INPUT.lmb = INPUT.rmb = false; INPUT.keys = {}; if (window.onPointerUnlock) window.onPointerUnlock(); }
});
function lockPointer() {
  AU.init();
  try { const p = canvasEl.requestPointerLock({ unadjustedMovement: true }); if (p && p.catch) p.catch(() => canvasEl.requestPointerLock()); }
  catch (e) { canvasEl.requestPointerLock(); }
}
