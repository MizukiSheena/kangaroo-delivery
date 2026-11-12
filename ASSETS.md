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
