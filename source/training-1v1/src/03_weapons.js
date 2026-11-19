// ================= 총기 데이터 =================
// 피해량·부위 배율은 배그(PUBG PC) 값 기준
// [id, 이름, 분류, 탄, 피해, 탄속(m/s), 발사간격(s), 탄창, 대용량탄창, 재장전(s), 사격모드, 수직반동(도), 수평반동, 최대조준경, 파츠칸]
// 파츠칸: m=총구 g=손잡이 x=탄창 s=개머리판
const WEAPON_TABLE = [
  ['m416', 'M416', 'AR', '5.56×45mm NATO', 40, 880, 0.0857, 30, 40, 2.1, 'SA', 0.42, 0.20, 7, 'mgxs'],
  ['akm', 'AKM', 'AR', '7.62×39mm', 47, 715, 0.100, 30, 40, 2.7, 'SA', 0.74, 0.30, 7, 'mx'],
  ['beryl', 'Beryl M762', 'AR', '7.62×39mm', 44, 715, 0.086, 30, 40, 2.9, 'SBA', 0.84, 0.38, 7, 'mgx'],
  ['scar', 'SCAR-L', 'AR', '5.56×45mm NATO', 42, 870, 0.096, 30, 40, 2.2, 'SA', 0.45, 0.22, 7, 'mgx'],
  ['aug', 'AUG', 'AR', '5.56×45mm NATO', 41, 940, 0.0857, 30, 40, 3.0, 'SA', 0.40, 0.21, 7, 'mgx'],
  ['groza', 'Groza', 'AR', '7.62×39mm', 47, 715, 0.080, 30, 40, 3.0, 'SA', 0.62, 0.30, 5, 'mx'],
  ['qbz', 'QBZ95', 'AR', '5.8×42mm', 42, 870, 0.092, 30, 40, 2.8, 'SA', 0.45, 0.22, 7, 'mgx'],
  ['g36c', 'G36C', 'AR', '5.56×45mm NATO', 41, 870, 0.086, 30, 40, 2.5, 'SA', 0.44, 0.22, 5, 'mgx'],
  ['m16', 'M16A4', 'AR', '5.56×45mm NATO', 43, 900, 0.075, 30, 40, 2.3, 'SB', 0.48, 0.20, 7, 'mx'],
  ['mk47', 'Mk47 Mutant', 'AR', '7.62×39mm', 49, 780, 0.100, 20, 30, 2.7, 'SB', 0.70, 0.30, 7, 'mgx'],
  ['ace32', 'ACE32', 'AR', '7.62×39mm', 43, 715, 0.088, 30, 40, 2.6, 'SA', 0.60, 0.26, 7, 'mgxs'],
  ['famas', 'FAMAS', 'AR', '5.56×45mm NATO', 39, 925, 0.0667, 25, 35, 2.8, 'SBA', 0.50, 0.26, 7, 'mx'],
  ['ump', 'UMP45', 'SMG', '.45 ACP', 41, 360, 0.092, 25, 35, 2.4, 'SBA', 0.32, 0.15, 5, 'mgx'],
  ['vector', 'Vector', 'SMG', '.45 ACP', 31, 380, 0.055, 19, 33, 1.9, 'SBA', 0.42, 0.20, 3, 'mgxs'],
  ['uzi', 'Micro UZI', 'SMG', '9×19mm 파라벨룸', 26, 350, 0.048, 25, 35, 2.2, 'SA', 0.30, 0.18, 1, 'mxs'],
  ['tommy', 'Tommy Gun', 'SMG', '.45 ACP', 40, 280, 0.086, 30, 50, 3.0, 'SA', 0.38, 0.20, 0, 'mgx'],
  ['bizon', 'PP-19 Bizon', 'SMG', '9×18mm 마카로프', 35, 408, 0.086, 53, 53, 3.2, 'SA', 0.30, 0.15, 5, 'm'],
  ['mp5k', 'MP5K', 'SMG', '9×19mm 파라벨룸', 33, 400, 0.067, 30, 40, 2.4, 'SBA', 0.32, 0.15, 5, 'mgxs'],
  ['p90', 'P90', 'SMG', '5.7×28mm', 35, 715, 0.060, 50, 50, 2.5, 'A', 0.28, 0.15, 5, ''],
  ['js9', 'JS9', 'SMG', '9×19mm 파라벨룸', 34, 400, 0.067, 30, 40, 2.4, 'SA', 0.28, 0.14, 5, 'mgx'],
  ['sks', 'SKS', 'DMR', '7.62×39mm', 53, 800, 0.090, 10, 20, 2.9, 'S', 1.30, 0.50, 8, 'mgxs'],
  ['slr', 'SLR', 'DMR', '7.62×51mm NATO', 56, 840, 0.100, 10, 20, 2.9, 'S', 1.60, 0.60, 8, 'mxs'],
  ['mini14', 'Mini14', 'DMR', '5.56×45mm NATO', 48, 990, 0.100, 20, 30, 2.6, 'S', 0.90, 0.35, 8, 'mxs'],
  ['mk14', 'Mk14 EBR', 'DMR', '7.62×51mm NATO', 61, 853, 0.090, 10, 20, 3.0, 'SA', 1.60, 0.60, 8, 'mxs'],
  ['qbu', 'QBU', 'DMR', '5.8×42mm', 48, 945, 0.100, 10, 20, 2.6, 'S', 0.90, 0.35, 8, 'mx'],
  ['vss', 'VSS', 'DMR', '9×39mm', 41, 330, 0.086, 10, 20, 2.6, 'SA', 0.45, 0.25, -1, 'gx'],
  ['mk12', 'Mk12', 'DMR', '5.56×45mm NATO', 50, 930, 0.100, 20, 30, 2.6, 'S', 1.00, 0.40, 8, 'mgxs'],
  ['dragunov', 'Dragunov', 'DMR', '7.62×54mmR', 60, 830, 0.150, 10, 20, 3.2, 'S', 1.70, 0.60, 8, 'mxs'],
  ['kar98k', 'Kar98k', 'SR', '7.92×57mm 마우저', 79, 760, 1.90, 5, 5, 4.0, 'S', 2.5, 0.6, 8, 'mxs'],
  ['m24', 'M24', 'SR', '7.62×51mm NATO', 75, 790, 1.80, 5, 7, 3.4, 'S', 2.4, 0.6, 8, 'mxs'],
  ['awm', 'AWM', 'SR', '.300 윈체스터 매그넘', 105, 945, 1.85, 5, 7, 4.0, 'S', 3.0, 0.7, 8, 'mxs'],
  ['mosin', 'Mosin Nagant', 'SR', '7.62×54mmR', 79, 870, 1.90, 5, 5, 4.0, 'S', 2.5, 0.6, 8, 'mxs'],
  ['win94', 'Win94', 'SR', '.30-30 윈체스터', 66, 760, 1.30, 8, 8, 4.0, 'S', 2.2, 0.6, 2, 'm'],
  ['lynx', 'Lynx AMR', 'SR', '.50 BMG (12.7×99mm)', 118, 1000, 1.80, 5, 5, 4.5, 'S', 4.0, 0.8, 8, ''],
  ['s1897', 'S1897', 'SG', '12게이지 산탄', 26, 360, 0.75, 5, 5, 3.0, 'S', 3.5, 0.8, 1, 'm'],
  ['s686', 'S686', 'SG', '12게이지 산탄', 26, 370, 0.20, 2, 2, 2.2, 'S', 3.5, 0.8, 0, 'm'],
  ['s12k', 'S12K', 'SG', '12게이지 산탄', 24, 350, 0.25, 5, 8, 2.6, 'S', 3.0, 0.8, 2, 'mx'],
  ['dbs', 'DBS', 'SG', '12게이지 산탄', 26, 400, 0.30, 14, 14, 4.5, 'S', 3.2, 0.8, 2, ''],
  ['o12', 'O12', 'SG', '12게이지 슬러그', 30, 350, 0.20, 5, 8, 2.6, 'SA', 3.0, 0.8, 2, 'mx'],
  ['sawed', 'Sawed-off', 'SG', '12게이지 산탄', 21, 340, 0.20, 2, 2, 2.0, 'S', 3.5, 0.8, 0, ''],
  ['m249', 'M249', 'LMG', '5.56×45mm NATO', 41, 915, 0.075, 75, 150, 6.5, 'A', 0.48, 0.22, 7, ''],
  ['dp28', 'DP-28', 'LMG', '7.62×54mmR', 52, 715, 0.109, 47, 47, 4.5, 'A', 0.60, 0.25, 7, ''],
  ['mg3', 'MG3', 'LMG', '7.62×51mm NATO', 42, 820, 0.060, 75, 75, 6.5, 'A', 0.60, 0.28, 7, ''],
  ['crossbow', '석궁', 'XB', '석궁 볼트(화살)', 105, 100, 0.3, 1, 1, 3.4, 'S', 1.0, 0.25, 5, ''],
  ['p92', 'P92', 'HG', '9×19mm 파라벨룸', 34, 380, 0.135, 15, 20, 2.0, 'S', 0.9, 0.4, 2, 'mx'],
  ['p1911', 'P1911', 'HG', '.45 ACP', 42, 250, 0.110, 7, 12, 2.1, 'S', 1.1, 0.5, 2, 'mx'],
  ['p18c', 'P18C', 'HG', '9×19mm 파라벨룸', 23, 375, 0.060, 17, 25, 2.0, 'SA', 0.7, 0.4, 2, 'mx'],
  ['r1895', 'R1895', 'HG', '7.62×38mmR 나강', 64, 330, 0.40, 7, 7, 3.0, 'S', 1.6, 0.6, 2, 'm'],
  ['r45', 'R45', 'HG', '.45 ACP', 65, 330, 0.25, 6, 6, 2.2, 'S', 1.6, 0.6, 2, ''],
  ['deagle', 'Desert Eagle', 'HG', '.50 AE', 62, 420, 0.20, 7, 10, 2.2, 'S', 2.2, 0.7, 2, 'x'],
  ['skorpion', 'Skorpion', 'HG', '.32 ACP (7.65×17mm)', 22, 300, 0.070, 20, 40, 2.6, 'SA', 0.45, 0.25, 2, 'gxs'],
];
const CAT_NAME = { AR: '돌격소총', SMG: '기관단총', DMR: '지정사수소총', SR: '저격소총', SG: '산탄총', LMG: '경기관총', HG: '권총', XB: '석궁' };
const CAT_INFO = {
  AR: { body: 1.0, head: 2.35, limb: 0.9, hip: 2.2, ads: 0.06, adsTime: 0.22, move: 0.97, falloff: [120, 400, 0.75] },
  SMG: { body: 1.05, head: 2.1, limb: 1.3, hip: 1.5, ads: 0.10, adsTime: 0.17, move: 1.0, falloff: [40, 150, 0.6] },
  DMR: { body: 1.05, head: 2.35, limb: 0.95, hip: 2.6, ads: 0.02, adsTime: 0.28, move: 0.95, falloff: [200, 600, 0.8] },
  SR: { body: 1.3, head: 6.0, limb: 0.95, hip: 3.5, ads: 0.0, adsTime: 0.32, move: 0.94, falloff: [300, 800, 0.85] },
  SG: { body: 0.9, head: 1.5, limb: 1.05, hip: 3.6, ads: 2.6, adsTime: 0.22, move: 0.97, falloff: [7, 30, 0.08] },
  LMG: { body: 1.05, head: 2.3, limb: 0.9, hip: 3.0, ads: 0.10, adsTime: 0.35, move: 0.9, falloff: [120, 400, 0.75] },
  HG: { body: 1.0, head: 2.1, limb: 1.0, hip: 1.6, ads: 0.15, adsTime: 0.15, move: 1.08, falloff: [30, 120, 0.6] },
  XB: { body: 1.4, head: 2.3, limb: 1.2, hip: 2.4, ads: 0.0, adsTime: 0.26, move: 0.98, falloff: [500, 900, 1] },
};
const WEAPONS = {};
// 맨손 (배그 주먹 피해 18)
CAT_INFO.FIST = { body: 1.0, head: 2.0, limb: 0.8, hip: 0, ads: 0, adsTime: 0.2, move: 1.1, falloff: [100, 200, 1] };
const FIST_ST = { def: { id: 'fist', name: '맨손', cat: 'FIST', dmg: 18, vel: 0 }, cat: 'FIST' };
for (const r of WEAPON_TABLE) {
  const [id, name, cat, ammo, dmg, vel, interval, mag, ext, reload, modes, rv, rh, scopeMax, slots] = r;
  WEAPONS[id] = { id, name, cat, ammo, dmg, vel, interval, mag, ext, reload, modes, rv, rh, scopeMax, slots, pellets: cat === 'SG' ? (id === 'o12' ? 8 : 9) : 1, bolt: cat === 'SR' && interval > 1, integrated: id === 'vss' };
}

