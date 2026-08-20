(() => {
  'use strict';

  const COLS = 10, ROWS = 20, SIZE = 30;
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.querySelector('#next');
  const nextCtx = nextCanvas.getContext('2d');
  const scoreEl = document.querySelector('#score');
  const linesEl = document.querySelector('#lines');
  const levelEl = document.querySelector('#level');
  const overlay = document.querySelector('#overlay');
  const overlayKicker = document.querySelector('#overlay-kicker');
  const overlayTitle = document.querySelector('#overlay-title');
  const startBtn = document.querySelector('#start');
  const pauseBtn = document.querySelector('#pause');

  const COLORS = {
    I: '#4df6ff', J: '#5574ff', L: '#ff9d3d', O: '#ffe34d',
    S: '#54f58b', T: '#c65cff', Z: '#ff5078'
  };
  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]], L: [[0,0,1],[1,1,1],[0,0,0]],
    O: [[1,1],[1,1]], S: [[0,1,1],[1,1,0],[0,0,0]],
    T: [[0,1,0],[1,1,1],[0,0,0]], Z: [[1,1,0],[0,1,1],[0,0,0]]
  };

  let board, piece, nextPiece, bag, score, lines, level, running, paused;
  let lastTime = 0, dropCounter = 0, animationId = 0;

  const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(''));
  const cloneShape = shape => shape.map(row => [...row]);

  function refillBag() {
    bag = Object.keys(SHAPES);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }

  function makePiece() {
    if (!bag.length) refillBag();
    const type = bag.pop();
    const shape = cloneShape(SHAPES[type]);
    return { type, shape, x: Math.floor((COLS - shape[0].length) / 2), y: -1 };
  }

  function collides(test = piece) {
    for (let y = 0; y < test.shape.length; y++) for (let x = 0; x < test.shape[y].length; x++) {
      if (!test.shape[y][x]) continue;
      const bx = test.x + x, by = test.y + y;
      if (bx < 0 || bx >= COLS || by >= ROWS || (by >= 0 && board[by][bx])) return true;
    }
    return false;
  }

  function merge() {
    piece.shape.forEach((row, y) => row.forEach((cell, x) => {
      if (cell && piece.y + y >= 0) board[piece.y + y][piece.x + x] = piece.type;
    }));
  }

  function clearLines() {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every(Boolean)) {
        board.splice(y, 1); board.unshift(Array(COLS).fill('')); cleared++; y++;
      }
    }
    if (cleared) {
      score += [0, 100, 300, 500, 800][cleared] * level;
      lines += cleared;
      level = Math.floor(lines / 10) + 1;
      updateStats();
    }
  }

  function spawn() {
    piece = nextPiece || makePiece();
    nextPiece = makePiece();
    drawNext();
    if (collides()) endGame();
  }

  function lock() { merge(); clearLines(); spawn(); }
  function move(dx, dy) {
    if (!running || paused) return false;
    const test = { ...piece, x: piece.x + dx, y: piece.y + dy };
    if (!collides(test)) { piece = test; return true; }
    if (dy > 0) lock();
    return false;
  }

  function rotate() {
    if (!running || paused || piece.type === 'O') return;
    const rotated = piece.shape[0].map((_, i) => piece.shape.map(row => row[i]).reverse());
    for (const kick of [0, -1, 1, -2, 2]) {
      const test = { ...piece, shape: rotated, x: piece.x + kick };
      if (!collides(test)) { piece = test; return; }
    }
  }

  function hardDrop() {
    if (!running || paused) return;
    let distance = 0;
    while (move(0, 1)) distance++;
    score += distance * 2; updateStats();
  }

  function drawCell(target, x, y, color, unit = SIZE, alpha = 1) {
    target.save(); target.globalAlpha = alpha;
    target.fillStyle = color; target.shadowColor = color; target.shadowBlur = 10;
    target.fillRect(x * unit + 2, y * unit + 2, unit - 4, unit - 4);
    target.shadowBlur = 0; target.fillStyle = 'rgba(255,255,255,.28)';
    target.fillRect(x * unit + 4, y * unit + 4, unit - 8, 3); target.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(114,245,255,.055)'; ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(x*SIZE,0); ctx.lineTo(x*SIZE,600); ctx.stroke(); }
    for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(0,y*SIZE); ctx.lineTo(300,y*SIZE); ctx.stroke(); }
    board.forEach((row,y) => row.forEach((type,x) => type && drawCell(ctx,x,y,COLORS[type])));
    if (piece) {
      let ghostY = piece.y;
      while (!collides({ ...piece, y: ghostY + 1 })) ghostY++;
      piece.shape.forEach((row,y) => row.forEach((cell,x) => {
        if (cell && ghostY + y >= 0) drawCell(ctx,piece.x+x,ghostY+y,COLORS[piece.type],SIZE,.18);
        if (cell && piece.y + y >= 0) drawCell(ctx,piece.x+x,piece.y+y,COLORS[piece.type]);
      }));
    }
  }

  function drawNext() {
    nextCtx.clearRect(0, 0, 120, 120);
    const shape = nextPiece.shape, unit = 24;
    const ox = (120 / unit - shape[0].length) / 2, oy = (120 / unit - shape.length) / 2;
    shape.forEach((row,y) => row.forEach((cell,x) => cell && drawCell(nextCtx,ox+x,oy+y,COLORS[nextPiece.type],unit)));
  }

  function updateStats() {
    scoreEl.textContent = String(score).padStart(6, '0');
    linesEl.textContent = lines; levelEl.textContent = level;
  }

  function loop(time = 0) {
    if (!running) return;
    if (!paused) {
      dropCounter += time - lastTime;
      if (dropCounter > Math.max(100, 900 - (level - 1) * 70)) { move(0,1); dropCounter = 0; }
      draw();
    }
    lastTime = time; animationId = requestAnimationFrame(loop);
  }

  function startGame() {
    cancelAnimationFrame(animationId);
    board = emptyBoard(); bag = []; score = 0; lines = 0; level = 1;
    running = true; paused = false; nextPiece = makePiece(); spawn(); updateStats();
    overlay.classList.add('hidden'); pauseBtn.disabled = false; pauseBtn.textContent = '一時停止';
    lastTime = performance.now(); dropCounter = 0; loop(lastTime);
  }

  function endGame() {
    running = false; cancelAnimationFrame(animationId); pauseBtn.disabled = true;
    overlayKicker.textContent = 'GAME OVER'; overlayTitle.textContent = `${score} POINTS`;
    startBtn.textContent = 'もう一度遊ぶ'; overlay.classList.remove('hidden'); draw();
  }

  function togglePause() {
    if (!running) return;
    paused = !paused; pauseBtn.textContent = paused ? '再開する' : '一時停止';
    overlayKicker.textContent = 'PAUSED'; overlayTitle.textContent = 'ひと休み'; startBtn.textContent = 'ゲームに戻る';
    overlay.classList.toggle('hidden', !paused);
  }

  function action(name) {
    if (name === 'left') move(-1,0);
    else if (name === 'right') move(1,0);
    else if (name === 'down') { if (move(0,1)) { score++; updateStats(); } }
    else if (name === 'rotate') rotate();
    else if (name === 'drop') hardDrop();
    draw();
  }

  document.addEventListener('keydown', e => {
    const map = { ArrowLeft:'left', ArrowRight:'right', ArrowDown:'down', ArrowUp:'rotate', x:'rotate', X:'rotate', ' ':'drop' };
    if (map[e.key]) { e.preventDefault(); action(map[e.key]); }
    else if (e.key.toLowerCase() === 'p') togglePause();
  });
  document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('pointerdown', () => action(btn.dataset.action)));
  startBtn.addEventListener('click', () => paused ? togglePause() : startGame());
  pauseBtn.addEventListener('click', togglePause);
  document.querySelector('#restart').addEventListener('click', startGame);

  board = emptyBoard(); score = 0; lines = 0; level = 1; updateStats(); draw();
})();
