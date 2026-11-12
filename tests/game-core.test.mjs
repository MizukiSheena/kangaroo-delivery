import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD, createGame, startGame, pauseGame, resumeGame, setTarget,
  advanceGame, difficultyAt, catchGrade, createDelivery, moveToward,
} from '../dist/game-core.mjs';

function playing(seed = 42) {
  return startGame(createGame(seed));
}

function dueDelivery(game, x, extra = {}) {
  return {
    ...game,
    nextDeliveryAt: Infinity,
    deliveries: [{
      id: 99, x, age: 3.99, flyDuration: 0.75, lowerDuration: 3.25,
      hoverY: 157, direction: 1, resolved: false, outcome: null,
      resolvedAt: null, ...extra,
    }],
  };
}

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freezeDeep);
  }
  return value;
}

test('a fresh round is ready, and starting resets every result counter', () => {
  const initial = createGame(77);
  assert.equal(initial.mode, 'ready');
  const restarted = startGame({ ...initial, score: 500, combo: 8, caught: 12, elapsed: 60 });
  assert.equal(restarted.mode, 'playing');
  assert.equal(restarted.elapsed, 0);
  assert.equal(restarted.score, 0);
  assert.equal(restarted.combo, 0);
  assert.equal(restarted.caught, 0);
  assert.equal(restarted.deliveries.length, 0);
  assert.equal(restarted.seed, 77);
});

test('movement responds in both directions, obeys speed and never overshoots', () => {
  const left = advanceGame(setTarget(playing(), -500), 0.1);
  assert.equal(left.player.x, 195 - WORLD.speed * 0.1);
  assert.equal(left.player.facing, -1);
  const atLeft = advanceGame(left, 1);
  assert.equal(atLeft.player.x, WORLD.minX);
  assert.equal(atLeft.player.target, WORLD.minX);
  const right = advanceGame(setTarget(atLeft, 10000), 1);
  assert.equal(right.player.x, WORLD.maxX);
  assert.equal(right.player.facing, 1);
  assert.equal(moveToward(0, 5, 20), 5);
  assert.equal(moveToward(5, 0, 20), 0);
});

test('a pointer target alone never teleports the player', () => {
  const before = playing();
  const targeted = setTarget(before, 300);
  assert.equal(targeted.player.x, before.player.x);
  assert.equal(targeted.player.target, 300);
  const moved = advanceGame(targeted, 1 / 60);
  assert.ok(moved.player.x > before.player.x);
  assert.ok(moved.player.x < 300);
});

test('invalid pointer coordinates are ignored', () => {
  const state = playing();
  for (const x of [NaN, Infinity, -Infinity, undefined, '200']) {
    assert.deepEqual(setTarget(state, x), state);
  }
});

test('catch grading is symmetric with inclusive perfect and normal boundaries', () => {
  for (const direction of [-1, 1]) {
    assert.equal(catchGrade(direction * 16), 'perfect');
    assert.equal(catchGrade(direction * 16.001), 'good');
    assert.equal(catchGrade(direction * 44), 'good');
    assert.equal(catchGrade(direction * 44.001), 'miss');
  }
});

test('a perfectly aligned box scores and emits one catch event', () => {
  const result = advanceGame(dueDelivery(playing(), 195), 0.02);
  assert.equal(result.caught, 1);
  assert.equal(result.perfect, 1);
  assert.equal(result.score, 20);
  assert.equal(result.combo, 1);
  assert.equal(result.player.emotion, 'catch');
  assert.deepEqual(result.events.map(event => event.type), ['perfect']);
  assert.equal(result.deliveries[0].outcome, 'perfect');
});

test('a forgiving off-centre catch still scores, without a perfect award', () => {
  const result = advanceGame(dueDelivery(playing(), 225), 0.02);
  assert.equal(result.caught, 1);
  assert.equal(result.perfect, 0);
  assert.equal(result.score, 10);
  assert.equal(result.events[0].type, 'good');
});