// ================= 파츠 =================
const SCOPES = [
  { id: 'iron', name: '아이언 사이트', zoom: 1.15 },
  { id: 'reddot', name: '레드 도트', zoom: 1.25 },
  { id: 'holo', name: '홀로그램', zoom: 1.25 },
  { id: '2x', name: '2배율', zoom: 2 },
  { id: '3x', name: '3배율', zoom: 3 },
  { id: '4x', name: '4배율', zoom: 4 },
  { id: '6x', name: '6배율', zoom: 6 },
  { id: '8x', name: '8배율', zoom: 8 },
  { id: '15x', name: '15배율', zoom: 15 },
];
const MUZZLES = { comp: '보정기', flash: '소염기', supp: '소음기', choke: '초크', duck: '덕빌' };
const GRIPS = { vert: '수직 손잡이', angled: '앵글 손잡이', half: '하프 그립', thumb: '엄지 그립', light: '라이트 그립', laser: '레이저 사이트' };
const STOCKS = { tac: '전술 개머리판', cheek: '칙패드', loops: '총알 고리' };
const MAGS = { ext: '대용량 탄창', qd: '퀵드로우 탄창', extqd: '대용량 퀵드로우' };
// 파츠 효과 (배그 PC 기준) — 총 고르기 화면에 그대로 보여줘요
const ATT_FX = {
  muzzle: {
    comp: { rv: 0.85, rh: 0.9, shake: 0.7, d: '수직 반동 -15% · 수평 반동 -10% · 화면 흔들림 -30%' },
    flash: { rv: 0.9, rh: 0.9, hide: 1, d: '수직 반동 -10% · 수평 반동 -10% · 총구 불꽃 안 보임' },
    supp: { supp: 1, hide: 1, d: '총소리가 작아져 멀리서 잘 안 들림 · 총구 불꽃 안 보임 · AI가 위치를 잘 못 찾음' },
    choke: { spread: 0.75, d: '산탄 퍼짐 -25% (멀리까지 모여서 날아감)' },
    duck: { spreadV: 0.6, spreadH: 1.15, d: '산탄 세로 퍼짐 -40% · 가로로 넓게 퍼짐' },
  },
  grip: {
    vert: { rv: 0.85, d: '수직 반동 -15%' },
    angled: { rh: 0.85, adsTime: 0.8, d: '수평 반동 -15% · 조준 속도 +20%' },
    half: { rv: 0.92, rh: 0.92, recovery: 1.2, d: '수직·수평 반동 -8% · 반동 회복 +20%' },
    thumb: { rv: 0.95, adsTime: 0.7, d: '수직 반동 -5% · 조준 속도 +30%' },
    light: { rh: 0.9, recovery: 1.1, sway: 0.85, d: '수평 반동 -10% · 첫발 반동 회복 +10% · 흔들림 -15%' },
    laser: { hip: 0.7, d: '비조준(지향) 사격 퍼짐 -30% · 움직이며 쏠 때 더 정확' },
  },
  mag: {
    ext: { ext: 1, d: '탄창 크기 늘어남' },
    qd: { reload: 0.7, d: '장전 시간 -30%' },
    extqd: { ext: 1, reload: 0.7, d: '탄창 크기 늘어남 · 장전 시간 -30%' },
  },
  stock: {
    tac: { rv: 0.92, rh: 0.9, sway: 0.85, d: '수직 반동 -8% · 수평 반동 -10% · 흔들림 -15%' },
    cheek: { rv: 0.85, sway: 0.75, d: '수직 반동 -15% · 조준경 흔들림 -25%' },
    loops: { reload: 0.75, d: '한 발씩 넣는 장전 +25% 빠름' },
  },
};
function magOptions(w) { return w.slots.includes('x') ? ['ext', 'qd', 'extqd'] : []; }
function stockOptions(w) {
  if (!w.slots.includes('s')) return [];
  if (w.cat === 'SR') return ['cheek', 'loops'];
  if (w.cat === 'DMR') return ['cheek'];
  if (w.cat === 'SG') return ['loops'];
  return ['tac'];
}

