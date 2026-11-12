import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAOS_CAST, createChaosState, specialDropX, advanceSpecials } from '../dist/chaos-core.mjs';
import { WORLD, createGame, startGame, pauseGame, resumeGame, setTarget, advanceGame } from '../dist/game-core.mjs';

const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} vs ${expected}`);

function example(kind) {
  for (let seed = 0; seed < 1000; seed += 1) {
    const special = createChaosState(seed, []).specialPlan.find(item => item.kind === kind);
    if (special) return special;
  }
  assert.fail(`the seeded plans must include ${kind}`);
}

function collisionState(special, x = special.x, overrides = {}) {
  const base = startGame(createGame(42));
  return {
    ...base,
    elapsed: special.impactAt + 0.01,
    score: 100, combo: 6, maxCombo: 6, caught: 6, perfect: 3, missed: 2,
    player: { ...base.player, x, target: x },
    nextDeliveryAt: Infinity,
    specialPlan: [special],
    specials: [{ ...special, resolved: false, outcome: null }],
    nextSpecialIndex: 1,
    ...overrides,
  };
}

function resolve(state) {
  return advanceSpecials(state, state.elapsed - 0.02, state.player.x, WORLD.speed);
}

function simulate(seed, fps) {
  let state = startGame(createGame(seed));
  const forecast = state.deliveryForecast.map(({ id, x, spawnedAt, deadline }) => ({ id, x, spawnedAt, deadline }));
  const orders = new Map();
  const events = [];
  let peakSpecials = 0;
  for (let frame = 0; state.mode === 'playing' && frame < WORLD.duration * fps + 10; frame += 1) {
    const pending = state.deliveries.filter(order => !order.resolved).sort((a, b) => a.deadline - b.deadline)[0];
    if (pending) state = setTarget(state, pending.x);
    state = advanceGame(state, 1 / fps);
    events.push(...state.events);
    peakSpecials = Math.max(peakSpecials, state.specials.length);
    assert.ok(state.specials.length <= 1, `seed ${seed}/${fps} fps: encounters must not overlap`);
    assert.ok(state.specials.filter(special => !special.resolved).length <= 1);
    if (state.elapsed < 5) {
      assert.equal(state.specials.length, 0);
      assert.equal(state.nextSpecialIndex, 0);
    }
    for (const order of state.deliveries) {
      if (!orders.has(order.id)) orders.set(order.id, { id: order.id, x: order.x, spawnedAt: order.spawnedAt, deadline: order.deadline });
    }
  }
  return { state, forecast, orders: [...orders.values()], events, peakSpecials };
}

test('encounter plans are seeded, varied, and contain every actor exactly once', () => {
  const forecast = createGame(10).deliveryForecast;
  assert.deepEqual(createChaosState(10, forecast), createChaosState(10, forecast));
  assert.notDeepEqual(createChaosState(10, forecast).specialPlan, createChaosState(11, forecast).specialPlan);
  const permutations = new Set();
  for (let seed = 0; seed < 100; seed += 1) {
    const { specialPlan } = createChaosState(seed, forecast);
    assert.deepEqual(specialPlan.map(special => special.actor).sort(), CHAOS_CAST.map(actor => actor.actor).sort());
    assert.equal(new Set(specialPlan.map(special => special.id)).size, 4);
    permutations.add(specialPlan.map(special => special.actor).join(','));
    specialPlan.forEach((special, index) => {
      assert.ok(special.scheduledAt > 5);
      assert.ok(special.impactAt - special.dropAt >= 0.7);
      assert.ok(special.dropAt > special.scheduledAt);
      assert.ok(special.endAt < WORLD.duration);
      if (index) assert.ok(special.scheduledAt > specialPlan[index - 1].endAt);
    });
  }
  assert.ok(permutations.size > 4, 'replay should vary the cast order');
});

test('rare swaps come from the real seeded plan and stay positive treasures', () => {
  for (const [kind, actor, value] of [['underwear', 'super', 50], ['plunger', 'fairy', 60]]) {
    const special = example(kind);
    assert.equal(special.actor, actor);
    assert.equal(special.rare, true);
    assert.equal(special.danger, false);
    assert.equal(special.value, value);
  }
  for (const kind of ['poop', 'banana', 'scale', 'wand']) assert.equal(example(kind).rare, false);
});

test('an encounter appears once and cannot affect the player before its advertised impact', () => {
  const special = example('banana');
  close(special.dropAt - special.scheduledAt, 0.95, 'throw timing');
  close(special.impactAt - special.scheduledAt, 1.75, 'impact timing');
  close(special.endAt - special.scheduledAt, 3.65, 'departure timing');
  const initial = collisionState(special, undefined, {
    elapsed: special.scheduledAt - 0.01, specials: [], nextSpecialIndex: 0,
  });
  const before = advanceSpecials(initial, initial.elapsed - 0.01, initial.player.x);
  assert.equal(before.specials.length, 0);
  assert.equal(before.chaosStats.encounters, 0);
  const appeared = advanceSpecials({ ...before, elapsed: special.scheduledAt }, before.elapsed, before.player.x);
  assert.deepEqual(appeared.events.map(event => event.type), ['special-appear']);
  assert.equal(appeared.chaosStats.encounters, 1);
  const warned = advanceSpecials({ ...appeared, elapsed: special.impactAt - 0.001, events: [] }, appeared.elapsed, appeared.player.x);
  assert.equal(warned.specials[0].resolved, false);
  assert.equal(warned.score, 100);
  assert.equal(warned.chaosStats.hits, 0);
  const impacted = advanceSpecials({ ...warned, elapsed: special.impactAt }, warned.elapsed, warned.player.x);
  assert.equal(impacted.score, 90);
  assert.equal(impacted.chaosStats.encounters, 1);
  assert.deepEqual(impacted.events.map(event => event.type), ['special-hit']);
});

test('danger drops choose the far edge of the delivery corridor and rewards follow the route', () => {
  const route = [{ deadline: 5, x: 100 }, { deadline: 6, x: 250 }];
  assert.equal(specialDropX(route, 5.1, true), 342);
  close(specialDropX(route, 5.1, false), 152, 'reward must follow reachable motion');
  assert.equal(specialDropX(route, 5.5, false), 250);
  assert.equal(specialDropX([{ deadline: 5, x: 240 }, { deadline: 6, x: 300 }], 5.1, true), 48);
  assert.equal(specialDropX([{ deadline: 5, x: 195 }], 6, true, 0), 48);
  assert.equal(specialDropX([{ deadline: 5, x: 195 }], 6, true, 1), 342);
});

test('both harmful objects penalize a hit without changing delivery counters or locking movement', () => {
  for (const kind of ['poop', 'banana']) {
    const initial = collisionState(example(kind));
    const result = resolve(initial);
    assert.equal(result.score, 90);
    assert.equal(result.combo, 0);
    assert.equal(result.maxCombo, 6);
    assert.equal(result.chaosStats.hits, 1);
    assert.equal(result.chaosStats.penalty, 10);
    assert.equal(result.caught, initial.caught);
    assert.equal(result.perfect, initial.perfect);
    assert.equal(result.missed, initial.missed);
    assert.equal(result.events.at(-1).type, 'special-hit');
    const target = result.player.x < 195 ? 300 : 80;
    const moved = advanceGame(setTarget(result, target), 0.05);
    assert.ok(Math.abs(moved.player.x - result.player.x) > 0);
    assert.equal(moved.mode, 'playing');
  }
});

test('danger penalties cannot make the score negative', () => {
  for (const score of [0, 4]) {
    const result = resolve(collisionState(example('poop'), undefined, { score }));
    assert.equal(result.score, 0);
    assert.equal(result.chaosStats.penalty, score);
    assert.equal(result.events.at(-1).delta, -score);
  }
});

test('avoiding either danger preserves the score and streak', () => {
  for (const kind of ['poop', 'banana']) {
    const result = resolve(collisionState(example(kind), 195));
    assert.equal(result.score, 100);
    assert.equal(result.combo, 6);
    assert.equal(result.chaosStats.hits, 0);
    assert.equal(result.chaosStats.dodged, 1);
    assert.equal(result.events.at(-1).type, 'special-dodge');
  }
});

test('ordinary and rare rewards add their own bonus, without counting as deliveries', () => {
  for (const [kind, value] of [['scale', 30], ['wand', 40], ['underwear', 50], ['plunger', 60]]) {
    const result = resolve(collisionState(example(kind)));
    assert.equal(result.score, 100 + value);
    assert.equal(result.chaosStats.bonus, value);
    assert.equal(result.chaosStats.treasures, 1);
    assert.equal(result.caught, 6);
    assert.equal(result.perfect, 3);
    assert.equal(result.missed, 2);
    assert.equal(result.combo, 6);
    assert.equal(result.events.at(-1).type, 'special-reward');
    assert.equal(result.shield, kind === 'wand');
  }
});

test('missing each treasure carries no score, delivery or streak penalty', () => {
  for (const kind of ['scale', 'wand', 'underwear', 'plunger']) {
    const result = resolve(collisionState(example(kind), WORLD.minX));
    assert.equal(result.score, 100);
    assert.equal(result.combo, 6);
    assert.equal(result.missed, 2);
    assert.equal(result.chaosStats.penalty, 0);
    assert.equal(result.chaosStats.treasures, 0);
    assert.equal(result.events.at(-1).type, 'special-missed');
  }
});

test('one wand shield blocks exactly one danger and preserves the streak', () => {
  const wand = resolve(collisionState(example('wand')));
  assert.equal(wand.shield, true);
  const first = resolve(collisionState(example('poop'), undefined, { shield: wand.shield }));
  assert.equal(first.shield, false);
  assert.equal(first.score, 100);
  assert.equal(first.combo, 6);
  assert.equal(first.chaosStats.shieldBlocks, 1);
  assert.equal(first.chaosStats.hits, 0);
  assert.equal(first.events.at(-1).type, 'special-shield');
  const second = resolve(collisionState(example('banana'), undefined, { shield: first.shield }));
  assert.equal(second.score, 90);
  assert.equal(second.combo, 0);
  assert.equal(second.events.at(-1).type, 'special-hit');
});

test('avoiding a danger does not waste the saved shield', () => {
  const state = collisionState(example('poop'), 195, { shield: true });
  const result = resolve(state);
  assert.equal(result.shield, true);
  assert.equal(result.score, state.score);
  assert.equal(result.combo, state.combo);
  assert.equal(result.chaosStats.shieldBlocks, 0);
  assert.equal(result.events.at(-1).type, 'special-dodge');
});

test('a resolved encounter cannot pay or penalize twice and cleans up on time', () => {
  for (const kind of ['poop', 'wand', 'underwear']) {
    const resolved = resolve(collisionState(example(kind)));
    const again = advanceSpecials({ ...resolved, elapsed: resolved.elapsed + 0.1, events: [] }, resolved.elapsed, resolved.player.x);
    assert.equal(again.score, resolved.score);
    assert.deepEqual(again.chaosStats, resolved.chaosStats);
    assert.deepEqual(again.events, []);
    const cleaned = advanceSpecials({ ...again, elapsed: again.specials[0].endAt }, again.elapsed, again.player.x);
    assert.equal(cleaned.specials.length, 0);
  }
});

test('collision uses player position at the impact instant, rather than at the end of a frame', () => {
  const special = { ...example('poop'), x: 150 };
  const before = collisionState(special, 150);
  const previousElapsed = special.impactAt - 0.01;
  const after = { ...before, elapsed: special.impactAt + 0.2, player: { ...before.player, x: 254, target: 300 } };
  const result = advanceSpecials(after, previousElapsed, 150, WORLD.speed);
  assert.equal(result.events.at(-1).type, 'special-hit');
});

test('pausing freezes encounter progress and replay clears shield, objects and encounter counters', () => {
  const special = example('wand');
  const live = collisionState(special, undefined, { elapsed: special.impactAt - 0.02 });
  const paused = pauseGame(live);
  const waited = advanceGame(paused, 20);
  assert.deepEqual(waited, paused);
  const resumed = advanceGame(resumeGame(waited), 0.05);
  assert.equal(resumed.shield, true);
  assert.equal(resumed.chaosStats.treasures, 1);
  const restarted = startGame(resumed);
  assert.equal(restarted.shield, false);
  assert.equal(restarted.specials.length, 0);
  assert.equal(restarted.nextSpecialIndex, 0);
  assert.ok(Object.values(restarted.chaosStats).every(value => value === 0));
  assert.equal(restarted.score, 0);
  assert.equal(restarted.elapsed, 0);
});

test('special transitions preserve nested inputs and keep all encounter events namespaced', () => {
  const state = collisionState(example('banana'));
  const snapshot = structuredClone(state);
  const freeze = value => {
    if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); }
  };
  freeze(state);
  const result = resolve(state);
  assert.deepEqual(state, snapshot);
  assert.ok(result.events.every(event => event.type.startsWith('special-')));
  assert.notEqual(result.chaosStats, state.chaosStats);
  assert.notEqual(result.specials[0], state.specials[0]);
});

test('100 seeds at 20/30/60 fps preserve all 55 delivery orders and avoid danger on the delivery route', () => {
  for (let seed = 0; seed < 100; seed += 1) {
    let baseline;
    for (const fps of [60, 30, 20]) {
      const result = simulate(seed, fps);
      const { state, forecast, orders, events } = result;
      const context = `seed ${seed}/${fps} fps`;
      assert.equal(state.mode, 'ended', context);
      assert.equal(orders.length, 55, `${context}: encounters must not consume delivery randomness`);
      assert.equal(state.caught, 55, `${context}: every delivery must remain catchable`);
      assert.equal(state.perfect, 55, `${context}: the perfect route must remain possible`);
      assert.equal(state.missed, 0, context);
      assert.equal(state.chaosStats.hits, 0, `${context}: danger must stay outside the catch route`);
      assert.equal(state.chaosStats.encounters, 4, context);
      assert.equal(result.peakSpecials, 1, context);
      assert.equal(state.specials.length, 0, context);
      assert.equal(state.shield, false, 'the round must clear temporary shield state');
      assert.equal(events.filter(event => event.type === 'special-appear').length, 4);
      assert.equal(events.filter(event => ['perfect', 'good'].includes(event.type)).length, 55);
      assert.equal(events.filter(event => event.type === 'miss').length, 0);
      assert.equal(forecast.length, orders.length, context);
      for (let index = 0; index < orders.length; index += 1) {
        assert.equal(orders[index].id, forecast[index].id, context);
        for (const field of ['x', 'spawnedAt', 'deadline']) close(orders[index][field], forecast[index][field], `${context} forecast ${index} ${field}`);
      }
      const outcomes = events.filter(event => event.type.startsWith('special-') && event.type !== 'special-appear').map(({ type, id, kind, delta }) => ({ type, id, kind, delta }));
      assert.equal(outcomes.length, 4, context);
      if (baseline) {
        assert.deepEqual(outcomes, baseline.outcomes, `${context}: encounter outcomes should not depend on frame rate`);
        close(state.score, baseline.score, `${context} score`);
      } else baseline = { outcomes, score: state.score };
    }
  }
});
