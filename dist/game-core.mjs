export const WORLD = Object.freeze({ width: 390, height: 760, duration: 30, minX: 43, maxX: 347, speed: 520, catchY: 559, flyDuration: 0.5, departureDuration: 0.16, maxConcurrent: 4 });
export const DELIVERY_LANES = Object.freeze([260, 320, 380, 440]);
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const moveToward = (from, to, distance) => from + clamp(to - from, -distance, distance);

export function difficultyAt(elapsed) {
  if (elapsed < 5) return { name: '先接稳，慢慢熟悉', interval: 1.4, lowerDuration: 1.5, stage: 0 };
  if (elapsed < 12) return { name: '接几单，看看天空', interval: 0.9, lowerDuration: 1.4, stage: 1 };
  if (elapsed < 22) return { name: '忙一会儿，惊喜在路上', interval: 0.6, lowerDuration: 1.2, stage: 2 };
  return { name: '最后一波，小短腿加油', interval: 0.45, lowerDuration: 1, stage: 3 };
}

export function nextDeliverySlot(elapsed, specialSchedule = []) {
  let slot = elapsed;
  for (const special of specialSchedule) {
    if (slot + 1e-9 < special.quietFrom || slot >= special.quietUntil - 1e-9) continue;
    slot = slot <= special.deliverySlotAt + 1e-9 ? special.deliverySlotAt : special.quietUntil;
  }
  return slot;
}

export function encounterWindowAt(elapsed, specialSchedule = []) {
  return specialSchedule.find(special => elapsed >= special.quietFrom && elapsed < special.quietUntil) ?? null;
}

export function catchGrade(distance) {
  const d = Math.abs(distance);
  return d <= 16 ? 'perfect' : d <= 44 ? 'good' : 'miss';
}

function random(seed) {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [next, next / 4294967296];
}

export function createGame(seed = 12345) {
  const schedule = createChaosSchedule(seed);
  const state = {
    mode: 'ready', elapsed: 0, score: 0, combo: 0, maxCombo: 0, caught: 0, perfect: 0, missed: 0,
    player: { x: 195, target: 195, facing: 1, velocity: 0, emotion: 'idle', emotionUntil: 0 },
    deliveries: [], nextDeliveryAt: 0.35, nextId: 1, lastDropX: 195, lastDeadline: 0, seed: seed >>> 0, events: [],
    specialSchedule: schedule.specialSchedule,
  };
  const deliveryForecast = [];
  let forecast = { ...state };
  while (Number.isFinite(forecast.nextDeliveryAt) && deliveryForecast.length < 64) {
    const previousId = forecast.nextId;
    forecast = createDelivery({ ...forecast, elapsed: forecast.nextDeliveryAt });
    if (forecast.nextId !== previousId) deliveryForecast.push(forecast.deliveries.at(-1));
  }
  return { ...state, deliveryForecast, ...createChaosState(seed, deliveryForecast, schedule) };
}

export function startGame(game) { return { ...createGame(game.seed), mode: 'playing' }; }
export function pauseGame(game) { return game.mode === 'playing' ? { ...game, mode: 'paused', events: [] } : game; }
export function resumeGame(game) { return game.mode === 'paused' ? { ...game, mode: 'playing', events: [] } : game; }
export function setTarget(game, x) {
  if (!Number.isFinite(x)) return game;
  return { ...game, player: { ...game.player, target: clamp(x, WORLD.minX, WORLD.maxX) } };
}

