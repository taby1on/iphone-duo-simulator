// Independent, data-driven screen runtime. No Apple UI images are used here.
const APPS = [
  ['Orbit', '#5b7cfa', '◎'], ['Messages', '#38c576', '●'], ['Camera', '#4a4d58', '◉'], ['Photos', '#f39a83', '✦'],
  ['Notes', '#f2c94c', '≡'], ['Studio', '#d077ee', '✳'], ['Maps', '#6eb8a1', '⌁'], ['Weather', '#56aee8', '☀'],
  ['Music', '#ef6b94', '♫'], ['Journal', '#9a826d', '▤'], ['Files', '#5a91e7', '▰'], ['Settings', '#77808d', '⚙'],
];
const ease = value => 1 - Math.pow(1 - Math.min(1, Math.max(0, value)), 4);
const round = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const label = (ctx, value, x, y, size, weight = 500, color = '#fff') => {
  ctx.save(); ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y); ctx.restore();
};

export function createSimulatorUI() {
  const canvases = {}, hits = { inner: [], outer: [] };
  for (const kind of ['inner', 'outer']) {
    const canvas = document.createElement('canvas'); canvas.width = kind === 'inner' ? 1600 : 774; canvas.height = 1125; canvases[kind] = canvas;
  }
  const state = { page: 'lock', unlock: null, notice: null, media: null, dark: false };
  const layout = kind => kind === 'inner'
    ? { cols: 6, icon: 128, gap: 54, top: 240, dock: 948 }
    : { cols: 3, icon: 142, gap: 45, top: 235, dock: 948 };

  function wallpaper(ctx, w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#9ebad0'); sky.addColorStop(.42, '#d6d1ba'); sky.addColorStop(1, '#c7a98d'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    const mountain = ctx.createLinearGradient(0, h * .32, 0, h * .73); mountain.addColorStop(0, 'rgba(57,68,68,.66)'); mountain.addColorStop(1, 'rgba(28,32,34,.88)');
    ctx.fillStyle = mountain; ctx.beginPath(); ctx.moveTo(0, h * .56);
    for (let x = 0; x <= w; x += w / 14) ctx.lineTo(x, h * (.47 + .08 * Math.sin(x / w * 10.2) + .035 * Math.sin(x / w * 31)));
    ctx.lineTo(w, h * .76); ctx.lineTo(0, h * .76); ctx.closePath(); ctx.fill();
    const dune = ctx.createLinearGradient(0, h * .48, w, h); dune.addColorStop(0, '#9d8167'); dune.addColorStop(.42, '#e4c9a4'); dune.addColorStop(1, '#f3ddbd');
    ctx.fillStyle = dune; ctx.beginPath(); ctx.moveTo(0, h * .62); ctx.bezierCurveTo(w * .19, h * .76, w * .33, h * .72, w * .52, h * .67); ctx.bezierCurveTo(w * .71, h * .79, w * .83, h * .62, w, h * .53); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let y = h * .72; y < h; y += 17) ctx.fillRect(0, y, w, 1);
    if (state.dark) { ctx.fillStyle = 'rgba(0,5,12,.72)'; ctx.fillRect(0, 0, w, h); }
  }
  function status(ctx, w) { label(ctx, '9:41', 66, 66, 28, 650); label(ctx, '◒', w - 84, 66, 32, 600); }
  function icon(ctx, app, x, y, size) {
    const [name, color, glyph] = app, fill = ctx.createLinearGradient(x, y, x + size, y + size); fill.addColorStop(0, '#fff'); fill.addColorStop(.09, color); fill.addColorStop(1, color);
    ctx.save(); round(ctx, x, y, size, size, size * .265); ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha = .24; ctx.fillStyle = '#fff'; round(ctx, x + 8, y + 8, size - 16, size * .42, size * .22); ctx.fill(); label(ctx, glyph, x + size / 2, y + size / 2 + 1, size * .5, 600); ctx.restore(); label(ctx, name, x + size / 2, y + size + 30, 23, 550);
  }
  function home(ctx, canvas, kind) {
    const { width: w, height: h } = canvas, l = layout(kind); wallpaper(ctx, w, h); status(ctx, w); hits[kind] = [];
    const gridW = l.cols * l.icon + (l.cols - 1) * l.gap, left = (w - gridW) / 2;
    APPS.forEach((app, i) => { const col = i % l.cols, row = Math.floor(i / l.cols), x = left + col * (l.icon + l.gap), y = l.top + row * (l.icon + 72); icon(ctx, app, x, y, l.icon); hits[kind].push({ x, y, w: l.icon, h: l.icon + 50, app: app[0] }); });
    const dock = [APPS[0], APPS[1], APPS[8], APPS[11]], dockW = Math.min(w * .76, dock.length * (l.icon + 36) + 70), dockX = (w - dockW) / 2, dockY = l.dock - l.icon;
    ctx.save(); round(ctx, dockX, dockY - 26, dockW, l.icon + 52, 48); ctx.fillStyle = 'rgba(240,247,255,.31)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.46)'; ctx.lineWidth = 2; ctx.stroke(); const space = (dockW - dock.length * l.icon) / (dock.length + 1); dock.forEach((app, i) => { const x = dockX + space + i * (l.icon + space); icon(ctx, app, x, dockY, l.icon); hits[kind].push({ x, y: dockY, w: l.icon, h: l.icon + 50, app: app[0] }); }); ctx.restore();
  }
  function lock(ctx, canvas, kind, progress) {
    const { width: w, height: h } = canvas, amount = ease(progress), y = -h * .43 * amount; wallpaper(ctx, w, h); status(ctx, w); ctx.save(); ctx.globalAlpha = 1 - amount; ctx.translate(0, y);
    label(ctx, 'Wednesday, April 1', w / 2, 205, 34, 600); label(ctx, '9:41', w / 2, 370, 220, 300); const controlX = w - (kind === 'inner' ? 112 : 102);
    [[0, '⌁'], [116, '◉']].forEach(([offset, symbol]) => { ctx.fillStyle = 'rgba(31,35,37,.26)'; ctx.beginPath(); ctx.arc(controlX, h - 184 + offset, 43, 0, Math.PI * 2); ctx.fill(); label(ctx, symbol, controlX, h - 184 + offset, 35, 600); });
    ctx.fillStyle = 'rgba(255,255,255,.92)'; round(ctx, w * .35, h - 64, w * .30, 9, 9); ctx.fill(); label(ctx, 'Swipe up to open', w / 2, h - 112, 24, 500); ctx.restore();
  }
  function notice(ctx, canvas, progress) {
    const { width: w, height: h } = canvas, amount = ease(progress), cardW = Math.min(w * .7, 560), cardH = 278, x = (w - cardW) / 2, y = (h - cardH) / 2;
    ctx.save(); ctx.globalAlpha = amount; ctx.translate(w / 2, h / 2); ctx.scale(.9 + .1 * amount, .9 + .1 * amount); ctx.translate(-w / 2, -h / 2);
    const fill = ctx.createLinearGradient(x, y, x + cardW, y + cardH); fill.addColorStop(0, 'rgba(255,255,255,.73)'); fill.addColorStop(.5, 'rgba(205,224,245,.53)'); fill.addColorStop(1, 'rgba(166,191,222,.48)'); round(ctx, x, y, cardW, cardH, 48); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.84)'; ctx.lineWidth = 2; ctx.stroke(); label(ctx, 'Not Available', w / 2, y + 86, 36, 650, '#141820'); label(ctx, 'This app is not supported yet.', w / 2, y + 137, 26, 450, '#303746'); label(ctx, 'OK', w / 2, y + 218, 30, 650, '#1468d8'); ctx.restore();
  }
  function mediaPreview(ctx, canvas) {
    const { width: w, height: h } = canvas, media = state.media.element;
    ctx.fillStyle = '#090a0d'; ctx.fillRect(0, 0, w, h);
    const sourceW = state.media.width, sourceH = state.media.height;
    const scale = Math.max(w / sourceW, h / sourceH), drawW = sourceW * scale, drawH = sourceH * scale;
    ctx.drawImage(media, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
    if (state.dark) { ctx.fillStyle = 'rgba(0,4,10,.38)'; ctx.fillRect(0, 0, w, h); }
  }
  function render() { for (const kind of ['inner', 'outer']) { const canvas = canvases[kind], ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); if (state.page === 'media') mediaPreview(ctx, canvas); else if (state.page === 'home') home(ctx, canvas, kind); else { home(ctx, canvas, kind); lock(ctx, canvas, kind, state.unlock?.progress || 0); } if (state.notice) notice(ctx, canvas, state.notice.progress); } }
  function beginUnlock() { if (state.page !== 'lock') return false; state.page = 'unlocking'; state.unlock = { progress: 0 }; render(); return true; }
  function lockScreen() { if (state.media?.type === 'video') state.media.element.pause(); state.page = 'lock'; state.unlock = null; state.notice = null; render(); }
  function previewMedia(media) { if (state.media?.type === 'video') state.media.element.pause(); if (state.media?.url) URL.revokeObjectURL(state.media.url); state.page = 'media'; state.unlock = null; state.notice = null; state.media = media; render(); }
  function setDarkMode(dark) { state.dark = dark; render(); }
  async function playMedia({ restart = false } = {}) {
    if (state.page !== 'media' || state.media?.type !== 'video') return false;
    if (restart) state.media.element.currentTime = 0;
    try { await state.media.element.play(); return true; } catch { return false; }
  }
  function pauseMedia() { if (state.media?.type === 'video') state.media.element.pause(); }
  function update(delta) { let changed = false; if (state.unlock) { state.unlock.progress = Math.min(1, state.unlock.progress + delta / .78); changed = true; if (state.unlock.progress === 1) { state.page = 'home'; state.unlock = null; } } if (state.notice?.progress < 1) { state.notice.progress = Math.min(1, state.notice.progress + delta / .26); changed = true; } if (state.page === 'media' && state.media?.type === 'video' && state.media.element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && state.media.time !== state.media.element.currentTime) { state.media.time = state.media.element.currentTime; changed = true; } if (changed) render(); return changed; }
  function tap(kind, uv) { const canvas = canvases[kind], x = uv.x * canvas.width, y = (1 - uv.y) * canvas.height; if (state.notice) { state.notice = null; render(); return 'dismiss'; } if (state.page === 'lock') return 'unlock'; if (state.page !== 'home') return null; const app = hits[kind].find(hit => x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h); if (!app) return null; state.notice = { progress: 0, app: app.app }; render(); return 'notice'; }
  render(); return { textures: canvases, beginUnlock, previewMedia, playMedia, pauseMedia, lockScreen, setDarkMode, update, tap, get page() { return state.page; }, get hasVideo() { return state.page === 'media' && state.media?.type === 'video'; } };
}
