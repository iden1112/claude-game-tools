// ================= 게임 진행 =================
const G = { myTeam: 0, state: 'menu', mode: 'arena', time: 0, round: 0, score: [0, 0], shake: 0, preT: 0, roundT: 0, postT: 0, menuOpen: false, paused: false, winTo: 7 };
const ROUND_TIME = 150;
let LOADOUT = { slots: [{ id: 'm416', scope: 'reddot', muzzle: 'comp', grip: 'vert' }, { id: 'kar98k', scope: '8x', muzzle: 'supp' }, { id: 'p92', muzzle: 'supp' }] };
try { const s = JSON.parse(localStorage.getItem('tg1v1_loadout') || 'null'); if (s && s.slots && s.slots.every(x => WEAPONS[x.id])) LOADOUT = s; } catch (e) {}
// 배그처럼: 1·2번은 주무기, 3번은 권총
(function fixLoadoutSlots() {
  const sl = LOADOUT.slots, def = [{ id: 'm416' }, { id: 'kar98k' }];
  let hg = sl.slice(0, 2).find(x => WEAPONS[x.id].cat === 'HG');
  for (let i = 0; i < 2; i++) if (!sl[i] || WEAPONS[sl[i].id].cat === 'HG') sl[i] = Object.assign({ id: def[i].id }, fullAttachments(def[i].id));
  if (!sl[2] || WEAPONS[sl[2].id].cat !== 'HG') sl[2] = hg || Object.assign({ id: 'p92' }, fullAttachments('p92'));
  sl.length = 3;
})();
function saveLoadout() { try { localStorage.setItem('tg1v1_loadout', JSON.stringify(LOADOUT)); } catch (e) {} }
function playerLoadoutList() { return LOADOUT.slots.map(s => ({ id: s.id, att: fullAttachments(s.id, s) })); }
const enemy = () => BOT;

function goMenu() {
  if (NET.active || NET.peer || NET.bc) { netSend({ t: 'bye' }); netReset(); }
  G.state = 'menu'; G.mode = 'arena'; G.menuOpen = false;
  WORLD.bounds = WORLD.map.bounds; clearCombat();
  for (const id of ['pause', 'end', 'loadout', 'rangemenu', 'mp']) $(id).style.display = 'none';
  $('start-settings').appendChild($('settings'));
  $('start').style.display = 'flex';
  for (const a of RANGE.dummies) a.soldier.setVisible(false);
  for (const t of RANGE.targets) t.soldier.setVisible(false);
  for (const id in REMOTES) REMOTES[id].soldier.setVisible(false);
  G.myTeam = 0; PLAYER.team = undefined;
  BOT.soldier.setVisible(true);
  ACTORS.length = 0; ACTORS.push(PLAYER, BOT);
  if (document.pointerLockElement) document.exitPointerLock();
}

