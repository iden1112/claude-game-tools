// ================= 채팅 · 친구 귓속말 · 설정 탭 · 키 설정 =================
const CHAT = window.CHAT = { open: false, scope: 'all', log: [] };
(() => {
  const st = document.createElement('style');
  st.textContent = `
#chatbox{position:fixed;left:14px;bottom:150px;width:420px;max-width:60vw;z-index:8;font:600 13px system-ui,sans-serif;pointer-events:none}
#chatlog div{color:#eee;text-shadow:0 1px 2px #000,0 0 4px #000;padding:1px 0;transition:opacity .6s}
#chatlog div.old{opacity:0}
#chatbox.open #chatlog div.old{opacity:1}
#chatbox.open #chatlog{background:rgba(10,12,16,.55);border-radius:6px;padding:6px 8px;max-height:220px;overflow:auto}
#chatlog b.all{color:#ddd}#chatlog b.team{color:#5aa9ff}#chatlog b.dm{color:#d58cff}#chatlog b.sys{color:#ffd24a}
#chatlog span.me{color:#ffd24a}#chatlog span.tm{color:#8cc8ff}#chatlog span.en{color:#ff8a7a}
#chatin{display:none;margin-top:6px;pointer-events:auto;align-items:center;background:rgba(10,12,16,.85);border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:4px 6px}
#chatbox.open #chatin{display:flex}
#chatin b{padding:2px 8px;border-radius:4px;margin-right:6px;font-size:12px;cursor:pointer;white-space:nowrap}
#chatin b.all{background:#555;color:#fff}#chatin b.team{background:#2f6fb3;color:#fff}
#chatin input{flex:1;background:none;border:0;color:#fff;font:600 13px system-ui;outline:none}
#chatin small{color:#889;margin-left:6px;white-space:nowrap}
#friends.side{z-index:60!important;background:none;backdrop-filter:none!important;pointer-events:none;justify-content:flex-end;align-items:stretch;padding:0}
#friends.side .panel{pointer-events:auto;margin:0;height:100vh;max-height:100vh;border-radius:0;width:340px;max-width:340px;overflow:auto;box-sizing:border-box}
#pause .panel,#start .panel{max-height:92vh;overflow:auto}
#friends .dm{margin-top:10px;border-top:1px solid rgba(255,255,255,.12);padding-top:8px}
#friends .dmlog{max-height:200px;overflow:auto;font-size:13px;background:rgba(0,0,0,.25);border-radius:6px;padding:6px 8px;margin:6px 0}
#friends .dmlog div{padding:2px 0}#friends .dmlog .me{color:#ffd24a}#friends .dmlog .them{color:#d58cff}
#friends .fr .nm{cursor:pointer}
#friends .unread{display:inline-block;width:8px;height:8px;border-radius:50%;background:#d58cff;margin-left:4px}`;
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'chatbox';
  box.innerHTML = '<div id="chatlog"></div><div id="chatin"><b id="chat-scope" class="all">전체</b><input id="chat-input" maxlength="120" autocomplete="off"><small>Enter 보내기 · Shift+Enter 전체/팀 · Esc 닫기</small></div>';
  document.body.appendChild(box);
  const inp = $('chat-input');
  inp.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); chatScope(CHAT.scope === 'all' ? 'team' : 'all'); return; }
    if (e.key === 'Enter') { e.preventDefault(); const v = inp.value.trim(); if (v) chatSend(v); chatClose(); return; }
    if (e.key === 'Escape') { e.preventDefault(); chatClose(); }
  });
  inp.addEventListener('keyup', (e) => e.stopPropagation());
  $('chat-scope').onclick = () => chatScope(CHAT.scope === 'all' ? 'team' : 'all');
})();
function chatScope(s) { CHAT.scope = s; const b = $('chat-scope'); b.className = s; b.textContent = s === 'all' ? '전체' : '팀'; }
function chatOpen() {
  if (CHAT.open) return;
  CHAT.open = true; INPUT.keys = {}; INPUT.lmb = INPUT.rmb = false;
  if (G.mode !== 'mp' || isFFA()) chatScope('all');
  $('chatbox').classList.add('open'); const i = $('chat-input'); i.value = ''; setTimeout(() => i.focus(), 0);
}
function chatClose() { CHAT.open = false; $('chatbox').classList.remove('open'); $('chat-input').blur(); INPUT.keys = {}; }
function chatSend(text) {
  text = text.slice(0, 120);
  const scope = CHAT.scope;
  if (G.mode === 'mp' && NET.active) netSend({ t: 'chat', s: scope, x: text, n: NET.name });
  chatShow(scope, NET.name || PLAYER.name, text, 'me');
}
function chatShow(scope, name, text, who) {
  const el = $('chatlog'); if (!el) return;
  const d = document.createElement('div');
  const tag = { all: '전체', team: '팀', dm: '귓속말', sys: '알림' }[scope] || '전체';
  d.innerHTML = `<b class="${scope}">[${tag}]</b> <span class="${who}">${esc(name)}</span>: ${esc(text)}`;
  el.appendChild(d); while (el.children.length > 40) el.firstChild.remove();
  el.scrollTop = el.scrollHeight;
  setTimeout(() => d.classList.add('old'), 9000);
}
// 엔터로 채팅 열기 (게임 중)
addEventListener('keydown', (e) => {
  if (CHAT.open || window.KEYWAIT || e.repeat) return;
  if (mapKey(e.code) === 'Enter' && isPlaying() && INPUT.locked && !G.menuOpen) { e.preventDefault(); chatOpen(); }
});
(function chatLoop() {
  if (CHAT.open && !(isPlaying() && INPUT.locked)) chatClose();
  requestAnimationFrame(chatLoop);
})();