export function createDelivery(game) {
  const slot = nextDeliverySlot(game.elapsed, game.specialSchedule);
  if (slot > game.elapsed + 1e-9) return { ...game, nextDeliveryAt: slot };
  const deadlineFor = delivery => delivery.deadline ?? game.elapsed - delivery.age + delivery.flyDuration + delivery.lowerDuration;
  const occupiedLanes = new Set(game.deliveries.filter(d => deadlineFor(d) + WORLD.departureDuration > game.elapsed + 1e-9).map(d => d.lane));
  const preferredLane = (game.nextId - 1) % DELIVERY_LANES.length;
  const lane = Array.from({ length: DELIVERY_LANES.length }, (_, offset) => (preferredLane + offset) % DELIVERY_LANES.length).find(index => !occupiedLanes.has(index));
  if (lane === undefined || game.deliveries.filter(d => deadlineFor(d) > game.elapsed + 1e-9).length >= WORLD.maxConcurrent) return { ...game, nextDeliveryAt: game.elapsed + 0.03 };
  const [seed, value] = random(game.seed);
  const level = difficultyAt(game.elapsed);
  const showcase = game.specialSchedule?.some(special => Math.abs(special.deliverySlotAt - game.elapsed) < 1e-8) ?? false;
  const lowerDuration = showcase ? 0.75 : level.lowerDuration;
  const deadline = Math.max(game.elapsed + WORLD.flyDuration + lowerDuration, game.lastDeadline + 0.28);
  if (deadline > WORLD.duration - 0.1) return { ...game, nextDeliveryAt: Infinity };
  const direction = value > 0.5 ? 1 : -1;
  const travelBudget = Math.max(0.05, deadline - game.lastDeadline - 0.12);
  const maxSpan = Math.min(165, WORLD.speed * travelBudget);
  const minSpan = Math.min(52, maxSpan * 0.55);
  const span = minSpan + Math.abs(value - 0.5) * 2 * (maxSpan - minSpan);
  let x = clamp(game.lastDropX + direction * span, 58, 332);
  if (Math.abs(x - game.lastDropX) < minSpan) x = clamp(game.lastDropX - direction * span, 58, 332);
  const delivery = {
    id: game.nextId, x, age: 0, spawnedAt: game.elapsed, deadline, lane, showcase,
    lowerDuration: deadline - game.elapsed - WORLD.flyDuration, flyDuration: WORLD.flyDuration,
    hoverY: DELIVERY_LANES[lane], direction: game.nextId % 2 ? 1 : -1,
    resolved: false, outcome: null, resolvedAt: null,
  };
  return { ...game, seed, nextId: game.nextId + 1, lastDropX: x, lastDeadline: deadline,
    nextDeliveryAt: nextDeliverySlot(game.elapsed + level.interval, game.specialSchedule), deliveries: [...game.deliveries, delivery] };
}

export function advanceGame(game, dt) {
  if (game.mode !== 'playing' || !Number.isFinite(dt) || dt <= 0) return { ...game, events: [] };
  const step = Math.min(dt, WORLD.duration - game.elapsed);
  let next = { ...game, elapsed: Math.min(WORLD.duration, game.elapsed + step),
    player: { ...game.player }, deliveries: game.deliveries.map(d => ({ ...d })), events: [] };
  const previousX = next.player.x;
  next.player.x = moveToward(previousX, next.player.target, WORLD.speed * step);
  next.player.velocity = (next.player.x - previousX) / step;
  if (Math.abs(next.player.velocity) > 1) next.player.facing = Math.sign(next.player.velocity);
  if (next.player.emotionUntil <= next.elapsed) next.player.emotion = 'idle';
  if (next.elapsed >= next.nextDeliveryAt) {
    const spawnAt = Math.max(game.elapsed, next.nextDeliveryAt);
    const previousId = next.nextId;
    const elapsed = next.elapsed;
    next = { ...createDelivery({ ...next, elapsed: spawnAt }), elapsed };
    if (next.nextId !== previousId) next.deliveries.at(-1).age = -Math.min(step, Math.max(0, spawnAt - game.elapsed));
  }
  for (const delivery of next.deliveries) {
    delivery.age += step;
    if (!delivery.resolved && delivery.age + 1e-9 >= delivery.flyDuration + delivery.lowerDuration) {
      const grade = catchGrade(next.player.x - delivery.x);
      delivery.resolved = true;
      delivery.outcome = grade;
      delivery.resolvedAt = delivery.flyDuration + delivery.lowerDuration;
      if (grade === 'miss') {
        next.missed += 1;
        next.combo = 0;
        next.player.emotion = 'sad';
        next.player.emotionUntil = next.elapsed + 0.8;
        next.events.push({ type: 'miss', x: delivery.x, id: delivery.id });
      } else {
        next.combo += 1;
        next.caught += 1;
        if (grade === 'perfect') next.perfect += 1;
        next.maxCombo = Math.max(next.maxCombo, next.combo);
        const delta = (grade === 'perfect' ? 20 : 10) + Math.min(20, Math.floor(next.combo / 5) * 5);
        next.score += delta;
        next.player.emotion = 'catch';
        next.player.emotionUntil = next.elapsed + 0.22;
        next.events.push({ type: grade, x: delivery.x, id: delivery.id, delta, combo: next.combo });
      }
    }
  }
  next.deliveries = next.deliveries.filter(d => !d.resolved || d.age - d.resolvedAt < WORLD.departureDuration);
  next = advanceSpecials(next, game.elapsed, previousX, WORLD.speed);
  if (next.elapsed >= WORLD.duration) { next.mode = 'ended'; next.shield = false; next.player.velocity = 0; next.events.push({ type: 'ended' }); }
  return next;
}
import { createChaosSchedule, createChaosState, advanceSpecials } from './chaos-core.mjs';

