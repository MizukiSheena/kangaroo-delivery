# 素材记录

使用内置 imagegen 工具生成透明游戏素材，原始参考图保留在上级 `素材/` 目录。背景、箱子、绳索和粒子均由 Canvas 实时绘制。

## 袋鼠动作图集

项目文件：`dist/assets/kangaroo-atlas.png`。参考：`../素材/袋鼠素材.png`。请求真实透明背景。

完整提示词：

> Create a clean transparent PNG game sprite atlas using the EXACT yellow chubby kangaroo character from the reference. Preserve its long yellow ears, big red round nose, tiny eyes, pale round belly, tiny feet and clay 3D style. Exactly 8 full-body poses in a regular 4 column by 2 row grid, equal cells and consistent scale and foot baseline. Row 1: idle front 3/4; run right stride A; run right stride B; hands raised to catch. Row 2: happy waving; sad with drooping ears; run left stride A; run left stride B. Every pose isolated with transparent margins. Genuine alpha transparency, no background, no floor, no checkerboard, no text, no props, no cast shadow. Wide 2:1 aspect ratio atlas. This is an identity-preserving edit/reference extraction, keep the provided mascot's appearance.

## 无人机

项目文件：`dist/assets/drone.png`。参考：`../素材/无人机素材.png`。请求真实透明背景。

完整提示词：

> Use case: background-extraction. Game asset edit target is the attached yellow and black delivery drone. Isolate the SINGLE exact reference drone on true alpha transparent background. Preserve its yellow central body, black arms and rotor layout, reference perspective and silhouette. Remove white/gray background, cast floor shadow, watermark markings, and yellow decorative shapes at bottom-left. Remove the white delivery cargo box in the undercarriage so it can be rendered as a separate game object suspended below. Keep the drone's undercarriage and black landing structure. Center the whole drone, no clipping, tight usable framing with about 5% transparent margin. No text, no new objects, no rope. High quality clean edges.

## 无厘头奇遇角色与道具

实际交付为 `dist/chaos-render.mjs` 中的 Canvas 绘图：墨镜飞行员鸽子、香蕉小超人、打嗝小龙、迷糊仙女，以及鸟粪、香蕉皮、龙鳞、魔法棒、红内裤、马桶搋子。程序绘图可直接缩放与播放动作，没有新增图片依赖。原袋鼠与无人机 PNG 保留。

曾使用内置 imagegen 工具尝试生成透明角色动作图集，三次均因网络错误失败，没有可用的新 PNG；未使用需要 API 密钥的 CLI 方式。最后一次尝试仅以现有袋鼠图集作为材质风格参考，提示词记录如下，供之后重新生成时使用（不是当前交付图形的生成方式）：

> Use the attached kangaroo sprites ONLY as reference for warm soft clay 3D material and playful toy aesthetic, DO NOT draw any kangaroo. Create a new true transparent alpha sprite sheet of four different funny airborne characters. Precise 4 columns by 2 rows, 8 equal square cells, 2:1 wide sheet. Every subject full body, facing right, well within its cell with transparent padding. Column 1: plump grey pigeon wearing aviator sunglasses and tiny pilot helmet. Column 2: generic original superhero in plain blue suit with red cape eating a banana, no logo. Column 3: plump mint-green baby dragon with gold horns and peach belly. Column 4: lavender fairy with bun hairstyle and little wings holding a star wand. Top row normal flying pose. Bottom row funny reaction: pigeon smug wink, superhero surprised holding red underpants, dragon hiccups a tiny pink heart, fairy confused holding a red rubber toilet plunger. Consistent cute expressive faces, clear readable silhouettes, soft warm lighting and clean 3D clay shading. Truly transparent background. No floor, no background, no text, no grids, no labels, no watermark. Exactly eight separated sprites.
