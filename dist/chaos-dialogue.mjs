export const CHAOS_DIALOGUE = Object.freeze({
  poop: Object.freeze({ intro: '借过，我只是路过。', drop: '空投，不包邮。', reaction: '今日运气已送达。', dodge: '这单怎么还躲开了？', shield: '咦，还自带雨伞？' }),
  banana: Object.freeze({ intro: '别紧张，我来吃个香蕉。', drop: '不是我，是重力。', reaction: '你先忙，我什么都没扔。', dodge: '香蕉皮也要拒收？', shield: '别看我，是它先滑的。' }),
  scale: Object.freeze({ intro: '阿——阿——', drop: '嚏！', reaction: '换季，正常。' }),
  wand: Object.freeze({ intro: '让让，下班打卡！', drop: '仙女散花……散错了。', reaction: '我工牌呢？' }),
  underwear: Object.freeze({ intro: '今天飞得有点凉。', drop: '等等，那不是披风！', reaction: '咱俩今天没见过。', reward: '封口费到账，咱俩没见过。', missed: '那是限量版，不是乱扔。' }),
  plunger: Object.freeze({ intro: '今天法器有点沉。', drop: '这玩意儿不太仙。', reaction: '借你通个好运。' }),
});

export function dialogueFor(kind) { return CHAOS_DIALOGUE[kind] ?? CHAOS_DIALOGUE.wand; }

export function specialPhase(special, elapsed) {
  return elapsed < special.dropAt ? 'intro' : elapsed < special.impactAt ? 'drop' : 'reaction';
}

export function specialDialogue(special, elapsed) {
  const script = dialogueFor(special.kind);
  const phase = specialPhase(special, elapsed);
  if (phase !== 'reaction') return script[phase];
  const outcome = special.outcome?.replace('special-', '');
  return script[outcome] ?? script.reaction;
}

export function specialFeedback(event) {
  if (event.type === 'special-hit') {
    const line = event.kind === 'poop' ? '今日运气已送达' : '劈叉完成，继续营业';
    return `${line} · ${event.delta ?? 0}分`;
  }
  if (event.type === 'special-dodge') return event.kind === 'poop' ? '这份运气，先不签收' : '没有劈叉，继续营业';
  if (event.type === 'special-shield') return '护盾挡住啦，连击保住！';
  if (event.type === 'special-missed') return '宝物溜走，下次不客气';
  if (event.type === 'special-reward') {
    const lines = { underwear: '封口费', plunger: '好运已疏通', scale: '换季小礼物', wand: '好运到账' };
    return `${lines[event.kind] ?? event.label} +${event.delta}${event.kind === 'wand' ? ' · 护盾×1' : ''}`;
  }
  return '';
}
