import * as THREE from 'three';
import { USDLoader } from 'three/addons/loaders/USDLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createSimulatorUI } from './ui.js?v=video-transport-controls';

const viewport = document.querySelector('#viewport');
const slider = document.querySelector('#angle');
const play = document.querySelector('#play');
const videoTransport = document.querySelector('#video-transport');
const videoProgress = document.querySelector('#video-progress');
const videoTime = document.querySelector('#video-time');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, .1, 250);
camera.position.set(0, 0, 40);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0xf6f6f3, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
viewport.appendChild(renderer.domElement);
const environment = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(environment, .04).texture;
environment.dispose();
pmrem.dispose();
scene.environmentIntensity = 1.35;
scene.add(new THREE.HemisphereLight(0xffffff, 0xb5baa8, 1.8));
const key = new THREE.DirectionalLight(0xfffcf5, 2.6);
key.position.set(-15, 25, 30);
scene.add(key);
const rim = new THREE.DirectionalLight(0xe8edf5, 2);
rim.position.set(15, 5, -15);
scene.add(rim);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 21;
controls.maxDistance = 65;
controls.target.set(0, 0, .275454);
controls.update();
const phone = new THREE.Group();
scene.add(phone);
const bend = { value: 0 };
// Start as a folded, single-screen device. Opening is intentionally reserved
// for a user-initiated video playback.
let angle = 0;
let playing = false;
let videoPlaybackStarted = false;
let scrubbingVideo = false;
let transition = null;
let openingTransition = null;
let ready = false;
const screens = {};
const raycaster = new THREE.Raycaster();
const screenPointer = new THREE.Vector2();
const uiReferenceEye = new THREE.Vector3(0, 0, 40);
const openingCameraStart = new THREE.Vector3(0, 0, 40);
const openingZoomStart = 1;
const openingZoomEnd = 1.42;
let openingDolly = openingZoomStart;
const innerUIFrame = new THREE.Vector4(-7.89935, .34562 - 5.8974, 15.7987, 11.1035);
const outerUIFrame = new THREE.Vector4(.23396, .27173 - 5.8974, 7.73936, 11.2513)
  .multiplyScalar((uiReferenceEye.z - .24948) / (uiReferenceEye.z - .825538));
const simulator = createSimulatorUI();
const photoUpload = document.querySelector('#photo-upload');
const photoUploadStatus = document.querySelector('#photo-upload-status');
const controlDock = document.querySelector('.control-dock');
const themeToggle = document.querySelector('#theme-toggle');
const themeToggleGlyph = themeToggle.querySelector('.theme-toggle__glyph');
const themeToggleLabel = themeToggle.querySelector('.theme-toggle__label');
for (const kind of ['inner', 'outer']) {
  const texture = new THREE.CanvasTexture(simulator.textures[kind]);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  screens[kind] = {
    material,
    frame: { value: (kind === 'inner' ? innerUIFrame : outerUIFrame).clone() },
    gradient: { value: new THREE.Vector2(kind === 'inner' ? .5 : 0, kind === 'inner' ? 0 : 1) },
    pixel: { value: new THREE.Vector2(1 / simulator.textures[kind].width, 1 / simulator.textures[kind].height) },
  };
}
function hitHomeScreen(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  screenPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  screenPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(screenPointer, camera);
  const possibleScreens = ['inner', 'outer'];
  for (const kind of possibleScreens) {
    const hit = screens[kind].mesh ? raycaster.intersectObject(screens[kind].mesh, false)[0] : null;
    if (!hit?.uv) continue;
    const action = simulator.tap(kind, hit.uv);
    if (action === 'unlock') unlock();
    return Boolean(action);
  }
  return false;
}
document.querySelectorAll('[data-ui-theme]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.uiTheme === 'lockscreen') { simulator.lockScreen(); controlDock.classList.remove('is-hidden'); }
  else unlock();
}));

