# claude-game-tools

게임 개발용 Claude 플러그인 모음이에요. 각 폴더에 원래 프로젝트의 라이선스(MIT)가 들어 있어요.

| 플러그인 | 하는 일 |
|---|---|
| `plugins/pixel-art-tools` | 픽셀아트·2D 이펙트: pixelfx(이펙트 244개), codixel(사진 → 픽셀 캐릭터), pixel-art-studio, pxl |
| `plugins/threejs-game-tools` | 3D 웹 게임(Three.js r128): 3D 이펙트(fx3d.js), 캐릭터·NPC(character3d.js), 저폴리 모델(models3d.js), 화면 확인 도구 |
| `plugins/game-dev-kit` | 게임 개발 지식 20분야: 엔진, 세이브, 멀티플레이, NPC AI, UI, 레벨 디자인, 최적화 등 |
| `plugins/unity-gamedev` | Unity C# 스킬 21개 |
| `plugins/game-polish` | 그래픽 업그레이드(스타일 가이드·스프라이트·패럴랙스, 이미지 생성은 fal.ai 필요)와 자동차 엔진 소리 |
| `plugins/mcp-for-blender` | Blender 연결 (컴퓨터 전용) |
| `vendor/three-r128` | three.js r128 (MIT). 인터넷이 막힌 환경에서 3D 화면 확인용 |

## 쓰는 법

**새 채팅에서**: "내 깃허브 iden1112/claude-game-tools 저장소 써 줘"라고 하면 Claude가 저장소를 불러와서 필요한 플러그인 폴더의 `skills/*/SKILL.md`부터 읽고 작업해요.

**플러그인으로 설치 (컴퓨터)**: claude.ai → Customize → Plugins에서 이 저장소를 마켓플레이스로 추가하거나, `plugins/<이름>` 폴더를 zip으로 묶어 업로드해요. Claude Code에서는 `/plugin marketplace add iden1112/claude-game-tools`.

## Claude에게 (작업 순서)

1. 요청에 맞는 플러그인의 `skills/<스킬>/SKILL.md`를 먼저 읽어요. 스킬 설명서의 경로는 그 스킬 폴더 기준이에요.
2. 3D 작업에서 three.js를 받을 수 없으면 `vendor/three-r128/three.min.js`를 써서 `plugins/threejs-game-tools/skills/three-game-dev/render-check.py`로 실제 화면을 찍어 확인해요.
3. 2D 웹 게임에 pixelfx를 넣을 때는 `plugins/pixel-art-tools/skills/pixelfx/bundle.mjs`로 필요한 이펙트만 묶어요.
