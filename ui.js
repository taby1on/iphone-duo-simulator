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
  return themes;
}