function muzzleOptions(w) { if (!w.slots.includes('m')) return []; if (w.cat === 'SG') return ['choke', 'duck']; if (w.cat === 'HG') return ['supp']; return ['comp', 'flash', 'supp']; }
function gripOptions(w) { return w.slots.includes('g') ? Object.keys(GRIPS) : []; }
function scopeOptions(w) { if (w.scopeMax < 0) return []; if (w.cat === 'SG') return ['iron']; return SCOPES.slice(0, w.scopeMax + 1).map(s => s.id); }
function stockType(w) { const o = stockOptions(w); return o.length ? o[0] : null; }
function defaultScope(w) {
  const o = scopeOptions(w); if (!o.length) return null;
  const want = { AR: 'reddot', SMG: 'holo', DMR: '4x', SR: '8x', SG: 'reddot', LMG: 'reddot', HG: 'reddot', XB: 'reddot' }[w.cat];
  return o.includes(want) ? want : o[o.length - 1];
}
// 풀파츠 장착
function fullAttachments(id, choice = {}) {
  const w = WEAPONS[id];
  const mo = muzzleOptions(w), go = gripOptions(w);
  const xo = magOptions(w), so = stockOptions(w);
  // '' 은 '없음'으로 고른 것
  const pickOr = (v, opts, def) => !opts.length ? null : v === '' ? null : v && opts.includes(v) ? v : def;
  return {
    scope: choice.scope && scopeOptions(w).includes(choice.scope) ? choice.scope : defaultScope(w),
    muzzle: pickOr(choice.muzzle, mo, w.cat === 'SG' ? 'choke' : w.cat === 'HG' ? 'supp' : 'comp'),
    grip: pickOr(choice.grip, go, w.cat === 'DMR' ? 'half' : 'vert'),
    mag: pickOr(choice.mag, xo, 'extqd'),
    stock: pickOr(choice.stock, so, so[0]),
  };
}
// 지금 실제 배율 (Win94 Alt+우클릭 4배율, 휠 줌 포함)
function effZoom(w) { if (!w) return 1; if (w.altScope) return 4; return w.zoomSel && w.stats.scopeZoom >= 3 ? w.zoomSel : w.stats.scopeZoom; }
function effScopeId(w) { if (!w) return null; if (w.altScope) return '4x'; return w.stats.def.integrated ? '4x' : w.att.scope || 'iron'; }
function scopeZoom(id) { const s = SCOPES.find(s => s.id === id); return s ? s.zoom : 1.15; }

// 파츠를 적용한 실제 수치
function weaponStats(id, att) {
  const w = WEAPONS[id], c = CAT_INFO[w.cat];
  const s = {
    def: w, cat: w.cat, mag: w.mag, reload: w.reload, rv: w.rv * 1.65, rh: w.rh * 1.5, hip: c.hip, ads: c.ads, adsTime: c.adsTime,
    suppressed: w.integrated, flashHidden: w.integrated, pelletSpread: 4.2, sway: 1, recovery: 1, scopeZoom: 1.15,
  };
  if (w.integrated) s.scopeZoom = 4;
  if (w.cat === 'XB') { s.suppressed = true; s.flashHidden = true; }
  if (att.scope) s.scopeZoom = scopeZoom(att.scope);
  s.spreadMul = 1; s.spreadV = 1; s.spreadH = 1; s.shake = 1;
  for (const key of ['muzzle', 'grip', 'mag', 'stock']) {
    const fx = att[key] && ATT_FX[key][att[key]]; if (!fx) continue;
    if (fx.rv) s.rv *= fx.rv; if (fx.rh) s.rh *= fx.rh; if (fx.adsTime) s.adsTime *= fx.adsTime;
    if (fx.recovery) s.recovery *= fx.recovery; if (fx.sway) s.sway *= fx.sway; if (fx.hip) s.hip *= fx.hip;
    if (fx.reload) s.reload *= fx.reload; if (fx.ext) s.mag = w.ext; if (fx.shake) s.shake *= fx.shake;
    if (fx.supp) s.suppressed = true; if (fx.hide) s.flashHidden = true;
    if (fx.spread) s.spreadMul *= fx.spread; if (fx.spreadV) s.spreadV *= fx.spreadV; if (fx.spreadH) s.spreadH *= fx.spreadH;
  }
  if (w.cat === 'SG') { s.pelletSpread *= s.spreadMul; s.ads = s.pelletSpread * 0.7; s.hip *= s.spreadMul; }
  return s;
}

// ================= 총 모델 (코드로 만든 3D) =================
const GUNMAT = {
  black: new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.42, metalness: 0.55 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.6, metalness: 0.35 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.65, metalness: 0.0 }),
  tan: new THREE.MeshStandardMaterial({ color: 0xb59c72, roughness: 0.7, metalness: 0.1 }),
  olive: new THREE.MeshStandardMaterial({ color: 0x4f5a3b, roughness: 0.7, metalness: 0.1 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x6b6e73, roughness: 0.35, metalness: 0.85 }),
  lensRed: new THREE.MeshBasicMaterial({ color: 0x55c8ff, transparent: true, opacity: 0.12, depthWrite: false }),
  lens: new THREE.MeshStandardMaterial({ color: 0x2b4b6b, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.85 }),
};
const GUN_STYLE = {
  m416: { body: 'black', rec: 0.36, bar: 0.26, mag: 'str' }, akm: { body: 'black', furn: 'wood', rec: 0.38, bar: 0.3, mag: 'curve' },
  beryl: { body: 'black', rec: 0.38, bar: 0.27, mag: 'curve' }, scar: { body: 'tan', rec: 0.38, bar: 0.27, mag: 'str' },
  aug: { body: 'olive', rec: 0.3, bar: 0.3, mag: 'str', bullpup: true }, groza: { body: 'black', rec: 0.28, bar: 0.22, mag: 'curve', bullpup: true },
  qbz: { body: 'olive', rec: 0.3, bar: 0.28, mag: 'str', bullpup: true }, g36c: { body: 'black', rec: 0.32, bar: 0.18, mag: 'str' },
  m16: { body: 'black', rec: 0.36, bar: 0.4, mag: 'str' }, mk47: { body: 'black', rec: 0.36, bar: 0.26, mag: 'curve' },
  ace32: { body: 'black', rec: 0.37, bar: 0.27, mag: 'curve' }, famas: { body: 'dark', rec: 0.32, bar: 0.24, mag: 'str', bullpup: true },
  ump: { body: 'black', rec: 0.32, bar: 0.1, mag: 'str' }, vector: { body: 'dark', rec: 0.28, bar: 0.1, mag: 'str' },
  uzi: { body: 'dark', rec: 0.22, bar: 0.06, mag: 'grip' }, tommy: { body: 'black', furn: 'wood', rec: 0.32, bar: 0.18, mag: 'drum' },
  bizon: { body: 'black', rec: 0.32, bar: 0.12, mag: 'helix' }, mp5k: { body: 'black', rec: 0.24, bar: 0.06, mag: 'curve' },
  p90: { body: 'black', rec: 0.38, bar: 0.06, mag: 'top', bullpup: true }, js9: { body: 'dark', rec: 0.28, bar: 0.1, mag: 'str' },
  sks: { body: 'black', furn: 'wood', rec: 0.36, bar: 0.38, mag: 'box' }, slr: { body: 'black', furn: 'wood', rec: 0.4, bar: 0.4, mag: 'box' },
  mini14: { body: 'steel', furn: 'wood', rec: 0.36, bar: 0.36, mag: 'str' }, mk14: { body: 'black', rec: 0.4, bar: 0.4, mag: 'box' },
  qbu: { body: 'olive', rec: 0.34, bar: 0.4, mag: 'box', bullpup: true }, vss: { body: 'black', furn: 'wood', rec: 0.3, bar: 0.3, mag: 'box' },
  mk12: { body: 'black', rec: 0.38, bar: 0.42, mag: 'str' }, dragunov: { body: 'black', furn: 'wood', rec: 0.42, bar: 0.5, mag: 'box' },
  kar98k: { body: 'black', furn: 'wood', rec: 0.42, bar: 0.5, mag: 'none' }, m24: { body: 'olive', rec: 0.42, bar: 0.5, mag: 'none' },
  awm: { body: 'olive', rec: 0.44, bar: 0.56, mag: 'box' }, mosin: { body: 'black', furn: 'wood', rec: 0.42, bar: 0.55, mag: 'none' },
  win94: { body: 'steel', furn: 'wood', rec: 0.36, bar: 0.42, mag: 'none' }, lynx: { body: 'dark', rec: 0.5, bar: 0.6, mag: 'box' },
  s1897: { body: 'black', furn: 'wood', rec: 0.36, bar: 0.46, mag: 'tube' }, s686: { body: 'steel', furn: 'wood', rec: 0.26, bar: 0.5, mag: 'none' },
  s12k: { body: 'black', rec: 0.38, bar: 0.32, mag: 'none' }, dbs: { body: 'black', rec: 0.34, bar: 0.34, mag: 'none', bullpup: true },
  o12: { body: 'black', rec: 0.42, bar: 0.3, mag: 'none' }, sawed: { body: 'steel', furn: 'wood', rec: 0.2, bar: 0.24, mag: 'none' },
  m249: { body: 'black', rec: 0.42, bar: 0.4, mag: 'boxbig' }, dp28: { body: 'black', furn: 'wood', rec: 0.4, bar: 0.45, mag: 'pan' },
  mg3: { body: 'black', rec: 0.44, bar: 0.4, mag: 'boxbig' },
};