const GAME = {
  startMatch() {
    G.mode = 'arena'; G.myTeam = 0; PLAYER.team = undefined; setMap('duel');
    ACTORS.length = 0; ACTORS.push(PLAYER, BOT); BOT.soldier.setVisible(true);
    for (const a of RANGE.dummies) a.soldier.setVisible(false);
    G.score = [0, 0]; G.round = 0; G.time = 0; resetKD(); PLAYER.name = NICK();
    $('start').style.display = 'none'; $('end').style.display = 'none';
    this.newRound();
    lockPointer();
  },
  // side: true 면 내가 북쪽(+z)에서 시작
  newRound(sideOverride) {
    G.round++;
    clearCombat();
    if (G.mode !== 'mp') setMap('duel');
    WORLD.bounds = WORLD.map.bounds;
    const mp = G.mode === 'mp', E = enemy();
    ACTORS.length = 0; ACTORS.push(PLAYER, E);
    PLAYER.setLoadout(playerLoadoutList());
    if (!mp) BOT.setLoadout(botLoadout());
    const side = sideOverride !== undefined ? sideOverride : G.round % 2 === 0;
    const SZ = Math.abs(WORLD.map.spawnZ), pz = side ? SZ : -SZ;
    PLAYER.reset(); E.reset();
    if (mp) { E.soldier.setVisible(true); E.net.pos.set(0, 0, -pz); }
    PLAYER.pos.set(rand(-5, 5), 0, pz); PLAYER.yaw = pz < 0 ? Math.PI : 0; PLAYER.pitch = 0;
    E.pos.set(rand(-5, 5), 0, -pz); E.yaw = pz < 0 ? 0 : Math.PI; E.pitch = 0;
    for (const a of [PLAYER, E]) a.afterMove(0);
    CAM.eyeSmooth.copy(PLAYER.eyePos);
    if (!mp) {
      botRoundStart();
      if (side) { const ai = BOT.ai; if (ai.goal) ai.goal.set(-ai.goal.x, 0, -ai.goal.z); }
      BOT.ai.flip = side;
    }
    G.state = 'pre'; G.preT = G.round === 1 ? 10 : 8; G.roundT = ROUND_TIME;
    HUD.message(`라운드 ${G.round}`, `~ 키로 총 바꾸기 · ${G.winTo}점 먼저 따면 승리`, 3);
    buildViewmodel();
    if (mp) { NET.myLoadoutKey = ''; }
  },
  newRoundMP(spawns) {
    G.round++;
    clearCombat();
    WORLD.bounds = WORLD.map.bounds;
    PLAYER.setLoadout(playerLoadoutList());
    for (const a of ACTORS) {
      a.reset();
      if (a.remote) { a.soldier.setVisible(true); a.soldier.body.rotation.set(0, 0, 0); }
      const id = a === PLAYER ? NET.id : a.netId, s = spawns[id];
      if (s) { a.pos.set(s[0], 0, s[1]); a.yaw = s[2]; a.pitch = 0; if (a.remote) a.net.pos.copy(a.pos), a.net.yaw = a.yaw; }
      a.afterMove(0);
    }
    // 방장 컴퓨터의 AI: 총 받고 작전 정하기
    for (const id in NET.bots) {
      const b = NET.bots[id];
      b.setLoadout(botLoadout()); b.reset();
      const s = spawns[id]; if (s) { b.pos.set(s[0], 0, s[1]); b.yaw = s[2]; }
      b.afterMove(0); b.netLoKey = '';
      botRoundStart(b);
      if (b.pos.z < 0) { if (b.ai.goal) b.ai.goal.set(-b.ai.goal.x, 0, -b.ai.goal.z); b.ai.flip = true; } else b.ai.flip = false;
      b.soldier.setVisible(true);
    }
    PLAYER.netLoKey = '';
    CAM.eyeSmooth.copy(PLAYER.eyePos); CAM.spec = null;
    G.state = 'pre'; G.preT = G.round === 1 ? 10 : 8; G.roundT = ROUND_TIME;
    const n0 = NET.lobby.players.filter(p => p.team === 0).length, n1 = NET.lobby.players.length - n0;
    HUD.message(`라운드 ${G.round}`, `${TEAM_NAME[G.myTeam]} 팀 · ${n0}대${n1} · ~ 키로 총 바꾸기 · ${G.winTo}점 선승`, 3);
    buildViewmodel();
  },
  showRoundEnd(m) {
    const w = m.winner;
    const sub = m.why === 'time' ? '시간 종료 · 남은 체력이 많은 팀이 이겨요' : '';
    if (w < 0) HUD.message('무승부', sub || '양쪽 모두 쓰러졌어요', 3.5);
    else if (w === G.myTeam) HUD.message('라운드 승리', sub || `${TEAM_NAME[w]} 팀이 이겼어요`, 3.5, 'win');
    else HUD.message('라운드 패배', sub || `${TEAM_NAME[w]} 팀이 이겼어요`, 3.5, 'lose');
    G.state = 'post'; G.postT = 4; PLAYER.trigger = false;
  },
  goLive() {
    G.state = 'live'; AU.beep(990, 0.25, 0.3); HUD.message('전투 시작!', '', 1.2);
    if (G.menuOpen && $('loadout').style.display !== 'none') closeLoadout(true);
    if (G.mode === 'mp' && NET.host) netSend({ t: 'go' });
  },
  onKill(killer, victim, info) {
    if (G.mode === 'range') { rangeOnKill(killer, victim, info); return; }
    if (G.state !== 'live') return;
    if (G.mode === 'mp') {
      const head = info && info.head ? ' <b class="hs">헤드샷</b>' : '';
      const dist = info && info.dist ? ` ${Math.round(info.dist)}m` : '';
      const cls = (a) => a === PLAYER ? 'me' : a.team === G.myTeam ? 'tm' : 'en';
      const kname = !killer || killer === victim ? '' : `<span class="${cls(killer)}">${esc(killer.name)}</span> `;
      HUD.addFeed(`${kname}<i>[${info && info.weapon || ''}]</i> <span class="${cls(victim)}">${esc(victim.name)}</span>${head}${dist}`);
      if (victim === PLAYER) HUD.message('쓰러졌어요', teamAlive(G.myTeam) > 0 ? '팀원을 관전해요' : '', 2.5, 'lose');
      if (NET.host) netCheckRoundEnd();
      return;
    }
    const E = enemy();
    const pWin = victim === E;
    if (pWin) G.score[0]++; else G.score[1]++;
    const head = info && info.head ? ' <b class="hs">헤드샷</b>' : '';
    const dist = info && info.dist ? ` ${Math.round(info.dist)}m` : '';
    const kname = killer === victim || !killer ? victim.name : killer.name;
    HUD.addFeed(`<span class="${killer === PLAYER ? 'me' : 'en'}">${kname}</span> <i>[${info && info.weapon || ''}]</i> <span class="${victim === PLAYER ? 'me' : 'en'}">${victim.name}</span>${head}${dist}`);
    if (pWin) HUD.message('라운드 승리', `${info && info.weapon || ''}${head ? ' · 헤드샷' : ''}${dist}`, 3.5, 'win');
    else HUD.message('라운드 패배', `${E.name}의 ${info && info.weapon || ''}${dist}`, 3.5, 'lose');
    G.state = 'post'; G.postT = 4;
    PLAYER.trigger = false;
  },
  timeUp() {
    if (G.mode === 'mp') { if (NET.host) netTimeUp(); return; }
    const ph = PLAYER.health, eh = enemy().health;
    const res = Math.abs(ph - eh) < 0.5 ? 0 : ph > eh ? 1 : -1;
    if (res > 0) G.score[0]++; else if (res < 0) G.score[1]++;
    this.showTimeUp(res);
    if (G.mode === 'mp') netSend({ t: 'timeup', score: G.score, res });
  },
  showTimeUp(res) {
    if (res === 0) HUD.message('시간 종료', '무승부 - 점수 없음', 3);
    else if (res > 0) HUD.message('시간 종료', '체력이 더 많아서 승리', 3, 'win');
    else HUD.message('시간 종료', '체력이 더 적어서 패배', 3, 'lose');
    G.state = 'post'; G.postT = 3.5;
  },
  update(dt) {
    const mpClient = G.mode === 'mp' && !NET.host;
    if (G.state === 'pre') {
      if (!G.menuOpen || G.mode === 'mp') G.preT -= dt;
      const s = Math.ceil(G.preT);
      if (s !== this.lastBeep && s <= 3 && s > 0) { AU.beep(660); this.lastBeep = s; }
      if (G.preT <= 0 && (!mpClient || G.preT < -1.5)) this.goLive();
    } else if (G.state === 'live') {
      G.roundT -= dt; if (G.roundT <= 0 && !mpClient) this.timeUp();
    } else if (G.state === 'post') {
      G.postT -= dt;
      if (G.postT <= 0 && !mpClient) {
        if (G.score[0] >= G.winTo || G.score[1] >= G.winTo) { this.endMatch(); if (G.mode === 'mp') netSend({ t: 'over', score: G.score }); }
        else if (G.mode === 'mp') netNextRound();
        else this.newRound();
      }
    }
  },
  endMatch() {
    G.state = 'over';
    document.exitPointerLock && document.exitPointerLock();
    const me = G.myTeam || 0, win = G.score[me] > G.score[1 - me];
    $('end').style.display = 'flex';
    $('end-title').textContent = win ? '승리!' : '패배';
    $('end-title').className = win ? 'win' : 'lose';
    $('end-score').textContent = `${G.score[me]} : ${G.score[1 - me]}`;
    $('btn-again').style.display = G.mode === 'mp' && !NET.host ? 'none' : '';
  },
};

