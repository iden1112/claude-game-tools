/*
 * character3d.js — 귀엽고 디테일한 3D 캐릭터 (플레이어·NPC). models3d.js 다음에 로드하세요.
 *
 *   const hero = MODELS3D.character({ hair: 'spiky', hairColor: 0x3a2418, shirt: 0x3a7ad8, hat: 'straw' });
 *   const shop = MODELS3D.npc('shopkeeper');
 *   scene.add(hero);
 *   hero.userData.moving = 1;           // 0 가만히, 1 걷기, 2 달리기
 *   hero.userData.play('wave');         // 'wave' 손 흔들기 | 'cast' 낚싯대 던지기 | 'cheer' 만세 | 'nod' 끄덕
 *   MODELS3D.updateAll(scene, t, dt);   // 매 프레임 (눈 깜빡임, 숨쉬기, 걷기, 동작)
 *
 * 키 1.6 (머리가 큰 귀여운 비율). 앞은 +Z. 둥근 부위는 부드러운 음영, style:'toon' 이면 만화 음영.
 * userData.parts 에 관절(머리, 팔, 팔꿈치, 손, 다리, 무릎)이 있어서 낚싯대·도구를 손에 붙일 수 있어요.
 */
(function (root) {
  'use strict';
  const T = () => root.THREE;
  const M = root.MODELS3D;
  if (!M) throw new Error('character3d.js: models3d.js 를 먼저 로드하세요');

  const SKINS = [0xf6d2b4, 0xeebd96, 0xd89a6c, 0xb07448, 0x7a4a2a];
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);

  M.character = function (o = {}) {
    const THREE = T();
    const H = o.height || 1.6, u = H / 1.6;
    const style = o.style || 'smooth';
    const mat = (c, extra = {}) => M.material(c, Object.assign({ style, shininess: 12 }, extra));
    const darker = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
    const skinC = o.skin != null ? (o.skin < 10 ? SKINS[o.skin] : o.skin) : SKINS[0];
    const C = {
      skin: mat(skinC), skinDark: mat(darker(skinC, 0.86)),
      shirt: mat(o.shirt != null ? o.shirt : 0x3a7ad8), shirt2: mat(darker(o.shirt != null ? o.shirt : 0x3a7ad8, 0.78)),
      pants: mat(o.pants != null ? o.pants : 0x3a4a6a), shoes: mat(o.shoes != null ? o.shoes : 0x5a3a2a), sole: mat(0xe8e0d0),
      hair: mat(o.hairColor != null ? o.hairColor : 0x4a2a1a), hair2: mat(darker(o.hairColor != null ? o.hairColor : 0x4a2a1a, 0.8)),
      eyeW: M.material(0xffffff, { style: 'basic' }), eyeB: M.material(o.eyeColor != null ? o.eyeColor : 0x2a1e1a, { style: 'basic' }),
      mouth: M.material(0x7a2a2a, { style: 'basic' }), blush: M.material(0xff9a9a, { style: 'basic', transparent: true, opacity: 0.55 }),
      belt: mat(o.belt != null ? o.belt : 0x5a3a20),
    };
    const add = (parent, geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
      const me = new THREE.Mesh(geo, m); me.position.set(x * u, y * u, z * u); me.scale.set(sx, sy, sz); me.castShadow = true; me.receiveShadow = true; parent.add(me); return me;
    };
    const sph = (r, w = 16, h = 12) => new THREE.SphereGeometry(r * u, w, h);
    const cyl = (rt, rb, h, s = 14) => new THREE.CylinderGeometry(rt * u, rb * u, h * u, s);
    // 캡슐: 원기둥 + 양끝 반구 (r128 에는 CapsuleGeometry 가 없어요)
    const capsule = (parent, r, len, m, y0 = 0) => {
      const g = new THREE.Group(); parent.add(g); g.position.y = y0 * u;
      add(g, cyl(r, r * 0.92, len), m, 0, -len / 2, 0);
      add(g, sph(r, 12, 8), m, 0, 0, 0);
      add(g, sph(r * 0.92, 12, 8), m, 0, -len, 0);
      return g;
    };

    const g = new THREE.Group(); g.name = 'character';
    // ----- 엉덩이 (몸 전체의 기준점) -----
    const hips = new THREE.Group(); hips.position.y = 0.6 * u; g.add(hips);
    add(hips, sph(0.2, 16, 10), C.pants, 0, 0.02, 0, 1, 0.7, 0.85);
    // ----- 몸통 -----
    const torso = new THREE.Group(); torso.position.y = 0.05 * u; hips.add(torso);
    const body = add(torso, cyl(0.18, 0.21, 0.4, 16), C.shirt, 0, 0.2, 0, 1, 1, 0.82);
    add(torso, sph(0.185, 16, 10), C.shirt, 0, 0.4, 0, 1, 0.55, 0.82);              // 어깨 둥글게
    add(torso, cyl(0.215, 0.215, 0.05, 16), C.belt, 0, 0.02, 0, 1, 1, 0.84);           // 허리띠
    add(torso, new THREE.BoxGeometry(0.05 * u, 0.04 * u, 0.02 * u), mat(0xe0c060), 0, 0.02, 0.18);
    add(torso, new THREE.TorusGeometry(0.085 * u, 0.025 * u, 6, 16), C.shirt2, 0, 0.47, 0.0, 1, 1, 1).rotation.x = Math.PI / 2; // 옷깃
    if (o.buttons !== false) for (let i = 0; i < 3; i++) add(torso, sph(0.014, 6, 4), C.shirt2, 0, 0.36 - i * 0.1, 0.168);
    // 겉옷: 'apron'(앞치마) | 'vest'(조끼) | 'overalls'(멜빵) | 'coat'
    const outer = o.outfit;
    if (outer === 'apron') {
      const ap = mat(o.outfitColor != null ? o.outfitColor : 0xf4ecd8);
      // 몸을 감싸는 앞치마 (원기둥의 앞쪽 일부)
      add(torso, new THREE.CylinderGeometry(0.205 * u, 0.235 * u, 0.56 * u, 14, 1, true, -1.05, 2.1), Object.assign(ap, { side: T().DoubleSide }), 0, 0.02, 0, 1, 1, 0.86);
      add(torso, new THREE.CylinderGeometry(0.24 * u, 0.24 * u, 0.1 * u, 10, 1, true, -0.45, 0.9), mat(darker(o.outfitColor || 0xf4ecd8, 0.85)), 0, -0.1, 0.004, 1, 1, 0.86);
      add(torso, new THREE.TorusGeometry(0.21 * u, 0.012 * u, 4, 20), ap, 0, 0.3, 0, 1, 0.86, 1).rotation.x = Math.PI / 2;
    } else if (outer === 'vest') {
      const vm = mat(o.outfitColor != null ? o.outfitColor : 0x5a7a3a);
      for (const s of [-1, 1]) add(torso, new THREE.BoxGeometry(0.13 * u, 0.36 * u, 0.04 * u), vm, s * 0.1, 0.22, 0.165).rotation.z = s * 0.06;
      add(torso, cyl(0.19, 0.22, 0.38, 16), vm, 0, 0.21, -0.012, 1.04, 1, 0.8);
      for (const s of [-1, 1]) add(torso, new THREE.BoxGeometry(0.07 * u, 0.06 * u, 0.02 * u), mat(darker(o.outfitColor || 0x5a7a3a, 0.75)), s * 0.1, 0.12, 0.19);
    } else if (outer === 'overalls') {
      const om = mat(o.outfitColor != null ? o.outfitColor : 0x3a5a9a);
      add(torso, new THREE.BoxGeometry(0.24 * u, 0.2 * u, 0.03 * u), om, 0, 0.1, 0.175);
      for (const s of [-1, 1]) add(torso, new THREE.BoxGeometry(0.045 * u, 0.36 * u, 0.025 * u), om, s * 0.09, 0.3, 0.17);
      C.pants = om;
    } else if (outer === 'coat') {
      const cm = mat(o.outfitColor != null ? o.outfitColor : 0x7a4a2a);
      add(torso, cyl(0.2, 0.26, 0.52, 16), cm, 0, 0.14, 0, 1.02, 1, 0.86);
    }
    // ----- 머리 -----
    const neck = new THREE.Group(); neck.position.y = 0.5 * u; torso.add(neck);
    add(neck, cyl(0.08, 0.09, 0.07, 12), C.skinDark, 0, 0.0, 0);
    const head = new THREE.Group(); head.position.y = 0.02 * u; neck.add(head);
    const HR = 0.27;
    add(head, sph(HR, 24, 18), C.skin, 0, HR, 0, 1, 0.94, 0.96);
    for (const s of [-1, 1]) add(head, sph(0.055, 10, 8), C.skin, s * 0.26, HR - 0.02, -0.01, 0.6, 1, 0.9); // 귀
    // 얼굴
    const face = new THREE.Group(); face.position.set(0, HR, 0); head.add(face);
    const eyes = [];
    for (const s of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(s * 0.095 * u, 0.0 * u, 0.235 * u); face.add(e);
      add(e, sph(0.05, 12, 10), C.eyeW, 0, 0, 0, 0.85, 1.1, 0.45);
      add(e, sph(0.036, 12, 10), C.eyeB, 0, -0.004, 0.016, 0.85, 1.05, 0.5);
      add(e, sph(0.012, 6, 4), C.eyeW, s * -0.01 + 0.008, 0.016, 0.036);
      e.rotation.y = s * 0.28;
      eyes.push(e);
      const brow = add(face, new THREE.BoxGeometry(0.07 * u, 0.016 * u, 0.02 * u), C.hair2, s * 0.1, 0.085, 0.235);
      brow.rotation.z = s * -0.12; brow.rotation.y = s * 0.28;
      if (o.blush !== false) add(face, sph(0.03, 8, 6), C.blush, s * 0.15, -0.065, 0.215, 1.2, 0.6, 0.3).rotation.y = s * 0.5;
    }
    add(face, sph(0.022, 8, 6), C.skinDark, 0, -0.04, 0.262, 1, 0.8, 0.8); // 코
    const mouth = add(face, new THREE.TorusGeometry(0.03 * u, 0.008 * u, 4, 10, Math.PI), C.mouth, 0, -0.095, 0.245);
    mouth.rotation.z = Math.PI; mouth.rotation.x = -0.3;
    if (o.beard) add(face, sph(0.16, 14, 10), mat(o.beardColor != null ? o.beardColor : (o.hairColor != null ? o.hairColor : 0xd8d0c8)), 0, -0.14, 0.12, 1.1, 0.75, 0.8);
    if (o.glasses) {
      const gm = M.material(o.glasses === true ? 0x2a2a2a : o.glasses, { style: 'basic' });
      for (const s of [-1, 1]) add(face, new THREE.TorusGeometry(0.055 * u, 0.008 * u, 4, 16), gm, s * 0.1, 0.0, 0.262).rotation.y = s * 0.25;
      add(face, new THREE.BoxGeometry(0.06 * u, 0.008 * u, 0.008 * u), gm, 0, 0.01, 0.27);
    }
    // 머리카락: 'short' | 'spiky' | 'long' | 'ponytail' | 'bob' | 'bald' | 'buns'
    const hairStyle = o.hair || 'short';
    if (hairStyle !== 'bald') {
      const cap = new THREE.SphereGeometry((HR + 0.025) * u, 24, 14, 0, Math.PI * 2, 0, Math.PI * (hairStyle === 'bob' || hairStyle === 'long' ? 0.62 : 0.5));
      const c = add(head, cap, C.hair, 0, HR + 0.01, -0.03, 1.02, 0.98, 1.04); c.rotation.x = -0.5;
      for (const s of [-1, 1]) add(head, sph(0.075, 10, 8), C.hair, s * 0.235, HR + 0.06, -0.02, 0.6, 1.2, 1); // 옆머리
      // 앞머리
      const bangs = hairStyle === 'spiky' ? 5 : 4;
      for (let i = 0; i < bangs; i++) {
        const x = (i - (bangs - 1) / 2) * 0.085;
        const b = add(head, new THREE.ConeGeometry(0.065 * u, 0.12 * u, 6), C.hair, x, HR + 0.14 - Math.abs(x) * 0.3, 0.225 - Math.abs(x) * 0.3);
        b.rotation.x = 2.2; b.rotation.z = -x * 2.4;
      }
      if (hairStyle === 'spiky') for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const sp = add(head, new THREE.ConeGeometry(0.07 * u, 0.2 * u, 6), i % 2 ? C.hair2 : C.hair, Math.cos(a) * 0.14, HR + 0.2, Math.sin(a) * 0.12 - 0.04);
        sp.rotation.set(Math.sin(a) * -0.7, 0, Math.cos(a) * -0.7);
      }
      if (hairStyle === 'long') add(head, sph(0.26, 16, 12), C.hair, 0, HR - 0.18, -0.08, 1.05, 1.25, 0.6);
      if (hairStyle === 'ponytail') { const pt = capsule(head, 0.06, 0.26, C.hair, HR + 0.02); pt.position.z = -0.27 * u; pt.rotation.x = 0.5; add(head, sph(0.05, 8, 6), C.belt, 0, HR + 0.05, -0.27); }
      if (hairStyle === 'buns') for (const s of [-1, 1]) add(head, sph(0.09, 12, 10), C.hair, s * 0.18, HR + 0.2, -0.05);
      if (hairStyle === 'bob') for (const s of [-1, 1]) add(head, sph(0.1, 12, 10), C.hair, s * 0.22, HR - 0.08, -0.02, 0.7, 1.3, 1);
    }
    // 모자: 'straw' 밀짚모자 | 'cap' 야구모자 | 'beanie' 털모자 | 'captain' 선장모
    const hatC = o.hatColor, hatStart = head.children.length;
    if (o.hat === 'straw') {
      const hm = mat(hatC != null ? hatC : 0xe8c870), band = mat(o.hatBand != null ? o.hatBand : 0xc84a3a);
      add(head, cyl(0.46, 0.48, 0.03, 24), hm, 0, HR + 0.17, -0.02);
      add(head, cyl(0.2, 0.27, 0.17, 20), hm, 0, HR + 0.26, -0.02);
      add(head, cyl(0.275, 0.275, 0.05, 20), band, 0, HR + 0.2, -0.02);
    } else if (o.hat === 'cap') {
      const hm = mat(hatC != null ? hatC : 0xd84a3a);
      add(head, new THREE.SphereGeometry(0.29 * u, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hm, 0, HR + 0.06, -0.01).rotation.x = -0.15;
      add(head, cyl(0.2, 0.2, 0.02, 16), hm, 0, HR + 0.1, 0.25, 1, 1, 0.75).rotation.x = 0.15;
      add(head, sph(0.03, 6, 4), hm, 0, HR + 0.35, 0);
    } else if (o.hat === 'beanie') {
      const hm = mat(hatC != null ? hatC : 0x3a8a6a);
      add(head, new THREE.SphereGeometry(0.295 * u, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hm, 0, HR + 0.03, -0.01).rotation.x = -0.2;
      add(head, cyl(0.29, 0.29, 0.08, 20), mat(darker(hatC != null ? hatC : 0x3a8a6a, 0.8)), 0, HR + 0.05, -0.01).rotation.x = -0.2;
      add(head, sph(0.06, 8, 6), mat(0xf4f0e8), 0, HR + 0.34, -0.06);
    } else if (o.hat === 'captain') {
      const hm = mat(hatC != null ? hatC : 0xf4f4f0);
      add(head, cyl(0.31, 0.27, 0.13, 20), hm, 0, HR + 0.22, -0.02);
      add(head, cyl(0.27, 0.27, 0.05, 20), mat(0x1a2a4a), 0, HR + 0.15, -0.02);
      add(head, cyl(0.17, 0.17, 0.02, 16), mat(0x1a2a4a), 0, HR + 0.14, 0.22, 1, 1, 0.7).rotation.x = 0.25;
      add(head, sph(0.03, 6, 4), mat(0xe0c040), 0, HR + 0.2, 0.28);
    }
    // 모자는 얼굴에 그림자를 드리우지 않게 (얼굴이 어두워져 보여요)
    head.children.slice(hatStart).forEach((m) => (m.castShadow = false));
    // ----- 팔 (어깨 → 팔꿈치 → 손) -----
    const arm = (s) => {
      const sh = new THREE.Group(); sh.position.set(s * 0.235 * u, 0.42 * u, 0); torso.add(sh);
      add(sh, sph(0.075, 12, 8), C.shirt, 0, 0, 0);
      add(sh, cyl(0.07, 0.065, 0.2, 12), C.shirt, 0, -0.1, 0);
      const el = new THREE.Group(); el.position.y = -0.2 * u; sh.add(el);
      add(el, sph(0.06, 10, 8), o.longSleeves === false ? C.skin : C.shirt, 0, 0, 0);
      add(el, cyl(0.058, 0.052, 0.17, 12), o.longSleeves === false ? C.skin : C.shirt2, 0, -0.085, 0);
      const hand = new THREE.Group(); hand.position.y = -0.2 * u; el.add(hand);
      add(hand, sph(0.065, 12, 10), C.skin, 0, 0, 0, 0.9, 1.05, 0.85);
      add(hand, sph(0.028, 8, 6), C.skin, s * -0.045, 0.02, 0.03); // 엄지
      sh.rotation.z = s * 0.08;
      return { sh, el, hand };
    };
    const L = arm(-1), R = arm(1);
    // ----- 다리 (엉덩이 → 무릎 → 신발) -----
    const leg = (s) => {
      const hp = new THREE.Group(); hp.position.set(s * 0.1 * u, 0, 0); hips.add(hp);
      add(hp, cyl(0.09, 0.08, 0.28, 12), C.pants, 0, -0.14, 0);
      const kn = new THREE.Group(); kn.position.y = -0.28 * u; hp.add(kn);
      add(kn, sph(0.08, 10, 8), C.pants, 0, 0, 0);
      add(kn, cyl(0.078, 0.07, 0.24, 12), C.pants, 0, -0.12, 0);
      const ft = new THREE.Group(); ft.position.y = -0.27 * u; kn.add(ft);
      add(ft, sph(0.085, 14, 10), C.shoes, 0, 0.0, 0.035, 0.95, 0.62, 1.45);
      add(ft, cyl(0.082, 0.082, 0.025, 14), C.sole, 0, -0.04, 0.035, 0.98, 1, 1.45);
      return { hp, kn, ft };
    };
    const LL = leg(-1), RL = leg(1);
    // ----- 소품: 'backpack' | 'bag' | 'rod'(오른손 낚싯대) -----
    const props = [].concat(o.props || []);
    if (props.includes('backpack')) { const bp = mat(0xc87a3a); add(torso, new THREE.BoxGeometry(0.3 * u, 0.32 * u, 0.14 * u), bp, 0, 0.24, -0.24); add(torso, new THREE.BoxGeometry(0.22 * u, 0.1 * u, 0.04 * u), mat(darker(0xc87a3a, 0.8)), 0, 0.16, -0.32); }
    if (props.includes('bag')) { const b = add(torso, new THREE.BoxGeometry(0.16 * u, 0.14 * u, 0.06 * u), mat(0x8a5a3a), -0.24, 0.0, 0.05); b.rotation.y = 0.3; }
    let rod = null;
    if (props.includes('rod')) {
      rod = new THREE.Group(); R.hand.add(rod); rod.rotation.x = 2.0; // 손목: 팔과 합쳐서 낚싯대가 앞 위를 향해요
      add(rod, cyl(0.012, 0.022, 1.5, 6), mat(0x6a4a2a), 0, 0.7, 0.02);
      add(rod, cyl(0.035, 0.035, 0.05, 10), mat(0x9a9aa8), 0, 0.12, 0.05).rotation.z = Math.PI / 2;
    }

    // 낚싯줄과 찌 (cast 로 던지고 reel 로 감아요)
    let line = null, bobber = null;
    if (rod) {
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12 * 3), 3));
      line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf4f4f4 })); line.frustumCulled = false; g.add(line);
      bobber = new THREE.Group(); g.add(bobber);
      add(bobber, sph(0.045, 10, 8), M.material(0xffffff, { style: 'smooth' }), 0, 0, 0);
      add(bobber, new THREE.SphereGeometry(0.046 * u, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.material(0xe03a2a, { style: 'smooth' }), 0, 0.005, 0);
      bobber.visible = false;
    }
    g.userData.parts = { hips, torso, head, neck, face, eyes, mouth, armL: L.sh, armR: R.sh, elbowL: L.el, elbowR: R.el, handL: L.hand, handR: R.hand, legL: LL.hp, legR: RL.hp, kneeL: LL.kn, kneeR: RL.kn, footL: LL.ft, footR: RL.ft, rod };
    // ----- 움직임 -----
    let ph = 0, blinkT = 1 + Math.random() * 3, act = null, actT = 0, mv = 0;
    const ACTS = { wave: 1.6, cast: 1.25, reel: 0.7, cheer: 1.4, nod: 0.8 };
    // 낚시 상태: 'idle' 손에 | 'fly' 날아가는 중 | 'water' 물 위 | 'reel' 감는 중
    const fish = { state: 'idle', from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, dist: 3, onLand: null, h: 0 };
    /**
     * play('cast', { distance: 3, waterY: 0, onLand(worldPos) }) 낚싯대를 던져요. 찌가 앞으로 날아가 waterY 높이에 떨어져요
     * play('reel') 줄을 감아 찌를 돌려받아요. 그 밖: 'wave' 'cheer' 'nod'
     */
    g.userData.play = (name, opt = {}) => {
      if (!ACTS[name]) return;
      if (name === 'cast' && rod) { fish.dist = (opt.distance || 3) * u; fish.waterY = opt.waterY; fish.onLand = opt.onLand || null; fish.state = 'idle'; bobber.visible = false; }
      if (name === 'reel' && rod && fish.state === 'water') { fish.state = 'reel'; fish.t = 0; fish.from.copy(bobber.position); }
      act = name; actT = 0;
    };
    /** 물 위 찌의 월드 위치 (없으면 null) */
    g.userData.bobberWorld = () => (bobber && fish.state === 'water' ? bobber.getWorldPosition(new THREE.Vector3()) : null);
    const tipLocal = new THREE.Vector3(), tmpW = new THREE.Vector3();
    const rodTip = () => { rod.updateWorldMatrix(true, false); tmpW.set(0, 1.45 * u, 0.02 * u); rod.localToWorld(tmpW); g.updateWorldMatrix(true, false); return g.worldToLocal(tipLocal.copy(tmpW)); };
    // 팔 자세 키프레임 [어깨x, 팔꿈치x, 손목(낚싯대)x, 몸통 비틀기, 몸통 기울기]
    const POSE = { hold: [-0.35, -1.0, 2.0, 0, 0], wind: [-2.75, -0.35, 2.35, 0.35, -0.1], snap: [-1.45, -0.1, 3.05, -0.3, 0.16], reel: [-0.6, -1.5, 2.3, 0, 0.05] };
    const mixPose = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
    g.userData.moving = 0;
    g.userData.update = (t, dt = 1 / 60) => {
      dt = Math.min(dt, 0.1);
      mv += ((g.userData.moving || 0) - mv) * Math.min(1, dt * 8);
      const run = Math.max(0, mv - 1), walk = Math.min(1, mv);
      ph += dt * (7 + run * 4) * (walk > 0.05 ? 1 : 0);
      const s = Math.sin(ph), c = Math.cos(ph);
      const legA = walk * 0.6 + run * 0.35, armA = walk * 0.55 + run * 0.4;
      LL.hp.rotation.x = s * legA; RL.hp.rotation.x = -s * legA;
      LL.kn.rotation.x = Math.max(0, -s) * legA * 1.3; RL.kn.rotation.x = Math.max(0, s) * legA * 1.3;
      LL.ft.rotation.x = -LL.hp.rotation.x * 0.3; RL.ft.rotation.x = -RL.hp.rotation.x * 0.3;
      L.sh.rotation.x = -s * armA; R.sh.rotation.x = s * armA;
      L.el.rotation.x = -(0.25 + Math.max(0, s) * 0.5) * walk; R.el.rotation.x = -(0.25 + Math.max(0, -s) * 0.5) * walk;
      L.sh.rotation.z = -0.08 - run * 0.15; R.sh.rotation.z = 0.08 + run * 0.15;
      if (rod && !g.userData.manual) { const hp = POSE.hold; R.sh.rotation.x = hp[0] + s * 0.08 * walk; R.el.rotation.x = hp[1]; rod.rotation.x = hp[2]; }
      const breathe = Math.sin(t * 2.2) * 0.012 * (1 - walk);
      hips.position.y = (0.6 + Math.abs(c) * 0.035 * walk + run * 0.02) * u;
      torso.rotation.x = run * 0.18 + walk * 0.04; torso.rotation.y = s * 0.08 * walk;
      body.scale.y = 1 + breathe; head.rotation.y = Math.sin(t * 0.5) * 0.12 * (1 - walk); head.rotation.x = 0;
      // 눈 깜빡임
      blinkT -= dt; const bl = blinkT < 0.12 ? 0.1 : 1; if (blinkT < 0) blinkT = 2 + Math.random() * 3;
      eyes.forEach((e) => (e.scale.y = bl));
      // 동작 (걷기 위에 덮어써요)
      if (act) {
        actT += dt; const k = actT / ACTS[act];
        const env = smooth(Math.min(1, k * 4)) * smooth(Math.min(1, (1 - k) * 4));
        if (act === 'wave') { R.sh.rotation.z = lerp(R.sh.rotation.z, 2.6, env); R.sh.rotation.x = lerp(R.sh.rotation.x, 0, env); R.el.rotation.z = Math.sin(actT * 14) * 0.5 * env; R.el.rotation.x = 0; head.rotation.z = -0.1 * env; }
        if (act === 'cheer') { for (const [a, sg] of [[L, -1], [R, 1]]) { a.sh.rotation.z = lerp(a.sh.rotation.z, sg * 2.7, env); a.sh.rotation.x = 0; a.el.rotation.x = 0; } hips.position.y += Math.abs(Math.sin(actT * 9)) * 0.12 * u * env; }
        if (act === 'nod') head.rotation.x = Math.sin(actT * 16) * 0.25 * env;
        if (act === 'cast' && rod) { // 천천히 뒤로 젖혔다가(0~0.42) 빠르게 앞으로 휙(0.42~0.55), 잠깐 멈췄다가 들고 있는 자세로
          let ps;
          if (k < 0.42) ps = mixPose(POSE.hold, POSE.wind, smooth(k / 0.42));
          else if (k < 0.55) ps = mixPose(POSE.wind, POSE.snap, smooth((k - 0.42) / 0.13));
          else if (k < 0.8) ps = POSE.snap;
          else ps = mixPose(POSE.snap, POSE.hold, smooth((k - 0.8) / 0.2));
          R.sh.rotation.x = ps[0]; R.el.rotation.x = ps[1]; rod.rotation.x = ps[2]; torso.rotation.y = ps[3]; torso.rotation.x += ps[4];
          L.sh.rotation.x = -0.5 * smooth(Math.min(1, k * 3)) * (1 - smooth(Math.max(0, (k - 0.8) / 0.2))); L.el.rotation.x = -0.8;
          if (k >= 0.5 && fish.state === 'idle') { // 찌 출발
            fish.state = 'fly'; fish.t = 0; fish.from.copy(rodTip());
            const wy = fish.waterY != null ? g.worldToLocal(tmpW.set(0, fish.waterY, 0).add(g.getWorldPosition(new THREE.Vector3()).setY(0))).y : 0.02;
            fish.to.set(0, wy, fish.dist + 0.3 * u); bobber.visible = true; bobber.position.copy(fish.from);
          }
        } else if (act === 'cast') { R.sh.rotation.x = -2.2 * Math.sin(k * Math.PI); }
        if (act === 'reel' && rod) { const e2 = Math.sin(Math.min(1, k) * Math.PI); const ps = mixPose(POSE.hold, POSE.reel, e2); R.sh.rotation.x = ps[0]; R.el.rotation.x = ps[1]; rod.rotation.x = ps[2] + Math.sin(actT * 30) * 0.03; L.sh.rotation.x = -0.7 * e2; L.el.rotation.x = -1.2 * e2; }
        if (k >= 1) act = null;
      }
      if (rod) {
        const tip = rodTip();
        if (fish.state === 'fly') {
          fish.t += dt / 0.55; const q = Math.min(1, fish.t);
          bobber.position.lerpVectors(fish.from, fish.to, q); bobber.position.y += Math.sin(q * Math.PI) * 0.9 * u;
          if (q >= 1) { fish.state = 'water'; if (fish.onLand) fish.onLand(bobber.getWorldPosition(new THREE.Vector3())); }
        } else if (fish.state === 'water') {
          bobber.position.y = fish.to.y + Math.sin(t * 3) * 0.012 * u;
        } else if (fish.state === 'reel') {
          fish.t += dt / 0.6; const q = Math.min(1, fish.t);
          bobber.position.lerpVectors(fish.from, tip, smooth(q)); if (q >= 1) { fish.state = 'idle'; bobber.visible = false; }
        }
        // 줄: 끝 → 찌, 가운데가 처지게
        const pa = line.geometry.attributes.position, out = fish.state !== 'idle';
        line.visible = out;
        if (out) {
          const b = bobber.position, sag = fish.state === 'water' ? 0.35 * u : 0.08 * u;
          for (let i = 0; i < 12; i++) { const q = i / 11; pa.setXYZ(i, lerp(tip.x, b.x, q), lerp(tip.y, b.y, q) - Math.sin(q * Math.PI) * sag, lerp(tip.z, b.z, q)); }
          pa.needsUpdate = true;
        }
      }
    };
    return g;
  };

  /** 미리 꾸민 NPC. kind: fisher 어부 | shopkeeper 상점주인 | farmer 농부 | kid 아이 | elder 할아버지 | sailor 선원 | girl 소녀 | hero 주인공 */
  M.npc = function (kind, o = {}) {
    const P = {
      hero: { hair: 'spiky', hairColor: 0x4a2a1a, shirt: 0xe05a3a, pants: 0x3a4a6a, hat: 'straw', props: ['rod'] },
      fisher: { hair: 'short', hairColor: 0x2a1a10, shirt: 0xd8d0b8, outfit: 'vest', outfitColor: 0x4a6a3a, pants: 0x4a4a5a, hat: 'beanie', hatColor: 0x2a6a8a, beard: true, beardColor: 0x3a2418, skin: 2, props: ['rod'] },
      shopkeeper: { hair: 'bob', hairColor: 0x7a3a1a, shirt: 0x8ac0e0, outfit: 'apron', outfitColor: 0xf4ecd8, pants: 0x5a4a3a, glasses: 0x6a3a1a, skin: 1 },
      farmer: { hair: 'short', hairColor: 0x6a4a2a, shirt: 0xd84a3a, outfit: 'overalls', outfitColor: 0x3a5a9a, hat: 'straw', skin: 1, longSleeves: false },
      kid: { height: 1.2, hair: 'buns', hairColor: 0x2a1a10, shirt: 0xf0c040, pants: 0x3a8a6a, props: ['backpack'] },
      elder: { hair: 'bald', shirt: 0x8a6a4a, outfit: 'coat', outfitColor: 0x6a4a3a, pants: 0x4a4a4a, beard: true, beardColor: 0xe8e4dc, glasses: true, skin: 0, height: 1.5 },
      sailor: { hair: 'short', hairColor: 0x1a1a1a, shirt: 0xf4f4f0, pants: 0x1a2a4a, hat: 'captain', skin: 3, beard: true, beardColor: 0x1a1a1a },
      girl: { hair: 'ponytail', hairColor: 0xd8a040, shirt: 0xe07ab0, pants: 0x4a5a8a, skin: 0, props: ['bag'] },
    };
    return M.character(Object.assign({}, P[kind] || P.hero, o));
  };
})(typeof window !== 'undefined' ? window : globalThis);
