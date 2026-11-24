// ================= 친구 (닉네임 · 친구 추가 · 방 초대) =================
// 서버 없이 공개 MQTT 서버의 '남겨두기(retained)' 메시지로 닉네임·친구 요청을 저장해요.
// 닉네임 주인 = 이 기기에 저장된 비밀 번호(id). 같은 닉네임은 다른 기기가 못 써요.
const SOC = {
  P: 'tg1v1s/v1/', cl: null, ok: false, tried: 0,
  data: { id: '', nick: '', reg: false, friends: [] },
  reqIn: new Map(),     // 받은 친구 요청: nick → ts
  sent: new Set(),      // 보낸 요청
  online: new Map(),    // 친구 접속 상태: nick → { on, ts }
  waits: new Map(),     // 닉네임 확인 대기: topic → resolve
};
try { Object.assign(SOC.data, JSON.parse(localStorage.getItem('tg1v1_social') || '{}')); } catch (e) {}
if (!SOC.data.id) SOC.data.id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
const socSave = () => { try { localStorage.setItem('tg1v1_social', JSON.stringify(SOC.data)); } catch (e) {} };
socSave();
const nkey = (n) => encodeURIComponent(String(n).trim().toLowerCase());
// 서버 두 곳에 동시에 붙어서 같은 내용을 양쪽에 올려요 (한쪽이 막혀도 다른 쪽으로 만나요)
SOC.cls = [];
const socLive = () => SOC.cls.filter(c => c.ok);
const socPub = (topic, obj, retain = false) => { for (const c of socLive()) try { c.cl.publish(SOC.P + topic, obj === null ? '' : JSON.stringify(obj), { retain, qos: 1 }); } catch (e) {} };
const socSub = (topic) => { for (const c of socLive()) try { c.cl.subscribe(SOC.P + topic, { qos: 1 }); } catch (e) {} };
const socUnsub = (topic) => { for (const c of socLive()) try { c.cl.unsubscribe(SOC.P + topic); } catch (e) {} };

// ---- 접속 ----
function socConnect() {
  if (SOC.cls.length || typeof mqtt === 'undefined') return;
  const brokers = window.__socialBrokers || [{ name: 'EMQX', url: 'wss://broker.emqx.io:8084/mqtt' }, { name: 'HiveMQ', url: 'wss://broker.hivemq.com:8884/mqtt' }];
  SOC.tried = 1;
  for (const B of brokers) {
    const c = { name: B.name || B.url, ok: false, cl: null }; SOC.cls.push(c);
    const me = SOC.data.nick && SOC.data.reg ? nkey(SOC.data.nick) : null;
    const opts = { clientId: 'tgs' + SOC.data.id.slice(0, 10) + Math.random().toString(16).slice(2, 6), connectTimeout: 8000, reconnectPeriod: 5000, keepalive: 30, clean: true, username: B.username, password: B.password };
    if (me) opts.will = { topic: SOC.P + 'on/' + me, payload: JSON.stringify({ on: 0, ts: Date.now() }), retain: true, qos: 1 };
    c.cl = (window.__socialMqtt || mqtt).connect(B.url, opts);
    c.cl.on('connect', () => { c.ok = true; SOC.ok = true; socSubscribe(c); socUI(); });
    c.cl.on('close', () => { c.ok = false; SOC.ok = socLive().length > 0; socUI(); });
    c.cl.on('message', (topic, payload) => socMsg(topic.slice(SOC.P.length), payload && payload.length ? (() => { try { return JSON.parse(payload.toString()); } catch (e) { return null; } })() : null));
    c.cl.on('error', () => {});
  }
  setTimeout(() => { SOC.tried = 4; socUI(); }, 9000);
}
function socReconnect() { for (const c of SOC.cls) try { c.cl.end(true); } catch (e) {} SOC.cls = []; SOC.ok = false; socConnect(); }
function socSubscribe(c) {
  if (!SOC.data.nick || !SOC.data.reg) return;
  const me = nkey(SOC.data.nick), list = [c] ;
  for (const x of list) {
    try {
      x.cl.subscribe([SOC.P + 'req/' + me + '/+', SOC.P + 'acc/' + me + '/+', SOC.P + 'inv/' + me].concat(SOC.data.friends.map(f => SOC.P + 'on/' + nkey(f))), { qos: 1 });
      x.cl.publish(SOC.P + 'on/' + me, JSON.stringify({ on: 1, ts: Date.now(), nick: SOC.data.nick }), { retain: true, qos: 1 });
      x.cl.publish(SOC.P + 'nick/' + me, JSON.stringify({ id: SOC.data.id, nick: SOC.data.nick, ts: Date.now() }), { retain: true, qos: 1 }); // 닉네임 기록도 양쪽 서버에 늘 다시 올려요
    } catch (e) {}
  }
}
setInterval(() => { if (SOC.ok && SOC.data.reg) socPub('on/' + nkey(SOC.data.nick), { on: 1, ts: Date.now(), nick: SOC.data.nick }, true); }, 60000);
window.addEventListener('beforeunload', () => { if (SOC.ok && SOC.data.reg) socPub('on/' + nkey(SOC.data.nick), { on: 0, ts: Date.now() }, true); });

