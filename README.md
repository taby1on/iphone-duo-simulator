# iPhone Duo Simulator

A browser-based, interactive foldable-device simulator built with Three.js.

[Live demo](https://iphone-duo-tawny.vercel.app/)

## Features

- Only the cover half rotates; the rear-camera half stays fixed.
- Screen content uses a fixed front-view projection during folding. The outer UI stays aligned with its hinge-side left edge.
- Blur and darkening follow the image coordinates, including the image edges. Maximum blur radius is 72 source pixels; darkening uses twice the transition strength, capped at black.
- A data-driven lock screen and launcher: individual icon regions, stateful unlock, and a Liquid Glass-style unavailable-app notice.
- The home layer remains fixed while the lock layer leaves the screen during unlock.
- The screen runtime is independent from the 3D mesh, so each app can later be replaced with its own route and interaction model.
- Drag to orbit, scroll to zoom, or use the play button and slider to fold the device.
- Responsive controls for desktop and mobile.

## Run locally

The application is static HTML, CSS, and JavaScript. No Node.js build step is required. Three.js is bundled locally.

The 3D device model is prepared from its source asset. The simulator UI itself is generated from code and does not use system screenshots:

```sh
git clone https://github.com/jadon7/iphone-duo.git
cd iphone-duo
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-assets.txt
python scripts/prepare-assets.py
python -m http.server 8766 --bind 127.0.0.1
```

On Windows, activate the environment with `.venv\Scripts\activate`.

Open [http://127.0.0.1:8766/](http://127.0.0.1:8766/). Serve the directory over HTTP; opening `index.html` as a local file cannot load the model.

The preparation script downloads the original Star White USDZ, selects its Landscape pose, flattens model references, and rewrites texture paths for the browser. The resulting files stay in the ignored `assets/` directory.

## Screen interaction

Use Space, swipe upward over the display, or select **Unlock** to open the device. The unlocked launcher is drawn from structured icon data, rather than a single background image. Selecting any displayed icon opens a Liquid Glass-style “Not Available” notice; tap again to dismiss it.

Use **Upload photo or video** in the control dock to preview media on the Duo displays. The recommended unfolded-inner-screen size is **2670 × 1878 px** (landscape, **1.422:1**). PNG, JPG, and WebP images up to 25 MB are accepted; MP4, WebM, and MOV videos up to 100 MB play muted in a loop. Other aspect ratios remain supported, with a clearly indicated centered crop instead of distortion.

The slider controls the fold from closed to open. The default view is fully open and paused. The outer screen turns off at full opening.

## Source map

| File | Purpose |
| --- | --- |
| `index.html` | Screen-mode tabs and fold controls |
| `main.js` | Three.js scene, fold deformation, projected UI, blur, and darkening |
| `ui.js` | Structured simulator screen runtime: lock, launcher, icons, unlock and notice states |
| `style.css` | Desktop and mobile layout |
| `scripts/prepare-assets.py` | Download and prepare the 3D model asset |
| `vercel.json` | Install and prepare assets during Vercel builds |
| `vendor/three/` | Three.js runtime and required add-ons |

## Deploy

The Vercel project is connected to this GitHub repository. Pushes to `main` publish the production site; other branches create preview deployments.

`vercel.json` installs the asset tools and runs `scripts/prepare-assets.py` during each build. Git deployments therefore include the model and screen images without storing those assets in the repository.

For a manual Vercel deployment:

```sh
vercel link
vercel --prod
```

`.vercelignore` keeps local credentials and Git metadata out of deployments while including the prepared assets.

For other static hosts, prepare the assets locally before publishing the project directory.

## License and sources

Original application code is released under the [MIT license](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for bundled libraries and reference assets.

The 3D model asset is excluded from the repository and MIT license. The simulator UI is an independent implementation; it does not distribute Apple system assets, app icons, templates, or system files.

- [Apple iPhone Duo](https://www.apple.com/iphone-duo/)
- [Apple HIG: Designing for iPhone Duo](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo)
- [Three.js](https://threejs.org/)
