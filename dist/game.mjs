import { WORLD, createGame, startGame, pauseGame, resumeGame, setTarget, advanceGame, clamp, difficultyAt } from './game-core.mjs';
import { createChaosRenderer } from './chaos-render.mjs';

const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const chaosRenderer = createChaosRenderer(ctx);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let game = createGame(Date.now());
let ready = false;
let loading = false;
let atlas;
let drone;
let best = 0;
let soundEnabled = false;
let audio;
let feedbackUntil = 0;
let effects = [];
let clock = 0;
let previousTime;
let pointer = null;
let previousPointerX = 0;
let keys = new Set();
const bestStorageKey = `kangaroo-delivery-${WORLD.duration}s-chaos-v1-best`;
try { best = Math.max(0, Number(localStorage.getItem(bestStorageKey)) || 0); } catch {}
$('best').textContent = best;
document.querySelectorAll('[data-round-duration]').forEach(node => { node.textContent = WORLD.duration; });
$('time').textContent = WORLD.duration;
$('feedback').style.top = '87%';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(src));
    image.src = src;
  });
}

async function loadAssets() {
  if (loading) return;
  loading = true;
  $('start').disabled = true;
  $('start-label').textContent = '正在准备小广场…';
  $('load-error').hidden = true;
  try {
    [atlas, drone] = await Promise.all([loadImage('./assets/kangaroo-atlas.png'), loadImage('./assets/drone.png')]);
    ready = true;
    $('start-label').textContent = '开始接单';
  } catch {
    $('start-label').textContent = '点击重新加载';
    $('load-error').hidden = false;
  } finally { loading = false; $('start').disabled = false; }
}

function tone(frequency, duration, start = 0, gain = 0.045) {
  if (!soundEnabled || !audio) return;
  const oscillator = audio.createOscillator();
  const volume = audio.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  volume.gain.setValueAtTime(0, audio.currentTime + start);
  volume.gain.linearRampToValueAtTime(gain, audio.currentTime + start + 0.015);
  volume.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + duration);
  oscillator.connect(volume).connect(audio.destination);
  oscillator.start(audio.currentTime + start);
  oscillator.stop(audio.currentTime + start + duration);
}

function clearInput() {
  keys.clear();
  pointer = null;
  game = setTarget(game, game.player.x);
}

function begin() {
  if (!ready) { loadAssets(); return; }
  clearInput();
  game = startGame(game);
  chaosRenderer.reset();
  previousTime = performance.now();
  effects = [];
  feedbackUntil = 0;
  $('feedback').classList.remove('show');
  $('welcome').hidden = true;
  $('pause-panel').hidden = true;
  $('result').hidden = true;
  $('hud').hidden = false;
  $('pause').hidden = false;
  $('play-hint').hidden = false;
  if (soundEnabled) audio?.resume();
  updateHud();
}

function pause() {
  if (game.mode !== 'playing') return;
  game = pauseGame(game);
  previousTime = undefined;
  clearInput();
  $('pause-panel').hidden = false;
  $('pause').hidden = true;
  $('resume').focus({ preventScroll: true });
}

function resume() {
  if (game.mode !== 'paused') return;
  clearInput();
  game = resumeGame(game);
  previousTime = performance.now();
  $('pause-panel').hidden = true;
  $('pause').hidden = false;
  if (soundEnabled) audio?.resume();
}

function finish() {
  clearInput();
  const record = game.score > best;
  if (record) {
    best = game.score;
    try { localStorage.setItem(bestStorageKey, String(best)); } catch {}
  }
  $('best').textContent = best;
  $('final-score').textContent = game.score;
  $('final-caught').textContent = game.caught;
  $('final-perfect').textContent = game.perfect;
  $('final-combo').textContent = game.maxCombo;
  $('final-chaos').textContent = `奇遇 ${game.chaosStats.encounters} 次 · 躲过 ${game.chaosStats.dodged} 次 · 宝物 ${game.chaosStats.treasures} 件${game.chaosStats.shieldBlocks ? ` · 护盾挡住 ${game.chaosStats.shieldBlocks} 次` : ''}`;
  $('new-record').hidden = !record;
  $('result-title').textContent = game.caught >= 35 ? '金牌接箱员' : game.caught >= 18 ? '接单小能手' : '努力的小袋鼠';
  $('result').hidden = false;
  $('pause').hidden = true;
  $('play-hint').hidden = true;
  tone(523, 0.18); tone(659, 0.2, 0.15); tone(784, 0.35, 0.3);
  $('restart').focus({ preventScroll: true });
}

