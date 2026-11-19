// ================= 군인 캐릭터 모델 =================
const ARMOR = {
  helmet: { red: [0, 0.3, 0.4, 0.55], dur: [0, 80, 150, 230], color: [0, 0x6f6a4e, 0x46503a, 0x26292a] },
  vest: { red: [0, 0.3, 0.4, 0.55], dur: [0, 200, 220, 250], color: [0, 0x8a8166, 0x4f5a3c, 0x2b2e2a] },
};
function limbMesh(a, b, r1, r2, mat) {
  const d = _v1.copy(b).sub(a), L = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, L, 8), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
  m.castShadow = true;
  return m;
}
function buildSoldier(opt) {
  const skin = new THREE.MeshStandardMaterial({ color: opt.skin || 0xd2a07a, roughness: 0.8 });
  const shirt = new THREE.MeshStandardMaterial({ color: opt.shirt, roughness: 0.9 });
  const pants = new THREE.MeshStandardMaterial({ color: opt.pants, roughness: 0.95 });
  const boots = new THREE.MeshStandardMaterial({ color: 0x2a241e, roughness: 0.8 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x23211f, roughness: 0.8 });
  const vestMat = new THREE.MeshStandardMaterial({ color: 0x4f5a3c, roughness: 0.85 });
  const helmMat = new THREE.MeshStandardMaterial({ color: 0x46503a, roughness: 0.6, metalness: 0.1 });

  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 0.95; root.add(body);
  const S = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = false; return m; };
  // 엉덩이
  body.add(S(new THREE.BoxGeometry(0.34, 0.16, 0.22), pants, 0, 0.0, 0));
  const legs = {};
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * 0.1, -0.04, 0); body.add(hip);
    hip.add(S(new THREE.CylinderGeometry(0.075, 0.065, 0.44, 8), pants, 0, -0.22, 0));
    const knee = new THREE.Group(); knee.position.y = -0.44; hip.add(knee);
    knee.add(S(new THREE.CylinderGeometry(0.062, 0.055, 0.44, 8), pants, 0, -0.22, 0));
    knee.add(S(new THREE.BoxGeometry(0.1, 0.09, 0.22), boots, 0, -0.45, -0.04));
    const foot = new THREE.Object3D(); foot.position.y = -0.45; knee.add(foot);
    legs[side] = { hip, knee, foot };
  }
  // 상체
  const spine = new THREE.Group(); spine.position.y = 0.06; body.add(spine);
  spine.add(S(new THREE.BoxGeometry(0.36, 0.5, 0.21), shirt, 0, 0.25, 0));
  const vest = S(new THREE.BoxGeometry(0.4, 0.36, 0.27), vestMat, 0, 0.3, 0); spine.add(vest);
  const pouches = new THREE.Group(); vest.add(pouches);
  for (const x of [-0.11, 0, 0.11]) pouches.add(S(new THREE.BoxGeometry(0.09, 0.1, 0.05), vestMat, x, -0.08, -0.15));
  spine.add(S(new THREE.BoxGeometry(0.28, 0.32, 0.12), new THREE.MeshStandardMaterial({ color: opt.pack || 0x4a4636, roughness: 1 }), 0, 0.3, 0.17)); // 배낭
  const chest = new THREE.Object3D(); chest.position.y = 0.42; spine.add(chest);
  // 목, 머리
  const neck = new THREE.Group(); neck.position.y = 0.52; spine.add(neck);
  neck.add(S(new THREE.CylinderGeometry(0.05, 0.055, 0.08, 8), skin, 0, 0.03, 0));
  const head = S(new THREE.SphereGeometry(0.105, 14, 12), skin, 0, 0.14, 0); head.scale.set(0.95, 1.08, 1.0); neck.add(head);
  neck.add(S(new THREE.BoxGeometry(0.17, 0.035, 0.03), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.3, metalness: 0.5 }), 0, 0.165, -0.095)); // 고글
  const helmet = S(new THREE.SphereGeometry(0.128, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), helmMat, 0, 0.16, 0.0); neck.add(helmet);
  const brim = S(new THREE.CylinderGeometry(0.132, 0.135, 0.03, 14), helmMat, 0, 0.165, 0.0); neck.add(brim);
  const headC = new THREE.Object3D(); headC.position.y = 0.14; neck.add(headC);
  // 조준 묶음 (팔 + 총)
  const aim = new THREE.Group(); aim.position.set(0, 0.44, 0); spine.add(aim);
  // 총은 오른쪽 어깨에 개머리판을 대고 들어요 (가슴을 뚫고 들어가지 않게)
  const gunMount = new THREE.Group(); gunMount.position.set(0.1, -0.03, 0); aim.add(gunMount);
  const arms = new THREE.Group(); aim.add(arms);
  let gz = -0.3, lHand = null, lFore = null, lElbow = null, lHome = null, curCat = 'AR';
  const foreGeo = new THREE.CylinderGeometry(0.042, 0.05, 1, 8);
  function fitFore() { // 왼쪽 아래팔: 팔꿈치 → 손
    if (!lFore) return; const d = _v1.copy(lHand.position).sub(lElbow), L = d.length();
    lFore.position.copy(lElbow).addScaledVector(d, 0.5); lFore.scale.set(1, L, 1); lFore.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
  }
  function setArms(cat) {
    curCat = cat;
    while (arms.children.length) arms.remove(arms.children[0]);
    const long = cat !== 'HG', mx = gunMount.position.x, my = gunMount.position.y;
    const sR = new V3(0.2, 0.0, 0.02), sL = new V3(-0.2, 0.0, 0.02);
    const hR = new V3(mx, my - 0.06, gz + 0.02);                                           // 오른손: 손잡이
    const hL = long ? new V3(mx - 0.01, my - 0.03, gz - 0.3) : new V3(mx - 0.02, my - 0.075, gz + 0.03); // 왼손: 총열 덮개 (권총은 두 손으로)
    const eR = new V3(0.26, -0.2, (sR.z + hR.z) / 2 + 0.05), eL = new V3(-0.14, -0.22, (sL.z + hL.z) / 2);
    arms.add(limbMesh(sR, eR, 0.06, 0.055, shirt), limbMesh(eR, hR, 0.05, 0.042, shirt), S(new THREE.SphereGeometry(0.045, 8, 6), glove, hR.x, hR.y, hR.z));
    arms.add(limbMesh(sL, eL, 0.06, 0.055, shirt));
    lHand = S(new THREE.SphereGeometry(0.045, 8, 6), glove, hL.x, hL.y, hL.z); lHome = hL.clone(); lElbow = eL;
    lFore = new THREE.Mesh(foreGeo, shirt); lFore.castShadow = true; arms.add(lHand, lFore); fitFore();
    arms.add(S(new THREE.SphereGeometry(0.07, 8, 6), shirt, 0.2, 0, 0.02), S(new THREE.SphereGeometry(0.07, 8, 6), shirt, -0.2, 0, 0.02));
  }
  setArms('AR');

  const pelvis = new THREE.Object3D(); body.add(pelvis);
  const S_ = {
    root, body, spine, neck, aim, gunMount, legs, vest, helmet, brim, setArms, gun: null,
    markers: { head: headC, chest, pelvis, kneeL: legs[-1].knee, kneeR: legs[1].knee, footL: legs[-1].foot, footR: legs[1].foot, hipL: legs[-1].hip, hipR: legs[1].hip },
    phase: 0, deadT: 0,
    setArmor(h, v) {
      helmet.visible = brim.visible = h > 0; if (h > 0) helmMat.color.setHex(ARMOR.helmet.color[h]);
      vest.visible = v > 0; if (v > 0) vestMat.color.setHex(ARMOR.vest.color[v]);
    },
    setGun(model) {
      if (this.gun) { gunMount.remove(this.gun); if (this.gun.userData.mag && this.gun.userData.magHome) { this.gun.userData.mag.position.copy(this.gun.userData.magHome); this.gun.userData.mag.visible = true; } }
      this.gun = model; gz = -0.3;
      if (model) {
        model.position.set(0, 0, 0); model.rotation.set(0, 0, 0);
        const box = new THREE.Box3().setFromObject(model), short = box.max.z - box.min.z < 0.4;
        gz = short ? -0.42 : -0.15 - box.max.z;   // 개머리판 끝이 어깨 앞에 오도록
        model.position.z = gz;
        if (model.userData.mag && !model.userData.magHome) model.userData.magHome = model.userData.mag.position.clone();
        gunMount.add(model);
      }
    },
    setVisible(v) { root.visible = v; },
    setShirt(c) { shirt.color.setHex(c); },
    // 매 프레임 자세
    animate(st, dt) {
      const sp = st.speed, moving = sp > 0.3;
      this.phase += dt * (st.stance === 'prone' ? sp * 3.2 : sp * 1.9 + (moving ? 1.2 : 0));
      const ph = this.phase;
      let bodyY, bodyRX = 0, thighBase = 0, kneeBase = 0, amp = 0, kamp = 0, spineX = 0;
      if (st.dead) {
        this.deadT = Math.min(1, this.deadT + dt * 2.2);
        const t = 1 - Math.pow(1 - this.deadT, 3);
        body.position.y = lerp(st.stanceH, 0.16, t);
        body.rotation.x = lerp(body.rotation.x, 1.45, t);
        body.rotation.z = lerp(0, 0.3, t);
        aim.rotation.x = lerp(aim.rotation.x, 1.2, t); neck.rotation.x = lerp(neck.rotation.x, -0.4, t);
        return;
      }
      this.deadT = 0; body.rotation.z = 0;
      if (st.stance === 'prone') { bodyY = 0.17; bodyRX = -Math.PI / 2; amp = moving ? 0.25 : 0; kamp = moving ? 0.5 : 0; }
      else if (st.stance === 'crouch') { bodyY = 0.62; thighBase = 1.15; kneeBase = -1.75; amp = moving ? 0.35 : 0; kamp = moving ? 0.25 : 0; spineX = -0.12; }
      else { bodyY = 0.95; amp = moving ? clamp(sp / 6.3, 0.2, 1) * 0.75 : 0; kamp = amp * 1.1; spineX = st.sprint ? -0.22 : -0.04; }
      if (st.air) { thighBase += 0.5; kneeBase -= 0.8; amp *= 0.2; }
      // 부드럽게 자세 변경
      const k = 1 - Math.exp(-dt * 10);
      body.position.y = lerp(body.position.y, bodyY + (moving && st.stance !== 'prone' ? Math.abs(Math.sin(ph)) * 0.035 : 0), k);
      body.rotation.x = lerp(body.rotation.x, bodyRX, k);
      for (const side of [-1, 1]) {
        const L = legs[side], s = Math.sin(ph + (side > 0 ? Math.PI : 0));
        L.hip.rotation.x = lerp(L.hip.rotation.x, thighBase + s * amp, k * 1.5);
        L.knee.rotation.x = lerp(L.knee.rotation.x, kneeBase - Math.max(0, -Math.cos(ph + (side > 0 ? Math.PI : 0))) * kamp, k * 1.5);
        L.hip.rotation.z = st.stance === 'prone' ? side * 0.12 : 0;
      }
      spine.rotation.x = lerp(spine.rotation.x, spineX, k);
      spine.rotation.z = lerp(spine.rotation.z, -st.lean * 0.32, 1 - Math.exp(-dt * 12));
      const prone = st.stance === 'prone';
      const pitch = st.pitch;
      aim.rotation.x = (prone ? Math.PI / 2 : 0) - spine.rotation.x + (st.sprint ? -0.5 : pitch);
      aim.rotation.y = st.sprint ? 0.6 : 0;
      neck.rotation.x = (prone ? Math.PI / 2 * 0.85 : 0) - spine.rotation.x + pitch * 0.7;
      aim.position.z = 0;
      // 던지기: 위로 젖혔다가 앞으로 휘두르기 (가까이 던지기는 아래에서 위로)
      aim.rotation.z = 0;
      if (st.thr > 0) {
        const k = st.thr, sw = Math.sin(Math.min(1, k / 0.55) * Math.PI / 2), back = 1 - sw;
        if (st.thrUnder) { aim.rotation.x += -0.9 * back + 0.5 * sw * (1 - k); }
        else { aim.rotation.x += 0.9 * back * (1 - k) - 0.8 * sw * (1 - k); aim.rotation.z = -0.35 * back * (1 - k); }
      } else if (st.pinUp) { aim.rotation.x += 0.45; aim.rotation.z = -0.2; }
      // 3인칭 장전: 총을 살짝 기울이고 왼손으로 탄창을 빼서 버리고 새 탄창을 끼워요
      const g = this.gun, mag = g && g.userData.mag, mh = g && g.userData.magHome;
      if (g && g.userData.brk) { const rk0 = st.reloadT || 0; g.userData.brk.rotation.x = rk0 > 0 ? -0.75 * Math.min(1, Math.max(0, (rk0 - 0.06) / 0.1)) * (1 - Math.min(1, Math.max(0, (rk0 - 0.8) / 0.06))) : 0; }
      const rk = st.reloadT || 0, tilt = rk > 0 ? Math.min(1, rk / 0.1) * Math.min(1, (1 - rk) / 0.12) : 0;
      gunMount.rotation.z = tilt * 0.45; gunMount.rotation.x = tilt * 0.12;
      if (lHand) {
        const H = lHand.position; H.copy(lHome);
        if (rk > 0 && mag && mh) {
          const magW = _v2.set(0, mh.y - 0.06, mh.z + gz).applyEuler(gunMount.rotation).add(gunMount.position); // 탄창 아래 (aim 좌표)
          const down = _v3.set(-0.05, -0.45, -0.15);
          const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
          mag.visible = true; mag.position.copy(mh);
          if (rk < 0.12) H.lerpVectors(lHome, magW, sm(0, 0.12, rk));
          else if (rk < 0.24) { const t = sm(0.12, 0.24, rk); mag.position.y = mh.y - 0.14 * t; H.copy(magW); H.y -= 0.14 * t; }
          else if (rk < 0.42) { const t = (rk - 0.24) / 0.18; mag.position.y = mh.y - 0.14 - 1.2 * t * t; mag.visible = t < 0.75; H.copy(magW).lerp(down, sm(0.24, 0.38, rk)); }
          else if (rk < 0.58) { const t = sm(0.42, 0.58, rk); H.copy(down).lerp(magW, t); H.y -= 0.14 * t; mag.visible = t > 0.2; mag.position.y = mh.y - 0.14; }
          else if (rk < 0.68) { const t = sm(0.58, 0.66, rk); mag.position.y = mh.y - 0.14 * (1 - t); H.copy(magW); H.y -= 0.14 * (1 - t); }
          else H.lerpVectors(magW, lHome, sm(0.68, 0.86, rk));
        } else if (mag && mh) { mag.position.copy(mh); mag.visible = true; }
        fitFore();
      }
      // 파쿠르 동작: 손 짚고 → 다리 접어 넘기기 / 올라서기
      if (st.vault >= 0) {
        const u = st.vault, e = (x) => x * x * (3 - 2 * x);
        const reach = e(clamp(u / 0.35, 0, 1)), over = e(clamp((u - 0.35) / 0.5, 0, 1)), end = e(clamp((u - 0.8) / 0.2, 0, 1));
        const lean = reach * (1 - end);
        spine.rotation.x = -0.75 * lean;
        aim.rotation.x = -1.25 * lean + pitch * (1 - lean); aim.rotation.y = 0.35 * lean;
        neck.rotation.x = 0.55 * lean;
        for (const side of [-1, 1]) {
          const L = legs[side];
          if (st.vaultOver) { // 옆으로 다리 모아 넘기기
            L.hip.rotation.x = lerp(0.3, 1.5, reach) * (1 - end * 0.9);
            L.hip.rotation.z = 0.75 * over * (1 - end);
            L.knee.rotation.x = lerp(-0.4, -1.9, reach) * (1 - end * 0.9);
          } else { // 무릎 올려 올라서기 (한 다리씩)
            const lead = side > 0 ? 1 : 0.55;
            L.hip.rotation.x = lerp(0.2, 1.7 * lead, reach) * (1 - end);
            L.hip.rotation.z = 0;
            L.knee.rotation.x = lerp(-0.3, -2.1 * lead, reach) * (1 - end);
          }
        }
        spine.rotation.z = st.vaultOver ? -0.35 * over * (1 - end) : 0;
      }
    },
  };
  return S_;
}

