// ================= 화면 표시 (HUD) =================
const _el = {};
const $ = (id) => { let e = _el[id]; if (!e || !e.isConnected) e = _el[id] = document.getElementById(id); return e; };
// 화면 글자·모양은 바뀔 때만 고쳐요 (매 프레임 같은 값을 다시 넣으면 브라우저가 느려져요)
const _uiC = {};
function UI(id, key, v) {
  const k = id + '|' + key; if (_uiC[k] === v) return; _uiC[k] = v;
  const e = $(id); if (!e) return;
  if (key.startsWith('style.')) e.style[key.slice(6)] = v; else e[key] = v;
}
const HUD = {
  hitT: 0, hitKill: false, hitHead: false, dmgDirs: [], feed: [], toastT: 0, flashV: 0, hurtV: 0, msgT: 0,
  init() {
    this.cc = $('compass').getContext('2d');
    this.dc = $('dmgdir').getContext('2d');
    this.arcLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xff2a1f, dashSize: 0.3, gapSize: 0.12, transparent: true, opacity: 0.95, depthTest: false }));
    this.arcLine.frustumCulled = false; scene.add(this.arcLine); this.arcLine.visible = false;
    this.arcRing = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.32, 24), new THREE.MeshBasicMaterial({ color: 0xff2a1f, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
    this.arcRing.rotation.x = -Math.PI / 2; scene.add(this.arcRing); this.arcRing.visible = false;
  },
  hitMarker(kill, head) { this.hitT = kill ? 0.5 : 0.18; this.hitKill = kill; this.hitHead = head; },
  damaged(dmg, from, info) {
    this.hurtV = Math.min(1, this.hurtV + dmg / 120);
    if (from && from !== PLAYER) this.dmgDirs.push({ x: from.pos.x, z: from.pos.z, t: 2.2 });
    else if (info && info.dir) this.dmgDirs.push({ x: PLAYER.pos.x - info.dir.x * 5, z: PLAYER.pos.z - info.dir.z * 5, t: 2.2 });
  },
  flashbang(p) { this.flashV = Math.min(4, Math.max(this.flashV, p * 4)); },
  toast(t) { $('toast').textContent = t; UI('toast', 'style.opacity', 1); this.toastT = 1.2; },
  message(t, sub, sec = 2.5, cls = '') { $('msg').innerHTML = `<div class="m1 ${cls}">${t}</div>${sub ? `<div class="m2">${sub}</div>` : ''}`; UI('msg', 'style.opacity', 1); this.msgT = sec; },
  addFeed(html) {
    const d = document.createElement('div'); d.className = 'feedrow'; d.innerHTML = html; $('feed').prepend(d);
    setTimeout(() => d.style.opacity = 0, 6000); setTimeout(() => d.remove(), 7000);
  },
  update(dt) {
    const p = PLAYER; if (!p) return;
    const inGame = G.state !== 'menu';
    UI('hud', 'style.display', inGame ? 'block' : 'none');
    if (!inGame) return;
    const range = G.mode === 'range';
    UI('score', 'style.display', range ? 'none' : 'flex');
    UI('rangehud', 'style.display', range ? 'block' : 'none');
    if (range) this.rangeHud();
    const mp = G.mode === 'mp', me = G.myTeam || 0, ffa = mp && isFFA();
    let top = 1 - me; // 개인전: 오른쪽 칸 = 나를 빼고 점수 1등
    if (ffa) { top = -1; for (const p of NET.lobby.players) if (p.team !== me && (top < 0 || (G.score[p.team] || 0) > (G.score[top] || 0))) top = p.team; }
    UI('sc-pn', 'textContent', ffa ? '나' : mp ? TEAM_NAME[me] + ' (우리)' : '나');
    UI('sc-bn', 'textContent', ffa ? (top >= 0 ? teamLabel(top) + ' (1등 상대)' : '-') : mp ? TEAM_NAME[1 - me] : '봇');
    UI('sc-p', 'style.background', mp ? (me === 0 ? 'rgba(60,140,220,.75)' : 'rgba(210,70,60,.75)') : '');
    UI('sc-b', 'style.background', mp ? (me === 0 ? 'rgba(210,70,60,.75)' : 'rgba(60,140,220,.75)') : '');
    // 점수
    UI('sc-p', 'textContent', G.score[me] || 0); UI('sc-b', 'textContent', ffa ? (top >= 0 ? G.score[top] || 0 : 0) : G.score[1 - me]);
    { // 핑 (멀티): 내 컴퓨터 ↔ 방장(방장은 가장 느린 친구) 왕복 시간
      const show = mp && NET.rtt && performance.now() - (NET.rttAt || 0) < 5000, ms = show ? Math.round(NET.rtt) : 0;
      UI('ping', 'textContent', show ? `핑 ${ms}ms${NET.bus && NET.mode === 'relay' ? ' · 중계' : ''}` : '');
      UI('ping', 'className', ms > 180 ? 'bad' : ms > 90 ? 'mid' : '');
    }
    if (ffa) { let n = 0; for (const a of ACTORS) if (!a.dead && !a.gone && a.team !== undefined) n++; UI('sc-alive', 'textContent', `남은 사람 ${n}`); }
    else if (mp) {
      const pips = (t) => { let s = ''; for (const a of ACTORS) if (a.team === t && !a.gone) s += a.dead ? '○' : '●'; return s; };
      UI('sc-alive', 'textContent', pips(me) + '  vs  ' + pips(1 - me));
    } else UI('sc-alive', 'textContent', '');
    this.nameTags(mp);
    UI('spec', 'style.display', CAM.spec ? 'block' : 'none');
    if (CAM.spec) UI('spec', 'textContent', `관전 중: ${CAM.spec.name}`);
    UI('sc-round', 'textContent', `라운드 ${G.round}`);
    const tl = G.state === 'pre' ? Math.ceil(G.preT) : Math.max(0, Math.ceil(G.roundT));
    UI('sc-time', 'textContent', G.state === 'pre' ? `시작까지 ${tl}` : `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`);
    UI('premenu', 'style.display', G.state === 'pre' && !G.menuOpen ? 'block' : 'none');
    // 체력
    const hp = Math.max(0, p.health) / MAX_HP * 100;
    UI('hpfill', 'style.width', hp + '%');
    UI('hpfill', 'style.background', hp > 75 ? '#f2f2f2' : hp > 50 ? '#f4e7a8' : hp > 25 ? '#f0a35a' : '#e2463c');
    this.lag = damp(this.lag === undefined ? 100 : this.lag, hp, 3, dt); UI('hplag', 'style.width', this.lag.toFixed(1) + '%');
    const arm = (k, el) => {
      const a = p[k], max = ARMOR[k].dur[SETTINGS.armor] || 1;
      el.style.display = a.lv > 0 ? 'flex' : 'none';
      if (a.lv > 0) { el.querySelector('b').textContent = 'Lv.' + a.lv; el.querySelector('i').style.height = clamp(a.dur / ARMOR[k].dur[a.lv], 0, 1) * 100 + '%'; }
      void max;
    };
    arm('helmet', $('a-helmet')); arm('vest', $('a-vest'));
    UI('stance', 'textContent', p.stance === 'prone' ? '엎드림' : p.stance === 'crouch' ? '앉음' : p.sprint ? '달리기' : '서기');
    // 무기
    const w = p.w;
    if (p.mode === 'fist') {
      UI('w-name', 'textContent', '맨손'); UI('w-ammo', 'innerHTML', '<small>주먹</small>'); UI('w-mode', 'textContent', '좌클릭: 때리기 · X: 총 꺼내기');
    } else if (p.mode === 'throw') {
      UI('w-name', 'textContent', THROWABLES[p.throwType].name);
      UI('w-ammo', 'innerHTML', `${p.throwables[p.throwType]}<small>개</small>`);
      UI('w-mode', 'textContent', p.pin ? (INPUT.rmb ? '가까이 던지기 (우클릭)' : '멀리 던지기') + (p.cookT >= 0 ? ' · 쿠킹 중' : '') : '좌클릭 꾹: 준비 · 우클릭: 가까이');
    } else if (w) {
      UI('w-name', 'textContent', w.stats.def.name);
      UI('w-ammo', 'innerHTML', `<span class="${w.mag <= w.stats.mag * 0.25 ? 'low' : ''}">${w.mag}</span><small> / ${w.reserve}</small>`);
      UI('w-mode', 'textContent', p.reloadT > 0 ? '재장전 중…' : { S: '단발', B: '점사', A: '연사' }[w.fireMode] || '');
    }
    UI('slots', 'innerHTML', p.weapons.map((x, i) => `<div class="slot ${p.mode === 'gun' && i === p.cur ? 'on' : ''}"><span>${i + 1}</span>${x.stats.def.name}<em>${attSummary(x.att)}</em></div>`).join('')
      + `<div class="slot ${p.mode === 'throw' ? 'on' : ''}"><span>5</span>수류탄 ${p.throwables.frag} · 연막 ${p.throwables.smoke} · 섬광 ${p.throwables.flash}</div>`);
    // 쿠킹 바
    const cookOn = p.mode === 'throw' && p.cookT >= 0;
    UI('cook', 'style.display', cookOn ? 'block' : 'none');
    if (cookOn) UI('cookfill', 'style.width', (1 - p.cookT / THROWABLES[p.throwType].fuse) * 100 + '%');
    // 조준선
    const scope = p.mode === 'gun' && w ? effScopeId(w) : null;
    const zoom = w ? effZoom(w) : 1;
    const full = p.adsT > 0.85 && scope && zoom >= 2 && scope !== 'iron' && CAM.blend < 0.5;
    UI('scope', 'style.display', full ? 'block' : 'none');
    const rv = scope ? ((SETTINGS.ret || {})[scope] || 0) : 0; // PgUp/PgDn 으로 고른 조준점 모양
    if (full) { UI('scope', 'className', 'sc-' + scope + (rv ? ' rv' + rv : '')); }
    const dotOn = p.adsT > 0.9 && (scope === 'reddot' || scope === 'holo') && CAM.blend < 0.5;
    UI('ret', 'style.display', dotOn ? 'block' : 'none'); if (dotOn) UI('ret', 'className', 'r-' + scope + (rv ? ' rv' + rv : ''));
    const isSG = p.mode === 'gun' && w && w.stats.cat === 'SG';
    const showSG = isSG && !p.dead && !(p.sprint && Math.hypot(p.vel.x, p.vel.z) > 3);
    const showCross = !isSG && !(p.adsT > 0.5 && CAM.blend < 0.5) && !p.dead && p.mode === 'gun' && !(p.sprint && Math.hypot(p.vel.x, p.vel.z) > 3);
    UI('cross', 'style.display', showCross ? 'block' : 'none');
    UI('sgc', 'style.display', showSG ? 'block' : 'none');
    if (showSG) { // 산탄총: 배그처럼 초록 원 조준선 (원 크기 = 산탄이 퍼지는 범위)
      const moving = Math.hypot(p.vel.x, p.vel.z);
      const sp = lerp(w.stats.hip * lerp(1, 0.42, p.shoulderT || 0), w.stats.ads, p.adsT) * STANCE[p.stance].spread * 0.5 + w.stats.pelletSpread + moving / 6 + (p.onGround ? 0 : 3);
      const focal = (innerHeight / 2) / Math.tan(camera.fov * DEG / 2);
      const r = Math.max(9, Math.tan(sp * DEG) * focal * 0.55);
      this.sgr = damp(this.sgr || r, r, 14, dt);
      const R = Math.round(this.sgr), D = R + 5;
      UI('sgc-r', 'style.cssText', `width:${R * 2}px;height:${R * 2}px;left:${-R - 2}px;top:${-R - 2}px`);
      UI('sgc-d', 'style.cssText', `width:${D * 2}px;height:${D * 2}px;left:${-D - 2}px;top:${-D - 2}px`);
    }
    if (showCross && w) {
      const moving = Math.hypot(p.vel.x, p.vel.z);
      let sp = lerp(w.stats.hip * lerp(1, 0.42, p.shoulderT || 0), w.stats.ads, p.adsT) * STANCE[p.stance].spread + moving / 6 * 2 + (p.onGround ? 0 : 4) + Math.min(p.shots, 6) * 0.25 * (p.sinceShot < 0.2 ? 1 : 0);
      const focal = (innerHeight / 2) / Math.tan(camera.fov * DEG / 2);
      const gap = Math.max(4, Math.tan(sp * DEG) * focal);
      this.gap = damp(this.gap || gap, gap, 18, dt);
      const X = SETTINGS.xh, L = X.len;
      const g = X.dyn ? Math.max(X.gap, Math.round(this.gap * 2) / 2 - 4 + X.gap) : X.gap; // 발로란트처럼 고정할 수도 있어요
      UI('ch-t', 'style.transform', `translate(0, ${-g - L}px)`); UI('ch-b', 'style.transform', `translate(0, ${g}px)`);
      UI('ch-l', 'style.transform', `translate(${-g - L}px, 0)`); UI('ch-r', 'style.transform', `translate(${g}px, 0)`);
    }
    UI('dot', 'style.display', !p.dead && (p.mode === 'throw' || p.mode === 'fist') ? 'block' : 'none');
    // 맞힘 표시
    this.hitT -= dt;
    const hm = $('hit'); hm.style.opacity = this.hitT > 0 ? 1 : 0;
    hm.className = this.hitKill ? 'kill' : this.hitHead ? 'head' : '';
    // 피해 방향
    const dc = this.dc, W = dc.canvas.width, H = dc.canvas.height; dc.clearRect(0, 0, W, H);
    this.dmgDirs = this.dmgDirs.filter(d => (d.t -= dt) > 0);
    for (const d of this.dmgDirs) {
      const a = Math.atan2(d.x - p.pos.x, -(d.z - p.pos.z)) + camera.rotation.y; // 화면 기준 각도
      dc.strokeStyle = `rgba(230,40,30,${Math.min(1, d.t) * 0.85})`; dc.lineWidth = 10;
      dc.beginPath(); dc.arc(W / 2, H / 2, 110, a - Math.PI / 2 - 0.35, a - Math.PI / 2 + 0.35); dc.stroke();
    }
    // 아파서 붉은 화면
    this.hurtV = Math.max(0, this.hurtV - dt * 0.8);
    UI('hurt', 'style.opacity', Math.max(this.hurtV, hp < 30 ? 0.35 + Math.sin(G.time * 5) * 0.1 : 0));
    // 섬광: 실제 시간 기준으로 줄어들고 최대 4초 (게임이 멈춰도 화면은 돌아와요)
    const nowT = performance.now(); const realDt = Math.min(0.25, (nowT - (this.lastNow || nowT)) / 1000); this.lastNow = nowT;
    this.flashV = Math.min(4, Math.max(0, this.flashV - Math.max(dt, realDt)));
    UI('flash', 'style.opacity', clamp(this.flashV, 0, 1));
    // 안내
    this.toastT -= dt; if (this.toastT <= 0) UI('toast', 'style.opacity', 0);
    this.msgT -= dt; if (this.msgT <= 0) UI('msg', 'style.opacity', 0);
    // 숨 참기
    UI('breath', 'style.display', p.adsT > 0.6 && w && effZoom(w) >= 3 ? 'block' : 'none');
    UI('breathfill', 'style.width', CAM.breath / 5 * 100 + '%');
    this.drawCompass();
    this.updateArc(p);
  },
  assist(victim) { // 어시스트 표시 (화면 가운데 아래, 잠깐)
    const el = $('assist'); if (!el) return;
    el.innerHTML = `<b>어시스트</b> ${esc(victim ? victim.name : '')}`; el.style.opacity = 1; el.style.transform = 'translate(-50%,0)';
    clearTimeout(this._asT); this._asT = setTimeout(() => { el.style.opacity = 0; el.style.transform = 'translate(-50%,8px)'; }, 1800);
  },
  showBoard(on) {
    const b = $('board');
    if (!on) { b.style.display = 'none'; return; }
    const row = (a, me) => `<tr class="${me ? 'me' : ''} ${a.dead ? 'dead' : ''}"><td>${esc(a.name)}${me ? ' (나)' : ''}</td><td>${a.kills || 0}</td><td>${a.assists || 0}</td><td>${a.deaths || 0}</td><td>${((a.kills || 0) / Math.max(1, a.deaths || 0)).toFixed(2)}</td><td>${a.heads || 0}</td></tr>`;
    let h = `<h3>점수판 · 라운드 ${G.round} · ${G.score[G.myTeam || 0]} : ${G.score[1 - (G.myTeam || 0)]}</h3><table><tr><th>이름</th><th>킬</th><th>어시</th><th>데스</th><th>K/D</th><th>헤드샷</th></tr>`;
    if (G.mode === 'mp' && isFFA()) {
      h = `<h3>점수판 · 개인전 · 라운드 ${G.round}</h3><table><tr><th>이름 (점수)</th><th>킬</th><th>어시</th><th>데스</th><th>K/D</th><th>헤드샷</th></tr>`;
      const list = ACTORS.filter(a => !a.gone && a.team !== undefined).sort((x, y) => (G.score[y.team] || 0) - (G.score[x.team] || 0) || (y.kills || 0) - (x.kills || 0));
      for (const a of list) h += row(Object.assign(Object.create(a), { name: `${a.name} (${G.score[a.team] || 0}점)` }), a === PLAYER);
    } else if (G.mode === 'mp') {
      for (const t of [G.myTeam, 1 - G.myTeam]) {
        h += `<tr><td class="tb" colspan="6" style="color:${TEAM_COLOR[t]}">${TEAM_NAME[t]} 팀${t === G.myTeam ? ' (우리)' : ''} · ${G.score[t]}점</td></tr>`;
        const list = ACTORS.filter(a => a.team === t && !a.gone).sort((x, y) => (y.kills || 0) - (x.kills || 0));
        for (const a of list) h += row(a, a === PLAYER);
      }
    } else { h += row(PLAYER, true) + row(BOT, false); }
    b.innerHTML = h + '</table>'; b.style.display = 'block';
  },
  nameTags(mp) {
    const box = $('tags');
    if (!mp) { if (box.innerHTML) box.innerHTML = ''; return; }
    let h = '';
    for (const r of ACTORS) {
      if (r === PLAYER || r.gone || r.team !== G.myTeam) continue;
      const v = _v1.copy(r.pos); v.y += (r.stance === 'prone' ? 0.6 : r.stance === 'crouch' ? 1.5 : 2.05);
      v.project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
      const x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight;
      h += `<div class="tag ${r.dead ? 'dead' : ''}" style="left:${x | 0}px;top:${y | 0}px">${esc(r.name)}${r.dead ? ' ✕' : ''}<i style="width:${Math.max(0, r.health) / MAX_HP * 100}%"></i></div>`;
    }
    if (h !== this._tags) { box.innerHTML = h; this._tags = h; }
  },
  rangeHud() {
    const g = RANGE.game, L = RANGE.last;
    let h = '';
    if (g) {
      const avg = g.reactions.length ? Math.round(g.reactions.reduce((s, x) => s + x, 0) / g.reactions.length * 1000) : 0;
      h += `<b>타겟 연습 · ${TP_DIFF[g.diff].name}</b><div class="big">${g.kills} <small>/ ${g.total}</small></div>`;
      h += `<div>놓침 ${g.misses} · 평균 반응 ${avg}ms</div><div>명중률 ${g.shots ? Math.round(g.hits / g.shots * 100) : 0}%</div>`;
    } else {
      h += `<b>훈련장 · 자유 연습</b>`;
      h += `<div>명중 ${RANGE.hits} / ${RANGE.shots} (${RANGE.shots ? Math.round(RANGE.hits / RANGE.shots * 100) : 0}%) · 헤드샷 ${RANGE.heads}</div>`;
    }
    if (L) h += `<div class="last">마지막: <em class="${L.part === 'head' ? 'hd' : ''}">${{ head: '머리', torso: '몸통', leg: '다리' }[L.part]} ${L.dmg}</em> · ${L.dist}m · ${L.gun}</div>`;
    h += `<div class="keys2"><kbd>Tab</kbd> 훈련장 메뉴 · <kbd>~</kbd> 총 바꾸기</div>`;
    if (h !== this._rh) { $('rangehud').innerHTML = h; this._rh = h; }
  },
  drawCompass() {
    const head = ((-camera.rotation.y / DEG) % 360 + 360) % 360;
    if (this._head !== undefined && Math.abs(head - this._head) < 0.15) return; this._head = head; // 방향이 그대로면 다시 안 그려요
    const c = this.cc, W = c.canvas.width, H = c.canvas.height; c.clearRect(0, 0, W, H);
    c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(0, 0, W, H);
    c.font = '600 13px system-ui, sans-serif'; c.textAlign = 'center';
    const pxPerDeg = W / 140;
    for (let d = Math.floor(head - 70); d <= head + 70; d++) {
      const dd = ((d % 360) + 360) % 360, x = W / 2 + (d - head) * pxPerDeg;
      if (dd % 15 === 0) {
        const lab = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }[dd];
        c.fillStyle = lab ? (dd === 0 ? '#ffd24a' : '#fff') : 'rgba(255,255,255,0.75)';
        c.fillText(lab || String(dd), x, 15);
        c.fillRect(x - 0.5, 20, 1, 8);
      } else if (dd % 5 === 0) { c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x - 0.5, 23, 1, 5); }
    }
    c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(W / 2 - 5, H); c.lineTo(W / 2 + 5, H); c.lineTo(W / 2, H - 6); c.fill();
    UI('heading', 'textContent', Math.round(head) % 360);
  },
  updateArc(p) {
    const on = p.mode === 'throw' && p.pin && !p.dead && G.state !== 'menu'; // 안전핀 뽑고 있을 때 빨간 궤적 (배그처럼)
    this.arcLine.visible = this.arcRing.visible = on;
    if (!on) return;
    const o = p.throwOrigin(new V3()), v = p.throwVelocity(INPUT.rmb, new V3());
    const pts = predictThrow(o, v, 3.2, 1 / 50);
    this.arcLine.geometry.setFromPoints(pts.slice(3)); this.arcLine.computeLineDistances();
    const e = pts[pts.length - 1]; this.arcRing.position.set(e.x, e.y - 0.03, e.z);
  },
};
function attSummary(a) {
  const s = [];
  if (a.scope) s.push(SCOPES.find(x => x.id === a.scope).name);
  if (a.muzzle) s.push(MUZZLES[a.muzzle]);
  if (a.grip) s.push(GRIPS[a.grip]);
  if (a.mag) s.push('대용량 퀵드로우');
  if (a.stock) s.push(STOCKS[a.stock]);
  return s.join(' · ');
}