// ================= 총 고르기 메뉴 (~ 키) =================
let LO = { slot: 0, cat: 'AR' };
function openLoadout() {
  if (G.state !== 'pre' && G.state !== 'menu' && G.state !== 'range') { HUD.toast('라운드 시작 전에만 총을 바꿀 수 있어요'); return; }
  if ($('rangemenu').style.display !== 'none') closeRangeMenu(true);
  G.menuOpen = true; $('loadout').style.display = 'flex';
  LO.cat = WEAPONS[LOADOUT.slots[LO.slot].id].cat;
  if (document.pointerLockElement) document.exitPointerLock();
  renderLoadout();
}
function closeLoadout(force) {
  if ($('loadout').style.display === 'none') return;
  G.menuOpen = false; $('loadout').style.display = 'none';
  saveLoadout();
  if (G.state === 'pre' || G.state === 'live' || G.state === 'range') {
    PLAYER.setLoadout(playerLoadoutList()); buildViewmodel();
    if (!force) lockPointer();
    else if (!INPUT.locked) { $('pause-settings').appendChild($('settings')); $('pause').style.display = 'flex'; }
  }
}
function statBar(label, v, max, txt) { return `<div class="sb"><span>${label}</span><div><i style="width:${clamp(v / max, 0.03, 1) * 100}%"></i></div><em>${txt}</em></div>`; }
function renderLoadout() {
  const sl = LOADOUT.slots[LO.slot];
  $('lo-slots').innerHTML = LOADOUT.slots.map((s, i) => `<button class="${i === LO.slot ? 'on' : ''}" data-slot="${i}"><small>${i + 1}번 ${i === 2 ? '권총' : '주무기'}</small>${WEAPONS[s.id].name}</button>`).join('');
  $('lo-cats').innerHTML = Object.keys(CAT_NAME).filter(c => LO.slot === 2 ? c === 'HG' : c !== 'HG').map(c => `<button class="${c === LO.cat ? 'on' : ''}" data-cat="${c}">${CAT_NAME[c]}</button>`).join('');
  $('lo-guns').innerHTML = Object.values(WEAPONS).filter(w => w.cat === LO.cat).map(w => `<button class="gun ${w.id === sl.id ? 'on' : ''}" data-gun="${w.id}"><b>${w.name}</b><small>${w.ammo} · ${w.dmg}${w.pellets > 1 ? '×' + w.pellets : ''}</small></button>`).join('');
  const w = WEAPONS[sl.id], att = fullAttachments(sl.id, sl), st = weaponStats(sl.id, att);
  const rpm = Math.round(60 / w.interval);
  let html = `<h3>${w.name} <small>${CAT_NAME[w.cat]} · ${w.ammo}</small></h3>`;
  html += statBar('피해량', w.dmg * w.pellets, 220, w.dmg + (w.pellets > 1 ? ' ×' + w.pellets : ''));
  html += statBar('연사력', w.bolt ? 30 : rpm, 1100, w.bolt ? '볼트액션' : rpm + ' RPM');
  html += statBar('탄속', w.vel, 1000, w.vel + ' m/s');
  html += statBar('반동', st.rv, 4, st.rv < 0.5 ? '낮음' : st.rv < 1 ? '보통' : '높음');
  html += statBar('탄창', st.mag, 150, st.mag + '발');
  html += `<div class="modes">사격 모드: ${w.modes.split('').map(m => ({ S: '단발', B: '점사', A: '연사' }[m])).join(' / ')}</div>`;
  const row = (title, key, opts, names) => opts.length ? `<div class="attrow"><span>${title}</span>${opts.map(o => `<button class="${att[key] === o ? 'on' : ''}" data-att="${key}" data-val="${o}">${names(o)}</button>`).join('')}</div>` : '';
  html += `<h4>풀파츠 (자동 장착) - 원하는 걸로 바꿀 수 있어요</h4>`;
  html += row('조준경', 'scope', scopeOptions(w), o => SCOPES.find(s => s.id === o).name);
  if (w.integrated) html += `<div class="attrow"><span>조준경</span><button class="on">내장 4배율</button></div>`;
  html += row('총구', 'muzzle', muzzleOptions(w), o => MUZZLES[o]);
  html += row('손잡이', 'grip', gripOptions(w), o => GRIPS[o]);
  if (att.mag) html += `<div class="attrow"><span>탄창</span><button class="on">대용량 퀵드로우</button></div>`;
  if (att.stock) html += `<div class="attrow"><span>개머리판</span><button class="on">${STOCKS[att.stock]}</button></div>`;
  if (w.integrated) html += `<div class="attrow"><span>총구</span><button class="on">내장 소음기</button></div>`;
  $('lo-detail').innerHTML = html;
  $('lo-ready').textContent = G.state === 'pre' ? `확인 (시작까지 ${Math.ceil(G.preT)}초)` : '확인';
}
function setupLoadoutUI() {
  $('loadout').addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const sl = LOADOUT.slots[LO.slot];
    if (t.dataset.slot !== undefined) { LO.slot = +t.dataset.slot; LO.cat = WEAPONS[LOADOUT.slots[LO.slot].id].cat; }
    else if (t.dataset.cat) LO.cat = t.dataset.cat;
    else if (t.dataset.gun) { LOADOUT.slots[LO.slot] = { id: t.dataset.gun }; Object.assign(LOADOUT.slots[LO.slot], fullAttachments(t.dataset.gun)); }
    else if (t.dataset.att) sl[t.dataset.att] = t.dataset.val;
    else if (t.id === 'lo-ready') { closeLoadout(); return; }
    AU.click(0.12, 2000);
    renderLoadout();
  });
  setInterval(() => { if (G.menuOpen && G.state === 'pre') $('lo-ready').textContent = `확인 (시작까지 ${Math.ceil(G.preT)}초)`; }, 250);
}

