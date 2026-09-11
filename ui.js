export async function loadDefaultUIs() {
  const images = Object.fromEntries(await Promise.all([
    'wallpaper-inner.avif',
    'clock-inner.avif', 'clock-outer.avif',
    'launcher-inner.png', 'launcher-outer.png'
  ].map(async name => {
    const image = new Image();
    image.src = `./assets/ui/${name}`;
    await image.decode();
    return [name, image];
  })));
  const themes = { lockscreen: {}, home: {}, wallpaper: {}, launcher: {} };
  const innerWidth = 1600;
  for (const [theme, screens] of Object.entries(themes)) {
    for (const kind of ['inner', 'outer']) {
      const canvas = document.createElement('canvas');
      canvas.width = kind === 'inner' ? innerWidth : 774;
      canvas.height = 1125;
      const context = canvas.getContext('2d');
      if (theme === 'lockscreen') {
        context.drawImage(images['wallpaper-inner.avif'], canvas.width - innerWidth, 0, innerWidth, canvas.height);
        drawLockScreen(context, canvas);
      } else if (theme === 'home') {
        context.drawImage(images['wallpaper-inner.avif'], canvas.width - innerWidth, 0, innerWidth, canvas.height);
        drawHome(context, canvas, kind);
      } else if (theme === 'wallpaper') {
        context.drawImage(images['wallpaper-inner.avif'], canvas.width - innerWidth, 0, innerWidth, canvas.height);
        context.drawImage(images[`clock-${kind}.avif`], 0, 0, canvas.width, canvas.height);
      } else {
        // The HIG screenshots include a device frame; use only their display area.
        const crop = kind === 'inner' ? [22, 22, 1072, 754] : [28, 16, 510, 742];
        context.drawImage(images[`launcher-${kind}.png`], ...crop, 0, 0, canvas.width, canvas.height);
      }
      screens[kind] = canvas;
    }
  }
  return themes;
}

function drawLockScreen(context, canvas) {
  const scale = canvas.width / 1600;
  context.save();
  context.fillStyle = 'rgba(255,255,255,.97)';
  context.textAlign = 'center';
  context.font = `${35 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
  context.fillText('9月11日，星期五', canvas.width / 2, 200 * scale);
  context.font = `500 ${220 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
  context.letterSpacing = '-12px';
  context.fillText('9:41', canvas.width / 2, 420 * scale);
  context.font = `${30 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
  context.fillText('向上轻扫以解锁', canvas.width / 2, canvas.height - 100 * scale);
  context.fillRect(canvas.width / 2 - 105 * scale, canvas.height - 66 * scale, 210 * scale, 8 * scale);
  context.restore();
}

function drawHome(context, canvas, kind) {
  const scale = canvas.width / 1600;
  const size = 124 * scale;
  const gap = 36 * scale;
  const columns = kind === 'inner' ? 5 : 2;
  const width = columns * size + (columns - 1) * gap;
  const startX = (canvas.width - width) / 2;
  const startY = 205 * scale;
  context.save();
  for (let index = 0; index < columns * 2; index++) {
    const x = startX + (index % columns) * (size + gap);
    const y = startY + Math.floor(index / columns) * (size + 57 * scale);
    const hue = 204 + index * 13;
    const gradient = context.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, `hsl(${hue}, 86%, 73%)`);
    gradient.addColorStop(1, `hsl(${hue + 38}, 78%, 54%)`);
    context.fillStyle = gradient;
    context.beginPath(); context.roundRect(x, y, size, size, 30 * scale); context.fill();
    context.fillStyle = 'rgba(255,255,255,.96)';
    context.font = `600 ${42 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText('+', x + size / 2, y + size / 2 + 2 * scale);
    context.font = `${22 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText('Your app', x + size / 2, y + size + 31 * scale);
  }
  context.fillStyle = 'rgba(255,255,255,.32)';
  context.beginPath(); context.roundRect(canvas.width * .19, canvas.height - 190 * scale, canvas.width * .62, 135 * scale, 46 * scale); context.fill();
  context.restore();
}
