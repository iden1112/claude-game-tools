// ================= 플레이어 =================
let PLAYER = null;
const VM = { // 1인칭 무기 화면 (따로 그려서 벽에 안 박힘)
  scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.01, 10),
  root: new THREE.Group(), gun: null, info: null, arms: new THREE.Group(),
  kick: 0, kickRot: 0, swayX: 0, swayY: 0, bob: 0, switchY: 0,
};
VM.scene.add(VM.cam); VM.cam.add(VM.root);
VM.scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x6b5e4a, 0.8));
const vmSun = new THREE.DirectionalLight(0xfff0dc, 1.6); vmSun.position.set(-1, 2, 1); VM.scene.add(vmSun);
VM.scene.add(new THREE.AmbientLight(0xffffff, 0.15));
addEventListener('resize', () => { VM.cam.aspect = innerWidth / innerHeight; VM.cam.updateProjectionMatrix(); });

const CAM = {
  tpp: true, free: false, fy: 0, fp: 0, blend: 1, kickP: 0, kickY: 0, shake: 0, roll: 0,
  eyeSmooth: new V3(), adsHoldT: 0, breath: 5, breathing: false, sway: new THREE.Vector2(), zoom: 1,
};
const vmGlove = new THREE.MeshStandardMaterial({ color: 0x24221f, roughness: 0.8 });
const vmSleeve = new THREE.MeshStandardMaterial({ color: 0x3b4652, roughness: 0.9 });
function buildViewmodel() {
  const p = PLAYER;
  while (VM.root.children.length) VM.root.remove(VM.root.children[0]);
  VM.arms = new THREE.Group();
  if (p.mode === 'throw') {
    const g = buildGrenadeModel(p.throwType); g.scale.setScalar(1.1); VM.gun = g; VM.info = null;
    VM.root.add(g);
    VM.arms.add(limbMesh(new V3(0.0, -0.02, 0.06), new V3(0.12, -0.35, 0.4), 0.04, 0.05, vmSleeve));
    VM.arms.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), vmGlove));
    g.add(VM.arms);
  } else {
    const info = buildGunModel(p.w.id, p.w.att); VM.gun = info.group; VM.info = info;
    VM.root.add(info.group);
    const hg = p.w.stats.cat === 'HG';
    const rH = new V3(0, -0.06, 0.04), lH = hg ? new V3(0.0, -0.075, 0.02) : new V3(0, -0.02, -0.2);
    const rg = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), vmGlove); rg.position.copy(rH); rg.scale.set(1, 1.2, 1.3);
    const lg = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), vmGlove); lg.position.copy(lH); lg.scale.set(1.2, 1, 1.4);
    VM.arms.add(rg, lg);
    VM.arms.add(limbMesh(rH, new V3(0.1, -0.22, 0.35), 0.035, 0.045, vmSleeve));
    VM.arms.add(limbMesh(lH, hg ? new V3(-0.12, -0.25, 0.3) : new V3(-0.16, -0.2, 0.12), 0.035, 0.045, vmSleeve));
    if (!hg) VM.arms.add(limbMesh(new V3(-0.16, -0.2, 0.12), new V3(-0.2, -0.3, 0.45), 0.045, 0.05, vmSleeve));
    info.group.add(VM.arms);
  }
  VM.root.traverse(o => { o.castShadow = false; o.frustumCulled = false; });
  VM.switchY = -0.25;
}

