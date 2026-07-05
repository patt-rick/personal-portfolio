/* ============================================
   WEBGL BACKDROP — one particle field that morphs
   between shapes as you scroll through sections.
   ============================================ */
import * as THREE from 'three';

const canvas = document.getElementById('webgl');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas && !reduceMotion) {
  try {
    init();
  } catch (err) {
    canvas.style.display = 'none';
  }
}

function init() {
  const isMobile = window.innerWidth < 768;
  const COUNT = isMobile ? 4500 : 9000;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 7);

  /* ---------- Shape generators ---------- */
  function sphere() {
    const arr = new Float32Array(COUNT * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const jitter = 0.92 + Math.random() * 0.16;
      const R = 2.5 * jitter;
      arr[i * 3] = Math.cos(theta) * r * R;
      arr[i * 3 + 1] = y * R;
      arr[i * 3 + 2] = Math.sin(theta) * r * R;
    }
    return arr;
  }

  function wave() {
    const arr = new Float32Array(COUNT * 3);
    const cols = Math.ceil(Math.sqrt(COUNT * 1.8));
    const rows = Math.ceil(COUNT / cols);
    for (let i = 0; i < COUNT; i++) {
      const cx = (i % cols) / (cols - 1) - 0.5;
      const cz = Math.floor(i / cols) / (rows - 1) - 0.5;
      const x = cx * 10;
      const z = cz * 5.5;
      const y = Math.sin(x * 1.1) * 0.5 + Math.cos(z * 1.6 + x * 0.6) * 0.45 - 0.8;
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }

  function lattice() {
    const arr = new Float32Array(COUNT * 3);
    const n = Math.round(Math.cbrt(COUNT));
    const size = 4.4;
    for (let i = 0; i < COUNT; i++) {
      const j = i % (n * n * n);
      const x = j % n;
      const y = Math.floor(j / n) % n;
      const z = Math.floor(j / (n * n));
      arr[i * 3] = (x / (n - 1) - 0.5) * size + (Math.random() - 0.5) * 0.05;
      arr[i * 3 + 1] = (y / (n - 1) - 0.5) * size + (Math.random() - 0.5) * 0.05;
      arr[i * 3 + 2] = (z / (n - 1) - 0.5) * size + (Math.random() - 0.5) * 0.05;
    }
    return arr;
  }

  function knot() {
    const arr = new Float32Array(COUNT * 3);
    const p = 2;
    const q = 3;
    for (let i = 0; i < COUNT; i++) {
      const t = (i / COUNT) * Math.PI * 2;
      const r = 1.1 * (2 + Math.cos(q * t));
      const x = r * Math.cos(p * t);
      const y = r * Math.sin(p * t);
      const z = 1.1 * -Math.sin(q * t) * 2;
      const s = 0.22;
      arr[i * 3] = x * 0.62 + (Math.random() - 0.5) * s;
      arr[i * 3 + 1] = y * 0.62 + (Math.random() - 0.5) * s;
      arr[i * 3 + 2] = z * 0.62 + (Math.random() - 0.5) * s;
    }
    return arr;
  }

  function helix() {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const strand = i % 2;
      const t = (i / COUNT) * Math.PI * 7;
      const phase = strand * Math.PI;
      const r = 1.5 + (Math.random() - 0.5) * 0.18;
      arr[i * 3] = Math.cos(t + phase) * r;
      arr[i * 3 + 1] = (i / COUNT - 0.5) * 6.4;
      arr[i * 3 + 2] = Math.sin(t + phase) * r;
    }
    return arr;
  }

  function ring() {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const t = Math.random() * Math.PI * 2;
      const tube = Math.random() * Math.PI * 2;
      const R = 2.5;
      const r = 0.28;
      arr[i * 3] = (R + r * Math.cos(tube)) * Math.cos(t);
      arr[i * 3 + 1] = (R + r * Math.cos(tube)) * Math.sin(t) * 0.9;
      arr[i * 3 + 2] = r * Math.sin(tube) * 3;
    }
    return arr;
  }

  const SHAPES = { sphere: sphere(), wave: wave(), lattice: lattice(), knot: knot(), helix: helix(), ring: ring() };

  /* ---------- Geometry & material ---------- */
  const current = new Float32Array(SHAPES.sphere);
  const target = new Float32Array(SHAPES.sphere);
  const rands = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) rands[i] = 0.4 + Math.random() * 0.9;

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(current, 3);
  geometry.setAttribute('position', posAttr);
  geometry.setAttribute('aRand', new THREE.BufferAttribute(rands, 1));

  const uniforms = {
    uColor: { value: new THREE.Color('#9ca3af') },
    uOpacity: { value: 0.75 },
    uSize: { value: isMobile ? 26 : 32 },
    uTime: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aRand;
      uniform float uSize;
      uniform float uTime;
      varying float vRand;
      void main() {
        vRand = aRand;
        vec3 p = position;
        p.y += sin(p.x * 1.6 + uTime * 0.6 + aRand * 6.28) * 0.06;
        p.x += cos(p.z * 1.3 + uTime * 0.45 + aRand * 6.28) * 0.05;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * aRand / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vRand;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        float alpha = smoothstep(0.5, 0.08, d) * uOpacity * (0.45 + vRand * 0.55);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  /* ---------- Theme coupling ---------- */
  function applyTheme() {
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim();
    if (accent) uniforms.uColor.value.set(accent);
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    uniforms.uOpacity.value = light ? 0.38 : 0.75;
    material.needsUpdate = true;
  }
  applyTheme();
  window.addEventListener('themechange', applyTheme);

  /* ---------- Scroll-driven morphing ---------- */
  const sections = Array.from(document.querySelectorAll('[data-shape]'));

  function computeTarget() {
    const vhMid = window.innerHeight / 2;
    // signed distance from each section's center to the viewport center
    let prev = null;
    let next = null;
    for (const el of sections) {
      const r = el.getBoundingClientRect();
      const d = r.top + r.height / 2 - vhMid;
      if (d <= 0 && (!prev || d > prev.d)) prev = { el, d };
      if (d > 0 && (!next || d < next.d)) next = { el, d };
    }
    const a = SHAPES[(prev || next).el.dataset.shape];
    const b = SHAPES[(next || prev).el.dataset.shape];
    let t = 0;
    if (prev && next) t = -prev.d / (-prev.d + next.d);
    // ease the blend so shapes hold near section centers
    t = t * t * (3 - 2 * t);
    for (let i = 0; i < target.length; i++) {
      target[i] = a[i] + (b[i] - a[i]) * t;
    }
  }

  /* ---------- Mouse parallax ---------- */
  let mouseX = 0;
  let mouseY = 0;
  window.addEventListener('pointermove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* ---------- Resize ---------- */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ---------- Render loop ---------- */
  const clock = new THREE.Clock();
  let frame = 0;

  function tick() {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    // refresh morph target every few frames (layout reads are cheap but not free)
    if (frame % 3 === 0) computeTarget();
    frame++;

    for (let i = 0; i < current.length; i++) {
      current[i] += (target[i] - current[i]) * 0.06;
    }
    posAttr.needsUpdate = true;

    points.rotation.y = t * 0.05;
    points.rotation.x = Math.sin(t * 0.11) * 0.08;

    camera.position.x += (mouseX * 0.55 - camera.position.x) * 0.04;
    camera.position.y += (-mouseY * 0.4 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
