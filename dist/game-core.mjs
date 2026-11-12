export const WORLD = Object.freeze({ width: 390, height: 760, duration: 60, minX: 43, maxX: 347, speed: 340, catchY: 559 });
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const moveToward = (from, to, distance) => from + clamp(to - from, -distance, distance);

export function difficultyAt(elapsed) {
  if (elapsed < 15) return { name: '慢慢来，接稳就好', interval: 4.5, lowerDuration: 3.3, stage: 0 };
  if (elapsed < 35) return { name: '来单啦，小跑起来', interval: 3.3, lowerDuration: 2.8, stage: 1 };
  if (elapsed < 50) return { name: '忙得过来，再接一单', interval: 2.5, lowerDuration: 2.45, stage: 2 };
  return { name: '最后几单，加油加油！', interval: 1.95, lowerDuration: 2.1, stage: 3 };
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
  return {
    mode: 'ready', elapsed: 0, score: 0, combo: 0, maxCombo: 0, caught: 0, perfect: 0, missed: 0,
    player: { x: 195, target: 195, facing: 1, velocity: 0, emotion: 'idle', emotionUntil: 0 },
    deliveries: [], nextDeliveryAt: 0.8, nextId: 1, lastDropX: 195, seed: seed >>> 0, events: [],
  };
}

export function startGame(game) { return { ...createGame(game.seed), mode: 'playing' }; }
export function pauseGame(game) { return game.mode === 'playing' ? { ...game, mode: 'paused', events: [] } : game; }
export function resumeGame(game) { return game.mode === 'paused' ? { ...game, mode: 'playing', events: [] } : game; }
export function setTarget(game, x) {
  if (!Number.isFinite(x)) return game;
  return { ...game, player: { ...game.player, target: clamp(x, WORLD.minX, WORLD.maxX) } };
}

export function createDelivery(game) {
  const [seed, value] = random(game.seed);
  const level = difficultyAt(game.elapsed);
  const direction = value > 0.5 ? 1 : -1;
  const span = 70 + Math.abs(value - 0.5) * 160;
  let x = clamp(game.lastDropX + direction * span, 58, 332);
  if (Math.abs(x - game.lastDropX) < 52) x = clamp(game.lastDropX - direction * span, 58, 332);
  const delivery = {
    id: game.nextId, x, age: 0, lowerDuration: level.lowerDuration, flyDuration: 0.75,
    hoverY: game.nextId % 2 ? 190 : 266, direction: game.nextId % 2 ? 1 : -1,
    resolved: false, outcome: null, resolvedAt: null,
  };
  return { ...game, seed, nextId: game.nextId + 1, lastDropX: x,
    nextDeliveryAt: game.elapsed + level.interval, deliveries: [...game.deliveries, delivery] };
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
  if (next.elapsed >= next.nextDeliveryAt && next.elapsed < 56.5) {
    const spawnAt = next.nextDeliveryAt;
    next = createDelivery(next);
    next.deliveries.at(-1).age = -Math.min(step, Math.max(0, spawnAt - game.elapsed));
  }
  for (const delivery of next.deliveries) {
    delivery.age += step;
    if (!delivery.resolved && delivery.age + 1e-9 >= delivery.flyDuration + delivery.lowerDuration) {
      const grade = catchGrade(next.player.x - delivery.x);
      delivery.resolved = true;
      delivery.outcome = grade;
      delivery.resolvedAt = delivery.age;
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
        next.player.emotionUntil = next.elapsed + 0.65;
        next.events.push({ type: grade, x: delivery.x, id: delivery.id, delta, combo: next.combo });
      }
    }
  }
  next.deliveries = next.deliveries.filter(d => !d.resolved || d.age - d.resolvedAt < 1.2);
  if (next.elapsed >= WORLD.duration) { next.mode = 'ended'; next.player.velocity = 0; next.events.push({ type: 'ended' }); }
  return next;
}
