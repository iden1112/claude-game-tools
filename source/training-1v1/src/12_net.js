// ================= 친구와 대전 (온라인 1v1 · 2v2 · 3v3) =================
// 방장 컴퓨터가 가운데에서 모두를 이어줘요 (PeerJS · WebRTC).
// 같은 컴퓨터 시험용: 코드가 L로 시작하면 브라우저 탭끼리 연결 (BroadcastChannel).
const NET = {
  active: false, host: false, id: '', code: '', peer: null, conn: null, conns: {}, bc: null, connected: false,
  lastRecv: 0, sendT: 0, myLoadoutKey: '', loKeep: 0,
  lobby: { size: 1, players: [] }, name: '', bots: {}, botN: 0, seen: {}, bus: null, mode: 'p2p',
};
const NET_VER = 18; // 게임 파일 버전 (다르면 같이 못 해요)
let REMOTES = {}; // id → Actor
const TEAM_NAME = ['블루', '레드'], TEAM_COLOR = ['#5aa9ff', '#ff6a5a'];
// 개인전 (1v1v1v1): 최대 4명, 한 사람이 한 팀(팀 번호 0~3). 2명 이상이면 시작할 수 있어요
const isFFA = () => !!(NET.lobby && NET.lobby.ffa);
function ffaMaps() { return MAP_LIST.ffa.concat(MAP_LIST[4]); } // 개인전 전용 맵 + 4대4 맵
function ffaTeams(L) { L.players.forEach((p, i) => { p.team = i; }); }
function teamLabel(t) { if (isFFA()) { const p = NET.lobby.players.find(x => x.team === t); return p ? (p.id === NET.id ? '나' : p.name) : '?'; } return TEAM_NAME[t] + ' 팀'; }
const STANCE_CODE = { stand: 0, crouch: 1, prone: 2 }, STANCE_NAME = ['stand', 'crouch', 'prone'];
try { NET.name = SETTINGS.nick || localStorage.getItem('tg1v1_name') || ''; } catch (e) {}
if (!NET.name) NET.name = '플레이어' + ((Math.random() * 90 + 10) | 0);

