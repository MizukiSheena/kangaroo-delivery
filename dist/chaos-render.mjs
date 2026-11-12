import { CHAOS_CAST } from './chaos-core.mjs';

export function createChaosRenderer(ctx) {
  let reactions = [];
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const ellipse = (x, y, rx, ry, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
  const stroke = (points, color, width = 3) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
  const text = (value, x, y, size = 10, color = '#687655') => { ctx.fillStyle = color; ctx.font = `650 ${size}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y); };

  function star(x, y, radius, color) {
    ctx.fillStyle = color; ctx.beginPath();
    for (let index = 0; index < 10; index++) {
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      const r = index % 2 ? radius * .45 : radius;
      const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
      index ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }

  function item(kind, x, y, size = 27, rotation = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(size / 28, size / 28);
    if (kind === 'poop') {
      ellipse(-2, 8, 13, 5, '#f9f6e6'); ellipse(3, 4, 9, 6, '#fbf9ed'); ellipse(-1, -2, 6, 7, '#e9e4d6'); ellipse(1, -5, 3, 5, '#fffdf3');
      stroke([[-10, 9], [-4, 11], [9, 9]], '#b6ad98', 1.2);
    } else if (kind === 'banana') {
      stroke([[0, -8], [-1, 0], [-11, 9], [-13, 4]], '#e9bc37', 5);
      stroke([[0, -8], [2, 0], [12, 8], [13, 2]], '#f5d65c', 5);
      stroke([[0, -8], [0, 3], [2, 11]], '#f9de7c', 5);
      stroke([[0, -9], [1, -13]], '#99824c', 3);
    } else if (kind === 'scale') {
      ctx.fillStyle = '#77b9a2'; ctx.beginPath(); ctx.moveTo(0, -15); ctx.bezierCurveTo(16, -4, 15, 9, 0, 16); ctx.bezierCurveTo(-15, 9, -16, -4, 0, -15); ctx.fill();
      stroke([[-7, 0], [0, 7], [7, 0]], '#b7e1bf', 2); star(7, -8, 4, '#f7e5a2');
    } else if (kind === 'wand') {
      stroke([[-9, 13], [6, -8]], '#be93b7', 5); stroke([[-9, 13], [6, -8]], '#e2b8cc', 2);
      star(7, -9, 10, '#eccd65'); star(7, -9, 5, '#fff5bc');
    } else if (kind === 'underwear') {
      ctx.fillStyle = '#cf5c59'; ctx.beginPath(); ctx.moveTo(-15, -9); ctx.lineTo(15, -9); ctx.lineTo(6, 12); ctx.lineTo(-6, 12); ctx.closePath(); ctx.fill();
      stroke([[-14, -6], [14, -6]], '#f5e2bf', 4); stroke([[-12, 1], [-3, 9]], '#f3ad9b', 1.3); stroke([[12, 1], [3, 9]], '#f3ad9b', 1.3);
    } else if (kind === 'plunger') {
      stroke([[1, -16], [1, 8]], '#b88b53', 5);
      ctx.fillStyle = '#bd6d68'; ctx.beginPath(); ctx.moveTo(-13, 14); ctx.bezierCurveTo(-13, -2, 13, -2, 13, 14); ctx.closePath(); ctx.fill();
      stroke([[-14, 14], [14, 14]], '#9d5557', 3); ellipse(-3, 5, 3, 2, '#d8968b');
    }
    ctx.restore();
  }

  function actorShape(column, reaction) {
    if (column === 0) {
      ellipse(-5, 8, 19, 13, '#aebdb7'); ellipse(-19, 2, 14, 7, '#c9d4cd'); ellipse(10, -3, 12, 13, '#b7c6c1');
      ctx.fillStyle = '#d7ae48'; ctx.beginPath(); ctx.moveTo(18, -5); ctx.lineTo(31, -1); ctx.lineTo(18, 3); ctx.fill();
      ellipse(8, -7, 5, 4, '#3e5149'); ellipse(19, -7, 4, 4, '#3e5149'); stroke([[6, -7], [23, -7]], '#31473c', 2);
      stroke([[-4, 20], [-7, 25]], '#d4ab56', 2); stroke([[6, 20], [9, 24]], '#d4ab56', 2);
      if (reaction) stroke([[-7, -6], [-3, -18], [5, -14]], '#aebdb7', 6);
    } else if (column === 1) {
      ctx.fillStyle = '#d1776e'; ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-39, 13); ctx.lineTo(-7, 13); ctx.fill();
      ellipse(-2, 7, 18, 10, '#83aebe'); ellipse(16, -3, 12, 12, '#ebc697');
      stroke([[0, 12], [-17, 21]], '#83aebe', 7); stroke([[5, 13], [-3, 26]], '#83aebe', 7);
      stroke([[7, 6], [22, 12]], '#ebc697', 5); item('banana', 24, 8, 14);
      ellipse(20, -5, 1.5, 2, '#536254');
    } else if (column === 2) {
      ellipse(0, 9, 19, 15, '#96c4a0'); ellipse(16, -5, 13, 14, '#96c4a0');
      ctx.fillStyle = '#c7ddbe'; ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-26, -17); ctx.lineTo(-31, 5); ctx.closePath(); ctx.fill();
      stroke([[-16, 17], [-30, 17], [-34, 9]], '#96c4a0', 7); stroke([[12, -17], [11, -23]], '#d9c074', 4);
      ellipse(22, -7, 1.5, 2, '#566653'); ellipse(27, 0, 3, 2, '#789a79');
      if (reaction) { text('♡', 39, -9, 20, '#d69a98'); text('♡', 48, -19, 12, '#dfb9ac'); }
    } else {
      ellipse(-14, 0, 15, 22, '#e8e7d6'); ellipse(-4, 1, 13, 22, '#e3e7db');
      ctx.fillStyle = '#c0abc8'; ctx.beginPath(); ctx.moveTo(3, -1); ctx.lineTo(-10, 23); ctx.lineTo(23, 23); ctx.closePath(); ctx.fill();
      ellipse(8, -11, 11, 13, '#edcfb0'); ellipse(6, -21, 11, 5, '#ceba7d');
      stroke([[16, 2], [29, 6]], '#edcfb0', 5); item(reaction ? 'plunger' : 'wand', 30, 2, 20); ellipse(12, -12, 1.5, 2, '#77745e');
    }
  }

  function portrait(column, x, y, size, reaction = false, facing = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1);
    ctx.scale(size / 85, size / 85); actorShape(column, reaction);
    ctx.restore();
  }

  function bubble(value, x, y, danger = false) {
    const width = Math.min(286, value.length * 9 + 22);
    x = clamp(x, width / 2 + 8, 382 - width / 2);
    ctx.fillStyle = '#fffdf3ee'; ctx.strokeStyle = danger ? '#d9a69a99' : '#cbb97c99'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x - width / 2, y - 11, width, 23, 9); ctx.fill(); ctx.stroke();
    text(value, x, y + 1, 9, danger ? '#a47265' : '#91814e');
  }

  function drawSpecials(game, t) {
    for (const special of game.specials) {
      const direction = special.column % 2 ? -1 : 1;
      const entry = direction > 0 ? -70 : 460;
      const enter = clamp(special.age / .65, 0, 1);
      const exit = clamp((game.elapsed - (special.endAt - .6)) / .6, 0, 1);
      const actorX = entry + (special.x - entry) * (1 - (1 - enter) ** 3) + exit ** 2 * direction * 470;
      const actorY = 195 + Math.sin(t * 4 + special.column) * 2;
      const reaction = game.elapsed >= special.impactAt;
      portrait(special.column, actorX, actorY, 77, reaction, direction);
      if (exit < .1) bubble(reaction ? special.line : special.intro, actorX, 149, special.danger);
      const color = special.danger ? '#bf7d6c' : '#bba04b';
      if (!special.resolved) {
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.setLineDash(special.danger ? [5, 4] : []);
        ctx.beginPath(); ctx.ellipse(special.x, 638, 39, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        text(special.danger ? '×' : '+', special.x, 638, 16, color);
        ctx.restore();
        bubble(special.danger ? `× ${special.label} · 躲开` : `＋${special.label} ${special.value}分${special.kind === 'wand' ? ' · 护盾' : ''}`, special.x, 700, special.danger);
        if (game.elapsed >= special.dropAt) {
          const falling = clamp((game.elapsed - special.dropAt) / (special.impactAt - special.dropAt), 0, 1);
          const itemY = 222 + (559 - 222) * falling ** 1.4;
          item(special.kind, special.x, itemY, 30, Math.sin(falling * 4) * .15);
          ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(special.x, itemY, 23, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
          text(special.danger ? '×' : '+', special.x + 20, itemY - 17, 12, color);
        }
      } else {
        const since = game.elapsed - special.impactAt;
        if (since < .65) {
          ctx.save(); ctx.globalAlpha = 1 - since / .65;
          const caught = special.outcome === 'special-reward' || special.outcome === 'special-shield';
          item(special.kind, special.x, 559 + Math.min(1, since / .25) * (caught ? 20 : 76), caught ? 30 * Math.max(0, 1 - since / .35) : 30, since * .5);
          ctx.restore();
        }
      }
    }
  }

  function drawPreview(t) {
    text('天空奇遇 · 四位不太靠谱的客人', 195, 223, 8, '#91a080');
    CHAOS_CAST.forEach(character => {
      const x = 116 + character.column * 53;
      portrait(character.column, x, 251 + Math.sin(t * 2 + character.column), 47);
      text(['躲鸟粪', '躲香蕉皮', '+30龙鳞', '+40魔法棒'][character.column], x, 281, 7, '#9aa58b');
    });
  }

  function drawShield(x, footY, t) {
    ctx.save(); ctx.strokeStyle = '#b3cdb8aa'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, footY - 65, 58 + Math.sin(t * 3), 78, 0, 0, Math.PI * 2); ctx.stroke();
    star(x + 44, footY - 119, 5, '#d8c76f'); text('护盾 ×1', x, footY + 17, 8, '#94a885'); ctx.restore();
  }

  function noteOutcome(event, t) {
    const hit = event.type === 'special-hit' && (event.kind === 'poop' || event.kind === 'banana');
    const rareReward = event.type === 'special-reward' && (event.kind === 'underwear' || event.kind === 'plunger');
    if (hit || rareReward) reactions.push({ kind: event.kind, startAt: t, hit });
  }

  function drawReaction(x, footY, t) {
    reactions = reactions.filter(reaction => t - reaction.startAt < 1.1);
    for (const reaction of reactions) {
      const age = Math.max(0, t - reaction.startAt);
      ctx.save();
      ctx.globalAlpha = clamp((1.1 - age) / .22, 0, 1);
      if (reaction.kind === 'poop') {
        const settle = Math.max(0, 1 - age / .15);
        item('poop', x + 3, footY - 128 - settle * 13, 26, Math.sin(age * 8) * .05);
        if (age < .3) {
          ellipse(x - 11 - age * 20, footY - 122 + age * 8, 2, 3, '#f7f2e5');
          ellipse(x + 16 + age * 18, footY - 125 + age * 10, 2, 3, '#f7f2e5');
        }
      } else if (reaction.kind === 'banana') {
        item('banana', x - 4, footY - 1, 30, -.2);
        for (let index = 0; index < 3; index++) {
          const angle = age * 4 + index * Math.PI * 2 / 3;
          star(x + Math.cos(angle) * 30, footY - 129 + Math.sin(angle) * 8, 4, '#d9b85c');
        }
      } else {
        const handX = x + 36;
        const handY = footY - 62 - Math.sin(Math.min(age / .35, 1) * Math.PI / 2) * 12;
        item(reaction.kind, handX, handY, 34, Math.sin(age * 9) * .13);
        for (let index = 0; index < 4; index++) {
          const angle = index * Math.PI / 2 + age;
          star(handX + Math.cos(angle) * 25, handY + Math.sin(angle) * 25, 3 + Math.sin(age * 10 + index), '#d8bc69');
        }
      }
      ctx.restore();
    }
  }

  return { drawSpecials, drawPreview, drawShield, noteOutcome, drawReaction,
    reset() { reactions = []; } };
}
