// ================= 라운드 끝: 상대에게 넣은 딜 =================
function recordDealt(name, d) {
  if (!G.dealt) G.dealt = new Map();
  const e = G.dealt.get(name) || { d: 0, hits: 0 }; e.d += d; e.hits++; G.dealt.set(name, e);
}
// 게임이 끝나거나 메뉴로 갈 때 눌린 키·움직임을 모두 멈춰요 (한 방향으로 계속 걸어가는 문제)
function stopPlayerInput() {
  INPUT.keys = {}; INPUT.lmb = INPUT.rmb = false; INPUT.mdx = INPUT.mdy = 0;
  const p = typeof PLAYER !== 'undefined' && PLAYER; if (!p) return;
  p.wish.set(0, 0, 0); p.vel.x = 0; p.vel.z = 0; p.trigger = false; p.sprint = false; p.jumpReq = false; p.jumpBuf = 0;
}
(() => {
  const st = document.createElement('style');
  st.textContent = `#dealt{position:fixed;right:18px;top:38%;transform:translateY(-50%);z-index:7;min-width:200px;padding:12px 14px;border-radius:10px;
  background:rgba(12,14,18,.78);border:1px solid rgba(255,255,255,.12);color:#eee;font:600 13px system-ui,sans-serif;display:none;pointer-events:none}
#dealt h4{margin:0 0 8px;font-size:13px;color:#ffd24a;letter-spacing:.5px}
#dealt .r{display:flex;align-items:baseline;gap:8px;padding:3px 0;border-top:1px solid rgba(255,255,255,.07)}
#dealt .r span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}
#dealt .r b{font-size:18px;color:#fff}
#dealt .r small{color:#9aa;font-weight:500}
#dealt .t{margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.2);display:flex;justify-content:space-between}
#dealt .t b{color:#ffd24a;font-size:18px}`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'dealt'; document.body.appendChild(el);
  HUD.showDealt = (on) => {
    if (!on) { el.style.display = 'none'; return; }
    const rows = [...(G.dealt || new Map())].sort((a, b) => b[1].d - a[1].d);
    let tot = 0, h = '<h4>이번 라운드 넣은 딜</h4>';
    if (!rows.length) h += '<div class="r"><span>맞힌 적 없음</span><b>0</b></div>';
    for (const [n, e] of rows) { tot += e.d; h += `<div class="r"><span>${esc(n)}</span><b>${Math.round(e.d)}</b><small>${e.hits}회 맞힘</small></div>`; }
    if (rows.length > 1) h += `<div class="t"><span>합계</span><b>${Math.round(tot)}</b></div>`;
    el.innerHTML = h; el.style.display = 'block';
  };
})();