function M(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; return m;
}
const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CY = (r1, r2, h, s = 10, open = false) => new THREE.CylinderGeometry(r1, r2, h, s, 1, open);

// 총 모델: 총구는 -z 방향, 원점은 방아쇠 위치
function buildGunModel(id, att) {
  if (typeof GUN_NEW !== 'undefined' && GUN_NEW[id]) return buildGunNew(id, att);
  const w = WEAPONS[id], st = GUN_STYLE[id] || { body: 'black', rec: 0.34, bar: 0.25, mag: 'str' };
  const g = new THREE.Group();
  const body = GUNMAT[st.body], furn = st.furn ? GUNMAT[st.furn] : body;
  const info = { group: g, muzzle: new THREE.Object3D(), sightY: 0.072, eject: new THREE.Object3D(), magMesh: null };
  const hg = w.cat === 'HG';
  if (hg) {
    // 권총
    const slideL = id === 'deagle' ? 0.27 : id === 'r1895' || id === 'r45' ? 0.2 : 0.2;
    if (id === 'r1895' || id === 'r45') {
      g.add(M(CY(0.024, 0.024, 0.06, 8), GUNMAT.steel, 0, 0.05, -0.04, Math.PI / 2));
      g.add(M(CY(0.009, 0.009, 0.16, 8), GUNMAT.steel, 0, 0.065, -0.14, Math.PI / 2));
      g.add(M(BX(0.022, 0.03, 0.08), GUNMAT.steel, 0, 0.06, 0.03));
    } else {
      g.add(M(BX(0.03, 0.035, slideL), body, 0, 0.05, -slideL / 2 + 0.05));
      g.add(M(BX(0.026, 0.02, slideL * 0.8), GUNMAT.dark, 0, 0.025, -slideL * 0.35 + 0.04));
    }
    g.add(M(BX(0.026, 0.1, 0.04), id === 'r1895' || id === 'r45' ? GUNMAT.wood : GUNMAT.dark, 0, -0.03, 0.04, -0.25));
    if (id === 'skorpion') g.add(M(BX(0.02, 0.025, 0.16), GUNMAT.dark, 0, 0.045, 0.14));
    info.muzzle.position.set(0, 0.05, -slideL + 0.02);
    info.sightY = 0.075;
    g.add(M(BX(0.004, 0.012, 0.004), GUNMAT.black, 0, 0.073, -slideL + 0.06)); // 가늠쇠
    const rs = M(BX(0.02, 0.01, 0.006), GUNMAT.black, 0, 0.072, 0.03); g.add(rs);
    if (att.scope && att.scope !== 'iron') addScope(g, att.scope, 0.075, -0.06, info, true);
    if (att.muzzle === 'supp') g.add(M(CY(0.015, 0.015, 0.13, 10), GUNMAT.black, 0, 0.05, -slideL - 0.045, Math.PI / 2));
    if (att.muzzle === 'supp') info.muzzle.position.z -= 0.12;
    info.eject.position.set(0.02, 0.06, -0.02);
    g.add(info.muzzle, info.eject);
    return info;
  }
  if (id === 'crossbow') return buildCrossbow(g, att, info);
  const R = st.rec, B = st.bar, big = w.cat === 'SR' || w.cat === 'DMR' || w.cat === 'LMG';
  const recF = -R + 0.08;                       // 몸통 앞끝 z
  // 몸통 (윗부분 + 아랫부분)
  g.add(M(BX(0.05, 0.06, R), body, 0, 0.03, -R / 2 + 0.08));
  g.add(M(BX(0.044, 0.035, R * 0.75), body, 0, -0.005, -R * 0.4 + 0.08));
  // 손잡이 (총몸)
  if (!st.bullpup) g.add(M(BX(0.034, 0.1, 0.045), GUNMAT.dark, 0, -0.06, 0.035, -0.32));
  else g.add(M(BX(0.034, 0.1, 0.045), GUNMAT.dark, 0, -0.06, -0.06, -0.25));
  // 방아쇠울
  g.add(M(BX(0.006, 0.006, 0.06), GUNMAT.dark, 0, -0.035, st.bullpup ? -0.09 : 0.0));
  // 총열덮개 + 총열
  const hgL = Math.min(B * 0.75, 0.32);
  g.add(M(BX(0.046, 0.05, hgL), furn, 0, 0.025, recF - hgL / 2));
  g.add(M(CY(0.009, 0.009, B, 8), GUNMAT.steel, 0, 0.035, recF - B / 2, Math.PI / 2));
  // 위 레일
  if (att.scope || w.cat !== 'SR') g.add(M(BX(0.022, 0.008, R * 0.9), GUNMAT.dark, 0, 0.064, -R * 0.45 + 0.08));
  // 개머리판
  const stockZ = st.bullpup ? 0.08 + 0.02 : 0.08;
  const CUSTOM_STOCK = ['m416', 'ace32', 'beryl', 'scar', 'g36c', 'm16', 'mk47', 'ump', 'vector', 'tommy', 'bizon', 'js9', 'mk14', 'vss', 'mk12', 'dragunov', 'kar98k', 'mosin', 'm24', 's1897', 's12k', 'o12', 'm249', 'dp28', 'mg3', 'aug', 'p90', 'famas', 'qbz', 'qbu', 'groza', 'dbs', 'awm', 'lynx'];
  if (id !== 'sawed' && id !== 'mp5k' && id !== 'uzi' && !CUSTOM_STOCK.includes(id)) {
    const sl = big ? 0.27 : st.bullpup ? 0.1 : 0.22;
    const smat = st.furn ? furn : GUNMAT.dark;
    g.add(M(BX(0.04, big ? 0.075 : 0.06, sl), smat, 0, big ? -0.005 : 0.0, stockZ + sl / 2));
    g.add(M(BX(0.042, big ? 0.11 : 0.09, 0.02), GUNMAT.dark, 0, -0.015, stockZ + sl));
    if (att.stock === 'cheek') g.add(M(BX(0.046, 0.025, 0.12), GUNMAT.dark, 0, 0.045, stockZ + sl * 0.55));
    if (att.stock === 'tac') g.add(M(BX(0.046, 0.025, 0.08), GUNMAT.black, 0, -0.03, stockZ + sl * 0.4));
  }
  // 탄창
  let mag = null;
  const ext = att.mag === 'extqd' || att.mag === 'ext' ? 1.35 : 1;
  const magZ = st.bullpup ? 0.05 : -0.08;
  switch (st.mag) {
    case 'str': mag = M(BX(0.03, 0.12 * ext, 0.05), GUNMAT.black, 0, -0.07 * ext, magZ, 0.12); break;
    case 'curve': mag = M(BX(0.03, 0.13 * ext, 0.05), GUNMAT.black, 0, -0.075 * ext, magZ - 0.01, 0.35); break;
    case 'box': mag = M(BX(0.03, 0.07 * ext, 0.06), GUNMAT.black, 0, -0.045 * ext, magZ); break;
    case 'boxbig': mag = M(BX(0.09, 0.1, 0.1), GUNMAT.olive, 0.035, -0.06, magZ); break;
    case 'pan': mag = M(CY(0.1, 0.1, 0.03, 18), GUNMAT.dark, 0, -0.1, -0.02); break;
    case 'drum': mag = M(CY(0.07, 0.07, 0.04, 16), GUNMAT.black, 0, -0.06, -0.12, 0, 0, Math.PI / 2); break;
    case 'helix': mag = M(CY(0.025, 0.025, 0.22, 10), GUNMAT.black, 0, -0.01, recF - 0.08, Math.PI / 2); break;
    case 'grip': mag = M(BX(0.026, 0.12 * ext, 0.035), GUNMAT.black, 0, -0.1 * ext, 0.035, -0.32); break;
    case 'top': mag = M(BX(0.04, 0.02, 0.24), GUNMAT.dark, 0, 0.07, -0.1); break;
    case 'tube': mag = M(CY(0.012, 0.012, B * 0.8, 8), GUNMAT.steel, 0, 0.012, recF - B * 0.4, Math.PI / 2); break;
    case 'dbl': g.add(M(CY(0.012, 0.012, B, 8), GUNMAT.steel, 0, 0.012, recF - B / 2, Math.PI / 2)); break;
  }
  if (mag) { g.add(mag); info.magMesh = mag; info.magHome = mag.position.clone(); g.userData.mag = mag; }
  // 펌프/볼트
  if (st.mag === 'tube') g.add(M(BX(0.04, 0.035, 0.11), furn, 0, 0.012, recF - 0.12));
  if (w.bolt || id === 'win94') g.add(M(CY(0.007, 0.007, 0.06, 6), GUNMAT.steel, 0.04, 0.045, -0.02, 0, 0, Math.PI / 2));
  if (w.cat === 'LMG' || id === 'awm' || id === 'lynx') { // 양각대
    g.add(M(CY(0.006, 0.006, 0.18, 6), GUNMAT.dark, 0.02, -0.06, recF - B * 0.7, 0, 0, 0.25));
    g.add(M(CY(0.006, 0.006, 0.18, 6), GUNMAT.dark, -0.02, -0.06, recF - B * 0.7, 0, 0, -0.25));
  }
  if (w.cat === 'LMG' && (!att.scope || att.scope === 'iron')) g.add(M(BX(0.02, 0.025, 0.12), GUNMAT.dark, 0.03, 0.06, -0.05)); // 손잡이 (옆으로 비켜서)
  // 총구 장치
  let tip = recF - B;
  if (att.muzzle === 'supp') { g.add(M(CY(0.022, 0.022, 0.18, 12), GUNMAT.black, 0, 0.035, tip - 0.09, Math.PI / 2)); tip -= 0.18; }
  else if (att.muzzle === 'comp') { g.add(M(CY(0.016, 0.016, 0.065, 8), GUNMAT.dark, 0, 0.035, tip - 0.032, Math.PI / 2)); g.add(M(BX(0.034, 0.008, 0.04), GUNMAT.dark, 0, 0.048, tip - 0.03)); tip -= 0.065; }
  else if (att.muzzle === 'flash') { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.78; g.add(M(BX(0.006, 0.006, 0.05), GUNMAT.dark, Math.cos(a) * 0.012, 0.035 + Math.sin(a) * 0.012, tip - 0.025)); } tip -= 0.05; }
  else if (att.muzzle === 'choke' || att.muzzle === 'duck') { g.add(M(CY(0.014, att.muzzle === 'duck' ? 0.02 : 0.012, 0.06, 8), GUNMAT.dark, 0, 0.035, tip - 0.03, Math.PI / 2)); tip -= 0.06; }
  else { g.add(M(CY(0.012, 0.012, 0.03, 8), GUNMAT.dark, 0, 0.035, tip - 0.015, Math.PI / 2)); }
  info.muzzle.position.set(0, 0.035, tip);
  // 손잡이(그립)
  const gz = recF - hgL * 0.55;
  if (att.grip === 'vert') g.add(M(CY(0.014, 0.016, 0.08, 8), GUNMAT.black, 0, -0.035, gz));
  if (att.grip === 'angled') g.add(M(BX(0.03, 0.04, 0.07), GUNMAT.black, 0, -0.012, gz, -0.4));
  if (att.grip === 'half') g.add(M(BX(0.026, 0.035, 0.05), GUNMAT.black, 0, -0.012, gz));
  if (att.grip === 'thumb') g.add(M(BX(0.03, 0.022, 0.045), GUNMAT.black, 0, -0.008, gz));
  if (att.grip === 'light') g.add(M(BX(0.026, 0.026, 0.06), GUNMAT.dark, 0, -0.01, gz));
  if (att.grip === 'laser') { g.add(M(BX(0.026, 0.03, 0.05), GUNMAT.dark, 0, -0.012, gz)); g.add(M(CY(0.004, 0.004, 0.01, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 }), 0, -0.012, gz - 0.03, Math.PI / 2)); }
  // 아이언사이트 (조준경이 없을 때)
  const sightY = 0.083;
  if (w.cat === 'SG') { // 산탄총: 배그처럼 총열 위 가늠쇠(구슬)로 조준
    const top = 0.052;
    g.add(M(BX(0.012, 0.006, Math.min(B, 0.5)), GUNMAT.dark, 0, top - 0.004, recF - Math.min(B, 0.5) / 2)); // 총열 위 리브
    g.add(M(new THREE.SphereGeometry(0.0055, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe6a0 }), 0, top + 0.003, recF - B + 0.03));
    info.sightY = top + 0.003; info.sgBead = true;
  } else if (!att.scope || att.scope === 'iron' || w.integrated) {
    if (!w.integrated) {
      const fp = new THREE.Group(); fp.position.set(0, 0.0, recF - Math.min(B, 0.3) + 0.02);
      fp.add(M(BX(0.004, 0.022, 0.004), GUNMAT.black, 0, sightY - 0.01, 0));
      fp.add(M(BX(0.026, 0.026, 0.004), GUNMAT.dark, 0, sightY - 0.026, 0));
      g.add(fp);
      const ring = M(new THREE.TorusGeometry(0.009, 0.0035, 6, 14), GUNMAT.black, 0, sightY, 0.05); g.add(ring);
      g.add(M(BX(0.03, 0.012, 0.012), GUNMAT.dark, 0, sightY - 0.015, 0.05));
    }
    info.sightY = sightY;
  }
  if (w.integrated) { addScope(g, '4x', 0.11, -0.05, info); g.add(M(CY(0.024, 0.024, B, 10), GUNMAT.black, 0, 0.035, recF - B / 2, Math.PI / 2)); }
  else if (att.scope && att.scope !== 'iron') addScope(g, att.scope, 0.0, -0.06, info);
  gunExtras(g, id, { body, furn, R, B, recF, hgL, att, scoped: !!(att.scope && att.scope !== 'iron') });
  if (g.userData.mag && !info.magMesh) { info.magMesh = g.userData.mag; info.magHome = g.userData.mag.position.clone(); }
  // 장전 동작용: 탄 넣는 방식 + 장전 손잡이 위치
  info.loadType = info.magMesh && st.mag !== 'tube' ? 'mag' : 'shell';
  info.boltPos = w.cat === 'HG' ? new V3(0, 0.05, 0.02) : /akm|beryl|mk47|ace32|groza|sks|dragunov|s12k|dp28/.test(id) ? new V3(0.05, 0.045, -0.02) : new V3(0.0, 0.075, 0.1);
  info.eject.position.set(0.03, 0.05, -0.05);
  g.add(info.muzzle, info.eject);
  return info;
}

