import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAOS_DIALOGUE, dialogueFor, specialPhase, specialDialogue, specialFeedback } from '../dist/chaos-dialogue.mjs';
import { createChaosSchedule, CHAOS_CAST } from '../dist/chaos-core.mjs';

const kinds = ['poop', 'banana', 'scale', 'wand', 'underwear', 'plunger'];
const timings = { dropAt: 7.1, impactAt: 8.5 };

test('all six objects have distinct, short three-beat dialogue', () => {
  const scripts = kinds.map(kind => {
    const script = dialogueFor(kind);
    assert.ok(script);
    const beats = [script.intro, script.drop, script.reaction];
    assert.equal(new Set(beats).size, 3, `${kind} should develop its joke over three different beats`);
    beats.forEach(line => {
      assert.equal(typeof line, 'string');
      assert.ok(line.trim().length > 0);
      assert.ok([...line].length <= 24, `${kind} dialogue must fit a brief phone bubble`);
    });
    return beats.join('|');
  });
  assert.equal(new Set(scripts).size, kinds.length, 'rare objects must not reuse their ordinary counterpart script');
  assert.ok(Object.isFrozen(CHAOS_DIALOGUE));
});

test('phase changes happen exactly at release and impact, without an extra-frame delay', () => {
  for (const kind of kinds) {
    const special = Object.freeze({ ...timings, kind });
    assert.equal(specialPhase(special, timings.dropAt - 0.001), 'intro');
    assert.equal(specialPhase(special, timings.dropAt), 'drop');
    assert.equal(specialPhase(special, timings.impactAt - 0.001), 'drop');
    assert.equal(specialPhase(special, timings.impactAt), 'reaction');
    assert.equal(specialDialogue(special, timings.dropAt - 0.001), dialogueFor(kind).intro);
    assert.equal(specialDialogue(special, timings.dropAt), dialogueFor(kind).drop);
    assert.equal(specialDialogue(special, timings.impactAt), dialogueFor(kind).reaction);
  }
});

test('the requested punchlines appear at the payoff, rather than spoiling the setup', () => {
  for (const [kind, punchline] of [['poop', '今日运气已送达'], ['scale', '换季，正常'], ['wand', '我工牌呢']]) {
    const special = { ...timings, kind };
    assert.ok(specialDialogue(special, timings.impactAt).includes(punchline));
    assert.ok(!specialDialogue(special, timings.dropAt - 0.01).includes(punchline));
  }
});

test('danger reactions distinguish a hit, a dodge and a shield block', () => {
  for (const kind of ['poop', 'banana']) {
    const special = { ...timings, kind };
    const hit = specialDialogue({ ...special, outcome: 'special-hit' }, timings.impactAt);
    const dodge = specialDialogue({ ...special, outcome: 'special-dodge' }, timings.impactAt);
    const shield = specialDialogue({ ...special, outcome: 'special-shield' }, timings.impactAt);
    assert.equal(new Set([hit, dodge, shield]).size, 3);
    assert.equal(specialDialogue({ ...special, outcome: 'special-dodge' }, timings.dropAt), dialogueFor(kind).drop);
    assert.equal(specialDialogue({ ...special, outcome: 'special-shield' }, timings.dropAt - 0.01), dialogueFor(kind).intro);
  }
});

test('red-underwear success and rejection keep their own joke, never the banana routine', () => {
  const rare = { ...timings, kind: 'underwear' };
  const caught = specialDialogue({ ...rare, outcome: 'special-reward' }, timings.impactAt);
  const missed = specialDialogue({ ...rare, outcome: 'special-missed' }, timings.impactAt);
  assert.match(caught, /封口费/);
  assert.match(missed, /限量版/);
  assert.notEqual(caught, missed);
  assert.notEqual(caught, dialogueFor('banana').reaction);
  assert.notEqual(missed, dialogueFor('banana').reaction);
  assert.notEqual(specialDialogue(rare, timings.dropAt), dialogueFor('banana').drop);
});

