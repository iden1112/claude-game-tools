// ================= 폰(터치) 조작 =================
// 폰·태블릿에서 열면 화면에 조이스틱과 버튼이 나와요. 컴퓨터에서도 주소 뒤에 ?touch=1 을 붙이면 켜져요.
const TOUCH = (() => {
  const mm = (q) => { try { return matchMedia(q).matches; } catch (e) { return false; } };
  const on = /[?&]touch=1/.test(location.search) || mm('(pointer: coarse)') || (navigator.maxTouchPoints > 1 && !mm('(pointer: fine)'));
  if (!on) return { on: false };
  document.documentElement.classList.add('touch');
  // 폰은 가볍게: 따로 고른 적 없으면 '낮음' 화질
  try { if (!JSON.parse(localStorage.getItem('tg1v1_settings') || '{}').quality) SETTINGS.quality = 'low'; } catch (e) { SETTINGS.quality = 'low'; }
  // 폰엔 마우스 잠금이 없어서, 게임에 들어가면 '잠긴 것'으로 처리해요
  lockPointer = function () {
    AU.init(); INPUT.locked = true;
    try { const d = document.documentElement; if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (e) {}
    try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
  };

  const css = document.createElement('style');
  css.textContent = `
#tc{position:fixed;inset:0;z-index:9;touch-action:none;user-select:none;-webkit-user-select:none;display:none}
#tc .tb{position:absolute;width:58px;height:58px;border-radius:50%;background:rgba(20,22,26,.35);border:2px solid rgba(255,255,255,.4);color:#fff;
  font:700 12px/1.1 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;text-align:center;-webkit-tap-highlight-color:transparent}
#tc .tb.on{background:rgba(255,255,255,.38)}
#tc .tb.big{width:84px;height:84px;background:rgba(200,50,40,.35);font-size:15px}
#tc .tb.sm{width:46px;height:46px;font-size:11px}
#tc .joy{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(20,22,26,.2);display:none;pointer-events:none}
#tc .knob{position:absolute;left:50%;top:50%;width:50px;height:50px;margin:-25px 0 0 -25px;border-radius:50%;background:rgba(255,255,255,.45)}
#tc .joyhint{position:absolute;left:4%;bottom:6%;width:34%;height:46%;border-radius:18px;border:1px dashed rgba(255,255,255,.18);pointer-events:none;
  color:rgba(255,255,255,.35);font:600 12px system-ui;display:flex;align-items:flex-end;justify-content:center;padding-bottom:8px;box-sizing:border-box}
html.touch #help{display:none!important}
html.touch #weapon{right:auto!important;left:50%!important;transform:translateX(-50%) scale(.8);bottom:auto!important;top:118px!important;text-align:center;transform-origin:top center}
html.touch #slots{display:none}
html.touch body{overscroll-behavior:none}
`;
  document.head.appendChild(css);
  const root = document.createElement('div'); root.id = 'tc'; document.body.appendChild(root);
  root.innerHTML = '<div class="joyhint">← 여기를 끌어서 이동 (끝까지 밀면 달리기)</div><div class="joy"><div class="knob"></div></div>';
  const joy = root.querySelector('.joy'), knob = root.querySelector('.knob');

  // 버튼: [이름, 위치(css), 동작, 모양]
  const BTN = [
    ['쏘기', 'right:28px;bottom:118px', 'fire', 'big'],
    ['쏘기', 'left:22px;top:38%', 'fire', ''],
    ['조준', 'right:128px;bottom:178px', 'aim', ''],
    ['장전', 'right:32px;bottom:226px', 'KeyR', ''],
    ['점프', 'right:122px;bottom:92px', 'Space', ''],
    ['앉기', 'right:200px;bottom:58px', 'KeyC', ''],
    ['엎드<br>리기', 'right:270px;bottom:30px', 'KeyZ', 'sm'],
    ['무기<br>바꾸기', 'right:30px;bottom:30px', 'next', ''],
    ['투척', 'right:208px;bottom:140px', 'KeyG', ''],
    ['맨손', 'right:276px;bottom:100px', 'KeyX', 'sm'],
    ['사격<br>모드', 'right:200px;bottom:216px', 'KeyB', 'sm'],
    ['Q', 'left:22px;top:22%', 'KeyQ', 'sm'],
    ['E', 'left:76px;top:22%', 'KeyE', 'sm'],
    ['메뉴', 'left:10px;top:8px', 'menu', 'sm'],
    ['시점', 'left:64px;top:8px', 'KeyV', 'sm'],
    ['점수', 'left:118px;top:8px', 'board', 'sm'],
    ['총<br>고르기', 'left:172px;top:4px', 'loadout', ''],
    ['핑', 'right:128px;bottom:256px', 'F3', 'sm'],
    ['1', 'right:300px;bottom:236px', 'Digit1', 'sm'],
    ['2', 'right:352px;bottom:236px', 'Digit2', 'sm'],
    ['3', 'right:404px;bottom:236px', 'Digit3', 'sm'],
  ];
  for (const [label, pos, act, cls] of BTN) {
    const b = document.createElement('div'); b.className = 'tb ' + cls; b.style.cssText = pos; b.innerHTML = label; b.dataset.act = act; root.appendChild(b);
  }
  const press = (act, down, el) => {
    if (el) el.classList.toggle('on', down);
    if (act === 'fire') { INPUT.lmb = down; if (down) INPUT.lmbPressed = true; else INPUT.lmbReleased = true; }
    else if (act === 'aim') { INPUT.rmb = down; if (down) INPUT.rmbPressed = true; else INPUT.rmbReleased = true; }
    else if (act === 'next') { if (down) INPUT.wheel += 1; }
    else if (act === 'board') HUD.showBoard(down);
    else if (act === 'menu') { if (down) { INPUT.locked = false; INPUT.keys = {}; INPUT.lmb = INPUT.rmb = false; if (window.onPointerUnlock) window.onPointerUnlock(); } }
    else if (act === 'loadout') { if (down) { INPUT.keys = {}; INPUT.lmb = INPUT.rmb = false; openLoadout(); } }
    else { if (down && !INPUT.keys[act]) INPUT.pressed[act] = true; INPUT.keys[act] = down; }
  };

  // 손가락마다 하는 일: 'joy' 이동 / 'look' 시점 / 버튼 (쏘기·조준 버튼을 누른 채로 끌면 시점도 돌아가요)
  const T = new Map();
  let joyId = null, jx = 0, jy = 0;
  const R = 55;
  const setMove = (dx, dy) => {
    const k = INPUT.keys, len = Math.hypot(dx, dy), t = R * 0.32;
    k.KeyW = dy < -t; k.KeyS = dy > t; k.KeyA = dx < -t; k.KeyD = dx > t;
    k.ShiftLeft = dy < -R * 0.92 && len > R * 0.95; // 끝까지 앞으로 밀면 달리기
    const c = len > R ? R / len : 1; knob.style.transform = `translate(${dx * c}px,${dy * c}px)`;
  };
  root.addEventListener('touchstart', (e) => {
    e.preventDefault(); AU.init();
    for (const t of e.changedTouches) {
      const el = t.target.closest ? t.target.closest('.tb') : null;
      if (el) { const act = el.dataset.act; T.set(t.identifier, { act, el, x: t.clientX, y: t.clientY, look: act === 'fire' || act === 'aim' }); press(act, true, el); continue; }
      if (t.clientX < innerWidth * 0.42 && joyId === null) {
        joyId = t.identifier; jx = t.clientX; jy = t.clientY; joy.style.display = 'block'; joy.style.left = jx + 'px'; joy.style.top = jy + 'px'; setMove(0, 0);
        T.set(t.identifier, { act: 'joy' });
      } else T.set(t.identifier, { act: 'look', x: t.clientX, y: t.clientY, look: true });
    }
  }, { passive: false });
  root.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const sens = 1.7 * (SETTINGS.touchSens || 1);
    for (const t of e.changedTouches) {
      const s = T.get(t.identifier); if (!s) continue;
      if (s.act === 'joy') { setMove(t.clientX - jx, t.clientY - jy); continue; }
      if (s.look) { INPUT.mdx += (t.clientX - s.x) * sens; INPUT.mdy += (t.clientY - s.y) * sens; s.x = t.clientX; s.y = t.clientY; }
    }
  }, { passive: false });
  const end = (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const s = T.get(t.identifier); if (!s) continue; T.delete(t.identifier);
      if (s.act === 'joy') { joyId = null; joy.style.display = 'none'; setMove(0, 0); INPUT.keys.KeyW = INPUT.keys.KeyA = INPUT.keys.KeyS = INPUT.keys.KeyD = INPUT.keys.ShiftLeft = false; }
      else if (s.act !== 'look') press(s.act, false, s.el);
    }
  };
  root.addEventListener('touchend', end, { passive: false });
  root.addEventListener('touchcancel', end, { passive: false });

  // 게임 중일 때만 버튼 보이기
  let shown = false;
  (function loop() {
    const play = typeof isPlaying === 'function' && isPlaying() && !G.menuOpen && INPUT.locked;
    if (play !== shown) {
      shown = play; root.style.display = play ? 'block' : 'none';
      if (!play) { for (const [, s] of T) if (s.el) s.el.classList.remove('on'); T.clear(); joyId = null; joy.style.display = 'none'; INPUT.lmb = INPUT.rmb = false; INPUT.keys = {}; }
    }
    requestAnimationFrame(loop);
  })();
  return { on: true };
})();