themeToggle.addEventListener('click', () => {
  const dark = document.body.classList.toggle('dark-mode');
  simulator.setDarkMode(dark);
  for (const screen of Object.values(screens)) screen.material.map.needsUpdate = true;
  themeToggle.setAttribute('aria-label', dark ? 'Enable light background' : 'Enable dark background');
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggleGlyph.textContent = dark ? '☀' : '◐';
  themeToggleLabel.textContent = dark ? 'Light' : 'Dark';
});

photoUpload.addEventListener('change', async () => {
  const file = photoUpload.files?.[0];
  if (!file) return;
  const isVideo = file.type.startsWith('video/');
  if (!file.type.startsWith('image/') && !isVideo) {
    photoUploadStatus.textContent = 'Choose an image or video file.';
    return;
  }
  if (file.size > (isVideo ? 100 : 25) * 1024 * 1024) {
    photoUploadStatus.textContent = isVideo ? 'Choose a video smaller than 100 MB.' : 'Choose an image smaller than 25 MB.';
    return;
  }
  const url = URL.createObjectURL(file);
  let retainedUrl = false;
  try {
    let element, width, height;
    if (isVideo) {
      element = document.createElement('video');
      element.src = url; element.muted = true; element.loop = true; element.playsInline = true; element.preload = 'auto';
      await new Promise((resolve, reject) => {
        element.addEventListener('loadeddata', resolve, { once: true });
        element.addEventListener('error', () => reject(new Error('Unsupported video')), { once: true });
      });
      width = element.videoWidth; height = element.videoHeight;
    } else {
      element = new Image(); element.src = url; await element.decode(); width = element.width; height = element.height;
    }
    simulator.previewMedia({ element, width, height, type: isVideo ? 'video' : 'image', time: -1, url });
    controlDock.classList.remove('is-hidden');
    // An uploaded video is a preview until Play is pressed: hold its first
    // decoded frame on the folded outer display and reset the camera framing.
    setAngle(0);
    camera.position.copy(openingCameraStart);
    setOpeningDolly(openingZoomStart);
    controls.update();
    slider.disabled = !isVideo;
    play.disabled = !isVideo;
    videoTransport.hidden = !isVideo;
    videoProgress.disabled = !isVideo;
    videoPlaybackStarted = false;
    setPlaying(false);
    syncVideoControls();
    retainedUrl = true;
    for (const screen of Object.values(screens)) screen.material.map.needsUpdate = true;
    const ratio = width / height;
    const suited = Math.abs(ratio - 2670 / 1878) < .015;
    photoUploadStatus.textContent = suited
      ? `Loaded ${width} × ${height} · Duo fit${isVideo ? ' · ready to play' : ''}`
      : `Loaded ${width} × ${height} · center-cropped${isVideo ? ' · ready to play' : ''}`;
  } catch {
    if (!retainedUrl) URL.revokeObjectURL(url);
    photoUploadStatus.textContent = isVideo ? 'This video could not be played.' : 'This image could not be read.';
  } finally {
    photoUpload.value = '';
  }
});

function unlock() {
  if (!ready || !simulator.beginUnlock()) return;
  openingTransition = null;
  setPlaying(false); console.info('[duo] lock screen unlock started');
  transition = { from: angle, to: 180, elapsed: 0 };
}
window.addEventListener('keydown', event => {
  if (event.code === 'Space') { event.preventDefault(); unlock(); }
  if (event.code === 'Escape') exitVideoPlayback();
});
let gestureStartY = 0;
renderer.domElement.addEventListener('pointerdown', event => { gestureStartY = event.clientY; });
renderer.domElement.addEventListener('pointerup', event => {
  if (gestureStartY - event.clientY > 42) unlock();
  else hitHomeScreen(event);
});