// ================= 석궁 =================
const XBMAT = {
  wood: new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.6 }),
  limb: new THREE.MeshStandardMaterial({ color: 0x1f2224, roughness: 0.5, metalness: 0.3 }),
  string: new THREE.MeshBasicMaterial({ color: 0xd8d2c0 }),
  bolt: new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 0.7 }),
  fletch: new THREE.MeshStandardMaterial({ color: 0xc23a2a, roughness: 0.8, side: THREE.DoubleSide }),
  tip: new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.3, metalness: 0.9 }),
};
function boltMesh() { // 화살(볼트) 하나: 앞쪽이 -z
  const b = new THREE.Group();
  b.add(M(CY(0.0045, 0.0045, 0.4, 6), XBMAT.bolt, 0, 0, 0, Math.PI / 2));
  b.add(M(new THREE.ConeGeometry(0.008, 0.035, 6), XBMAT.tip, 0, 0, -0.215, -Math.PI / 2));
  for (let k = 0; k < 3; k++) { const p = new THREE.Group(); p.rotation.z = k * Math.PI * 2 / 3; p.position.z = 0.16; p.add(M(new THREE.PlaneGeometry(0.06, 0.018), XBMAT.fletch, 0, 0.012, 0, 0, Math.PI / 2)); b.add(p); }
  return b;
}
function buildCrossbow(g, att, info) {
  // 개머리 + 몸통 (나무)
  g.add(M(BX(0.045, 0.06, 0.34), XBMAT.wood, 0, -0.005, 0.1));
  g.add(M(BX(0.05, 0.1, 0.06), XBMAT.wood, 0, -0.03, 0.27));
  g.add(M(BX(0.034, 0.1, 0.045), GUNMAT.dark, 0, -0.065, 0.02, -0.25));          // 손잡이
  g.add(M(BX(0.006, 0.006, 0.06), GUNMAT.dark, 0, -0.035, -0.02));               // 방아쇠울
  g.add(M(BX(0.03, 0.03, 0.5), XBMAT.limb, 0, 0.02, -0.3));                       // 앞 레일 (화살 놓는 곳)
  g.add(M(BX(0.022, 0.008, 0.24), GUNMAT.dark, 0, 0.064, -0.02));                 // 위 레일
  // 활 (양쪽 날개) — 앞쪽 끝
  const fz = -0.52;
  g.add(M(BX(0.07, 0.05, 0.06), XBMAT.limb, 0, 0.02, fz));
  const tips = [];
  for (const s of [-1, 1]) {
    const L = 0.3, ang = 0.32, cx = s * (0.035 + Math.cos(ang) * L / 2), cz = fz + Math.sin(ang) * L / 2;
    const limb = M(BX(L, 0.016, 0.03), XBMAT.limb, cx, 0.025, cz); limb.rotation.y = -s * ang; g.add(limb);
    tips.push(new V3(s * (0.035 + Math.cos(ang) * L), 0.03, fz + Math.sin(ang) * L));
  }
  // 줄: 날개 끝 → 걸쇠
  const latch = new V3(0, 0.035, -0.12);
  for (const t of tips) {
    const d = latch.clone().sub(t), len = d.length();
    const s = M(BX(0.003, 0.003, len), XBMAT.string, (t.x + latch.x) / 2, (t.y + latch.y) / 2, (t.z + latch.z) / 2);
    s.rotation.y = Math.atan2(d.x, d.z); g.add(s);
  }
  g.add(M(new THREE.TorusGeometry(0.03, 0.006, 6, 12), GUNMAT.dark, 0, 0.0, -0.58, Math.PI / 2)); // 발 거는 고리
  // 장전된 화살 (재장전 때 사라졌다 나타남)
  const bolt = boltMesh(); bolt.position.set(0, 0.042, -0.31); g.add(bolt);
  info.magMesh = bolt; info.magHome = bolt.position.clone(); g.userData.mag = bolt; info.xbBolt = bolt;
  // 조준기
  const sightY = 0.083;
  if (att.scope && att.scope !== 'iron') addScope(g, att.scope, 0.0, -0.04, info);
  else {
    g.add(M(BX(0.004, 0.022, 0.004), GUNMAT.black, 0, sightY - 0.01, -0.46));
    g.add(M(new THREE.TorusGeometry(0.009, 0.0035, 6, 14), GUNMAT.black, 0, sightY, 0.05));
    g.add(M(BX(0.03, 0.012, 0.012), GUNMAT.dark, 0, sightY - 0.015, 0.05));
    info.sightY = sightY;
  }
  info.muzzle.position.set(0, 0.042, -0.56); info.eject.position.set(0, 0.04, -0.1);
  g.add(info.muzzle, info.eject);
  return info;
}

