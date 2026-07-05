/* ============================================
   EXPERIENCE — a scroll-driven camera flight
   through a particle cosmos:

   z   6 …  0   name built from particles (camera flies through it)
   z -22 … -42  drifting wireframe debris (about)
   z -50 … -66  asteroid belt (skills)
   z -78 …-140  corridor of floating project screens (work)
   z -140…-174  double-helix tunnel (journey)
   z -190       particle vortex portal (contact)

   Dispatches: 'scene-progress' (0..1), 'scene-ready', 'scene-failed'
   Listens:    'experience-begin', 'themechange'
   ============================================ */

const fail = () => window.dispatchEvent(new Event('scene-failed'));

(async () => {
  const canvas = document.getElementById('scene');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canvas || reduceMotion) return fail();

  let THREE, EffectComposer, RenderPass, UnrealBloomPass;
  try {
    THREE = await import('three');
    ({ EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js'));
    ({ RenderPass } = await import('three/addons/postprocessing/RenderPass.js'));
    ({ UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js'));
  } catch (e) {
    return fail();
  }

  try {
    run();
  } catch (e) {
    canvas.style.display = 'none';
    fail();
  }

  function run() {
    const isMobile = window.innerWidth < 768;

    /* ---------- Renderer / scene / camera ---------- */
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x050508);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050508, 0.011);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );
    camera.position.set(0, 0, isMobile ? 13 : 8.4);

    let composer = null;
    if (!isMobile) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(
        new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.5,
          0.5,
          0.55
        )
      );
    }

    /* ---------- Accent color plumbing ----------
       The accent is used sparingly: big particle fields get a barely
       tinted silver ("soft"), mid elements a half tint, and only a few
       small highlights (frames, nodes, portal rim) the real color. */
    const WHITE = new THREE.Color(0xffffff);
    const accent = new THREE.Color('#6c63ff');
    const accentSoft = new THREE.Color();
    const accentMid = new THREE.Color();
    const accentHot = new THREE.Color(); // slightly boosted for bloom
    const accentUniforms = [];
    const softUniforms = [];
    const midUniforms = [];
    const accentMaterials = [];
    const softMaterials = [];
    const hotMaterials = [];

    function readAccent() {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      if (v) accent.set(v);
      accentSoft.copy(accent).lerp(WHITE, 0.75);
      accentMid.copy(accent).lerp(WHITE, 0.35);
      accentHot.copy(accent).multiplyScalar(1.5);
      accentUniforms.forEach((u) => u.value.copy(accent));
      softUniforms.forEach((u) => u.value.copy(accentSoft));
      midUniforms.forEach((u) => u.value.copy(accentMid));
      accentMaterials.forEach((m) => m.color.copy(accent));
      softMaterials.forEach((m) => m.color.copy(accentSoft));
      hotMaterials.forEach((m) => m.color.copy(accentHot));
      drawTerminalTexture();
    }

    /* ---------- Shared round-point shader ---------- */
    function particleMaterial({ size, opacity, blending = THREE.AdditiveBlending, scatter = false, tint = 'soft', color = 0xffffff }) {
      const uniforms = {
        uColor: { value: tint === 'none' ? new THREE.Color(color) : accent.clone() },
        uOpacity: { value: opacity },
        uSize: { value: size },
        uTime: { value: 0 },
        uScatter: { value: 0 },
      };
      if (tint === 'accent') accentUniforms.push(uniforms.uColor);
      else if (tint === 'mid') midUniforms.push(uniforms.uColor);
      else if (tint === 'soft') softUniforms.push(uniforms.uColor);
      const mat = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending,
        vertexShader: `
          attribute float aRand;
          ${scatter ? 'attribute vec3 aDir;' : ''}
          uniform float uSize;
          uniform float uTime;
          uniform float uScatter;
          varying float vRand;
          void main() {
            vRand = aRand;
            vec3 p = position;
            p.x += sin(uTime * 0.7 + aRand * 6.283) * 0.05;
            p.y += cos(uTime * 0.6 + aRand * 6.283) * 0.05;
            ${scatter ? 'p += aDir * uScatter * (2.0 + aRand * 10.0);' : ''}
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = uSize * (0.5 + aRand) / -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uScatter;
          varying float vRand;
          void main() {
            float d = distance(gl_PointCoord, vec2(0.5));
            float a = smoothstep(0.5, 0.1, d) * uOpacity * (0.4 + vRand * 0.6);
            a *= 1.0 - uScatter * 0.8;
            gl_FragColor = vec4(uColor, a);
          }
        `,
      });
      return mat;
    }

    function addRands(geometry, count) {
      const r = new Float32Array(count);
      for (let i = 0; i < count; i++) r[i] = Math.random();
      geometry.setAttribute('aRand', new THREE.BufferAttribute(r, 1));
    }

    /* ---------- Starfield ---------- */
    {
      const N = isMobile ? 2200 : 4500;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 9 + Math.pow(Math.random(), 0.6) * 70;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.sin(a) * r;
        pos[i * 3 + 2] = 25 - Math.random() * 255;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      addRands(g, N);
      scene.add(new THREE.Points(g, particleMaterial({ size: 42, opacity: 0.85, tint: 'none', blending: THREE.NormalBlending })));
    }

    /* ---------- Near dust (speed feel) ---------- */
    let dustMat;
    {
      const N = isMobile ? 700 : 1400;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 1.5 + Math.random() * 7;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.sin(a) * r;
        pos[i * 3 + 2] = 10 - Math.random() * 210;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      addRands(g, N);
      dustMat = particleMaterial({ size: 26, opacity: 0.32 });
      scene.add(new THREE.Points(g, dustMat));
    }

    /* ---------- Nebulae ---------- */
    const nebulaTexture = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d');
      const grd = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grd.addColorStop(0, 'rgba(255,255,255,0.85)');
      grd.addColorStop(0.35, 'rgba(255,255,255,0.28)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    })();

    const nebulaSprites = [];
    for (let i = 0; i < 9; i++) {
      const useAcc = i % 2 === 0;
      const mat = new THREE.SpriteMaterial({
        map: nebulaTexture,
        color: useAcc ? accent.clone() : new THREE.Color('#141433'),
        transparent: true,
        opacity: useAcc ? 0.05 : 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      if (useAcc) accentMaterials.push(mat);
      const s = new THREE.Sprite(mat);
      const side = i % 2 === 0 ? 1 : -1;
      s.position.set(side * (6 + Math.random() * 10), (Math.random() - 0.5) * 12, 5 - i * 24 - Math.random() * 10);
      const sc = 26 + Math.random() * 22;
      s.scale.set(sc, sc, 1);
      nebulaSprites.push(s);
      scene.add(s);
    }

    /* ---------- Name built from particles ---------- */
    let nameMat = null;
    let nameCount = 0;

    async function buildName() {
      try {
        await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
      } catch (e) { /* fall back to whatever font is available */ }
      const c = document.createElement('canvas');
      c.width = 1600;
      c.height = 520;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 200px Syne, Arial, sans-serif';
      ctx.fillText('PATRICK', 800, 140);
      ctx.fillText('ACKOM', 800, 385);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      const step = isMobile ? 6 : 4;
      const nameScale = isMobile ? 0.52 : 1;
      const pts = [];
      for (let y = 0; y < c.height; y += step) {
        for (let x = 0; x < c.width; x += step) {
          if (data[(y * c.width + x) * 4 + 3] > 128) {
            pts.push(
              ((x - 800) / 800) * 5.9 * nameScale + (Math.random() - 0.5) * 0.03,
              (-(y - 260) / 260) * 1.92 * nameScale + (Math.random() - 0.5) * 0.03,
              (Math.random() - 0.5) * 0.5
            );
          }
        }
      }
      nameCount = pts.length / 3;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
      addRands(g, nameCount);
      const dirs = new Float32Array(nameCount * 3);
      for (let i = 0; i < nameCount; i++) {
        const v = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() * 0.6 + 0.2
        ).normalize();
        dirs[i * 3] = v.x;
        dirs[i * 3 + 1] = v.y;
        dirs[i * 3 + 2] = v.z;
      }
      g.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3));
      nameMat = particleMaterial({ size: isMobile ? 30 : 34, opacity: 0.88, scatter: true });
      nameMat.uniforms.uScatter.value = 1.2; // starts scattered, assembles on begin
      const points = new THREE.Points(g, nameMat);
      points.position.set(0, 0.35, 0);
      points.frustumCulled = false;
      scene.add(points);
    }

    /* ---------- About debris: wireframe polyhedra ---------- */
    const debris = [];
    {
      const geos = [
        new THREE.IcosahedronGeometry(1, 0),
        new THREE.OctahedronGeometry(1, 0),
        new THREE.TetrahedronGeometry(1, 0),
      ];
      for (let i = 0; i < 15; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0x3b3b52,
          wireframe: true,
          transparent: true,
          opacity: 0.5,
        });
        const m = new THREE.Mesh(geos[i % 3], mat);
        const side = i % 2 === 0 ? 1 : -1;
        m.position.set(
          side * (2.4 + Math.random() * 4.5),
          (Math.random() - 0.5) * 6,
          -20 - Math.random() * 24
        );
        const s = 0.3 + Math.random() * 1.0;
        m.scale.setScalar(s);
        m.userData.spin = 0.1 + Math.random() * 0.4;
        debris.push(m);
        scene.add(m);
      }
    }

    /* ---------- Skills asteroid belt ---------- */
    const belt = new THREE.Group();
    {
      const N = isMobile ? 50 : 90;
      const geo = new THREE.IcosahedronGeometry(0.32, 0);
      const solid = new THREE.MeshBasicMaterial({ color: 0x0c0c14 });
      const wire = new THREE.MeshBasicMaterial({
        color: 0x42425c,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const meshSolid = new THREE.InstancedMesh(geo, solid, N);
      const meshWire = new THREE.InstancedMesh(geo, wire, N);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 3 + Math.random() * 5;
        dummy.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.7, -50 - Math.random() * 16);
        dummy.rotation.set(Math.random() * 3, Math.random() * 3, 0);
        const s = 0.4 + Math.random() * 1.6;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        meshSolid.setMatrixAt(i, dummy.matrix);
        dummy.scale.setScalar(s * 1.001);
        dummy.updateMatrix();
        meshWire.setMatrixAt(i, dummy.matrix);
      }
      belt.add(meshSolid, meshWire);
      scene.add(belt);
    }

    /* ---------- Project screens ---------- */
    const manager = new THREE.LoadingManager();
    manager.onProgress = (url, loaded, total) => {
      window.dispatchEvent(new CustomEvent('scene-progress', { detail: loaded / total }));
    };
    const loader = new THREE.TextureLoader(manager);

    const termCanvas = document.createElement('canvas');
    termCanvas.width = 1024;
    termCanvas.height = 640;
    let termTexture = new THREE.CanvasTexture(termCanvas);

    function drawTerminalTexture() {
      const ctx = termCanvas.getContext('2d');
      const acc = '#' + accent.getHexString();
      ctx.fillStyle = '#0b0b12';
      ctx.fillRect(0, 0, 1024, 640);
      // header
      ctx.fillStyle = '#12121c';
      ctx.fillRect(0, 0, 1024, 56);
      ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(36 + i * 34, 28, 9, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#55556a';
      ctx.font = '22px JetBrains Mono, monospace';
      ctx.fillText('terminal-workspace — zsh', 150, 36);
      // sidebar
      ctx.fillStyle = '#0e0e16';
      ctx.fillRect(0, 56, 232, 584);
      ctx.fillStyle = acc;
      ctx.fillRect(0, 76, 4, 40);
      ctx.font = '20px JetBrains Mono, monospace';
      ctx.fillStyle = acc;
      ctx.fillText('personal-site', 24, 102);
      ctx.fillStyle = '#55556a';
      ['amc-front', 'arij', 'wterm-rs'].forEach((p, i) => {
        ctx.fillText(p, 24, 148 + i * 44);
      });
      // main
      const lines = [
        ['➜ ', acc, 'cargo build --release', '#b0b0c0'],
        ['', '', 'Compiling terminal-workspace v0.9.0', '#55556a'],
        ['', '', 'Finished `release` in 42.3s', '#28c840'],
        ['➜ ', acc, 'claude --resume', '#b0b0c0'],
        ['', '', 'Resuming session…', '#55556a'],
        ['➜ ', acc, '', ''],
      ];
      ctx.font = '24px JetBrains Mono, monospace';
      lines.forEach((l, i) => {
        const y = 120 + i * 52;
        if (l[0]) {
          ctx.fillStyle = l[1];
          ctx.fillText(l[0], 268, y);
        }
        if (l[2]) {
          ctx.fillStyle = l[3];
          ctx.fillText(l[2], l[0] ? 300 : 268, y);
        }
      });
      ctx.fillStyle = acc;
      ctx.fillRect(300, 384, 14, 28);
      termTexture.needsUpdate = true;
    }
    drawTerminalTexture();

    const projectDefs = [
      { tex: termTexture, side: -1 },
      { src: '../tt.png', side: 1 },
      { src: '../sr.png', side: -1 },
      { src: '../qc.png', side: 1 },
      { src: '../fa.jpeg', side: -1 },
    ];

    const screens = [];
    projectDefs.forEach((def, i) => {
      const group = new THREE.Group();
      const tex = def.tex || loader.load(def.src);
      tex.colorSpace = THREE.SRGBColorSpace;

      const backing = new THREE.Mesh(
        new THREE.PlaneGeometry(3.75, 2.42),
        new THREE.MeshBasicMaterial({ color: 0x0a0a12 })
      );
      backing.position.z = -0.015;
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(3.5, 2.19),
        new THREE.MeshBasicMaterial({ map: tex, color: 0xbbbbbb })
      );
      const frameMat = new THREE.LineBasicMaterial({
        color: accentHot.clone(),
        transparent: true,
        opacity: 0.9,
      });
      hotMaterials.push(frameMat);
      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.75, 2.42)),
        frameMat
      );

      // soft glow behind the screen
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: nebulaTexture,
          color: accent.clone(),
          transparent: true,
          opacity: 0.13,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      accentMaterials.push(glow.material);
      glow.scale.set(7, 5, 1);
      glow.position.z = -0.6;

      group.add(glow, backing, screen, frame);
      group.position.set(def.side * 2.45, 0, -86 - i * 13); // z refined by path sync
      group.rotation.y = def.side < 0 ? 0.5 : -0.5;
      group.userData = { side: def.side, i };
      screens.push(group);
      scene.add(group);
    });

    /* ---------- Journey helix ---------- */
    {
      const N = isMobile ? 1600 : 2800;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const t = i / N;
        const strand = i % 2 ? 0 : Math.PI;
        const ang = t * Math.PI * 14 + strand;
        const r = 2.5 + (Math.random() - 0.5) * 0.35;
        pos[i * 3] = Math.cos(ang) * r;
        pos[i * 3 + 1] = Math.sin(ang) * r;
        pos[i * 3 + 2] = -138 - t * 38;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      addRands(g, N);
      scene.add(new THREE.Points(g, particleMaterial({ size: 30, opacity: 0.55 })));
    }

    const xpNodes = [];
    [-1, 1, -1].forEach((side, i) => {
      const mat = new THREE.MeshBasicMaterial({ color: accentHot.clone() });
      hotMaterials.push(mat);
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), mat);
      node.position.set(side * 1.4, 0.2, -148 - i * 10); // z refined by path sync
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: nebulaTexture,
          color: accent.clone(),
          transparent: true,
          opacity: 0.28,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      accentMaterials.push(halo.material);
      halo.scale.set(2.4, 2.4, 1);
      node.add(halo);
      xpNodes.push(node);
      scene.add(node);
    });

    /* ---------- Contact portal vortex ---------- */
    const portal = new THREE.Group();
    let vortexMat;
    {
      const N = isMobile ? 2200 : 3800;
      const polar = new Float32Array(N * 3); // r, theta0, rand
      const g = new THREE.BufferGeometry();
      // positions computed in-shader from polar coords
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      for (let i = 0; i < N; i++) {
        polar[i * 3] = 1.0 + Math.pow(Math.random(), 0.7) * 3.6;
        polar[i * 3 + 1] = Math.random() * Math.PI * 2;
        polar[i * 3 + 2] = Math.random();
      }
      g.setAttribute('aPolar', new THREE.BufferAttribute(polar, 3));
      const uniforms = {
        uColor: { value: accent.clone() },
        uTime: { value: 0 },
        uSize: { value: isMobile ? 30 : 36 },
      };
      midUniforms.push(uniforms.uColor);
      vortexMat = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute vec3 aPolar;
          uniform float uTime;
          uniform float uSize;
          varying float vRand;
          varying float vR;
          void main() {
            vRand = aPolar.z;
            vR = aPolar.x;
            float ang = aPolar.y + uTime * (1.6 / aPolar.x);
            vec3 p = vec3(cos(ang) * aPolar.x, sin(ang) * aPolar.x, sin(ang * 3.0 + uTime) * 0.12);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = uSize * (0.4 + vRand) / -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          varying float vRand;
          varying float vR;
          void main() {
            float d = distance(gl_PointCoord, vec2(0.5));
            float a = smoothstep(0.5, 0.1, d) * (0.35 + vRand * 0.65);
            a *= smoothstep(4.8, 1.4, vR); // brighter toward the core
            gl_FragColor = vec4(uColor, a);
          }
        `,
      });
      const vortexPoints = new THREE.Points(g, vortexMat);
      vortexPoints.frustumCulled = false;
      portal.add(vortexPoints);

      const core = new THREE.Mesh(
        new THREE.CircleGeometry(0.82, 48),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      core.position.z = 0.05;
      const rimMat = new THREE.MeshBasicMaterial({ color: accentHot.clone() });
      hotMaterials.push(rimMat);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.028, 16, 96), rimMat);
      rim.position.z = 0.04;
      portal.add(core, rim);
      portal.position.set(0, 0, -190);
      scene.add(portal);
    }

    /* ---------- Camera path from DOM layout ---------- */
    let K = [];

    function buildPath() {
      const vh = window.innerHeight;
      K = [];
      const el = (id) => document.getElementById(id);
      const topOf = (e) => e.getBoundingClientRect().top + window.scrollY;
      const pin = (e) => topOf(e);
      const unpin = (e) => topOf(e) + e.offsetHeight - vh;

      const hero = el('hero');
      const about = el('about');
      const skills = el('skills');
      const contact = el('contact');
      const stops = Array.from(document.querySelectorAll('.project-stop'));
      const xps = Array.from(document.querySelectorAll('.xp-stop'));
      if (!hero || !about || !skills || !contact) return;

      const startZ = window.innerWidth < 768 ? 13 : 8.4;
      K.push({ s: 0, x: 0, y: 0, z: startZ });
      K.push({ s: unpin(hero), x: 0.5, y: 0.1, z: -13 });
      K.push({ s: pin(about), x: -0.6, y: 0.1, z: -28 });
      K.push({ s: unpin(about), x: -0.6, y: -0.1, z: -34 });
      K.push({ s: pin(skills), x: 0.4, y: 0, z: -54 });
      K.push({ s: unpin(skills), x: 0.4, y: 0, z: -62 });

      stops.forEach((stop, i) => {
        const z = -84 - i * 13;
        const side = stop.dataset.side === 'left' ? -1 : 1;
        K.push({ s: pin(stop), x: side * 0.55, y: 0, z });
        K.push({ s: unpin(stop), x: side * 0.55, y: 0, z: z - 2 });
        if (screens[i]) screens[i].position.z = z - 5.4;
      });

      xps.forEach((xp, i) => {
        const z = -146 - i * 10;
        K.push({ s: pin(xp), x: 0, y: 0.1, z });
        K.push({ s: unpin(xp), x: 0, y: 0.1, z: z - 3 });
        if (xpNodes[i]) xpNodes[i].position.z = z - 4;
      });

      K.push({ s: pin(contact), x: 0, y: 0, z: -182.6 });
      const maxScroll = document.documentElement.scrollHeight - vh;
      K.push({ s: Math.max(maxScroll, unpin(contact)), x: 0, y: 0, z: -184.6 });
    }

    function samplePath(s) {
      if (!K.length) return { x: 0, y: 0, z: 6 };
      if (s <= K[0].s) return K[0];
      const last = K[K.length - 1];
      if (s >= last.s) return last;
      let i = 0;
      while (i < K.length - 2 && K[i + 1].s < s) i++;
      const a = K[i];
      const b = K[i + 1];
      const t = (s - a.s) / Math.max(1, b.s - a.s);
      const e = t * t * (3 - 2 * t);
      return {
        x: a.x + (b.x - a.x) * e,
        y: a.y + (b.y - a.y) * e,
        z: a.z + (b.z - a.z) * e,
      };
    }

    /* ---------- Input ---------- */
    let mouseX = 0;
    let mouseY = 0;
    window.addEventListener('pointermove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (composer) composer.setSize(window.innerWidth, window.innerHeight);
      buildPath();
    });

    window.addEventListener('themechange', readAccent);

    /* ---------- Intro assembly ---------- */
    window.addEventListener('experience-begin', () => {
      buildPath();
      if (nameMat && typeof gsap !== 'undefined') {
        gsap.to(nameMat.uniforms.uScatter, {
          value: 0,
          duration: 2.4,
          ease: 'power3.out',
        });
      } else if (nameMat) {
        nameMat.uniforms.uScatter.value = 0;
      }
    });

    /* ---------- Render loop ---------- */
    const clock = new THREE.Clock();
    const lookTarget = new THREE.Vector3(0, 0, 0);
    let introDone = false;
    let frame = 0;

    function tick() {
      const t = clock.getElapsedTime();
      const s = window.scrollY;

      // periodically re-sync path with layout (fonts/resizes shift offsets)
      if (frame % 240 === 0) buildPath();
      frame++;

      const p = samplePath(s);
      camera.position.x += (p.x + mouseX * 0.35 - camera.position.x) * 0.06;
      camera.position.y += (p.y - mouseY * 0.28 - camera.position.y) * 0.06;
      camera.position.z += (p.z - camera.position.z) * 0.07;

      const ahead = samplePath(s + window.innerHeight * 0.55);
      lookTarget.x += (ahead.x - lookTarget.x) * 0.05;
      lookTarget.y += (ahead.y - lookTarget.y) * 0.05;
      lookTarget.z = camera.position.z - 10;
      camera.lookAt(lookTarget);

      // name scatter as the camera flies through it
      if (nameMat && introDone) {
        const pass = Math.min(1, Math.max(0, (3.8 - camera.position.z) / 7.5));
        const cur = nameMat.uniforms.uScatter.value;
        if (pass > cur) nameMat.uniforms.uScatter.value = cur + (pass - cur) * 0.1;
        else if (!gsapBusy()) nameMat.uniforms.uScatter.value = cur + (pass - cur) * 0.04;
      }

      // ambient motion
      debris.forEach((m, i) => {
        m.rotation.x += 0.002 * m.userData.spin * 60 * 0.016;
        m.rotation.y += 0.0016 * m.userData.spin * 60 * 0.016;
        m.position.y += Math.sin(t * 0.5 + i) * 0.0008;
      });
      belt.rotation.z = t * 0.02;
      screens.forEach((g, i) => {
        g.position.y = Math.sin(t * 0.7 + i * 1.7) * 0.12;
        g.rotation.y = (g.userData.side < 0 ? 0.5 : -0.5) + Math.sin(t * 0.4 + i) * 0.03;
      });
      xpNodes.forEach((n, i) => {
        n.position.y = 0.2 + Math.sin(t * 1.1 + i * 2) * 0.1;
      });
      portal.rotation.z = t * 0.05;
      const pulse = 1 + Math.sin(t * 1.4) * 0.02;
      portal.scale.set(pulse, pulse, 1);

      nebulaSprites.forEach((sp, i) => {
        sp.material.rotation = t * 0.02 * (i % 2 ? 1 : -1);
      });

      // shader clocks
      if (nameMat) nameMat.uniforms.uTime.value = t;
      dustMat.uniforms.uTime.value = t;
      vortexMat.uniforms.uTime.value = t;

      if (composer) composer.render();
      else renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }

    function gsapBusy() {
      return typeof gsap !== 'undefined' && gsap.isTweening(nameMat.uniforms.uScatter);
    }

    /* ---------- Boot ---------- */
    readAccent();
    buildPath();

    const start = () => {
      readAccent(); // late-built materials (name) need a color sync
      // first frame, then hand over to the UI
      tick();
      window.dispatchEvent(new Event('scene-ready'));
      window.addEventListener('experience-begin', () => {
        setTimeout(() => (introDone = true), 2600);
      });
    };
    buildName().then(start, start);
  }
})();