function createPlayer() {
  const p = new Actor(NICK(), true, { shirt: 0x34404d, pants: 0x4a4a3d, pack: 0x46423a, skin: 0xd9a982 });
  PLAYER = p;
  p.getAim = (origin, dir) => {
    // 카메라 방향 (흔들림 포함)
    camDir(dir);
    if (CAM.blend > 0.5 && p.adsT < 0.5) {
      // 3인칭: 화면 가운데가 가리키는 곳으로, 총은 캐릭터에서 나감
      const cp = camera.position;
      const hit = raycastWorld(cp, dir, 600);
      const t = hit ? hit.t : 600;
      const aimPt = _v3.copy(cp).addScaledVector(dir, t);
      origin.copy(p.eyePos).addScaledVector(_v4.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw)), 0.15); origin.y -= 0.12;
      if (aimPt.distanceTo(origin) > 1.2) dir.copy(aimPt).sub(origin).normalize();
    } else origin.copy(camera.position);
  };
  p.muzzleWorld = (out) => {
    if (CAM.blend < 0.5 && VM.info) { VM.cam.position.copy(camera.position); VM.cam.quaternion.copy(camera.quaternion); VM.cam.updateMatrixWorld(true); VM.info.muzzle.getWorldPosition(out); return out; }
    p.w.info.muzzle.getWorldPosition(out); return out;
  };
  p.onEquip = () => buildViewmodel();
  p.applyRecoil = (v, h) => {
    p.pitch += v; p.yaw -= h; p.recoilAcc += v;
    VM.kick = Math.min(VM.kick + 0.055 * (p.w.stats.cat === 'SR' || p.w.stats.cat === 'SG' ? 2.2 : 1), 0.16);
    VM.kickRot = Math.min(VM.kickRot + v * 2.8, 0.35);
    CAM.kickP += v * 0.9;
    G.shake = Math.max(G.shake, p.w.stats.cat === 'SR' ? 0.35 : p.w.stats.cat === 'SG' ? 0.3 : 0.08);

  };
  p.onFire = (st) => {
    // 탄피
    if (CAM.blend > 0.5 && st.def.cat !== 'SR' && st.def.cat !== 'SG' && st.def.id !== 'r1895' && st.def.id !== 'r45') {
      const right = _v3.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
      const pos = CAM.blend < 0.5 ? camera.position.clone().addScaledVector(right, 0.12).add(_v4.set(0, -0.08, 0)).addScaledVector(camDir(new V3()), 0.35) : p.muzzleWorld(new V3());
      ejectShell(pos, right, _v4.set(0, 1, 0));
    }
  };
  p.onDamage = (dmg, from, info) => { HUD.damaged(dmg, from, info); AU.hurt(); G.shake = Math.max(G.shake, 0.25); };
  p.onLand = (v) => { AU.land(); VM.bob += 0.05; };
  p.onVault = () => AU.land();
  p.hearShot = () => {};
  ACTORS.push(p);
  return p;
}
function camDir(out) {
  return out.set(0, 0, -1).applyEuler(camera.rotation);
}