// 캐릭터의 맞는 부위들 (월드 좌표)
function soldierHitboxes(s, out) {
  const m = s.markers;
  s.root.updateMatrixWorld(true);
  const P = (o, v) => o.getWorldPosition(v);
  out.head.c = P(m.head, out.head.c || new V3());
  out.chestTop = P(m.chest, out.chestTop || new V3());
  out.pelvis = P(m.pelvis, out.pelvis || new V3());
  out.hipL = P(m.hipL, out.hipL || new V3()); out.hipR = P(m.hipR, out.hipR || new V3());
  out.kneeL = P(m.kneeL, out.kneeL || new V3()); out.kneeR = P(m.kneeR, out.kneeR || new V3());
  out.footL = P(m.footL, out.footL || new V3()); out.footR = P(m.footR, out.footR || new V3());
  return out;
}
// 선분 vs 캡슐 / 구 (총알 판정)
function segSegDist2(p1, q1, p2, q2, outT) {
  const d1 = _v1.copy(q1).sub(p1), d2 = _v2.copy(q2).sub(p2), r = _v3.copy(p1).sub(p2);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r);
  let s, t;
  if (a <= 1e-9 && e <= 1e-9) { s = t = 0; }
  else if (a <= 1e-9) { s = 0; t = clamp(f / e, 0, 1); }
  else {
    const c = d1.dot(r);
    if (e <= 1e-9) { t = 0; s = clamp(-c / a, 0, 1); }
    else {
      const b = d1.dot(d2), den = a * e - b * b;
      s = den !== 0 ? clamp((b * f - c * e) / den, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
    }
  }
  const cx = p1.x + d1.x * s - (p2.x + d2.x * t), cy = p1.y + d1.y * s - (p2.y + d2.y * t), cz = p1.z + d1.z * s - (p2.z + d2.z * t);
  outT.s = s;
  return cx * cx + cy * cy + cz * cz;
}
const _segT = { s: 0 };
// 선분 a→b 가 캐릭터를 맞히는지: { s(0~1), part }
function segHitSoldier(a, b, hb) {
  let best = null;
  const test = (p, q, r, part) => {
    const d2 = segSegDist2(a, b, p, q, _segT);
    if (d2 < r * r && (!best || _segT.s < best.s)) best = { s: _segT.s, part };
  };
  test(hb.head.c, hb.head.c, 0.13, 'head');
  _v4.copy(hb.pelvis); test(_v4, hb.chestTop, 0.2, 'torso');
  test(hb.hipL, hb.kneeL, 0.09, 'leg'); test(hb.kneeL, hb.footL, 0.08, 'leg');
  test(hb.hipR, hb.kneeR, 0.09, 'leg'); test(hb.kneeR, hb.footR, 0.08, 'leg');
  return best;
}