function updateHud() {
  $('score').textContent = game.score;
  const seconds = Math.ceil(WORLD.duration - game.elapsed);
  $('time').textContent = seconds;
  $('timer-ring').style.strokeDashoffset = 119.38 * game.elapsed / WORLD.duration;
  $('time').parentElement.classList.toggle('urgent', seconds <= 8);
  $('combo').textContent = `${game.shield ? '◇ ' : ''}${game.combo > 1 ? `${game.combo} 连击！` : game.combo === 1 ? '稳稳接住！' : '准备接单'}`;
  $('stage-label').textContent = difficultyAt(game.elapsed).name;
}

function handleEvents() {
  for (const event of game.events) {
    if (event.type === 'ended') { finish(); continue; }
    if (event.type.startsWith('special-')) {
      if (event.type === 'special-appear') continue;
      chaosRenderer.noteOutcome(event, clock);
      const messages = {
        'special-hit': `哎呀，${event.label}！${event.delta || ''}`,
        'special-dodge': '轻巧躲过，继续接单！',
        'special-reward': `${event.label} +${event.delta}${event.kind === 'wand' ? ' · 护盾到手' : ''}`,
        'special-shield': '护盾挡住啦，连击保住！',
        'special-missed': '宝物溜走啦，下次再接',
      };
      $('feedback').classList.toggle('miss', event.type === 'special-hit');
      $('feedback').textContent = messages[event.type];
      $('feedback').classList.add('show');
      feedbackUntil = clock + 1.2;
      if (event.type === 'special-reward' || event.type === 'special-shield') {
        tone(880, .15); tone(1175, .2, .12, .025);
      } else if (event.type === 'special-hit') tone(180, .15, 0, .025);
      continue;
    }
    const missed = event.type === 'miss';
    $('feedback').classList.toggle('miss', missed);
    $('feedback').textContent = missed ? '没关系，下一单加油' : event.type === 'perfect' ? `完美接单 +${event.delta}` : `稳稳接住 +${event.delta}`;
    $('feedback').classList.add('show');
    feedbackUntil = clock + 1.1;
    effects.push({ x: event.x, y: WORLD.catchY, age: 0, missed, type: event.type });
    if (missed) { tone(220, 0.12, 0, 0.02); }
    else { tone(event.type === 'perfect' ? 784 : 659, 0.15); tone(1046, 0.18, 0.1, 0.025); }
  }
}

$('start').addEventListener('click', begin);
$('restart').addEventListener('click', begin);
$('restart-pause').addEventListener('click', begin);
$('pause').addEventListener('click', pause);
$('resume').addEventListener('click', resume);
$('sound').addEventListener('click', async () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      audio ||= new Audio();
      await audio.resume();
    } catch { soundEnabled = false; }
  }
  $('sound').setAttribute('aria-pressed', String(soundEnabled));
  $('sound').setAttribute('aria-label', soundEnabled ? '关闭声音' : '开启声音');
  $('sound-waves').setAttribute('d', soundEnabled ? 'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14' : 'm16 9 6 6m0-6-6 6');
  if (soundEnabled) tone(659, 0.15);
});

const phone = document.querySelector('.phone');
function worldPointer(event) { return (event.clientX - phone.getBoundingClientRect().left) * WORLD.width / phone.getBoundingClientRect().width; }
phone.addEventListener('pointerdown', event => {
  if (game.mode !== 'playing' || event.target.closest('button,a') || event.clientY < phone.getBoundingClientRect().top + phone.clientHeight * 0.40) return;
  pointer = event.pointerId;
  previousPointerX = worldPointer(event);
  game = setTarget(game, game.player.x);
  phone.setPointerCapture(pointer);
  event.preventDefault();
});
phone.addEventListener('pointermove', event => {
  if (event.pointerId !== pointer || game.mode !== 'playing') return;
  const x = worldPointer(event);
  game = setTarget(game, game.player.target + x - previousPointerX);
  previousPointerX = x;
  event.preventDefault();
});
const release = event => { if (event.pointerId === pointer) pointer = null; };
phone.addEventListener('pointerup', release);
phone.addEventListener('pointercancel', release);
phone.addEventListener('lostpointercapture', release);
addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(event.key) && game.mode === 'playing') {
    event.preventDefault(); keys.add(event.key.toLowerCase());
  }
  if (event.key === 'Escape') { if (game.mode === 'playing') pause(); else if (game.mode === 'paused') resume(); }
});
addEventListener('keyup', event => { keys.delete(event.key.toLowerCase()); });
addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => {
  previousTime = undefined;
  if (document.hidden) pause();
});