function playerInput(dt) {
  const p = PLAYER, K = INPUT.keys, P = INPUT.pressed;
  const live = G.state === 'live' || G.state === 'pre' || G.state === 'range';
  const frozen = G.state === 'pre' || G.menuOpen;
  // 마우스
  const zoom = CAM.zoom;
  const sens = 0.0021 * SETTINGS.sens * (p.adsT > 0.5 ? SETTINGS.adsSens / Math.pow(zoom, 0.85) : 1);
  const mx = INPUT.mdx * sens, my = INPUT.mdy * sens;
  if (CAM.free && !p.dead) {
    CAM.fy = clamp(CAM.fy - mx, -1.9, 1.9); CAM.fp = clamp(CAM.fp - my, -1.2, 1.0);
  } else if (!p.dead) {
    p.yaw -= mx; p.pitch -= my;
  }
  const pmin = p.stance === 'prone' ? -0.35 : -1.45;
  p.pitch = clamp(p.pitch, pmin, 1.45);
  if (!live) return;
  // 이동
  p.wish.set((K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0), 0, (K.KeyS ? 1 : 0) - (K.KeyW ? 1 : 0));
  if (frozen) p.wish.set(0, 0, 0);
  // 달리기: 누르는 동안 / 토글
  if (SETTINGS.sprintMode === 'toggle') { if (P.ShiftLeft && p.adsT < 0.3) CAM.sprintOn = !CAM.sprintOn; if (!K.KeyW) CAM.sprintOn = false; }
  else CAM.sprintOn = K.ShiftLeft;
  const wantSprint = CAM.sprintOn && K.KeyW && !K.KeyS;
  // 조준 중 Shift = 숨 참기
  CAM.breathing = false;
  if (p.adsT > 0.6 && K.ShiftLeft && CAM.breath > 0) { CAM.breathing = true; p.sprint = false; }
  else p.sprint = wantSprint && !frozen && p.mode !== 'throw' || (wantSprint && p.mode === 'throw' && !p.pin);
  if (p.sprint && p.stance !== 'stand' && p.stance !== 'crouch') p.sprint = false;
  if (p.sprint) { p.ads = false; p.trigger = false; }
  if (P.Space && !frozen) p.jumpReq = true;
  if (SETTINGS.crouchMode === 'hold') { if (P.KeyC) p.setStance('crouch'); if (!K.KeyC && p.stance === 'crouch' && CAM.crouchHeld) p.setStance('stand'); CAM.crouchHeld = !!K.KeyC; }
  else if (P.KeyC) p.setStance(p.stance === 'crouch' ? 'stand' : 'crouch');
  if (P.KeyZ) p.setStance(p.stance === 'prone' ? 'stand' : 'prone');
  if (SETTINGS.leanMode === 'toggle') { if (P.KeyE) CAM.leanT = CAM.leanT === 1 ? 0 : 1; if (P.KeyQ) CAM.leanT = CAM.leanT === -1 ? 0 : -1; }
  else CAM.leanT = (K.KeyE ? 1 : 0) - (K.KeyQ ? 1 : 0);
  if (p.sprint) CAM.leanT = 0;
  p.leanTarget = CAM.leanT || 0;
  if (P.KeyV) { CAM.tpp = !CAM.tpp; HUD.toast(CAM.tpp ? '3인칭' : '1인칭'); }
  CAM.free = !!(K.AltLeft || K.AltRight) && !p.ads && !INPUT.rmb && !(p.w && p.w.id === 'win94' && p.adsT > 0);
  // 무기 바꾸기
  if (P.Digit1) p.equip(0); if (P.Digit2) p.equip(1); if (P.Digit3) p.equip(2);
  if (P.Digit5 || P.KeyG) p.equipThrow();
  // 조준경 휠 줌 (3배율 이상)
  const zw = p.w && p.mode === 'gun' ? p.w : null;
  if (INPUT.wheel && zw && p.adsT > 0.5 && zw.stats.scopeZoom >= 3) {
    const mx_ = zw.stats.scopeZoom, mn = Math.max(1.5, mx_ * (mx_ >= 15 ? 0.33 : 0.5)), step = (mx_ - mn) / 4;
    zw.zoomSel = clamp((zw.zoomSel || mx_) - Math.sign(INPUT.wheel) * step, mn, mx_);
    HUD.toast(`${+zw.zoomSel.toFixed(1)}배`); AU.click(0.08, 2200);
  } else if (INPUT.wheel && !p.pin && p.adsT < 0.1) { if (p.mode === 'throw') p.equip(p.cur); else p.equip((p.cur + 1) % p.weapons.length); }
  if (P.KeyB) p.cycleFireMode();
  if (P.KeyR) { if (p.mode === 'throw') p.cook(); else p.startReload(); }
  if (frozen) { p.trigger = false; return; }
  // 사격 / 던지기
  if (p.mode === 'gun') {
    if (INPUT.lmbPressed) { p.triggerEdge = true; if (p.sprint) { p.sprint = false; } }
    p.trigger = INPUT.lmb;
    // 우클릭: 배그식 = 짧게 누르면 조준, 길게 누르면 견착
    const AM = SETTINGS.aimMode;
    // Win94: Alt + 우클릭 = 4배율 조준으로 바꾸기 (다시 누르면 원래대로)
    const altWin = p.w && p.w.id === 'win94' && (K.AltLeft || K.AltRight);
    if (altWin && INPUT.rmbPressed) {
      p.w.altScope = !p.w.altScope; p.ads = p.reloadT <= 0; p.shoulder = false; CAM.rDown = false;
      HUD.toast(p.w.altScope ? 'Win94 4배율' : 'Win94 기본 조준'); AU.click(0.1, 2000);
    } else if (AM === 'pubg') {
      if (INPUT.rmbPressed) { CAM.rDown = true; CAM.rHold = 0; CAM.rWasAds = p.ads; }
      if (CAM.rDown && INPUT.rmb) { CAM.rHold += dt; if (CAM.rHold > 0.2 && !CAM.rWasAds) p.shoulder = true; }
      if (CAM.rDown && (INPUT.rmbReleased || !INPUT.rmb)) {
        CAM.rDown = false;
        if (CAM.rHold <= 0.2) p.ads = !CAM.rWasAds && p.reloadT <= 0;
        p.shoulder = false;
      }
    } else if (AM === 'toggle') { if (INPUT.rmbPressed) p.ads = !p.ads && p.reloadT <= 0; p.shoulder = false; }
    else { p.ads = INPUT.rmb && p.reloadT <= 0; p.shoulder = false; }
    if (p.sprint) { p.ads = false; p.shoulder = false; }
  } else {
    if (INPUT.lmbPressed) p.pullPin();
    if (INPUT.lmbReleased && p.pin) p.release(INPUT.rmb);
  }
}

