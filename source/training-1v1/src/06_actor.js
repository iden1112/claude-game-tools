// ================= 캐릭터 (플레이어와 봇이 같이 씀) =================
const STANCE = {
  stand: { h: 1.8, eye: 1.62, speed: 4.7, sprint: 6.0, recoil: 1.0, spread: 1.0 },
  crouch: { h: 1.25, eye: 1.12, speed: 2.6, sprint: 4.0, recoil: 0.8, spread: 0.8 },
  prone: { h: 0.6, eye: 0.38, speed: 1.15, sprint: 1.15, recoil: 0.55, spread: 0.6 },
};
const MAX_HP = 150;
const RADIUS = 0.33, STEP = 0.46, JUMP_V = 6.1, G_ACC = 15;

class Actor {
  constructor(name, isPlayer, look) {
    this.name = name; this.isPlayer = isPlayer;
    this.soldier = buildSoldier(look); scene.add(this.soldier.root);
    this.pos = new V3(); this.vel = new V3(); this.yaw = 0; this.pitch = 0;
    this.stance = 'stand'; this.stanceH = STANCE.stand.eye; this.stanceLock = 0;
    this.onGround = true; this.lean = 0; this.leanTarget = 0;
    this.wish = new V3(); this.sprint = false; this.jumpReq = false;
    this.eyePos = new V3(); this.hitbox = { head: { c: new V3() } };
    this.weapons = []; this.cur = 0; this.mode = 'gun'; // gun | throw
    this.throwables = {}; this.throwType = 'frag';
    this.reset();
  }
  reset() {
    this.health = MAX_HP; this.dead = false; this.blind = 0; this.vault = null;
    this.helmet = { lv: SETTINGS.armor, dur: ARMOR.helmet.dur[SETTINGS.armor] };
    this.vest = { lv: SETTINGS.armor, dur: ARMOR.vest.dur[SETTINGS.armor] };
    this.soldier.setArmor(this.helmet.lv, this.vest.lv);
    this.stance = 'stand'; this.stanceH = STANCE.stand.eye; this.lean = this.leanTarget = 0;
    this.vel.set(0, 0, 0); this.onGround = true;
    this.shoulder = false; this.shoulderT = 0;
    this.cooldown = 0; this.reloadT = 0; this.boltT = 0; this.switchT = 0; this.adsT = 0; this.ads = false; this.burst = 0; this.dmgLog = null;
    this.shots = 0; this.sinceShot = 9; this.recoilAcc = 0; this.recoilYawAcc = 0; this.trigger = false; this.triggerEdge = false;
    this.pin = false; this.cookT = -1; this.mode = 'gun';
    this.throwables = { frag: THROWABLES.frag.count, smoke: THROWABLES.smoke.count, flash: THROWABLES.flash.count };
    this.lastDamage = 0; this.stepAcc = 0; this.fireMode = null;
    for (const w of this.weapons) { w.mag = w.stats.mag; w.reserve = Math.max(w.stats.mag * 6, 15); }
    this.soldier.deadT = 0; this.soldier.body.rotation.set(0, 0, 0);
    this.soldier.setVisible(true);
    this.equip(0, true);
  }
  // 무기 지급 (풀파츠)
  setLoadout(list) {
    this.weapons = list.map(({ id, att }) => {
      const stats = weaponStats(id, att);
      AU.prep(id, WEAPONS[id].cat);
      const model = buildGunModel(id, att);
      return { id, att, stats, mag: stats.mag, reserve: stats.mag * 6, model: model.group, info: model, fireMode: WEAPONS[id].modes.includes('A') ? 'A' : WEAPONS[id].modes.includes('B') ? 'B' : WEAPONS[id].modes[0] };
    });
    this.equip(0, true);
  }
  get w() { return this.weapons[this.cur]; }
  equip(i, instant) {
    if (!this.weapons.length) return;
    i = clamp(i, 0, this.weapons.length - 1);
    if (this.pin) return;
    if (i === this.cur && this.mode === 'gun' && !instant) return;
    this.cur = i; this.mode = 'gun'; this.reloadT = 0; this.ads = false; this.burst = 0; this.boltT = 0;
    this.switchT = instant ? 0 : 0.55;
    this.soldier.setGun(this.w.model); this.soldier.setArms(this.w.stats.cat);
    if (this.onEquip) this.onEquip();
  }
  equipThrow(type) {
    if (this.pin) return;
    const order = ['frag', 'smoke', 'flash'];
    if (!type) {
      if (this.mode === 'throw') { // 다음 종류
        let k = order.indexOf(this.throwType);
        for (let n = 1; n <= 3; n++) { const t = order[(k + n) % 3]; if (this.throwables[t] > 0) { type = t; break; } }
      } else type = this.throwables[this.throwType] > 0 ? this.throwType : order.find(t => this.throwables[t] > 0);
    }
    if (!type || this.throwables[type] <= 0) return;
    this.throwType = type; this.mode = 'throw'; this.ads = false; this.reloadT = 0; this.switchT = 0.35;
    this.soldier.setGun(buildGrenadeModel(type)); this.soldier.setArms('HG');
    if (this.onEquip) this.onEquip();
  }
  holster() { // X: 총 넣고 맨손
    if (this.pin || this.dead) return;
    if (this.mode === 'fist') { this.equip(this.cur); return; }
    this.mode = 'fist'; this.ads = false; this.reloadT = 0; this.burst = 0; this.boltT = 0; this.switchT = 0.3; this.punchCD = 0;
    this.soldier.setGun(null); this.soldier.setArms('HG');
    if (this.onEquip) this.onEquip();
  }
  punch() {
    this.punchCD = 0.55; this.punchT = 0.28; this.punchSide = !this.punchSide;
    const o = new V3(), d = new V3(); this.getAim(o, d);
    const e = o.clone().addScaledVector(d, 1.7);
    let best = null, bp = null, bs = 9;
    for (const a of ACTORS) {
      if (a === this || a.dead || (G.mode === 'mp' && a.team !== undefined && a.team === this.team)) continue;
      if (a.pos.distanceTo(this.pos) > 3) continue;
      const h = segHitSoldier(o, e, a.hitbox) || segHitSoldier(o.clone().add(new V3(0, -0.25, 0)), e.clone().add(new V3(0, -0.25, 0)), a.hitbox);
      if (h && h.s < bs) { bs = h.s; best = a; bp = h.part; }
    }
    if (best && raycastWorld(o, d, bs * 1.7)) best = null; // 벽 너머는 안 맞음
    if (this.isPlayer) AU.punch(!!best);
    if ((this.isPlayer || this.netBot) && NET.active) netSend({ t: 'punch' }, '*', this.isPlayer ? NET.id : this.netId);
    if (best) bulletHit({ owner: this, st: FIST_ST, dmg: 18, dist: 1 }, best, bp, o.clone().addScaledVector(d, bs * 1.7), d.clone());
  }
  get height() { return this.stance === 'prone' ? 0.6 : this.stance === 'crouch' ? 1.25 : 1.8; }
  canStand(h) { return ceilingAt(this.pos.x, this.pos.z, RADIUS * 0.8, this.pos.y + 0.3) - this.pos.y > h; }
  setStance(s) {
    if (this.dead || this.vault || s === this.stance) return;
    if (!this.onGround && s !== 'stand') return;
    if (STANCE[s].h > STANCE[this.stance].h && !this.canStand(STANCE[s].h)) return;
    if (this.proneLock > 0) return; // 엎드리는/일어나는 중엔 자세를 또 바꿀 수 없어요
    if (s === 'prone' || this.stance === 'prone') { // 배그처럼: 엎드리기 1초, 일어나기 0.85초 동안 무릎 꿇고 → 눕기(또는 반대) 모션, 그동안 못 쏴요
      this.proneDur = s === 'prone' ? 1.0 : 0.85; this.proneLock = this.proneDur; this.proneFromH = this.stanceH; this.stanceLock = this.proneDur;
      this.ads = false;
    } else this.stanceLock = 0.15;
    this.stance = s;
  }
  // ---------- 이동 ----------
  physics(dt) {
    const st = STANCE[this.stance];
    this.stanceLock = Math.max(0, this.stanceLock - dt);
    if (this.proneLock > 0) { const q = clamp(1 - (this.proneLock - dt) / this.proneDur, 0, 1); this.stanceH = lerp(this.proneFromH, st.eye, q * q * (3 - 2 * q)); this.ads = false; }
    else this.stanceH = damp(this.stanceH, st.eye, this.stance === 'prone' || this.stanceH < 0.6 ? 6 : 12, dt);
    this.lean = damp(this.lean, this.stance === 'prone' ? this.leanTarget * 0.5 : this.leanTarget, 12, dt);
    if (this.dead) { this.vel.x = damp(this.vel.x, 0, 5, dt); this.vel.z = damp(this.vel.z, 0, 5, dt); }
    if (this.vault) { this.updateVault(dt); this.afterMove(dt); return; }
    // 원하는 속도
    let sp = this.sprint ? st.sprint : st.speed;
    if (this.mode === 'gun' && this.w) sp *= CAT_INFO[this.w.stats.cat].move;
    else if (this.mode === 'fist') sp *= this.sprint ? 1.13 : 1.06; // 맨손이 제일 빨라요
    if (this.ads && !this.sprint) sp *= this.stance === 'prone' ? 0.0 : 0.6;
    else if (this.shoulderT > 0.5) sp *= 0.8;
    if (this.proneLock > 0) sp *= 0.12;
    if (this.reloadT > 0 && this.stance === 'prone') sp *= 0.0;
    const wl = Math.hypot(this.wish.x, this.wish.z);
    let tx = 0, tz = 0;
    if (wl > 0.01 && !this.dead) {
      const lx = this.wish.x / wl, lz = this.wish.z / wl, c = Math.cos(this.yaw), s = Math.sin(this.yaw);
      // 뒤/옆으로 걸으면 조금 느리게
      const dirMul = lz > 0.2 ? 0.8 : Math.abs(lx) > 0.7 ? 0.9 : 1;
      tx = (lx * c + lz * s) * sp * dirMul * Math.min(1, wl); tz = (-lx * s + lz * c) * sp * dirMul * Math.min(1, wl);
    }
    const k = this.onGround ? 11 : 1.5;
    this.vel.x = damp(this.vel.x, tx, k, dt); this.vel.z = damp(this.vel.z, tz, k, dt);
    // 점프 / 넘기
    // 점프: 누른 뒤 0.15초 동안 기억 + 땅에서 막 떨어진 0.12초 안에도 점프 허용 (달리다 작은 턱·경사에서 씹히지 않게)
    if (this.jumpReq) { this.jumpBuf = 0.15; this.jumpReq = false; }
    if (this.jumpBuf > 0) this.jumpBuf -= dt;
    this.airT = this.onGround ? 0 : (this.airT || 0) + dt;
    if (this.jumpBuf > 0 && !this.dead && (this.onGround || (this.airT < 0.12 && this.vel.y <= 0.5))) {
      this.jumpBuf = 0;
      if (!this.tryVault()) {
        if (this.stance === 'prone') this.setStance('crouch');
        else if (this.stance === 'crouch') this.setStance('stand');
        else { this.vel.y = JUMP_V; this.onGround = false; this.ads = false; }
      }
      if (this.vault) { this.afterMove(dt); return; }
    }
    this.vel.y -= G_ACC * dt;
    // 옆 이동 + 충돌
    // 얇은 벽을 뚫고 지나가지 않게 한 번에 0.12m씩 나눠서 움직여요 (화면이 끊길 때도)
    { const mv = Math.hypot(this.vel.x, this.vel.z) * dt, n = Math.min(12, Math.max(1, Math.ceil(mv / 0.12)));
      for (let i = 0; i < n; i++) { this.pos.x += this.vel.x * dt / n; this.pos.z += this.vel.z * dt / n; collideXZ(this.pos, RADIUS, this.pos.y, this.pos.y + this.height, this.onGround ? STEP : 0.12); } }
    // 위아래
    let ny = this.pos.y + this.vel.y * dt;
    if (this.vel.y > 0) {
      const ceil = ceilingAt(this.pos.x, this.pos.z, RADIUS * 0.85, this.pos.y + this.height - 0.05);
      if (ny + this.height > ceil) { ny = ceil - this.height; this.vel.y = 0; }
    }
    const gnd = groundAt(this.pos.x, this.pos.z, RADIUS * 0.75, Math.max(this.pos.y, ny), this.onGround ? STEP : 0.12);
    const wasGround = this.onGround;
    if (ny <= gnd) {
      if (!wasGround && this.vel.y < -6) { this.onLand && this.onLand(-this.vel.y); }
      this.pos.y = gnd; this.vel.y = 0; this.onGround = true;
    } else if (wasGround && this.pos.y - gnd < STEP + 0.05 && this.vel.y <= 0) {
      this.pos.y = gnd; this.vel.y = 0; this.onGround = true; // 계단 내려가기
    } else { this.pos.y = ny; this.onGround = false; }
    this.afterMove(dt);
  }
  afterMove(dt) {
    if (this.proneLock > 0) this.proneLock = Math.max(0, this.proneLock - dt);
    if (this.throwAnimT > 0) this.throwAnimT -= dt;
    if (this.pinAnimT > 0) this.pinAnimT -= dt;
    const s = this.soldier;
    s.root.position.copy(this.pos); s.root.rotation.y = this.yaw;
    const hsp = Math.hypot(this.vel.x, this.vel.z);
    s.animate({ speed: hsp, stance: this.stance, sprint: this.sprint && hsp > 3, air: !this.onGround && !this.vault, lean: this.lean, pitch: this.pitch, dead: this.dead, stanceH: s.body.position.y, reloadT: this.reloadT > 0 ? 1 - this.reloadT / (this.reloadDur || 1) : 0, vault: this.vault ? Math.min(1, this.vault.t) : (this.netVault >= 0 ? this.netVault : -1), vaultOver: this.vault ? this.vault.over : !!this.netVaultOver, proneTr: this.proneLock > 0 ? { p: 1 - this.proneLock / this.proneDur, down: this.stance === 'prone' } : null, thr: this.throwAnimT > 0 ? 1 - this.throwAnimT / 0.5 : 0, thrUnder: this.throwUnder, pinUp: this.mode === 'throw' && this.pin }, dt);
    soldierHitboxes(s, this.hitbox);
    // 눈 위치 (기울이기 포함)
    const right = _v1.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.eyePos.set(this.pos.x, this.pos.y + this.stanceH, this.pos.z).addScaledVector(right, this.lean * (this.stance === 'prone' ? 0.25 : 0.42));
    this.eyePos.y -= Math.abs(this.lean) * 0.06;
    if (this.stance === 'prone') { const f = _v2.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); this.eyePos.addScaledVector(f, 0.55); }
    // 발소리
    if (this.onGround && hsp > 1.0 && !this.dead) {
      this.stepAcc += hsp * dt;
      const stride = this.stance === 'prone' ? 1.0 : 1.6;
      if (this.stepAcc > stride) { this.stepAcc = 0; const soft = this.stance !== 'stand' || hsp < 3; AU.step(this.pos, this.isPlayer, soft); if (this.onStep) this.onStep(soft); }
    }
  }
  // 파쿠르: 앞의 장애물을 넘거나 올라가기
  tryVault() {
    if (this.stance === 'prone') return false;
    const fx_ = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    // 계단 위나 계단 앞에서는 넘기(파쿠르) 대신 그냥 점프해요
    for (const d of [0, 0.35, 0.65, 0.95]) {
      const x = this.pos.x + fx_ * d, z = this.pos.z + fz * d, r = 0.25;
      for (const b of WORLD.boxes) if (b.kind === 'stair' && x + r > b.min.x && x - r < b.max.x && z + r > b.min.z && z - r < b.max.z && b.max.y > this.pos.y - 0.05 && b.min.y < this.pos.y + 2.8) return false;
    }
    // 앞쪽에서 가장 높은 면
    let top = -1, hitD = 0;
    for (const d of [0.45, 0.65, 0.85]) {
      const x = this.pos.x + fx_ * d, z = this.pos.z + fz * d;
      const t = groundAt(x, z, 0.12, this.pos.y, 2.75);
      if (t - this.pos.y > 0.4 && t > top) { top = t; hitD = d; }
    }
    const rise = top - this.pos.y;
    if (top < 0 || rise < 0.4 || rise > 2.75) return false;
    // 위에 공간이 있는지
    const ox = this.pos.x + fx_ * (hitD + 0.15), oz = this.pos.z + fz * (hitD + 0.15);
    if (ceilingAt(ox, oz, 0.2, top + 0.01) - top < 0.95) return false;
    if (ceilingAt(this.pos.x, this.pos.z, 0.25, this.pos.y + this.height - 0.1) < top + 0.9) return false;
    // 장애물 두께 재기 → 넘을지 올라설지
    let far = -1, onTop = false;
    for (let d = hitD - 0.3; d < hitD + 1.9; d += 0.06) {
      const x = this.pos.x + fx_ * d, z = this.pos.z + fz * d;
      const t = groundAt(x, z, 0.03, top + 0.02, 0.05);
      if (t >= top - 0.05) onTop = true;
      else if (onTop && t < top - 0.3) { far = d; break; }
    }
    const from = this.pos.clone();
    let to, over = false;
    if (far > 0 && rise < 1.3) {
      const land = far + RADIUS + 0.15;
      to = new V3(this.pos.x + fx_ * land, 0, this.pos.z + fz * land);
      // 넘어간 곳이 막혀 있으면 올라서기만
      const probe = to.clone(); probe.y = top;
      const blocked = WORLD.boxes.some(b => probe.x + RADIUS > b.min.x && probe.x - RADIUS < b.max.x && probe.z + RADIUS > b.min.z && probe.z - RADIUS < b.max.z && b.max.y > top + 0.1 && b.min.y < top + 1.5);
      if (!blocked) { to.y = top; over = true; }
    }
    if (!over) {
      const dd = Math.min(hitD + 0.45, far > 0 ? far - 0.1 : hitD + 0.45);
      to = new V3(this.pos.x + fx_ * dd, top, this.pos.z + fz * dd);
    }
    const dur = over ? (rise < 1.1 ? 0.55 : 0.75) : (rise < 1.2 ? 0.6 : rise < 2 ? 0.95 : 1.25);
    this.vault = { t: 0, dur, from, to, top, over, rise };
    this.vel.set(0, 0, 0); this.ads = false; this.reloadT = 0; this.stance = 'stand';
    if (this.onVault) this.onVault(this.vault);
    return true;
  }
  updateVault(dt) {
    const v = this.vault; v.t += dt / v.dur;
    const t = Math.min(1, v.t);
    const up = Math.min(1, t / 0.55), e = 1 - Math.pow(1 - up, 2);
    const hz = t < 0.55 ? t / 0.55 * 0.45 : 0.45 + (t - 0.55) / 0.45 * 0.55;
    this.pos.x = lerp(v.from.x, v.to.x, hz); this.pos.z = lerp(v.from.z, v.to.z, hz);
    this.pos.y = lerp(v.from.y, v.top + 0.12, e);
    if (t >= 1) {
      this.vault = null; this.onGround = false; this.vel.set(0, 0, 0);
      if (v.over) { this.vel.set((v.to.x - v.from.x) * 1.2, 0, (v.to.z - v.from.z) * 1.2); }
      else { this.pos.y = v.top; this.onGround = true; }
      collideXZ(this.pos, RADIUS, this.pos.y, this.pos.y + this.height, 0.12);
    }
  }
  // ---------- 총 ----------
  get canShoot() { return !this.dead && !this.vault && this.switchT <= 0 && this.reloadT <= 0 && this.boltT <= 0 && !(this.sprint && Math.hypot(this.vel.x, this.vel.z) > 3) && !(this.proneLock > 0); }
  startReload() {
    const w = this.w; if (!w || this.mode !== 'gun' || this.reloadT > 0 || w.mag >= w.stats.mag || w.reserve <= 0 || this.dead || this.vault) return;
    this.reloadDur = w.mag === 0 ? w.stats.reload * 1.15 : w.stats.reload; this.reloadEmpty = w.mag === 0;
    this.reloadT = this.reloadDur; this.burst = 0;
    if (this.isPlayer) AU.reload(this.reloadDur);
  }
  cycleFireMode() {
    const w = this.w; if (!w || this.mode !== 'gun') return;
    const m = w.stats.def.modes; const i = m.indexOf(w.fireMode); w.fireMode = m[(i + 1) % m.length];
    if (this.isPlayer) AU.click(0.2, 1800);
  }
  updateWeapon(dt) {
    this.cooldown -= dt; this.switchT = Math.max(0, this.switchT - dt); this.sinceShot += dt;
    this.blind = Math.max(0, this.blind - dt);
    const w = this.w;
    if (this.boltT > 0) { this.boltT -= dt; }
    if (this.reloadT > 0) {
      this.reloadT -= dt; this.ads = false;
      if (this.reloadT <= 0) { const need = w.stats.mag - w.mag, take = Math.min(need, w.reserve); w.mag += take; w.reserve -= take; this.reloadT = 0; }
    }
    // 조준 (ADS) 진행
    const adsTime = w ? w.stats.adsTime : 0.2;
    const bolting = w && w.stats.def.bolt && this.boltT > 0 && this.boltT < w.stats.def.interval - 0.12;
    const wantAds = this.ads && this.mode === 'gun' && this.reloadT <= 0 && !this.vault && this.switchT <= 0 && !bolting;
    this.adsT = clamp(this.adsT + (wantAds ? dt / adsTime : -dt / (adsTime * 0.8)), 0, 1);
    const wantSh = this.shoulder && !this.ads && this.mode === 'gun' && !this.vault && !this.sprint;
    this.shoulderT = clamp(this.shoulderT + (wantSh ? dt / 0.12 : -dt / 0.12), 0, 1);
    // 반동 회복
    if (this.sinceShot > 0.14 && this.recoilAcc > 0) {
      const rec = Math.min(this.recoilAcc, dt * 3.5 * (w ? w.stats.recovery : 1) * Math.max(0.4, this.recoilAcc));
      this.recoilAcc -= rec;
      if (this.sinceShot < 1.2) this.pitch -= rec * 0.18;
    }
    if (this.sinceShot > 0.25) this.shots = 0;
    if (this.mode === 'throw') { this.updateThrow(dt); return; }
    if (this.mode === 'fist') { // 맨손 공격
      this.punchCD = Math.max(0, (this.punchCD || 0) - dt); this.punchT = Math.max(0, (this.punchT || 0) - dt);
      if ((this.triggerEdge || this.trigger) && this.punchCD <= 0 && this.switchT <= 0 && !this.vault && !this.dead) this.punch();
      this.triggerEdge = false; return;
    }
    if (!w) return;
    // 사격
    const fm = w.fireMode;
    if (this.triggerEdge) {
      this.triggerEdge = false;
      if (w.mag <= 0) { if (this.isPlayer) AU.empty(); this.startReload(); }
      else if (fm === 'B') this.burst = 3;
      else if (fm === 'S' || fm === 'A') this.burst = 1;
    }
    const want = this.burst > 0 || (fm === 'A' && this.trigger);
    if (want && this.cooldown <= 0 && this.canShoot) {
      if (w.mag > 0) { this.fire(); if (this.burst > 0) { this.burst--; if (fm === 'B' && this.burst === 0) this.cooldown = Math.max(this.cooldown, 0.22); } } // 점사: 3발 끝나면 잠깐 쉬어요 (배그처럼)
      else { this.burst = 0; if (this.isPlayer) AU.empty(); this.startReload(); }
    }
  }
  fire() {
    const w = this.w, st = w.stats, def = st.def;
    w.mag--; this.sinceShot = 0; this.shots++;
    this.cooldown = def.bolt ? 0.05 : (w.fireMode === 'B' ? def.interval * 0.75 : def.interval);
    if (def.bolt || def.id === 'win94' || def.id === 's1897' || def.id === 'dbs') { this.boltT = def.interval; if (this.isPlayer) setTimeout(() => AU.bolt(), 10); }
    if (def.cat === 'SG' && def.id !== 's1897' && def.id !== 'dbs') this.cooldown = def.interval;
    // 조준 방향
    const origin = _v1, dir = _v2;
    this.getAim(origin, dir);
    const moving = Math.hypot(this.vel.x, this.vel.z);
    const sst = STANCE[this.stance];
    const hipEff = st.hip * lerp(1, 0.42, this.shoulderT);
    let spread = lerp(hipEff, st.ads, this.adsT) * sst.spread;
    spread += (moving / 6) * lerp(2.0, 0.6, this.adsT) * (def.cat === 'SR' ? 2 : 1);
    if (!this.onGround) spread += 4;
    if (def.cat === 'SR' && this.adsT < 0.99) spread += 3; // 저격총 비조준 사격은 부정확
    const right = _v3.set(0, 1, 0).cross(dir).normalize(), up = _v4.copy(dir).cross(right).normalize();
    const dirs = [];
    for (let p = 0; p < def.pellets; p++) {
      const sp = def.cat === 'SG' ? lerp(st.hip * lerp(1, 0.75, this.shoulderT), st.ads, this.adsT) : spread;
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * Math.tan(sp * DEG);
      const d = dir.clone().addScaledVector(right, Math.cos(a) * r * (st.spreadH || 1)).addScaledVector(up, Math.sin(a) * r * (st.spreadV || 1)).normalize();
      spawnBullet(this, origin, d, st, def.dmg);
      dirs.push(d.toArray().map(v => +v.toFixed(5)));
    }
    if ((this.isPlayer || this.netBot) && NET.active) netSend({ t: 'shot', id: def.id, o: origin.toArray().map(v => +v.toFixed(3)), d: dirs }, '*', this.isPlayer ? NET.id : this.netId);
    if (this.isPlayer && G.mode === 'range') { RANGE.shots++; if (RANGE.game) RANGE.game.shots++; }
    // 반동
    const ramp = 0.8 + Math.min(this.shots, 14) * 0.075;
    // 높은 배율로 연사할수록 반동이 더 세게 (3배 1.3, 4배 1.45, 6배 1.75, 8배 2.0)
    const zm = this.adsT > 0.5 ? effZoom(this.w) : 1;
    const hiZ = zm >= 3 && this.shots >= 2 && !def.bolt ? 1 + (zm - 2) * 0.15 + (zm >= 3 ? 0.15 : 0) : 1;
    const vk = st.rv * 1.35 * sst.recoil * (this.adsT > 0.5 ? 1 : 1.25) * ramp * hiZ * rand(0.85, 1.15);
    const drift = (def.id.charCodeAt(0) % 3 - 1) * 0.25;
    const hk = st.rh * 1.3 * sst.recoil * Math.sqrt(hiZ) * (rand(-1, 1) + drift) * (this.shots < 3 ? 0.6 : 1);
    this.applyRecoil(vk * DEG, hk * DEG);
    // 소리 + 화염
    const muz = this.muzzleWorld(new V3());
    AU.shot(muz, def.cat, st.suppressed, this.isPlayer, def.id);
    if (def.cat !== 'XB') muzzleFlash(muz, dir, def.cat === 'SR' || def.cat === 'SG' || def.cat === 'LMG', st.flashHidden);
    else if (w.mag <= 0) { this.cooldown = 0.35; setTimeout(() => { if (this.w === w && w.mag <= 0) this.startReload(); }, 350); } // 석궁: 쏘면 바로 다시 장전
    if (this.onFire) this.onFire(st);
    for (const a of ACTORS) if (a !== this && a.hearShot) a.hearShot(this, st.suppressed);
  }
  applyRecoil(v, h) { this.pitch += v; this.yaw -= h; this.recoilAcc += v; }
  muzzleWorld(out) { const info = this.w.info; info.muzzle.getWorldPosition(out); return out; }
  // ---------- 던지기 ----------
  updateThrow(dt) {
    if (this.cookT >= 0) {
      this.cookT += dt;
      if (this.cookT >= THROWABLES[this.throwType].fuse) { // 손에서 터짐
        this.throwables[this.throwType]--; this.pin = false; this.cookT = -1;
        explodeGrenade(this.throwType, this.eyePos.clone(), this);
        if ((this.isPlayer || this.netBot) && NET.active) netSend({ t: 'boom', type: this.throwType, p: this.eyePos.toArray() }, '*', this.isPlayer ? NET.id : this.netId);
        this.afterThrow();
      }
    }
  }
  pullPin() {
    if (this.mode !== 'throw' || this.pin || this.switchT > 0 || this.throwables[this.throwType] <= 0 || this.dead) return;
    this.pin = true; this.cookT = -1; this.pinAnimT = 0.35; AU.pin(this.isPlayer ? null : this.pos);
  }
  cook() { if (this.pin && this.cookT < 0) { this.cookT = 0; if (this.isPlayer) AU.click(0.2, 2600); } }
  throwVelocity(under, out) {
    const dir = _v1.set(0, 0, -1).applyAxisAngle(_v2.set(1, 0, 0), this.pitch).applyAxisAngle(_v2.set(0, 1, 0), this.yaw);
    const speed = under ? 9 : 19;
    out.copy(dir).multiplyScalar(speed); out.y += under ? 1.0 : 2.4;
    out.x += this.vel.x * 0.5; out.z += this.vel.z * 0.5;
    return out;
  }
  throwOrigin(out) {
    const right = _v3.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    out.copy(this.eyePos).addScaledVector(right, 0.18); out.y += 0.05;
    return out;
  }
  release(under) {
    if (!this.pin) return;
    const type = this.throwType;
    const o = this.throwOrigin(new V3()), v = this.throwVelocity(under, new V3());
    const fuse = THROWABLES[type].fuse - Math.max(0, this.cookT);
    throwGrenade(this, type, o, v, Math.max(0.05, fuse));
    if ((this.isPlayer || this.netBot) && NET.active) netSend({ t: 'nade', type, o: o.toArray(), v: v.toArray(), fuse: Math.max(0.05, fuse) }, '*', this.isPlayer ? NET.id : this.netId);
    this.throwables[type]--; this.pin = false; this.cookT = -1;
    AU.spoon(this.isPlayer ? null : this.pos);
    this.throwAnimT = 0.5; this.throwUnder = !!under;
    this.afterThrow();
  }
  afterThrow() {
    if (this.throwables[this.throwType] > 0) { this.switchT = 0.6; this.soldier.setGun(buildGrenadeModel(this.throwType)); }
    else { const other = ['frag', 'smoke', 'flash'].find(t => this.throwables[t] > 0); if (other && this.isPlayer) { this.equipThrow(other); } else this.equip(this.cur, true); this.switchT = 0.6; }
    if (this.onEquip) this.onEquip();
  }
  // ---------- 피해 ----------
  breakArmor(kind) {
    this[kind].lv = 0; this[kind].dur = 0;
    this.soldier.setArmor(this.helmet.lv, this.vest.lv);
  }
  damage(dmg, from, info) {
    if (this.dead || (G.state !== 'live' && G.state !== 'range')) return;
    const real = Math.max(0, Math.min(dmg, this.health));
    if (from && from !== this && real > 0 && !this.dummy) { // 라운드 끝에 보여줄 '넣은 딜'
      if (from === PLAYER) recordDealt(this.name, real);
      else if (from.remote && NET.active && (this === PLAYER || this.netBot)) netSend({ t: 'dealt', d: +real.toFixed(1), n: this.name }, from.netId);
    }
    this.health -= dmg; this.lastDamage = 0;
    if (from && from !== this && dmg > 0) { if (!this.dmgLog) this.dmgLog = new Map(); this.dmgLog.set(from, performance.now()); } // 어시스트용 기록
    if (this.onDamage) this.onDamage(dmg, from, info);
    if (this.health <= 0) { this.health = 0; this.die(from, info); }
  }
  die(from, info) {
    this.deaths = (this.deaths || 0) + 1;
    if (from && from !== this) { from.kills = (from.kills || 0) + 1; if (info && info.head) from.heads = (from.heads || 0) + 1; }
    // 어시스트: 최근 20초 안에 피해를 준 다른 적 (처치한 사람 빼고)
    const assists = [], now = performance.now();
    if (this.dmgLog) for (const [a, t] of this.dmgLog) if (a !== from && a !== this && now - t < 20000 && !a.gone && !(this.team !== undefined && a.team === this.team)) assists.push(a);
    this.dmgLog = null;
    for (const a of assists) giveAssist(a, this);
    this.dead = true; this.ads = false; this.pin = false; this.trigger = false; this.vault = null;
    const myId = this === PLAYER ? NET.id : this.netId;
    if ((this === PLAYER || this.netBot) && NET.active) netSend({ t: 'died', killer: !from || from === this ? myId : from === PLAYER ? NET.id : from.netId, as: assists.map(a => a === PLAYER ? NET.id : a.netId), weapon: info && info.weapon, head: !!(info && info.head), dist: info && info.dist || 0 }, '*', myId);
    GAME.onKill(from, this, info);
  }
}
