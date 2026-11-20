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
  VM.arms = new THREE.Group(); VM.lhand = null; VM.lfore = null;
  if (p.mode === 'fist') { // 맨손: 양 주먹
    const g = new THREE.Group(); VM.gun = g; VM.info = null; VM.fists = [];
    for (const s of [-1, 1]) {
      const f = new THREE.Group();
      const fist = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.065, 0.08), new THREE.MeshStandardMaterial({ color: 0x3a2f28, roughness: 0.85 })); f.add(fist);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.26), vmSleeve); arm.position.set(0, -0.05, 0.14); arm.rotation.x = -0.35; f.add(arm);
      f.userData.home = new V3(s * 0.2, -0.24, -0.55); f.position.copy(f.userData.home); f.rotation.set(0.1, -s * 0.12, s * 0.2);
      g.add(f); VM.fists.push(f);
    }
    VM.root.add(g);
  } else if (p.mode === 'throw') {
    const g = buildGrenadeModel(p.throwType); g.scale.setScalar(1.1); VM.gun = g; VM.info = null;
    VM.root.add(g);
    VM.arms.add(limbMesh(new V3(0.0, -0.02, 0.06), new V3(0.12, -0.35, 0.4), 0.04, 0.05, vmSleeve));
    VM.arms.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), vmGlove));
    g.add(VM.arms);
  } else {
    VM.lhand = null; VM.lfore = null;
    const info = buildGunModel(p.w.id, p.w.att); VM.gun = info.group; VM.info = info;
    VM.root.add(info.group);
    const hg = p.w.stats.cat === 'HG';
    const rH = new V3(0, -0.06, 0.04), lH = hg ? new V3(0.0, -0.075, 0.02) : new V3(0, -0.02, -0.2);
    const rg = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), vmGlove); rg.position.copy(rH); rg.scale.set(1, 1.2, 1.3);
    // 왼손 + 왼팔은 한 덩어리로 움직여요 (장전할 때 탄창을 빼고 넣는 손)
    const L = new THREE.Group(); L.position.copy(lH);
    const lg = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), vmGlove); lg.scale.set(1.2, 1, 1.4); L.add(lg);
    const elbow = hg ? new V3(-0.12, -0.25, 0.3) : new V3(-0.16, -0.2, 0.12);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1, 8), vmSleeve); // 아래팔: 손을 따라 늘었다 줄었다
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1, 8), vmSleeve); // 위팔: 어깨 → 팔꿈치 (팔꿈치는 손 위치에 맞춰 자연스럽게 굽혀요)
    VM.lsh = hg ? new V3(-0.2, -0.4, 0.5) : new V3(-0.2, -0.3, 0.45);
    VM.lhand = L; VM.lhome = lH.clone(); VM.lfore = fore; VM.lup = up; VM.lelbow = elbow;
    VM.arms.add(rg, L, fore, up); fitForearm();
    VM.arms.add(limbMesh(rH, new V3(0.1, -0.22, 0.35), 0.035, 0.045, vmSleeve));
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
    G.shake = Math.max(G.shake, (p.w.stats.cat === 'SR' ? 0.35 : p.w.stats.cat === 'SG' ? 0.3 : 0.08) * (p.w.stats.shake || 1));

  };
  p.onFire = (st) => {
    // 탄피
    if (CAM.blend > 0.5 && st.def.cat !== 'SR' && st.def.cat !== 'SG' && st.def.cat !== 'XB' && st.def.id !== 'r1895' && st.def.id !== 'r45') {
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
  if (P.KeyX) p.holster(); // 총 넣기 → 맨손
  if (P.F3 && !p.dead) playerPing(); // 핑 찍기
  if ((P.PageUp || P.PageDown) && p.mode === 'gun' && p.w && p.adsT > 0.5) { // 배그처럼 조준점 모양 바꾸기
    const sid = effScopeId(p.w);
    if (sid && sid !== 'iron') {
      SETTINGS.ret = SETTINGS.ret || {}; const n = ((SETTINGS.ret[sid] || 0) + (P.PageUp ? 1 : 3)) % 4; SETTINGS.ret[sid] = n; saveSettings();
      const tip = $('rettip'); tip.textContent = `조준점 모양 ${n + 1}/4 (PgUp/PgDn)`; tip.style.opacity = 1; clearTimeout(tip._t); tip._t = setTimeout(() => tip.style.opacity = 0, 1200);
      AU.click(0.1, 2400);
    }
  }
  // 조준경 휠 줌 (3배율 이상)
  const zw = p.w && p.mode === 'gun' ? p.w : null;
  if (INPUT.wheel && zw && p.adsT > 0.5 && zw.stats.scopeZoom >= 3) {
    const mx_ = zw.stats.scopeZoom, mn = Math.max(1.5, mx_ * (mx_ >= 15 ? 0.33 : 0.5)), step = (mx_ - mn) / 4;
    zw.zoomSel = clamp((zw.zoomSel || mx_) - Math.sign(INPUT.wheel) * step, mn, mx_);
    HUD.toast(`${+zw.zoomSel.toFixed(1)}배`); AU.click(0.08, 2200);
  } else if (INPUT.wheel && !p.pin && p.adsT < 0.1) { if (p.mode === 'throw' || p.mode === 'fist') p.equip(p.cur); else p.equip((p.cur + 1) % p.weapons.length); }
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
  } else if (p.mode === 'fist') {
    if (INPUT.lmbPressed) p.triggerEdge = true;
    p.trigger = INPUT.lmb; p.ads = false; p.shoulder = false;
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
  const sid = p.mode === 'gun' ? effScopeId(p.w) : null;
  const show2x = scoped && (sid === '2x' || sid === '3x') && effZoom(p.w) <= 3;
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
  if (p.proneLock > 0) VM.switchY = Math.min(VM.switchY, -0.2 * Math.sin(Math.PI * clamp(1 - p.proneLock / p.proneDur, 0, 1))); // 엎드리기/일어나기 중엔 총을 내렸다 올려요
  const bob = Math.sin(VM.bobPhase) * Math.min(1, hsp / 4), bob2 = Math.cos(VM.bobPhase * 2) * Math.min(1, hsp / 4);
  const g = VM.gun;
  if (p.mode === 'fist' && VM.fists) {
    g.position.set(bob * 0.01, VM.switchY + bob2 * 0.008, 0);
    const k = (p.punchT || 0) / 0.28, jab = Math.sin(clamp(1 - k, 0, 1) * Math.PI) * (k > 0 ? 1 : 0);
    VM.fists.forEach((f, i) => {
      const act = (i === 1) === !!p.punchSide ? jab : 0;
      f.position.copy(f.userData.home); f.position.z -= act * 0.22; f.position.x -= (i ? 1 : -1) * act * 0.16; f.position.y += act * 0.12;
    });
    return;
  }
  if (p.mode === 'throw') {
    VM.raiseT = damp(VM.raiseT || 0, p.pin ? 1 : 0, 10, dt);
    const r = VM.raiseT;
    let x = 0.16 + r * 0.04 + bob * 0.01, y = -0.15 + VM.switchY + r * 0.07 + bob2 * 0.008, z = -0.5 + r * 0.06, rx = r * 0.45, rz = r * -0.3;
    if (g.userData.ring) g.userData.ring.visible = !p.pin;
    // 핀 뽑기: 고리를 잡아당기는 순간 수류탄이 옆으로 끌렸다가 돌아와요
    if (p.pinAnimT > 0) { const j = Math.sin((1 - p.pinAnimT / 0.35) * Math.PI); x -= j * 0.05; y += j * 0.025; rz += j * 0.5; rx -= j * 0.15; }
    // 던지기: 멀리(위에서 앞으로 휘두르기) / 가까이(아래에서 앞으로 굴리듯)
    const thr = p.throwAnimT > 0;
    for (const c of g.children) if (c !== VM.arms) c.visible = !thr && (c !== g.userData.ring || !p.pin);
    if (thr) {
      const k = 1 - p.throwAnimT / 0.5, s = smooth01(Math.min(1, k / 0.42)), drop = smooth01(Math.max(0, (k - 0.5) / 0.5));
      if (p.throwUnder) { x = lerp(0.17, 0.04, s); y = lerp(-0.26, -0.1, s) - drop * 0.3; z = lerp(-0.42, -0.72, s); rx = lerp(-0.7, 0.5, s); rz = lerp(0.1, -0.1, s); }
      else { x = lerp(0.22, 0.02, s); y = lerp(-0.03, -0.22, s) - drop * 0.25; z = lerp(-0.4, -0.72, s); rx = lerp(1.0, -0.9, s); rz = lerp(-0.5, 0.25, s); }
      VM.switchY = -0.25; VM.raiseT = 0;
    }
    g.position.set(x, y, z); g.rotation.set(rx, 0, rz);
    return;
  }
  const info = VM.info, cat = p.w.stats.cat;
  const hip = cat === 'HG' ? new V3(0.15, -0.15, -0.38) : new V3(0.16, -0.16, -0.36);
  const adsZ = cat === 'HG' ? -0.32 : cat === 'SG' ? -0.27 : (p.w.att.scope && p.w.att.scope !== 'iron' ? -0.2 : -0.22);
  const adsP = VM.show2x ? new V3(0, -info.sightY - 0.04, -0.36) : cat === 'SG' ? new V3(0.02, -info.sightY - 0.075, -0.3) : new V3(0, -info.sightY, adsZ);
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
    const k = clamp(1 - p.reloadT / p.reloadDur, 0, 1), r = reloadPose(k, p, info);
    rz += r.rz; rx += r.rx; ry += r.ry; pos.x += r.x; pos.y += r.y; pos.z += r.z;
  } else {
    VM.rlBlend = 0;
    if (info.magMesh) { info.magMesh.position.copy(info.magHome); info.magMesh.rotation.x = info.magRot0 !== undefined ? info.magRot0 : info.magMesh.rotation.x; info.magMesh.visible = !info.xbBolt || p.w.mag > 0; }
    if (VM.lhand) { VM.lhand.position.copy(VM.lhome); if (VM.lhand.userData.shells) VM.lhand.userData.shells.visible = false; }
    if (info.brk) info.brk.rotation.x = 0; if (info.ejShells) for (const s of info.ejShells) s.visible = false;
  }
  // 볼트 당기기
  if (p.boltT > 0 && p.w.stats.def.interval > 0.5) { const k = 1 - p.boltT / p.w.stats.def.interval, e = Math.sin(clamp((k - 0.08) / 0.85, 0, 1) * Math.PI); rz -= e * 0.42; ry -= e * 0.12; pos.y -= e * 0.035; pos.z += e * 0.05; pos.x -= e * 0.02; }
  // 파쿠르: 총을 내리고 옆으로 비킴 (손으로 짚는 느낌)
  const vk = CAM.vaultK || 0;
  pos.y -= vk * 0.22; pos.x += vk * 0.08; rz += vk * 0.9; rx -= vk * 0.5;
  // 기울이기
  rz += p.lean * 0.05;
  g.position.copy(pos); g.rotation.set(rx, ry, rz);
  fitForearm();
}