function updatePlayerCamera(dt) {
  const p = PLAYER;
  const fpView = !CAM.tpp || p.adsT > 0.35 || (p.ads && p.mode === 'gun');
  CAM.blend = damp(CAM.blend, fpView ? 0 : 1, fpView ? 22 : 10, dt);
  if (p.dead) CAM.blend = damp(CAM.blend, 1, 4, dt);
  if (!CAM.free) { CAM.fy = damp(CAM.fy, 0, 12, dt); CAM.fp = damp(CAM.fp, 0, 12, dt); }
  // 숨 참기 / 조준경 흔들림
  if (CAM.breathing) CAM.breath = Math.max(0, CAM.breath - dt); else CAM.breath = Math.min(5, CAM.breath + dt * 0.8);
  const w = p.w, zoomFactor = p.mode === 'gun' && w ? effZoom(w) : 1;
  const swayAmt = p.adsT > 0.5 && p.mode === 'gun' ? (zoomFactor >= 3 ? 0.35 : 0.08) * (w ? w.stats.sway : 1) * STANCE[p.stance].recoil * (CAM.breathing ? 0.12 : 1) : 0;
  const t = performance.now() / 1000;
  CAM.sway.set(Math.sin(t * 0.9) * Math.cos(t * 0.5) * swayAmt * DEG, Math.sin(t * 1.3 + 1) * swayAmt * 0.7 * DEG);
  // 카메라 반동 연출 회복
  CAM.kickP = damp(CAM.kickP, 0, 14, dt);
  G.shake = Math.max(0, G.shake - dt * 1.5);
  const sh = G.shake * G.shake * 0.04;
  // 눈 위치 (계단 오를 때 부드럽게)
  const eye = p.eyePos;
  if (CAM.eyeSmooth.distanceToSquared(eye) > 4) CAM.eyeSmooth.copy(eye);
  CAM.eyeSmooth.x = eye.x; CAM.eyeSmooth.z = eye.z; CAM.eyeSmooth.y = damp(CAM.eyeSmooth.y, eye.y, 22, dt);
  // 죽으면 살아있는 팀원 관전
  if (p.dead && G.mode === 'mp') {
    CAM.deadT = (CAM.deadT || 0) + dt;
    if (CAM.deadT > 2 && (!CAM.spec || CAM.spec.dead || CAM.spec.gone)) CAM.spec = ACTORS.find(r => r !== p && r.team === G.myTeam && !r.dead && !r.gone) || null;
  } else { CAM.deadT = 0; CAM.spec = null; }
  const S = CAM.spec || p;
  // 파쿠르: 시선이 아래로 숙였다가 올라오고 살짝 기울어짐
  const vu = p.vault ? Math.min(1, p.vault.t) : -1;
  CAM.vaultK = damp(CAM.vaultK || 0, vu >= 0 ? Math.sin(Math.PI * vu) : 0, 18, dt);
  const yaw = (CAM.spec ? S.yaw : p.yaw) + CAM.fy, pitch = (CAM.spec ? S.pitch : p.pitch) + CAM.fp + CAM.kickP + CAM.sway.y + rand(-sh, sh) - CAM.vaultK * 0.22;
  CAM.roll = damp(CAM.roll, -p.lean * 0.16 * (1 - CAM.blend * 0.6) + (p.vault && p.vault.over ? 0.09 : -0.03) * CAM.vaultK, 12, dt);
  camera.rotation.set(pitch, yaw + CAM.sway.x + rand(-sh, sh), CAM.roll, 'YXZ');
  // 1인칭 위치
  const fpPos = _v1.copy(CAM.eyeSmooth);
  // 걸을 때 흔들림
  const hsp = Math.hypot(p.vel.x, p.vel.z);
  VM.bobPhase = (VM.bobPhase || 0) + dt * hsp * 1.9;
  if (p.onGround) fpPos.y += Math.sin(VM.bobPhase * 2) * 0.012 * Math.min(1, hsp / 4) * (1 - p.adsT * 0.8);
  // 3인칭 위치: 어깨 너머
  const piv = _v2.set(S.pos.x, S.pos.y + Math.max(S.stanceH + 0.28, S.dead ? 1.0 : 1.05), S.pos.z);
  const right = _v3.set(Math.cos(yaw), 0, -Math.sin(yaw));
  piv.addScaledVector(right, p.lean * 0.3);
  const back = _v4.set(0, 0, 1).applyEuler(camera.rotation);
  const sh_ = smooth01(p.shoulderT || 0);
  const dist = (p.dead ? 3.6 : p.stance === 'prone' ? 2.7 : 2.5) - sh_ * 1.0;
  const want = piv.clone().addScaledVector(right, p.dead && !CAM.spec ? 0 : 0.58).addScaledVector(back, CAM.spec ? 2.6 : dist);
  // 카메라가 벽 뒤로 가지 않게
  const dv = want.clone().sub(piv); const dl = dv.length(); dv.divideScalar(dl);
  const hit = raycastWorld(piv, dv, dl + 0.25);
  if (hit) want.copy(piv).addScaledVector(dv, Math.max(0.2, hit.t - 0.25));
  camera.position.copy(fpPos).lerp(want, CAM.blend);
  // 확대 (조준경)
  let fov = SETTINGS.fov;
  CAM.zoom = 1;
  if (p.mode === 'gun' && w) {
    const z = (1 + (zoomFactor - 1) * smooth01(p.adsT)) * (1 + 0.15 * smooth01(p.shoulderT || 0) * (1 - p.adsT));
    CAM.zoom = z;
    fov = 2 * Math.atan(Math.tan(SETTINGS.fov * DEG / 2) / z) / DEG;
  }
  if (p.sprint && hsp > 4) fov += 4;
  camera.fov = damp(camera.fov, fov, 25, dt); camera.updateProjectionMatrix();
  // 3인칭에선 내 캐릭터 보이기
  p.soldier.setVisible(CAM.blend > 0.15);
  updateViewmodel(dt, hsp);
}
const smooth01 = (t) => t * t * (3 - 2 * t);

