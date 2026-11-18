// ================= 훈련장 (발로란트 스타일 사격장) =================
const RX = 300; // 사격장 중심 x (경기장과 떨어진 곳)
const RANGE = {
  built: false, dummies: [], targets: [], mode: 'free', dmgNums: true, infAmmo: true, armor: 2, strafeSpeed: 1,
  shots: 0, hits: 0, heads: 0, last: null, game: null, respawnQ: [], playerDeadT: 0,
  bounds: { minX: RX - 22, maxX: RX + 22, minZ: -62, maxZ: 62 },
  spawn: new V3(RX, 0, 54),
};
function textPlane(text, w, h, opt = {}) {
  const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * h / w);
  const g = c.getContext('2d');
  g.fillStyle = opt.bg || '#1d2126'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = opt.color || '#ffd24a'; g.font = `800 ${opt.size || 72}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  return m;
}
function buildRange() {
  if (RANGE.built) return; RANGE.built = true;
  const B = RANGE.bounds;
  // 바닥
  const ft = TEX.concrete.clone(); ft.needsUpdate = true; ft.repeat.set(11, 32);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(B.maxX - B.minX, B.maxZ - B.minZ), new THREE.MeshStandardMaterial({ map: ft, color: 0x7d8288, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(RX, 0.0, 0); floor.receiveShadow = true; scene.add(floor);
  // 벽
  const wm = new THREE.MeshStandardMaterial({ map: TEX.concrete, color: 0x9aa3ad, roughness: 0.9 });
  addBox(B.minX - 0.5, 0, 0, 1, 8, B.maxZ - B.minZ + 2, wm, { texScale: 3 });
  addBox(B.maxX + 0.5, 0, 0, 1, 8, B.maxZ - B.minZ + 2, wm, { texScale: 3 });
  addBox(RX, 0, B.minZ - 0.5, B.maxX - B.minX + 2, 12, 1, wm, { texScale: 3 });
  addBox(RX, 0, B.maxZ + 0.5, B.maxX - B.minX + 2, 8, 1, wm, { texScale: 3 });
  // 사격선 + 거리 표시
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xff4655 });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(B.maxX - B.minX, 0.12), lineMat); fl.rotation.x = -Math.PI / 2; fl.position.set(RX, 0.03, 48); scene.add(fl);
  for (const d of [10, 20, 30, 50, 75, 100]) {
    const z = 48 - d;
    const l = new THREE.Mesh(new THREE.PlaneGeometry(B.maxX - B.minX, 0.06), new THREE.MeshBasicMaterial({ color: 0xd8dde3, transparent: true, opacity: 0.6 }));
    l.rotation.x = -Math.PI / 2; l.position.set(RX, 0.03, z); scene.add(l);
    for (const x of [B.minX + 0.05, B.maxX - 0.05]) {
      const s = textPlane(d + 'm', 1.6, 0.7); s.position.set(x, 2.6, z); s.rotation.y = x < RX ? Math.PI / 2 : -Math.PI / 2; scene.add(s);
    }
  }
  // 구역 이름판
  const sign = (t, x, z, w = 4) => { const s = textPlane(t, w, 0.8, { size: 54, color: '#ffffff', bg: '#ff4655' }); s.position.set(x, 5.6, z); scene.add(s); };
  sign('거리별 표적', RX, 44, 4.4); sign('무빙 봇', RX - 14, 44, 3.6); sign('헬멧·조끼', RX + 14, 44, 3.6);
  // 레인 칸막이 (낮은 벽)
  for (const x of [RX - 7.5, RX + 7.5]) addBox(x, 0, 30, 0.3, 1.0, 34, MAT.concreteDark, { texScale: 2, kind: 'barrier' });
  // 움직임 연습: 넘을 벽, 올라갈 상자, 컨테이너
  const C = MAT.concrete;
  addBox(RX - 16, 0, 55, 4, 1.0, 0.6, C, { kind: 'barrier' });
  addBox(RX - 9, 0, 57, 1.4, 1.4, 1.4, MAT.wood, { texScale: 0, kind: 'wood' });
  addBox(RX - 9, 1.4, 57, 1.4, 1.4, 1.4, MAT.wood, { texScale: 0, kind: 'wood' });
  container(RX + 15, 0, 56, false, true, 1);
  stairs(RX + 9.5, 56, 1.4, 8, 2.6 / 8, 0.4, 'x+', MAT.metal);
  addBox(RX + 6, 0, 52, 0.5, 2.2, 3, C);
  // 총 거치대 (보기용)
  const rack = new THREE.Group(); rack.position.set(RX - 18, 0, 60);
  rack.add(M(BX(3, 0.08, 0.6), MAT.dark, 0, 1.0, 0)); rack.add(M(BX(3, 1.0, 0.08), MAT.dark, 0, 0.5, 0.26));
  ['m416', 'akm', 'kar98k', 'ump'].forEach((id, i) => { const g = buildGunModel(id, fullAttachments(id)).group; g.position.set(-1.1 + i * 0.75, 1.15, 0); g.rotation.y = Math.PI / 2; rack.add(g); });
  scene.add(rack);
  const tip = textPlane('~ 총 바꾸기 · Tab 훈련장 메뉴', 6, 0.7, { size: 30, color: '#ffffff', bg: '#1d2126' }); tip.position.set(RX, 3.4, B.maxZ - 0.02); tip.rotation.y = Math.PI; scene.add(tip);
  // 표적 더미
  const mk = (x, d, kind, extra = {}) => {
    const a = new Actor('표적', false, { shirt: 0xff4655, pants: 0x2a2f36, pack: 0x1d2126, skin: 0xe8c9b0 });
    a.dummy = true; a.kind = kind; a.home = new V3(x, 0, 48 - d); a.dist = d; Object.assign(a, extra);
    a.getAim = () => {}; a.soldier.setGun(null);
    RANGE.dummies.push(a); return a;
  };
  for (const d of [10, 20, 30, 50, 75, 100]) mk(RX, d, 'static');
  mk(RX - 14, 12, 'strafe', { span: 5.5, phase: 0 }); mk(RX - 14, 22, 'strafe', { span: 5.5, phase: 1.7 }); mk(RX - 14, 35, 'strafe', { span: 5.5, phase: 3.1, crouchy: true });
  [0, 1, 2, 3].forEach((lv, i) => mk(RX + 9.5 + i * 3, 18, 'armor', { armorLv: lv }));
  for (const lv of [0, 1, 2, 3]) { const s = textPlane('Lv.' + lv, 1.2, 0.5, { size: 64, color: '#ffffff' }); s.position.set(RX + 9.5 + lv * 3, 2.3, 48 - 18); s.rotation.y = 0; scene.add(s); s.rotation.y = 0; s.lookAt(RX + 9.5 + lv * 3, 2.3, 60); }
  for (const a of RANGE.dummies) a.soldier.setVisible(false);
}
function dummyReset(a) {
  a.reset(); a.soldier.setGun(null);
  const lv = a.kind === 'armor' ? a.armorLv : RANGE.armor;
  a.helmet = { lv, dur: ARMOR.helmet.dur[lv] }; a.vest = { lv, dur: ARMOR.vest.dur[lv] }; a.soldier.setArmor(lv, lv);
  a.pos.copy(a.home); a.yaw = Math.atan2(-(RX - a.home.x) * 0, -(60 - a.home.z)) + Math.PI; a.yaw = 0; // 사격선 쪽을 봄
  a.yaw = Math.atan2(-(RANGE.spawn.x - a.pos.x), -(RANGE.spawn.z - a.pos.z));
  a.afterMove(0);
}

// ---- 모드 전환 ----
function enterRange() {
  buildRange();
  G.mode = 'range'; G.state = 'range'; G.round = 0;
  $('start').style.display = 'none'; $('end').style.display = 'none';
  WORLD.bounds = RANGE.bounds;
  BOT.soldier.setVisible(false);
  ACTORS.length = 0; ACTORS.push(PLAYER);
  for (const a of RANGE.dummies) { if (a.kind !== 'target') { ACTORS.push(a); dummyReset(a); a.soldier.setVisible(true); } }
  clearCombat();
  PLAYER.setLoadout(playerLoadoutList()); PLAYER.reset();
  PLAYER.pos.copy(RANGE.spawn); PLAYER.yaw = 0; PLAYER.pitch = 0; PLAYER.afterMove(0);
  CAM.eyeSmooth.copy(PLAYER.eyePos);
  RANGE.mode = 'free'; RANGE.game = null; RANGE.shots = RANGE.hits = RANGE.heads = 0; RANGE.last = null;
  buildViewmodel();
  HUD.message('훈련장', 'Tab 메뉴 · ~ 총 바꾸기 · 총알 무한', 3);
  lockPointer();
}
function clearCombat() {
  if (typeof HUD !== 'undefined') { HUD.flashV = 0; HUD.hurtV = 0; }
  for (const b of BULLETS) if (b.tracer) b.tracer.visible = false; BULLETS.length = 0;
  for (const g of GRENADES) scene.remove(g.mesh); GRENADES.length = 0;
  for (const s of WORLD.smokes) for (const p of s.puffs) scene.remove(p.sprite); WORLD.smokes.length = 0;
  for (const d of decals) if (d) d.position.y = -100;
}
// ---- 타겟 연습 ----
const TP_DIFF = { easy: { name: '쉬움', life: 3.0, gap: 0.5 }, medium: { name: '보통', life: 1.6, gap: 0.35 }, hard: { name: '어려움', life: 0.95, gap: 0.25 } };
function startTargetPractice(diff) {
  closeRangeMenu();
  // 표적 더미 숨기기
  for (const a of RANGE.dummies) a.soldier.setVisible(false);
  ACTORS.length = 0; ACTORS.push(PLAYER);
  for (const t of RANGE.targets) { t.soldier.setVisible(false); }
  RANGE.game = { diff, total: 30, spawned: 0, kills: 0, misses: 0, reactions: [], t: -3, next: 0, shots: 0, hits: 0, active: [] };
  PLAYER.pos.copy(RANGE.spawn); PLAYER.yaw = 0; PLAYER.pitch = 0;
  HUD.message('타겟 연습 · ' + TP_DIFF[diff].name, '30개 표적을 최대한 빨리 맞히세요 (한 발이면 쓰러져요)', 2.8);
  AU.beep(660);
}
function getTarget() {
  let t = RANGE.targets.find(x => !x.inUse);
  if (!t) {
    t = new Actor('표적', false, { shirt: 0xff4655, pants: 0x2a2f36, pack: 0x1d2126, skin: 0xe8c9b0 });
    t.dummy = true; t.kind = 'target'; t.getAim = () => {}; t.home = new V3();
    RANGE.targets.push(t);
  }
  t.inUse = true; return t;
}
function stopTargetPractice(show) {
  const g = RANGE.game; if (!g) return;
  for (const t of RANGE.targets) { t.inUse = false; t.soldier.setVisible(false); }
  RANGE.game = null;
  ACTORS.length = 0; ACTORS.push(PLAYER);
  for (const a of RANGE.dummies) { ACTORS.push(a); dummyReset(a); a.soldier.setVisible(true); }
  if (show) {
    const avg = g.reactions.length ? g.reactions.reduce((s, x) => s + x, 0) / g.reactions.length : 0;
    const acc = g.shots ? Math.round(g.hits / g.shots * 100) : 0;
    const key = 'tg1v1_tp_' + g.diff; let best = null;
    try { best = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
    const isBest = !best || g.kills > best.kills || (g.kills === best.kills && avg < best.avg);
    if (isBest) try { localStorage.setItem(key, JSON.stringify({ kills: g.kills, avg })); } catch (e) {}
    HUD.message(`${g.kills} / ${g.total} 처치${isBest ? ' · 최고 기록!' : ''}`, `평균 반응 ${Math.round(avg * 1000)}ms · 명중률 ${acc}%${best && !isBest ? ` · 최고 ${best.kills}개 ${Math.round(best.avg * 1000)}ms` : ''}`, 6, 'win');
  }
}
function updateTargetPractice(dt) {
  const g = RANGE.game; if (!g) return;
  g.t += dt;
  if (g.t < 0) { const s = Math.ceil(-g.t); if (s !== g.lastS) { g.lastS = s; HUD.message(String(s), '', 0.8); AU.beep(660); } return; }
  const D = TP_DIFF[g.diff];
  // 시간 지나면 사라짐
  for (const t of g.active.slice()) {
    t.age += dt;
    if (!t.dead && t.age > D.life) { g.misses++; t.inUse = false; t.soldier.setVisible(false); fx.poof && fx.poof(t.hitbox.chestTop); g.active.splice(g.active.indexOf(t), 1); ACTORS.splice(ACTORS.indexOf(t), 1); }
    else if (t.dead && t.age > t.deadAt + 0.35) { t.inUse = false; t.soldier.setVisible(false); g.active.splice(g.active.indexOf(t), 1); const i = ACTORS.indexOf(t); if (i >= 0) ACTORS.splice(i, 1); }
  }
  g.next -= dt;
  if (g.spawned < g.total && g.next <= 0 && g.active.filter(t => !t.dead).length < 1) {
    const t = getTarget();
    t.reset(); t.health = 1; t.helmet = { lv: 0, dur: 0 }; t.vest = { lv: 0, dur: 0 }; t.soldier.setArmor(0, 0); t.soldier.setGun(null);
    const d = rand(8, 38), x = rand(RANGE.bounds.minX + 2, RANGE.bounds.maxX - 2);
    t.pos.set(x, 0, 48 - d); t.home.copy(t.pos);
    t.stance = Math.random() < 0.25 ? 'crouch' : 'stand';
    t.yaw = Math.atan2(-(PLAYER.pos.x - t.pos.x), -(PLAYER.pos.z - t.pos.z));
    t.age = 0; t.soldier.setVisible(true); t.soldier.body.position.y = 0.95; t.afterMove(0);
    ACTORS.push(t); g.active.push(t); g.spawned++; g.next = D.gap;
  }
  if (g.spawned >= g.total && !g.active.length) stopTargetPractice(true);
}

// ---- 매 프레임 ----
function rangeUpdate(dt) {
  const p = PLAYER;
  if (RANGE.infAmmo) for (const w of p.weapons) w.reserve = 999;
  // 수류탄 다시 채우기
  if (p.mode !== 'throw' || !p.pin) for (const k of ['frag', 'smoke', 'flash']) if (p.throwables[k] <= 0) { RANGE.refill = (RANGE.refill || 0) + dt; if (RANGE.refill > 1.5) { p.throwables = { frag: 2, smoke: 1, flash: 1 }; RANGE.refill = 0; } }
  // 움직이는 봇
  const t = G.time;
  for (const a of RANGE.dummies) {
    if (a.kind !== 'strafe' || a.dead || RANGE.game) { if (a.kind === 'strafe') a.wish.set(0, 0, 0); continue; }
    if (RANGE.strafeSpeed === 0) { a.wish.set(0, 0, 0); continue; }
    const target = a.home.x + Math.sin(t * 0.55 * RANGE.strafeSpeed + a.phase) * a.span;
    const dx = target - a.pos.x;
    // 봇 기준 오른쪽 = +x 방향(봇은 사격선 쪽을 봄 → 오른쪽은 -x)
    a.wish.set(clamp(-dx * 1.5, -1, 1), 0, 0);
    a.sprint = RANGE.strafeSpeed > 1;
    if (a.crouchy) { const want = Math.sin(t * 1.3 + a.phase) > 0.6 ? 'crouch' : 'stand'; if (want !== a.stance) a.setStance(want); }
    a.yaw = Math.atan2(-(RANGE.spawn.x - a.pos.x), -(RANGE.spawn.z - a.pos.z));
  }
  // 죽은 표적 다시 세우기
  for (const a of RANGE.dummies) if (a.dead && !RANGE.game) {
    a.respawnT = (a.respawnT || 0) + dt;
    if (a.respawnT > 1.6) { a.respawnT = 0; dummyReset(a); }
  }
  updateTargetPractice(dt);
  // 내가 죽으면 (수류탄 등) 다시 시작
  if (p.dead) { RANGE.playerDeadT += dt; if (RANGE.playerDeadT > 2) { RANGE.playerDeadT = 0; p.reset(); p.pos.copy(RANGE.spawn); p.yaw = 0; } }
}
function rangeOnHit(victim, dmg, part, dist, hp, st) {
  RANGE.hits++; if (part === 'head') RANGE.heads++;
  RANGE.last = { dmg: Math.round(dmg), part, dist: Math.round(dist), gun: st.def.name, lv: victim.helmet.lv };
  if (RANGE.game) RANGE.game.hits++;
  if (RANGE.dmgNums) fx.text(_v4.copy(hp).add(_v3.set(rand(-0.15, 0.15), 0.25, 0)), String(Math.round(dmg)), { color: part === 'head' ? 0xffd24a : 0xffffff, size: 0.35 });
}
function rangeOnKill(killer, victim) {
  if (victim === PLAYER) return;
  if (RANGE.game && victim.kind === 'target') {
    const g = RANGE.game; g.kills++; g.reactions.push(victim.age); victim.deadAt = victim.age;
  }
}

// ---- 훈련장 메뉴 (Tab) ----
function openRangeMenu() {
  if (G.mode !== 'range') return;
  G.menuOpen = true; $('rangemenu').style.display = 'flex';
  if (document.pointerLockElement) document.exitPointerLock();
  renderRangeMenu();
}
function closeRangeMenu(noLock) {
  if ($('rangemenu').style.display === 'none') return;
  G.menuOpen = false; $('rangemenu').style.display = 'none';
  if (!noLock) lockPointer();
}
function renderRangeMenu() {
  const best = (k) => { try { const b = JSON.parse(localStorage.getItem('tg1v1_tp_' + k) || 'null'); return b ? `최고 ${b.kills}/30 · ${Math.round(b.avg * 1000)}ms` : '기록 없음'; } catch (e) { return ''; } };
  const opt = (key, val, label) => `<button class="${RANGE[key] === val ? 'on' : ''}" data-k="${key}" data-v="${val}">${label}</button>`;
  $('rm-body').innerHTML = `
    <h3 class="sec">타겟 연습 (반응 속도)</h3>
    <div class="rm-row">${Object.keys(TP_DIFF).map(k => `<button class="tp" data-tp="${k}"><b>${TP_DIFF[k].name}</b><small>${best(k)}</small></button>`).join('')}
    ${RANGE.game ? '<button class="tp stop" data-stop="1"><b>그만하기</b><small>자유 연습으로</small></button>' : ''}</div>
    <h3 class="sec">표적 설정</h3>
    <div class="attrow"><span>헬멧·조끼</span>${[0, 1, 2, 3].map(l => opt('armor', l, l ? l + '레벨' : '없음')).join('')}</div>
    <div class="attrow"><span>무빙 봇</span>${opt('strafeSpeed', 0, '멈춤')}${opt('strafeSpeed', 1, '걷기')}${opt('strafeSpeed', 2, '달리기')}</div>
    <div class="attrow"><span>피해 숫자</span>${opt('dmgNums', true, '보이기')}${opt('dmgNums', false, '숨기기')}</div>
    <div class="attrow"><span>총알</span>${opt('infAmmo', true, '무한')}${opt('infAmmo', false, '보통')}</div>
    <h3 class="sec" style="margin-top:14px">기록</h3>
    <div style="font-size:13px;color:#cfd6dc">맞힌 수 ${RANGE.hits} · 헤드샷 ${RANGE.heads} · 쏜 총알 ${RANGE.shots} · 명중률 ${RANGE.shots ? Math.round(RANGE.hits / RANGE.shots * 100) : 0}%</div>`;
}
function setupRangeMenu() {
  $('rangemenu').addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.tp) { startTargetPractice(t.dataset.tp); return; }
    if (t.dataset.stop) { stopTargetPractice(false); renderRangeMenu(); return; }
    if (t.dataset.k) {
      const cur = RANGE[t.dataset.k]; let v = t.dataset.v;
      v = typeof cur === 'boolean' ? v === 'true' : +v;
      RANGE[t.dataset.k] = v;
      if (t.dataset.k === 'armor' && !RANGE.game) for (const a of RANGE.dummies) dummyReset(a);
      renderRangeMenu(); AU.click(0.12, 2000); return;
    }
    if (t.id === 'rm-close') closeRangeMenu();
    if (t.id === 'rm-reset') { RANGE.shots = RANGE.hits = RANGE.heads = 0; RANGE.last = null; renderRangeMenu(); }
    if (t.id === 'rm-quit') { closeRangeMenu(true); stopTargetPractice(false); goMenu(); }
  });
}
