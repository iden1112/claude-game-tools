// ================= 시작 =================
buildWorld();
createPlayer(); createBot();
PLAYER.setLoadout(playerLoadoutList()); BOT.setLoadout(botLoadout());
PLAYER.pos.set(-3, 0, -30); BOT.pos.set(3, 0, 30); BOT.yaw = 0; PLAYER.yaw = Math.PI;
for (const a of ACTORS) a.afterMove(0);
HUD.init(); setupMenus(); setupLoadoutUI(); setupRangeMenu(); setupMP();
frame();
// 새 버전 알림: 웹사이트에 더 새 게임이 있으면 시작 화면에 알려줘요
const GAME_SITE = 'https://iden1112.github.io/claude-game-tools/';
(function checkUpdate() {
  if (location.hostname.endsWith('github.io')) return; // 웹사이트로 열었으면 늘 최신
  try {
    fetch(GAME_SITE + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => {
      if (!j || !(j.build > GAME_BUILD)) return;
      const b = document.createElement('div'); b.id = 'updbar';
      b.innerHTML = `새 버전이 나왔어요 (${j.note || ''}) · <a href="${GAME_SITE}games/shooting/training-1v1/" target="_blank" rel="noopener">웹사이트에서 최신 게임 열기</a>`;
      $('start').querySelector('.panel').prepend(b);
    }).catch(() => {});
  } catch (e) {}
})();
window.__game = { step(n, dt = 1 / 60) { for (let i = 0; i < n; i++) { simStep(dt); updateFX(dt); fx.update(dt, camera); updatePlayerCamera(dt); INPUT.consume(); } }, G, PLAYER: () => PLAYER, BOT: () => BOT, REMOTES: () => REMOTES, netStartGame, GAME, CAM, INPUT, NET, RANGE, openLoadout, closeLoadout, camera, enterRange, netHost, netJoin };