// ---- 친구 귓속말 (친구 서버로, 게임 밖에서도) ----
SOC.dms = {}; SOC.unread = new Set(); SOC.dmWith = null;
try { SOC.dms = JSON.parse(localStorage.getItem('tg1v1_dms') || '{}'); } catch (e) {}
setTimeout(() => { for (const f of SOC.data.friends) if (f.id && SOC.dms[f.nick] && !SOC.dms[f.id]) { SOC.dms[f.id] = SOC.dms[f.nick]; delete SOC.dms[f.nick]; } }, 3000);
const dmSave = () => { try { localStorage.setItem('tg1v1_dms', JSON.stringify(SOC.dms)); } catch (e) {} };
function dmPush(friend, me, text) { const a = SOC.dms[friend] || (SOC.dms[friend] = []); a.push({ me, x: text, ts: Date.now() }); if (a.length > 60) a.splice(0, a.length - 60); dmSave(); }
function dmSend(friend, text) { // friend = 친구 id
  text = String(text || '').trim().slice(0, 200); if (!text) return;
  socPub('dm/' + friend, { from: SOC.data.nick, id: SOC.data.id, x: text, ts: Date.now() });
  dmPush(friend, true, text); socUI();
}
// 친구 서버에서 받는 귓속말
const _socMsg0 = socMsg;
socMsg = function (t, m) {
  if (t.startsWith('dm/') && m && m.id && m.x && t === 'dm/' + SOC.data.id) {
    const f = m.id; if (!friendById(f)) return; // 친구만 받아요
    const k = f + m.ts; if (SOC.lastDm === k) return; SOC.lastDm = k;
    dmPush(f, false, m.x);
    if (SOC.dmWith !== f || $('friends').style.display === 'none') SOC.unread.add(f);
    if (isPlaying() && INPUT.locked) chatShow('dm', friendName(f), m.x, 'tm');
    else if (SOC.dmWith !== f || $('friends').style.display === 'none') socNote(`<b>${esc(friendName(f))}</b>: ${esc(m.x.slice(0, 60))}`, [['답장', () => { openFriends(); dmOpen(f); }]], 6);
    socUI(); return;
  }
  _socMsg0(t, m);
};
const _socSub0 = socSubscribe;
socSubscribe = function (c) { _socSub0(c); };
function dmOpen(f) { SOC.dmWith = f; SOC.unread.delete(f); socUI(); setTimeout(() => { const i = $('dm-input'); if (i) i.focus(); }, 30); }
const _socUI0 = socUI;
socUI = function () {
  _socUI0();
  const list = $('fr-list'); if (!list) return;
  // 친구 이름 옆에 안 읽은 표시, 이름을 누르면 귓속말 창
  list.querySelectorAll('.fr').forEach(row => {
    const n = row.querySelector('[data-n]') && row.querySelector('[data-n]').dataset.n; if (!n) return;
    const nm = row.querySelector('.nm'); nm.dataset.dm = n; nm.title = '눌러서 귓속말';
    if (SOC.unread.has(n) && !nm.querySelector('.unread')) nm.insertAdjacentHTML('beforeend', '<span class="unread"></span>');
    if (!row.querySelector('[data-act=dm]')) row.querySelector('[data-act=inv]').insertAdjacentHTML('beforebegin', `<button class="btn sub" data-act="dm" data-n="${esc(n)}">채팅</button>`);
  });
  let dm = $('fr-dm'); if (!dm) { dm = document.createElement('div'); dm.id = 'fr-dm'; dm.className = 'dm'; list.after(dm); }
  const f = SOC.dmWith;
  if (!f || !friendById(f)) { dm.innerHTML = ''; return; }
  const fn = friendName(f);
  const msgs = SOC.dms[f] || [];
  const keepVal = $('dm-input') ? $('dm-input').value : '';
  dm.innerHTML = `<b>${esc(fn)} 님과 채팅</b> <button class="btn sub" data-act="dmx" style="padding:2px 8px;font-size:11px">닫기</button>
    <div class="dmlog" id="dm-log">${msgs.length ? msgs.map(x => `<div class="${x.me ? 'me' : 'them'}">${x.me ? '나' : esc(fn)}: ${esc(x.x)}</div>`).join('') : '<div style="color:#889">아직 나눈 말이 없어요</div>'}</div>
    <div class="addrow"><input id="dm-input" maxlength="200" placeholder="메시지 (Enter로 보내기)" autocomplete="off"><button class="btn" data-act="dmsend">보내기</button></div>`;
  const i = $('dm-input'); i.value = keepVal;
  i.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { dmSend(f, i.value); i.value = ''; setTimeout(() => $('dm-input') && $('dm-input').focus(), 0); } });
  const lg = $('dm-log'); lg.scrollTop = lg.scrollHeight;
  const b = $('fr-badge'); if (b) { const n = SOC.reqIn.size + SOC.unread.size; b.textContent = n; b.style.display = n ? '' : 'none'; }
};
$('friends').addEventListener('click', (e) => {
  const t = e.target.closest('[data-act],[data-dm]'); if (!t) return;
  if (t.dataset.dm && !t.dataset.act) { dmOpen(t.dataset.dm); return; }
  if (t.dataset.act === 'dm') dmOpen(t.dataset.n);
  else if (t.dataset.act === 'dmx') { SOC.dmWith = null; socUI(); }
  else if (t.dataset.act === 'dmsend') { const i = $('dm-input'); dmSend(SOC.dmWith, i.value); i.value = ''; }
});