// ================= 설정 / 시작 화면 =================
function setupMenus() {
  const diff = $('set-diff'), arm = $('set-armor');
  diff.innerHTML = BOT_DIFF.map((d, i) => `<option value="${i}">${d.name}</option>`).join('');
  diff.value = SETTINGS.difficulty; arm.value = SETTINGS.armor;
  $('set-sens').value = SETTINGS.sens; $('set-ads').value = SETTINGS.adsSens; $('set-fov').value = SETTINGS.fov; $('set-vol').value = SETTINGS.volume;
  $('set-aim').value = SETTINGS.aimMode; $('set-crouch').value = SETTINGS.crouchMode; $('set-lean').value = SETTINGS.leanMode; $('set-sprint').value = SETTINGS.sprintMode;
  $('start-nick').value = SETTINGS.nick || '';
  const sync = () => {
    SETTINGS.difficulty = +diff.value; SETTINGS.armor = +arm.value; SETTINGS.sens = +$('set-sens').value; SETTINGS.adsSens = +$('set-ads').value;
    SETTINGS.fov = +$('set-fov').value; SETTINGS.volume = +$('set-vol').value; AU.setVol(SETTINGS.volume);
    SETTINGS.aimMode = $('set-aim').value; SETTINGS.crouchMode = $('set-crouch').value; SETTINGS.leanMode = $('set-lean').value; SETTINGS.sprintMode = $('set-sprint').value;
    $('v-sens').textContent = SETTINGS.sens.toFixed(2); $('v-ads').textContent = SETTINGS.adsSens.toFixed(2); $('v-fov').textContent = SETTINGS.fov;
    saveSettings();
  };
  document.querySelectorAll('#settings input, #settings select').forEach(el => el.addEventListener('input', sync)); sync();
  // 닉네임 (시작 화면 · 친구와 대전 화면 같이)
  const setNick = (v) => { SETTINGS.nick = v.trim().slice(0, 12); saveSettings(); PLAYER.name = NICK(); NET.name = SETTINGS.nick || NET.name; for (const id of ['start-nick', 'mp-name']) if ($(id).value !== v) $(id).value = v; };
  for (const id of ['start-nick', 'mp-name']) { $(id).addEventListener('input', (e) => setNick(e.target.value)); $(id).addEventListener('keydown', (e) => e.stopPropagation()); }
  if (SETTINGS.nick) $('mp-name').value = SETTINGS.nick;
  // 전체화면
  const fsBtn = $('set-full');
  const fsSync = () => { fsBtn.textContent = document.fullscreenElement ? '전체화면 끄기' : '전체화면 켜기'; };
  fsBtn.onclick = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else { const r = document.documentElement.requestFullscreen({ navigationUI: 'hide' }); if (r && r.catch) r.catch(() => HUD.toast('이 화면에선 전체화면이 막혀 있어요. F11 을 눌러 보세요')); }
    } catch (e) { HUD.toast('이 화면에선 전체화면이 막혀 있어요. F11 을 눌러 보세요'); }
  };
  document.addEventListener('fullscreenchange', fsSync); fsSync();
  $('btn-start').onclick = () => { AU.init(); GAME.startMatch(); };
  $('btn-range').onclick = () => { AU.init(); enterRange(); };
  $('btn-loadout').onclick = () => { AU.init(); openLoadout(); };
  $('btn-resume').onclick = () => { $('pause').style.display = 'none'; $('start-settings').appendChild($('settings')); lockPointer(); };
  $('btn-quit').onclick = () => goMenu();
  $('btn-again').onclick = () => { $('end').style.display = 'none'; if (G.mode === 'mp') { netStartGame(); lockPointer(); } else GAME.startMatch(); };
  $('btn-menu').onclick = () => goMenu();
  $('start-settings').appendChild($('settings'));
  canvasEl.addEventListener('click', () => { if (isPlaying() && !G.menuOpen && !INPUT.locked) { $('pause').style.display = 'none'; lockPointer(); } });
  window.onPointerUnlock = () => {
    if (G.menuOpen || G.state === 'menu' || G.state === 'over') return;
    $('pause-settings').appendChild($('settings'));
    $('pause').style.display = 'flex';
    $('pause-title').textContent = G.mode === 'mp' ? '메뉴 (게임은 계속 진행 중)' : '일시정지';
  };
  addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    if (e.code === 'Backquote') { e.preventDefault(); if ($('loadout').style.display !== 'none') closeLoadout(); else openLoadout(); }
    if (e.code === 'Tab') { e.preventDefault(); if (G.mode === 'range') { if ($('rangemenu').style.display !== 'none') closeRangeMenu(); else if (!G.menuOpen) openRangeMenu(); } else if (isPlaying()) HUD.showBoard(true); }
    if (e.code === 'Escape') { if ($('loadout').style.display !== 'none') closeLoadout(true); else if ($('rangemenu').style.display !== 'none') { closeRangeMenu(true); window.onPointerUnlock(); } }
  });
}
addEventListener('keyup', (e) => { if (e.code === 'Tab') HUD.showBoard(false); });
addEventListener('blur', () => HUD.showBoard(false));
function resetKD() { for (const a of [PLAYER, BOT, ...Object.values(REMOTES), ...Object.values(NET.bots)]) { a.kills = a.deaths = a.heads = 0; } }
const isPlaying = () => G.state === 'pre' || G.state === 'live' || G.state === 'post' || G.state === 'range';

