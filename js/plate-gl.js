/* ==========================================================
   plate-gl.js: the work plate as a screen print.
   Each project is printed in two inks (field + chalk). Switching
   projects breaks the print into coarse halftone dots, clears the
   plate, then prints the next image dot by dot. The cursor works
   as a loupe that shows the real, full-colour screenshot.
   Plain WebGL 1, loaded only on wide screens with a fine pointer.
   ========================================================== */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform float uFromA;
uniform float uToA;
uniform float uFromInv;
uniform float uToInv;
uniform float uP;
uniform float uHover;
uniform float uDpr;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform vec3 uField;
uniform vec3 uChalk;

vec2 cover(vec2 uv, float imgA) {
  float a = uRes.x / uRes.y;
  vec2 s = a > imgA ? vec2(1.0, imgA / a) : vec2(a / imgA, 1.0);
  return uv * s;
}

vec3 pick(vec2 uv) {
  return uP < 0.5
    ? texture2D(uFrom, cover(uv, uFromA)).rgb
    : texture2D(uTo, cover(uv, uToA)).rgb;
}

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec2 px = vUv * uRes;
  float bump = sin(3.14159265 * uP);
  float amp = abs(1.0 - 2.0 * uP);

  float cs = mix(4.0, 26.0, bump) * uDpr;
  vec2 cell = (floor(px / cs) + 0.5) * cs;
  // Light screenshots print negative so their background takes the field ink.
  float inv = uP < 0.5 ? uFromInv : uToInv;
  float L = smoothstep(0.06, 0.94, lum(pick(cell / uRes)));
  L = mix(L, 1.0 - L, inv);
  float r = sqrt(L) * 0.72 * cs * amp;
  float d = length(px - cell);
  float dotMask = 1.0 - smoothstep(r - uDpr, r + uDpr, d);
  vec3 halftone = mix(uField, uChalk, dotMask);

  vec3 full = pick(vUv);
  float Lf = smoothstep(0.06, 0.94, lum(full));
  vec3 tone = mix(uField, uChalk, mix(Lf, 1.0 - Lf, inv));

  float k = smoothstep(0.0, 0.2, bump);
  vec3 print = mix(tone, halftone, k);

  float lensR = 120.0 * uDpr;
  float dist = length(px - uMouse);
  float lens = (1.0 - smoothstep(lensR - 2.0 * uDpr, lensR, dist)) * uHover * (1.0 - k);
  float rim = smoothstep(lensR - 3.0 * uDpr, lensR - 1.5 * uDpr, dist) * (1.0 - smoothstep(lensR - 1.0 * uDpr, lensR + 0.5 * uDpr, dist));
  vec3 col = mix(print, full, lens);
  col = mix(col, uChalk, rim * uHover * (1.0 - k));

  gl_FragColor = vec4(col, 1.0);
}`;

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function createPlate(plate, urls, startIndex, onLost) {
  if (!('ResizeObserver' in window)) return null;
  const frame = plate.querySelector('.plate-frame');
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
  if (!gl) return null;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  ['uFrom', 'uTo', 'uFromA', 'uToA', 'uFromInv', 'uToInv', 'uP', 'uHover', 'uDpr', 'uRes', 'uMouse', 'uField', 'uChalk'].forEach(
    (name) => (u[name] = gl.getUniformLocation(prog, name))
  );

  const images = await Promise.all(urls.map((u) => loadImage(u.src)));
  const textures = images.map((img, n) => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    return {
      tex,
      invert: urls[n].invert ? 1 : 0,
      aspect: (img.naturalWidth || img.width) / (img.naturalHeight || img.height),
    };
  });

  const css = getComputedStyle(document.documentElement);
  gl.uniform3fv(u.uField, hexToRgb(css.getPropertyValue('--field').trim() || '#2f36e0'));
  gl.uniform3fv(u.uChalk, hexToRgb(css.getPropertyValue('--chalk').trim() || '#eef0f3'));
  gl.uniform1i(u.uFrom, 0);
  gl.uniform1i(u.uTo, 1);

  let from = startIndex;
  let to = startIndex;
  let p = 1; // 1 = settled on `to`
  let hover = 0;
  let hoverTarget = 0;
  let dpr = 1;
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  let raf = 0;
  let last = 0;
  const DURATION = 950;

  function bind(unit, index) {
    gl.activeTexture(unit === 0 ? gl.TEXTURE0 : gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures[index].tex);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(frame.clientWidth * dpr));
    const h = Math.max(1, Math.round(frame.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    draw();
  }

  function draw() {
    if (gl.isContextLost()) return;
    bind(0, from);
    bind(1, to);
    gl.uniform1f(u.uFromA, textures[from].aspect);
    gl.uniform1f(u.uToA, textures[to].aspect);
    gl.uniform1f(u.uFromInv, textures[from].invert);
    gl.uniform1f(u.uToInv, textures[to].invert);
    gl.uniform1f(u.uP, p);
    gl.uniform1f(u.uHover, hover);
    gl.uniform1f(u.uDpr, dpr);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform2f(u.uMouse, mouse.x * dpr, mouse.y * dpr);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function tick(now) {
    const dt = Math.min(64, now - (last || now));
    last = now;
    if (p < 1) p = Math.min(1, p + dt / DURATION);
    hover += (hoverTarget - hover) * Math.min(1, dt / 120);
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt / 70);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt / 70);
    draw();
    const settled =
      p >= 1 &&
      Math.abs(hover - hoverTarget) < 0.002 &&
      Math.abs(mouse.x - mouse.tx) < 0.5 &&
      Math.abs(mouse.y - mouse.ty) < 0.5;
    if (settled) {
      hover = hoverTarget;
      raf = 0;
      last = 0;
      draw();
    } else {
      raf = requestAnimationFrame(tick);
    }
  }
  function wake() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  frame.addEventListener('pointermove', (e) => {
    const r = frame.getBoundingClientRect();
    mouse.tx = e.clientX - r.left;
    mouse.ty = e.clientY - r.top;
    if (hoverTarget === 0) {
      mouse.x = mouse.tx;
      mouse.y = mouse.ty;
    }
    hoverTarget = 1;
    wake();
  });
  frame.addEventListener('pointerleave', () => {
    hoverTarget = 0;
    wake();
  });

  const ro = new ResizeObserver(resize);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    ro.disconnect();
    canvas.remove();
    if (onLost) onLost();
  });

  frame.appendChild(canvas);
  ro.observe(frame);
  resize();

  return {
    show(index) {
      if (index === to && p >= 1) return;
      if (p < 0.5) {
        // Still clearing the old print: just change what comes next.
        to = index;
      } else {
        // Mid-print or settled: the current image becomes the outgoing one,
        // mirrored so the dot size carries over without a jump.
        from = to;
        to = index;
        p = 1 - p;
      }
      wake();
    },
  };
}