// ================= 총마다 다른 생김새 =================
const GX = {
  wood2: new THREE.MeshStandardMaterial({ color: 0x8a5a2e, roughness: 0.6 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x5a3519, roughness: 0.65 }),
  poly: new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.85 }),
  tanDark: new THREE.MeshStandardMaterial({ color: 0x8f7a56, roughness: 0.75 }),
  green: new THREE.MeshStandardMaterial({ color: 0x3f4f36, roughness: 0.7 }),
  sand: new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 0.8 }),
  clearMag: new THREE.MeshStandardMaterial({ color: 0x6b7a5a, roughness: 0.3, transparent: true, opacity: 0.75 }),
  silver: new THREE.MeshStandardMaterial({ color: 0xa9adb3, roughness: 0.3, metalness: 0.9 }),
};
function gunExtras(g, id, o) {
  const { body, furn, R, B, recF, hgL, att, scoped } = o;
  const add = (m) => { g.add(m); return m; };
  const ribs = (mat, z0, len, y = 0.025) => { for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) add(M(BX(0.006, 0.006, len), mat, sx * 0.026, y - 0.015 + k * 0.014, z0 - len / 2)); };
  const gasTube = (len) => add(M(CY(0.008, 0.008, len, 8), GUNMAT.steel, 0, 0.058, recF - len / 2, Math.PI / 2));
  const tubeStock = (mat, len = 0.2) => { add(M(CY(0.014, 0.014, len, 10), GUNMAT.dark, 0, 0.02, 0.08 + len / 2, Math.PI / 2)); add(M(BX(0.036, 0.075, 0.07), mat, 0, 0.0, 0.08 + len - 0.02)); };
  const skelStock = (mat, len = 0.22, h = 0.08) => { add(M(BX(0.012, 0.012, len), mat, 0, 0.03, 0.08 + len / 2)); add(M(BX(0.012, 0.012, len * 0.9), mat, 0, 0.03 - h, 0.08 + len * 0.45, 0.25)); add(M(BX(0.02, h + 0.02, 0.018), mat, 0, 0.03 - h / 2, 0.08 + len)); };
  const fins = (n, r, z0, len) => { for (let k = 0; k < n; k++) add(M(CY(r, r, 0.006, 10), GUNMAT.dark, 0, 0.035, z0 - (k + 0.5) * len / n, Math.PI / 2)); };
  const jacket = (r, z0, len, mat = GUNMAT.dark) => { add(M(CY(r, r, len, 12, true), mat, 0, 0.035, z0 - len / 2, Math.PI / 2)); for (let k = 0; k < 5; k++) add(M(new THREE.TorusGeometry(r, 0.003, 4, 12), mat, 0, 0.035, z0 - (k + 0.5) * len / 5)); };
  const bipod = (z) => { for (const sx of [-1, 1]) add(M(CY(0.005, 0.005, 0.2, 6), GUNMAT.dark, sx * 0.02, -0.07, z, 0, 0, sx * 0.3)); };
  switch (id) {
    case 'm416': ribs(GUNMAT.dark, recF, hgL * 0.95); tubeStock(GUNMAT.black, 0.17); add(M(BX(0.03, 0.03, 0.04), GUNMAT.black, 0, -0.03, -0.1)); break;
    case 'akm': gasTube(0.22); add(M(BX(0.03, 0.06, 0.05), GUNMAT.wood, 0, -0.05, 0.03, -0.3)); add(M(BX(0.052, 0.012, R * 0.7), GUNMAT.steel, 0, 0.062, -R * 0.25 + 0.08)); break;
    case 'beryl': gasTube(0.2); ribs(GUNMAT.dark, recF, hgL * 0.9); add(M(BX(0.03, 0.03, 0.2), GX.poly, 0, -0.005, 0.18)); break;
    case 'ace32': gasTube(0.2); skelStock(GX.poly, 0.2, 0.06); break;
    case 'scar': add(M(BX(0.046, 0.035, R * 0.75), GUNMAT.black, 0, -0.012, -R * 0.4 + 0.08)); add(M(BX(0.05, 0.08, 0.2), GUNMAT.tan, 0, 0.0, 0.2)); add(M(BX(0.052, 0.02, 0.1), GUNMAT.black, 0, 0.045, 0.2)); ribs(GX.tanDark, recF, hgL * 0.8); break;
    case 'aug': add(M(CY(0.045, 0.04, 0.3, 14), GUNMAT.olive, 0, 0.0, 0.05, Math.PI / 2)); add(M(BX(0.028, 0.09, 0.04), GUNMAT.olive, 0, -0.06, recF + 0.05, 0.3)); break;
    case 'groza': add(M(BX(0.05, 0.05, 0.26), GX.poly, 0, -0.005, 0.07)); add(M(BX(0.04, 0.03, 0.08), GUNMAT.wood, 0, -0.045, recF + 0.02)); break;
    case 'qbz': add(M(BX(0.048, 0.07, 0.3), GUNMAT.olive, 0, -0.005, 0.05)); add(M(BX(0.012, 0.06, 0.1), GUNMAT.olive, 0, -0.055, -0.06)); break;
    case 'g36c': skelStock(GX.poly, 0.2, 0.07); if (g.children) g.traverse(m => { if (m.isMesh && m === g.userData.mag) m.material = GX.clearMag; }); break;
    case 'm16': add(M(CY(0.024, 0.024, hgL, 12), GUNMAT.black, 0, 0.025, recF - hgL / 2, Math.PI / 2)); add(M(new THREE.ConeGeometry(0.015, 0.05, 4), GUNMAT.black, 0, 0.05, recF - B * 0.85)); add(M(BX(0.04, 0.07, 0.24), GUNMAT.black, 0, 0.0, 0.2)); break;
    case 'mk47': add(M(BX(0.056, 0.07, 0.12), GUNMAT.black, 0, 0.02, -0.02)); tubeStock(GX.poly, 0.15); break;
    case 'famas': add(M(BX(0.05, 0.075, 0.34), GX.poly, 0, 0.0, 0.03)); bipod(recF - 0.02); break;
    case 'ump': add(M(BX(0.052, 0.085, R * 0.8), GUNMAT.black, 0, 0.005, -R * 0.35 + 0.08)); skelStock(GX.poly, 0.18, 0.06); break;
    case 'vector': add(M(BX(0.05, 0.11, 0.16), GX.poly, 0, -0.04, -0.07, -0.5)); add(M(BX(0.045, 0.04, 0.2), GUNMAT.dark, 0, 0.03, -0.05)); tubeStock(GX.poly, 0.12); break;
    case 'uzi': add(M(BX(0.05, 0.075, 0.24), GUNMAT.dark, 0, 0.025, -0.04)); add(M(BX(0.012, 0.012, 0.2), GUNMAT.steel, 0, 0.0, 0.14)); break;
    case 'tommy': fins(6, 0.02, recF, 0.12); add(M(BX(0.03, 0.08, 0.05), GUNMAT.wood, 0, -0.05, recF - 0.05, -0.15)); add(M(BX(0.045, 0.09, 0.26), GUNMAT.wood, 0, -0.015, 0.21)); break;
    case 'bizon': gasTube(0.12); skelStock(GUNMAT.steel, 0.2, 0.05); break;
    case 'mp5k': add(M(BX(0.028, 0.08, 0.035), GX.poly, 0, -0.05, recF + 0.02, 0.1)); add(M(CY(0.025, 0.025, 0.12, 10), GUNMAT.black, 0, 0.03, -0.12, Math.PI / 2)); break;
    case 'p90': add(M(BX(0.06, 0.12, 0.42), GX.poly, 0, -0.02, -0.04)); add(M(new THREE.TorusGeometry(0.03, 0.01, 6, 12), GX.poly, 0, -0.07, 0.04, 0, Math.PI / 2)); break;
    case 'js9': add(M(BX(0.05, 0.07, 0.2), GX.poly, 0, 0.01, -0.03)); skelStock(GUNMAT.black, 0.16, 0.05); break;
    case 'sks': add(M(BX(0.05, 0.05, B * 0.85), GUNMAT.wood, 0, 0.005, recF - B * 0.42)); add(M(CY(0.005, 0.005, 0.25, 6), GUNMAT.steel, 0, -0.012, recF - 0.18, Math.PI / 2)); break;
    case 'slr': add(M(BX(0.05, 0.05, 0.2), GUNMAT.wood, 0, 0.0, recF - 0.1)); add(M(BX(0.048, 0.02, 0.15), GUNMAT.black, 0, 0.05, -0.1)); break;
    case 'mini14': add(M(BX(0.052, 0.04, R * 0.8), GX.silver, 0, 0.035, -R * 0.35 + 0.08)); add(M(BX(0.05, 0.05, B * 0.7), GUNMAT.wood, 0, 0.0, recF - B * 0.3)); break;
    case 'mk14': ribs(GUNMAT.black, recF + 0.05, 0.3); add(M(CY(0.016, 0.016, 0.24, 10), GUNMAT.black, 0, 0.02, 0.2, Math.PI / 2)); add(M(BX(0.04, 0.09, 0.06), GX.poly, 0, -0.005, 0.32)); add(M(BX(0.05, 0.07, 0.06), GX.poly, 0, -0.06, 0.06)); break;
    case 'qbu': add(M(BX(0.05, 0.07, 0.36), GUNMAT.olive, 0, 0.0, 0.03)); bipod(recF - 0.15); break;
    case 'vss': skelStock(GUNMAT.wood, 0.24, 0.08); break;
    case 'mk12': add(M(CY(0.022, 0.022, 0.32, 10), GX.tanDark, 0, 0.025, recF - 0.16, Math.PI / 2)); tubeStock(GX.tanDark, 0.18); bipod(recF - 0.25); break;
    case 'dragunov': skelStock(GUNMAT.wood, 0.28, 0.1); add(M(BX(0.045, 0.045, 0.22), GUNMAT.wood, 0, 0.01, recF - 0.11)); break;
    case 'kar98k': add(M(BX(0.045, 0.05, B * 0.95), GX.wood2, 0, 0.005, recF - B * 0.47)); add(M(BX(0.046, 0.1, 0.1), GX.wood2, 0, -0.05, 0.06, -0.4)); add(M(new THREE.SphereGeometry(0.012, 8, 6), GUNMAT.steel, 0.05, 0.045, -0.02)); break;
    case 'mosin': add(M(BX(0.045, 0.05, B * 1.02), GX.woodDark, 0, 0.005, recF - B * 0.5)); add(M(BX(0.046, 0.09, 0.1), GX.woodDark, 0, -0.04, 0.06, -0.35)); add(M(new THREE.SphereGeometry(0.012, 8, 6), GUNMAT.steel, 0.05, 0.04, 0.0)); break;
    case 'm24': add(M(BX(0.05, 0.06, B * 0.85), GUNMAT.olive, 0, 0.0, recF - B * 0.42)); add(M(BX(0.05, 0.11, 0.1), GUNMAT.olive, 0, -0.05, 0.08, -0.35)); break;
    case 'awm': add(M(BX(0.06, 0.08, 0.5), GX.green, 0, 0.0, 0.0)); add(M(new THREE.TorusGeometry(0.035, 0.012, 6, 12), GX.green, 0, -0.03, 0.12, 0, Math.PI / 2)); if (!att.muzzle) add(M(BX(0.05, 0.03, 0.07), GUNMAT.black, 0, 0.035, recF - B - 0.03)); break;
    case 'win94': add(M(new THREE.TorusGeometry(0.035, 0.006, 6, 14), GUNMAT.steel, 0, -0.06, 0.04, 0, Math.PI / 2)); add(M(CY(0.01, 0.01, B * 0.8, 8), GUNMAT.steel, 0, 0.012, recF - B * 0.4, Math.PI / 2)); add(M(BX(0.044, 0.04, 0.16), GX.wood2, 0, 0.005, recF - 0.08)); break;
    case 'lynx': add(M(BX(0.07, 0.1, 0.5), GX.poly, 0, 0.0, 0.0)); add(M(BX(0.07, 0.05, 0.1), GUNMAT.black, 0, 0.035, recF - B - 0.05)); bipod(recF - 0.2); break;
    case 's1897': // 펌프식: 나무 개머리 + 나무 펌프 + 바깥으로 나온 공이치기
      add(M(BX(0.008, 0.03, 0.012), GUNMAT.steel, 0, 0.07, 0.06, 0.4)); add(M(BX(0.045, 0.1, 0.26), GX.wood2, 0, -0.025, 0.21, 0.08));
      add(M(BX(0.05, 0.042, 0.13), GX.wood2, 0, 0.008, recF - 0.16)); for (let k = 0; k < 4; k++) add(M(BX(0.052, 0.004, 0.006), GX.woodDark, 0, 0.03, recF - 0.11 - k * 0.025)); break;
    case 's686': { // 상하 2연발: 총열 두 개가 위아래로, 나무 손잡이와 개머리
      for (const y of [0.03, 0.058]) add(M(CY(0.012, 0.012, B, 10), GUNMAT.steel, 0, y, recF - B / 2, Math.PI / 2));
      add(M(BX(0.012, 0.006, B), GUNMAT.dark, 0, 0.072, recF - B / 2));
      add(M(BX(0.046, 0.04, B * 0.42), GX.wood2, 0, 0.012, recF - B * 0.22));
      add(M(BX(0.05, 0.075, 0.1), GUNMAT.steel, 0, 0.03, 0.02)); // 은색 몸통
      add(M(BX(0.045, 0.06, 0.1), GX.wood2, 0, -0.03, 0.1, -0.35)); add(M(BX(0.045, 0.09, 0.24), GX.wood2, 0, -0.03, 0.24, 0.12));
      break;
    }
    case 'sawed': { // 짧은 수평 2연발 + 나무 권총 손잡이
      for (const x of [-0.013, 0.013]) add(M(CY(0.013, 0.013, B, 10), GUNMAT.steel, x, 0.04, recF - B / 2, Math.PI / 2));
      add(M(BX(0.05, 0.03, B * 0.6), GX.wood2, 0, 0.018, recF - B * 0.3)); add(M(BX(0.04, 0.11, 0.05), GX.wood2, 0, -0.05, 0.07, -0.5));
      break;
    }
    case 's12k': // AK처럼 생긴 반자동: 큰 탄창, 덮개, 접이식 개머리
      gasTube(0.2); add(M(BX(0.054, 0.014, R * 0.75), GUNMAT.steel, 0, 0.062, -R * 0.25 + 0.08));
      { const mg = M(BX(0.045, 0.15, 0.085), GUNMAT.black, 0, -0.09, -0.07, 0.18); add(mg); g.userData.mag = mg; }
      skelStock(GUNMAT.black, 0.22, 0.07); add(M(BX(0.05, 0.05, 0.16), GX.poly, 0, 0.022, recF - 0.08)); break;
    case 'dbs': // 불펍: 총열 위에 튜브 탄창 두 개, 손잡이 위쪽 운반 손잡이
      add(M(BX(0.058, 0.085, 0.38), GX.poly, 0, 0.0, 0.04));
      for (const x of [-0.016, 0.016]) add(M(CY(0.013, 0.013, 0.42, 10), GUNMAT.dark, x, 0.07, recF + 0.02, Math.PI / 2));
      add(M(BX(0.05, 0.035, 0.12), GX.poly, 0, 0.0, recF - 0.12)); add(M(BX(0.02, 0.03, 0.18), GUNMAT.black, 0, 0.1, -0.02)); break;
    case 'o12': { // 오리진-12: 큰 원통형 드럼 탄창, 긴 위 레일, 굵은 총구 제동기, 접이 개머리
      const drum = M(CY(0.088, 0.088, 0.075, 22), GUNMAT.black, 0, -0.105, -0.06, 0, 0, Math.PI / 2); add(drum); g.userData.mag = drum;
      add(M(CY(0.03, 0.03, 0.08, 12), GUNMAT.dark, 0, -0.105, -0.06, 0, 0, Math.PI / 2));
      add(M(BX(0.058, 0.08, R * 0.9), GX.poly, 0, 0.02, -R * 0.4 + 0.08));
      add(M(BX(0.024, 0.01, R * 1.25), GUNMAT.dark, 0, 0.066, -R * 0.55 + 0.08));
      ribs(GUNMAT.dark, recF, 0.2, 0.03);
      add(M(BX(0.05, 0.05, 0.08), GUNMAT.black, 0, 0.035, recF - B - 0.04)); for (let k = 0; k < 3; k++) add(M(BX(0.052, 0.008, 0.012), GUNMAT.dark, 0, 0.035 + (k - 1) * 0.016, recF - B - 0.04));
      tubeStock(GX.poly, 0.18); break;
    }
    case 'm249': add(M(BX(0.05, 0.04, 0.2), GUNMAT.dark, 0, 0.055, recF - 0.1)); add(M(BX(0.045, 0.07, 0.22), GUNMAT.black, 0, -0.005, 0.2)); break;
    case 'dp28': jacket(0.024, recF, B * 0.8, GUNMAT.dark); add(M(BX(0.045, 0.08, 0.25), GX.wood2, 0, -0.01, 0.2)); bipod(recF - B * 0.7); break;
    case 'mg3': jacket(0.026, recF, B * 0.85, GUNMAT.black); add(M(BX(0.045, 0.08, 0.24), GX.poly, 0, -0.01, 0.2)); break;
  }
}