// ---- Esc (일시정지) 하면 발로란트처럼 오른쪽에 친구창 ----
new MutationObserver(() => {
  const paused = $('pause').style.display === 'flex', fr = $('friends');
  if (paused && fr.style.display === 'none' && !IN_FRAME) { fr.classList.add('side'); fr.style.display = 'flex'; socUI(); }
  else if (!paused && fr.classList.contains('side')) { fr.classList.remove('side'); fr.style.display = 'none'; }
}).observe($('pause'), { attributes: true, attributeFilter: ['style'] });
const _openFriends0 = openFriends;
openFriends = function () { $('friends').classList.remove('side'); _openFriends0(); };

// ---- 설정 탭 ----
$('settings').querySelector('.stabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]'); if (!b) return;
  $('settings').querySelectorAll('.stabs button').forEach(x => x.classList.toggle('on', x === b));
  $('settings').querySelectorAll('.spane').forEach(p => p.classList.toggle('on', p.dataset.pane === b.dataset.tab));
});

// ---- 키 설정 화면 ----
function drawKeybinds() {
  const k = SETTINGS.keys || {};
  let h = '';
  for (const [grp, acts] of KEY_ACTIONS) {
    h += `<div class="kh">${grp}</div>`;
    for (const [label, def] of acts) h += `<span>${label}</span><button class="kb" data-def="${def}">${keyLabel(k[def] || def)}</button>`;
  }
  h += '<span class="hint" style="grid-column:1/-1;color:#889;font-size:12px">버튼을 누르고 바꿀 키를 누르세요 (마우스 휠 클릭·옆 버튼도 돼요). Esc는 취소, Backspace는 키 없애기. 쏘기·조준(마우스 왼쪽·오른쪽)과 Esc는 바꿀 수 없어요.</span>';
  h += '<button class="btn sub small kreset" id="kb-reset" type="button">모두 기본값으로</button>';
  $('keybinds').innerHTML = h;
}
$('keybinds').addEventListener('click', (e) => {
  if (e.target.id === 'kb-reset') { SETTINGS.keys = {}; saveSettings(); rebuildKeys(); drawKeybinds(); return; }
  const b = e.target.closest('button.kb'); if (!b || window.KEYWAIT) return;
  b.classList.add('wait'); b.textContent = '키를 누르세요…';
  const def = b.dataset.def;
  const done = (code) => {
    window.KEYWAIT = null; removeEventListener('keydown', onKey, true); removeEventListener('mousedown', onMouse, true);
    if (code !== undefined) {
      const keys = SETTINGS.keys = SETTINGS.keys || {};
      if (code) for (const d of KEY_DEFAULTS) if (d !== def && (keys[d] || d) === code) keys[d] = (keys[def] || def); // 겹치면 서로 바꿔요
      keys[def] = code || '_none'; if (keys[def] === def) delete keys[def];
      for (const d in keys) if (keys[d] === d) delete keys[d];
      saveSettings(); rebuildKeys();
    }
    drawKeybinds();
  };
  const onKey = (ev) => { ev.preventDefault(); ev.stopPropagation(); if (ev.code === 'Escape') done(undefined); else if (ev.code === 'Backspace') done(''); else done(ev.code); };
  const onMouse = (ev) => { const c = { 1: 'MouseMid', 3: 'Mouse4', 4: 'Mouse5' }[ev.button]; if (c) { ev.preventDefault(); ev.stopPropagation(); done(c); } };
  window.KEYWAIT = def;
  setTimeout(() => { addEventListener('keydown', onKey, true); addEventListener('mousedown', onMouse, true); }, 0);
});
drawKeybinds();
