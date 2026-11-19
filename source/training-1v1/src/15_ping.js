// ================= 핑 (F3) =================
// 바라보는 곳에 노란 표시를 찍어요. 적을 보고 찍으면 빨간 표시. 같은 팀에게도 보여요 (멀티).
const PINGS = [];
const pingBox = document.createElement('div'); pingBox.id = 'pings';
pingBox.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:6';
document.body.appendChild(pingBox);
(() => { const st = document.createElement('style'); st.textContent = `
#pings .pg{position:absolute;transform:translate(-50%,-100%);text-align:center;font:700 12px system-ui,sans-serif;color:#ffd24a;text-shadow:0 1px 3px #000;white-space:nowrap}
#pings .pg i{display:block;margin:0 auto 2px;width:14px;height:14px;background:#ffd24a;transform:rotate(45deg);box-shadow:0 0 6px rgba(0,0,0,.7);border:2px solid #fff3b0}
#pings .pg.e{color:#ff5a4a}#pings .pg.e i{background:#ff4030;border-color:#ffc0b8}
#pings .pg.edge{opacity:.85}
#pings .pg small{display:block;font-size:10px;color:#fff;opacity:.85}`; document.head.appendChild(st); })();
// 3D 표시: 바닥 고리 + 빛기둥
const PING_MAT = { y: new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.55, depthWrite: false }), e: new THREE.MeshBasicMaterial({ color: 0xff4030, transparent: true, opacity: 0.55, depthWrite: false }) };
function placePing(pos, by, enemy) {
  for (let i = PINGS.length - 1; i >= 0; i--) if (PINGS[i].by === by) { scene.remove(PINGS[i].g); PINGS.splice(i, 1); } // 한 사람당 하나
  const g = new THREE.Group(), m = enemy ? PING_MAT.e : PING_MAT.y;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 6, 24), m); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6, 6, 1, true), m); beam.position.y = 3; g.add(beam);
  g.position.copy(pos); scene.add(g);
  PINGS.push({ pos: pos.clone(), t: enemy ? 6 : 10, by, enemy, g, name: by });
  AU.ping(enemy);
}
function playerPing() {
  const o = camera.position.clone(), d = camera.getWorldDirection(new V3());
  const hit = raycastWorld(o, d, 800);
  let dist = hit ? hit.t : 400, pos = o.clone().addScaledVector(d, dist), enemy = false;
  // 적을 보고 찍었는지 (조준선 근처 + 벽에 안 가려짐)
  let best = 0.035;
  for (const a of ACTORS) {
    if (a === PLAYER || a.dead || a.gone || (a.team !== undefined && a.team === PLAYER.team && G.mode === 'mp')) continue;
    const c = _pv.copy(a.pos); c.y += a.stance === 'prone' ? 0.3 : 1.1;
    const v = c.clone().sub(o), L = v.length(); if (L > dist + 1) continue;
    const ang = v.normalize().angleTo(d); if (ang < best + 0.6 / Math.max(L, 1)) { best = ang; pos = a.pos.clone(); enemy = true; }
  }
  if (!hit && !enemy) { pos.y = Math.max(0, pos.y); }
  placePing(pos, 'me', enemy);
  if (NET.active) netSend({ t: 'ping', p: pos.toArray().map(x => +x.toFixed(2)), e: enemy ? 1 : 0 });
}
const _pv = new V3();
let _pingLast = performance.now();
(function pingLoop() {
  const now = performance.now(), dt = Math.min(0.1, (now - _pingLast) / 1000); _pingLast = now;
  let h = '';
  const live = typeof isPlaying === 'function' && isPlaying();
  for (let i = PINGS.length - 1; i >= 0; i--) {
    const P = PINGS[i]; P.t -= dt;
    if (P.t <= 0 || !live) { scene.remove(P.g); PINGS.splice(i, 1); continue; }
    P.g.children[0].scale.setScalar(1 + 0.15 * Math.sin(now / 160));
    const v = _pv.copy(P.pos); v.y += 0.9; v.project(camera);
    let x = v.x, y = v.y, edge = false;
    if (v.z > 1) { x = -x; y = -y; edge = true; }                  // 뒤쪽이면 화면 가장자리로
    if (Math.abs(x) > 0.95 || Math.abs(y) > 0.92) { const k = Math.max(Math.abs(x) / 0.95, Math.abs(y) / 0.92); x /= k; y /= k; edge = true; }
    const m = Math.round(P.pos.distanceTo(camera.position));
    h += `<div class="pg ${P.enemy ? 'e' : ''} ${edge ? 'edge' : ''}" style="left:${((x + 1) / 2 * innerWidth) | 0}px;top:${((1 - y) / 2 * innerHeight) | 0}px"><i></i>${m}m${P.by !== 'me' ? `<small>${esc(P.name)}</small>` : ''}</div>`;
  }
  if (h !== pingBox._h) { pingBox.innerHTML = h; pingBox._h = h; }
  requestAnimationFrame(pingLoop);
})();