const _ikD = new V3(), _ikP = new V3(), _ikE = new V3(), _ikU = new V3(0, 1, 0), _ikT = new V3();
function fitSeg(m, a, b) { const d = _ikT.copy(b).sub(a), L = Math.max(0.001, d.length()); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(_ikU, d.multiplyScalar(1 / L)); }
function fitForearm() { // 왼팔: 어깨 → 팔꿈치 → 손 (두 마디 IK). 팔꿈치는 늘 아래·바깥쪽으로 굽어서 꺾여 보이지 않아요
  const f = VM.lfore, L = VM.lhand; if (!f || !L) return;
  const S = VM.lsh, H = L.position, A = 0.36, B = 0.4;
  const d = _ikD.copy(H).sub(S), dist = d.length(), len = clamp(dist, 0.12, A + B - 0.004); d.multiplyScalar(1 / Math.max(dist, 0.001));
  const x = (A * A - B * B + len * len) / (2 * len), h = Math.sqrt(Math.max(0, A * A - x * x));
  const pole = _ikP.set(-0.55, -1, 0.15); pole.addScaledVector(d, -pole.dot(d)).normalize();
  const E = _ikE.copy(S).addScaledVector(d, x).addScaledVector(pole, h);
  fitSeg(f, E, H); if (VM.lup) fitSeg(VM.lup, S, E);
  const off = H.y - VM.lhome.y;
  f.visible = off > -0.2; L.visible = off > -0.3; if (VM.lup) VM.lup.visible = f.visible; // 화면 아래로 내려간 팔은 숨겨요
}
// ================= 배그 같은 장전 동작 =================
// k: 0→1 진행. 총을 기울이고 → 왼손으로 탄창 빼서 버리고 → 새 탄창 꺼내 끼우고 → (다 쏜 뒤면) 장전 손잡이 당기기
const _rv = new V3(), _rv2 = new V3();
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function reloadPose(k, p, info) {
  const out = { rx: 0, ry: 0, rz: 0, x: 0, y: 0, z: 0 };
  const tilt = sstep(0, 0.12, k) * (1 - sstep(0.86, 1, k));
  const L = VM.lhand, H0 = VM.lhome, mag = info.magMesh, M0 = info.magHome;
  VM.rlBlend = tilt;
  if (info.magRot0 === undefined && mag) info.magRot0 = mag.rotation.x;
  const setHand = (v) => { if (L) L.position.copy(v); };
  if (info.xbBolt) { // 석궁: 손으로 화살을 얹어요
    out.rz = tilt * 0.3; out.rx = tilt * 0.15; out.y = -tilt * 0.05;
    info.xbBolt.visible = k > 0.55; info.xbBolt.position.z = M0.z + (k < 0.85 ? 0.25 * (0.85 - k) : 0);
    if (L) setHand(_rv.copy(H0).lerp(_rv2.set(0, 0.04, M0.z + 0.1), Math.sin(clamp(k, 0, 1) * Math.PI)));
    return out;
  }
  if (info.loadType === 'break' && info.brk) { // 꺾어서 장전 (S686·소드오프): 열고 → 빈 탄피 튀어나옴 → 두 발 넣고 → 탁 닫기
    const open = sstep(0.06, 0.16, k) * (1 - sstep(0.8, 0.86, k));
    info.brk.rotation.x = -0.75 * open;
    out.rx = tilt * 0.32; out.rz = tilt * 0.22; out.ry = tilt * 0.12; out.y = tilt * 0.02; out.x = -tilt * 0.03; out.z = -tilt * 0.06;
    const snap = Math.max(0, 1 - Math.abs(k - 0.85) / 0.025); out.rx += snap * 0.08; out.y += snap * 0.01;
    // 빈 탄피 두 개가 뒤로 튀어나와요
    if (!info.ejShells) { info.ejShells = [shellMesh(), shellMesh()]; for (const s of info.ejShells) { s.visible = false; info.group.add(s); } }
    const B0 = info.breech, et = (k - 0.15) / 0.18;
    info.ejShells.forEach((s, i) => {
      s.visible = et > 0 && et < 1;
      if (s.visible) { s.position.set(B0.x + (i ? 0.014 : -0.014) + et * (i ? 0.12 : 0.07), B0.y + 0.03 + et * 0.14 - et * et * 0.32, B0.z + 0.02 + et * 0.05); s.rotation.set(et * 6 * (i ? 1 : -1), et * 3, 0); }
    });
    // 손에 든 새 탄 두 발
    if (L && !L.userData.shells) { const g2 = new THREE.Group(); for (const sx of [-1, 1]) { const s = shellMesh(); s.position.set(sx * 0.011, 0.028, -0.03); g2.add(s); } g2.visible = false; L.add(g2); L.userData.shells = g2; }
    const hs = L && L.userData.shells;
    const Hd = new V3(0.02, -0.32, 0.1), above = _rv2.copy(B0).add(new V3(0, 0.0, 0.12));
    if (k < 0.22) setHand(_rv.copy(H0).lerp(Hd, sstep(0.08, 0.22, k)));
    else if (k < 0.42) setHand(Hd);
    else if (k < 0.62) setHand(_rv.copy(Hd).lerp(above, sstep(0.42, 0.6, k)));
    else if (k < 0.72) setHand(_rv.copy(above).lerp(_rv2.copy(B0).add(new V3(0, -0.02, 0.06)), sstep(0.62, 0.7, k)));
    else setHand(_rv.copy(B0).add(new V3(0, -0.02, 0.06)).lerp(H0, sstep(0.72, 0.9, k)));
    if (hs) { hs.visible = k > 0.4 && k < 0.7; hs.position.z = -sstep(0.62, 0.7, k) * 0.05; hs.rotation.x = 0.0; }
    return out;
  }
  if (info.loadType === 'mag' && mag) {
    out.rz = tilt * 0.34; out.rx = -tilt * 0.04; out.ry = tilt * 0.1; out.y = tilt * 0.03; out.x = -tilt * 0.02; out.z = -tilt * 0.1;
    // 탄창을 빼고 끼우는 동안엔 총을 더 들어 올리고 돌려서 탄창이 화면에 보이게 (배그처럼)
    const show = sstep(0.05, 0.15, k) * (1 - sstep(0.66, 0.8, k));
    out.rz += show * 0.28; out.rx += show * 0.1; out.y += show * 0.06; out.x -= show * 0.05; out.z -= show * 0.14;
    const below = _rv2.copy(M0); below.y -= 0.13;
    const grip = (m) => _rv.copy(m).add(new V3(0, -0.055, 0.0));
    const Hdown = new V3(-0.04, -0.42, -0.25);
    mag.visible = true; mag.rotation.x = info.magRot0;
    if (k < 0.1) { setHand(_rv.copy(H0).lerp(grip(M0), sstep(0, 0.1, k))); mag.position.copy(M0); }
    else if (k < 0.22) { const t = sstep(0.1, 0.22, k); mag.position.copy(M0).lerp(below, t); setHand(grip(mag.position)); }
    else if (k < 0.4) { // 빈 탄창은 떨어지고, 손은 새 탄창을 가지러 아래로
      const t = (k - 0.22) / 0.18; mag.position.copy(below); mag.position.y -= 1.6 * t * t; mag.position.x -= 0.05 * t; mag.rotation.x = info.magRot0 + t * 1.4; mag.visible = t < 0.7;
      setHand(_rv.copy(grip(below)).lerp(Hdown, sstep(0.22, 0.36, k)));
    } else if (k < 0.56) { // 새 탄창을 들고 올라와요
      const t = sstep(0.4, 0.56, k); setHand(_rv.copy(Hdown).lerp(grip(below), t));
      mag.position.copy(L ? L.position : below).add(new V3(0, 0.055, 0)); mag.visible = t > 0.15;
    } else if (k < 0.66) { // 끼우기 (탁!)
      const t = sstep(0.56, 0.64, k); mag.position.copy(below).lerp(M0, t); setHand(grip(mag.position));
      const slap = Math.max(0, 1 - Math.abs(k - 0.645) / 0.02); out.y += slap * 0.012; out.rx += slap * 0.05;
    } else {
      mag.position.copy(M0);
      if (p.reloadEmpty) { // 다 쏘고 장전: 장전 손잡이 당겼다 놓기
        const B0 = info.boltPos, pull = _rv2.copy(B0); pull.z += 0.06;
        if (k < 0.74) setHand(_rv.copy(grip(M0)).lerp(B0, sstep(0.66, 0.74, k)));
        else if (k < 0.8) { setHand(_rv.copy(B0).lerp(pull, sstep(0.74, 0.79, k))); }
        else { setHand(_rv.copy(pull).lerp(H0, sstep(0.8, 0.92, k))); const kick = Math.max(0, 1 - Math.abs(k - 0.8) / 0.025); out.z += kick * 0.015; out.rz += kick * 0.06; }
        out.rz += sstep(0.66, 0.72, k) * (1 - sstep(0.82, 0.9, k)) * -0.25; // 손잡이 쪽이 보이게
      } else setHand(_rv.copy(grip(M0)).lerp(H0, sstep(0.66, 0.86, k)));
    }
    return out;
  }
  // 한 발씩 넣는 총 (산탄총·볼트액션): 총을 옆으로 돌리고 손으로 여러 번 넣기
  out.rz = -tilt * 0.6; out.rx = tilt * 0.12; out.y = -tilt * 0.04; out.x = tilt * 0.02;
  const port = new V3(0.03, 0.02, 0.0), Hd = new V3(0.02, -0.3, 0.12);
  const n = 3, a = 0.12, b = 0.86, cyc = clamp((k - a) / (b - a), 0, 0.999) * n, ph = cyc % 1;
  if (k < a) setHand(_rv.copy(H0).lerp(Hd, sstep(0, a, k)));
  else if (k < b) { const up = ph < 0.5 ? sstep(0, 0.45, ph) : 1 - sstep(0.55, 1, ph); setHand(_rv.copy(Hd).lerp(port, up)); const push = Math.max(0, 1 - Math.abs(ph - 0.5) / 0.08); out.y += push * 0.006; }
  else setHand(_rv.copy(Hd).lerp(H0, sstep(b, 1, k)));
  return out;
}

// 조준경 흔들림도 실제 조준에 들어가게 (카메라 회전에 포함됨)
