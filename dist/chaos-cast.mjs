export function createCastPainter(ctx, drawItem) {
  const ink = '#33383e';
  function shape(draw, fill, width = 2.1) {
    ctx.beginPath(); draw(ctx); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
  }
  function curve(draw, color = ink, width = 2.1) {
    ctx.beginPath(); draw(ctx); ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
  }
  const oval = (x, y, rx, ry, fill, width = 2.1) => shape(c => c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2), fill, width);
  const dot = (x, y, radius, fill = ink) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); };
  function hand(x, y, turn = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(turn);
    shape(c => { c.moveTo(-4, 2); c.bezierCurveTo(-8, -1, -7, -4, -3, -3); c.lineTo(-2, -7); c.quadraticCurveTo(0, -9, 1, -5); c.lineTo(4, -7); c.quadraticCurveTo(7, -7, 5, -3); c.quadraticCurveTo(10, -5, 9, -1); c.quadraticCurveTo(7, 6, 1, 5); }, '#ffe5cf', 1.7);
    ctx.restore();
  }
  function heart(x, y, size, color) {
    shape(c => { c.moveTo(x, y + size); c.bezierCurveTo(x - size * 2, y, x - size, y - size, x, y); c.bezierCurveTo(x + size, y - size, x + size * 2, y, x, y + size); }, color, 1);
  }

  function pigeon({ phase, progress = 0 }) {
    const dropping = phase === 'drop';
    const reacting = phase === 'reaction';
    ctx.save();
    ctx.rotate(reacting ? Math.sin(progress * Math.PI * 3) * .035 : dropping ? -.035 : 0);
    shape(c => { c.moveTo(-18, 8); c.quadraticCurveTo(-38, 5, -42, 14); c.lineTo(-28, 22); c.quadraticCurveTo(-38, 23, -35, 28); c.quadraticCurveTo(-13, 30, -7, 17); }, '#416eac');
    curve(c => { c.moveTo(-7, 28); c.lineTo(-8, 36); c.lineTo(-17, 39); c.moveTo(-8, 36); c.lineTo(-1, 39); c.moveTo(8, 28); c.lineTo(9, 36); c.lineTo(1, 39); c.moveTo(9, 36); c.lineTo(16, 38); }, ink, 2.7);
    shape(c => { c.moveTo(-21, -9); c.bezierCurveTo(-21, -29, -11, -36, 2, -35); c.bezierCurveTo(19, -34, 23, -23, 21, -8); c.bezierCurveTo(20, 0, 29, 2, 27, 14); c.bezierCurveTo(23, 31, 2, 35, -15, 27); c.bezierCurveTo(-31, 20, -26, 6, -21, -9); }, '#9bc9e8', 2.7);
    shape(c => { c.moveTo(-16, -3); c.bezierCurveTo(-7, -6, -1, 7, 18, 12); c.bezierCurveTo(15, 24, -7, 25, -15, 14); c.quadraticCurveTo(-21, 7, -16, -3); }, '#497db9');
    curve(c => { c.moveTo(-10, 10); c.quadraticCurveTo(-1, 17, 11, 17); }, '#315a91', 1.6);
    if (dropping || reacting) {
      shape(c => { c.moveTo(19, 0); c.quadraticCurveTo(34, -16, 34, -7); c.quadraticCurveTo(34, 3, 22, 11); }, '#497db9');
      if (reacting) curve(c => { c.moveTo(31, -9); c.lineTo(35, -13); }, ink, 1.5);
    }
    oval(-3, -18, 6.1, 10.1, '#fffef6', 2.1);
    oval(12, -18, 6.1, 10.1, '#fffef6', 2.1);
    const gaze = dropping ? 2.7 : reacting ? -1.5 : .7;
    oval(-2 + (reacting ? -1 : 0), -17 + gaze, 2.2, 4, ink, 0);
    oval(13 + (reacting ? -1 : 0), -17 + gaze, 2.2, 4, ink, 0);
    shape(c => { c.moveTo(5, -9); c.lineTo(10, -7); c.lineTo(9, 3); c.lineTo(3, 1); }, '#dc6544', 1.9);
    if (reacting) curve(c => { c.moveTo(0, 7); c.quadraticCurveTo(5, 11, 12, 6); }, ink, 1.5);
    ctx.restore();
  }

  function superHero({ phase, progress = 0, kind }) {
    const reacting = phase === 'reaction';
    const dropping = phase === 'drop';
    const bareCape = kind === 'underwear' && phase !== 'intro';
    const flutter = Math.sin(progress * Math.PI * 2) * 3;
    shape(c => { c.moveTo(-3, 0); c.bezierCurveTo(-18, 1, -30, 9 + flutter, -44, 15); c.quadraticCurveTo(-33, 25, -18, 22); c.lineTo(4, 28); c.lineTo(9, 3); }, '#e54e48', 2.4);
    curve(c => { c.moveTo(-7, 6); c.quadraticCurveTo(-20, 15, -32, 16); }, '#ba3839', 1.5);
    shape(c => { c.moveTo(-8, 5); c.quadraticCurveTo(-13, 14, -10, 27); c.lineTo(13, 29); c.quadraticCurveTo(18, 18, 14, 6); }, '#4a9cc6', 2.3);
    shape(c => { c.moveTo(-10, 22); c.lineTo(14, 24); c.lineTo(12, 32); c.lineTo(2, 29); c.lineTo(-8, 31); }, bareCape ? '#7dbacf' : '#e24b48');
    if (bareCape) { dot(-5, 27, 1, '#f8f8e9'); dot(4, 26, 1, '#f8f8e9'); dot(10, 28, 1, '#f8f8e9'); }
    curve(c => { c.moveTo(-10, 22); c.lineTo(14, 24); }, '#eac04d', 3.2);
    shape(c => { c.moveTo(-8, 29); c.lineTo(-7, 39); c.quadraticCurveTo(0, 43, 2, 31); }, '#e85b50', 1.9);
    shape(c => { c.moveTo(8, 29); c.lineTo(14, 37); c.quadraticCurveTo(23, 38, 17, 30); }, '#e85b50', 1.9);
    if (reacting) {
      curve(c => { c.moveTo(-9, 9); c.quadraticCurveTo(-18, 6, -23, 3); }, '#4a9cc6', 8);
      hand(-25, 2, -.3);
      curve(c => { c.moveTo(13, 10); c.lineTo(26, 14); }, '#4a9cc6', 7);
      hand(29, 13, .6);
    } else {
      curve(c => { c.moveTo(-8, 9); c.lineTo(-20, 2); }, '#4a9cc6', 8); hand(-22, 1, -.5);
      curve(c => { c.moveTo(12, 10); c.lineTo(27, dropping ? 12 : -3); }, '#4a9cc6', 8);
      hand(28, dropping ? 12 : -4, .4);
      if (!dropping && kind !== 'underwear') drawItem('banana', 31, -8, 17, -.5);
    }
    shape(c => { c.moveTo(-1, 11); c.lineTo(5, 9); c.lineTo(10, 14); c.lineTo(5, 19); c.closePath(); }, '#f5d567', 1.1);
    ctx.save(); ctx.translate(7, -12); if (reacting) ctx.scale(-1, 1);
    ctx.rotate(reacting ? -.12 : -.04);
    shape(c => { c.moveTo(-20, -4); c.bezierCurveTo(-20, -22, -3, -28, 11, -21); c.bezierCurveTo(21, -16, 24, -6, 23, 1); c.quadraticCurveTo(28, 2, 23, 6); c.bezierCurveTo(21, 20, 5, 25, -8, 18); c.bezierCurveTo(-17, 14, -21, 5, -20, -4); }, '#fffdf6', 2.5);
    shape(c => { c.moveTo(-20, -3); c.quadraticCurveTo(0, -8, 22, -6); c.lineTo(24, 3); c.quadraticCurveTo(4, 5, -19, 7); }, '#e54843', 1.8);
    shape(c => { c.moveTo(-14, -1); c.quadraticCurveTo(-7, -4, -2, -1); c.quadraticCurveTo(-6, 6, -13, 3); }, '#fffdf6', 1.4);
    shape(c => { c.moveTo(5, -2); c.quadraticCurveTo(13, -5, 18, -2); c.quadraticCurveTo(16, 4, 8, 4); }, '#fffdf6', 1.4);
    dot(reacting ? -10 : -6, 1, 1.8); dot(reacting ? 9 : 14, 0, 1.8);
    if (reacting) oval(7, 12, 3.8, 4.5, '#ead0bc', 1.5);
    else curve(c => { c.moveTo(4, 12); c.quadraticCurveTo(9, 15, 14, 10); }, ink, 1.7);
    ctx.restore();
  }

  function chineseDragon({ phase, progress = 0 }) {
    const sneeze = phase === 'drop' && progress < .35;
    const reacting = phase === 'reaction';
    ctx.save(); ctx.scale(.87, .87); ctx.translate(0, 3);
    if (sneeze) { ctx.translate(-3, 4); ctx.scale(1.04, .91); }
    shape(c => { c.moveTo(12, -3); c.bezierCurveTo(-4, -7, -10, 22, -24, 8); c.bezierCurveTo(-36, -7, -44, 10, -54, 6); c.bezierCurveTo(-43, 3, -41, -11, -26, -1); c.bezierCurveTo(-11, 11, -8, -15, 12, -13); }, '#91c875', 2.6);
    curve(c => { c.moveTo(10, 4); c.bezierCurveTo(-3, 5, -11, 25, -24, 11); c.quadraticCurveTo(-40, -3, -47, 7); }, '#eddda3', 5);
    curve(c => { c.moveTo(-8, 9); c.lineTo(-6, 14); c.moveTo(-17, 15); c.lineTo(-20, 18); c.moveTo(-29, 5); c.lineTo(-33, 8); c.moveTo(-40, 5); c.lineTo(-42, 9); }, '#8b8b55', 1.3);
    for (const [x, y] of [[-40, 0], [-30, -3], [-19, 2], [-9, -2]]) {
      shape(c => { c.moveTo(x - 3, y); c.lineTo(x, y - 6); c.lineTo(x + 5, y + 1); }, '#d2db90', 1.4);
    }
    shape(c => { c.moveTo(4, -16); c.lineTo(-2, -20); c.lineTo(4, -23); c.lineTo(1, -29); c.lineTo(12, -25); }, '#e8ddb0', 1.7);
    oval(9, -23, 10, 4.5, '#9acb79', 1.6); oval(31, -23, 9, 4.5, '#9acb79', 1.6);
    curve(c => { c.moveTo(16, -21); c.bezierCurveTo(9, -29, 12, -35, 9, -40); c.moveTo(12, -31); c.lineTo(3, -32); c.moveTo(28, -22); c.quadraticCurveTo(34, -31, 31, -41); c.moveTo(32, -32); c.quadraticCurveTo(39, -32, 40, -36); }, ink, 5.5);
    curve(c => { c.moveTo(16, -21); c.bezierCurveTo(9, -29, 12, -35, 9, -40); c.moveTo(12, -31); c.lineTo(3, -32); c.moveTo(28, -22); c.quadraticCurveTo(34, -31, 31, -41); c.moveTo(32, -32); c.quadraticCurveTo(39, -32, 40, -36); }, '#e6d69e', 3);
    shape(c => { c.moveTo(9, -16); c.bezierCurveTo(10, -28, 29, -28, 33, -15); c.lineTo(35, -4); c.quadraticCurveTo(49, 0, 42, 11); c.bezierCurveTo(35, 23, 11, 22, 7, 10); c.quadraticCurveTo(4, -1, 9, -16); }, '#a6d285', 2.5);
    shape(c => { c.moveTo(16, -24); c.quadraticCurveTo(21, -15, 24, -18); c.lineTo(22, -29); }, '#e9d99b', 1.4);
    if (sneeze) {
      curve(c => { c.moveTo(13, -7); c.lineTo(20, -3); c.lineTo(13, 0); c.moveTo(30, -7); c.lineTo(25, -3); c.lineTo(31, 0); }, ink, 1.7);
      oval(31, 10, 4.6, 5, '#f2d4ac', 1.6);
      curve(c => { c.moveTo(47, 5); c.lineTo(54, 3); c.moveTo(48, 12); c.lineTo(56, 16); }, '#7f9b71', 1.3);
    } else {
      curve(c => { c.moveTo(13, -5); c.quadraticCurveTo(17, -10, 21, -5); c.moveTo(26, -5); c.quadraticCurveTo(30, -10, 34, -5); c.moveTo(22, 10); c.quadraticCurveTo(31, 17, 39, 9); }, ink, 1.7);
    }
    dot(34, 2, 1.2); dot(41, 3, 1.2);
    curve(c => { c.moveTo(10, 4); c.bezierCurveTo(-2, 9, -9, 0, -12, 4); c.moveTo(41, 7); c.bezierCurveTo(52, 10, 55, -1, 51, -3); }, '#696c4c', 1.5);
    curve(c => { c.moveTo(13, 17); c.quadraticCurveTo(9, 27, 3, 21); c.moveTo(28, 18); c.quadraticCurveTo(31, 29, 36, 23); }, ink, 6.5);
    curve(c => { c.moveTo(13, 17); c.quadraticCurveTo(9, 27, 3, 21); c.moveTo(28, 18); c.quadraticCurveTo(31, 29, 36, 23); }, '#99cb7c', 3.4);
    curve(c => { c.moveTo(reacting ? 14 : 27, reacting ? 18 : 8); c.quadraticCurveTo(reacting ? 22 : 30, reacting ? 12 : 3, reacting ? 25 : 35, reacting ? 17 : 6); }, ink, 4.8);
    curve(c => { c.moveTo(reacting ? 14 : 27, reacting ? 18 : 8); c.quadraticCurveTo(reacting ? 22 : 30, reacting ? 12 : 3, reacting ? 25 : 35, reacting ? 17 : 6); }, '#a6d285', 2.5);
    if (sneeze) heart(52, -5 - progress * 17, 3, '#e7b2a3');
    ctx.restore();
  }

  function fairy({ phase, progress = 0, kind }) {
    const reacting = phase === 'reaction';
    const searching = reacting ? Math.sin(progress * Math.PI) : 0;
    const ribbon = Math.sin(progress * Math.PI * 2) * 3;
    const ribbonBack = c => { c.moveTo(1, -2); c.bezierCurveTo(-9, -23, -36, -19 + ribbon, -29, -3); c.bezierCurveTo(-21, 12, -40, 15, -48, 1); };
    curve(ribbonBack, ink, 7); curve(ribbonBack, '#57a49d', 4.6);
    const ribbonLower = c => { c.moveTo(19, 7); c.bezierCurveTo(-7, 2, -4, 34, -28, 29); c.quadraticCurveTo(-47, 25, -37, 17 + ribbon); };
    curve(ribbonLower, ink, 7); curve(ribbonLower, '#69b2a4', 4.6);
    shape(c => { c.moveTo(5, -1); c.quadraticCurveTo(-7, 3, -19, 25); c.bezierCurveTo(-8, 37, 21, 32, 28, 22); c.quadraticCurveTo(28, 8, 19, 0); }, '#eda35f', 2.4);
    shape(c => { c.moveTo(8, 0); c.lineTo(13, 10); c.lineTo(23, 1); c.lineTo(17, -3); }, '#f7d699', 1.4);
    curve(c => { c.moveTo(-3, 16); c.quadraticCurveTo(9, 21, 25, 15); }, '#f2ce7d', 4);
    curve(c => { c.moveTo(8, 19); c.bezierCurveTo(8, 26, -6, 26, -10, 35); }, '#b77949', 1.3);
    shape(c => { c.moveTo(4, 0); c.quadraticCurveTo(-7, -3, -15, 1); c.lineTo(-11, 13); c.quadraticCurveTo(0, 14, 8, 8); }, '#efb16b', 2);
    hand(-14, reacting ? 7 : 0, reacting ? .8 : -.5);
    shape(c => { c.moveTo(21, 1); c.lineTo(34, -2); c.lineTo(36, 11); c.lineTo(24, 15); }, '#efb16b', 2);
    if (reacting) {
      hand(27 - searching * 5, 15 + searching * 3, .8);
      curve(c => { c.moveTo(15, 2); c.quadraticCurveTo(28, 7, 20, 15); c.lineTo(17, 18); }, '#659b91', 1.8);
      curve(c => { c.moveTo(14, 18); c.lineTo(16, 20); }, '#659b91', 1.3);
    } else {
      hand(37, 1, .2);
      if (phase === 'intro') drawItem(kind === 'plunger' ? 'plunger' : 'wand', 39, -6, 21, -.3);
    }
    ctx.save(); ctx.translate(14, -13); ctx.rotate(reacting ? .24 + searching * .12 : phase === 'drop' ? -.12 : -.04);
    shape(c => { c.moveTo(-15, -5); c.bezierCurveTo(-19, -22, 6, -29, 16, -13); c.lineTo(15, 0); c.closePath(); }, '#675449', 2.2);
    oval(-3, -24, 8.5, 7, '#675449', 2.1);
    curve(c => { c.moveTo(-12, -24); c.lineTo(9, -25); }, '#dfb971', 3);
    dot(10, -25, 2.2, '#80b8a5');
    oval(1, -1, 16, 15, '#ffe1bf', 2.2);
    shape(c => { c.moveTo(-14, -8); c.quadraticCurveTo(-13, -20, 1, -19); c.quadraticCurveTo(13, -20, 16, -7); c.quadraticCurveTo(5, -8, 0, -14); c.quadraticCurveTo(-4, -7, -14, -8); }, '#79604b', 1.8);
    oval(-3, -2, 3.8, 4.8, '#fffef6', 1.4); oval(9, -2, 3.8, 4.8, '#fffef6', 1.4);
    dot(-2 + (reacting ? 1 : 0), reacting ? .5 : -1, 1.6); dot(10 + (reacting ? 1 : 0), reacting ? .5 : -1, 1.6);
    dot(-10, 4, 2, '#e9a291'); dot(13, 5, 2, '#e9a291');
    if (reacting) oval(4, 9, 2.3, 3.1, '#e7b394', 1.2);
    else curve(c => { c.moveTo(0, 8); c.quadraticCurveTo(4, 11, 8, 7); }, ink, 1.4);
    ctx.restore();
    if (reacting && progress < .7) {
      ctx.fillStyle = ink; ctx.font = '700 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 37, -23);
    }
  }

  return function drawActor(column, options = {}) {
    const pose = { phase: 'intro', progress: 0, ...options };
    ctx.save();
    const scale = column === 0 ? .8 : column === 2 ? 1 : .75;
    ctx.scale(scale, scale);
    if (column === 0) pigeon(pose);
    else if (column === 1) superHero(pose);
    else if (column === 2) chineseDragon(pose);
    else fairy(pose);
    ctx.restore();
  };
}