test('a missed box only breaks the combo and leaves the round playable', () => {
  const state = { ...playing(), score: 70, caught: 4, perfect: 2, combo: 4, maxCombo: 4 };
  const result = advanceGame(dueDelivery(state, 300), 0.02);
  assert.equal(result.mode, 'playing');
  assert.equal(result.score, 70);
  assert.equal(result.caught, 4);
  assert.equal(result.combo, 0);
  assert.equal(result.maxCombo, 4);
  assert.equal(result.missed, 1);
  assert.equal(result.player.emotion, 'sad');
  assert.equal(result.events[0].type, 'miss');
});

test('the next successful catch recovers after a miss', () => {
  const missed = advanceGame(dueDelivery(playing(), 300), 0.02);
  const recovered = advanceGame(dueDelivery(missed, 195), 0.02);
  assert.equal(recovered.combo, 1);
  assert.equal(recovered.missed, 1);
  assert.equal(recovered.caught, 1);
  assert.equal(recovered.player.emotion, 'catch');
});

test('a fifth catch grants a combo bonus and records the best streak', () => {
  const state = { ...playing(), combo: 4, maxCombo: 4, score: 80, caught: 4, perfect: 4 };
  const result = advanceGame(dueDelivery(state, 195), 0.02);
  assert.equal(result.combo, 5);
  assert.equal(result.maxCombo, 5);
  assert.equal(result.score, 105);
  assert.equal(result.events[0].delta, 25);
});

test('resolved boxes cannot score twice and leave after their exit animation', () => {
  const caught = advanceGame(dueDelivery(playing(), 195), 0.02);
  const next = advanceGame(caught, 0.5);
  assert.equal(next.caught, 1);
  assert.equal(next.score, 20);
  assert.deepEqual(next.events, []);
  const cleared = advanceGame(next, 0.8);
  assert.equal(cleared.deliveries.length, 0);
});

test('pause freezes time, player, deliveries and scoring, and resume continues', () => {
  const live = dueDelivery(setTarget(playing(), 300), 195);
  const paused = pauseGame(live);
  const waited = advanceGame(paused, 20);
  assert.equal(waited.mode, 'paused');
  assert.equal(waited.elapsed, live.elapsed);
  assert.deepEqual(waited.player, live.player);
  assert.deepEqual(waited.deliveries, live.deliveries);
  assert.equal(waited.score, live.score);
  const resumed = advanceGame(resumeGame(waited), 0.02);
  assert.equal(resumed.mode, 'playing');
  assert.ok(resumed.elapsed > live.elapsed);
  assert.ok(resumed.player.x > live.player.x);
  assert.equal(resumed.caught, 1);
});

test('ready and ended rounds do not run, and only playing can be paused', () => {
  const ready = createGame();
  assert.deepEqual(advanceGame(ready, 30), ready);
  assert.deepEqual(pauseGame(ready), ready);
  assert.deepEqual(resumeGame(ready), ready);
  const ended = { ...playing(), mode: 'ended', elapsed: 60 };
  assert.deepEqual(advanceGame(ended, 30), ended);
  assert.deepEqual(pauseGame(ended), ended);
  assert.deepEqual(resumeGame(ended), ended);
});

test('invalid frame deltas cannot poison or advance the simulation', () => {
  const state = playing();
  for (const dt of [0, -1, NaN, Infinity, -Infinity, undefined, '1']) {
    assert.deepEqual(advanceGame(state, dt), state);
  }
});

test('a catch exactly at the deadline counts before one end event', () => {
  const state = dueDelivery({ ...playing(), elapsed: 59.99 }, 195);
  const result = advanceGame(state, 0.1);
  assert.equal(result.elapsed, WORLD.duration);
  assert.equal(result.mode, 'ended');
  assert.equal(result.caught, 1);
  assert.equal(result.player.velocity, 0);
  assert.deepEqual(result.events.map(event => event.type), ['perfect', 'ended']);
  assert.deepEqual(advanceGame(result, 1).events, []);
});

