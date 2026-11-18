// ================= AI 상대 =================
const BOT_DIFF = [
  { name: '쉬움', react: 0.7, err: 3.4, turn: 3.2, comp: 0.35, head: 0.08, burst: [3, 5], pause: [0.45, 0.8] },
  { name: '보통', react: 0.45, err: 2.1, turn: 5.0, comp: 0.62, head: 0.18, burst: [4, 7], pause: [0.3, 0.55] },
  { name: '어려움', react: 0.3, err: 1.2, turn: 7.5, comp: 0.8, head: 0.3, burst: [5, 9], pause: [0.2, 0.4] },
  { name: '프로', react: 0.2, err: 0.65, turn: 10, comp: 0.92, head: 0.42, burst: [6, 12], pause: [0.12, 0.3] },
];
const BOT_POOLS = {
  primary: ['m416', 'm416', 'akm', 'beryl', 'scar', 'aug', 'ace32', 'mk47', 'ump', 'vector', 'mini14', 'sks', 'kar98k', 'm24', 'slr', 'g36c', 'qbz', 'groza', 'm249'],
  secondary: ['ump', 'vector', 's12k', 'mp5k', 's1897', 'uzi', 'p90', 'js9'],
};
let BOT = null;

function createBot() { BOT = makeBot('봇'); ACTORS.push(BOT); return BOT; }
function makeBot(name) {
  const b = new Actor(name, false, { shirt: 0x6b3a32, pants: 0x3f4436, pack: 0x3b3a30, skin: 0xc48f6a });
  b.ai = {}; b.isBot = true;
  b.getAim = (origin, dir) => {
    origin.copy(b.eyePos);
    dir.set(0, 0, -1).applyAxisAngle(_v3.set(1, 0, 0), b.pitch).applyAxisAngle(_v3.set(0, 1, 0), b.yaw);
  };
  b.applyRecoil = (v, h) => { const c = BOT_DIFF[SETTINGS.difficulty].comp; b.pitch += v * (1 - c); b.yaw -= h * (1 - c); };
  b.hearShot = (shooter, supp) => {
    const d = shooter.pos.distanceTo(b.pos);
    if (d < (supp ? 22 : 160)) { b.ai.heard = shooter.pos.clone(); b.ai.heardT = G.time; }
  };
  b.onDamage = (dmg, from) => {
    if (from && from !== b) { b.ai.heard = from.pos.clone(); b.ai.heardT = G.time; b.ai.hurtT = G.time; if (!b.ai.see) b.ai.alertTurn = true; }
  };
  return b;
}
function botLoadout() {
  const p = pick(BOT_POOLS.primary); let s = pick(BOT_POOLS.secondary);
  if (WEAPONS[p].cat === 'SMG' && WEAPONS[s].cat === 'SMG') s = pick(['m416', 'akm', 'scar']);
  const h = pick(['p92', 'p1911', 'p18c', 'deagle']);
  return [{ id: p, att: fullAttachments(p) }, { id: s, att: fullAttachments(s) }, { id: h, att: fullAttachments(h) }];
}
function botRoundStart(b = BOT) {
  const ai = b.ai;
  Object.assign(ai, {
    see: false, seeT: 0, reactT: 0, lastSeen: null, lastSeenT: -99, heard: null, heardT: -99, hurtT: -99,
    path: null, pathI: 0, goal: null, repathT: 0, strafe: 1, strafeT: 0, crouchT: 0, burstLeft: 0, pauseT: 0,
    errY: 0, errP: 0, errT: 0, trackT: 0, aimHead: Math.random() < BOT_DIFF[SETTINGS.difficulty].head, mode: Math.random() < 0.55 ? 'push' : 'hold',
    holdT: rand(6, 14), stuckT: 0, lastPos: b.pos.clone(), nadeCD: rand(6, 12), coverT: 0, visT: 0, peekT: 0, thinkT: 0, alertTurn: false,
  });
  // 처음 갈 곳 (봇 쪽 절반)
  const spots = [[16, 20], [0, 17], [-19, 13], [6, 8], [-8, 9.5], [30, 14], [-22, 6], [13, 6.5], [0, 7.2]];
  const s = pick(spots); ai.goal = new V3(s[0] + rand(-1, 1), 0, s[1] + rand(-1, 1));
}
function botWeaponFor(dist, b = BOT) {
  let best = b.cur;
  const score = (w) => {
    const c = w.stats.cat;
    if (c === 'SG') return dist < 18 ? 3 : -1;
    if (c === 'SMG') return dist < 30 ? 2.5 : dist < 60 ? 1.5 : 0.5;
    if (c === 'SR') return dist > 40 ? 3 : dist > 18 ? 1.5 : 0.2;
    if (c === 'DMR') return dist > 30 ? 2.6 : 1.2;
    if (c === 'HG') return 0.3;
    return dist < 90 ? 2.2 : 1.8;
  };
  let bs = -9; b.weapons.forEach((w, i) => { const s = score(w) + (w.mag > 0 ? 0 : -1); if (s > bs) { bs = s; best = i; } });
  return best;
}
function botTargetPoint(out, b = BOT) {
  const ai = b.ai, p = ai.target;
  if (ai.aimHead) out.copy(p.hitbox.head.c);
  else out.copy(p.hitbox.pelvis).lerp(p.hitbox.chestTop, 0.6);
  return out;
}
function botCanSee(b = BOT) {
  const p = b.ai.target;
  if (!p || p.dead || p.gone || b.blind > 0.5) return false;
  const d = b.eyePos.distanceTo(p.eyePos); if (d > 200) return false;
  const to = _v1.copy(p.eyePos).sub(b.eyePos).normalize();
  const fwd = _v2.set(-Math.sin(b.yaw), 0, -Math.cos(b.yaw));
  const cosA = to.x * fwd.x + to.z * fwd.z;
  if (cosA < 0.45 && d > 5) return false;
  const pts = [p.hitbox.head.c, p.hitbox.chestTop, p.hitbox.pelvis];
  let vis = 0; for (const q of pts) if (q && losClear(b.eyePos, q)) vis++;
  if (!vis) return false;
  if (p.stance === 'prone' && d > 45 && vis < 2) return Math.random() < 0.3;
  return true;
}
function findCover(fromPos, threat) {
  let best = null, bs = Infinity;
  const tEye = threat.clone(); tEye.y = Math.max(tEye.y, 1.5);
  for (let k = 0; k < 70; k++) {
    const a = Math.random() * Math.PI * 2, r = rand(1.5, 15);
    const x = fromPos.x + Math.cos(a) * r, z = fromPos.z + Math.sin(a) * r;
    const [i, j] = navCell(x, z);
    if (!navFree(i, j) || NAV.cover[i + j * NAV.n] < 2) continue;
    const cx = i - NAV.off + 0.5, cz = j - NAV.off + 0.5;
    const p = _v3.set(cx, 1.05, cz);
    if (losClear(tEye, p, false)) continue;
    const pp = _v4.set(cx, 1.6, cz); const peek = losClear(tEye, pp, false) ? 1 : 0;
    const s = Math.hypot(cx - fromPos.x, cz - fromPos.z) - peek * 2 + Math.abs(Math.hypot(cx - threat.x, cz - threat.z) - 25) * 0.15;
    if (s < bs) { bs = s; best = new V3(cx, 0, cz); }
  }
  return best;
}
function botGoTo(goal, b = BOT) {
  const ai = b.ai;
  if (ai.goal && ai.path && ai.goal.distanceTo(goal) < 1.5 && ai.repathT > 0) return;
  ai.goal = goal.clone(); ai.path = findPath(b.pos.x, b.pos.z, goal.x, goal.z); ai.pathI = 0; ai.repathT = 2.5;
}
// 수류탄 각도 찾기
function botPlanNade(target, b = BOT) {
  const dx = target.x - b.pos.x, dz = target.z - b.pos.z;
  const yaw = Math.atan2(-dx, -dz);
  let best = null, bd = Infinity;
  const saveY = b.yaw, saveP = b.pitch;
  b.yaw = yaw;
  for (let pa = -0.15; pa < 0.95; pa += 0.08) {
    b.pitch = pa;
    const o = b.throwOrigin(new V3()), v = b.throwVelocity(false, new V3());
    const pts = predictThrow(o, v, 3.5, 1 / 40);
    const end = pts[pts.length - 1];
    const d = Math.hypot(end.x - target.x, end.z - target.z);
    if (d < bd) { bd = d; best = pa; }
  }
  b.yaw = saveY; b.pitch = saveP;
  return bd < 5 ? { yaw, pitch: best } : null;
}