// ---- 받은 메시지 ----
function socMsg(t, m) {
  const parts = t.split('/'), kind = parts[0];
  if (SOC.waits.has(t) && m) { SOC.waits.get(t)(m); SOC.waits.delete(t); }
  if (!SOC.data.nick) return;
  const me = nkey(SOC.data.nick);
  if (kind === 'req' && parts[1] === me) { // 친구 요청이 왔어요
    if (!m || !m.from) { SOC.reqIn.delete(decodeURIComponent(parts[2])); socUI(); return; }
    if (SOC.data.friends.some(f => nkey(f) === nkey(m.from))) { socPub(t, null, true); return; } // 이미 친구
    if (!SOC.reqIn.has(m.from)) socNote(`<b>${esc(m.from)}</b> 님이 친구 요청을 보냈어요`, [['보기', () => openFriends()]]);
    SOC.reqIn.set(m.from, m.ts || Date.now()); socUI();
  } else if (kind === 'acc' && parts[1] === me && m && m.from) { // 내 요청을 받아줬어요
    socPub(t, null, true); SOC.sent.delete(nkey(m.from));
    if (SOC.data.friends.some(f => nkey(f) === nkey(m.from))) { socUI(); return; }
    if (!SOC.data.friends.some(f => nkey(f) === nkey(m.from))) { SOC.data.friends.push(m.from); socSave(); socSub('on/' + nkey(m.from)); socNote(`<b>${esc(m.from)}</b> 님과 친구가 됐어요!`, [['방으로 초대', () => socInvite(m.from)]]); }
    socUI();
  } else if (kind === 'on') {
    const f = SOC.data.friends.find(x => nkey(x) === parts[1]);
    if (f) { SOC.online.set(f, { on: !!(m && m.on && Date.now() - (m.ts || 0) < 150000), ts: m ? m.ts : 0 }); socUI(); }
  } else if (kind === 'inv' && m && m.from && m.code) { // 방 초대
    if (Date.now() - (m.ts || 0) > 120000) return;
    const ik = m.from + m.code; if (SOC.lastInv === ik && Date.now() - (SOC.lastInvT || 0) < 15000) return; SOC.lastInv = ik; SOC.lastInvT = Date.now();
    socNote(`<b>${esc(m.from)}</b> 님이 방으로 초대했어요`, [['들어가기', () => socJoinInvite(m.code)], ['나중에', null]], 30);
    AU.beep && AU.beep(880, 0.12, 0.25);
  }
}
// 남겨진(retained) 메시지 하나 읽기: 있으면 그 값, 없으면 null
function socPeek(topic, ms = 3500) {
  return new Promise((res) => {
    if (!SOC.ok) { res(undefined); return; }
    let done = false; const fin = (v) => { if (done) return; done = true; socUnsub(topic); res(v); };
    SOC.waits.set(topic, (m) => fin(m));
    socSub(topic);
    setTimeout(() => { SOC.waits.delete(topic); fin(null); }, ms);
  });
}

