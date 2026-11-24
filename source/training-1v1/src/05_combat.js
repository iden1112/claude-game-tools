// ================= 이펙트 / 탄도 / 수류탄 =================
const fx = new FX3D(scene, { look: 'soft', unit: 1, quality: 1 });
const GRAV = 9.8;
const ACTORS = [];          // 살아있는 캐릭터들
const BULLETS = [];
const GRENADES = [];

// ---- 예광탄 ----
const tracerGeo = new THREE.BoxGeometry(1, 1, 1); tracerGeo.translate(0, 0, -0.5);
const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const tracerPool = [];
function getTracer() {
  let m = tracerPool.find(t => !t.visible);
  if (!m) { m = new THREE.Mesh(tracerGeo, tracerMat); m.frustumCulled = false; scene.add(m); tracerPool.push(m); }
  m.visible = true; return m;
}
// ---- 총구 화염 ----
const flashMat = new THREE.SpriteMaterial({ map: TEX.flash, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
const flashPool = [];
const flashLight = new THREE.PointLight(0xffb060, 0, 9, 2); scene.add(flashLight);
let flashLightT = 0;
function muzzleFlash(pos, dir, big, hidden) {
  let s = flashPool.find(f => !f.visible);
  if (!s) { s = new THREE.Sprite(flashMat); s.userData.t = 0; scene.add(s); flashPool.push(s); }
  s.visible = true; s.userData.t = 0.045; s.position.copy(pos).addScaledVector(dir, 0.05);
  const sc = (hidden ? 0.12 : 0.32) * (big ? 1.4 : 1) * rand(0.8, 1.2); s.scale.set(sc, sc, 1);
  s.material.rotation = Math.random() * 6.28;
  if (!hidden) { flashLight.position.copy(pos); flashLight.intensity = 2.5; flashLightT = 0.05; }
}
// ---- 탄피 ----
const shellGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 0.035, 6);
const shellMat = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.9, roughness: 0.3 });
const shells = [];
function ejectShell(pos, right, up) {
  let s = shells.find(x => !x.m.visible);
  if (!s) { s = { m: new THREE.Mesh(shellGeo, shellMat), v: new V3(), t: 0 }; scene.add(s.m); shells.push(s); if (shells.length > 40) return; }
  s.m.visible = true; s.m.position.copy(pos); s.t = 1.4;
  s.v.copy(right).multiplyScalar(rand(1.8, 2.8)).addScaledVector(up, rand(1.2, 2.2));
  s.m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
}
// ---- 탄흔 ----
const decalMat = new THREE.MeshBasicMaterial({ map: TEX.decal, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
const decalGeo = new THREE.PlaneGeometry(0.09, 0.09);
const decals = []; let decalIdx = 0;
function addDecal(p, n) {
  let d = decals[decalIdx];
  if (!d) { d = new THREE.Mesh(decalGeo, decalMat); scene.add(d); decals[decalIdx] = d; }
  decalIdx = (decalIdx + 1) % 120;
  d.position.copy(p).addScaledVector(n, 0.005);
  d.lookAt(_v1.copy(d.position).add(n)); d.rotateZ(Math.random() * 6.28);
  const s = rand(0.7, 1.2); d.scale.set(s, s, 1);
}
function impactFX(p, n, kind) {
  const ramp = kind === 'wood' ? [0xd8b48a, 0xa47c50, 0x6a4c2e] : kind === 'ground' ? [0xc8bca0, 0x9a8f78, 0x6b6352] : kind === 'sand' ? [0xd0bf94, 0xa8946a] : [0xe0ddd5, 0xb0ada6, 0x77756f];
  for (let i = 0; i < 4; i++) {
    fx.emit(p, { vel: { x: n.x * rand(0.6, 1.6) + rand(-0.4, 0.4), y: n.y * rand(0.6, 1.6) + rand(0.2, 0.8), z: n.z * rand(0.6, 1.6) + rand(-0.4, 0.4) }, gravity: 2, drag: 3, life: rand(0.35, 0.6), size: 0.04, size2: 0.16, ramp, shape: 'puff', alpha: 0.55, fadeAt: 0.25 });
  }
  if (kind === 'wood') for (let i = 0; i < 3; i++) fx.emit(p, { vel: { x: n.x * 3 + rand(-1, 1), y: rand(1, 3), z: n.z * 3 + rand(-1, 1) }, gravity: 12, life: 0.7, size: 0.03, color: 0x8a6034, shape: 'square', spin: 8, floor: 0, bounce: 0.3 });
}
function bloodFX(p, dir) {
  for (let i = 0; i < 5; i++) fx.emit(p, { vel: { x: dir.x * rand(0.5, 2) + rand(-0.6, 0.6), y: rand(-0.2, 0.8), z: dir.z * rand(0.5, 2) + rand(-0.6, 0.6) }, gravity: 4, drag: 3, life: rand(0.25, 0.45), size: 0.05, size2: 0.18, ramp: [0xa01818, 0x6a0c0c], shape: 'puff', alpha: 0.85, fadeAt: 0.3 });
}

// ---- 총알 ----
function spawnBullet(owner, origin, dir, st, pelletDmg) {
  const b = {
    owner, st, pos: origin.clone(), start: origin.clone(), vel: dir.clone().multiplyScalar(st.def.vel), age: 0, dist: 0,
    dmg: pelletDmg, tracer: null, cracked: false,
  };
  if (st.def.cat === 'XB') { b.arrow = getArrow(); b.arrow.position.copy(origin); b.arrow.lookAt(_v4.copy(origin).sub(dir)); }
  else if (st.def.cat !== 'SG' || Math.random() < 0.35) { b.tracer = getTracer(); b.tracer.scale.set(0, 0, 0); }
  BULLETS.push(b);
}
const _bp = new V3(), _bn = new V3(), _bd = new V3(), _hbTmp = {};
// ---- 석궁 화살: 날아가는 모습 + 벽에 꽂힘 ----
const arrowPool = [], STUCK = [];
function getArrow() {
  let a = arrowPool.find(x => !x.visible);
  if (!a) { a = boltMesh(); a.scale.setScalar(1.6); scene.add(a); arrowPool.push(a); }
  a.visible = true; a.userData.stuckT = 0; return a;
}
const WALLBANG = { AR: 0.55, DMR: 0.6, SR: 0.65, LMG: 0.55 }; // 벽 뚫은 뒤 남는 데미지 비율
function updateBullets(dt) {
  for (let i = BULLETS.length - 1; i >= 0; i--) {
    const b = BULLETS[i];
    b.age += dt;
    _bp.copy(b.pos);
    b.vel.y -= GRAV * dt;
    b.vel.multiplyScalar(1 - 0.06 * dt); // 공기저항 (약하게)
    b.pos.addScaledVector(b.vel, dt);
    _bd.copy(b.pos).sub(_bp); const segL = _bd.length(); _bd.divideScalar(segL || 1);
    let hitT = segL, hitActor = null, hitPart = null;
    const wr = raycastWorld(_bp, _bd, segL);
    let worldKind = null;
    if (wr) { hitT = wr.t; worldKind = wr.box.kind || 'solid'; _bn.copy(wr.normal); }
    for (const a of ACTORS) {
      if (a === b.owner || a.dead) continue;
      if (G.mode === 'mp' && a.team !== undefined && a.team === b.owner.team) continue; // 같은 팀은 안 맞음
      if (a.pos.distanceToSquared(_bp) > (segL + 3) * (segL + 3)) continue;
      const h = segHitSoldier(_bp, b.pos, a.hitbox);
      if (h && h.s * segL < hitT) { hitT = h.s * segL; hitActor = a; hitPart = h.part; }
    }
    // 스치는 소리
    if (!b.cracked && b.owner !== PLAYER && PLAYER && !PLAYER.dead) {
      _v1.copy(PLAYER.eyePos).sub(_bp); const t = clamp(_v1.dot(_bd), 0, segL);
      _v2.copy(_bp).addScaledVector(_bd, t);
      if (_v2.distanceTo(PLAYER.eyePos) < 2.2 && !hitActor) { b.cracked = true; AU.crack(_v2); }
    }
    b.dist += Math.min(hitT, segL);
    if (b.arrow) { // 화살은 날아가는 방향을 따라 기울어요 (포물선)
      b.arrow.position.copy(_bp).addScaledVector(_bd, Math.min(hitT, segL));
      b.arrow.lookAt(_v4.copy(b.arrow.position).sub(_bd));
    }
    // 예광탄 모양
    if (b.tracer) {
      const tip = _v3.copy(_bp).addScaledVector(_bd, Math.min(hitT, segL));
      const len = Math.min(b.dist - 2.5, 2.2 + b.st.def.vel * 0.004);
      if (len > 0.05) {
        b.tracer.position.copy(tip); b.tracer.lookAt(_v4.copy(tip).add(_bd));
        const w = 0.012 + Math.min(0.03, b.dist * 0.0004);
        b.tracer.scale.set(w, w, len);
      }
    }
    let done = b.age > 3 || b.pos.y < -5 || Math.abs(b.pos.x) > 900 || Math.abs(b.pos.z) > 900;
    if (hitActor) {
      const hp = _v3.copy(_bp).addScaledVector(_bd, hitT);
      if (b.visual) bloodFX(hp, _bd); else bulletHit(b, hitActor, hitPart, hp, _bd);
      done = true;
    } else if (wr) {
      const hp = _v3.copy(_bp).addScaledVector(_bd, hitT);
      impactFX(hp, _bn, worldKind);
      if (worldKind !== 'ground' || Math.random() < 0.5) addDecal(hp, _bn);
      if (Math.random() < 0.25 && camera.position.distanceTo(hp) < 30) AU.click(0.05, 3000);
      done = true;
      // 월샷: 얇은 벽(두께 30cm 이하)은 소총·지정사수·저격·기관총 총알이 뚫고 나가요 (기관단총·권총·산탄총·석궁은 못 뚫음). 뚫으면 데미지가 줄어요
      const thick = wr.exit - wr.t, wm = WALLBANG[b.st.def.cat];
      if (wm && !b.arrow && worldKind !== 'ground' && worldKind !== 'sand' && worldKind !== 'barrier' && worldKind !== 'stair' && thick > 0 && thick <= 0.3 && (b.walls || 0) < 1) {
        b.walls = (b.walls || 0) + 1; b.wallMul = (b.wallMul || 1) * wm;
        b.pos.copy(_bp).addScaledVector(_bd, wr.exit + 0.02); b.vel.multiplyScalar(0.85);
        _v4.copy(_bn).negate(); impactFX(b.pos, _v4, worldKind); addDecal(_v3.copy(b.pos).addScaledVector(_bd, -0.021), _v4);
        done = false;
      }
    }
    if (done) {
      if (b.tracer) b.tracer.visible = false;
      if (b.arrow) { // 벽·바닥에 맞으면 꽂힌 채로 잠깐 남아요
        if (wr && !hitActor) { b.arrow.position.addScaledVector(_bd, 0.12); b.arrow.userData.stuckT = 12; STUCK.push(b.arrow); if (STUCK.length > 20) { STUCK.shift().visible = false; } }
        else b.arrow.visible = false;
      }
      BULLETS.splice(i, 1);
    }
  }
}
function falloffMul(st, d) {
  const [d0, d1, m] = CAT_INFO[st.def.cat].falloff;
  if (d <= d0) return 1; if (d >= d1) return st.def.cat === 'SG' ? Math.max(0.02, m * (1 - (d - d1) / 30)) : m;
  const k = (d - d0) / (d1 - d0); return st.def.cat === 'SG' ? lerp(1, m, Math.sqrt(k)) : lerp(1, m, k);
}
function bulletHit(b, victim, part, hp, dir) {
  if (victim.remote) { // 친구 캐릭터: 피해 계산은 친구 쪽에서
    bloodFX(hp, dir);
    netSend({ t: 'hit', id: b.st.def.id, att: b.owner.w ? b.owner.w.att : null, dmg: b.dmg, wm: b.wallMul || undefined, part, dist: b.dist, hp: hp.toArray(), dir: dir.toArray() }, victim.netId, b.owner === PLAYER ? NET.id : b.owner.netId);
    if (b.owner === PLAYER) { HUD.hitMarker(false, part === 'head'); AU.hit(part === 'head'); }
    return;
  }
  applyBulletDamage(b, victim, part, hp, dir);
  if (b.owner === PLAYER) { HUD.hitMarker(victim.dead, part === 'head'); AU.hit(part === 'head'); }
}
function applyBulletDamage(b, victim, part, hp, dir) {
  const c = CAT_INFO[b.st.def.cat];
  let base = b.dmg * falloffMul(b.st, b.dist);
  let mult = part === 'head' ? c.head : part === 'leg' ? c.limb : (c.body || 1);
  let dmg = base * mult;
  const head = part === 'head';
  if (head && victim.helmet.lv > 0) { dmg *= 1 - ARMOR.helmet.red[victim.helmet.lv]; victim.helmet.dur -= base * mult * 0.6; if (victim.helmet.dur <= 0) victim.breakArmor('helmet'); }
  if (part === 'torso' && victim.vest.lv > 0) { dmg *= 1 - ARMOR.vest.red[victim.vest.lv]; victim.vest.dur -= base; if (victim.vest.dur <= 0) victim.breakArmor('vest'); }
  if (part !== 'head' && b.st.def.cat === 'SR') dmg = 70; // 저격총: 몸·팔·다리는 조끼 레벨(3레벨 포함) 상관없이 3방이면 쓰러짐, 2방은 안 죽음
  if (b.wallMul) dmg *= b.wallMul; // 월샷 데미지 감소
  bloodFX(hp, dir);
  if (victim.dummy && b.owner === PLAYER) rangeOnHit(victim, Math.min(dmg, victim.health), part, b.dist, hp, b.st);
  victim.damage(dmg, b.owner, { head, weapon: b.st.def.name, dir: dir.clone(), dist: b.dist });
}

// ---- 탄피 / 화염 업데이트 ----
function updateFX(dt) {
  for (let i = STUCK.length - 1; i >= 0; i--) { const a = STUCK[i]; a.userData.stuckT -= dt; if (a.userData.stuckT <= 0) { a.visible = false; STUCK.splice(i, 1); } }
  for (const s of flashPool) if (s.visible) { s.userData.t -= dt; if (s.userData.t <= 0) s.visible = false; }
  if (flashLightT > 0) { flashLightT -= dt; if (flashLightT <= 0) flashLight.intensity = 0; }
  for (const s of shells) if (s.m.visible) {
    s.t -= dt; s.v.y -= GRAV * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 20;
    const gy = groundAt(s.m.position.x, s.m.position.z, 0.01, s.m.position.y, 0.05);
    if (s.m.position.y < gy + 0.005) { s.m.position.y = gy + 0.005; s.v.y *= -0.3; s.v.x *= 0.5; s.v.z *= 0.5; }
    if (s.t <= 0) s.m.visible = false;
  }
  // 연막
  // (가벼운 방식: 연막 하나 = 판 16장 + 재질 1개. 카메라가 연막 안에 들어가면 가까운 판은 숨기고 화면을 회색으로 덮어요)
  let inside = 0;
  for (let i = WORLD.smokes.length - 1; i >= 0; i--) {
    const s = WORLD.smokes[i]; s.age += dt;
    s.radius = s.age < 3 ? s.age / 3 * 7 : s.age > s.life - 5 ? Math.max(0, (s.life - s.age) / 5 * 7) : 7;
    const k = clamp(s.radius / 7, 0, 1);
    const fade = s.age > s.life - 5 ? clamp((s.life - s.age) / 5, 0, 1) : 1;
    s.mat.opacity = 0.82 * k * fade;
    const cd = camera.position.distanceTo(s.pos);
    if (s.radius > 1) inside = Math.max(inside, clamp(1 - (cd - s.radius * 0.45) / (s.radius * 0.55), 0, 1) * fade);
    for (const p of s.puffs) {
      p.sprite.position.copy(s.pos).addScaledVector(p.off, k);
      p.sprite.position.y = Math.max(p.sprite.position.y, 0.6 + p.off.y * 0.2);
      // 카메라 바로 앞의 큰 판은 그리지 않기 (화면 전체를 여러 번 덧칠하는 게 랙의 원인)
      p.sprite.visible = camera.position.distanceToSquared(p.sprite.position) > 9;
    }
    if (s.age > s.life) { for (const p of s.puffs) scene.remove(p.sprite); s.mat.dispose(); WORLD.smokes.splice(i, 1); }
  }
  const sf = document.getElementById('smokefog');
  if (sf) { const v = (inside * 0.92).toFixed(2); if (sf.dataset.v !== v) { sf.style.opacity = v; sf.dataset.v = v; } }
}

// ================= 수류탄 물리 =================
const GR_R = 0.05;
function grenadeStep(p, v, dt, onBounce) {
  v.y -= GRAV * dt;
  const nx = p.x + v.x * dt, ny = p.y + v.y * dt, nz = p.z + v.z * dt;
  let bounced = false;
  // 바닥
  if (ny < GR_R) { p.set(nx, GR_R, nz); if (v.y < 0) { v.y = -v.y * 0.3; v.x *= 0.65; v.z *= 0.65; bounced = Math.abs(v.y) > 0.6; } }
  else p.set(nx, ny, nz);
  // 상자들
  for (const b of WORLD.boxes) {
    if (p.x < b.min.x - GR_R || p.x > b.max.x + GR_R || p.y < b.min.y - GR_R || p.y > b.max.y + GR_R || p.z < b.min.z - GR_R || p.z > b.max.z + GR_R) continue;
    // 가장 얕게 들어간 축으로 튕김
    const pen = [
      [p.x - (b.min.x - GR_R), 0, -1], [(b.max.x + GR_R) - p.x, 0, 1],
      [p.y - (b.min.y - GR_R), 1, -1], [(b.max.y + GR_R) - p.y, 1, 1],
      [p.z - (b.min.z - GR_R), 2, -1], [(b.max.z + GR_R) - p.z, 2, 1],
    ];
    let m = pen[0]; for (const q of pen) if (q[0] < m[0]) m = q;
    const ax = m[1], sg = m[2];
    const comp = ax === 0 ? 'x' : ax === 1 ? 'y' : 'z';
    p[comp] += sg * m[0];
    if (v[comp] * sg < 0) {
      const sp = Math.abs(v[comp]);
      v[comp] = -v[comp] * (ax === 1 ? 0.3 : 0.38);
      for (const o of ['x', 'y', 'z']) if (o !== comp) v[o] *= ax === 1 ? 0.65 : 0.8;
      if (sp > 1.2) bounced = true;
    }
  }
  const WB = WORLD.bounds; p.x = clamp(p.x, WB.minX + 0.1, WB.maxX - 0.1); p.z = clamp(p.z, WB.minZ + 0.1, WB.maxZ - 0.1);
  if (bounced && onBounce) onBounce();
}
// 던질 궤적 미리보기
function predictThrow(origin, vel, maxT = 4, dt = 1 / 60) {
  const p = origin.clone(), v = vel.clone(), pts = [p.clone()];
  let rest = 0;
  for (let t = 0; t < maxT; t += dt) {
    grenadeStep(p, v, dt);
    pts.push(p.clone());
    if (v.lengthSq() < 0.04 && p.y < 0.2 + groundAt(p.x, p.z, 0.05, p.y, 0.1)) { if (++rest > 5) break; }
  }
  return pts;
}
function throwGrenade(owner, type, origin, vel, fuseLeft) {
  const mesh = buildGrenadeModel(type); mesh.position.copy(origin); scene.add(mesh);
  GRENADES.push({ owner, type, pos: origin.clone(), vel: vel.clone(), fuse: fuseLeft, mesh, spin: new V3(rand(-12, 12), rand(-12, 12), rand(-12, 12)) });
}
function updateGrenades(dt) {
  for (let i = GRENADES.length - 1; i >= 0; i--) {
    const g = GRENADES[i];
    const sub = 3;
    for (let k = 0; k < sub; k++) grenadeStep(g.pos, g.vel, dt / sub, () => AU.bounce(g.pos));
    g.mesh.position.copy(g.pos);
    const sp = g.vel.length();
    g.mesh.rotation.x += g.spin.x * dt * Math.min(1, sp / 3); g.mesh.rotation.z += g.spin.z * dt * Math.min(1, sp / 3);
    g.fuse -= dt;
    if (g.type === 'smoke' && g.fuse < 1.5 && !g.hiss) { g.hiss = true; }
    if (g.fuse <= 0) { explodeGrenade(g.type, g.pos.clone(), g.owner); scene.remove(g.mesh); GRENADES.splice(i, 1); }
  }
}
function explodeGrenade(type, pos, owner, fromNet) {
  if (type === 'frag') {
    fx.explosion(pos, { size: 1.5, floor: 0 });
    AU.explosion(pos);
    for (let k = 0; k < 8; k++) addDecal(_v1.set(pos.x + rand(-1.2, 1.2), 0.002, pos.z + rand(-1.2, 1.2)), _v2.set(0, 1, 0));
    const src = _v4.copy(pos); src.y += 0.25;
    for (const a of ACTORS) {
      if (a.dead || a.remote) continue;
      if (G.mode === 'mp' && owner && a !== owner && a.team === owner.team) continue; // 팀원은 안 다침
      const tgt = a.hitbox.chestTop || a.eyePos; const d = a.pos.distanceTo(pos);
      if (d > 10) continue;
      if (!losClear(src, tgt, false) && !losClear(src, a.hitbox.pelvis || tgt, false)) continue;
      let dmg = d < 2.2 ? 200 : 150 * Math.pow(1 - (d - 2.2) / 7.8, 1.6);
      if (a.vest.lv > 0) { dmg *= 1 - ARMOR.vest.red[a.vest.lv] * 0.6; a.vest.dur -= dmg * 0.5; if (a.vest.dur <= 0) a.breakArmor('vest'); }
      a.damage(dmg, owner, { weapon: '세열 수류탄', grenade: true, dir: _v3.copy(a.pos).sub(pos).normalize(), dist: d });
      if (owner === PLAYER && a !== PLAYER) HUD.hitMarker(a.dead, false);
    }
    const cd = camera.position.distanceTo(pos);
    if (cd < 30) G.shake = Math.max(G.shake, (1 - cd / 30) * 1.2);
    // 가까이서 터지면 이명 (벽에 막혀도 조금은 울려요)
    if (PLAYER && !PLAYER.dead && PLAYER.pos.distanceTo(pos) < 14) {
      const d = PLAYER.pos.distanceTo(pos), k = (1 - d / 14) * (losClear(src, PLAYER.eyePos, false) ? 1 : 0.5);
      if (k > 0.12) AU.deafen(1.5 + 5.5 * k, k);
    }
  } else if (type === 'smoke') {
    AU.smoke(pos);
    const mat = new THREE.SpriteMaterial({ map: TEX.smokeBig, color: 0xd6d6d4, transparent: true, opacity: 0, depthWrite: false, fog: true });
    const s = { pos: pos.clone(), radius: 0, age: 0, life: 28, puffs: [], mat };
    s.pos.y = Math.max(1.2, pos.y + 1.2);
    for (let k = 0; k < 16; k++) {
      const sp = new THREE.Sprite(mat); const sc = rand(7, 10); sp.scale.set(sc, sc, 1);
      const a = k / 16 * Math.PI * 2 + rand(-0.3, 0.3), r = 1.2 + Math.sqrt(Math.random()) * 4.2;
      s.puffs.push({ sprite: sp, off: new V3(Math.cos(a) * r, rand(-0.8, 2.4), Math.sin(a) * r) });
      sp.renderOrder = 2; scene.add(sp);
    }
    WORLD.smokes.push(s);
  } else if (type === 'flash') {
    AU.flash(pos);
    fx.flash ? fx.flash(pos, { size: 3, color: 0xffffff }) : 0;
    for (const a of ACTORS) {
      if (a.dead || a.remote) continue;
      const d = a.eyePos.distanceTo(pos); if (d > 28) continue;
      if (!losClear(pos, a.eyePos, false)) continue;
      const look = _v1.set(0, 0, -1).applyAxisAngle(_v2.set(1, 0, 0), a.pitch).applyAxisAngle(_v2.set(0, 1, 0), a.yaw);
      const to = _v3.copy(pos).sub(a.eyePos).normalize();
      const facing = clamp((look.dot(to) + 0.35) / 1.35, 0, 1);
      const power = clamp((1 - d / 28) * (0.35 + 0.65 * facing) * 1.4, 0, 1);
      a.blind = Math.max(a.blind, power * 5);
      if (a === PLAYER) { HUD.flashbang(power); if (power > 0.15) AU.deafen(2 + 4.5 * power, power); }
    }
  }
}