function updateViewmodel(dt, hsp) {
  const p = PLAYER;
  VM.cam.position.copy(camera.position); VM.cam.quaternion.copy(camera.quaternion);
  const scoped = p.mode === 'gun' && p.w && effZoom(p.w) >= 2 && p.adsT > 0.85;
  // 2배율: 조준경 화면 안 아래쪽에 총 앞부분이 보이게 (조준경 통은 숨김)
  const show2x = scoped && p.mode === 'gun' && effZoom(p.w) < 3;
  VM.root.visible = CAM.blend < 0.3 && !p.dead && (!scoped || show2x);
  if (VM.info && VM.info.scopeBody) VM.info.scopeBody.visible = !show2x;
  VM.show2x = show2x;
  if (!VM.gun) return;
  const ads = smooth01(p.adsT);
  // 손떨림 (마우스 따라 늦게)
  VM.swayX = damp(VM.swayX, clamp(-INPUT.mdx * 0.0006, -0.04, 0.04), 8, dt);
  VM.swayY = damp(VM.swayY, clamp(INPUT.mdy * 0.0006, -0.04, 0.04), 8, dt);
  VM.kick = damp(VM.kick, 0, 16, dt); VM.kickRot = damp(VM.kickRot, 0, 12, dt);
  VM.switchY = damp(VM.switchY, p.switchT > 0.25 ? -0.25 : 0, 14, dt);
  const bob = Math.sin(VM.bobPhase) * Math.min(1, hsp / 4), bob2 = Math.cos(VM.bobPhase * 2) * Math.min(1, hsp / 4);
  const g = VM.gun;
  if (p.mode === 'throw') {
    const raise = p.pin ? 1 : 0;
    g.position.set(0.2 + bob * 0.01, -0.2 + VM.switchY + raise * 0.06 + bob2 * 0.008, -0.35 + raise * 0.12);
    g.rotation.set(raise * 0.4, 0, raise * -0.3);
    return;
  }
  const info = VM.info, cat = p.w.stats.cat;
  const hip = cat === 'HG' ? new V3(0.15, -0.15, -0.38) : new V3(0.16, -0.16, -0.36);
  const adsZ = cat === 'HG' ? -0.32 : (p.w.att.scope && p.w.att.scope !== 'iron' ? -0.2 : -0.22);
  const adsP = VM.show2x ? new V3(0, -info.sightY - 0.05, -0.34) : new V3(0, -info.sightY, adsZ);
  const shP = cat === 'HG' ? new V3(0.07, -0.13, -0.34) : new V3(0.075, -0.125, -0.3);
  hip.lerp(shP, smooth01(p.shoulderT || 0));
  const pos = hip.lerp(adsP, ads);
  pos.x += VM.swayX * (1 - ads * 0.7) + bob * 0.012 * (1 - ads * 0.85);
  pos.y += VM.swayY * (1 - ads * 0.7) + bob2 * 0.008 * (1 - ads * 0.85) + VM.switchY - VM.kick * 0.15;
  pos.z += VM.kick;
  let rx = VM.kickRot * (1 - ads * 0.6), ry = 0, rz = 0;
  // 달리기 자세
  const spr = p.sprint && hsp > 3 ? 1 : 0;
  VM.sprintT = damp(VM.sprintT || 0, spr, 10, dt);
  pos.x -= VM.sprintT * 0.06; pos.y -= VM.sprintT * 0.05; ry += VM.sprintT * 0.7; rx -= VM.sprintT * 0.25;
  // 재장전 동작
  if (p.reloadT > 0) {
    const k = 1 - p.reloadT / p.reloadDur, e = Math.sin(clamp(k, 0, 1) * Math.PI);
    rz += e * 0.5; rx += e * 0.25; pos.y -= e * 0.06; pos.x -= e * 0.03;
    if (info.magMesh) { const out = k > 0.25 && k < 0.7 ? 1 : 0; info.magMesh.position.y = info.magHome.y - out * 0.25; info.magMesh.visible = !(k > 0.35 && k < 0.6); }
  } else if (info.magMesh) { info.magMesh.position.copy(info.magHome); info.magMesh.visible = true; }
  // 볼트 당기기
  if (p.boltT > 0 && p.w.stats.def.interval > 0.5) { const k = 1 - p.boltT / p.w.stats.def.interval, e = Math.sin(clamp((k - 0.08) / 0.85, 0, 1) * Math.PI); rz -= e * 0.42; ry -= e * 0.12; pos.y -= e * 0.035; pos.z += e * 0.05; pos.x -= e * 0.02; }
  // 파쿠르: 총을 내리고 옆으로 비킴 (손으로 짚는 느낌)
  const vk = CAM.vaultK || 0;
  pos.y -= vk * 0.22; pos.x += vk * 0.08; rz += vk * 0.9; rx -= vk * 0.5;
  // 기울이기
  rz += p.lean * 0.05;
  g.position.copy(pos); g.rotation.set(rx, ry, rz);
}

// 조준경 흔들림도 실제 조준에 들어가게 (카메라 회전에 포함됨)