// ---- 닉네임 정하기 ----
async function socClaimNick(nick) {
  nick = String(nick || '').trim().slice(0, 12);
  if (nick.length < 2) return '두 글자 이상으로 정해 주세요';
  if (/[\/#+]/.test(nick)) return '/ # + 는 쓸 수 없어요';
  if (!SOC.ok) { // 서버에 못 붙으면 일단 이 기기에서만 써요 (나중에 다시 등록)
    SOC.data.nick = nick; SOC.data.reg = false; socSave(); applyNick(nick); return '';
  }
  const cur = await socPeek('nick/' + nkey(nick));
  if (cur && cur.id && cur.id !== SOC.data.id) return '이미 누가 쓰는 닉네임이에요';
  const old = SOC.data.nick && SOC.data.reg && nkey(SOC.data.nick) !== nkey(nick) ? SOC.data.nick : null;
  socPub('nick/' + nkey(nick), { id: SOC.data.id, nick, ts: Date.now() }, true);
  if (old) { socPub('nick/' + nkey(old), null, true); socPub('on/' + nkey(old), null, true); }
  SOC.data.nick = nick; SOC.data.reg = true; socSave(); applyNick(nick);
  socReconnect(); // 새 이름으로 다시 접속 (접속 끊김 알림 설정)
  return '';
}
function applyNick(n) {
  SETTINGS.nick = n; saveSettings(); NET.name = n; PLAYER.name = n;
  for (const id of ['start-nick', 'mp-name']) if ($(id)) $(id).value = n;
}
// 서버에 못 붙었을 때 정한 닉네임은 다음 접속 때 등록
setInterval(() => { if (SOC.ok && SOC.data.nick && !SOC.data.reg && !SOC.claiming) { SOC.claiming = true; socClaimNick(SOC.data.nick).then((e) => { SOC.claiming = false; if (e) { SOC.data.nick = ''; socSave(); openNick(e); } }); } }, 4000);

// ---- 친구 요청 / 수락 / 초대 ----
async function socAddFriend(name) {
  name = String(name || '').trim();
  if (!name) return '친구 닉네임을 입력하세요';
  if (!SOC.data.reg) return '먼저 내 닉네임을 등록해야 해요 (서버 연결 중)';
  if (nkey(name) === nkey(SOC.data.nick)) return '나 자신은 친구로 추가할 수 없어요';
  if (SOC.data.friends.some(f => nkey(f) === nkey(name))) return '이미 친구예요';
  if (SOC.reqIn.has(name)) { socAccept(name); return ''; }
  const who = await socPeek('nick/' + nkey(name));
  if (who === undefined) return '서버에 연결되지 않았어요';
  socPub('req/' + nkey(name) + '/' + nkey(SOC.data.nick), { from: SOC.data.nick, ts: Date.now() }, true); // 못 찾아도 요청은 남겨 둬요
  SOC.sent.add(nkey(name)); socUI();
  return who ? 'ok:' + who.nick + ' 님에게 친구 요청을 보냈어요. 친구가 받으면 목록에 나와요'
    : 'ok:아직 "' + name + '" 닉네임을 서버에서 못 찾았어요. 그래도 요청은 남겨 뒀어요 — 친구가 새 버전을 열고 이 닉네임을 정하면 요청을 받아요 (글자가 똑같은지도 확인해 주세요)';
}
function socAccept(name) {
  socPub('acc/' + nkey(name) + '/' + nkey(SOC.data.nick), { from: SOC.data.nick, ts: Date.now() }, true);
  socPub('req/' + nkey(SOC.data.nick) + '/' + nkey(name), null, true);
  SOC.reqIn.delete(name);
  if (!SOC.data.friends.some(f => nkey(f) === nkey(name))) { SOC.data.friends.push(name); socSave(); socSub('on/' + nkey(name)); }
  socUI();
}
function socDecline(name) { socPub('req/' + nkey(SOC.data.nick) + '/' + nkey(name), null, true); SOC.reqIn.delete(name); socUI(); }
function socRemove(name) { SOC.data.friends = SOC.data.friends.filter(f => f !== name); socSave(); socUnsub('on/' + nkey(name)); socUI(); }
// 초대: 내가 만든 방이 없으면 먼저 방을 만들어요
function socInvite(name) {
  const send = () => { socPub('inv/' + nkey(name), { from: SOC.data.nick, code: NET.code, ts: Date.now() }); socNote(`<b>${esc(name)}</b> 님에게 초대를 보냈어요. 대기실에서 기다려요`, [], 4); };
  if (NET.host && NET.code && NET.mode !== 'local' && NET.connected) { send(); return; }
  closeFriends(); $('start').style.display = 'none'; $('end').style.display = 'none'; $('mp').style.display = 'flex';
  netHost('p2p');
  let n = 0; const t = setInterval(() => { n++; if (NET.host && NET.code && NET.connected && NET.code !== '-----') { clearInterval(t); send(); } else if (n > 40) { clearInterval(t); socNote('방을 만들지 못해서 초대를 못 보냈어요', [], 4); } }, 250);
}
function socJoinInvite(code) {
  if (NET.active && G.mode === 'mp') { if (!confirm('지금 게임을 나가고 친구 방으로 갈까요?')) return; goMenu(); }
  else if (isPlaying && isPlaying()) goMenu();
  closeFriends(); $('start').style.display = 'none'; $('end').style.display = 'none'; $('pause').style.display = 'none'; $('mp').style.display = 'flex';
  $('mp-input').value = code; netJoin(code);
}

// ---- 화면 ----
(() => {
  const st = document.createElement('style');
  st.textContent = `
#friends .panel{max-width:520px}
#friends .fr{display:flex;align-items:center;gap:8px;padding:7px 4px;border-top:1px solid rgba(255,255,255,.08)}
#friends .fr .nm{flex:1;font-weight:700}
#friends .dot{width:9px;height:9px;border-radius:50%;background:#666;flex:none}
#friends .dot.on{background:#4ade80;box-shadow:0 0 6px #4ade80}
#friends .fr small{color:#9aa;font-weight:500}
#friends h4{margin:16px 0 6px;color:#ffd24a;font-size:14px}
#friends .addrow{display:flex;gap:8px}
#friends .addrow input{flex:1}
#friends .msg{min-height:18px;margin-top:6px;font-size:13px}
#friends .msg.bad{color:#ff8a7a}#friends .msg.ok{color:#8be28b}
#friends .srv{font-size:12px;color:#9aa}
#socnotes{position:fixed;top:14px;right:14px;z-index:60;display:flex;flex-direction:column;gap:8px;pointer-events:none}
#socnotes .sn{pointer-events:auto;background:rgba(16,18,22,.95);border:1px solid rgba(255,210,74,.5);border-radius:10px;padding:10px 12px;color:#eee;font:600 13px system-ui,sans-serif;max-width:300px;box-shadow:0 6px 20px rgba(0,0,0,.45)}
#socnotes .sn .bt{margin-top:8px;display:flex;gap:6px}
#socnotes .sn button{font:700 12px system-ui;padding:5px 10px;border-radius:6px;border:0;background:#ffd24a;color:#111;cursor:pointer}
#socnotes .sn button.sub{background:#3a3f47;color:#ddd}
.fbadge{display:inline-block;min-width:16px;padding:0 5px;margin-left:4px;border-radius:9px;background:#ff5a4a;color:#fff;font-size:11px;line-height:16px}
#nickmodal .panel{max-width:400px}`;
  document.head.appendChild(st);
  const notes = document.createElement('div'); notes.id = 'socnotes'; document.body.appendChild(notes);
  const fr = document.createElement('div'); fr.id = 'friends'; fr.className = 'overlay'; fr.style.display = 'none'; fr.style.zIndex = '40';
  fr.innerHTML = `<div class="panel"><h2>친구</h2><div class="srv" id="fr-srv"></div>
    <div style="margin-top:8px">내 닉네임: <b id="fr-me"></b> <button class="btn sub" id="fr-nick" style="padding:3px 10px;font-size:12px">바꾸기</button></div>
    <h4>친구 추가</h4><div class="addrow"><input id="fr-input" maxlength="12" placeholder="친구 닉네임" autocomplete="off"><button class="btn" id="fr-add">친구 요청</button></div><div class="msg" id="fr-msg"></div>
    <div id="fr-req"></div><h4>친구 목록</h4><div id="fr-list"></div>
    <div class="row" style="margin-top:16px"><button class="btn sub" id="fr-close">닫기</button></div></div>`;
  document.body.appendChild(fr);
  const nm = document.createElement('div'); nm.id = 'nickmodal'; nm.className = 'overlay'; nm.style.display = 'none'; nm.style.zIndex = '45';
  nm.innerHTML = `<div class="panel"><h2>닉네임 정하기</h2><p class="hint">친구가 이 닉네임으로 나를 찾아요. 다른 사람이 쓰는 닉네임은 못 써요.</p>
    <input id="nick-input" maxlength="12" placeholder="2~12글자" autocomplete="off" style="width:100%;box-sizing:border-box;margin-top:8px"><div class="msg" id="nick-msg" style="min-height:18px;margin-top:6px;color:#ff8a7a"></div>
    <div class="row" style="margin-top:10px"><button class="btn" id="nick-ok">정하기</button><button class="btn sub" id="nick-cancel">나중에</button></div></div>`;
  document.body.appendChild(nm);
  for (const id of ['fr-input', 'nick-input']) $(id).addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $(id === 'fr-input' ? 'fr-add' : 'nick-ok').click(); });
  $('fr-close').onclick = closeFriends;
  $('fr-nick').onclick = () => openNick();
  $('fr-add').onclick = async () => {
    const v = $('fr-input').value; $('fr-msg').className = 'msg'; $('fr-msg').textContent = '찾는 중…';
    const r = await socAddFriend(v);
    if (r.startsWith('ok:')) { $('fr-msg').className = 'msg ok'; $('fr-msg').textContent = r.slice(3); $('fr-input').value = ''; }
    else if (r) { $('fr-msg').className = 'msg bad'; $('fr-msg').textContent = r; } else $('fr-msg').textContent = '';
  };
  $('nick-ok').onclick = async () => {
    $('nick-msg').textContent = '확인하는 중… (3초쯤 걸려요)';
    const e = await socClaimNick($('nick-input').value);
    if (e) { $('nick-msg').textContent = e; return; }
    nm.style.display = 'none'; socUI();
  };
  $('nick-cancel').onclick = () => { nm.style.display = 'none'; };
  fr.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || !b.dataset.act) return;
    const n = b.dataset.n;
    if (b.dataset.act === 'acc') socAccept(n); else if (b.dataset.act === 'dec') socDecline(n);
    else if (b.dataset.act === 'inv') socInvite(n);
    else if (b.dataset.act === 'del') { if (confirm(`${n} 님을 친구에서 뺄까요?`)) socRemove(n); }
  });
  // 처음 화면·대기실에 '친구' 버튼
  const sb = document.createElement('button'); sb.className = 'btn'; sb.id = 'btn-friends'; sb.innerHTML = '친구<span class="fbadge" id="fr-badge" style="display:none"></span>'; sb.onclick = () => openFriends();
  $('btn-mp').after(sb);
  const lb = document.createElement('button'); lb.className = 'btn sub'; lb.id = 'mp-friends'; lb.textContent = '친구 초대'; lb.onclick = () => openFriends();
  $('mp-status').before(lb);
  // 닉네임 칸은 눌러서 바꾸기 (아무렇게나 바뀌지 않게)
  for (const id of ['start-nick', 'mp-name']) { const el = $(id); el.readOnly = true; el.style.cursor = 'pointer'; el.addEventListener('click', () => openNick()); }
})();
function openFriends() { $('friends').style.display = 'flex'; $('fr-msg').textContent = ''; if (!SOC.data.reg) socConnect(); socUI(); setTimeout(() => $('fr-input').focus(), 50); }
function closeFriends() { $('friends').style.display = 'none'; }
function openNick(err) { $('nickmodal').style.display = 'flex'; $('nick-input').value = SOC.data.nick || SETTINGS.nick || ''; $('nick-msg').textContent = err || ''; setTimeout(() => $('nick-input').focus(), 50); }
function socNote(html, btns = [], sec = 8) {
  const d = document.createElement('div'); d.className = 'sn'; d.innerHTML = html;
  if (btns.length) { const bt = document.createElement('div'); bt.className = 'bt'; for (const [label, fn] of btns) { const b = document.createElement('button'); b.textContent = label; if (!fn) b.className = 'sub'; b.onclick = () => { d.remove(); if (fn) fn(); }; bt.appendChild(b); } d.appendChild(bt); }
  $('socnotes').appendChild(d); setTimeout(() => d.remove(), sec * 1000);
}
function socUI() {
  if (!$('fr-me')) return;
  $('fr-me').textContent = SOC.data.nick || '(아직 없음)';
  const sv = SOC.cls.map(c => `${c.name} ${c.ok ? '✓' : '✗'}`).join(' · ');
  $('fr-srv').textContent = SOC.ok ? `친구 서버 연결됨 (${sv}) · ${SOC.data.reg ? '내 닉네임 등록됨' : '내 닉네임 등록 중…'}` : SOC.tried >= 4 ? `친구 서버에 연결하지 못했어요 (${sv}). 학교·회사 와이파이나 VPN에서 막혔을 수 있어요` : '친구 서버에 연결하는 중…';
  let h = '';
  if (SOC.reqIn.size) { h += '<h4>받은 친구 요청</h4>'; for (const [n] of SOC.reqIn) h += `<div class="fr"><span class="nm">${esc(n)}</span><button class="btn" data-act="acc" data-n="${esc(n)}">받기</button><button class="btn sub" data-act="dec" data-n="${esc(n)}">거절</button></div>`; }
  $('fr-req').innerHTML = h;
  const list = SOC.data.friends.slice().sort((a, b) => ((SOC.online.get(b) || {}).on ? 1 : 0) - ((SOC.online.get(a) || {}).on ? 1 : 0));
  $('fr-list').innerHTML = list.length ? list.map(n => { const on = (SOC.online.get(n) || {}).on; return `<div class="fr"><span class="dot ${on ? 'on' : ''}"></span><span class="nm">${esc(n)} <small>${on ? '접속 중' : '오프라인'}</small></span><button class="btn" data-act="inv" data-n="${esc(n)}">방으로 초대</button><button class="btn sub" data-act="del" data-n="${esc(n)}">삭제</button></div>`; }).join('')
    : '<div class="hint">아직 친구가 없어요. 위에 친구 닉네임을 넣고 친구 요청을 보내 보세요.</div>';
  const b = $('fr-badge'); if (b) { b.textContent = SOC.reqIn.size; b.style.display = SOC.reqIn.size ? '' : 'none'; }
}
// 시작: 서버 연결, 처음이면 닉네임 정하기 창
setTimeout(() => {
  if (IN_FRAME) return; // 채팅 화면 안에서는 친구 기능이 막혀 있어요
  socConnect();
  if (!SOC.data.nick && SETTINGS.nick && SETTINGS.nick.length >= 2) SOC.data.nick = SETTINGS.nick; // 전에 쓰던 닉네임은 그대로 (자동 등록)
  if (!SOC.data.nick) { const t = setInterval(() => { if (SOC.ok || SOC.tried >= 4) { clearInterval(t); if (!SOC.data.nick) openNick(); } }, 300); }
  else applyNick(SOC.data.nick);
  socUI();
}, 600);