function roundedRect(x, y, width, height, radius, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
}
function ellipse(x, y, rx, ry, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function line(x1, y1, x2, y2, color, width = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function cloud(x, y, size, alpha = 0.7) {
  ctx.save(); ctx.globalAlpha = alpha;
  ellipse(x, y, size, size * 0.22, '#fffdf6'); ellipse(x - size * 0.3, y - size * 0.12, size * 0.45, size * 0.3, '#fffdf6'); ellipse(x + size * 0.15, y - size * 0.2, size * 0.48, size * 0.4, '#fffdf6');
  ctx.restore();
}
function building(x, y, w, h, color, roof) {
  roundedRect(x, y, w, h, 4, color);
  roundedRect(x - 3, y - 4, w + 6, 8, 2, roof);
  for (let i = 0; i < Math.floor(w / 17); i++) for (let j = 0; j < Math.floor((h - 12) / 21); j++) roundedRect(x + 8 + i * 17, y + 12 + j * 21, 7, 10, 2, '#eef3e9bb');
}
function tree(x, y, scale = 1, color = '#b8cba1') {
  roundedRect(x - 3 * scale, y - 50 * scale, 6 * scale, 68 * scale, 2, '#b2b391');
  ellipse(x, y - 66 * scale, 27 * scale, 40 * scale, color);
  ellipse(x - 14 * scale, y - 48 * scale, 19 * scale, 27 * scale, color);
  ellipse(x + 12 * scale, y - 46 * scale, 22 * scale, 25 * scale, color);
  line(x, y - 22 * scale, x + 12 * scale, y - 45 * scale, '#a3b79288', 2 * scale);
}

function background(t) {
  const sky = ctx.createLinearGradient(0, 0, 0, 610);
  sky.addColorStop(0, '#dcefe9'); sky.addColorStop(0.68, '#f0f5e7'); sky.addColorStop(1, '#f6f4de');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 390, 760);
  const drift = reducedMotion ? 0 : Math.sin(t * 0.025) * 12;
  cloud(42 + drift, 212, 50, .55); cloud(330 - drift, 140, 39, .55); cloud(258 + drift, 336, 52, .6);
  ellipse(344, 303, 31, 31, '#f5e6a044');
  ctx.fillStyle = '#dce7d3'; ctx.beginPath(); ctx.moveTo(0, 474); ctx.bezierCurveTo(75, 446, 120, 466, 183, 445); ctx.bezierCurveTo(260, 422, 330, 456, 390, 443); ctx.lineTo(390, 600); ctx.lineTo(0, 600); ctx.fill();
  building(-12, 432, 55, 89, '#d1dfcf', '#c8d6c2'); building(40, 450, 46, 73, '#dae4cf', '#cdd9c0');
  building(94, 420, 43, 102, '#d9e4d5', '#cbd9c9'); building(142, 449, 38, 78, '#e3e8d6', '#d1dbc7');
  building(223, 438, 51, 92, '#dce4d0', '#cbd7bf'); building(279, 409, 62, 119, '#d4e0d1', '#c7d5c3'); building(347, 448, 54, 84, '#dfe6d3', '#cdd9c0');
  roundedRect(0, 514, 390, 98, 0, '#d6e2bd');
  ellipse(39, 541, 70, 21, '#c5d6aa'); ellipse(331, 539, 92, 20, '#c8d9ad');
  tree(22, 531, .95, '#b4c99e'); tree(361, 529, 1.15, '#b5c99c'); tree(323, 529, .69, '#c2d1a5');
  // A quiet bench at the edge of the little square.
  roundedRect(280, 537, 55, 6, 2, '#b5ba91'); roundedRect(278, 547, 58, 6, 2, '#b1b58b');
  line(287, 551, 284, 564, '#9fa783', 3); line(327, 551, 330, 564, '#9fa783', 3);
  roundedRect(0, 566, 390, 194, 0, '#ecebd5');
  roundedRect(0, 568, 390, 3, 0, '#faf7e4');
  const ground = ctx.createLinearGradient(0, 571, 0, 760); ground.addColorStop(0, '#f0ecd8'); ground.addColorStop(1, '#f5f1e0');
  ctx.fillStyle = ground; ctx.fillRect(0, 571, 390, 190);
  line(0, 650, 390, 650, '#e0dfc455'); line(0, 719, 390, 719, '#e0dfc455');
  line(113, 572, 88, 760, '#e0dfc455'); line(277, 572, 309, 760, '#e0dfc455');
  for (const [x, y] of [[14, 580], [365, 579], [49, 558], [238, 558]]) {
    line(x, y, x - 3, y - 7, '#aebe92', 1.2); line(x, y, x + 3, y - 9, '#aebe92', 1.2);
  }
  ellipse(58, 549, 2, 2, '#fbf6ce'); ellipse(65, 553, 2, 2, '#fbf6ce'); ellipse(245, 551, 2, 2, '#f5e4a1');
}

function drawBox(x, y, size = 31, rotation = 0, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.globalAlpha = alpha;
  roundedRect(-size / 2, -size * .35, size, size * .72, 3, '#e9bc43');
  ctx.fillStyle = '#f7d268'; ctx.beginPath(); ctx.moveTo(-size / 2, -size * .35); ctx.lineTo(-size * .25, -size * .53); ctx.lineTo(size * .55, -size * .53); ctx.lineTo(size / 2, -size * .35); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d6a636'; ctx.beginPath(); ctx.moveTo(size / 2, -size * .35); ctx.lineTo(size * .55, -size * .53); ctx.lineTo(size * .55, size * .22); ctx.lineTo(size / 2, size * .37); ctx.closePath(); ctx.fill();
  roundedRect(-size * .29, -size * .17, size * .53, size * .32, 2, '#fff8d9');
  ctx.fillStyle = '#a68d42'; ctx.font = `700 ${size * .13}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('热乎送达', -1, 0);
  line(0, -size * .52, 0, -size * .36, '#e7b943', 3);
  ctx.restore();
}

function drawDrone(x, y, t, scale = 1, direction = 1) {
  if (!drone) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const ratio = drone.width / drone.height;
  const width = 135;
  ctx.drawImage(drone, -width / 2, -width / ratio / 2, width, width / ratio);
  if (!reducedMotion) {
    ctx.globalAlpha = .15 + Math.sin(t * 60) * .06;
    ellipse(-47, -14, 21, 3, '#6a7973'); ellipse(47, -14, 21, 3, '#6a7973');
  }
  ctx.restore();
}

function drawCharacter(x, footY, t, emotion = 'idle', velocity = 0, facing = 1) {
  if (!atlas) return;
  const moving = Math.abs(velocity) > 3;
  let frame = 0;
  if (emotion === 'sad') frame = 5;
  else if (emotion === 'catch') frame = 3;
  else if (moving) frame = (facing > 0 ? 1 : 6) + (Math.floor(t * 10) % 2);
  else if (game.mode === 'ended') frame = 4;
  const bounce = reducedMotion ? 0 : moving ? Math.abs(Math.sin(t * 16)) * 3 : Math.sin(t * 2.5) * 1.1;
  const catchEffect = emotion === 'catch' && !reducedMotion ? Math.sin((game.player.emotionUntil - game.elapsed) * 16) * .045 : 0;
  ellipse(x + 1, footY + 1, moving ? 34 : 32, 7, '#aab08429');
  const sw = atlas.width / 4;
  const sh = atlas.height / 2;
  ctx.save(); ctx.translate(x, footY - bounce);
  ctx.rotate(reducedMotion ? 0 : clamp(velocity / WORLD.speed, -1, 1) * .035);
  ctx.scale(1 + catchEffect, 1 - catchEffect);
  ctx.drawImage(atlas, frame % 4 * sw, Math.floor(frame / 4) * sh, sw, sh, -67, -139, 134, 139);
  ctx.restore();
}

function drawDelivery(delivery, t) {
  const color = ['#7faaa0', '#c5a14f', '#a28eaf', '#85a15e'][delivery.lane ?? 0];
  function parcel(x, y, size = 31) {
    drawBox(x, y, size);
    ellipse(x, y - 17, 7, 7, color);
    ctx.fillStyle = '#fffdf4'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(delivery.id), x, y - 16.5);
  }
  const flyProgress = clamp(delivery.age / delivery.flyDuration, 0, 1);
  const flightEase = 1 - (1 - flyProgress) ** 3;
  const entryX = delivery.direction > 0 ? -90 : 480;
  let droneX = entryX + (delivery.x - entryX) * flightEase;
  let droneY = delivery.hoverY;
  const bob = reducedMotion ? 0 : Math.sin(t * 3 + delivery.id) * 2;
  const lower = clamp((delivery.age - delivery.flyDuration) / delivery.lowerDuration, 0, 1);
  const attachY = delivery.hoverY + 19;
  let parcelY = attachY + 26 + (WORLD.catchY - attachY - 26) * lower;
  if (delivery.resolved) {
    const since = delivery.age - delivery.resolvedAt;
    const departure = clamp(since / WORLD.departureDuration, 0, 1);
    droneX = delivery.x + delivery.direction * 480 * departure;
    droneY -= departure * 15;
    if (since < .10) {
      const ropeEnd = WORLD.catchY + (attachY - WORLD.catchY) * clamp(since / .10, 0, 1);
      line(droneX, droneY + 20, droneX, ropeEnd, `${color}88`, 1.1);
    }
  } else {
    const pulse = reducedMotion ? 1 : .75 + Math.sin(t * 4) * .15;
    ctx.save(); ctx.globalAlpha = pulse;
    ellipse(delivery.x, 638, 28, 9, `${color}22`);
    ctx.strokeStyle = `${color}bb`; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(delivery.x, 638, 28, 9, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = color; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(delivery.id), delivery.x, 638.5);
    ctx.restore();
    if (flyProgress >= 1) {
      line(delivery.x, attachY + bob, delivery.x, parcelY - 17, `${color}cc`, 1.2);
      parcel(delivery.x, parcelY);
    } else {
      parcel(droneX, droneY + 29, 25);
    }
  }
  drawDrone(droneX, droneY + bob, t, .70);
  if (!delivery.resolved) {
    ellipse(droneX + 40, droneY - 19, 8, 8, color);
    ctx.fillStyle = '#fffdf4'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(delivery.id), droneX + 40, droneY - 18.5);
  }
}

function drawEffects() {
  for (const effect of effects) {
    const progress = effect.age / .7;
    if (effect.missed) {
      drawBox(effect.x, WORLD.catchY + Math.min(1, effect.age / .25) * 76, 31, effect.age * .3, clamp(1 - effect.age / .6, 0, 1));
      continue;
    }
    ctx.save(); ctx.globalAlpha = 1 - progress;
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * Math.PI * 2;
      const radius = 12 + progress * 30;
      const x = effect.x + Math.cos(angle) * radius;
      const y = effect.y + Math.sin(angle) * radius - progress * 25;
      if (i % 2) ellipse(x, y, 2, 2, '#e6bf4a');
      else { line(x - 3, y, x + 3, y, '#b4bf77', 1.5); line(x, y - 3, x, y + 3, '#b4bf77', 1.5); }
    }
    if (effect.age < .5) drawBox(effect.x + (game.player.x - effect.x) * progress, effect.y + progress * 30, 31 * (1 - progress), 0, 1 - progress);
    ctx.restore();
  }
}

function render(t) {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  background(t);
  if (game.mode === 'ready') {
    chaosRenderer.drawPreview(t);
    const bob = reducedMotion ? 0 : Math.sin(t * 2) * 3;
    line(195, 354 + bob, 195, 454 + bob, '#85927daa', 1.1);
    drawDrone(195, 330 + bob, t, 1.12);
    drawBox(195, 472 + bob, 33);
    drawCharacter(195, 599, t);
    if (ready) {
      ctx.save(); ctx.fillStyle = '#879c74'; ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('热乎乎的外卖，马上就到', 195, 408); ctx.restore();
    }
  } else {
    const sorted = [...game.deliveries].sort((a, b) => a.hoverY - b.hoverY);
    sorted.forEach(delivery => drawDelivery(delivery, t));
    chaosRenderer.drawSpecials(game, t);
    drawCharacter(game.player.x, 649, t, game.player.emotion, game.player.velocity, game.player.facing);
    if (game.shield) chaosRenderer.drawShield(game.player.x, 649, t);
    chaosRenderer.drawReaction(game.player.x, 649, t);
    drawEffects();
  }
}

function tick(timestamp) {
  const dt = previousTime === undefined ? 0 : Math.max(0, (timestamp - previousTime) / 1000);
  previousTime = timestamp;
  if (game.mode === 'playing') {
    let remaining = dt;
    while (remaining > 0 && game.mode === 'playing') {
      const step = Math.min(remaining, .05);
      clock += step;
      const direction = Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));
      if (direction) game = setTarget(game, game.player.x + direction * WORLD.speed * step);
      game = advanceGame(game, step);
      handleEvents();
      effects = effects.map(effect => ({ ...effect, age: effect.age + step })).filter(effect => effect.age < .7);
      remaining -= step;
    }
    updateHud();
  } else if (game.mode !== 'paused') {
    clock += dt;
    if (game.mode === 'ended') effects = effects.map(effect => ({ ...effect, age: effect.age + dt })).filter(effect => effect.age < .7);
  }
  if (clock > feedbackUntil) $('feedback').classList.remove('show');
  render(clock);
  requestAnimationFrame(tick);
}

loadAssets();
requestAnimationFrame(tick);
