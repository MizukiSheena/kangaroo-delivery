export const CHAOS_CAST = Object.freeze([
  Object.freeze({ actor: 'pigeon', column: 0, name: '墨镜飞行员', kind: 'poop', label: '鸟粪', danger: true, value: 10, line: '投递成功。', intro: '这位飞行员没有外卖资质！' }),
  Object.freeze({ actor: 'super', column: 1, name: '香蕉小超人', kind: 'banana', label: '香蕉皮', danger: true, value: 10, line: '谁扔的？反正不是我。', intro: '注意！他在边飞边吃香蕉' }),
  Object.freeze({ actor: 'dragon', column: 2, name: '打嗝小龙', kind: 'scale', label: '龙鳞', danger: false, value: 30, line: '嗝……换季，正常。', intro: '换季小礼物，接住加分' }),
  Object.freeze({ actor: 'fairy', column: 3, name: '迷糊仙女', kind: 'wand', label: '魔法棒', danger: false, value: 40, line: '借你一点好运气！', intro: '金标宝物，还附送一次护盾' }),
]);

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
function random(seed) {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [next, next / 4294967296];
}

export function specialDropX(route, impactAt, danger, tieBreaker = 0) {
  const before = [...route].reverse().find(order => order.deadline <= impactAt);
  const after = route.find(order => order.deadline > impactAt);
  const from = before?.x ?? 195;
  const to = after?.x ?? from;
  if (!danger) {
    const travel = Math.max(0, impactAt - (before?.deadline ?? 0)) * 520;
    return from + clamp(to - from, -travel, travel);
  }
  const corridor = [Math.min(from, to), Math.max(from, to)];
  const leftClearance = corridor[0] - 48;
  const rightClearance = 342 - corridor[1];
  return leftClearance === rightClearance ? (tieBreaker < .5 ? 48 : 342) : leftClearance > rightClearance ? 48 : 342;
}

export function createChaosSchedule(seed) {
  let specialSeed = (seed ^ 0x9e3779b9) >>> 0;
  const pick = () => { const result = random(specialSeed); specialSeed = result[0]; return result[1]; };
  const cast = [...CHAOS_CAST];
  for (let index = cast.length - 1; index > 0; index--) {
    const other = Math.floor(pick() * (index + 1));
    [cast[index], cast[other]] = [cast[other], cast[index]];
  }
  const specialSchedule = cast.map((character, index) => {
    const scheduledAt = [5.5, 11.3, 17.1, 22.9][index] + (pick() - .5) * .3;
    const rare = pick() < .1 && (character.actor === 'super' || character.actor === 'fairy');
    const special = { ...character, id: `chaos-${index + 1}`, scheduledAt, dropAt: scheduledAt + 1.6,
      impactAt: scheduledAt + 3, endAt: scheduledAt + 5, rare,
      quietFrom: scheduledAt - 1.45, quietUntil: scheduledAt + 3.35, deliverySlotAt: scheduledAt + .85,
      kind: rare ? character.actor === 'super' ? 'underwear' : 'plunger' : character.kind,
      label: rare ? character.actor === 'super' ? '红内裤' : '马桶搋子' : character.label,
      danger: rare ? false : character.danger,
      value: rare ? character.actor === 'super' ? 50 : 60 : character.value,
      line: rare ? character.actor === 'super' ? '等等，我的内裤呢？！' : '糟糕，法器拿错了。' : character.line,
      intro: rare ? '稀有奇遇！金标是宝物，接住加分' : character.intro,
    };
    special.tieBreaker = pick();
    return special;
  });
  return { specialSeed, specialSchedule };
}

export function createChaosState(seed, deliveryForecast, schedule = createChaosSchedule(seed)) {
  const { specialSeed, specialSchedule } = schedule;
  const specialPlan = specialSchedule.map(special => ({ ...special,
    x: specialDropX(deliveryForecast, special.impactAt, special.danger, special.tieBreaker) }));
  return { specialSeed, specialPlan, specials: [], nextSpecialIndex: 0, shield: false,
    chaosStats: { encounters: 0, dodged: 0, hits: 0, treasures: 0, shieldBlocks: 0, bonus: 0, penalty: 0 } };
}

export function advanceSpecials(game, previousElapsed, previousPlayerX, playerSpeed = 520) {
  if (!game.specialPlan) return game;
  const next = { ...game, specials: game.specials.map(special => ({ ...special })), chaosStats: { ...game.chaosStats }, events: [...game.events] };
  while (next.nextSpecialIndex < next.specialPlan.length && next.specialPlan[next.nextSpecialIndex].scheduledAt <= next.elapsed + 1e-9) {
    const planned = next.specialPlan[next.nextSpecialIndex++];
    next.specials.push({ ...planned, age: next.elapsed - planned.scheduledAt, resolved: false, outcome: null });
    next.chaosStats.encounters += 1;
    next.events.push({ type: 'special-appear', id: planned.id, actor: planned.actor, kind: planned.kind, x: planned.x, danger: planned.danger, label: planned.label, value: planned.value });
  }
  for (const special of next.specials) {
    special.age = Math.max(0, next.elapsed - special.scheduledAt);
    if (special.resolved || special.impactAt > next.elapsed + 1e-9) continue;
    const travel = playerSpeed * Math.max(0, special.impactAt - previousElapsed);
    const playerX = previousPlayerX + clamp(next.player.target - previousPlayerX, -travel, travel);
    const collided = Math.abs(playerX - special.x) <= 32;
    let type;
    let delta = 0;
    special.resolved = true;
    if (special.danger && collided && next.shield) {
      next.shield = false;
      next.chaosStats.shieldBlocks += 1;
      type = 'special-shield';
    } else if (special.danger && collided) {
      delta = -Math.min(special.value, next.score);
      next.score += delta;
      next.combo = 0;
      next.chaosStats.hits += 1;
      next.chaosStats.penalty -= delta;
      next.player = { ...next.player, emotion: 'sad', emotionUntil: next.elapsed + .45 };
      type = 'special-hit';
    } else if (special.danger) {
      next.chaosStats.dodged += 1;
      type = 'special-dodge';
    } else if (collided) {
      delta = special.value;
      next.score += delta;
      next.chaosStats.treasures += 1;
      next.chaosStats.bonus += delta;
      if (special.kind === 'wand') next.shield = true;
      type = 'special-reward';
    } else type = 'special-missed';
    special.outcome = type;
    next.events.push({ type, id: special.id, actor: special.actor, kind: special.kind, x: special.x, danger: special.danger, label: special.label, delta, shield: next.shield });
  }
  next.specials = next.specials.filter(special => next.elapsed < special.endAt);
  return next;
}