test('ordinary treasures and the rare plunger keep positive payoff lines on catch or miss', () => {
  for (const kind of ['scale', 'wand', 'plunger']) {
    const script = dialogueFor(kind);
    for (const outcome of ['special-reward', 'special-missed']) {
      const text = specialDialogue({ ...timings, kind, outcome }, timings.impactAt);
      assert.equal(text, script.reaction);
      assert.doesNotMatch(text, /扣分|危险|劈叉|鸟粪|香蕉皮/);
    }
  }
  assert.notEqual(dialogueFor('plunger').drop, dialogueFor('wand').drop);
  assert.match(dialogueFor('plunger').reaction, /通.*好运/);
});

test('penalty feedback states the actual deduction, including when the score floor prevents it', () => {
  for (const kind of ['poop', 'banana']) {
    for (const delta of [-10, -4, 0]) {
      const text = specialFeedback({ type: 'special-hit', kind, delta });
      assert.ok(text.includes(`${delta}分`), 'the displayed penalty must match the actual scored amount');
      assert.doesNotMatch(text, /\+\d|护盾×1/);
    }
  }
  assert.match(specialFeedback({ type: 'special-hit', kind: 'poop', delta: -10 }), /今日运气已送达/);
});

test('every treasure feedback states its own award and only a wand promises a shield', () => {
  const examples = [['scale', 30], ['wand', 40], ['underwear', 50], ['plunger', 60]];
  for (const [kind, delta] of examples) {
    const text = specialFeedback({ type: 'special-reward', kind, delta });
    assert.ok(text.includes(`+${delta}`));
    assert.doesNotMatch(text, /扣分|危险|拒收|劈叉/);
    assert.equal(text.includes('护盾×1'), kind === 'wand');
    assert.ok([...text].length <= 36, 'score feedback must remain readable on mobile');
  }
  assert.match(specialFeedback({ type: 'special-reward', kind: 'underwear', delta: 50 }), /封口费/);
  assert.match(specialFeedback({ type: 'special-reward', kind: 'plunger', delta: 60 }), /疏通/);
});

test('dodge, shield and missed-treasure feedback do not invent a score penalty', () => {
  for (const kind of ['poop', 'banana']) {
    assert.doesNotMatch(specialFeedback({ type: 'special-dodge', kind, delta: 0 }), /-\d|扣分/);
  }
  assert.match(specialFeedback({ type: 'special-shield', kind: 'poop', delta: 0 }), /护盾.*连击/);
  for (const kind of ['scale', 'wand', 'underwear', 'plunger']) {
    assert.match(specialFeedback({ type: 'special-missed', kind, delta: 0 }), /宝物/);
    assert.doesNotMatch(specialFeedback({ type: 'special-missed', kind, delta: 0 }), /-\d|扣分/);
  }
  assert.equal(specialFeedback({ type: 'special-appear', kind: 'poop' }), '');
});

test('real seeded plans bind the script for the final rare kind while preserving role and reward rules', () => {
  const seen = new Set();
  for (let seed = 0; seed < 100; seed += 1) {
    for (const special of createChaosSchedule(seed).specialSchedule) {
      const script = dialogueFor(special.kind);
      assert.equal(special.intro, script.intro);
      assert.equal(special.dropLine, script.drop);
      assert.equal(special.line, script.reaction);
      seen.add(special.kind);
      if (special.rare) {
        assert.equal(special.danger, false);
        assert.ok(special.value >= 50);
        assert.notEqual(special.intro, dialogueFor(special.actor === 'super' ? 'banana' : 'wand').intro);
      }
    }
  }
  assert.deepEqual([...seen].sort(), [...kinds].sort());
  assert.deepEqual(CHAOS_CAST.map(actor => actor.name), ['呆头蓝鸽', '香蕉小超人', '喷嚏小龙', '打卡仙女']);
});