function addScope(g, scope, yOff, zc, info, small) {
  const base = small ? 0.072 : 0.07;
  const s = new THREE.Group(); g.add(s);
  if (scope === 'reddot') { // 배그 레드 도트: 짧은 원통형 조준기 (마운트 위, 오른쪽에 밝기 다이얼)
    const y = base + 0.034, r = 0.0175, L = 0.05;
    s.add(M(BX(0.028, 0.008, 0.05), GUNMAT.black, 0, base + 0.004, zc));                // 레일 마운트
    s.add(M(BX(0.018, y - r - base, 0.03), GUNMAT.black, 0, base + (y - r - base) / 2 + 0.004, zc)); // 받침
    const tube = M(CY(r, r, L, 20, true), GUNMAT.black, 0, y, zc, Math.PI / 2); tube.material = tube.material.clone(); tube.material.side = THREE.DoubleSide; s.add(tube);
    s.add(M(new THREE.TorusGeometry(r, 0.0022, 6, 20), GUNMAT.black, 0, y, zc - L / 2));  // 앞 테두리
    s.add(M(new THREE.TorusGeometry(r, 0.0022, 6, 20), GUNMAT.black, 0, y, zc + L / 2));  // 뒤 테두리
    s.add(M(CY(0.007, 0.007, 0.012, 10), GUNMAT.dark, r + 0.004, y, zc, 0, 0, Math.PI / 2)); // 밝기 다이얼
    s.add(M(CY(0.006, 0.006, 0.01, 10), GUNMAT.dark, 0, y + r + 0.004, zc));              // 위 조절 다이얼
    s.add(M(new THREE.CircleGeometry(r * 0.95, 20), GUNMAT.lensRed, 0, y, zc - L / 2 + 0.003));
    info.sightY = y;
  } else if (scope === 'holo') { // 배그 홀로그램: 네모난 창 + 위 덮개 + 뒤쪽 배터리 칸
    const y = base + 0.032;
    s.add(M(BX(0.034, 0.016, 0.075), GUNMAT.black, 0, base + 0.008, zc + 0.008));          // 아래 몸통
    s.add(M(BX(0.03, 0.022, 0.026), GUNMAT.black, 0, base + 0.026, zc + 0.034));           // 뒤 배터리·버튼 칸
    for (const sx of [-1, 1]) s.add(M(BX(0.004, 0.04, 0.04), GUNMAT.black, sx * 0.019, y + 0.003, zc - 0.012)); // 옆 창틀
    s.add(M(BX(0.042, 0.005, 0.044), GUNMAT.black, 0, y + 0.024, zc - 0.012));             // 위 덮개
    s.add(M(BX(0.034, 0.004, 0.004), GUNMAT.dark, 0, y - 0.016, zc - 0.033));              // 창 아래 테
    s.add(M(new THREE.PlaneGeometry(0.034, 0.036), GUNMAT.lensRed, 0, y + 0.003, zc - 0.03));
    info.sightY = y + 0.003;
  } else {
    const z = scopeZoom(scope);
    const len = { 2: 0.1, 3: 0.14, 4: 0.17, 6: 0.2, 8: 0.26, 15: 0.32 }[z] || 0.16;
    const r = z >= 8 ? 0.022 : z >= 4 ? 0.02 : 0.017;
    const y = base + 0.012 + r + yOff * 0.2;
    const tube = M(CY(r, r, len, 16, true), GUNMAT.black, 0, y, zc, Math.PI / 2); tube.material = tube.material.clone(); tube.material.side = THREE.DoubleSide; s.add(tube);
    if (z >= 3) { // 앞뒤 렌즈통
      s.add(M(CY(r * 1.35, r, 0.04, 16, true), GUNMAT.black, 0, y, zc - len / 2 - 0.02, Math.PI / 2));
      s.add(M(CY(r * 1.25, r * 1.25, 0.04, 16, true), GUNMAT.black, 0, y, zc + len / 2 + 0.02, Math.PI / 2));
      s.add(M(CY(0.008, 0.008, 0.03, 8), GUNMAT.black, 0, y + r, zc));
    }
    s.add(M(BX(0.02, y - base, 0.02), GUNMAT.black, 0, base + (y - base) / 2, zc - len * 0.3));
    s.add(M(BX(0.02, y - base, 0.02), GUNMAT.black, 0, base + (y - base) / 2, zc + len * 0.3));
    const lens = M(new THREE.CircleGeometry(r * 0.92, 16), GUNMAT.lens, 0, y, zc - len / 2 - (z >= 3 ? 0.038 : 0));
    s.add(lens);
    info.sightY = y; info.scopeBody = s;
  }
}

// ================= 던지는 무기 =================
const THROWABLES = {
  frag: { name: '세열 수류탄', fuse: 5.0, count: 2, color: 0x3f4a2e },
  smoke: { name: '연막탄', fuse: 2.0, count: 1, color: 0x8a8f94 },
  flash: { name: '섬광탄', fuse: 2.5, count: 1, color: 0x2d3a4d },
};
function buildGrenadeModel(type) {
  const g = new THREE.Group(), c = THROWABLES[type].color;
  const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.2 });
  if (type === 'frag') { const b = M(new THREE.SphereGeometry(0.035, 12, 10), mat, 0, 0, 0); b.scale.y = 1.2; g.add(b); }
  else g.add(M(CY(0.028, 0.028, 0.11, 12), mat, 0, 0, 0));
  g.add(M(BX(0.012, 0.03, 0.04), GUNMAT.steel, 0.012, 0.05, 0));
  const ring = M(new THREE.TorusGeometry(0.012, 0.003, 6, 12), GUNMAT.steel, -0.02, 0.06, 0); g.add(ring); g.userData.ring = ring; // 핀 고리
  return g;
}