// ================= 메인 루프 =================
function simStep(dt) {
  G.time += dt;
  playerInput(dt);
  if (G.mode === 'arena') botUpdate(dt);
  else if (G.mode === 'mp' && NET.host) for (const id in NET.bots) botUpdate(dt, NET.bots[id]);
  if (G.mode === 'range') rangeUpdate(dt);
  for (const a of ACTORS) { if (a.remote) continue; a.physics(dt); a.updateWeapon(dt); }
  if (G.mode === 'mp') netUpdate(dt);
  updateBullets(dt); updateGrenades(dt);
  if (G.mode !== 'range') GAME.update(dt);
}
const clock = new THREE.Clock();
// 한 부분에서 오류가 나도 화면과 게임은 계속 돌아가게
const SAFE_LOG = {};
function safe(name, f) { try { f(); } catch (e) { const t = performance.now(); if (!SAFE_LOG[name] || t - SAFE_LOG[name] > 3000) { SAFE_LOG[name] = t; console.warn('[' + name + ']', e); } } }
function frame() {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, clock.getDelta());
  const playing = isPlaying();
  G.paused = playing && !INPUT.locked && !G.menuOpen && !window.__noPause && G.mode !== 'mp';
  if (G.paused) dt = 0;
  if (playing && dt > 0) {
    safe('sim', () => simStep(dt));
  } else if (G.state === 'menu' || G.state === 'over') {
    // 메뉴 뒤 배경: 천천히 도는 카메라
    const t = performance.now() / 1000 * 0.05;
    camera.position.set(Math.sin(t) * 38, 16, Math.cos(t) * 38); camera.lookAt(0, 2, 0);
    camera.fov = 60; camera.updateProjectionMatrix();
    for (const a of ACTORS) a.afterMove(0.016);
    if (G.mode === 'mp' && dt > 0) netUpdate(dt);
  }
  // 그림자는 지금 있는 곳을 따라가요
  const cx = G.mode === 'range' && G.state !== 'menu' ? RX : 0;
  if (sun.target.position.x !== cx) { sun.target.position.set(cx, 0, 0); sun.position.set(cx - 60, 95, 40); }
  safe('fx', () => { updateFX(dt || 0.0001); fx.update(dt, camera); });
  if (playing) safe('cam', () => updatePlayerCamera(dt || 0.0001));
  else VM.root.visible = false;
  safe('hud', () => HUD.update(dt));
  renderer.autoClear = true;
  renderer.render(scene, camera);
  if (VM.root.visible) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(VM.scene, VM.cam); }
  INPUT.consume();
}
