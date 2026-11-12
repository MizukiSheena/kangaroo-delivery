import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD, DELIVERY_LANES, createGame, startGame, pauseGame, resumeGame, setTarget,
  advanceGame, difficultyAt, catchGrade, createDelivery, moveToward,
} from '../dist/game-core.mjs';

function playing(seed = 42) {
  return startGame(createGame(seed));
}

function dueDelivery(game, x, extra = {}) {
  const lowerDuration = difficultyAt(game.elapsed).lowerDuration;
  return {
    ...game,
    specialPlan: [], specials: [], nextSpecialIndex: 0,
    nextDeliveryAt: Infinity,
    deliveries: [{
      id: 99, x, age: WORLD.flyDuration + lowerDuration - 0.01,
      flyDuration: WORLD.flyDuration, lowerDuration,
      lane: 0, hoverY: DELIVERY_LANES[0], direction: 1, resolved: false, outcome: null,
      spawnedAt: game.elapsed - WORLD.flyDuration - lowerDuration + 0.01,
      deadline: game.elapsed + 0.01,
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
  const restarted = startGame({ ...initial, score: 500, combo: 8, caught: 12, elapsed: WORLD.duration });
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
  const next = advanceGame(caught, WORLD.departureDuration / 2);
  assert.equal(next.caught, 1);
  assert.equal(next.score, 20);
  assert.deepEqual(next.events, []);
  assert.equal(next.deliveries.length, 1);
  const cleared = advanceGame(next, WORLD.departureDuration);
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
  const ended = { ...playing(), mode: 'ended', elapsed: WORLD.duration };
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
  const state = dueDelivery({ ...playing(), elapsed: WORLD.duration - 0.01 }, 195);
  const result = advanceGame(state, 0.1);
  assert.equal(result.elapsed, WORLD.duration);
  assert.equal(result.mode, 'ended');
  assert.equal(result.caught, 1);
  assert.equal(result.player.velocity, 0);
  assert.deepEqual(result.events.map(event => event.type), ['perfect', 'ended']);
  assert.deepEqual(advanceGame(result, 1).events, []);
});

test('a box due after the round cannot be scored by an oversize final frame', () => {
  const state = dueDelivery({ ...playing(), elapsed: WORLD.duration - 0.01 }, 195);
  state.deliveries[0].age -= 0.04;
  state.deliveries[0].deadline += 0.04;
  const result = advanceGame(state, 10);
  assert.equal(result.elapsed, WORLD.duration);
  assert.equal(result.caught, 0);
  assert.equal(result.score, 0);
  assert.deepEqual(result.events.map(event => event.type), ['ended']);
});

test('difficulty changes at the agreed boundaries and makes deliveries denser', () => {
  const stages = [0, 5, 12, 22].map(difficultyAt);
  assert.deepEqual(stages.map(stage => stage.stage), [0, 1, 2, 3]);
  assert.equal(difficultyAt(4.999).stage, 0);
  assert.equal(difficultyAt(11.999).stage, 1);
  assert.equal(difficultyAt(21.999).stage, 2);
  for (let index = 1; index < stages.length; index += 1) {
    assert.ok(stages[index].interval < stages[index - 1].interval);
    assert.ok(stages[index].lowerDuration < stages[index - 1].lowerDuration);
  }
});

test('seeded deliveries are repeatable, use distinct IDs and stay reachable', () => {
  let left = playing(104);
  let right = playing(104);
  for (let index = 0; index < 40; index += 1) {
    const previous = left.lastDropX;
    const previousDeadline = left.lastDeadline;
    left = createDelivery({ ...left, elapsed: index * 0.6, deliveries: [] });
    right = createDelivery({ ...right, elapsed: index * 0.6, deliveries: [] });
    assert.deepEqual(left, right);
    const delivery = left.deliveries.at(-1);
    assert.equal(delivery.id, index + 1);
    assert.ok(delivery.x >= WORLD.minX && delivery.x <= WORLD.maxX);
    assert.ok(Math.abs(delivery.x - previous) > 0);
    assert.ok(Math.abs(delivery.x - previous) / WORLD.speed + 0.12 <= delivery.deadline - previousDeadline + 1e-9);
    assert.equal(delivery.hoverY, DELIVERY_LANES[delivery.lane]);
    assert.ok(delivery.deadline - previousDeadline >= 0.28 - 1e-9);
  }
});

test('100 seeded 30-second rounds stay fair while reaching four simultaneous orders', () => {
  assert.equal(WORLD.duration, 30, 'the requested round length is 30 seconds');
  const telemetry = [];
  for (let seed = 0; seed < 100; seed += 1) {
    let state = playing(seed);
    let maxUnresolved = 0;
    let lateMaxUnresolved = 0;
    let lastDeadline = 0;
    let lastStage = 0;
    const seen = new Map();
    for (let frame = 0; state.mode === 'playing' && frame < WORLD.duration * 60 + 10; frame += 1) {
      const pending = state.deliveries.filter(delivery => !delivery.resolved).sort((a, b) => a.deadline - b.deadline)[0];
      if (pending) state = setTarget(state, pending.x);
      state = advanceGame(state, 1 / 60);
      const stage = difficultyAt(state.elapsed).stage;
      assert.ok(stage >= lastStage, `seed ${seed} difficulty must never go backwards`);
      lastStage = stage;
      const occupied = new Set();
      for (const delivery of state.deliveries) {
        assert.ok(!occupied.has(delivery.lane), `seed ${seed} must never display two drones in one lane`);
        occupied.add(delivery.lane);
        assert.equal(delivery.hoverY, DELIVERY_LANES[delivery.lane]);
        assert.ok(delivery.x >= WORLD.minX && delivery.x <= WORLD.maxX);
        assert.ok(delivery.deadline <= WORLD.duration - 0.1 + 1e-9);
        assert.ok(Math.abs(delivery.age - (state.elapsed - delivery.spawnedAt)) < 1e-8);
        if (!seen.has(delivery.id)) {
          assert.ok(delivery.deadline >= lastDeadline + 0.28 - 1e-8, `seed ${seed} deadlines must stay ordered and separated`);
          lastDeadline = delivery.deadline;
        }
        seen.set(delivery.id, delivery);
      }
      const unresolved = state.deliveries.filter(delivery => !delivery.resolved).length;
      maxUnresolved = Math.max(maxUnresolved, unresolved);
      if (state.elapsed >= 22) lateMaxUnresolved = Math.max(lateMaxUnresolved, unresolved);
      assert.ok(unresolved <= WORLD.maxConcurrent, `seed ${seed} may not exceed capacity`);
    }
    assert.equal(state.mode, 'ended', `seed ${seed} must finish`);
    assert.equal(state.missed, 0, `seed ${seed} must be physically completable`);
    assert.equal(state.perfect, state.caught, `seed ${seed} should allow precise alignment`);
    assert.equal(state.caught, seen.size, `seed ${seed} should not leave unfinishable orders`);
    assert.ok(state.deliveries.every(delivery => delivery.resolved), `seed ${seed} may not leave a pending order`);
    assert.ok(state.caught >= 40, `seed ${seed} should contain a busy 30-second round`);
    assert.equal(lateMaxUnresolved, 4, 'the final phase must genuinely reach four unresolved orders');
    telemetry.push({ seed, orders: state.caught, maxUnresolved });
  }
  console.log('Round telemetry:', JSON.stringify({
    duration: WORLD.duration,
    movementSpeed: WORLD.speed,
    orders: [Math.min(...telemetry.map(round => round.orders)), Math.max(...telemetry.map(round => round.orders))],
    peakUnresolved: [Math.min(...telemetry.map(round => round.maxUnresolved)), Math.max(...telemetry.map(round => round.maxUnresolved))],
  }));
});

test('four occupied lanes refuse a fifth order without consuming randomness or IDs', () => {
  let state = { ...playing(), elapsed: 22 };
  for (let index = 0; index < 4; index += 1) state = createDelivery(state);
  assert.equal(state.deliveries.length, 4);
  const blocked = createDelivery(state);
  assert.equal(blocked.deliveries.length, 4);
  assert.equal(blocked.nextId, state.nextId);
  assert.equal(blocked.seed, state.seed);
  assert.ok(blocked.nextDeliveryAt > state.elapsed);
});

test('20, 30 and 60 fps produce identical order schedules for 100 seeds', () => {
  function simulate(seed, fps) {
    let state = playing(seed);
    const orders = new Map();
    let peak = 0;
    for (let frame = 0; state.mode === 'playing' && frame < WORLD.duration * fps + 10; frame += 1) {
      const pending = state.deliveries.filter(delivery => !delivery.resolved).sort((a, b) => a.deadline - b.deadline)[0];
      if (pending) state = setTarget(state, pending.x);
      state = advanceGame(state, 1 / fps);
      for (const delivery of state.deliveries) {
        if (!orders.has(delivery.id)) {
          orders.set(delivery.id, {
            id: delivery.id, spawnedAt: delivery.spawnedAt, deadline: delivery.deadline,
            lane: delivery.lane, x: delivery.x,
          });
        }
      }
      peak = Math.max(peak, state.deliveries.filter(delivery => !delivery.resolved).length);
    }
    assert.equal(state.mode, 'ended', `seed ${seed} at ${fps} fps must finish`);
    assert.equal(state.missed, 0, `seed ${seed} at ${fps} fps must remain catchable`);
    assert.equal(state.caught, orders.size, `seed ${seed} at ${fps} fps may not leave dead orders`);
    assert.ok(state.deliveries.every(delivery => delivery.resolved));
    assert.equal(peak, 4, `seed ${seed} at ${fps} fps must reach four concurrent orders`);
    return [...orders.values()];
  }

  for (let seed = 0; seed < 100; seed += 1) {
    const baseline = simulate(seed, 60);
    for (const fps of [20, 30]) {
      const actual = simulate(seed, fps);
      assert.equal(actual.length, baseline.length, `seed ${seed}: ${fps} fps must not change the number of orders`);
      actual.forEach((order, index) => {
        const expected = baseline[index];
        assert.equal(order.id, expected.id);
        assert.equal(order.lane, expected.lane, `seed ${seed}, order ${order.id}: lane differs at ${fps} fps`);
        for (const field of ['spawnedAt', 'deadline', 'x']) {
          assert.ok(Math.abs(order[field] - expected[field]) < 1e-7,
            `seed ${seed}, order ${order.id}: ${field} differs at ${fps} fps (${order[field]} vs ${expected[field]})`);
        }
      });
    }
  }
});

test('a resolved drone still occupies its lane until it has fully departed', () => {
  let state = { ...playing(), elapsed: 22 };
  for (let index = 0; index < 4; index += 1) state = createDelivery(state);
  const resolvedDeadline = state.elapsed - WORLD.departureDuration / 2;
  const resolvedLifetime = WORLD.flyDuration + difficultyAt(20).lowerDuration;
  state = {
    ...state,
    deliveries: state.deliveries.map((delivery, index) => index ? delivery : {
      ...delivery,
      resolved: true,
      outcome: 'perfect',
      deadline: resolvedDeadline,
      spawnedAt: resolvedDeadline - resolvedLifetime,
      lowerDuration: resolvedLifetime - WORLD.flyDuration,
      age: resolvedLifetime + WORLD.departureDuration / 2,
      resolvedAt: resolvedLifetime,
    }),
  };
  assert.equal(createDelivery(state).nextId, state.nextId);
  const remainingDeparture = WORLD.departureDuration / 2;
  state = {
    ...state,
    elapsed: state.elapsed + remainingDeparture,
    deliveries: state.deliveries.map(delivery => ({ ...delivery, age: delivery.age + remainingDeparture })),
  };
  const available = createDelivery(state);
  assert.equal(available.nextId, state.nextId + 1);
  assert.equal(available.deliveries.at(-1).lane, state.deliveries[0].lane);
});

test('round-end scheduling stops instead of creating an unfinishable order', () => {
  const state = { ...playing(), elapsed: WORLD.duration - 0.2 };
  const result = createDelivery(state);
  assert.equal(result.nextId, state.nextId);
  assert.equal(result.seed, state.seed);
  assert.equal(result.deliveries.length, 0);
  assert.equal(result.nextDeliveryAt, Infinity);
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