function setPlaying(value) {
  playing = value;
  document.querySelector('#pause-icon').toggleAttribute('hidden', !value);
  document.querySelector('#play-icon').toggleAttribute('hidden', value);
  play.setAttribute('aria-label', value ? 'Pause video' : videoPlaybackStarted ? 'Resume video' : 'Play video and open Duo');
}
function formatVideoTime(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(Math.floor(safe % 60)).padStart(2, '0')}`;
}
function syncVideoControls() {
  const media = simulator.mediaState();
  videoTransport.hidden = !media.isVideo;
  videoProgress.disabled = !media.isVideo || !media.duration;
  if (!media.isVideo) {
    videoProgress.value = 0;
    videoProgress.style.setProperty('--progress', '0%');
    videoTime.value = '0:00 / 0:00';
    videoTime.textContent = '0:00 / 0:00';
    return;
  }
  const ratio = media.duration ? media.currentTime / media.duration : 0;
  if (!scrubbingVideo) videoProgress.value = String(Math.round(ratio * 1000));
  videoProgress.style.setProperty('--progress', `${ratio * 100}%`);
  videoTime.value = `${formatVideoTime(media.currentTime)} / ${formatVideoTime(media.duration)}`;
  videoTime.textContent = videoTime.value;
  if (playing && media.paused && !openingTransition) setPlaying(false);
}
function exitVideoPlayback() {
  openingTransition = null;
  if (simulator.hasVideo) simulator.pauseMedia();
  setPlaying(false);
  controlDock.classList.remove('is-hidden');
  syncVideoControls();
}
function setOpeningDolly(value) {
  openingDolly = value;
  // Drive the perspective field of view directly. OrbitControls can preserve
  // orbital distance, but it does not overwrite this lens-based dolly.
  const baseFov = camera.userData.baseFov ?? camera.fov;
  camera.zoom = 1;
  camera.fov = baseFov / openingDolly;
  camera.updateProjectionMatrix();
}
function playOpening({ replay = false } = {}) {
  // The landing state must never unfold itself. A video upload followed by a
  // direct click/tap on Play is the sole route into this experience.
  if (!ready || !simulator.hasVideo) return;
  if (replay) {
    setAngle(0);
    camera.position.copy(openingCameraStart);
    setOpeningDolly(openingZoomStart);
    controls.update();
  }
  openingTransition = {
    elapsed: 0,
    duration: 2.45,
    fromAngle: angle,
    fromZoom: openingDolly,
  };
  const hasVideo = simulator.hasVideo;
  if (hasVideo) controlDock.classList.add('is-hidden');
  simulator.playMedia({ restart: replay }).then(playingVideo => {
    if (!playingVideo && hasVideo) controlDock.classList.remove('is-hidden');
    setPlaying(playingVideo);
    syncVideoControls();
  });
}
function setAngle(value) {
  angle = value;
  slider.value = value;
  slider.style.setProperty('--progress', `${value / 1.8}%`);
  bend.value = (180 - value) / 180 * Math.PI;
  screens.outer.material.color.setScalar(value >= 180 ? 0 : 1);
}
play.addEventListener('click', () => {
  if (!simulator.hasVideo) return;
  if (playing || openingTransition) { exitVideoPlayback(); return; }
  transition = null;
  if (!videoPlaybackStarted) {
    videoPlaybackStarted = true;
    playOpening({ replay: true });
    return;
  }
  controlDock.classList.add('is-hidden');
  simulator.playMedia().then(resumed => {
    if (!resumed) controlDock.classList.remove('is-hidden');
    setPlaying(resumed);
    syncVideoControls();
  });
});
slider.addEventListener('input', () => {
  transition = null;
  exitVideoPlayback();
  setAngle(Number(slider.value));
});
videoProgress.addEventListener('pointerdown', () => { scrubbingVideo = true; });
videoProgress.addEventListener('input', () => {
  const media = simulator.mediaState();
  if (!media.isVideo || !media.duration) return;
  simulator.seekMedia(Number(videoProgress.value) / 1000);
  syncVideoControls();
});
videoProgress.addEventListener('change', () => { scrubbingVideo = false; syncVideoControls(); });
function resize() {
  const { width, height } = viewport.getBoundingClientRect();
  renderer.setSize(width, height);
  camera.aspect = width / height;
  const pixelsPerUnit = Math.min(width / 25, height / 17, 37);
  camera.userData.baseFov = THREE.MathUtils.radToDeg(2 * Math.atan(height / pixelsPerUnit / 2 / 40));
  setOpeningDolly(openingDolly);
}
new ResizeObserver(resize).observe(viewport);

const screenShader = `
uniform float foldAngle;
uniform vec2 uiPixel;
uniform vec4 uiFrame;
uniform vec2 uiGradient;
uniform vec3 uiReferenceEye;
varying vec3 vUIPosition;
vec3 screenColor() {
  // Intersect the fixed front-view ray with the unfolded inner-screen plane.
  float depth = (0.24948 - uiReferenceEye.z) / (vUIPosition.z - uiReferenceEye.z);
  vec2 projected = uiReferenceEye.xy + (vUIPosition.xy - uiReferenceEye.xy) * depth;
  vec2 sourceUV = (projected - uiFrame.xy) / uiFrame.zw;
  #ifdef INNER_UI
    float progress = clamp(foldAngle / 1.570796327, 0.0, 1.0);
  #else
    // Anchor the image to the projected hinge-side edge of the outer screen.
    float c = cos(foldAngle), s = sin(foldAngle);
    vec2 hingeEdge = vec2(-0.23396, -0.27463 - 0.275454);
    vec2 foldedEdge = vec2(c * hingeEdge.x + s * hingeEdge.y,
      -s * hingeEdge.x + c * hingeEdge.y + 0.275454);
    float edgeDepth = (0.24948 - uiReferenceEye.z) / (foldedEdge.y - uiReferenceEye.z);
    float anchorX = uiReferenceEye.x + (foldedEdge.x - uiReferenceEye.x) * edgeDepth;
    sourceUV.x = uiGradient.x + (projected.x - anchorX) / uiFrame.z;
    float progress = clamp((3.141592654 - foldAngle) / 1.570796327, 0.0, 1.0);
  #endif
  float edge = (sourceUV.x - uiGradient.x) / (uiGradient.y - uiGradient.x);
  float motion = smoothstep(0.0, 1.0, progress);
  float blurGradient = clamp(edge, 0.0, 1.0);
  float darkenGradient = clamp((edge - 0.2) / 0.8, 0.0, 1.0);
  float effect = motion * pow(darkenGradient, 1.35);
  float radius = 72.0 * motion * pow(blurGradient, 1.35);
  vec2 aa = max(fwidth(sourceUV), uiPixel * 0.5);
  vec2 dx = dFdx(sourceUV) / uiPixel;
  vec2 dy = dFdy(sourceUV) / uiPixel;
  float baseLod = log2(max(1.0, max(length(dx), length(dy))));
  vec2 coverage = smoothstep(-aa, aa, sourceUV)
    * (1.0 - smoothstep(vec2(1.0) - aa, vec2(1.0) + aa, sourceUV));
  vec3 color = textureLod(map, clamp(sourceUV, vec2(0.0), vec2(1.0)), baseLod).rgb * coverage.x * coverage.y;
  if (radius > 0.0) {
    // Use the same mip level at zero blur, then increase it continuously.
    float lod = max(baseLod, log2(max(1.0, radius)));
    vec2 footprint = max(aa, uiPixel * radius * 0.75);
    color = vec3(0.0);
    for (int y = -2; y <= 2; y++) {
      for (int x = -2; x <= 2; x++) {
        float wx = x == 0 ? 6.0 : (abs(x) == 1 ? 4.0 : 1.0);
        float wy = y == 0 ? 6.0 : (abs(y) == 1 ? 4.0 : 1.0);
        vec2 sampleUV = sourceUV + vec2(float(x), float(y)) * uiPixel * radius;
        // Blur the image and its coverage together so color spreads into the black margin.
        vec2 coverage = smoothstep(-footprint, footprint, sampleUV)
          * (1.0 - smoothstep(vec2(1.0) - footprint, vec2(1.0) + footprint, sampleUV));
        color += textureLod(map, clamp(sampleUV, vec2(0.0), vec2(1.0)), lod).rgb
          * coverage.x * coverage.y * wx * wy / 256.0;
      }
    }
  }
  return color * (1.0 - min(1.0, effect * 2.0));
}
`;

// The camera half stays in its original transform. Only the cover half rotates.
const foldShader = `
uniform float foldAngle;
vec2 rotateHinge(vec2 p) {
  float c = cos(foldAngle), s = sin(foldAngle);
  p.y -= 0.275454;
  return vec2(c * p.x + s * p.y, -s * p.x + c * p.y + 0.275454);
}
#ifdef FLEXIBLE_SCREEN
vec4 bendStrip(vec3 p) {
  float halfWidth = 0.35;
  if (p.x >= halfWidth) return vec4(p.x, p.z, 1.0, 0.0);
  if (p.x <= -halfWidth) return vec4(rotateHinge(p.xz), cos(foldAngle), -sin(foldAngle));
  float t = (p.x + halfWidth) / (2.0 * halfWidth);
  float t2 = t*t, t3 = t2*t;
  vec2 a = rotateHinge(vec2(-halfWidth, p.z));
  vec2 b = vec2(halfWidth, p.z);
  vec2 ta = 2.0 * halfWidth * vec2(cos(foldAngle), -sin(foldAngle));
  vec2 tb = vec2(2.0 * halfWidth, 0.0);
  vec2 point = (2.0*t3-3.0*t2+1.0)*a + (t3-2.0*t2+t)*ta + (-2.0*t3+3.0*t2)*b + (t3-t2)*tb;
  vec2 tangent = normalize((6.0*t2-6.0*t)*a + (3.0*t2-4.0*t+1.0)*ta + (-6.0*t2+6.0*t)*b + (3.0*t2-2.0*t)*tb);
  return vec4(point, tangent);
}
#endif
`;
try {
  const model = await new USDLoader().loadAsync('./assets/iPhone_Duo_Render.usdc');
  model.scale.multiplyScalar(100);
  model.updateMatrixWorld(true);
  const count = { moving: 0, fixed: 0, flexible: 0 };
  model.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    geometry.translate(0, -5.8974, 0);
    let ancestor = object;
    while (ancestor && !['upTUAKvMVkPOMKq', 'SiftyleUEEZwLhF'].includes(ancestor.name)) ancestor = ancestor.parent;
    const moving = ancestor?.name === 'upTUAKvMVkPOMKq';
    const flexible = ['JnJdTkxbQgUtLwU', 'xdyyaajWsatVNxN', 'UXtsBZYlaUvHoEh', 'MvKPXGSdYDVvSpk'].includes(object.name);
    const kind = object.name === 'UXtsBZYlaUvHoEh' ? 'inner' : object.name === 'hhgAIoCGsHXeDPY' ? 'outer' : null;
    const material = kind ? screens[kind].material : object.material.clone();
    if (kind) {
      const p = geometry.attributes.position;
      const uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) {
        uv[i * 2] = kind === 'inner' ? (p.getX(i) + 7.89935) / 15.7987 : (-.23396 - p.getX(i)) / 7.73936;
        uv[i * 2 + 1] = kind === 'inner' ? (p.getY(i) + 5.8974 - .34562) / 11.1035 : (p.getY(i) + 5.8974 - .27173) / 11.2513;
      }
      geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    if (moving || flexible) {
      material.onBeforeCompile = shader => {
        shader.uniforms.foldAngle = bend;
        if (kind) {
          shader.uniforms.uiFrame = screens[kind].frame;
          shader.uniforms.uiGradient = screens[kind].gradient;
          shader.uniforms.uiReferenceEye = { value: uiReferenceEye };
          shader.uniforms.uiPixel = screens[kind].pixel;
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_pars_fragment>', `
            #include <map_pars_fragment>
            ${kind === 'inner' ? '#define INNER_UI' : ''}
            ${screenShader}
          `).replace('#include <map_fragment>', 'diffuseColor.rgb *= screenColor();');
          shader.vertexShader = `varying vec3 vUIPosition;\n${shader.vertexShader}`;
          shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
            vUIPosition = transformed;
            #include <project_vertex>
          `);
        }
        shader.vertexShader = `${flexible ? '#define FLEXIBLE_SCREEN\n' : ''}${foldShader}\n${shader.vertexShader}`;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', flexible ? `
          vec4 folded = bendStrip(position);
          vec3 transformed = vec3(folded.x, position.y, folded.y);
        ` : `
          vec2 folded = rotateHinge(position.xz);
          vec3 transformed = vec3(folded.x, position.y, folded.y);
        `);
        shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
          vec3 objectNormal = vec3(normal);
          ${flexible ? 'vec4 strip = bendStrip(position); float a = atan(-strip.w, strip.z);' : 'float a = foldAngle;'}
          objectNormal.x = cos(a) * normal.x + sin(a) * normal.z;
          objectNormal.z = -sin(a) * normal.x + cos(a) * normal.z;
        `);
      };
      material.customProgramCacheKey = () => `${flexible ? 'fold-flexible' : 'fold-cover'}-${kind || 'body'}`;
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = object.name;
    mesh.frustumCulled = false;
    if (kind) screens[kind].mesh = mesh;
    phone.add(mesh);
    count[flexible ? 'flexible' : moving ? 'moving' : 'fixed']++;
  });
  console.info('Official model ready', JSON.stringify({ ...count, sourceMeshes: phone.children.length, innerUI: true, outerUI: true, fixedHalf: 'rear camera' }));
  document.querySelectorAll('button, input').forEach(element => element.disabled = false);
  // Keep the fold controls inactive on the landing state; they become
  // available only after a video has been decoded for preview.
  slider.disabled = true;
  play.disabled = true;
  videoProgress.disabled = true;
  ready = true;
  // The landing state is deliberately folded and still. A later Play click
  // on an uploaded video performs the one-way opening and camera dolly.
  setAngle(0);
  camera.position.copy(openingCameraStart);
  setOpeningDolly(openingZoomStart);
  controls.update();
  setPlaying(false);
} catch (error) {
  alert('Unable to load the model. Refresh the page to try again.');
  console.error(error);
}
let lastTime = performance.now();
renderer.setAnimationLoop(now => {
  const delta = Math.min((now - lastTime) / 1000, .05);
  lastTime = now;
  if (simulator.update(delta)) {
    for (const screen of Object.values(screens)) screen.material.map.needsUpdate = true;
  }
  if (openingTransition) {
    openingTransition.elapsed += delta;
    const progress = Math.min(openingTransition.elapsed / openingTransition.duration, 1);
    const foldProgress = progress * progress * (3 - 2 * progress);
    // A different, stronger ease makes the dolly movement perceptibly nonlinear.
    const zoomProgress = 1 - Math.pow(1 - progress, 4);
    setAngle(THREE.MathUtils.lerp(openingTransition.fromAngle, 180, foldProgress));
    setOpeningDolly(THREE.MathUtils.lerp(openingTransition.fromZoom, openingZoomEnd, zoomProgress));
    if (progress === 1) {
      openingTransition = null;
      // Snap the terminal frame to eliminate fractional fold values that can
      // otherwise leave the cover visibly ajar after the animation stops.
      setAngle(180);
      setOpeningDolly(openingZoomEnd);
      controls.update();
      // The video continues to loop after the fold reaches its terminal view.
      syncVideoControls();
      console.info('[duo] opening complete; holding unfolded close view');
    }
  } else if (transition) {
    transition.elapsed += delta;
    const progress = Math.min(transition.elapsed / 1.4, 1);
    const ease = progress * progress * (3 - 2 * progress);
    setAngle(THREE.MathUtils.lerp(transition.from, transition.to, ease));
    if (progress === 1) transition = null;
  }
  controls.update();
  syncVideoControls();
  renderer.render(scene, camera);
});
