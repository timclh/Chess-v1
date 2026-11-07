# 《天宫弈 · 南天门守卫战》AI 视觉资产替换指南 (Zero-Code Asset Slots)

本目录（`public/tiangong/`）用于存放 **AI 生成的天宫背景视频、3 星化神“法天象地”全屏大招 CG 视频、以及神将立绘**。

游戏默认内置了全套 **高精矢量金辉云海、南天门阵图与神将法相 SVG 特效**（无需任何外部文件即可 100% 离线流畅运行，符合 iOS App Store 审核要求）。当你用 **可灵 (Kling) / Sora / Runway / Midjourney** 生成好素材后，只需按下方文件名放入本目录，并在 `src/data/tiangongAssets.js` 中将对应 `enabled` 设为 `true`（或直接放入同名文件），游戏即会自动加载！

---

## 1. 文件槽位一览

| 文件名 | 用途 | 推荐尺寸 / 格式 |
| :--- | :--- | :--- |
| `bg-tiangong-loop.mp4` | 棋盘底层动态背景（云海翻涌、悬浮南天门） | `1080x1920` (9:16 竖屏), MP4 (H.264), 4~8秒循环, ≤ 4MB |
| `ult-lijing.mp4` | **【兵·3星】托塔李天王** 化神觉醒 1.8s 全屏大招 | `1080x1920`, MP4, 1.5~2.5秒, 无音轨或轻音效 |
| `ult-leizhenzi.mp4` | **【车·3星】雷震子·九天应元** 化神觉醒全屏大招 | `1080x1920`, MP4, 1.5~2.5秒 |
| `ult-erlang.mp4` | **【马·3星】二郎显圣真君** 天眼开阖全屏大招 | `1080x1920`, MP4, 1.5~2.5秒 |
| `ult-nezha.mp4` | **【炮·3星】哪吒·火莲法相** 三昧真火全屏大招 | `1080x1920`, MP4, 1.5~2.5秒 |
| `ult-wukong.mp4` | **【相·3星】齐天大圣·法天象地** 一棍清屏全屏大招 | `1080x1920`, MP4, 1.5~2.5秒 |
| `portrait-lijing.webp` | 托塔天王立绘头像（可选） | `512x512`, WebP / PNG 透明底 |
| `portrait-leizhenzi.webp` | 雷震子立绘头像（可选） | `512x512`, WebP / PNG 透明底 |
| `portrait-erlang.webp` | 二郎真君立绘头像（可选） | `512x512`, WebP / PNG 透明底 |
| `portrait-nezha.webp` | 哪吒三太子立绘头像（可选） | `512x512`, WebP / PNG 透明底 |
| `portrait-wukong.webp` | 齐天大圣立绘头像（可选） | `512x512`, WebP / PNG 透明底 |

---

## 2. 爆款“AI 天宫巨物感”提示词模板（可直接复制到可灵 / Midjourney）

### A. 棋盘底层：南天门云海悬浮背景 (`bg-tiangong-loop.mp4`)
> **Prompt (CN)**: 中国神话天宫，宏伟的南天门立于翻涌的鎏金云海之上，远处悬浮着无数宫阙楼阁与金色星轨，丁达尔神光穿透云层，巨物压迫感，黑金与朱砂红配色，电影级光影，俯视斜角构图，无缝循环动画，8K超清。
>
> **Prompt (EN)**: Chinese mythological Heavenly Palace Tiangong, colossal Nantianmen celestial gate floating above a rolling sea of golden clouds, glowing constellation star-grid in the foreground, volumetric god rays, black lacquer and vermilion gold palette, megalophobia epic scale, top-down 3/4 isometric view, seamless loop, Unreal Engine 5 cinematic render, 9:16.

### B. 3 星化神大招 CG：二郎显圣真君 (`ult-erlang.mp4`)
> **Prompt (CN)**: 中国神话巨物压迫感，云海之上巨大的二郎显圣真君法天象地金色法相睁开额间第三只天眼，一道刺目的纯金神雷光柱从天眼轰然射向下方地面，云层震散，金光万丈，史诗级神话特效，竖屏 9:16。

### C. 3 星化神大招 CG：齐天大圣定海神针 (`ult-wukong.mp4`)
> **Prompt (CN)**: 中国神话天宫背景，身披锁子黄金甲、头戴凤翅紫金冠的齐天大圣法相立于苍穹云海，高举擎天巨柱如意金箍棒轰然砸落，金色冲击波与烈焰席卷天地，极致巨物感与震撼粒子特效，竖屏 9:16。
