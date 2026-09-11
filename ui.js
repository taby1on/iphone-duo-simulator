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
  const themes = { lockscreen: {}, home: {} };
  const innerWidth = 1600;
  for (const [theme, screens] of Object.entries(themes)) {
    for (const kind of ['inner', 'outer']) {
      const canvas = document.createElement('canvas');
      canvas.width = kind === 'inner' ? innerWidth : 774;
      canvas.height = 1125;
      const context = canvas.getContext('2d');
      if (theme === 'lockscreen') {
        context.drawImage(images['wallpaper-inner.avif'], canvas.width - innerWidth, 0, innerWidth, canvas.height);
        // Apple supplies this complete landscape lock screen, including the
        // date/time, connectivity status, shortcut controls, and home bar.
        context.drawImage(images[`clock-${kind}.avif`], 0, 0, canvas.width, canvas.height);
      } else {
        // The supplied Launcher references preserve the platform's exact
        // icon grid, spacing, dock, and display crop. Remove the device frame.
        const crop = kind === 'inner' ? [22, 22, 1072, 754] : [28, 16, 510, 742];
        context.drawImage(images[`launcher-${kind}.png`], ...crop, 0, 0, canvas.width, canvas.height);
      }
      screens[kind] = canvas;
    }
  }
  const animator = createUnlockAnimator(images);
  const notification = createNotificationAnimator(images);
  return { themes, animator, notification };
}

function createNotificationAnimator(images) {
  const canvases = {}, textures = {};
  for (const kind of ['inner', 'outer']) {
    const canvas = document.createElement('canvas');
    canvas.width = kind === 'inner' ? 1600 : 774; canvas.height = 1125;
    canvases[kind] = canvas; textures[kind] = canvas;
  }
  const rounded = (ctx, x, y, w, h, r) => {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  const drawHome = (ctx, canvas, kind) => {
    const crop = kind === 'inner' ? [22, 22, 1072, 754] : [28, 16, 510, 742];
    ctx.drawImage(images[`launcher-${kind}.png`], ...crop, 0, 0, canvas.width, canvas.height);
  };
  const render = progress => {
    const ease = 1 - Math.pow(1 - Math.min(1, progress), 4);
    for (const kind of ['inner', 'outer']) {
      const canvas = canvases[kind], ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height, cardW = kind === 'inner' ? 580 : 540, cardH = 282;
      const x = (w - cardW) / 2, y = (h - cardH) / 2 - 20, scale = .88 + .12 * ease;
      ctx.clearRect(0, 0, w, h); drawHome(ctx, canvas, kind);
      ctx.save(); ctx.globalAlpha = ease; ctx.translate(w / 2, h / 2); ctx.scale(scale, scale); ctx.translate(-w / 2, -h / 2);
      // Translucent, refractive Liquid Glass card with a specular top edge.
      ctx.save(); rounded(ctx, x - 20, y - 20, cardW + 40, cardH + 40, 56); ctx.clip();
      ctx.globalAlpha = .33; ctx.filter = 'blur(25px) saturate(1.4)'; ctx.drawImage(canvas, -12, -12, w + 24, h + 24); ctx.restore();
      const glass = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
      glass.addColorStop(0, 'rgba(255,255,255,.70)'); glass.addColorStop(.5, 'rgba(226,238,255,.46)'); glass.addColorStop(1, 'rgba(181,201,230,.40)');
      rounded(ctx, x, y, cardW, cardH, 48); ctx.fillStyle = glass; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillStyle = '#151820'; ctx.font = '600 38px -apple-system, BlinkMacSystemFont, sans-serif'; ctx.fillText('Not Available', w / 2, y + 104);
      ctx.fillStyle = 'rgba(21,24,32,.78)'; ctx.font = '400 28px -apple-system, BlinkMacSystemFont, sans-serif'; ctx.fillText('This app is not available yet.', w / 2, y + 155);
      ctx.fillStyle = 'rgba(32,105,222,.98)'; ctx.font = '600 30px -apple-system, BlinkMacSystemFont, sans-serif'; ctx.fillText('OK', w / 2, y + 226);
      ctx.restore();
    }
  };
  render(0);
  return { textures, render };
}

function createUnlockAnimator(images) {
  const canvases = {};
  const textures = {};
  for (const kind of ['inner', 'outer']) {
    const canvas = document.createElement('canvas');
    canvas.width = kind === 'inner' ? 1600 : 774;
    canvas.height = 1125;
    canvases[kind] = canvas;
    textures[kind] = canvas;
  }

  const drawReference = (context, canvas, kind, name) => {
    if (name === 'lock') {
      context.drawImage(images['wallpaper-inner.avif'], canvas.width - 1600, 0, 1600, canvas.height);
      context.drawImage(images[`clock-${kind}.avif`], 0, 0, canvas.width, canvas.height);
    } else {
      const crop = kind === 'inner' ? [22, 22, 1072, 754] : [28, 16, 510, 742];
      context.drawImage(images[`launcher-${kind}.png`], ...crop, 0, 0, canvas.width, canvas.height);
    }
  };

  const render = progress => {
    const eased = 1 - Math.pow(1 - Math.min(1, progress), 4);
    // Keep the two keyframes visibly separate before introducing Home.
    const reveal = Math.min(1, Math.max(0, (progress - .22) / .68));
    for (const kind of ['inner', 'outer']) {
      const canvas = canvases[kind];
      const context = canvas.getContext('2d');
      const width = canvas.width, height = canvas.height;
      context.clearRect(0, 0, width, height);

      // The inner and outer home screens are persistent layers. They do not
      // ride the unlock gesture; only lock-screen glass leaves the device.
      drawReference(context, canvas, kind, 'home');

      // The lock screen leaves first, with its own smooth accelerated curve.
      context.save();
      context.globalAlpha = 1 - Math.min(1, progress * 1.45);
      context.translate(0, -height * .125 * eased);
      drawReference(context, canvas, kind, 'lock');
      context.restore();

      // A blurred, refractive glass sheet follows the lock layer upward. The
      // fixed home screen remains visible underneath instead of moving with it.
      const sheet = Math.min(1, Math.max(0, (progress - .10) / .72));
      const sheetY = height * (1 - sheet) * .42;
      context.save();
      // Use a basic clipping rectangle for compatibility with embedded WebViews.
      // The specular/highlight layers below supply the rounded-liquid appearance.
      context.beginPath();
      context.rect(0, sheetY, width, height - sheetY);
      context.clip();
      context.globalAlpha = .28 * (1 - progress);
      context.filter = `blur(${Math.max(0, 30 * (1 - reveal))}px)`;
      context.translate(0, sheetY - height * .055);
      drawReference(context, canvas, kind, 'lock');
      context.restore();

      // Liquid Glass: soft translucency, moving specular edge and a brief bloom.
      if (progress < .88) {
        const glowY = height * (1 - eased);
        const gradient = context.createLinearGradient(0, glowY - 120, 0, glowY + 170);
        gradient.addColorStop(0, 'rgba(255,255,255,0)');
        gradient.addColorStop(.42, `rgba(255,255,255,${.18 * (1 - progress)})`);
        gradient.addColorStop(.52, `rgba(255,255,255,${.48 * (1 - progress)})`);
        gradient.addColorStop(.65, 'rgba(255,255,255,0)');
        context.fillStyle = gradient;
        context.fillRect(0, glowY - 140, width, 340);
      }
    }
  };
  render(0);
  return { textures, render };
}