function netStatus(t, cls = '') { $('mp-status').innerHTML = `<span class="${cls}">${t}</span>`; }
// 방 코드에는 L·R 을 안 써요 (L…: 같은 컴퓨터 시험용, R…: 학교 와이파이용)
function makeCode() { const A = 'ABCDEFGHJKMNPQSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[(Math.random() * A.length) | 0]; return s; }
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 연결 설정: 공유기를 넘어 연결되도록 STUN + 중계(TURN) 서버를 씀
// 내 중계 서버 키 (Metered 대시보드의 ICE Servers Array 를 붙여 넣은 것)
function parseTurnKey(text) {
  if (!text || !text.trim()) return [];
  const user = (text.match(/username["']?\s*:\s*["']([^"']+)["']/) || [])[1];
  const cred = (text.match(/credential["']?\s*:\s*["']([^"']+)["']/) || [])[1];
  const urls = [...text.matchAll(/["']((?:turns?|stun):[^"'\s]+)["']/g)].map(m => m[1]);
  const turn = urls.filter(u => u.startsWith('turn')), stun = urls.filter(u => u.startsWith('stun'));
  const out = [];
  if (stun.length) out.push({ urls: stun });
  if (turn.length && user && cred && !/^<.*>$/.test(cred)) out.push({ urls: turn, username: user, credential: cred });
  return out;
}
// 직접 넣은 키가 없으면 게임 파일에 들어 있는 기본 키를 써요
function myTurnServers() { let s = []; try { s = parseTurnKey(localStorage.getItem('tg1v1_turn') || ''); } catch (e) {} return s.length ? s : (window.__builtinTurn || []); }
function peerOpts() {
  return Object.assign({
    debug: 1,
    config: {
      iceServers: [
        ...myTurnServers(),
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
        { urls: 'stun:stun.cloudflare.com:3478' },
        // PeerJS 기본 중계 서버 (학교·회사 와이파이처럼 직접 연결이 막힌 곳에서 필요)
        { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
      ],
    },
  }, window.__peerOpts || {});
}
// 채팅 화면 안(claude.ai)에서 열었는지
const IN_FRAME = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
function onlineBlocked() {
  if (IN_FRAME) { netStatus('⚠ 지금은 채팅 화면 안에서 게임을 열었어요. 여기서는 친구 연결이 막혀 있어요. <b>게임 파일(index.html)을 내려받아 크롬에서 열어</b> 주세요. 친구도 똑같이 파일로 열어야 해요.', 'bad'); return true; }
  if (typeof Peer === 'undefined') { netStatus('연결 도구를 불러오지 못했어요', 'bad'); return true; }
  return false;
}

// ---------- 보내기 / 전달 ----------
// 두 가지 방식:
//  1) 직접 연결 (PeerJS): 방장 컴퓨터가 가운데에서 이어줌
//  2) 공용 통로 (bus): 모두가 같은 통로에 메시지를 올리고 각자 자기 것만 읽음
//     - 같은 컴퓨터 탭끼리 (코드 L…)  - 학교 와이파이용 중계 서버 (코드 R…, MQTT 웹소켓)
const RELAY_BROKERS = [
  { url: 'wss://broker.emqx.io:8084/mqtt' },
  { url: 'wss://broker.hivemq.com:8884/mqtt' },
  { url: 'wss://public.cloud.shiftr.io', username: 'public', password: 'public' },
  { url: 'wss://test.mosquitto.org:8081/mqtt' },
];
const relayList = () => window.__relayBrokers || RELAY_BROKERS;
function rawSend(to, msg) {
  try {
    if (NET.bus) { NET.bus.post(msg); return; }
    if (NET.host) {
      if (to === '*') { for (const id in NET.conns) if (id !== msg.from && NET.conns[id].open) NET.conns[id].send(msg); }
      else if (NET.conns[to] && NET.conns[to].open) NET.conns[to].send(msg);
    } else if (NET.conn && NET.conn.open) NET.conn.send(msg);
  } catch (e) {}
}
// 논리적으로 보내기: to = '*' (모두) 또는 사람 id
// 꼭 전달돼야 하는 메시지(맞힘·죽음·라운드 등)는 번호를 붙여 3번 보내고, 받는 쪽은 같은 번호를 한 번만 처리해요
// (학교 와이파이용 중계 서버는 메시지가 가끔 사라질 수 있어서 '죽였는데 상대 화면에선 안 죽는' 일이 생겼어요)
const NET_IMPORTANT = new Set(['chat', 'hit', 'died', 'round', 'go', 'over', 'dealt', 'nade', 'boom', 'tolobby', 'mark']);
NET.seq = 0; NET.dupe = new Set();
function netPost(msg) {
  const to = msg.to;
  if (NET.bus) { NET.bus.post(msg); return; }
  if (NET.host) { if (to !== 'h') rawSend(to, msg); }
  else rawSend('h', msg);
}
function netSend(msg, to = '*', from = NET.id) {
  if (!NET.connected && !NET.host) return;
  msg.from = from; msg.to = to;
  if (NET_IMPORTANT.has(msg.t)) { msg.k = ++NET.seq; setTimeout(() => netPost(msg), 90); setTimeout(() => netPost(msg), 260); }
  netPost(msg);
}
// 직접 연결에서 방장이 받은 메시지: 필요하면 다른 사람에게 전달
function hostRoute(m) {
  if (m.to === '*') { rawSend('*', m); netRecv(m); }
  else if (m.to === 'h' || NET.bots[m.to]) netRecv(m); // AI 에게 온 것은 방장이 처리
  else rawSend(m.to, m);
}
// 공용 통로에서 받은 메시지
function busRecv(m) {
  if (!m || !m.t || m.from === NET.id) return;
  NET.lastRecv = performance.now();
  if (NET.host) {
    NET.seen[m.from] = performance.now();
    if (m.t === 'hello') { hostRecv(m); return; }
    if (m.to === '*' || m.to === 'h' || NET.bots[m.to]) netRecv(m);
  } else if (m.to === '*' || m.to === NET.id) netRecv(m);
}
function busLocal(code) {
  const bc = new BroadcastChannel('tg1v1-' + code);
  bc.onmessage = (e) => { if (e.data && e.data.code === code) busRecv(e.data.msg); };
  return { post: (msg) => bc.postMessage({ code, msg }), close: () => bc.close() };
}
// 중계 서버 접속 (성공하면 bus 를 돌려줌)
function busRelay(code, idx, onOpen, onFail) {
  if (typeof mqtt === 'undefined') { onFail('도구 없음'); return null; }
  const B = relayList()[idx]; if (!B) { onFail('서버 없음'); return null; }
  const topic = 'tg1v1/v' + NET_VER + '/' + code;
  let opened = false;
  const cl = mqtt.connect(B.url, { username: B.username, password: B.password, clientId: 'tg' + Math.random().toString(16).slice(2, 10), connectTimeout: 7000, reconnectPeriod: 2000, keepalive: 20, clean: true });
  const bus = { post: (msg) => { try { cl.publish(topic, JSON.stringify(msg), { qos: 0 }); } catch (e) {} }, close: () => { try { cl.end(true); } catch (e) {} }, client: cl };
  const timer = setTimeout(() => { if (!opened) { bus.close(); onFail('시간 초과'); } }, 8000);
  cl.on('connect', () => {
    cl.subscribe(topic, { qos: 0 }, (err) => {
      if (err) { clearTimeout(timer); bus.close(); onFail('구독 실패'); return; }
      if (!opened) { opened = true; clearTimeout(timer); onOpen(bus); }
    });
  });
  cl.on('message', (t, payload) => { try { busRecv(JSON.parse(payload.toString())); } catch (e) {} });
  cl.on('error', () => {});
  return bus;
}

function netReset() {
  try { for (const id in NET.conns) NET.conns[id].close(); } catch (e) {}
  try { if (NET.conn) NET.conn.close(); } catch (e) {}
  try { if (NET.peer) NET.peer.destroy(); } catch (e) {}
  try { if (NET.bus) NET.bus.close(); } catch (e) {}
  try { if (NET.pendingBus) NET.pendingBus.close(); } catch (e) {}
  clearInterval(NET.helloTimer);
  Object.assign(NET, { failed: false, active: false, host: false, id: '', conn: null, conns: {}, peer: null, bus: null, pendingBus: null, connected: false, code: '', lastRecv: 0, seen: {} });
  for (const id in REMOTES) removeRemote(id);
  for (const id in NET.bots) removeBot(id);
  NET.lobby = { size: 1, players: [] };
}

// ---------- 방 만들기 ----------
// mode: 'p2p' (직접 연결) | 'relay' (학교 와이파이용) | 'local' (같은 컴퓨터 시험)
function netHost(mode) {
  if (mode === true) mode = 'local'; if (!mode) mode = 'p2p';
  AU.init(); netReset(); saveName();
  NET.host = true; NET.id = 'h'; NET.mode = mode;
  const startLobby = (code) => {
    NET.code = code; NET.connected = true;
    NET.lobby = { size: NET.lobby.size || 1, players: [{ id: 'h', name: NET.name, team: 0 }] };
    $('mp-code').textContent = code; renderLobby();
  };
  if (mode === 'local') {
    const code = 'L' + makeCode(); NET.bus = busLocal(code); startLobby(code);
    netStatus('친구를 기다리는 중… (같은 컴퓨터의 다른 탭에서 코드 입력)', 'ok');
    return;
  }
  if (onlineBlocked()) { $('mp-code').textContent = '-----'; return; }
  if (mode === 'relay') {
    // 접속되는 중계 서버를 차례로 찾아요. 코드 두 번째 글자 = 서버 번호
    const tryIdx = (i) => {
      if (i >= relayList().length) { netStatus('중계 서버에 하나도 접속하지 못했어요. 학교에서 막혀 있을 수 있어요. 휴대폰 핫스팟으로 해 보세요', 'bad'); return; }
      netStatus(`학교 와이파이용 중계 서버에 접속하는 중… (${i + 1}/${relayList().length})`);
      const code = 'R' + i + makeCode().slice(0, 4);
      NET.pendingBus = busRelay(code, i, (bus) => {
        if (NET.id !== 'h' || NET.mode !== 'relay') { bus.close(); return; }
        NET.pendingBus = null; NET.bus = bus; startLobby(code);
        netStatus('학교 와이파이용 방이 만들어졌어요! 친구들에게 위 코드를 알려 주세요', 'ok');
      }, () => { if (NET.id === 'h' && NET.mode === 'relay' && !NET.bus) tryIdx(i + 1); });
    };
    tryIdx(0);
    return;
  }
  // 직접 연결 (PeerJS)
  NET.code = makeCode();
  NET.lobby = { size: NET.lobby.size || 1, players: [{ id: 'h', name: NET.name, team: 0 }] };
  $('mp-code').textContent = NET.code; renderLobby();
  netStatus('연결 서버에 접속하는 중…');
  const peer = new Peer('tg1v1-' + NET.code, peerOpts()); NET.peer = peer;
  const t0 = setTimeout(() => { if (!NET.connected) netStatus('연결 서버에 접속하지 못했어요. 인터넷 연결을 확인하거나 「학교 와이파이용 방」으로 만들어 보세요', 'bad'); }, 10000);
  peer.on('open', () => { clearTimeout(t0); NET.connected = true; netStatus('방이 만들어졌어요! 친구들에게 위 코드를 알려 주세요', 'ok'); });
  peer.on('connection', (c) => {
    netStatus('누군가 들어오는 중…', 'ok');
    const tj = setTimeout(() => { if (!c.appId) netStatus('친구가 방을 찾았지만 연결이 안 됐어요. 학교·회사 와이파이면 「학교 와이파이용 방 만들기」로 다시 만들어 주세요', 'bad'); }, 15000);
    c.on('error', () => {});
    c.on('data', (m) => {
      if (m && m.t === 'hello') { clearTimeout(tj); netStatus('친구가 들어왔어요!', 'ok'); }
      NET.lastRecv = performance.now();
      if (m && m.t === 'hello') { c.appId = m.from; NET.conns[m.from] = c; }
      if (c.appId) hostRecv(m);
    });
    c.on('close', () => { if (c.appId) playerLeft(c.appId); });
  });
  peer.on('error', (e) => { if (e.type === 'unavailable-id') { netHost('p2p'); return; } if (e.type !== 'peer-unavailable') netStatus(netErrText(e), 'bad'); });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
}
function hostRecv(m) {
  if (m.t === 'hello') {
    const L = NET.lobby;
    if (m.ver !== NET_VER) { rawSend(m.from, { t: 'reject', from: 'h', to: m.from, why: '방장과 게임 파일 버전이 달라요. 방장도 나도 가장 새 게임 파일(index.html)로 다시 받아서 열어 주세요' }); netStatus('버전이 다른 게임 파일로 누가 들어오려고 했어요. 모두 새 파일로 받아야 해요', 'bad'); return; }
    if (L.players.find(p => p.id === m.from)) { rawSend(m.from, { t: 'welcome', from: 'h', to: m.from }); rawSend(m.from, { t: 'lobby', lobby: L, from: 'h', to: m.from }); return; }
    if (NET.active) { rawSend(m.from, { t: 'reject', from: 'h', to: m.from, why: '이미 게임이 시작됐어요' }); return; }
    if (L.ffa) { // 개인전: 4자리, 꽉 찼으면 AI 자리를 사람에게
      if (L.players.length >= 4) { const bt = L.players.slice().reverse().find(p => p.bot); if (!bt) { rawSend(m.from, { t: 'reject', from: 'h', to: m.from, why: '방이 꽉 찼어요 (개인전은 4명)' }); return; } L.players = L.players.filter(p => p !== bt); }
      L.players.push({ id: m.from, name: String(m.name || '친구').slice(0, 12), team: 0 }); ffaTeams(L);
      rawSend(m.from, { t: 'welcome', from: 'h', to: m.from }); broadcastLobby(); AU.beep(880, 0.1, 0.2); return;
    }
    const humans = (t) => L.players.filter(p => p.team === t && !p.bot).length;
    if (L.players.length >= 8) {
      const bot = L.players.find(p => p.bot);
      if (!bot) { rawSend(m.from, { t: 'reject', from: 'h', to: m.from, why: '방이 꽉 찼어요 (최대 8명)' }); return; }
      L.players = L.players.filter(p => p !== bot);
    }
    const t0 = L.players.filter(p => p.team === 0).length, t1 = L.players.filter(p => p.team === 1).length;
    let team = t0 <= t1 ? 0 : 1;
    // 그 팀이 꽉 찼고 AI 가 있으면 AI 를 빼고 사람으로
    const tc = (t) => L.players.filter(p => p.team === t).length;
    if (tc(team) >= L.size) { const bt = L.players.find(p => p.bot && p.team === team) || L.players.find(p => p.bot); if (bt) { L.players = L.players.filter(p => p !== bt); team = bt.team; } }
    void humans;
    L.players.push({ id: m.from, name: String(m.name || '친구').slice(0, 12), team });
    autoSize();
    rawSend(m.from, { t: 'welcome', from: 'h', to: m.from });
    broadcastLobby();
    AU.beep(880, 0.1, 0.2);
    return;
  }
  hostRoute(m);
}
function autoSize() { const L = NET.lobby; if (L.ffa) return; L.size = Math.max(L.size, Math.min(4, Math.max(...[0, 1].map(t => L.players.filter(p => p.team === t).length)))); }
function addBot(team) {
  const L = NET.lobby;
  if (L.ffa) { if (L.players.length < 4) { NET.botN++; L.players.push({ id: 'b' + NET.botN, name: 'AI ' + NET.botN, team: 0, bot: true }); ffaTeams(L); broadcastLobby(); } return; }
  if (L.players.length >= 8 || L.players.filter(p => p.team === team).length >= L.size) return;
  NET.botN++;
  L.players.push({ id: 'b' + NET.botN, name: 'AI ' + NET.botN, team, bot: true });
  broadcastLobby();
}
function fillBots() {
  const L = NET.lobby;
  if (L.ffa) { while (L.players.length < 4) { NET.botN++; L.players.push({ id: 'b' + NET.botN, name: 'AI ' + NET.botN, team: 0, bot: true }); } ffaTeams(L); broadcastLobby(); return; }
  for (const t of [0, 1]) while (L.players.filter(p => p.team === t).length < L.size && L.players.length < 8) { NET.botN++; L.players.push({ id: 'b' + NET.botN, name: 'AI ' + NET.botN, team: t, bot: true }); }
  broadcastLobby();
}
function removeBot(id) {
  const b = NET.bots[id]; if (!b) return;
  b.soldier.setVisible(false); b.dead = true; b.gone = true;
  const i = ACTORS.indexOf(b); if (i >= 0) ACTORS.splice(i, 1);
  delete NET.bots[id];
}
function ensureBot(id, name, team) {
  let b = NET.bots[id];
  if (!b) {
    b = makeBot(name); b.netBot = true; b.netId = id;
    b.hearShot = b.hearShot; NET.bots[id] = b;
  }
  b.name = name; b.team = team; return b;
}
function broadcastLobby() { renderLobby(); const m = { t: 'lobby', lobby: NET.lobby, from: 'h', to: '*' }; rawSend('*', m); }
function playerLeft(id) {
  const L = NET.lobby, p = L.players.find(x => x.id === id);
  delete NET.conns[id];
  if (!p) return;
  L.players = L.players.filter(x => x.id !== id);
  if (NET.active) {
    HUD.addFeed(`<span class="en">${esc(p.name)}</span> <i>나갔어요</i>`);
    const m = { t: 'left', id, from: 'h', to: '*' }; rawSend('*', m);
    removeRemote(id);
    if (G.state === 'live') netCheckRoundEnd();
  } else broadcastLobby();
}

// ---------- 참가 ----------
function netJoin(code) {
  AU.init(); netReset(); saveName();
  code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  $('mp-input').value = code;
  if (code.length < 4) { netStatus('방 코드를 입력해 주세요', 'bad'); return; }
  NET.host = false; NET.code = code; NET.id = 'c' + makeCode().toLowerCase();
  // 참가 인사: 방장이 받았다고 답할 때까지 1초마다 다시 보내요 (첫 메시지가 사라지는 경우 대비)
  NET.welcomed = false;
  const hello = () => {
    NET.connected = true; netSend({ t: 'hello', name: NET.name, ver: NET_VER }, 'h');
    clearInterval(NET.helloTimer); let n = 0;
    NET.helloTimer = setInterval(() => { if (NET.welcomed || !NET.connected || ++n > 20) { clearInterval(NET.helloTimer); if (!NET.welcomed && NET.connected && n > 20) netStatus('방장에게서 답이 없어요. 코드가 맞는지, 방장이 방 화면을 켜 두었는지 확인해 주세요', 'bad'); return; } netSend({ t: 'hello', name: NET.name, ver: NET_VER }, 'h'); }, 1000);
  };
  if (code.startsWith('L')) {
    NET.bus = busLocal(code); hello(); netStatus('연결 중…');
    return;
  }
  if (onlineBlocked()) return;
  if (code.startsWith('R')) {
    const idx = +code[1];
    netStatus('학교 와이파이용 중계 서버에 접속하는 중…');
    NET.pendingBus = busRelay(code, idx, (bus) => {
      if (NET.code !== code || NET.host) { bus.close(); return; }
      NET.pendingBus = null; NET.bus = bus; hello(); netStatus(`방 ${esc(code)} 찾는 중…`);
    }, () => { if (NET.code === code && !NET.bus) netStatus('중계 서버에 접속하지 못했어요. 학교에서 막혀 있을 수 있어요. 휴대폰 핫스팟으로 해 보세요', 'bad'); });
    return;
  }
  netStatus('연결 서버에 접속하는 중…');
  const peer = new Peer(peerOpts()); NET.peer = peer;
  const t0 = setTimeout(() => { if (!NET.conn) netStatus('연결 서버에 접속하지 못했어요. 인터넷 연결을 확인하고 다시 참가를 눌러 주세요', 'bad'); }, 10000);
  peer.on('open', () => {
    clearTimeout(t0);
    netStatus(`방 ${esc(code)} 찾는 중…`);
    const c = peer.connect('tg1v1-' + code, { reliable: true, serialization: 'json' });
    NET.conn = c;
    c.on('open', () => { hello(); netStatus('연결됐어요! 방장이 시작하길 기다려요', 'ok'); });
    c.on('data', (m) => { NET.lastRecv = performance.now(); netRecv(m); });
    c.on('close', () => netLost());
    c.on('error', () => {});
    setTimeout(() => { if (!NET.connected && NET.conn === c && !NET.failed) netStatus('방은 찾았지만 연결이 안 됐어요. 학교·회사 와이파이면 방장에게 「학교 와이파이용 방 만들기」로 다시 만들어 달라고 하세요', 'bad'); }, 15000);
  });
  peer.on('error', (e) => { NET.failed = true; netStatus(e.type === 'peer-unavailable' ? `${esc(code)} 방이 없어요. 코드를 다시 확인하고, 방장이 방 화면을 켜 두고 있는지 확인해 주세요` : netErrText(e), 'bad'); });
}
function netErrText(e) {
  if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') return '연결 서버에 닿지 않아요. 내려받은 파일을 크롬에서 열었는지, 인터넷이 되는지 확인해 주세요';
  if (e.type === 'browser-incompatible') return '이 화면에선 온라인 연결이 막혀 있어요. 게임 파일을 내려받아 크롬에서 열어 주세요';
  return '연결 오류: ' + (e.type || e.message || e);
}
function netLost() {
  if (!NET.connected && !NET.active) return;
  const was = NET.active;
  NET.connected = false;
  if (was) { HUD.message('방장과 연결이 끊겼어요', '처음 화면으로 돌아가요', 3, 'lose'); setTimeout(() => { netReset(); goMenu(); }, 2500); }
  else { netStatus('방장과 연결이 끊겼어요', 'bad'); NET.lobby = { size: 1, players: [] }; renderLobby(); }
}
function saveName() {
  const v = ($('mp-name').value || '').trim().slice(0, 12);
  if (v) { NET.name = v; SETTINGS.nick = v; saveSettings(); $('start-nick').value = v; PLAYER.name = v; }
  try { localStorage.setItem('tg1v1_name', NET.name); } catch (e) {}
}

// ---------- 게임이 끝난 뒤 대기실로 (연결은 그대로, 맵·인원 바꾸기와 새 친구 받기 가능) ----------
function netToLobby() {
  NET.active = false;
  G.state = 'menu'; G.mode = 'arena'; G.menuOpen = false; stopPlayerInput(); HUD.showDealt(false);
  WORLD.bounds = WORLD.map.bounds; clearCombat();
  for (const id of ['pause', 'end', 'loadout', 'rangemenu', 'start']) $(id).style.display = 'none';
  for (const id in REMOTES) REMOTES[id].soldier.setVisible(false);
  for (const id in NET.bots) NET.bots[id].soldier.setVisible(false);
  BOT.soldier.setVisible(false); PLAYER.soldier.setVisible(false);
  ACTORS.length = 0; ACTORS.push(PLAYER);
  if (document.pointerLockElement) document.exitPointerLock();
  $('mp').style.display = 'flex';
  if (NET.host) { netSend({ t: 'tolobby' }); broadcastLobby(); netStatus(`대기실이에요. 맵·인원을 바꾸거나, 친구에게 코드 <b>${esc(NET.code)}</b> 를 알려 주면 더 들어올 수 있어요`, 'ok'); }
  else { renderLobby(); netStatus('대기실이에요. 방장이 다시 시작하길 기다려요', 'ok'); }
}

// ---------- 대기실 화면 ----------
function renderLobby() {
  const L = NET.lobby, me = NET.id, host = NET.host;
  const box = $('mp-lobby');
  if (!L.players.length) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  const sizeBtns = [1, 2, 3, 4].map(n => `<button class="${!L.ffa && L.size === n ? 'on' : ''}" data-size="${n}" ${host ? '' : 'disabled'}>${n}대${n}</button>`).join('')
    + `<button class="${L.ffa ? 'on' : ''}" data-ffa="1" ${host ? '' : 'disabled'}>개인전 1v1v1v1</button>`;
  const col = (team) => {
    const ps = L.players.filter(p => p.team === team);
    let h = `<div class="tcol t${team}"><h4 style="color:${TEAM_COLOR[team]}">${TEAM_NAME[team]} 팀 <small>${ps.length}/${L.size}</small></h4>`;
    for (const p of ps) h += `<div class="pl">${p.id === 'h' ? '👑 ' : p.bot ? '🤖 ' : ''}${esc(p.name)}${p.id === me ? ' <em>(나)</em>' : ''}${host ? (p.bot ? `<button data-kick="${p.id}">AI 빼기</button>` : '') + `<button data-swap="${p.id}">팀 바꾸기</button>` : ''}</div>`;
    for (let i = ps.length; i < L.size; i++) h += `<div class="pl empty">빈 자리${host && L.players.length < 8 ? `<button data-addbot="${team}">＋ AI 넣기</button>` : ''}</div>`;
    return h + '</div>';
  };
  if (L.ffa) { // 개인전: 4자리 한 줄
    const maps = ffaMaps(), cur = L.map && maps.includes(L.map) ? L.map : 'random';
    const mapBtns = [`<button class="${cur === 'random' ? 'on' : ''}" data-map="random" ${host ? '' : 'disabled'}>랜덤</button>`].concat(maps.map(id => `<button class="${cur === id ? 'on' : ''}" data-map="${id}" ${host ? '' : 'disabled'}>${MAP_DEFS[id].name}</button>`)).join('');
    let col = `<div class="tcol" style="flex:1"><h4 style="color:#ffd24a">개인전 <small>${L.players.length}/4 · 모두가 적이에요</small></h4>`;
    for (const p of L.players) col += `<div class="pl">${p.id === 'h' ? '👑 ' : p.bot ? '🤖 ' : ''}${esc(p.name)}${p.id === me ? ' <em>(나)</em>' : ''}${host && p.bot ? `<button data-kick="${p.id}">AI 빼기</button>` : ''}</div>`;
    for (let i = L.players.length; i < 4; i++) col += `<div class="pl empty">빈 자리${host ? `<button data-addbot="0">＋ AI 넣기</button>` : ''}</div>`;
    col += '</div>';
    const ok2 = L.players.length >= 2;
    box.innerHTML = `<div class="attrow"><span>경기 방식</span>${sizeBtns}</div><div class="attrow"><span>맵</span>${mapBtns}</div><div class="teams">${col}</div>`
      + (host ? `<div class="row" style="margin:12px 0 0"><button class="btn" id="mp-startgame" ${ok2 ? '' : 'disabled'}>게임 시작</button><button class="btn sub" id="mp-fillbots">빈자리 모두 AI로 채우기</button><span class="hint">${ok2 ? '사람이 부족해도 그대로 시작할 수 있어요 (빈자리는 비워 둬도 돼요)' : '2명 이상이어야 해요 (AI 넣기로 채워도 돼요)'}</span></div>`
        : `<div class="hint" style="margin-top:10px">방장이 게임을 시작하면 바로 들어가요</div>`);
    return;
  }
  const t0 = L.players.filter(p => p.team === 0).length, t1 = L.players.length - t0;
  const ok = t0 >= 1 && t1 >= 1 && t0 <= L.size && t1 <= L.size;
  const maps = MAP_LIST[L.size] || [], cur = L.map && maps.includes(L.map) ? L.map : 'random';
  const mapBtns = [`<button class="${cur === 'random' ? 'on' : ''}" data-map="random" ${host ? '' : 'disabled'}>랜덤</button>`].concat(maps.map(id => `<button class="${cur === id ? 'on' : ''}" data-map="${id}" ${host ? '' : 'disabled'}>${MAP_DEFS[id].name}</button>`)).join('');
  box.innerHTML = `<div class="attrow"><span>경기 방식</span>${sizeBtns}</div><div class="attrow"><span>맵</span>${mapBtns}</div><div class="teams">${col(0)}${col(1)}</div>`
    + (host ? `<div class="row" style="margin:12px 0 0"><button class="btn" id="mp-startgame" ${ok ? '' : 'disabled'}>게임 시작</button><button class="btn sub" id="mp-fillbots">빈자리 모두 AI로 채우기</button><span class="hint">${ok ? '팀원이 적은 쪽도 그대로 시작할 수 있어요' : '양쪽 팀에 한 명 이상, 정한 인원 이하로 맞춰 주세요'}</span></div>`
      : `<div class="hint" style="margin-top:10px">방장이 게임을 시작하면 바로 들어가요</div>`);
}

// ---------- 상대 캐릭터 ----------
function ensureRemote(id) {
  if (REMOTES[id]) return REMOTES[id];
  const r = new Actor('친구', false, { shirt: 0x6b3a32, pants: 0x3f4436, pack: 0x3b3a30, skin: 0xc48f6a });
  r.remote = true; r.netId = id; r.net = { pos: new V3(), yaw: 0, pitch: 0, vel: new V3() }; r.getAim = () => {};
  r.soldier.setVisible(false);
  REMOTES[id] = r; return r;
}
function removeRemote(id) {
  const r = REMOTES[id]; if (!r) return;
  r.soldier.setVisible(false); r.dead = true; r.gone = true;
  const i = ACTORS.indexOf(r); if (i >= 0) ACTORS.splice(i, 1);
  delete REMOTES[id];
}
function actorById(id) { return id === NET.id ? PLAYER : REMOTES[id] || NET.bots[id] || null; }
function myLoadoutMsg() { return { t: 'lo', list: PLAYER.weapons.map(w => ({ id: w.id, att: w.att })) }; }

// ---------- 라운드 (방장이 정함) ----------
function netStartGame() {
  const L = NET.lobby;
  const maps = L.ffa ? ffaMaps() : MAP_LIST[L.size] || ['arena'], rnd = L.ffa ? MAP_LIST.ffa : maps; // 개인전 랜덤은 전용 맵에서
  NET.matchMap = L.map && maps.includes(L.map) ? L.map : rnd[(Math.random() * rnd.length) | 0];
  NET.active = true; G.mode = 'mp';
  G.score = L.ffa ? [0, 0, 0, 0] : [0, 0]; G.round = 0; G.time = 0;
  netNextRound();
}
function netNextRound() {
  const L = NET.lobby, round = G.round + 1;
  const flip = round % 2 === 0;
  const map = NET.matchMap || (L.size === 1 ? 'duel' : 'arena'), D = MAP_DEFS[map] || MAP_DEFS.arena;
  const spawns = {}, SZ = Math.abs(D.spawnZ), gap = Math.min(5, (D.bounds.maxX - 4) * 2 / Math.max(1, L.size));
  if (L.ffa) { // 개인전: 네 자리(양쪽 끝 왼·오른쪽)를 라운드마다 돌려요. 2명이면 서로 반대편 끝
    const g4 = Math.min(5, (D.bounds.maxX - 4) * 2 / 4), X = 1.5 * g4;
    const slots = D.ffaSpawns || [[-X, -SZ], [X, SZ], [X, -SZ], [-X, SZ]];
    L.players.forEach((p, i) => { const s = slots[(i + round - 1) % 4]; spawns[p.id] = [+(s[0] + rand(-0.4, 0.4)).toFixed(2), +s[1].toFixed(2), D.ffaSpawns ? +Math.atan2(s[0], s[1]).toFixed(3) : s[1] < 0 ? Math.PI : 0]; });
  } else
  for (const team of [0, 1]) {
    const ps = L.players.filter(p => p.team === team);
    const z = (team === 0) !== flip ? -SZ : SZ;
    ps.forEach((p, i) => { const x = (i - (ps.length - 1) / 2) * gap + rand(-0.5, 0.5); spawns[p.id] = [+x.toFixed(2), z, z < 0 ? Math.PI : 0]; });
  }
  const m = { t: 'round', round, score: G.score, spawns, players: L.players, armor: SETTINGS.armor, winTo: G.winTo, map, ffa: !!L.ffa };
  netSend(m); applyRound(m);
}
function applyRound(m) {
  NET.active = true; G.mode = 'mp'; setMap(m.map || 'arena');
  for (const id of ['start', 'mp', 'end']) $(id).style.display = 'none';
  SETTINGS.armor = m.armor; G.winTo = m.winTo; G.score = m.score.slice();
  NET.lobby.players = m.players; NET.lobby.ffa = !!m.ffa;
  const meP = m.players.find(p => p.id === NET.id); G.myTeam = meP ? meP.team : 0; PLAYER.team = G.myTeam;
  // 나간 사람 정리, 새 사람 만들기
  for (const id in REMOTES) if (!m.players.find(p => p.id === id)) removeRemote(id);
  for (const id in NET.bots) if (!m.players.find(p => p.id === id)) removeBot(id);
  ACTORS.length = 0; ACTORS.push(PLAYER); BOT.soldier.setVisible(false); // 1대1용 AI는 멀티·팀전에서 숨겨요
  for (const p of m.players) {
    if (p.id === NET.id) continue;
    const r = NET.host && p.bot ? ensureBot(p.id, p.name, p.team) : ensureRemote(p.id);
    r.name = p.name; r.team = p.team;
    r.soldier.setShirt(p.team === G.myTeam ? 0x3d5f8c : 0x8a3a30);
    ACTORS.push(r);
  }
  if (m.round === 1) resetKD();
  PLAYER.name = NICK();
  G.round = m.round - 1;
  GAME.newRoundMP(m.spawns);
  if (!INPUT.locked && !G.menuOpen) { $('pause-settings').appendChild($('settings')); $('pause').style.display = 'flex'; $('pause-title').textContent = '화면을 눌러 게임에 들어가요'; }
}
// 한 팀이 모두 쓰러졌는지 (방장)
function teamAlive(team) { let n = 0; for (const a of ACTORS) if (a.team === team && !a.dead && !a.gone) n++; return n; }
function teamHealth(team) { let h = 0; for (const a of ACTORS) if (a.team === team && !a.dead && !a.gone) h += a.health; return h; }
function netCheckRoundEnd() {
  if (!NET.host || G.state !== 'live') return;
  let winner;
  if (isFFA()) { // 개인전: 한 명만 남으면 끝
    const alive = new Set(); for (const a of ACTORS) if (!a.dead && !a.gone && a.team !== undefined) alive.add(a.team);
    if (alive.size > 1) return;
    winner = alive.size === 1 ? [...alive][0] : -1;
  } else {
    const a0 = teamAlive(0), a1 = teamAlive(1);
    if (a0 > 0 && a1 > 0) return;
    winner = a0 === 0 && a1 === 0 ? -1 : a0 === 0 ? 1 : 0;
  }
  if (winner >= 0) G.score[winner]++;
  const m = { t: 'rend', winner, score: G.score, why: 'kill' };
  netSend(m); GAME.showRoundEnd(m);
}
function netTimeUp() {
  let winner;
  if (isFFA()) { // 개인전 시간 끝: 체력이 가장 많은 사람
    let best = -1, bh = 0, tie = false;
    for (const a of ACTORS) if (!a.dead && !a.gone && a.team !== undefined) { if (a.health > bh + 0.5) { best = a.team; bh = a.health; tie = false; } else if (Math.abs(a.health - bh) <= 0.5) tie = true; }
    winner = tie ? -1 : best;
  } else {
    const h0 = teamHealth(0), h1 = teamHealth(1);
    winner = Math.abs(h0 - h1) < 0.5 ? -1 : h0 > h1 ? 0 : 1;
  }
  if (winner >= 0) G.score[winner]++;
  const m = { t: 'rend', winner, score: G.score, why: 'time' };
  netSend(m); GAME.showRoundEnd(m);
}

// ---------- 받기 ----------
function netRecv(m) {
  if (!m || !m.t) return;
  const from = m.from;
  if (m.k !== undefined) { const key = from + ':' + m.k; if (NET.dupe.has(key)) return; NET.dupe.add(key); if (NET.dupe.size > 3000) NET.dupe.clear(); }
  switch (m.t) {
    case 'welcome': NET.welcomed = true; clearInterval(NET.helloTimer); NET.connected = true; netStatus('들어왔어요! 방장이 시작하길 기다려요', 'ok'); break;
    case 'ping': if (m.ts !== undefined && !(NET.host && m.to === '*' && false)) netSend({ t: 'pong', ts: m.ts }, from); break;
    case 'pong': { const rtt = performance.now() - m.ts; if (rtt >= 0 && rtt < 10000) { NET.rtt = NET.rtt ? NET.rtt * 0.7 + rtt * 0.3 : rtt; NET.rttAt = performance.now(); } break; }
    case 'reject': clearInterval(NET.helloTimer); netStatus(m.why || '들어갈 수 없어요', 'bad'); NET.connected = false; break;
    case 'lobby': if (!NET.host) { NET.welcomed = true; clearInterval(NET.helloTimer); NET.lobby = m.lobby; renderLobby(); } break;
    case 'round': if (!NET.host) applyRound(m); break;
    case 'go': if (!NET.host && G.state === 'pre') GAME.goLive(); break;
    case 'rend': if (!NET.host) { G.score = m.score.slice(); GAME.showRoundEnd(m); } break;
    case 'over': if (!NET.host) { G.score = m.score.slice(); GAME.endMatch(); } break;
    case 'tolobby': if (!NET.host) netToLobby(); break;
    case 'left': { const r = REMOTES[m.id]; if (r) HUD.addFeed(`<span class="en">${esc(r.name)}</span> <i>나갔어요</i>`); removeRemote(m.id); break; }
    case 'bye': if (from === 'h') netLost(); else if (NET.host) playerLeft(from); break;
    case 'lo': { const r = REMOTES[from]; if (r) { r.setLoadout(m.list); r.equip(0, true); } break; }
    case 'st': {
      const r = REMOTES[from]; if (!r || r.gone) break;
      r.net.pos.fromArray(m.p); r.net.vel.set(m.v[0], 0, m.v[1]); r.net.yaw = m.y; r.net.pitch = m.pi;
      if (r.pos.distanceTo(r.net.pos) > 4) r.pos.copy(r.net.pos);
      { const ns = STANCE_NAME[m.s] || 'stand'; if (ns !== r.stance && (ns === 'prone' || r.stance === 'prone')) { r.proneDur = ns === 'prone' ? 1.0 : 0.85; r.proneLock = r.proneDur; } r.stance = ns; }
      r.leanTarget = m.l; r.adsT = m.a; r.sprint = !!m.sp; r.health = m.h;
      if (!m.d && r.dead && G.state === 'pre') { r.dead = false; r.soldier.deadT = 0; r.soldier.body.rotation.set(0, 0, 0); }
      r.helmet.lv = m.hl; r.helmet.dur = m.hd; r.vest.lv = m.vl; r.vest.dur = m.vd;
      if (r.soldier.vest.visible !== m.vl > 0 || r.soldier.helmet.visible !== m.hl > 0) r.soldier.setArmor(m.hl, m.vl);
      if (m.m === 'f') { if (r.mode !== 'fist') { r.mode = 'fist'; r.soldier.setGun(null); r.soldier.setArms('HG'); } }
      else if (m.m === 't') { if (r.mode !== 'throw' || r.throwType !== m.tt) { r.mode = 'throw'; r.throwType = m.tt; r.soldier.setGun(buildGrenadeModel(m.tt)); r.soldier.setArms('HG'); } }
      else if (r.weapons.length && (r.mode !== 'gun' || r.cur !== m.w)) { r.cur = clamp(m.w, 0, r.weapons.length - 1); r.mode = 'gun'; r.soldier.setGun(r.w.model); r.soldier.setArms(r.w.stats.cat); }
      r.reloadT = m.rl ? 1 - m.rl : 0; r.reloadDur = 1; // 장전 진행도 (상대 장전 동작도 맞게)
      r.netVault = m.vt === undefined ? -1 : m.vt; r.netVaultOver = !!m.vo;
      break;
    }
    case 'chat': { const r = REMOTES[from] || actorById(from); if (m.s === 'team' && (!r || r.team !== G.myTeam)) break; chatShow(m.s, m.n || (r && r.name) || '?', m.x, r && r.team !== G.myTeam ? 'en' : 'tm'); break; }
    case 'mark': { const r = REMOTES[from]; if (r && r.team === G.myTeam && m.p) placePing(new V3().fromArray(m.p), r.name, !!m.e); break; }
    case 'punch': { const r = REMOTES[from]; if (r) { r.punchT = 0.28; AU.punch(false, r.pos); } break; }
    case 'shot': {
      const r = REMOTES[from]; if (!r || !r.weapons.length) break;
      const w = r.weapons.find(x => x.id === m.id) || r.w;
      const o = new V3().fromArray(m.o);
      for (const d of m.d) { spawnBullet(r, o, new V3().fromArray(d), w.stats, 0); BULLETS[BULLETS.length - 1].visual = true; }
      const muz = r.w && r.mode === 'gun' ? r.muzzleWorld(new V3()) : o;
      AU.shot(muz, w.stats.cat, w.stats.suppressed, false, w.id);
      if (w.stats.cat !== 'XB') muzzleFlash(muz, new V3().fromArray(m.d[0]), w.stats.cat === 'SR' || w.stats.cat === 'SG', w.stats.flashHidden);
      for (const id in NET.bots) NET.bots[id].hearShot && NET.bots[id].hearShot(r, w.stats.suppressed);
      break;
    }
    case 'dealt': recordDealt(m.n, m.d); break;
    case 'hit': { // 누가 나(또는 방장의 AI)를 맞힘 → 맞은 쪽에서 피해 계산
      const r = REMOTES[from];
      const victim = NET.host && NET.bots[m.to] ? NET.bots[m.to] : PLAYER;
      if (!r || victim.dead || G.state !== 'live' || r.team === victim.team) break;
      const st = m.id === 'fist' ? FIST_ST : weaponStats(m.id, m.att || fullAttachments(m.id));
      applyBulletDamage({ owner: r, st, dmg: m.dmg, wallMul: m.wm, dist: m.dist, start: new V3() }, victim, m.part, new V3().fromArray(m.hp), new V3().fromArray(m.dir));
      break;
    }
    case 'nade': { const r = REMOTES[from]; if (r) { throwGrenade(r, m.type, new V3().fromArray(m.o), new V3().fromArray(m.v), m.fuse); r.throwAnimT = 0.5; r.throwUnder = m.v[1] < 1.6 && Math.hypot(m.v[0], m.v[2]) < 12; AU.spoon(r.pos); } break; }
    case 'boom': { const r = REMOTES[from]; if (r) explodeGrenade(m.type, new V3().fromArray(m.p), r, true); break; }
    case 'died': {
      const r = REMOTES[from]; if (!r || r.dead) break;
      r.dead = true; r.health = 0;
      const killer = actorById(m.killer) || r;
      r.deaths = (r.deaths || 0) + 1;
      if (killer !== r) { killer.kills = (killer.kills || 0) + 1; if (m.head) killer.heads = (killer.heads || 0) + 1; }
      if (killer === PLAYER) HUD.hitMarker(true, m.head);
      for (const id of m.as || []) { const a = actorById(id); if (a && a !== killer) giveAssist(a, r); }
      GAME.onKill(killer, r, { weapon: m.weapon, head: m.head, dist: m.dist, net: true });
      break;
    }
  }
}

// ---------- 매 프레임 ----------
function netUpdate(dt) {
  if (!NET.active) return;
  NET.sendT -= dt;
  if (NET.sendT <= 0) {
    NET.sendT = 1 / 24;
    const senders = [[PLAYER, NET.id]];
    if (NET.host) for (const id in NET.bots) senders.push([NET.bots[id], id]);
    for (const [p, sid] of senders) {
    netSend({
      t: 'st', p: [+p.pos.x.toFixed(3), +p.pos.y.toFixed(3), +p.pos.z.toFixed(3)], v: [+p.vel.x.toFixed(2), +p.vel.z.toFixed(2)], y: +p.yaw.toFixed(4), pi: +p.pitch.toFixed(4),
      s: STANCE_CODE[p.stance], l: +p.lean.toFixed(2), a: +p.adsT.toFixed(2), sp: p.sprint ? 1 : 0, h: Math.round(p.health * 10) / 10, d: p.dead ? 1 : 0,
      hl: p.helmet.lv, hd: Math.round(p.helmet.dur), vl: p.vest.lv, vd: Math.round(p.vest.dur), w: p.cur, m: p.mode === 'throw' ? 't' : p.mode === 'fist' ? 'f' : 'g', tt: p.throwType, rl: p.reloadT > 0 ? Math.max(0.01, +(1 - p.reloadT / (p.reloadDur || 1)).toFixed(2)) : 0, vt: p.vault ? +Math.min(1, p.vault.t).toFixed(2) : -1, vo: p.vault && p.vault.over ? 1 : 0,
    }, '*', sid);
    const lo = { t: 'lo', list: p.weapons.map(w => ({ id: w.id, att: w.att })) };
    const key = JSON.stringify(lo.list);
    if (key !== p.netLoKey || ++NET.loKeep % 72 === 0) { p.netLoKey = key; netSend(lo, '*', sid); }
    }
  }
  for (const id in REMOTES) {
    const r = REMOTES[id];
    if (!r.dead) {
      const k = 1 - Math.exp(-dt * 14);
      _v1.copy(r.net.pos).addScaledVector(r.net.vel, 0.04);
      r.pos.lerp(_v1, k);
      r.yaw += angDiff(r.yaw, r.net.yaw) * k; r.pitch = lerp(r.pitch, r.net.pitch, k);
      r.vel.copy(r.net.vel);
      r.lean = damp(r.lean, r.leanTarget, 12, dt);
      r.stanceH = damp(r.stanceH, STANCE[r.stance].eye, 10, dt);
      r.onGround = true;
    }
    r.afterMove(dt);
  }
  if (!NET.host && NET.connected && NET.lastRecv > 0 && performance.now() - NET.lastRecv > 25000) netLost();
  netCheckSeen();
}
setInterval(() => { if (NET.connected && (NET.active || !NET.host)) netSend({ t: 'ping', ts: Math.round(performance.now()) }); netCheckSeen(); }, 1000);
// 공용 통로 방식: 한동안 소식이 없으면 나간 것으로 봐요 (방장)
function netCheckSeen() {
  if (!NET.host || !NET.bus) return;
  const now = performance.now();
  for (const p of NET.lobby.players.slice()) { if (p.id === 'h' || p.bot) continue; const t = NET.seen[p.id]; if (t && now - t > 30000) playerLeft(p.id); }
}
// 창을 내려도 온라인 게임은 계속 진행 (화면 그리기 없이)
let NET_HID_T = performance.now();
setInterval(() => {
  const now = performance.now();
  if (!NET.active || !document.hidden || !isPlaying()) { NET_HID_T = now; return; }
  let d = Math.min(1, (now - NET_HID_T) / 1000); NET_HID_T = now;
  INPUT.keys = {}; INPUT.lmb = INPUT.rmb = false;
  while (d > 0) { const s = Math.min(0.05, d); simStep(s); d -= s; }
  INPUT.consume();
}, 100);
addEventListener('beforeunload', () => { try { netSend({ t: 'bye' }); } catch (e) {} });

function setupMP() {
  $('mp-name').value = NET.name;
  $('btn-mp').onclick = () => { AU.init(); $('start').style.display = 'none'; $('mp').style.display = 'flex'; netStatus('방을 만들거나 친구의 방 코드를 입력하세요'); $('mp-code').textContent = '-----'; renderLobby(); };
  $('mp-host').onclick = () => netHost('p2p');
  $('mp-host-relay').onclick = () => netHost('relay');
  $('mp-host-local').onclick = () => netHost('local');
  $('mp-join').onclick = () => netJoin($('mp-input').value);
  for (const id of ['mp-input', 'mp-name']) $(id).addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && id === 'mp-input') netJoin($('mp-input').value); });
  $('mp-back').onclick = () => { netReset(); renderLobby(); $('mp').style.display = 'none'; $('start').style.display = 'flex'; };
  try { $('mp-turn').value = localStorage.getItem('tg1v1_turn') || ''; } catch (e) {}
  const turnInfo = () => { const s = myTurnServers(); const t = s.find(x => x.username); $('mp-turn-ok').textContent = t ? `✓ 중계 서버 키 적용됨 (${t.urls.length}개 주소)` : (!$('mp-turn').value.trim() && window.__builtinTurn ? '✓ 게임 파일에 중계 서버 키가 들어 있어요 (따로 안 넣어도 돼요)' : $('mp-turn').value.includes('<PASSWORD>') ? '✗ 비밀번호가 <PASSWORD> 로 가려진 채 복사됐어요. 사이트에서 REVEAL 을 누른 뒤 다시 COPY SNIPPET 하거나, 줄 옆의 ICE 버튼으로 복사해 주세요' : $('mp-turn').value.trim() ? '✗ 키를 못 읽었어요. 대시보드의 ICE Servers Array 전체를 붙여 넣어 주세요' : ''); $('mp-turn-ok').className = t || (window.__builtinTurn && !$('mp-turn').value.trim()) ? 'ok' : 'bad'; };
  $('mp-turn').addEventListener('input', () => { try { localStorage.setItem('tg1v1_turn', $('mp-turn').value); } catch (e) {} turnInfo(); });
  $('mp-turn').addEventListener('keydown', (e) => e.stopPropagation());
  turnInfo();
  $('mp-copy').onclick = () => { try { navigator.clipboard.writeText(NET.code).then(() => netStatus('코드를 복사했어요', 'ok'), () => {}); } catch (e) {} };
  $('mp-lobby').addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t || !NET.host) return;
    const L = NET.lobby;
    if (t.dataset.ffa) { // 개인전으로: AI부터 빼서 4명 이하로
      const humans = L.players.filter(p => !p.bot);
      if (humans.length > 4) { netStatus('개인전은 4명까지예요. 사람이 너무 많아요', 'bad'); return; }
      while (L.players.length > 4) { const bt = L.players.slice().reverse().find(p => p.bot); L.players = L.players.filter(p => p !== bt); }
      L.ffa = true; L.size = 4; ffaTeams(L); broadcastLobby(); return;
    }
    if (t.dataset.size) {
      if (L.ffa) { L.ffa = false; L.players.forEach((p, i) => { p.team = i % 2; }); }
      L.size = +t.dataset.size;
      // 인원보다 AI 가 많으면 AI 부터 빼기
      for (const tm of [0, 1]) { let ps = L.players.filter(p => p.team === tm); while (ps.length > L.size && ps.some(p => p.bot)) { const bt = ps.filter(p => p.bot).pop(); L.players = L.players.filter(p => p !== bt); ps = L.players.filter(p => p.team === tm); } }
      broadcastLobby();
    }
    if (t.dataset.map) { L.map = t.dataset.map; broadcastLobby(); }
    if (t.dataset.swap) { const p = L.players.find(x => x.id === t.dataset.swap); if (p) { p.team = 1 - p.team; autoSize(); broadcastLobby(); } }
    if (t.dataset.addbot !== undefined) addBot(+t.dataset.addbot);
    if (t.dataset.kick) { L.players = L.players.filter(x => x.id !== t.dataset.kick); if (L.ffa) ffaTeams(L); broadcastLobby(); }
    if (t.id === 'mp-fillbots') fillBots();
    if (t.id === 'mp-startgame') { netStartGame(); lockPointer(); }
  });
}