function botPickTarget(b) {
  if (G.mode !== 'mp') return PLAYER;
  let best = null, bd = Infinity;
  for (const a of ACTORS) {
    if (a === b || a.dead || a.gone || a.team === b.team) continue;
    let d = a.pos.distanceTo(b.pos);
    if (a === b.ai.target) d *= 0.7; // 지금 상대를 조금 더 선호
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}
function botUpdate(dt, b = BOT) {
  const ai = b.ai, D = BOT_DIFF[SETTINGS.difficulty];
  if (G.mode === 'range') return;
  ai.retargetT = (ai.retargetT || 0) - dt;
  if (!ai.target || ai.target.dead || ai.target.gone || ai.retargetT <= 0) {
    ai.retargetT = 0.6;
    const t = botPickTarget(b);
    if (t !== ai.target) { ai.target = t; ai.see = false; ai.lastSeen = null; }
  }
  const p = ai.target;
  if (!p) { b.wish.set(0, 0, 0); b.trigger = false; b.sprint = false; return; }
  if (b.dead) { b.wish.set(0, 0, 0); b.trigger = false; return; }
  if (G.state !== 'live') { b.wish.set(0, 0, 0); b.trigger = false; b.sprint = false; return; }
  ai.repathT -= dt; ai.thinkT -= dt; ai.nadeCD -= dt;
  // ---- 보기 ----
  ai.visT -= dt;
  if (ai.visT <= 0) {
    ai.visT = 0.08;
    const s = botCanSee(b);
    if (s && !ai.see) { ai.reactT = D.react * rand(0.8, 1.3) * (ai.alertTurn ? 0.7 : 1); ai.trackT = 0; ai.aimHead = Math.random() < D.head; const e = D.err * (p.stance === 'prone' ? 1.3 : 1); ai.errY = rand(-e, e) * DEG; ai.errP = rand(-e, e) * 0.6 * DEG; }
    ai.see = s;
  }
  const dist = b.pos.distanceTo(p.pos);
  if (ai.see) { ai.lastSeen = p.pos.clone(); ai.lastSeen.y = p.eyePos.y; ai.lastSeenT = G.time; ai.reactT -= dt; ai.trackT += dt; ai.alertTurn = false; }
  const known = ai.see ? p.pos : (G.time - ai.lastSeenT < 12 && ai.lastSeen) ? ai.lastSeen : (G.time - ai.heardT < 10 && ai.heard) ? ai.heard : null;
  // ---- 무기 고르기 ----
  if (b.mode === 'gun' && !b.pin && b.reloadT <= 0 && b.switchT <= 0) {
    const want = botWeaponFor(known ? dist : 40, b);
    if (want !== b.cur && (!ai.see || b.w.mag === 0 || Math.random() < 0.02)) b.equip(want);
  }
  // ---- 조준 ----
  let wantYaw = b.yaw, wantPitch = 0, aiming = false;
  const tp = _v1;
  if (ai.see) {
    botTargetPoint(tp, b);
    // 앞질러 쏘기 + 낙차 보정
    const vel = b.w ? b.w.stats.def.vel : 800; const tt = dist / vel;
    tp.addScaledVector(p.vel, tt * 0.9); tp.y += 0.5 * GRAV * tt * tt;
    const dx = tp.x - b.eyePos.x, dy = tp.y - b.eyePos.y, dz = tp.z - b.eyePos.z;
    const shrink = 0.25 + 0.75 * Math.exp(-ai.trackT * 1.6);
    const moveErr = 1 + Math.hypot(p.vel.x, p.vel.z) * 0.12;
    wantYaw = Math.atan2(-dx, -dz) + ai.errY * shrink * moveErr;
    wantPitch = Math.atan2(dy, Math.hypot(dx, dz)) + ai.errP * shrink * moveErr;
    aiming = true;
  } else if (known) {
    const dx = known.x - b.pos.x, dz = known.z - b.pos.z;
    wantYaw = Math.atan2(-dx, -dz); wantPitch = Math.atan2((known.y || 1.4) - b.eyePos.y, Math.hypot(dx, dz)) * 0.5;
  } else if (ai.path && ai.path[ai.pathI]) {
    const wp = ai.path[ai.pathI]; wantYaw = Math.atan2(-(wp.x - b.pos.x), -(wp.z - b.pos.z));
  }
  const turn = (aiming ? D.turn : D.turn * 0.6) * dt;
  b.yaw += clamp(angDiff(b.yaw, wantYaw), -turn, turn);
  b.pitch += clamp(wantPitch - b.pitch, -turn * 0.7, turn * 0.7);
  const aimErr = Math.abs(angDiff(b.yaw, wantYaw)) + Math.abs(wantPitch - b.pitch);

  // ---- 던지기 ----
  if (b.mode === 'throw') {
    b.wish.set(0, 0, 0);
    if (ai.nade) {
      b.yaw = ai.nade.yaw; b.pitch = ai.nade.pitch;
      if (!b.pin && b.switchT <= 0) { b.pullPin(); b.cook(); }
      if (b.pin && b.cookT > ai.nade.cook) { b.release(false); ai.nade = null; ai.nadeCD = rand(10, 18); }
    } else if (!b.pin && b.switchT <= 0) b.equip(b.cur, true);
    return;
  }
  if (!ai.see && known && b.throwables.frag > 0 && ai.nadeCD <= 0 && G.time - ai.lastSeenT > 2.5 && G.time - ai.lastSeenT < 10) {
    const d = b.pos.distanceTo(known);
    if (d > 9 && d < 34) {
      const plan = botPlanNade(known, b);
      if (plan) { ai.nade = { ...plan, cook: rand(0.8, 2.2) }; b.equipThrow('frag'); return; }
      ai.nadeCD = 4;
    }
  }
  // ---- 사격 ----
  b.trigger = false;
  const w = b.w;
  if (ai.see && w) {
    const cat = w.stats.cat;
    const wantAds = dist > 14 || cat === 'SR' || cat === 'DMR';
    b.ads = wantAds && b.reloadT <= 0;
    const tol = Math.max(0.006, 0.35 / Math.max(dist, 1)) * (cat === 'SG' ? 3 : 1);
    const ready = ai.reactT <= 0 && aimErr < tol * 3 && b.switchT <= 0;
    if (w.mag === 0 && b.reloadT <= 0) b.startReload();
    ai.pauseT -= dt;
    if (ready && w.mag > 0 && b.reloadT <= 0) {
      if (cat === 'SG' && dist > 30) { /* 너무 멀다 */ }
      else if (cat === 'SR') { if (b.adsT > 0.95 && aimErr < tol && b.boltT <= 0 && b.cooldown <= 0) b.triggerEdge = true; }
      else if (cat === 'DMR' || cat === 'HG' || (w.fireMode === 'S')) {
        if (ai.pauseT <= 0 && b.cooldown <= 0) { b.triggerEdge = true; ai.pauseT = Math.max(w.stats.def.interval, cat === 'DMR' ? rand(0.2, 0.38) : rand(0.15, 0.3)); }
      } else {
        if (dist < 22) { b.trigger = true; if (!ai.held) { b.triggerEdge = true; ai.held = true; } }
        else {
          if (ai.burstLeft <= 0 && ai.pauseT <= 0) { ai.burstLeft = Math.round(rand(D.burst[0], D.burst[1])); ai.burstStart = w.mag; b.triggerEdge = true; ai.held = true; }
          if (ai.burstLeft > 0) { b.trigger = true; if (ai.burstStart - w.mag >= ai.burstLeft) { ai.burstLeft = 0; ai.pauseT = rand(D.pause[0], D.pause[1]); b.trigger = false; ai.held = false; } }
        }
      }
    }
    if (!b.trigger) ai.held = false;
  } else {
    b.ads = !!known && dist < 60 && Math.random() < 0.002 ? true : b.ads && !!known;
    ai.held = false; ai.burstLeft = 0;
    if (w && w.mag < w.stats.mag * 0.5 && b.reloadT <= 0 && G.time - ai.lastSeenT > 1.2) b.startReload();
  }

  // ---- 움직이기 ----
  let moveTo = null; b.sprint = false;
  const lowHP = b.health < MAX_HP * 0.45;
  if (ai.see) {
    // 교전 중: 좌우 흔들기 + 필요하면 엄폐
    ai.strafeT -= dt;
    if (ai.strafeT <= 0) { ai.strafe = Math.random() < 0.5 ? -1 : 1; ai.strafeT = rand(0.35, 1.1); if (Math.random() < 0.15) ai.strafe = 0; }
    const needCover = (b.reloadT > 0 || lowHP && G.time - ai.hurtT < 1.5 || (w && w.mag === 0));
    if (needCover && ai.coverT <= 0) { const c = findCover(b.pos, p.eyePos); if (c) { ai.cover = c; ai.coverT = 2.5; botGoTo(c, b); } }
    if (ai.coverT > 0 && ai.cover) { moveTo = ai.cover; ai.coverT -= dt; }
    else {
      b.wish.set(ai.strafe, 0, 0);
      const cat = w ? w.stats.cat : 'AR';
      if (cat === 'SG' || cat === 'SMG' && dist > 35) b.wish.z = -0.8; // 가까이 붙기
      if (dist < 6 && cat !== 'SG') b.wish.z = 0.5;
      // 웅크리기
      ai.crouchT -= dt;
      if (ai.crouchT <= 0) { ai.crouchT = rand(0.6, 2.2); b.setStance(dist > 25 && Math.random() < 0.45 ? 'crouch' : 'stand'); }
      if (cat === 'SR' && b.adsT > 0.5) b.wish.set(0, 0, 0);
    }
  } else {
    if (b.stance !== 'stand' && Math.random() < 0.02) b.setStance('stand');
    if (known) {
      // 기억하는 곳으로 / 엄폐 뒤에서 기다리기
      if (ai.mode === 'hold' && G.time - Math.max(ai.lastSeenT, ai.heardT) < 4 && !lowHP) {
        if (!ai.cover || ai.coverT <= 0) { ai.cover = findCover(b.pos, known) || b.pos.clone(); ai.coverT = 4; }
        ai.coverT -= dt; moveTo = ai.cover;
        ai.peekT -= dt; if (ai.peekT <= 0) { ai.peekT = rand(2, 4); ai.mode = Math.random() < 0.5 ? 'push' : 'hold'; }
      } else {
        const target = known.clone(); target.y = 0;
        moveTo = target;
        b.ads = b.pos.distanceTo(target) < 25;
      }
    } else {
      // 아무것도 모를 때: 정한 곳으로 가서 잠깐 지키고, 다시 밀고 들어가기
      if (ai.goal && b.pos.distanceTo(ai.goal) < 1.5) {
        ai.holdT -= dt;
        if (ai.holdT <= 0) {
          ai.holdT = rand(4, 10);
          const guess = new V3(rand(-30, 30), 0, rand(-40, 0));
          if (Math.random() < 0.6) guess.set(rand(-12, 12), 0, rand(-30, -5));
          if (ai.flip) guess.z = -guess.z;
          ai.goal = guess;
        }
      }
      moveTo = ai.goal;
      b.sprint = moveTo && b.pos.distanceTo(moveTo) > 12;
    }
  }
  if (moveTo) {
    if (!ai.path || ai.repathT <= 0 || !ai.goal || ai.goal.distanceTo(moveTo) > 2) botGoTo(moveTo, b);
    const path = ai.path;
    if (path && path.length) {
      let wp = path[Math.min(ai.pathI, path.length - 1)];
      if (Math.hypot(wp.x - b.pos.x, wp.z - b.pos.z) < 0.6 && ai.pathI < path.length - 1) { ai.pathI++; wp = path[ai.pathI]; }
      const dx = wp.x - b.pos.x, dz = wp.z - b.pos.z, dl = Math.hypot(dx, dz);
      if (dl > 0.35) {
        const wx = dx / dl, wz = dz / dl;
        const right = _v2.set(Math.cos(b.yaw), 0, -Math.sin(b.yaw)), fwd = _v3.set(-Math.sin(b.yaw), 0, -Math.cos(b.yaw));
        const mx = wx * right.x + wz * right.z, mz = -(wx * fwd.x + wz * fwd.z);
        if (ai.see) { b.wish.x = clamp(b.wish.x * 0.4 + mx, -1, 1); b.wish.z = clamp(mz, -1, 1); }
        else { b.wish.set(mx, 0, mz); if (b.sprint && mz > -0.6) b.sprint = false; }
      } else if (!ai.see) b.wish.set(0, 0, 0);
    } else if (!ai.see) b.wish.set(0, 0, 0);
  } else if (!ai.see) b.wish.set(0, 0, 0);
  if (b.reloadT > 0 || b.ads) b.sprint = false;
  // 끼임 확인
  ai.stuckT += dt;
  if (ai.stuckT > 1.2) {
    if (b.pos.distanceTo(ai.lastPos) < 0.35 && (b.wish.lengthSq() > 0.3)) { ai.repathT = 0; ai.path = null; b.jumpReq = Math.random() < 0.5; ai.strafe *= -1; }
    ai.lastPos.copy(b.pos); ai.stuckT = 0;
  }
}
