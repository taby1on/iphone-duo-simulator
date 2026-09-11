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
  return { themes, animator };
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
    const reveal = Math.min(1, Math.max(0, (progress - .08) / .72));
    for (const kind of ['inner', 'outer']) {
      const canvas = canvases[kind];
      const context = canvas.getContext('2d');
      const width = canvas.width, height = canvas.height;
      context.clearRect(0, 0, width, height);

      // The lock screen leaves first, with its own smooth accelerated curve.
      context.save();
      context.globalAlpha = 1 - Math.min(1, progress * 1.45);
      context.translate(0, -height * .125 * eased);
      drawReference(context, canvas, kind, 'lock');
      context.restore();

      // A blurred, refractive glass sheet carries the new home screen upward.
      const sheet = Math.min(1, Math.max(0, (progress - .04) / .68));
      const sheetY = height * (1 - sheet) * .42;
      context.save();
      context.beginPath();
      context.roundRect(width * .03, sheetY, width * .94, height * .97, width * .052);
      context.clip();
      context.globalAlpha = .44 * reveal;
      context.filter = `blur(${Math.max(0, 30 * (1 - reveal))}px)`;
      context.translate(0, sheetY - height * .055);
      drawReference(context, canvas, kind, 'home');
      context.restore();

      context.save();
      context.globalAlpha = reveal;
      context.translate(0, height * (1 - reveal) * .10);
      drawReference(context, canvas, kind, 'home');
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
