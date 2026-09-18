/* ============================================================
 * 羊了个羊（Sheep a Sheep）
 * 纯前端 DOM 小游戏，零依赖、零构建，可直接丢上 Vercel。
 * 用 Vibe Coding 实现：难度关卡（通关解锁）+ 分层堆叠 + 遮挡判定 +
 * 三连消除 + 撤销/洗牌 + Web Audio 背景音乐与音效（可开关）。
 * ============================================================ */

(function () {
  "use strict";

  // ---------- 图标（内联 SVG，不依赖 emoji 字体） ----------
  const ICONS = [
    { name: "apple",  svg: '<svg viewBox="0 0 32 32"><circle cx="16" cy="19" r="10" fill="#ff5a5f"/><ellipse cx="12" cy="16" rx="3" ry="4" fill="#ff8a8d" opacity=".7"/><path d="M16 9c1-4 4-5 6-5 0 2-1 4-4 5z" fill="#4caf50"/><rect x="15" y="5" width="2" height="5" rx="1" fill="#8d6e63"/></svg>' },
    { name: "grape",  svg: '<svg viewBox="0 0 32 32"><circle cx="12" cy="16" r="5" fill="#8e6bd6"/><circle cx="20" cy="16" r="5" fill="#a684e8"/><circle cx="16" cy="22" r="5" fill="#7a54c9"/><circle cx="16" cy="11" r="5" fill="#9d7ae0"/><path d="M16 6l2-3 2 2z" fill="#4caf50"/></svg>' },
    { name: "orange", svg: '<svg viewBox="0 0 32 32"><circle cx="16" cy="18" r="10" fill="#ff9f43"/><circle cx="13" cy="15" r="3" fill="#ffc078" opacity=".8"/><path d="M16 8c0-3 2-5 5-5 0 2-1 4-4 5z" fill="#4caf50"/></svg>' },
    { name: "lemon",  svg: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="11" ry="8" fill="#ffd93d"/><ellipse cx="12" cy="15" rx="3" ry="2" fill="#fff08a" opacity=".8"/><ellipse cx="22" cy="21" rx="3" ry="2" fill="#f5c518"/></svg>' },
    { name: "cat",    svg: '<svg viewBox="0 0 32 32"><path d="M8 10l2-6 5 4h2l5-4 2 6z" fill="#9aa7b8"/><circle cx="16" cy="18" r="9" fill="#c3ccd8"/><circle cx="12.5" cy="17" r="1.6" fill="#333"/><circle cx="19.5" cy="17" r="1.6" fill="#333"/><path d="M14 21h4l-2 2z" fill="#ff8fa3"/></svg>' },
    { name: "bear",   svg: '<svg viewBox="0 0 32 32"><circle cx="9" cy="10" r="4" fill="#a1775a"/><circle cx="23" cy="10" r="4" fill="#a1775a"/><circle cx="16" cy="18" r="10" fill="#c09270"/><circle cx="12.5" cy="17" r="1.6" fill="#333"/><circle cx="19.5" cy="17" r="1.6" fill="#333"/><ellipse cx="16" cy="22" rx="3" ry="2.2" fill="#8d6446"/></svg>' },
    { name: "berry",  svg: '<svg viewBox="0 0 32 32"><path d="M16 26c0-7 4-11 4-15 0-3-2-5-4-5s-4 2-4 5c0 4 4 8 4 15z" fill="#ff4d6d"/><path d="M16 6c-2-3 0-6 0-6s2 3 0 6z" fill="#4caf50"/></svg>' },
    { name: "fish",   svg: '<svg viewBox="0 0 32 32"><path d="M4 16c5-8 14-8 18-2 2-3 6-3 6-3s-2 4-2 8 2 5 2 5-4 0-6-3c-4 6-13 6-18-2z" fill="#3aafa9"/><circle cx="11" cy="14" r="1.6" fill="#fff"/><circle cx="11" cy="14" r="0.8" fill="#222"/></svg>' },
  ];
  const ICON_BY_NAME = {};
  ICONS.forEach((ic) => { ICON_BY_NAME[ic.name] = ic.svg; });

  // ---------- 尺寸 ----------
  const TILE = 52, PITCH = 58;
  const BOARD_W = 400, BOARD_H = 400;
  const TRAY_SLOTS = 7;

  // ---------- 难度关卡配置 ----------
  // 每层 {c:列, r:行, ox/oy: 相对底层的像素偏移}；types: 使用的图标种类数
  // 关卡总方块数需为 3*types 的倍数（保证每种图标数量为 3 的倍数 -> 必可解）
  const LEVELS = {
    easy: {
      name: "简单", undo: 4, shuffle: 4,
      layers: [
        { c: 4, r: 4, ox: 0, oy: 0 },
        { c: 3, r: 2, ox: PITCH / 2, oy: PITCH / 2 },
        { c: 2, r: 1, ox: 0, oy: 0 },
      ],
      types: 4, // 24 块 / (3*4=12) = 2 组
    },
    hard: {
      name: "困难", undo: 2, shuffle: 2,
      layers: [
        { c: 6, r: 4, ox: 0, oy: 0 },
        { c: 5, r: 3, ox: PITCH / 2, oy: PITCH / 2 },
        { c: 4, r: 3, ox: 0, oy: 0 },
        { c: 3, r: 3, ox: PITCH / 2, oy: 0 },
        { c: 3, r: 2, ox: 0, oy: PITCH / 2 },
        { c: 2, r: 2, ox: PITCH / 2, oy: 0 },
        { c: 2, r: 1, ox: 0, oy: PITCH / 4 },
      ],
      types: 8, // 72 块 / (3*8=24) = 3 组
    },
  };

  // ---------- DOM ----------
  const boardEl = document.getElementById("board");
  const trayEl = document.getElementById("tray");
  const remainEl = document.getElementById("remain");
  const overlay = document.getElementById("overlay");
  const ovTitle = document.getElementById("ov-title");
  const ovText = document.getElementById("ov-text");
  const ovBtn = document.getElementById("ov-btn");
  const ovMenu = document.getElementById("ov-menu");
  const undoBtn = document.getElementById("undo-btn");
  const shuffleBtn = document.getElementById("shuffle-btn");
  const restartBtn = document.getElementById("restart-btn");
  const undoN = document.getElementById("undo-n");
  const shuffleN = document.getElementById("shuffle-n");
  const startPanel = document.getElementById("start-panel");
  const spDiffName = document.getElementById("sp-diff-name");
  const spStart = document.getElementById("sp-start");
  const volBtn = document.getElementById("vol-btn");
  const volPanel = document.getElementById("vol-panel");
  const musicVolEl = document.getElementById("music-vol");
  const sfxVolEl = document.getElementById("sfx-vol");
  const scaler = document.getElementById("scaler");
  const scalerWrap = document.getElementById("scaler-wrap");

  // ---------- 自适应缩放（窄屏也能完整显示，不横向溢出） ----------
  // 思路：内容按 400 基准宽设计；窄屏时用 transform:scale 等比缩小整块内容，
  // 并用外层占位容器补偿缩放后的高度，避免出现空白或滚动条。
  function fitScale() {
    if (!scaler) return;
    const BASE = 400;                                    // 内容基准宽度
    const avail = document.documentElement.clientWidth;   // 可用宽度
    const scale = Math.min(1, (avail - 24) / BASE);       // 两侧各留 12px
    scaler.style.transform = "scale(" + scale + ")";
    scaler.style.transformOrigin = "top center";
    // 不裁切、不设固定高度，缩放只影响视觉大小，绝不影响可点性
  }
  window.addEventListener("resize", fitScale);
  window.addEventListener("orientationchange", () => setTimeout(fitScale, 120));

  // ---------- 状态 ----------
  let tiles = [];
  let tray = [];
  let history = [];
  let undos = 3, shuffles = 3;
  let over = false, won = false;
  let currentLevel = "easy";
  let pendingLevel = "easy";

  // ---------- 音频（Web Audio，无需任何音频文件） ----------
  const Sound = (function () {
    let ctx = null, master = null, musicGain = null, sfxGain = null;
    let musicVol = parseFloat(localStorage.getItem("yys_musicvol"));
    if (isNaN(musicVol)) musicVol = (localStorage.getItem("yys_music") === "0") ? 0 : 30;
    let sfxVol = parseFloat(localStorage.getItem("yys_sfxvol"));
    if (isNaN(sfxVol)) sfxVol = (localStorage.getItem("yys_sfx") === "0") ? 0 : 50;
    let musicTimer = null, step = 0;
    const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 698.46];

    function ensure() {
      if (ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = (musicVol / 100) * 0.6; musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = sfxVol / 100; sfxGain.connect(master);
      return true;
    }
    function resume() { if (ctx && ctx.state === "suspended") ctx.resume(); }
    function note(freq, dur, type, gain, dest) {
      if (!ctx) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "sine"; o.frequency.value = freq;
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || sfxGain);
      o.start(t); o.stop(t + dur + 0.02);
    }
    function tick() {
      if (musicVol > 0) note(melody[step % melody.length], 0.35, "triangle", 0.6, musicGain);
      step++;
    }
    function startMusic() {
      if (!ensure()) return; resume();
      if (musicTimer) return;
      tick();
      musicTimer = setInterval(tick, 430);
    }
    function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
    function click() { if (!ctx) return; note(330, 0.07, "square", 0.35); }
    function match() { if (!ctx) return; note(660, 0.1, "sine", 0.5); setTimeout(() => note(990, 0.12, "sine", 0.5), 90); }
    function win() { if (!ctx) return; [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => note(f, 0.22, "sine", 0.5), i * 130)); }
    function lose() { if (!ctx) return; [440, 330, 220].forEach((f, i) => setTimeout(() => note(f, 0.26, "sawtooth", 0.4), i * 150)); }
    function initOnGesture() { if (!ensure()) return; resume(); if (musicVol > 0) startMusic(); }
    function setMusicVol(v) {
      v = Math.max(0, Math.min(100, v));
      musicVol = v; localStorage.setItem("yys_musicvol", String(v));
      if (musicGain) musicGain.gain.value = (v / 100) * 0.6;
      if (ctx) { if (v > 0) startMusic(); else stopMusic(); }
    }
    function setSfxVol(v) {
      v = Math.max(0, Math.min(100, v));
      sfxVol = v; localStorage.setItem("yys_sfxvol", String(v));
      if (sfxGain) sfxGain.gain.value = v / 100;
    }
    return { initOnGesture, click, match, win, lose, setMusicVol, setSfxVol, getMusicVol: () => musicVol, getSfxVol: () => sfxVol };
  })();

  // 音量图标（内联 SVG，避免 emoji 字体依赖）+ 根据是否完全静音切换图标
  const VOL_ICON = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M4 9v6h4l5 5V4L8 9H4z"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M16 8.5a4.5 4.5 0 010 7"/></svg>';
  const MUTE_ICON = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M4 9v6h4l5 5V4L8 9H4z"/><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" d="M16 9l5 6M21 9l-5 6"/></svg>';
  function refreshVolIcon() {
    const muted = Sound.getMusicVol() === 0 && Sound.getSfxVol() === 0;
    volBtn.innerHTML = muted ? MUTE_ICON : VOL_ICON;
    volBtn.classList.toggle("muted", muted);
  }

  // ---------- 工具 ----------
  function shuffleArr(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildLayout(cfg) {
    const pos = [];
    cfg.layers.forEach((L, li) => {
      const w = (L.c - 1) * PITCH + TILE;
      const h = (L.r - 1) * PITCH + TILE;
      const sx = (BOARD_W - w) / 2 + L.ox;
      const sy = (BOARD_H - h) / 2 + L.oy;
      for (let r = 0; r < L.r; r++) {
        for (let c = 0; c < L.c; c++) {
          pos.push({ layer: li, x: sx + c * PITCH, y: sy + r * PITCH });
        }
      }
    });
    return pos;
  }

  function buildBag(n, typeCount) {
    const bag = [];
    for (let i = 0; i < typeCount; i++) {
      const count = n / typeCount; // 每种图标数量（必为 3 的倍数）
      for (let j = 0; j < count; j++) bag.push(ICONS[i].name);
    }
    return shuffleArr(bag);
  }

  function overlapArea(a, b) {
    const ix = Math.max(0, Math.min(a.x + TILE, b.x + TILE) - Math.max(a.x, b.x));
    const iy = Math.max(0, Math.min(a.y + TILE, b.y + TILE) - Math.max(a.y, b.y));
    return ix * iy;
  }

  function isCovered(t) {
    if (t.removed) return false;
    const limit = TILE * TILE * 0.32;
    for (const o of tiles) {
      if (o === t || o.removed) continue;
      if (o.layer > t.layer && overlapArea(t, o) > limit) return true;
    }
    return false;
  }

  function updateCovered() {
    for (const t of tiles) {
      if (t.removed) continue;
      t.el.classList.toggle("covered", isCovered(t));
    }
  }

  // ---------- 托盘 ----------
  function renderTray() {
    trayEl.innerHTML = "";
    for (let i = 0; i < TRAY_SLOTS; i++) {
      const slot = document.createElement("div");
      slot.className = "slot";
      const item = tray[i];
      if (item) {
        slot.classList.add("filled");
        slot.innerHTML = ICON_BY_NAME[item.type] || "";
      }
      trayEl.appendChild(slot);
    }
  }

  function remainingCount() { return tiles.filter((t) => !t.removed).length; }
  function updateRemain() { remainEl.textContent = "剩余 " + remainingCount(); }

  // ---------- 撤销快照 ----------
  function snapshot() {
    return { removed: tiles.map((t) => t.removed), tray: tray.map((s) => (s ? s.type : null)) };
  }
  function restore(s) {
    tiles.forEach((t, i) => {
      t.removed = s.removed[i];
      t.el.classList.toggle("taken", t.removed);
    });
    tray = s.tray.map((tp) => (tp ? { type: tp } : null));
    renderTray();
    updateCovered();
    updateRemain();
  }

  // ---------- 操作 ----------
  function onTileClick(t) {
    if (over || won || t.removed || isCovered(t)) return;
    if (tray.filter(Boolean).length >= TRAY_SLOTS) return;
    Sound.initOnGesture();
    Sound.click();
    if (navigator.vibrate) navigator.vibrate(15); // 点击牌面的轻震动

    history.push(snapshot());
    const slot = tray.findIndex((s) => s === null);
    tray[slot] = { type: t.type };
    t.removed = true;
    t.el.classList.add("taken");

    renderTray();
    resolveMatches();
    updateCovered();
    updateRemain();
    checkEnd();
  }

  function resolveMatches() {
    const counts = {};
    tray.forEach((s) => { if (s) counts[s.type] = (counts[s.type] || 0) + 1; });
    let cleared = false;
    for (const type in counts) {
      if (counts[type] >= 3) {
        let need = 3;
        for (let i = 0; i < TRAY_SLOTS && need > 0; i++) {
          if (tray[i] && tray[i].type === type) { tray[i] = null; need--; }
        }
        cleared = true;
      }
    }
    if (cleared) {
      Sound.match();
      if (navigator.vibrate) navigator.vibrate(28); // 三连消除的稍强震动
      tray = tray.filter(Boolean);
      while (tray.length < TRAY_SLOTS) tray.push(null);
      renderTray();
    }
  }

  function checkEnd() {
    if (remainingCount() === 0 && tray.filter(Boolean).length === 0) {
      won = true;
      if (currentLevel === "easy") {
        // 简单通关 → 直接进入困难关卡（先弹难度）
        showResult("通关！", "简单关卡已通关，进入困难关卡～", "进入困难",
          () => showBanner("hard"), () => showBanner("easy"));
      } else {
        // 困难通关 → 全部通关
        showResult("全部通关！", "你比羊还聪明，太厉害了！", "再玩一次",
          () => startLevel("hard"), () => showBanner("easy"));
      }
      Sound.win();
    } else if (tray.filter(Boolean).length >= TRAY_SLOTS) {
      over = true;
      showResult("槽位满了", "七个格子没凑齐三连，再来一局吧", "重试",
        () => startLevel(currentLevel), () => showBanner("easy"));
      Sound.lose();
    }
  }

  function doUndo() {
    if (over || won) return;
    if (undos <= 0 || history.length === 0) return;
    restore(history.pop());
    undos--;
    undoN.textContent = undos;
    undoBtn.disabled = undos <= 0 || history.length === 0;
  }

  function doShuffle() {
    if (over || won || shuffles <= 0) return;
    const alive = tiles.filter((t) => !t.removed);
    const types = shuffleArr(alive.map((t) => t.type));
    alive.forEach((t, i) => { t.type = types[i]; t.el.innerHTML = ICON_BY_NAME[t.type] || ""; });
    shuffles--;
    shuffleN.textContent = shuffles;
    shuffleBtn.disabled = shuffles <= 0;
    updateCovered();
  }

  // ---------- 新游戏 / 关卡 ----------
  function newGame(key) {
    const cfg = LEVELS[key];
    currentLevel = key;
    boardEl.innerHTML = "";
    tiles = [];
    tray = new Array(TRAY_SLOTS).fill(null);
    history = [];
    undos = cfg.undo; shuffles = cfg.shuffle;
    over = false; won = false;
    overlay.classList.add("hidden");
    undoN.textContent = undos;
    shuffleN.textContent = shuffles;
    undoBtn.disabled = false;
    shuffleBtn.disabled = false;

    const pos = buildLayout(cfg);
    const bag = buildBag(pos.length, cfg.types);
    pos.forEach((p, i) => {
      const el = document.createElement("div");
      el.className = "tile";
      el.style.left = p.x + "px";
      el.style.top = p.y + "px";
      el.style.zIndex = String(p.layer);
      el.innerHTML = ICON_BY_NAME[bag[i]] || "";
      const t = { id: i, type: bag[i], layer: p.layer, x: p.x, y: p.y, el, removed: false };
      el.addEventListener("click", () => onTileClick(t));
      boardEl.appendChild(el);
      tiles.push(t);
    });

    renderTray();
    updateCovered();
    updateRemain();
  }

  function showResult(title, text, btnText, onBtn, onMenu) {
    ovTitle.textContent = title;
    ovText.textContent = text;
    ovBtn.textContent = btnText;
    ovBtn.onclick = onBtn;
    ovMenu.onclick = onMenu;
    overlay.classList.remove("hidden");
  }

  // ---------- 开始面板（居中显示难度，点开始游戏进入关卡） ----------
  function showBanner(key) {
    pendingLevel = key;
    spDiffName.textContent = LEVELS[key].name;
    boardEl.innerHTML = "";
    overlay.classList.add("hidden");
    startPanel.classList.remove("hidden");
  }

  function startLevel(key) {
    Sound.initOnGesture(); // 点击「开始」= 用户手势，顺手解锁音频
    currentLevel = key;
    startPanel.classList.add("hidden");
    overlay.classList.add("hidden");
    newGame(key);
  }

  // ---------- 绑定 ----------
  undoBtn.addEventListener("click", doUndo);
  shuffleBtn.addEventListener("click", doShuffle);
  restartBtn.addEventListener("click", () => newGame(currentLevel));
  spStart.addEventListener("click", () => startLevel(pendingLevel));

  // 音量图标：点开/收起音量面板
  volBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    volPanel.classList.toggle("hidden");
  });
  // 点击面板以外的任意位置收起面板
  document.addEventListener("pointerdown", (e) => {
    if (!volPanel.classList.contains("hidden") &&
        !volPanel.contains(e.target) && e.target !== volBtn && !volBtn.contains(e.target)) {
      volPanel.classList.add("hidden");
    }
  });
  musicVolEl.addEventListener("input", () => { Sound.setMusicVol(+musicVolEl.value); refreshVolIcon(); });
  sfxVolEl.addEventListener("input", () => { Sound.setSfxVol(+sfxVolEl.value); refreshVolIcon(); });

  // 首次任意交互时解锁音频（满足浏览器自动播放策略）
  document.addEventListener("pointerdown", () => Sound.initOnGesture(), { once: true });

  // 初始化：把滑块拨到已保存的音量，并刷新图标
  musicVolEl.value = Sound.getMusicVol();
  sfxVolEl.value = Sound.getSfxVol();
  refreshVolIcon();
  fitScale();          // 初始化时按屏幕宽度自适应
  showBanner("easy");  // 开局顶部显示难度，点开始游戏即进入简单关

  // 等字体/布局稳定后再校正一次，避免首帧测量偏差
  window.addEventListener("load", fitScale);
  setTimeout(fitScale, 60);
})();