test('a box due after 60 seconds cannot be scored by an oversize final frame', () => {
  const state = dueDelivery({ ...playing(), elapsed: 59.99 }, 195, { age: 3.95 });
  const result = advanceGame(state, 10);
  assert.equal(result.elapsed, 60);
  assert.equal(result.caught, 0);
  assert.equal(result.score, 0);
  assert.deepEqual(result.events.map(event => event.type), ['ended']);
});

test('difficulty changes at the agreed boundaries and makes deliveries denser', () => {
  const stages = [0, 15, 35, 50].map(difficultyAt);
  assert.deepEqual(stages.map(stage => stage.stage), [0, 1, 2, 3]);
  assert.equal(difficultyAt(14.999).stage, 0);
  assert.equal(difficultyAt(34.999).stage, 1);
  assert.equal(difficultyAt(49.999).stage, 2);
  for (let index = 1; index < stages.length; index += 1) {
    assert.ok(stages[index].interval < stages[index - 1].interval);
    assert.ok(stages[index].lowerDuration < stages[index - 1].lowerDuration);
  }
});

test('seeded deliveries are repeatable, use distinct IDs and stay reachable', () => {
  let left = playing(104);
  let right = playing(104);
  for (let index = 0; index < 100; index += 1) {
    const previous = left.lastDropX;
    left = createDelivery({ ...left, elapsed: (index % 4) * 17 });
    right = createDelivery({ ...right, elapsed: (index % 4) * 17 });
    assert.deepEqual(left, right);
    const delivery = left.deliveries.at(-1);
    assert.equal(delivery.id, index + 1);
    assert.ok(delivery.x >= WORLD.minX && delivery.x <= WORLD.maxX);
    assert.ok(Math.abs(delivery.x - previous) >= 52);
    assert.ok(Math.abs(delivery.x - previous) / WORLD.speed + 0.25 < difficultyAt(left.elapsed).interval);
    if (index) assert.notEqual(delivery.hoverY, left.deliveries.at(-2).hoverY);
  }
});

test('normal-frame play can catch every order across multiple random rounds', () => {
  for (const seed of [0, 1, 42, 12345, 0xffffffff]) {
    let state = playing(seed);
    let maxUnresolved = 0;
    let lateOverlap = false;
    const seen = new Set();
    for (let frame = 0; state.mode === 'playing' && frame < 3700; frame += 1) {
      const pending = state.deliveries.find(delivery => !delivery.resolved);
      if (pending) state = setTarget(state, pending.x);
      state = advanceGame(state, 1 / 60);
      state.deliveries.forEach(delivery => seen.add(delivery.id));
      const unresolved = state.deliveries.filter(delivery => !delivery.resolved).length;
      maxUnresolved = Math.max(maxUnresolved, unresolved);
      if (state.elapsed >= 35 && unresolved === 2) lateOverlap = true;
    }
    assert.equal(state.mode, 'ended', `seed ${seed} must finish`);
    assert.equal(state.missed, 0, `seed ${seed} must be physically completable`);
    assert.equal(state.perfect, state.caught, `seed ${seed} should allow precise alignment`);
    assert.equal(state.caught, seen.size, `seed ${seed} should not leave unfinishable orders`);
    assert.ok(state.caught >= 15, `seed ${seed} should contain a full round of orders`);
    assert.ok(maxUnresolved <= 2, 'at most two orders should require attention');
    assert.ok(lateOverlap, 'the busy phase should have staggered concurrent deliveries');
  }
});

test('new deliveries do not age during time before their scheduled arrival', () => {
  const state = playing();
  const result = advanceGame(state, state.nextDeliveryAt);
  assert.equal(result.deliveries.length, 1);
  assert.ok(result.deliveries[0].age < 1e-9, 'a just-spawned drone must start its approach at age zero');
});

test('core transitions do not mutate their input or nested state', () => {
  const state = freezeDeep(dueDelivery(playing(), 195));
  const snapshot = structuredClone(state);
  assert.doesNotThrow(() => advanceGame(state, 0.02));
  assert.doesNotThrow(() => setTarget(state, 100));
  assert.doesNotThrow(() => createDelivery(state));
  assert.deepEqual(state, snapshot);
});
