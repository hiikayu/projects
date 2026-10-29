import * as THREE from 'three';

/* =====================================================================
   COLD MEMORY
   ---------------------------------------------------------------------
   A grown man keeps logging back into the warmest night of his childhood.

   ACT I   EVENING  five warm memories. every one ends a little colder.
   ACT II  NIGHT    the lights die. something tall comes in through the door.
                    the room asks you to hide the things that "don't belong".
   ACT III HIDE     the best hiding spot in the house. nobody ever found you.
                    until now.
   ACT IV  TODAY    the room as it really is. a laptop. a window. a door.
                    and a little boy holding out his hand.

   three voices, three window themes:
     blue   - the kid           (you, in the memory)
     olive  - the room          (the warm thing that wants you to stay)
     silver - the grown-up      (the one who keeps coming back)
   ===================================================================== */

const $ = (id) => document.getElementById(id);
const { lerp, clamp } = THREE.MathUtils;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
};
let LOOPS = parseInt(store.get('cm2_loops', '0'), 10) || 0;
const JUMP = decodeURIComponent(location.hash.slice(1));
const ordinal = (n) => { const v = n % 100; return n + ((v > 10 && v < 14) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')); };
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/* =====================================================================
   RENDERER — low-res target, nearest upscale, dithered post. like 1999.
   ===================================================================== */
const container = $('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07060b);
scene.fog = new THREE.Fog(0x07060b, 16, 44);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 140);
camera.position.set(0, 8, 12);

const lowRT = new THREE.WebGLRenderTarget(4, 4, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, type: THREE.HalfFloatType
});
const SNAP = { value: new THREE.Vector2(160, 90) };

const post = new THREE.ShaderMaterial({
    uniforms: {
        tDiffuse: { value: lowRT.texture }, uRes: { value: new THREE.Vector2(4, 4) }, uTime: { value: 0 },
        uGlitch: { value: 0 }, uCold: { value: 0 }, uWarm: { value: 1 }, uVig: { value: 0.2 }, uGrain: { value: 0.04 },
        uAberr: { value: 0.5 }, uReal: { value: 0 }, uFade: { value: 0 }, uExpo: { value: 1.0 }
    },
    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform vec2 uRes;
        uniform float uTime, uGlitch, uCold, uWarm, uVig, uGrain, uAberr, uReal, uFade, uExpo;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
        float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
        vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
        void main() {
            vec2 uv = vUv;
            float tick = floor(uTime * 12.0);
            float band = floor(uv.y * uRes.y / 5.0) + tick * 7.0;
            float g = step(0.95 - uGlitch * 0.4, hash(vec2(band, tick))) * uGlitch;
            uv.x += g * (hash(vec2(band, uTime)) - 0.5) * 0.18;
            vec2 cell = floor(uv * uRes);
            vec2 px = (cell + 0.5) / uRes;
            float ab = (uAberr + g * 3.0) / uRes.x;
            vec3 c;
            c.r = texture2D(tDiffuse, px + vec2(ab, 0.0)).r;
            c.g = texture2D(tDiffuse, px).g;
            c.b = texture2D(tDiffuse, px - vec2(ab, 0.0)).b;
            c = aces(max(c, vec3(0.0)) * uExpo);
            c = pow(c, vec3(1.0 / 2.2));
            float l = dot(c, vec3(0.299, 0.587, 0.114));
            c = mix(c, vec3(l), uCold * 0.42 + uReal * 0.22);
            c *= mix(vec3(1.0), vec3(0.8, 0.92, 1.14), uCold);
            c *= mix(vec3(1.0), vec3(1.07, 0.98, 0.86), uWarm);
            vec2 d = vUv - 0.5;
            float vig = smoothstep(0.92, 0.2, length(d * vec2(1.0, 0.85)) * (0.95 + uVig));
            c *= mix(1.0, vig, 0.3 + 0.65 * uVig);
            c += (hash(cell + fract(uTime * 7.0) * 91.0) - 0.5) * uGrain;
            float lv = 30.0;
            c = floor(c * lv + bayer4(cell)) / lv;
            c *= 1.0 - uFade;
            gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
        }`,
    depthTest: false, depthWrite: false
});
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));

function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    const pxSize = Math.max(2, Math.round(Math.min(innerWidth, innerHeight) / 250));
    const w = Math.max(64, Math.round(innerWidth / pxSize)), h = Math.max(64, Math.round(innerHeight / pxSize));
    lowRT.setSize(w, h); post.uniforms.uRes.value.set(w, h); SNAP.value.set(w * 0.42, h * 0.42);
}
resize();
addEventListener('resize', resize);

// PS1 vertex wobble: snap projected vertices to a coarse grid
function psx(mat) {
    mat.onBeforeCompile = (sh) => {
        sh.uniforms.uSnap = SNAP;
        sh.vertexShader = 'uniform vec2 uSnap;\n' + sh.vertexShader.replace('#include <project_vertex>',
            '#include <project_vertex>\n\tgl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap + 0.5) / uSnap * gl_Position.w;');
    };
    mat.customProgramCacheKey = () => 'psx';
    return mat;
}
const lam = (color, o = {}) => psx(new THREE.MeshLambertMaterial({ color, flatShading: true, ...o }));
const bas = (o) => psx(new THREE.MeshBasicMaterial(o));

/* =====================================================================
   AUDIO — everything synthesized. drop your own mp3s in /assets to layer them.
   ===================================================================== */
const ext = {
    note: new Audio('assets/note.mp3'), norm: new Audio('assets/norm.mp3'), scary: new Audio('assets/scary.mp3')
};
const extOK = { note: false, norm: false, scary: false };
Object.entries(ext).forEach(([k, a]) => { a.preload = 'auto'; a.addEventListener('canplaythrough', () => { extOK[k] = true; }, { once: true }); a.addEventListener('error', () => { extOK[k] = false; }); });
ext.norm.loop = ext.scary.loop = true; ext.norm.volume = 0.4; ext.scary.volume = 0.45;
const playExt = (k) => { if (extOK[k]) { ext[k].currentTime = 0; ext[k].play().catch(() => { }); } };
const stopExt = (k) => { ext[k].pause(); };

const Sfx = (() => {
    let ctx = null, master, windGain, droneGain, noiseBuf, humGain;
    let boxTimer = 3, moodTimer = 0, songStop = false;

    function init() {
        if (ctx) { ctx.resume(); return; }
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.9;
        const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        // wind
        const w = ctx.createBufferSource(); w.buffer = noiseBuf; w.loop = true;
        const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 480; wf.Q.value = 0.7;
        windGain = ctx.createGain(); windGain.gain.value = 0;
        w.connect(wf); wf.connect(windGain); windGain.connect(master); w.start();
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13; const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(wf.frequency); lfo.start();
        // dread drone
        droneGain = ctx.createGain(); droneGain.gain.value = 0; droneGain.connect(master);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.connect(droneGain);
        [43.65, 44.3, 65.4, 87.3].forEach(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); });
        // the warm hum of an old house (heater, fridge, CRT whine)
        humGain = ctx.createGain(); humGain.gain.value = 0; humGain.connect(master);
        const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 400; hf.connect(humGain);
        [60, 120, 180].forEach((f, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = [0.5, 0.25, 0.1][i]; o.connect(g); g.connect(hf); o.start(); });
    }
    const env = (g, t0, a, d, peak) => {
        g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    };
    function route(node, pan) {
        if (pan !== undefined && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); p.connect(master); }
        else node.connect(master);
    }
    function osc(type, f, t0, dur, peak, o = {}) {
        if (!ctx) return;
        const s = ctx.createOscillator(), g = ctx.createGain();
        s.type = type; s.frequency.setValueAtTime(f, t0);
        if (o.slide) s.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
        if (o.detune) s.detune.value = o.detune;
        env(g, t0, o.attack || 0.01, dur, peak);
        s.connect(g); route(g, o.pan); s.start(t0); s.stop(t0 + (o.attack || 0.01) + dur + 0.05);
    }
    function noise(t0, dur, peak, o = {}) {
        if (!ctx) return;
        const s = ctx.createBufferSource(); s.buffer = noiseBuf;
        const f = ctx.createBiquadFilter(); f.type = o.type || 'lowpass';
        f.frequency.setValueAtTime(o.freq || 800, t0);
        if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t0 + dur);
        f.Q.value = o.q || 1;
        const g = ctx.createGain(); env(g, t0, Math.min(o.attack || 0.02, dur / 2), dur, peak);
        s.connect(f); f.connect(g); route(g, o.pan); s.start(t0, Math.random() * 0.3); s.stop(t0 + dur + 0.1);
    }
    const now = () => ctx.currentTime + 0.01;

    // mom's song. it never resolves... unless you let it.
    const SONG = [0, 4, 7, 4, 9, 7, 4, 2, 0, 4, 7, 12, 11, 7, 9, 7, 5, 4, 2];
    const SONG_END = [0, 4, 7, 4, 9, 7, 4, 2, 0, 4, 7, 12, 11, 7, 9, 7, 5, 4, 2, -1, 0];
    function playSong(notes, dread, base = 523.25, step = 0.42, vol = 0.05) {
        const t = now();
        notes.forEach((n, i) => {
            const wrong = dread > 0.3 && Math.random() < dread * 0.3 ? rand(-1.3, 1.3) : 0;
            const f = base * Math.pow(2, (n + wrong) / 12) * (1 - dread * 0.1);
            osc('sine', f, t + i * step, 1.1, vol); osc('triangle', f * 2, t + i * step, 0.45, vol * 0.25);
        });
        return notes.length * step;
    }

    return {
        init,
        get ready() { return !!ctx; },
        mood(dread, cold, warm, dt) {
            if (!ctx) return; moodTimer -= dt; if (moodTimer > 0) return; moodTimer = 0.25;
            droneGain.gain.setTargetAtTime(Math.pow(dread, 1.6) * 0.2, ctx.currentTime, 0.6);
            windGain.gain.setTargetAtTime(0.008 + cold * 0.14, ctx.currentTime, 0.8);
            humGain.gain.setTargetAtTime(warm * 0.018, ctx.currentTime, 0.8);
        },
        tick() { if (ctx) noise(now(), 0.015, 0.012, { type: 'highpass', freq: 3000 }); },
        blip() { if (ctx) osc('square', 880, now(), 0.06, 0.035); },
        step(soft = 1) { if (ctx) noise(now(), 0.07, 0.045 * soft, { freq: 420, q: 0.8 }); },
        heavyStep(pan) { if (ctx) { const t = now(); noise(t, 0.16, 0.18, { freq: 180, q: 1.2, pan }); osc('sine', 70, t, 0.18, 0.18, { slide: 40, pan }); } },
        heart(i) { if (!ctx) return; const t = now(); osc('sine', 62, t, 0.2, 0.25 + 0.45 * i, { slide: 36 }); osc('sine', 56, t + 0.19, 0.2, 0.15 + 0.3 * i, { slide: 34 }); },
        whisper() { if (ctx) noise(now(), 1.6, 0.06, { type: 'bandpass', freq: 2600, freqTo: 1700, q: 6, attack: 0.5, pan: rand(-1, 1) }); },
        stinger(p = 1) {
            if (!ctx) return; const t = now();
            osc('sawtooth', 120, t, 1.3, 0.18 * p, { slide: 50 }); osc('sawtooth', 127, t, 1.3, 0.18 * p, { slide: 52 });
            noise(t, 0.9, 0.28 * p, { type: 'highpass', freq: 1800, freqTo: 600 });
        },
        boom() { if (!ctx) return; const t = now(); osc('sine', 90, t, 1.2, 0.7, { slide: 28 }); noise(t, 0.5, 0.4, { freq: 300 }); },
        pop() { if (!ctx) return; const t = now(); noise(t, 0.05, 0.25, { type: 'highpass', freq: 2500 }); osc('sine', 1400, t, 0.08, 0.05, { slide: 300 }); },
        creak() { if (!ctx) return; const t = now(); for (let i = 0; i < 9; i++) osc('sawtooth', 90 + Math.random() * 40, t + i * 0.16, 0.14, 0.035, { slide: 140 + Math.random() * 60 }); noise(t, 1.5, 0.04, { type: 'bandpass', freq: 900, q: 9 }); },
        knock() { if (!ctx) return; const t = now(); for (let i = 0; i < 3; i++) { noise(t + i * 0.27, 0.12, 0.55, { freq: 260 }); osc('sine', 95, t + i * 0.27, 0.14, 0.45, { slide: 48 }); } },
        chime() { if (!ctx) return; const t = now(); [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => osc('triangle', f, t + i * 0.07, 1.4, 0.08)); },
        ding() { if (!ctx) return; const t = now(); osc('triangle', 988, t, 0.25, 0.08); osc('triangle', 1319, t + 0.12, 0.4, 0.08); },
        ring() { if (!ctx) return; const t = now(); osc('square', 760, t, 0.16, 0.04); osc('square', 760, t + 0.24, 0.16, 0.04); },
        startup() {
            if (!ctx) return; const t = now();
            [[311.13, 0], [466.16, 0.15], [622.25, 0.3], [783.99, 0.45], [932.33, 0.62]].forEach(([f, d]) => { osc('triangle', f, t + d, 2.4, 0.05, { attack: 0.05 }); osc('sine', f / 2, t + d, 2.6, 0.03, { attack: 0.1 }); });
            osc('sine', 155.6, t, 3.2, 0.08, { attack: 0.4 });
        },
        pad(freqs, vol = 0.08) { if (!ctx) return; const t = now(); freqs.forEach(f => osc('sine', f, t, 8, vol, { attack: 2.5 })); },
        musicBox(dread, dt) {
            if (!ctx || songStop) return; boxTimer -= dt; if (boxTimer > 0) return;
            boxTimer = playSong(SONG, dread, 523.25, 0.42, extOK.norm ? 0.025 : 0.045) + rand(6, 10);
        },
        stopSong() { songStop = true; },
        songWithEnding() { if (!ctx) return; songStop = true; playSong(SONG_END, 0, 523.25, 0.5, 0.06); const t = now() + SONG_END.length * 0.5; [261.63, 329.63, 392, 523.25].forEach(f => osc('sine', f, t, 5, 0.05, { attack: 0.3 })); }
    };
})();

/* =====================================================================
   PROCEDURAL TEXTURES (tiny, crunchy, nearest-filtered)
   ===================================================================== */
function cTex(w, h, draw, rep, smooth = false) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
    t.minFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter; t.generateMipmaps = false;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    t.userData.g = g; t.userData.c = c;
    return t;
}
const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
function glowTex(r, gg, b) {
    return cTex(32, 32, (g) => {
        const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(0.35, `rgba(${r},${gg},${b},.45)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    }, null, true);
}
function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function drawWallpaper(g, real) {
    if (!real) {
        R(g, '#f3dcb0', 0, 0, 32, 32); R(g, '#ead0a0', 0, 0, 7, 32); R(g, '#e2c08e', 16, 0, 1, 32);
        const star = (x, y, c) => { R(g, c, x, y - 1, 1, 3); R(g, c, x - 1, y, 3, 1); };
        star(25, 7, '#d9846a'); star(10, 22, '#7fa7d8'); R(g, '#c9a25a', 24, 24, 2, 2); R(g, '#d98fa0', 3, 12, 1, 1);
    } else {
        R(g, '#80857e', 0, 0, 32, 32); R(g, '#787d76', 0, 0, 7, 32); R(g, '#71766f', 16, 0, 1, 32);
        const r = seeded(7); for (let i = 0; i < 40; i++) R(g, `rgba(40,40,30,${r() * 0.12})`, r() * 32 | 0, r() * 32 | 0, 2, 2);
        R(g, 'rgba(60,60,50,.18)', 24, 6, 1, 1); R(g, 'rgba(60,60,50,.12)', 9, 21, 1, 1);
    }
}
const wallTexP = cTex(32, 32, (g) => drawWallpaper(g, false), [10, 5]);
const wallTexS = cTex(32, 32, (g) => drawWallpaper(g, false), [0.625, 0.625]);
const wallRealP = cTex(32, 32, (g) => drawWallpaper(g, true), [10, 5]);
const wallRealS = cTex(32, 32, (g) => drawWallpaper(g, true), [0.625, 0.625]);

const floorTex = cTex(64, 64, (g) => {
    const r = seeded(3);
    for (let row = 0; row < 4; row++) {
        let x = -(r() * 30 | 0);
        while (x < 64) {
            const len = 22 + (r() * 24 | 0), b = 92 + (r() * 22 | 0);
            R(g, `rgb(${b + 38},${b - 6},${b - 44})`, x, row * 16, len, 15);
            R(g, 'rgba(0,0,0,.08)', x, row * 16 + 5, len, 1); R(g, 'rgba(255,255,255,.05)', x, row * 16 + 1, len, 1);
            R(g, '#3a2414', x, row * 16, 1, 16); x += len;
        }
        R(g, '#3a2414', 0, row * 16 + 15, 64, 1);
    }
}, [5, 5]);

const rugTex = cTex(64, 64, (g) => {
    const cols = ['#8a2b3a', '#ecd9b0', '#2f5f7a', '#ecd9b0', '#c99a3a', '#8a2b3a', '#ecd9b0', '#2f5f7a'];
    cols.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(32, 32, 32 - i * 4, 0, 7); g.fill(); });
    const r = seeded(11); for (let i = 0; i < 200; i++) R(g, `rgba(0,0,0,${r() * 0.1})`, r() * 64 | 0, r() * 64 | 0, 1, 1);
});
const blanketTex = cTex(16, 16, (g) => { R(g, '#c04a52', 0, 0, 16, 16); R(g, '#f0d8b8', 0, 6, 16, 3); R(g, '#f0d8b8', 6, 0, 3, 16); R(g, '#e8b0a8', 6, 6, 3, 3); }, [3, 3]);

const drawingTex = cTex(64, 48, (g) => {
    R(g, '#fffbea', 0, 0, 64, 48);
    g.strokeStyle = '#f0b820'; g.lineWidth = 2; g.beginPath(); g.arc(54, 9, 5, 0, 7); g.stroke();
    for (let a = 0; a < 8; a++) R(g, '#f0b820', 54 + Math.cos(a * .785) * 8, 9 + Math.sin(a * .785) * 8, 1, 1);
    R(g, '#5aaa4a', 0, 41, 64, 2);
    const fig = (x, h, col, long) => {
        g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.arc(x, 41 - h - 3, 3, 0, 7); g.stroke();
        R(g, col, x, 41 - h, 1, h * 0.6); R(g, col, x - 4, 41 - h * 0.78, 9, 1);
        R(g, col, x - 2, 41 - h * 0.4, 1, h * 0.4); R(g, col, x + 2, 41 - h * 0.4, 1, h * 0.4);
        if (long) { R(g, col, x - 4, 41 - h - 3, 1, 6); R(g, col, x + 4, 41 - h - 3, 1, 6); }
    };
    fig(14, 22, '#c0392b', true); fig(29, 15, '#9b59b6'); fig(41, 12, '#2e86c1');
    g.fillStyle = '#e67e22'; g.font = '7px monospace'; g.fillText('MY FAMLY', 3, 8);
    R(g, '#e74c3c', 33, 18, 1, 1); R(g, '#e74c3c', 35, 18, 1, 1); R(g, '#e74c3c', 34, 19, 1, 1);
});
const posterTex = cTex(32, 44, (g) => {
    R(g, '#16225a', 0, 0, 32, 44); const r = seeded(5); for (let i = 0; i < 18; i++) R(g, '#fff', r() * 32 | 0, r() * 44 | 0, 1, 1);
    R(g, '#e8e8f0', 13, 10, 6, 20); R(g, '#e8e8f0', 14, 7, 4, 3); R(g, '#e8e8f0', 15, 5, 2, 2);
    R(g, '#d64545', 10, 26, 3, 6); R(g, '#d64545', 19, 26, 3, 6); R(g, '#6cc4ff', 15, 15, 2, 2);
    R(g, '#ffb84a', 14, 31, 4, 3); R(g, '#ffe08a', 15, 34, 2, 3);
    g.fillStyle = '#ffd36b'; g.font = '6px monospace'; g.fillText('GO!', 10, 42);
});
const homeworkTex = cTex(32, 40, (g) => {
    R(g, '#fbf7ea', 0, 0, 32, 40); for (let y = 5; y < 40; y += 4) R(g, 'rgba(80,120,200,.35)', 0, y, 32, 1);
    g.fillStyle = '#334'; g.font = '5px monospace'; g.fillText('7x8=54', 2, 8); g.fillText('6x9=54', 2, 16); g.fillText('3+4=7', 2, 24);
    R(g, '#d33', 24, 3, 6, 1); g.fillStyle = '#d33'; g.fillText('56', 24, 9);
    R(g, '#d33', 22, 11, 7, 1); R(g, '#d33', 24, 9, 3, 2);   // a little hat
});
const frostTex = cTex(64, 64, (g) => {
    const r = seeded(9);
    for (let i = 0; i < 260; i++) {
        let x = r() * 64, y = r() * 64; const e = r() * 4 | 0;
        if (e === 0) y = r() * 12; if (e === 1) y = 64 - r() * 12; if (e === 2) x = r() * 12; if (e === 3) x = 64 - r() * 12;
        R(g, `rgba(225,242,255,${0.3 + r() * 0.5})`, x | 0, y | 0, 1 + (r() * 3 | 0), 1);
    }
    R(g, 'rgba(210,232,250,.14)', 0, 0, 64, 64);
}, null);
const skyTex = cTex(64, 64, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#060b1e'); gr.addColorStop(.75, '#1d2c50'); gr.addColorStop(1, '#3a4870');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const r = seeded(13); for (let i = 0; i < 40; i++) R(g, `rgba(255,255,255,${r()})`, r() * 64 | 0, r() * 40 | 0, 1, 1);
});
const skyDayTex = cTex(64, 64, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#8fb8e8'); gr.addColorStop(.7, '#f6d9b0'); gr.addColorStop(1, '#ffe9c8');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
const patchTex = cTex(32, 32, (g) => { // window light on the floor: 4 panes
    g.clearRect(0, 0, 32, 32);
    for (const [x, y] of [[2, 2], [17, 2], [2, 17], [17, 17]]) { R(g, 'rgba(255,255,255,.35)', x, y, 13, 13); R(g, 'rgba(255,255,255,.65)', x + 2, y + 2, 9, 9); }
}, null, true);
const patchBlindTex = cTex(32, 32, (g) => { g.clearRect(0, 0, 32, 32); for (let y = 2; y < 30; y += 4) R(g, 'rgba(255,255,255,.7)', 2, y, 28, 1); }, null, true);
const clockTex = cTex(32, 32, (g) => {
    g.fillStyle = '#fbf3e0'; g.beginPath(); g.arc(16, 16, 15, 0, 7); g.fill();
    g.strokeStyle = '#c0392b'; g.lineWidth = 2; g.beginPath(); g.arc(16, 16, 15, 0, 7); g.stroke();
    for (let i = 0; i < 12; i++) R(g, '#333', 16 + Math.sin(i * Math.PI / 6) * 12 - 0.5 | 0, 16 - Math.cos(i * Math.PI / 6) * 12 - 0.5 | 0, 1, 1);
});
const glowWarm = glowTex(255, 214, 150), glowCold = glowTex(150, 200, 255), glowWhite = glowTex(240, 245, 255);

// ---------- pixel faces (32x32) ----------
function drawFace(g, kind) {
    g.clearRect(0, 0, 32, 32);
    const ink = '#1e1420', blush = 'rgba(255,105,105,.55)';
    if (kind === 'kid' || kind === 'kid_scared') {
        R(g, ink, 8, 13, 4, 7); R(g, ink, 20, 13, 4, 7);
        R(g, '#fff', 8, 13, 2, 2); R(g, '#fff', 20, 13, 2, 2); R(g, '#9fc3ff', 11, 18, 1, 1); R(g, '#9fc3ff', 23, 18, 1, 1);
        R(g, blush, 4, 21, 5, 2); R(g, blush, 23, 21, 5, 2);
        if (kind === 'kid') { R(g, ink, 14, 23, 1, 1); R(g, ink, 15, 24, 2, 1); R(g, ink, 17, 23, 1, 1); }
        else { R(g, ink, 15, 22, 2, 3); R(g, '#fff', 9, 15, 1, 1); }
    } else if (kind === 'kid_blink') {
        R(g, ink, 8, 18, 4, 1); R(g, ink, 20, 18, 4, 1); R(g, blush, 4, 21, 5, 2); R(g, blush, 23, 21, 5, 2);
        R(g, ink, 14, 23, 1, 1); R(g, ink, 15, 24, 2, 1); R(g, ink, 17, 23, 1, 1);
    } else if (kind.startsWith('adult')) {
        const brow = '#2a1d1a';
        if (kind === 'adult_blink') { R(g, ink, 8, 18, 4, 1); R(g, ink, 20, 18, 4, 1); }
        else { R(g, ink, 8, 16, 4, 3); R(g, ink, 20, 16, 4, 3); R(g, '#fff', 8, 16, 1, 1); R(g, '#fff', 20, 16, 1, 1); R(g, 'rgba(140,100,90,.9)', 8, 15, 4, 1); R(g, 'rgba(140,100,90,.9)', 20, 15, 4, 1); }
        R(g, 'rgba(90,60,110,.5)', 8, 20, 4, 1); R(g, 'rgba(90,60,110,.5)', 20, 20, 4, 1);
        R(g, brow, 7, 12, 5, 1); R(g, brow, 20, 12, 5, 1);
        if (kind === 'adult_soft') { R(g, ink, 13, 23, 1, 1); R(g, ink, 14, 24, 4, 1); R(g, ink, 18, 23, 1, 1); R(g, '#a9d8ff', 7, 21, 1, 2); }
        else R(g, ink, 14, 24, 4, 1);
        const r = seeded(17); for (let i = 0; i < 16; i++) R(g, 'rgba(60,45,45,.35)', 10 + (r() * 12 | 0), 25 + (r() * 4 | 0), 1, 1);
    } else if (kind === 'echo') {
        const c = '#fff6e0';
        R(g, c, 8, 17, 1, 1); R(g, c, 9, 16, 2, 1); R(g, c, 11, 17, 1, 1);
        R(g, c, 20, 17, 1, 1); R(g, c, 21, 16, 2, 1); R(g, c, 23, 17, 1, 1);
        R(g, c, 13, 22, 1, 1); R(g, c, 14, 23, 4, 1); R(g, c, 18, 22, 1, 1);
    } else if (kind === 'void') {
        R(g, '#fff', 8, 16, 4, 1); R(g, '#fff', 20, 16, 4, 1);
    }
}
const FACE = {};
['kid', 'kid_blink', 'kid_scared', 'adult', 'adult_blink', 'adult_soft', 'echo', 'void'].forEach(k => FACE[k] = cTex(32, 32, (g) => drawFace(g, k)));

/* ---------- dynamic screens ---------- */
const tvTex = cTex(48, 36, (g) => R(g, '#0b0d10', 0, 0, 48, 36));
const monTex = cTex(64, 48, (g) => R(g, '#000', 0, 0, 64, 48));
const calTex = cTex(48, 56, () => { });
const phoneTex = cTex(16, 32, (g) => {
    R(g, '#0a1020', 0, 0, 16, 32); R(g, '#3a6ad8', 1, 2, 14, 6); R(g, '#fff', 3, 4, 10, 1); R(g, '#e33', 3, 12, 10, 2);
    R(g, '#9ab', 3, 16, 10, 1); R(g, '#9ab', 3, 19, 8, 1); R(g, '#9ab', 3, 22, 9, 1); R(g, '#9ab', 3, 25, 6, 1);
});
const photoTex = cTex(24, 28, (g) => {
    R(g, '#f4f1e8', 0, 0, 24, 28); R(g, '#2a2c34', 2, 2, 20, 18);
    R(g, '#3a3e4a', 7, 10, 10, 10); R(g, '#d8c0a8', 9, 6, 6, 5); R(g, '#1a1414', 8, 4, 8, 3); R(g, '#1a1414', 12, 2, 1, 2); R(g, '#8a3a3c', 8, 11, 8, 2);
});
const cardTex = cTex(24, 16, (g) => { R(g, '#f6efe0', 0, 0, 24, 16); g.strokeStyle = '#c8b898'; g.beginPath(); g.moveTo(0, 0); g.lineTo(12, 9); g.lineTo(24, 0); g.stroke(); R(g, '#d23c3c', 18, 2, 4, 4); g.fillStyle = '#556'; g.font = '4px monospace'; g.fillText('little bro', 2, 14); });

function drawCalendar(m, y, crossed, circle) {
    const g = calTex.userData.g;
    R(g, '#fbf8ee', 0, 0, 48, 56); R(g, '#c0392b', 0, 0, 48, 14); R(g, '#888', 22, 0, 4, 2);
    g.fillStyle = '#fff'; g.font = 'bold 9px monospace'; g.fillText(MONTHS[m] || '???', 3, 11); g.font = '7px monospace'; g.fillText(String(y), 26, 11);
    for (let d = 0; d < 35; d++) {
        const x = 2 + (d % 7) * 6.4 | 0, yy = 17 + (d / 7 | 0) * 7.5 | 0;
        R(g, '#d8d2c0', x, yy, 5, 6);
        if (d + 1 <= crossed) { R(g, '#d22', x, yy + 2, 5, 1); R(g, '#d22', x + 2, yy, 1, 6); }
        if (d + 1 === circle) { g.strokeStyle = '#2a7'; g.strokeRect(x - 0.5, yy - 0.5, 6, 7); }
    }
    calTex.needsUpdate = true;
}
drawCalendar(11, 2004, 23, 24);

function drawTV(mode, t) {
    const g = tvTex.userData.g, W = 48, H = 36;
    if (mode === 'off') { R(g, '#0b0d10', 0, 0, W, H); R(g, 'rgba(255,255,255,.07)', 4, 3, 12, 5); }
    else if (mode === 'cartoon') {
        R(g, '#7ec8ff', 0, 0, W, H); R(g, '#7bd36b', 0, 27, W, 9); R(g, '#5fb14f', 0, 27, W, 1);
        const cx = ((t * 10) % 70) - 12 | 0; R(g, '#fff', cx, 5, 10, 3); R(g, '#fff', cx + 3, 3, 5, 2);
        const bx = 24 + Math.sin(t * 2) * 12 | 0, by = 19 - Math.abs(Math.sin(t * 5)) * 7 | 0;
        g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(bx, by, 6, 0, 7); g.fill();
        R(g, '#222', bx - 3, by - 2, 1, 2); R(g, '#222', bx + 2, by - 2, 1, 2); R(g, '#c33', bx - 1, by + 2, 3, 1);
        R(g, '#f66', 6, 22, 4, 5); R(g, '#f66', 7, 20, 2, 2);
    } else if (mode === 'static' || mode === 'face') {
        const img = g.createImageData(W, H);
        for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 200; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        g.putImageData(img, 0, 0);
        if (mode === 'face') { R(g, 'rgba(0,0,0,.85)', 14, 6, 20, 26); R(g, '#fff', 18, 16, 4, 1); R(g, '#fff', 26, 16, 4, 1); }
    } else if (mode === 'stay') {
        R(g, '#000', 0, 0, W, H); g.fillStyle = Math.random() < 0.5 ? '#e22' : '#fff'; g.font = 'bold 12px monospace';
        g.fillText('STAY', 10 + (Math.random() * 3 | 0), 22);
    }
    tvTex.needsUpdate = true;
}
function drawMonitor(mode, t = 0) {
    const g = monTex.userData.g, W = 64, H = 48;
    const desk = () => {
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3a7be0'); gr.addColorStop(.6, '#9cc8f8'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.fillStyle = '#4fa83a'; g.beginPath(); g.ellipse(36, 50, 46, 18, 0, 0, 7); g.fill();
        R(g, '#fff', 3, 3, 5, 5); R(g, '#ffd23f', 3, 11, 5, 5); R(g, '#9be36b', 3, 19, 5, 5);
        R(g, '#245fdc', 0, H - 5, W, 5); R(g, '#3e9b3e', 0, H - 5, 12, 5);
    };
    if (mode === 'desk') desk();
    else if (mode === 'ring') {
        desk(); const on = Math.sin(t * 8) > 0;
        R(g, '#0a5fe6', 14, 12, 40, 6); R(g, '#fff', 14, 18, 40, 16); R(g, on ? '#3fae2a' : '#9be36b', 17, 21, 8, 9);
        g.fillStyle = '#123'; g.font = '6px monospace'; g.fillText('sis <3', 28, 26); g.fillText('calling', 28, 32);
    } else if (mode === 'msn') {
        desk(); R(g, '#0a5fe6', 8, 6, 48, 6); R(g, '#fff', 8, 12, 48, 28);
        for (let i = 0; i < 5; i++) R(g, i % 2 ? '#1d3f8a' : '#666', 11, 15 + i * 4, 18 + ((i * 13 + (t * 3 | 0)) % 22), 1);
    } else if (mode === 'lost') {
        R(g, '#000', 0, 0, W, H); g.fillStyle = '#7d9cff'; g.font = '8px monospace'; g.fillText('NO SIGNAL', 9, 27);
    } else if (mode === 'laptop') {
        R(g, '#5a7edc', 0, 0, W, H); R(g, '#00309c', 0, 0, W, 6); R(g, '#003399', 0, H - 7, W, 7); R(g, '#f99736', 0, H - 7, W, 1);
        R(g, '#fff', 34, 18, 1, 14); R(g, '#e8eefc', 38, 19, 8, 8); R(g, '#ffd8a8', 40, 21, 4, 4);
        g.fillStyle = '#fff'; g.font = 'italic 7px sans-serif'; g.fillText('welcome', 4, 26); g.font = '4px sans-serif'; g.fillText('back', 48, 24);
    } else R(g, '#020304', 0, 0, W, H);
    monTex.needsUpdate = true;
}
drawMonitor('desk'); drawTV('off', 0);

/* =====================================================================
   THE ROOM
   ===================================================================== */
const roomG = new THREE.Group(); scene.add(roomG);
function M(geo, mat, x = 0, y = 0, z = 0, parent = roomG) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }
const B = (w, h, d, mat, x, y, z, parent) => M(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);

const wallMatP = lam(0xffffff, { map: wallTexP }), wallMatS = lam(0xffffff, { map: wallTexS });
const floorMat = lam(0xffffff, { map: floorTex });
const wood = lam(0x6a4228), darkWood = lam(0x3e2716), trim = lam(0xe6d6b0), cream = lam(0xf0e6d0);

// floor
M(new THREE.PlaneGeometry(16, 16), floorMat).rotation.x = -Math.PI / 2;

// back wall (window hole x 2..6, y 2.5..5.5)
{
    const s = new THREE.Shape(); s.moveTo(-8, 0); s.lineTo(8, 0); s.lineTo(8, 8); s.lineTo(-8, 8); s.closePath();
    const h = new THREE.Path(); h.moveTo(2, 2.5); h.lineTo(6, 2.5); h.lineTo(6, 5.5); h.lineTo(2, 5.5); h.closePath(); s.holes.push(h);
    M(new THREE.ShapeGeometry(s), wallMatS, 0, 0, -8);
}
// right wall (door hole at z -5.5..-3.5)
{
    const s = new THREE.Shape(); s.moveTo(-8, 0); s.lineTo(8, 0); s.lineTo(8, 8); s.lineTo(-8, 8); s.closePath();
    const h = new THREE.Path(); h.moveTo(-5.5, 0); h.lineTo(-3.5, 0); h.lineTo(-3.5, 5.2); h.lineTo(-5.5, 5.2); h.closePath(); s.holes.push(h);
    M(new THREE.ShapeGeometry(s), wallMatS, 8, 0, 0).rotation.y = -Math.PI / 2;
}
M(new THREE.PlaneGeometry(16, 8), wallMatP, -8, 4, 0).rotation.y = Math.PI / 2;
M(new THREE.PlaneGeometry(16, 8), wallMatP, 0, 4, 8).rotation.y = Math.PI; // faces away from the camera
// baseboards + crown
B(16, 0.4, 0.15, trim, 0, 0.2, -7.93); B(0.15, 0.4, 16, trim, -7.93, 0.2, 0); B(0.15, 0.4, 16, trim, 7.93, 0.2, 0);
B(16, 0.2, 0.2, trim, 0, 7.9, -7.9); B(0.2, 0.2, 16, trim, -7.9, 7.9, 0);

/* ---------- outside the window ---------- */
const outside = new THREE.Group(); scene.add(outside);
const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, fog: false });
M(new THREE.PlaneGeometry(130, 60), skyMat, 4, 10, -48, outside);
const snowGround = lam(0xdfe8f5);
M(new THREE.PlaneGeometry(90, 42), snowGround, 4, -0.02, -29, outside).rotation.x = -Math.PI / 2;
const pineMat = lam(0x1d3a2e), snowCap = lam(0xf2f6ff), barkMat = lam(0x3a2618);
function pine(x, z, s) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); outside.add(g);
    M(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 5), barkMat, 0, 0.4, 0, g);
    [[1.5, 1.6, 1.4], [1.15, 1.4, 2.4], [0.8, 1.2, 3.3]].forEach(([r, h, y], i) => { M(new THREE.ConeGeometry(r, h, 6), pineMat, 0, y, 0, g); M(new THREE.ConeGeometry(r * 0.55, h * 0.4, 6), snowCap, 0, y + h * 0.32, 0, g); });
}
[[-6, -16, 1.2], [-1.5, -20, 1.5], [10, -17, 1.3], [14, -24, 1.7], [-10, -26, 1.8], [2, -30, 2.0], [8, -33, 1.6]].forEach(a => pine(...a));
// neighbour's house with warm windows
const houseG = new THREE.Group(); houseG.position.set(-3, 0, -27); outside.add(houseG);
B(7, 4, 5, lam(0x3a3240), 0, 2, 0, houseG);
const roof = M(new THREE.ConeGeometry(5.2, 2.6, 4), lam(0x2a2230), 0, 5.3, 0, houseG); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.75;
const houseWinMat = bas({ color: 0xffc46a, fog: false });
B(1.1, 1.1, 0.1, houseWinMat, -1.8, 2.3, 2.52, houseG); B(1.1, 1.1, 0.1, houseWinMat, 1.6, 2.3, 2.52, houseG);
// fence
for (let i = 0; i < 16; i++) B(0.18, 1.1, 0.12, lam(0x5a4632), -6 + i * 1.1, 0.55, -12.5, outside);
B(17.5, 0.12, 0.1, lam(0x5a4632), 2.3, 0.85, -12.5, outside);
// streetlamp
const streetG = new THREE.Group(); streetG.position.set(8.5, 0, -15); outside.add(streetG);
M(new THREE.CylinderGeometry(0.1, 0.14, 5, 5), lam(0x222228), 0, 2.5, 0, streetG);
B(0.7, 0.25, 0.5, lam(0x222228), -0.25, 5, 0, streetG);
const streetBulbMat = bas({ color: 0xffd28a, fog: false });
B(0.4, 0.08, 0.3, streetBulbMat, -0.3, 4.86, 0, streetG);
const streetGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowWarm, color: 0xffd28a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
streetGlow.position.set(-0.3, 4.7, 0); streetGlow.scale.set(4, 4, 1); streetG.add(streetGlow);
const streetLight = new THREE.PointLight(0xffc27a, 30, 14, 2); streetLight.position.set(8.2, 4.4, -15); scene.add(streetLight);
// snowman (appears with the snow memory)
const snowman = new THREE.Group(); snowman.position.set(3.4, 0, -11.2); snowman.scale.setScalar(0.001); outside.add(snowman);
{
    const sm = lam(0xf4f7ff);
    M(new THREE.IcosahedronGeometry(0.9, 0), sm, 0, 0.8, 0, snowman); M(new THREE.IcosahedronGeometry(0.65, 0), sm, 0, 2.0, 0, snowman); M(new THREE.IcosahedronGeometry(0.45, 0), sm, 0, 2.9, 0, snowman);
    const coal = lam(0x111111); M(new THREE.IcosahedronGeometry(0.06, 0), coal, -0.15, 3.0, 0.4, snowman); M(new THREE.IcosahedronGeometry(0.06, 0), coal, 0.15, 3.0, 0.4, snowman);
    const nose = M(new THREE.ConeGeometry(0.07, 0.4, 4), lam(0xff8a2a), 0, 2.88, 0.55, snowman); nose.rotation.x = Math.PI / 2;
    const sc = M(new THREE.TorusGeometry(0.42, 0.09, 4, 7), lam(0xd23c3c), 0, 2.5, 0, snowman); sc.rotation.x = Math.PI / 2;
}
// snowfall outside
const SNOW_N = 380, snowGeo = new THREE.BufferGeometry(), snowPos = new Float32Array(SNOW_N * 3);
for (let i = 0; i < SNOW_N; i++) { snowPos[i * 3] = rand(-6, 16); snowPos[i * 3 + 1] = rand(-1, 12); snowPos[i * 3 + 2] = rand(-24, -8.6); }
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snowMat = new THREE.PointsMaterial({ size: 0.13, color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, fog: false });
const snow = new THREE.Points(snowGeo, snowMat); snow.frustumCulled = false; scene.add(snow);

/* ---------- window ---------- */
const frameMat = lam(0xeee2c6);
B(4.6, 0.3, 0.6, frameMat, 4, 2.38, -7.75); B(4.5, 0.25, 0.25, frameMat, 4, 5.62, -7.85);
B(0.25, 3.3, 0.25, frameMat, 1.92, 4, -7.85); B(0.25, 3.3, 0.25, frameMat, 6.08, 4, -7.85);
B(0.1, 3.1, 0.1, frameMat, 4, 4, -7.92); B(4, 0.1, 0.1, frameMat, 4, 4, -7.92);
const frostMat = new THREE.MeshBasicMaterial({ map: frostTex, transparent: true, opacity: 0, depthWrite: false, fog: false });
M(new THREE.PlaneGeometry(4, 3), frostMat, 4, 4, -7.8);
const curtainMat = lam(0x8a3448, { side: THREE.DoubleSide });
function curtain(x) {
    const g = new THREE.PlaneGeometry(1.35, 4.1, 6, 1); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, ((i % 7) % 2 ? 0.12 : -0.08));
    g.computeVertexNormals(); return M(g, curtainMat, x, 4.1, -7.55);
}
const curtains = [curtain(1.45), curtain(6.55)];
B(6.6, 0.1, 0.1, darkWood, 4, 6.2, -7.5);
// blinds (reality)
const blinds = new THREE.Group(); blinds.visible = false; roomG.add(blinds);
const slatMat = lam(0xd8d4c8);
const slats = []; for (let i = 0; i < 12; i++) { const s = B(4.1, 0.24, 0.04, slatMat, 4, 5.4 - i * 0.25, -7.62, blinds); slats.push(s); }
// light patch on the floor
const patchMat = new THREE.MeshBasicMaterial({ map: patchTex, color: 0x8fb4ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
const patch = M(new THREE.PlaneGeometry(3.8, 3.4), patchMat, 3.6, 0.03, -4.4); patch.rotation.x = -Math.PI / 2; patch.rotation.z = 0.12;

/* ---------- wall decor ---------- */
const poster = M(new THREE.PlaneGeometry(1.25, 1.7), lam(0xffffff, { map: posterTex }), -3.3, 4.8, -7.93);
const calendar = M(new THREE.PlaneGeometry(0.95, 1.1), lam(0xffffff, { map: calTex }), -1.35, 5.35, -7.93);
const clockG = new THREE.Group(); clockG.position.set(0.85, 6.05, -7.9); roomG.add(clockG);
M(new THREE.CylinderGeometry(0.52, 0.52, 0.1, 10), lam(0xc0392b), 0, 0, 0, clockG).rotation.x = Math.PI / 2;
M(new THREE.PlaneGeometry(0.92, 0.92), lam(0xffffff, { map: clockTex, transparent: true, alphaTest: 0.5 }), 0, 0, 0.06, clockG);
const hourHand = new THREE.Group(), minHand = new THREE.Group(); hourHand.position.z = minHand.position.z = 0.08; clockG.add(hourHand, minHand);
B(0.05, 0.24, 0.02, lam(0x222222), 0, 0.12, 0, hourHand); B(0.035, 0.36, 0.02, lam(0x222222), 0, 0.18, 0, minHand);
const drawing = M(new THREE.PlaneGeometry(2.0, 1.5), lam(0xffffff, { map: drawingTex }), -7.93, 4.3, 0.5); drawing.rotation.y = Math.PI / 2;
// glow-in-the-dark stars above the bed
const starShape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.07 : 0.17, a = i / 10 * Math.PI * 2; i ? starShape.lineTo(Math.sin(a) * r, Math.cos(a) * r) : starShape.moveTo(0, r); }
const starMat = bas({ color: 0xb8ffb0, transparent: true, opacity: 0.2, fog: false });
const starGeo = new THREE.ShapeGeometry(starShape);
{ const r = seeded(21); for (let i = 0; i < 14; i++) { const s = M(starGeo, starMat, -7.92, 5.2 + r() * 2.4, -7 + r() * 6.2); s.rotation.y = Math.PI / 2; s.rotation.x = r() * 2; s.scale.setScalar(0.7 + r() * 0.7); } }

/* ---------- string lights ---------- */
const bulbs = [];
const BULB_COLS = [0xffd36b, 0xff8a7a, 0x9fe0ff, 0xb4ff9a, 0xffb3ec];
const bulbGeo = new THREE.IcosahedronGeometry(0.09, 0);
function stringLights(from, to, n, sag, droop) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
        const k = i / n, p = new THREE.Vector3().lerpVectors(from, to, k);
        p.y -= Math.abs(Math.sin(k * Math.PI * droop)) * sag; pts.push(p);
        if (i > 0 && i < n) {
            const col = BULB_COLS[bulbs.length % BULB_COLS.length];
            const mat = new THREE.MeshBasicMaterial({ color: col, fog: false });
            const m = M(bulbGeo, mat, p.x, p.y - 0.08, p.z); bulbs.push({ m, mat, base: new THREE.Color(col), dead: false, ph: rand(0, 6) });
        }
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2a3a22 }));
    roomG.add(line); return line;
}
stringLights(new THREE.Vector3(-7.8, 7.3, -7.8), new THREE.Vector3(7.8, 7.3, -7.8), 30, 0.55, 4);
stringLights(new THREE.Vector3(-7.8, 7.3, -7.8), new THREE.Vector3(-7.8, 7.3, 7.6), 26, 0.5, 3);
const strLightA = new THREE.PointLight(0xffb0a0, 5, 9, 2); strLightA.position.set(-3, 6.4, -6.8); scene.add(strLightA);
const strLightB = new THREE.PointLight(0xa8d8ff, 4, 9, 2); strLightB.position.set(-6.8, 6.4, 2); scene.add(strLightB);

/* ---------- rug & toys ---------- */
const rug = M(new THREE.CircleGeometry(2.8, 12), lam(0xffffff, { map: rugTex }), 1.4, 0.02, 1.8); rug.rotation.x = -Math.PI / 2;
const toys = new THREE.Group(); roomG.add(toys);
function letterTex(ch, bg) { return cTex(16, 16, (g) => { R(g, bg, 0, 0, 16, 16); R(g, 'rgba(255,255,255,.25)', 0, 0, 16, 1); g.fillStyle = '#fff'; g.font = 'bold 12px monospace'; g.fillText(ch, 4, 13); }); }
[['A', '#d6453d', -0.4, 0.25, 2.5, 0.2], ['B', '#3d7fd6', 0.2, 0.25, 3.0, -0.1], ['C', '#3dd67f', -0.1, 0.75, 2.75, 0.4]].forEach(([ch, col, x, y, z, ry]) => { B(0.5, 0.5, 0.5, lam(0xffffff, { map: letterTex(ch, col) }), x, y, z, toys).rotation.y = ry; });
M(new THREE.IcosahedronGeometry(0.32, 1), lam(0xe84a4a), 2.9, 0.32, 3.5, toys);
B(0.9, 0.32, 0.42, lam(0x2e6fa8), 1.0, 0.3, 4.1, toys); B(0.42, 0.45, 0.42, lam(0xd6453d), 1.33, 0.55, 4.1, toys);
[-0.25, 0.25].forEach(x => { M(new THREE.CylinderGeometry(0.12, 0.12, 0.48, 6), lam(0x222222), 1.0 + x, 0.12, 4.1, toys).rotation.x = Math.PI / 2; });
const controller = B(0.5, 0.1, 0.3, lam(0x55555e), 3.4, 0.07, 1.2, toys); controller.rotation.y = 0.4;

/* ---------- bed + teddy ---------- */
const bedG = new THREE.Group(); roomG.add(bedG);
B(4, 0.7, 7, darkWood, -5.5, 0.35, -4, bedG);
B(3.8, 0.45, 6.8, cream, -5.5, 0.92, -4, bedG);
const blanket = B(3.95, 0.34, 4.6, lam(0xffffff, { map: blanketTex }), -5.5, 1.2, -2.75, bedG);
B(2.3, 0.42, 1.1, lam(0xfaf6ee), -5.5, 1.32, -6.8, bedG);
B(4.1, 2.7, 0.3, darkWood, -5.5, 1.35, -7.7, bedG); B(4.1, 1.3, 0.3, darkWood, -5.5, 0.65, -0.45, bedG);
const messyBed = new THREE.Group(); messyBed.visible = false; roomG.add(messyBed);
{ const h = M(new THREE.IcosahedronGeometry(1.3, 1), lam(0x4e5060), -5.4, 1.2, -3.4, messyBed); h.scale.set(1.45, 0.35, 2.0); }
function makeTeddy() {
    const g = new THREE.Group(), m = lam(0xb8854f), d = lam(0xd8b088), k = lam(0x111111);
    M(new THREE.IcosahedronGeometry(0.34, 0), m, 0, 0.3, 0, g); M(new THREE.IcosahedronGeometry(0.28, 1), m, 0, 0.78, 0, g);
    M(new THREE.IcosahedronGeometry(0.1, 0), m, -0.2, 1.0, 0, g); M(new THREE.IcosahedronGeometry(0.1, 0), m, 0.2, 1.0, 0, g);
    M(new THREE.IcosahedronGeometry(0.1, 0), d, 0, 0.72, 0.24, g);
    B(0.05, 0.06, 0.02, k, -0.1, 0.84, 0.26, g); B(0.05, 0.06, 0.02, k, 0.1, 0.84, 0.26, g);
    [-1, 1].forEach(s => { M(new THREE.IcosahedronGeometry(0.12, 0), m, s * 0.28, 0.42, 0.06, g); M(new THREE.IcosahedronGeometry(0.13, 0), m, s * 0.17, 0.08, 0.18, g); });
    const bow = B(0.22, 0.08, 0.06, lam(0x3d7fd6), 0, 0.56, 0.24, g);
    return g;
}
const teddy = makeTeddy(); teddy.position.set(-4.4, 1.38, -5.9); teddy.rotation.y = 0.5; roomG.add(teddy);

/* ---------- desk / computer ---------- */
const deskG = new THREE.Group(); roomG.add(deskG);
B(5, 0.2, 2.5, wood, 0, 2.4, -6.5, deskG);
[[-2.3, -5.45], [2.3, -5.45], [-2.3, -7.55], [2.3, -7.55]].forEach(([x, z]) => B(0.2, 2.3, 0.2, darkWood, x, 1.15, z, deskG));
B(1.2, 1.9, 2.2, darkWood, 1.7, 1.35, -6.5, deskG); B(0.9, 0.08, 0.05, trim, 1.7, 1.8, -5.38, deskG); B(0.9, 0.08, 0.05, trim, 1.7, 1.0, -5.38, deskG);
const crtG = new THREE.Group(); deskG.add(crtG);
const beige = lam(0xcfc6ae);
B(1.7, 1.4, 1.3, beige, 0, 3.25, -6.75, crtG); B(1.2, 1.0, 0.7, beige, 0, 3.2, -7.6, crtG); B(0.7, 0.18, 0.7, beige, 0, 2.58, -6.8, crtG);
const monMat = new THREE.MeshBasicMaterial({ map: monTex, fog: false });
M(new THREE.PlaneGeometry(1.32, 1.0), monMat, 0, 3.28, -6.09, crtG);
B(1.3, 0.08, 0.45, lam(0xbdb5a0), 0, 2.54, -5.72, crtG);
const homework = M(new THREE.PlaneGeometry(0.8, 1.0), lam(0xffffff, { map: homeworkTex }), -1.55, 2.515, -6.05, deskG); homework.rotation.x = -Math.PI / 2; homework.rotation.z = 0.3;
const pencil = M(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 5), lam(0xe0b020), -1.0, 2.53, -5.95, deskG); pencil.rotation.z = Math.PI / 2; pencil.rotation.y = 0.5;
M(new THREE.CylinderGeometry(0.16, 0.14, 0.4, 6), lam(0x3d7fd6), -2.0, 2.7, -7.0, deskG);
['#e33', '#3a3', '#fc0'].forEach((c, i) => { const p = M(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 4), lam(new THREE.Color(c)), -2.05 + i * 0.05, 2.9, -7.0, deskG); p.rotation.z = (i - 1) * 0.2; });
// desk lamp
M(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 6), darkWood, 2.1, 2.54, -7.0, deskG);
M(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 4), darkWood, 2.1, 3.05, -7.0, deskG);
M(new THREE.ConeGeometry(0.38, 0.42, 6, 1, true), lam(0xd6a35a, { side: THREE.DoubleSide }), 2.1, 3.72, -6.95, deskG);
const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false });
M(new THREE.IcosahedronGeometry(0.1, 0), lampBulbMat, 2.1, 3.58, -6.95, deskG);
// laptop (reality)
const laptopG = new THREE.Group(); laptopG.visible = false; deskG.add(laptopG);
B(1.5, 0.06, 1.0, lam(0x3a3c44), 0, 2.53, -6.0, laptopG);
const lidG = new THREE.Group(); lidG.position.set(0, 2.55, -6.5); lidG.rotation.x = -0.25; laptopG.add(lidG);
B(1.5, 1.0, 0.05, lam(0x3a3c44), 0, 0.5, 0, lidG);
M(new THREE.PlaneGeometry(1.36, 0.86), monMat, 0, 0.5, 0.03, lidG);
// chair
const chair = new THREE.Group(); chair.position.set(1.5, 0, -4.4); chair.rotation.y = 2.75; roomG.add(chair);
B(1, 0.12, 1, wood, 0, 1.3, 0, chair); B(1, 1.25, 0.12, wood, 0, 1.95, -0.45, chair);
[[-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4]].forEach(([x, z]) => B(0.1, 1.25, 0.1, darkWood, x, 0.62, z, chair));
const hoodieOnChair = B(0.9, 0.5, 0.3, lam(0x50555f), 0, 2.3, -0.5, chair); hoodieOnChair.visible = false;

/* ---------- TV ---------- */
const tvG = new THREE.Group(); roomG.add(tvG);
B(1.3, 1.1, 2.6, wood, 7.25, 0.55, 0.8, tvG); B(0.05, 0.4, 2.2, darkWood, 6.6, 0.55, 0.8, tvG);
B(1.4, 1.35, 1.75, lam(0x3a3a42), 7.25, 1.78, 0.8, tvG); B(0.8, 0.9, 1.1, lam(0x3a3a42), 7.7, 1.75, 0.8, tvG);
const tvMat = new THREE.MeshBasicMaterial({ map: tvTex, fog: false });
const tvScreen = M(new THREE.PlaneGeometry(1.3, 1.0), tvMat, 6.54, 1.82, 0.8, tvG); tvScreen.rotation.y = -Math.PI / 2;
[-1, 1].forEach(s => { const a = M(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 3), lam(0x999999), 7.3, 2.95, 0.8 + s * 0.3, tvG); a.rotation.x = s * 0.5; });
B(0.85, 0.2, 0.62, lam(0x8a8a94), 6.1, 0.1, 2.3, tvG); B(0.1, 0.05, 0.1, lam(0xd23c3c), 6.3, 0.22, 2.3, tvG);

/* ---------- bookshelf ---------- */
const shelf = new THREE.Group(); roomG.add(shelf);
B(1, 5, 3.6, darkWood, -7.4, 2.5, 3, shelf);
const bookCols = [0xc0392b, 0x2e86c1, 0x27ae60, 0xd4ac0d, 0x8e44ad, 0xe67e22, 0x1abc9c];
{ const r = seeded(31); for (let s = 0; s < 4; s++) { let z = 1.4; while (z < 4.5) { const w = 0.18 + r() * 0.14, h = 0.7 + r() * 0.3; B(0.7, h, w, lam(bookCols[r() * 7 | 0]), -7.15, 0.55 + s * 1.15 + h / 2, z, shelf); z += w + 0.03; } } }
for (let s = 0; s < 5; s++) B(1.02, 0.08, 3.6, wood, -7.4, 0.5 + s * 1.15, 3, shelf);

/* ---------- closet ---------- */
const closet = new THREE.Group(); roomG.add(closet);
B(2, 7, 3.4, wood, 7, 3.5, 5, closet);
const doorMat = lam(0x6a4428);
B(0.1, 6.4, 1.5, doorMat, 5.95, 3.5, 4.2, closet);
const closetPivot = new THREE.Group(); closetPivot.position.set(5.95, 3.5, 6.5); closet.add(closetPivot);
B(0.1, 6.4, 1.5, doorMat, 0, 0, -0.75, closetPivot);
for (let i = 0; i < 6; i++) B(0.04, 0.12, 1.2, darkWood, -0.06, -2.2 + i * 0.9, -0.75, closetPivot);
B(0.08, 0.3, 0.08, lam(0xc9a14a), -0.07, 0, -1.3, closetPivot);
// interior (only visible from inside / when open)
const closetIn = new THREE.Group(); closet.add(closetIn);
const inMat = lam(0x120c08, { side: THREE.BackSide });
const inBox = M(new THREE.BoxGeometry(1.85, 6.8, 3.2), inMat, 7.0, 3.5, 5.0, closetIn);
const inGeo = inBox.geometry; // remove the face toward the room so you can see out from inside
inGeo.clearGroups(); inGeo.addGroup(0, 6, 0); inGeo.addGroup(12, 24, 0); inBox.material = [inMat];
for (let i = 0; i < 4; i++) { const c = B(0.12, 1.6 + rand(0, 0.8), 0.7, lam(pick([0x3d5a8a, 0x8a3d4a, 0x6a6a4a, 0x4a3a5a])), 7.2, 4.4, 3.8 + i * 0.75, closetIn); c.position.y = 5.4 - c.geometry.parameters.height / 2; }
const closetEyes = new THREE.Group(); closetEyes.visible = false; closet.add(closetEyes);
const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
[5.7, 6.05].forEach(z => { const e = M(new THREE.PlaneGeometry(0.12, 0.05), eyeGlowMat, 6.3, 4.4, z, closetEyes); e.rotation.y = -Math.PI / 2; });
let closetOpen = 0, closetOpenTarget = 0;
const closetGlow = new THREE.PointLight(0xffb070, 0, 4, 2); closetGlow.position.set(6.6, 2.4, 5.4); scene.add(closetGlow);

/* ---------- the real door ---------- */
const doorPivot = new THREE.Group(); doorPivot.position.set(7.95, 0, -5.5); roomG.add(doorPivot);
B(0.12, 5.1, 2.0, lam(0x7a5a40), 0, 2.55, 1.0, doorPivot);
B(0.04, 1.8, 1.4, lam(0x6a4a30), -0.07, 3.6, 1.0, doorPivot); B(0.04, 1.8, 1.4, lam(0x6a4a30), -0.07, 1.4, 1.0, doorPivot);
M(new THREE.IcosahedronGeometry(0.1, 0), lam(0xd9b45a), -0.14, 2.5, 1.75, doorPivot);
B(0.25, 5.4, 0.2, trim, 7.88, 2.7, -5.6); B(0.25, 5.4, 0.2, trim, 7.88, 2.7, -3.4); B(0.25, 0.25, 2.4, trim, 7.88, 5.3, -4.5);
const hallMat = lam(0x0a0a0d, { side: THREE.BackSide });
M(new THREE.BoxGeometry(3.4, 5.4, 3.0), hallMat, 9.75, 2.6, -4.5);
let doorAngle = 0, doorTarget = 0;
const doorGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const doorGlow = M(new THREE.PlaneGeometry(0.9, 2.0), doorGlowMat, 7.5, 0.03, -4.5); doorGlow.rotation.x = -Math.PI / 2;
const feet = new THREE.Group(); feet.visible = false; roomG.add(feet);
const feetMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.75, depthWrite: false });
const footL = M(new THREE.PlaneGeometry(0.5, 0.32), feetMat, 7.8, 0.04, -4.85, feet), footR = M(new THREE.PlaneGeometry(0.5, 0.32), feetMat, 7.8, 0.04, -4.1, feet);
footL.rotation.x = footR.rotation.x = -Math.PI / 2;

/* ---------- reality clutter ---------- */
const clutter = new THREE.Group(); clutter.visible = false; roomG.add(clutter);
{
    const r = seeded(41);
    const box = lam(0xe8e2d4), can = lam(0x8a9aa8), cloth = [0x50555f, 0x3a3f4a, 0x6a5a4a, 0x2f3440];
    for (let i = 0; i < 5; i++) { const b = B(0.7, 0.35, 0.7, box, -1.5 + r() * 4, 0.18, -2 + r() * 4, clutter); b.rotation.y = r() * 3; }
    for (let i = 0; i < 4; i++) { const b = B(0.5, 0.25, 0.5, box, -2.4 + r() * 0.6, 2.63 + i * 0.25, -6.6 + r() * 0.3, clutter); b.rotation.y = r(); }
    for (let i = 0; i < 7; i++) { const c = M(new THREE.CylinderGeometry(0.11, 0.11, 0.32, 6), can, -3 + r() * 6, 0.16, -3 + r() * 7, clutter); if (r() < 0.5) { c.rotation.z = Math.PI / 2; c.position.y = 0.11; } }
    for (let i = 0; i < 4; i++) { const c = M(new THREE.IcosahedronGeometry(0.7, 0), lam(cloth[i]), -2 + r() * 7, 0.15, 2 + r() * 4, clutter); c.scale.set(1.2, 0.3, 0.9); }
    for (let i = 0; i < 9; i++) { const env = B(0.6, 0.03, 0.4, lam(0xf2ead8), 6.4 + r() * 1.2, 0.03 + i * 0.03, -4.3 + r() * 1.3, clutter); env.rotation.y = r() * 2; }
}

/* =====================================================================
   LIGHTS
   ===================================================================== */
const WARM = new THREE.Color(0xffcc88), COLD = new THREE.Color(0x8fb4ff);
const hemi = new THREE.HemisphereLight(0xffe2b0, 0x302018, 0.6); scene.add(hemi);
const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false });
const pendant = new THREE.Group(); pendant.position.set(0, 6.4, 0.5); scene.add(pendant);
M(new THREE.CylinderGeometry(0.02, 0.02, 3, 3), darkWood, 0, 1.6, 0, pendant);
M(new THREE.ConeGeometry(0.75, 0.55, 6, 1, true), lam(0xf0e0b8, { side: THREE.DoubleSide }), 0, 0.15, 0, pendant);
M(new THREE.IcosahedronGeometry(0.17, 0), bulbMat, 0, -0.05, 0, pendant);
const ceilLight = new THREE.PointLight(0xffcc88, 90, 30, 2); ceilLight.position.set(0, 6.0, 0.5); scene.add(ceilLight);
const deskLamp = new THREE.PointLight(0xffb866, 8, 9, 2); deskLamp.position.set(2.1, 3.5, -6.4); scene.add(deskLamp);
const screenLight = new THREE.PointLight(0x9fc8ff, 1.2, 7, 2); screenLight.position.set(0, 3.3, -5.0); scene.add(screenLight);
const tvLight = new THREE.PointLight(0x9fd0ff, 0, 8, 2); tvLight.position.set(5.6, 2.0, 0.8); scene.add(tvLight);
const winLight = new THREE.PointLight(0x8fb4ff, 6, 9, 2); winLight.position.set(4, 3.8, -6.6); scene.add(winLight);
const sunLight = new THREE.SpotLight(0xffd6a0, 0, 0, 0.7, 0.7, 1.4); sunLight.position.set(4, 7, -12); sunLight.target.position.set(3, 0, -3); scene.add(sunLight, sunLight.target);
const doorLight = new THREE.PointLight(0xffd9a0, 0, 7, 2); doorLight.position.set(7.4, 0.5, -4.5); scene.add(doorLight);
const lanternLight = new THREE.PointLight(0xffd27a, 0, 11, 2); scene.add(lanternLight);
const kidLight = new THREE.PointLight(0xffc88a, 0, 5, 2); scene.add(kidLight);
const faceLight = new THREE.PointLight(0xffc27a, 0, 6, 2); scene.add(faceLight);
const keyLight = new THREE.PointLight(0xffe2c0, 0, 7, 2); scene.add(keyLight);

/* =====================================================================
   CHIBI BUILDER — big heads, stubby limbs, flat faces drawn in pixels
   ===================================================================== */
function makeChibi(o) {
    const Mt = o.mats;
    const group = new THREE.Group(), root = new THREE.Group(); group.add(root);
    const { headR, bodyH, legH, armLen, limb = 1, bodyW = 0.36, shoulder = 0.34 } = o;
    const hipY = legH + 0.06;
    const add = (geo, mat, parent, x = 0, y = 0, z = 0) => M(geo, mat, x, y, z, parent);
    const legGeo = new THREE.CylinderGeometry(0.12 * limb, 0.1 * limb, legH, 5); legGeo.translate(0, -legH / 2, 0);
    const shoeGeo = new THREE.BoxGeometry(0.22 * limb, 0.14, 0.32 * limb);
    const legs = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * bodyW * 0.45, hipY, 0); add(legGeo, Mt.bottom, p); add(shoeGeo, Mt.shoe, p, 0, -legH + 0.02, 0.05); root.add(p); return p; });
    const body = add(new THREE.CylinderGeometry(bodyW * 0.78, bodyW, bodyH, 6), Mt.top, root, 0, hipY + bodyH / 2 - 0.05, 0);
    const armGeo = new THREE.CylinderGeometry(0.09 * limb, 0.075 * limb, armLen, 5); armGeo.translate(0, -armLen / 2, 0);
    const handGeo = new THREE.IcosahedronGeometry(0.1 * limb, 0);
    const shY = hipY + bodyH - 0.12;
    const hands = [];
    const arms = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * shoulder, shY, 0); p.rotation.z = s * 0.16; add(armGeo, Mt.top, p); hands.push(add(handGeo, Mt.skin, p, 0, -armLen - 0.03, 0)); root.add(p); return p; });
    if (Mt.scarf) {
        const sc = add(new THREE.TorusGeometry(bodyW * 0.72, 0.1, 4, 7), Mt.scarf, root, 0, hipY + bodyH - 0.03, 0); sc.rotation.x = Math.PI / 2;
        const tail = add(new THREE.BoxGeometry(0.16, 0.44, 0.06), Mt.scarf, root, bodyW * 0.32, hipY + bodyH - 0.27, bodyW * 0.74); tail.rotation.z = 0.12;
    }
    const head = new THREE.Group(); head.position.set(0, hipY + bodyH + headR * 0.78, 0); root.add(head);
    const hg = new THREE.IcosahedronGeometry(headR, 1); hg.scale(1.12, 0.95, 1);
    add(hg, Mt.skin, head);
    const cap = add(new THREE.SphereGeometry(headR * 1.08, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.46), Mt.hair, head, 0, headR * 0.1, -0.06); cap.scale.set(1.08, 1, 1.02); cap.rotation.x = -0.55;
    for (let i = -2; i <= 2; i++) {
        const c = add(new THREE.ConeGeometry(headR * 0.2, headR * 0.42, 4), Mt.hair, head, i * headR * 0.25, headR * 0.6, headR * 0.78 - Math.abs(i) * 0.06);
        c.rotation.x = Math.PI + 0.45; c.rotation.z = i * 0.18;
    }
    [-1, 1].forEach(sd => { const tf = add(new THREE.IcosahedronGeometry(headR * 0.42, 0), Mt.hair, head, sd * headR * 0.86, headR * 0.12, -headR * 0.12); tf.scale.set(0.62, 1.25, 1.0); });
    const ahoge = add(new THREE.TorusGeometry(headR * 0.26, headR * 0.06, 3, 5, Math.PI * 1.3), Mt.hair, head, 0, headR * 1.18, 0.02);
    ahoge.rotation.y = Math.PI / 2; ahoge.rotation.x = 0.4;
    if (o.hair === 'long') { add(new THREE.BoxGeometry(headR * 2.15, headR * 2.3, headR * 0.9), Mt.hair, head, 0, -headR * 0.45, -headR * 0.5); ahoge.visible = false; }
    if (o.hair === 'pony') {
        add(new THREE.IcosahedronGeometry(headR * 0.32, 0), Mt.hair, head, 0, headR * 0.35, -headR * 1.02);
        const t = add(new THREE.ConeGeometry(headR * 0.28, headR * 1.0, 4), Mt.hair, head, 0, -headR * 0.25, -headR * 1.15); t.rotation.x = Math.PI + 0.35; ahoge.visible = false;
    }
    const faceGeo = new THREE.PlaneGeometry(headR * 1.55, headR * 1.55);
    const faceLit = psx(o.echo
        ? new THREE.MeshBasicMaterial({ map: FACE[o.face], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false })
        : new THREE.MeshLambertMaterial({ map: FACE[o.face], emissiveMap: FACE[o.face], emissive: 0x6a6a6a, transparent: true, alphaTest: 0.5 }));
    const faceGlow = psx(new THREE.MeshBasicMaterial({ map: FACE.void, transparent: true, alphaTest: 0.5, fog: false }));
    const face = add(faceGeo, faceLit, head, 0, -headR * 0.1, headR + 0.02);
    const c = {
        group, root, head, legs, arms, hands, body, face, faceLit, faceGlow, legH, headR, mats: Mt,
        faceKind: o.face, blink: o.blink || null, blinkT: rand(1, 4), pose: 'stand', armHold: [null, null], phase: rand(0, 6), headTilt: 0,
        setFace(k) {
            this.faceKind = k;
            if (k === 'void') { face.material = faceGlow; }
            else { face.material = faceLit; faceLit.map = FACE[k]; if (faceLit.emissiveMap) faceLit.emissiveMap = FACE[k]; }
        }
    };
    return c;
}
function poseChibi(c, dt, t, moving, k = 1) {
    const f = t * 8 * k;
    let l0 = 0, l1 = 0, a0 = 0, a1 = 0, y = 0, lean = 0;
    switch (c.pose) {
        case 'sit': l0 = l1 = -1.45; y = -c.legH * 0.92; a0 = a1 = -0.45; break;
        case 'lean': lean = 0.3; a0 = a1 = -0.75 + Math.sin(t * 1.5) * 0.1; break;
        case 'point': a1 = -1.35 + Math.sin(t * 2) * 0.1; lean = 0.15; break;
        case 'build': a0 = a1 = -0.9 + Math.sin(t * 3) * 0.3; lean = 0.25; break;
        case 'crouch': l0 = -1.55; l1 = -1.2; y = -c.legH * 0.8; lean = 0.25; a0 = -0.3; a1 = -0.9; break;
        case 'reach': a1 = -1.15 + Math.sin(t * 1.2) * 0.05; break;
        case 'hunt': a0 = 0.08 + Math.sin(t * 1.3) * 0.06; a1 = 0.08 + Math.sin(t * 1.3 + 1) * 0.06; break;
    }
    if (moving) {
        l0 += Math.sin(f) * 0.62; l1 -= Math.sin(f) * 0.62;
        a0 -= Math.sin(f) * 0.5; a1 += Math.sin(f) * 0.5;
        y += Math.abs(Math.sin(f)) * 0.07;
    }
    if (c.armHold[0] !== null) a0 = c.armHold[0];
    if (c.armHold[1] !== null) a1 = c.armHold[1];
    const a = 1 - Math.exp(-14 * dt);
    c.legs[0].rotation.x = lerp(c.legs[0].rotation.x, l0, a); c.legs[1].rotation.x = lerp(c.legs[1].rotation.x, l1, a);
    c.arms[0].rotation.x = lerp(c.arms[0].rotation.x, a0, a); c.arms[1].rotation.x = lerp(c.arms[1].rotation.x, a1, a);
    c.root.position.y = lerp(c.root.position.y, y, a);
    c.root.rotation.x = lerp(c.root.rotation.x, lean, a);
    c.root.scale.y = 1 + Math.sin(t * 2.2 + c.phase) * 0.014;
    c.head.rotation.z = lerp(c.head.rotation.z, c.headTilt, a * 0.5);
    if (c.blink && c.faceKind === c.blink[0]) {
        const setMap = (k) => { c.face.material.map = FACE[k]; if (c.face.material.emissiveMap) c.face.material.emissiveMap = FACE[k]; };
        c.blinkT -= dt; if (c.blinkT < 0) { setMap(c.blink[1]); c.blinkT = rand(2, 5); setTimeout(() => { if (c.faceKind === c.blink[0]) setMap(c.blink[0]); }, 120); }
    }
}

// --- the kid (you)
const glowy = (c, k = 0.28) => lam(c, { emissive: new THREE.Color(c).multiplyScalar(k) });
const kidMats = { skin: glowy(0xffe2cc), hair: glowy(0x3a2620, 0.2), top: glowy(0x86a8f0), bottom: glowy(0x5c72c0), shoe: glowy(0xf8f8f8), scarf: glowy(0xe04040) };
const kid = makeChibi({ mats: kidMats, headR: 0.7, bodyH: 0.6, legH: 0.38, armLen: 0.52, bodyW: 0.38, shoulder: 0.36, face: 'kid', blink: ['kid', 'kid_blink'] });
scene.add(kid.group); kid.group.position.set(0, 0, 1.5);
// star night-light the kid carries in the dark
const lantern = new THREE.Group(); lantern.visible = false; lantern.position.set(0, -0.62, 0.12); kid.arms[1].add(lantern);
{ const st = new THREE.Mesh(new THREE.ShapeGeometry(starShape), new THREE.MeshBasicMaterial({ color: 0xffe08a, side: THREE.DoubleSide, fog: false })); st.scale.setScalar(1.2); lantern.add(st); }
const droppedStar = new THREE.Group(); droppedStar.visible = false; droppedStar.position.set(4.7, 0.06, 5.55); scene.add(droppedStar);
{ const st = new THREE.Mesh(new THREE.ShapeGeometry(starShape), new THREE.MeshBasicMaterial({ color: 0xffe08a, side: THREE.DoubleSide, fog: false })); st.rotation.x = -Math.PI / 2; st.scale.setScalar(1.6); droppedStar.add(st);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowWarm, color: 0xffd27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.7 })); gl.scale.set(1.4, 1.4, 1); gl.position.y = 0.2; droppedStar.add(gl); }
const lanternGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowWarm, color: 0xffd27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.8 }));
lanternGlow.scale.set(1.3, 1.3, 1); lantern.add(lanternGlow);

// --- the tall one (also you)
const ADULT_REAL = { skin: 0xe6c4a8, hair: 0x2a1d1a, top: 0x50555f, bottom: 0x2c303a, shoe: 0x77777f, scarf: 0x93403f };
const ADULT_DARK = { skin: 0x0b0b10, hair: 0x060609, top: 0x0c0c12, bottom: 0x09090d, shoe: 0x040405, scarf: 0x2a0e10 };
const adultMats = {}; Object.keys(ADULT_DARK).forEach(k => adultMats[k] = lam(ADULT_DARK[k]));
const adult = makeChibi({ mats: adultMats, headR: 0.6, bodyH: 1.2, legH: 1.05, armLen: 1.2, limb: 1.05, bodyW: 0.42, shoulder: 0.42, face: 'void', blink: ['adult', 'adult_blink'] });
adult.setFace('void'); adult.group.visible = false; scene.add(adult.group);
const adultEyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowWhite, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.35 }));
adultEyeGlow.scale.set(0.9, 0.32, 1); adultEyeGlow.position.set(0, -0.06, 0.7); adult.head.add(adultEyeGlow);
let revealK = 0;
function tintAdult(k) {
    revealK = k;
    Object.keys(ADULT_DARK).forEach(n => adultMats[n].color.set(ADULT_DARK[n]).lerp(new THREE.Color(ADULT_REAL[n]), k));
}

// --- echoes: mom and sis, made of warm light
function makeEcho(kind) {
    const mat = psx(new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    const mats = { skin: mat, hair: mat, top: mat, bottom: mat, shoe: mat };
    const opt = kind === 'mom'
        ? { headR: 0.58, bodyH: 1.15, legH: 0.95, armLen: 0.95, limb: 1.0, bodyW: 0.44, shoulder: 0.4, hair: 'long' }
        : { headR: 0.6, bodyH: 0.66, legH: 0.48, armLen: 0.56, limb: 0.95, bodyW: 0.36, shoulder: 0.33, hair: 'pony' };
    const c = makeChibi({ ...opt, mats, face: 'echo', echo: true });
    c.mat = mat; c.alpha = 0; c.target = 0; c.chill = 0; c.group.visible = false; scene.add(c.group);
    return c;
}
const mom = makeEcho('mom'), sis = makeEcho('sis');
const echoes = [mom, sis];

/* =====================================================================
   MEMORIES (act I)
   ===================================================================== */
const orbTex = glowWarm;
const MEM = {
    bed: {
        title: 'BEDTIME.TXT', at: [-2.9, -3.4], r: 2.6, orb: [-5.4, 2.6, -3.6],
        echo: [{ c: () => mom, pos: [-3.2, 0, -3.3], ry: -Math.PI / 2, pose: 'lean' }],
        lines: [
            'mom always tucked me in like a burrito. tight on the sides, so the monsters couldn\'t get in.',
            'she\'d hum the music box song. the one with no words.',
            'i always fell asleep before the end. i never found out how it ends.',
            { who: 'slip', t: 'i still can\'t fall asleep unless something is playing.' }]
    },
    desk: {
        title: 'HOMEWORK.TXT', at: [-0.7, -4.3], r: 2.3, orb: [-1.5, 3.5, -6.0],
        echo: [{ c: () => sis, pos: [-1.9, 0, -4.6], ry: Math.PI - 0.3, pose: 'point' }],
        lines: [
            '7 x 8 is the worst one. it doesn\'t even look like a real number.',
            'sis drew little hats on the hard numbers so they\'d look friendly.',
            'she said one day i\'d be good at this. i said i\'m never growing up.',
            { who: 'slip', t: 'she called again. i let it ring out. that\'s eleven.' }]
    },
    tv: {
        title: 'SATURDAY.TXT', at: [4.4, 1.0], r: 2.5, orb: [6.3, 3.4, 0.8],
        cam: { pos: [0.6, 5.8, 4.4], look: [5.0, 1.0, 0.6] },
        kidAt: { pos: [3.7, 0.55], ry: Math.PI / 2 + 0.15, pose: 'sit' },
        echo: [{ c: () => sis, pos: [3.9, 0, 1.95], ry: Math.PI / 2 - 0.1, pose: 'sit' }, { c: () => mom, pos: [5.3, 0, -0.8], ry: -0.75, pose: 'stand' }],
        onStart: () => { tvMode = 'cartoon'; },
        lines: [
            'saturday morning. cereal. cartoons. nobody had anywhere to be.',
            'everyone laughed at the same parts. even mom, and she was pretending not to watch.',
            'they cancelled it before the last episode. i never found out how that ends either.',
            { who: 'slip', t: 'i\'ve rewatched the same twelve episodes four hundred times. it\'s easier when you already know how it ends.', onShow: () => { tvMode = 'static'; } }],
        onEnd: () => { tvMode = exploredCount() >= 2 ? 'static' : 'off'; }
    },
    closet: {
        title: 'HIDE_N_SEEK.TXT', at: [4.6, 5.0], r: 2.3, orb: [5.6, 3.7, 5.0],
        onStart: () => { closetOpenTarget = 0.5; },
        lines: [
            'best hiding spot in the whole house. nobody ever found me in here.',
            'i\'d wait in the dark until everyone stopped looking. it felt like winning.',
            { who: 'slip', t: 'they stopped looking. i never came out.', onShow: () => { closetEyes.visible = true; setTimeout(() => closetEyes.visible = false, 1400); } }],
        onEnd: () => { closetOpenTarget = 0.12; }
    },
    window: {
        title: 'FIRST_SNOW.TXT', at: [4.0, -4.6], r: 2.4, orb: [4.0, 4.3, -7.2],
        cam: { pos: [3.5, 4.5, -1.0], look: [4.3, 2.6, -13] },
        echo: [{ c: () => mom, pos: [5.0, 0, -11.6], ry: -0.6, pose: 'build' }],
        onStart: () => { snowmanTarget = 1; },
        lines: [
            'first snow! mom said we could build a snowman before dinner.',
            'the snow made everything so quiet. like the whole world was holding its breath.',
            'i wished it would stay winter forever. so nothing would ever have to change.',
            { who: 'slip', t: 'it did stay winter. i made sure of it.' }]
    }
};
for (const m of Object.values(MEM)) {
    m.done = false;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: orbTex, color: 0xffe0a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    s.position.set(...m.orb); s.scale.setScalar(1.1); scene.add(s);
    m.sprite = s; m.fade = 1; m.ph = rand(0, 6);
}
const exploredCount = () => Object.values(MEM).filter(m => m.done).length;
let activeMem = null, snowmanTarget = 0, tvMode = 'off';

/* ---------- things that don't belong (act II) ---------- */
function itemMesh(kind) {
    const g = new THREE.Group();
    if (kind === 'phone') { B(0.42, 0.05, 0.8, lam(0x15161c), 0, 0.03, 0, g); const s = M(new THREE.PlaneGeometry(0.36, 0.72), new THREE.MeshBasicMaterial({ map: phoneTex, fog: false }), 0, 0.06, 0, g); s.rotation.x = -Math.PI / 2; }
    if (kind === 'card') { const s = M(new THREE.PlaneGeometry(0.8, 0.54), lam(0xffffff, { map: cardTex }), 0, 0.04, 0, g); s.rotation.x = -Math.PI / 2; }
    if (kind === 'photo') { const s = M(new THREE.PlaneGeometry(0.6, 0.7), lam(0xffffff, { map: photoTex }), 0, 0.04, 0, g); s.rotation.x = -Math.PI / 2; }
    return g;
}
const ITEMS = [
    {
        kind: 'phone', pos: [-2.5, 0, -1.0], rot: 0.5, title: 'PHONE  -  23 missed calls',
        lines: [{ who: 'adult', t: '23 missed calls. sis (19). work (3). unknown (1).' }, { who: 'adult', t: 'last outgoing call: 214 days ago.' }, { who: 'kid', t: 'whose phone is this? it\'s so thin. and it\'s freezing.', title: 'HUH.TXT' }]
    },
    {
        kind: 'card', pos: [3.0, 0, 6.3], rot: -0.3, title: 'CARD.TXT',
        lines: [{ who: 'adult', t: '"happy 30th, little bro. i found mom\'s old tapes. the music box song is on one. call me?"' }, { who: 'adult', t: 'never opened. still in the envelope.' }, { who: 'kid', t: 'who\'s turning thirty? nobody here is thirty.', title: 'HUH.TXT' }]
    },
    {
        kind: 'photo', pos: [-5.7, 0, 6.2], rot: 0.2, title: 'PHOTO.JPG',
        lines: [{ who: 'adult', t: 'a man in a dark room. he looks like he hasn\'t slept in a long time.' }, { who: 'adult', t: 'he has my cowlick. he\'s wearing my scarf.' }, { who: 'slip', t: 'why is he wearing my scarf?', title: 'HUH.TXT' }]
    }
];
ITEMS.forEach(it => {
    it.mesh = itemMesh(it.kind); it.mesh.position.set(...it.pos); it.mesh.rotation.y = it.rot; it.mesh.visible = false; scene.add(it.mesh);
    it.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowCold, color: 0x9ec4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    it.glow.position.set(it.pos[0], 0.6, it.pos[2]); it.glow.scale.setScalar(1.6); it.glow.visible = false; scene.add(it.glow);
    it.light = new THREE.PointLight(0x8fb4ff, 0, 5, 2); it.light.position.set(it.pos[0], 1.0, it.pos[2]); scene.add(it.light);
    it.got = false; it.ph = rand(0, 6);
});
let itemCount = 0;

/* ---------- particles: dust, snow-inside, breath ---------- */
const DUST_N = 60, dustGeo = new THREE.BufferGeometry(), dustPos = new Float32Array(DUST_N * 3);
for (let i = 0; i < DUST_N; i++) { dustPos[i * 3] = rand(-7, 7); dustPos[i * 3 + 1] = rand(0.5, 7); dustPos[i * 3 + 2] = rand(-7, 7); }
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustMat = new THREE.PointsMaterial({ size: 0.05, color: 0xffd9a0, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; scene.add(dust);
const ISNOW_N = 160, isnowGeo = new THREE.BufferGeometry(), isnowPos = new Float32Array(ISNOW_N * 3);
for (let i = 0; i < ISNOW_N; i++) { isnowPos[i * 3] = rand(-7.5, 7.5); isnowPos[i * 3 + 1] = rand(0, 8); isnowPos[i * 3 + 2] = rand(-7.5, 7.5); }
isnowGeo.setAttribute('position', new THREE.BufferAttribute(isnowPos, 3));
const isnowMat = new THREE.PointsMaterial({ size: 0.06, color: 0xdfeaff, transparent: true, opacity: 0, depthWrite: false, fog: false });
const isnow = new THREE.Points(isnowGeo, isnowMat); isnow.frustumCulled = false; scene.add(isnow);
const puffs = Array.from({ length: 6 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowWhite, transparent: true, depthWrite: false, opacity: 0, fog: false })); s.visible = false; scene.add(s); return { s, life: 0 }; });
let puffTimer = 0;

/* =====================================================================
   GAME STATE + ATMOSPHERE TARGETS
   ===================================================================== */
let state = 'LOGIN';
let player = kid;
let isInteracting = false, focus = null, lastLabel = '';
let glitch = 0, shake = 0, pulse = 0, flashV = 0, fadeV = 0;
let cutscene = null;
let stamina = 1;
let lurkerOn = false, lurkerTimer = 0, lurkerOutside = 0;
let lungeTimer = 8, whisperCd = 5, heartTimer = 0, stepTimer = 0, ringTimer = 0, knockTimer = 6, adultStepT = 0;
let nextFlick = 4, flickUntil = 0;
let pendantDead = false, ringing = false, holding = false, blindsOpen = false, realityTime = 0, askedLogin = false;
let camOverride = null;
const keys = {};

const T = {}, cur = {};
function retarget() {
    const n = exploredCount();
    Object.assign(T, { amb: 1, ceil: 1, lamp: 1, tv: 0, win: 1, lantern: 0, door: 0, sun: 0, lights: 1, kidglow: 0, fogFar: 44, dread: 0, cold: 0, warm: 1, vig: 0.15, real: 0, expo: 1 });
    if (['LOGIN', 'INTRO', 'EXPLORE'].includes(state)) {
        const k = n / 5;
        Object.assign(T, { cold: k * 0.55, dread: k * 0.5, ceil: 1 - k * 0.5, amb: 1 - k * 0.45, lamp: 1 - k * 0.5, lights: 1 - k * 0.55, warm: 1 - k * 0.9, vig: 0.15 + k * 0.3, fogFar: 44 - k * 12 });
    } else if (['NIGHT_IN', 'STALK_INTRO', 'STALK', 'CAUGHT', 'CALL'].includes(state)) {
        Object.assign(T, { ceil: 0, amb: 0.16, lamp: 0, lights: 0, lantern: 1, win: 0.8, cold: 0.85, dread: 0.85, warm: 0, vig: 0.65, fogFar: 26 });
        if (state === 'NIGHT_IN' || state === 'STALK_INTRO') T.lantern = state === 'STALK_INTRO' ? 0.6 : 0;
        if (state === 'CALL') Object.assign(T, { dread: 0.95, lantern: 0.5 });
    } else if (state === 'HIDE') {
        Object.assign(T, { ceil: 0, amb: 0.08, lamp: 0, lights: 0, lantern: 0.35, win: 0.5, cold: 1, dread: 1, warm: 0, vig: 0.85, fogFar: 22 });
    } else if (state === 'CLOSET') {
        Object.assign(T, { ceil: 0, amb: 0.14, lamp: 0, lights: 0, lantern: 0, win: 0.4, cold: 0.9, dread: 0.7, warm: 0, vig: 1.0, fogFar: 24 });
    } else { // REALITY / ENDED
        Object.assign(T, { ceil: 0, amb: 0.72, lamp: 0, lights: 0, win: 0.25, door: 1, kidglow: 1, cold: 0.45, dread: 0.15, warm: 0, vig: 0.4, real: 1, fogFar: 40 });
        if (blindsOpen) Object.assign(T, { sun: 1, cold: 0.05, warm: 0.65, amb: 0.95, vig: 0.22, real: 0.5, win: 0 });
    }
}
retarget(); Object.assign(cur, T);

/* =====================================================================
   UI: HUD, toasts, balloons, taskbar, clock
   ===================================================================== */
const ui = $('ui-layer');
function setChapter(t) { $('chapter').textContent = t; }
function setObjective(t) { $('objective').textContent = t ? '> ' + t : ''; }
function toast(txt, ms = 3200, kind = '') {
    const t = $('toast'); t.textContent = txt; t.className = kind; void t.offsetWidth; t.classList.add('show');
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), ms);
}
function balloon(title, text, ms = 7000, warn = false) {
    const b = $('balloon'); b.querySelector('b').textContent = title; b.querySelector('span').textContent = text;
    b.classList.toggle('warn', warn); b.classList.add('show'); Sfx.blip();
    clearTimeout(balloon.h); balloon.h = setTimeout(() => b.classList.remove('show'), ms);
}
$('balloon').querySelector('.x').addEventListener('click', () => $('balloon').classList.remove('show'));
const setFlash = (v) => { flashV = Math.max(flashV, v); };
const kick = (g = 0.6, s = 0.25) => { glitch = Math.max(glitch, g); shake = Math.max(shake, s); };

function setTask(title) {
    $('tasks').innerHTML = `<div class="task ${title ? '' : 'active'}"><i class="ic ic-q"></i>memory.exe</div>` + (title ? `<div class="task active"><i class="ic ic-note"></i>${esc(title)}</div>` : '');
}
setTask(null);
let clockMode = 'fixed', clockMin = 19 * 60 + 42, clockSpin = 0;
function fmtClock(mins) { mins = ((Math.round(mins) % 1440) + 1440) % 1440; const h = Math.floor(mins / 60), m = mins % 60; return `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; }
function setClock(h, m) { clockMode = 'fixed'; clockMin = h * 60 + m; $('clock').textContent = fmtClock(clockMin); $('clock').classList.remove('glitch'); }
function realClock() { clockMode = 'real'; $('clock').classList.remove('glitch'); }

/* ---------- XP windows: notes, dialogs ---------- */
const GLYPHS = '!@#$%&*?01#'.split('');
const corrupt = (str, amt) => amt <= 0 ? str : str.split('').map(c => (c !== ' ' && Math.random() < amt) ? pick(GLYPHS) : c).join('');
const tbHTML = (title, ico, cls = true) => `<div class="tb"><i class="ic ${ico}"></i><span class="tt">${esc(title)}</span><span class="tbtn">_</span><span class="tbtn">&#9633;</span><span class="tbtn ${cls ? 'cls' : ''}">&#10005;</span></div>`;

let logQ = [], logDone = null, logDef = {}, activeLog = null;
function playNote() { if (extOK.note) { ext.note.currentTime = 0; ext.note.play().catch(() => Sfx.blip()); } else Sfx.blip(); }
function say(list, onDone, def = {}) {
    logQ = list.map(x => typeof x === 'string' ? { t: x } : x); logDone = onDone || null; logDef = def;
    isInteracting = true; hidePrompt(); nextLog();
}
const sayP = (list, def) => new Promise(r => say(list, r, def));
function nextLog() {
    if (!logQ.length) { activeLog = null; isInteracting = false; setTask(null); const cb = logDone; logDone = null; if (cb) cb(); return; }
    showLog({ ...logDef, ...logQ.shift() });
}
function showLog(it) {
    const who = it.who || 'kid';
    const dlg = ['room', 'slip', 'info'].includes(who);
    const theme = { adult: 'silver', real: 'silver', room: 'olive', slip: 'red' }[who] || '';
    const win = document.createElement('div');
    win.className = `xpwin ${dlg ? 'dlg' : 'log-win'} ${theme}`;
    let title = it.title || 'untitled';
    if (who === 'slip') title = corrupt(it.slipTitle || 'memory.exe', 0.12);
    const scramble = ['EXPLORE', 'STALK'].includes(state) ? cur.dread : 0;
    if (who === 'kid') title = corrupt(title, scramble * 0.15);
    const btns = it.btns || ['OK'];
    if (dlg) {
        const ico = who === 'slip' ? 'err' : (it.icon || 'q');
        win.innerHTML = tbHTML(title, who === 'slip' ? 'ic-err' : 'ic-q') +
            `<div class="dbody"><div class="big-ico ${ico}"></div><p></p></div><div class="dbtns">${btns.map((b, i) => `<button class="xpbtn ${i === (it.focus || 0) ? 'focus' : ''}">${esc(b)}</button>`).join('')}</div>`;
    } else {
        win.innerHTML = tbHTML(`${title} - Notepad`, 'ic-note') +
            `<div class="menubar"><span>File</span><span>Edit</span><span>Format</span><span>View</span><span>Help</span></div>` +
            `<div class="np-body"><span class="tx"></span><span class="caret"></span></div><div class="np-foot"><span class="ln"></span><span>E / click &#9656;</span></div>`;
    }
    if (innerWidth > 700) { win.style.marginLeft = rand(-26, 26) + 'px'; win.style.marginTop = rand(0, 26) + 'px'; }
    if (who === 'kid' && cur.dread > 0.6) win.classList.add('dim');
    ui.appendChild(win);
    setTask(dlg ? title : `${title} - Notepad`);
    const tx = win.querySelector(dlg ? 'p' : '.tx');
    if (who === 'slip' || it.glitch) tx.classList.add('glitch-text');
    const full = who === 'kid' ? corrupt(it.t, scramble * 0.02) : it.t;
    const ln = win.querySelector('.ln'); if (ln) ln.textContent = `Ln 1, Col ${full.length + 1}`;
    let i = 0, typing = true;
    const iv = setInterval(() => { i++; tx.textContent = full.slice(0, i); if (i % 3 === 0) Sfx.tick(); if (i >= full.length) { typing = false; clearInterval(iv); } }, it.speed || 24);
    const finish = () => { clearInterval(iv); typing = false; tx.textContent = full; };
    const close = (choice) => {
        if (activeLog !== log) return;
        activeLog = null; finish(); win.classList.add('closing'); setTimeout(() => win.remove(), 150);
        if (it.onChoose) it.onChoose(choice);
        nextLog();
    };
    const log = {
        advance() { if (typing) { finish(); return; } close(dlg ? (it.focus || 0) : 0); }
    };
    activeLog = log;
    win.querySelectorAll('.xpbtn').forEach((b, bi) => b.addEventListener('click', (e) => { e.stopPropagation(); close(bi); }));
    win.querySelector('.cls').addEventListener('click', (e) => { e.stopPropagation(); if (typing) finish(); else close(dlg ? (it.focus || 0) : 0); });
    win.addEventListener('click', () => { if (activeLog !== log) return; if (typing) finish(); else if (!dlg) close(0); });
    playNote();
    if (who === 'slip') { kick(0.5, 0.12); Sfx.stinger(0.3); }
    if (it.onShow) it.onShow();
}
function spamWindow(text, opts = {}) {
    const win = document.createElement('div');
    win.className = `xpwin dlg spam ${opts.theme || 'red'}`;
    win.innerHTML = tbHTML(opts.title || 'memory.exe', opts.theme === 'olive' ? 'ic-q' : 'ic-err') +
        `<div class="dbody"><div class="big-ico ${opts.icon || 'err'}"></div><p>${esc(text)}</p></div><div class="dbtns">${(opts.btns || ['OK']).map(b => `<button class="xpbtn">${esc(b)}</button>`).join('')}</div>`;
    const w = Math.min(430, innerWidth * 0.9);
    win.style.left = (Math.random() * Math.max(10, innerWidth - w)) + 'px'; win.style.top = (Math.random() * Math.max(10, innerHeight - 260)) + 'px';
    if (opts.scale) win.style.transform = `scale(${opts.scale})`;
    ui.appendChild(win); playNote(); return win;
}

/* ---------- black screen ---------- */
const bs = $('black-screen');
function showBlack(text, dawn = false) { bs.classList.toggle('dawn', dawn); $('ending-text').textContent = text; $('ending-text').className = ''; bs.classList.add('show'); }
function hideBlack() { bs.classList.remove('show'); }

/* =====================================================================
   INPUT
   ===================================================================== */
addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase(); keys[k] = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (['e', ' ', 'enter'].includes(k) && !e.repeat) {
        if (state === 'LOGIN') return;
        if (activeLog) activeLog.advance(); else tryInteract();
    }
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const interactBtn = $('interact-btn');
interactBtn.addEventListener('click', (e) => { e.stopPropagation(); tryInteract(); });

const joy = { active: false, id: null, ox: 0, oy: 0, x: 0, z: 0 };
const joyEl = $('joy'), joyKnob = joyEl.firstElementChild;
container.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    joy.active = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.z = 0;
    joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; joyEl.style.display = 'block'; joyKnob.style.transform = '';
});
addEventListener('pointermove', (e) => {
    if (!joy.active || e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy), m = 50;
    if (d > m) { dx *= m / d; dy *= m / d; }
    joy.x = dx / m; joy.z = dy / m; joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
});
const joyEnd = (e) => { if (e.pointerId !== joy.id) return; joy.active = false; joy.x = joy.z = 0; joyEl.style.display = 'none'; };
addEventListener('pointerup', joyEnd); addEventListener('pointercancel', joyEnd);

function hidePrompt() { interactBtn.classList.remove('show'); focus = null; lastLabel = ''; }

function updateFocus() {
    let f = null;
    if (!isInteracting && !cutscene) {
        const p = player.group.position;
        const d = (x, z) => Math.hypot(p.x - x, p.z - z);
        let best = 1e9;
        const consider = (dist, r, obj) => { if (dist < r && dist < best) { best = dist; f = obj; } };
        if (state === 'EXPLORE') {
            for (const [k, m] of Object.entries(MEM)) if (!m.done) consider(d(m.at[0], m.at[1]), m.r, { kind: 'memory', key: k, label: 'remember' });
        } else if (state === 'STALK' && ringing) consider(d(-0.4, -4.4), 2.6, { kind: 'call', label: 'answer the computer' });
        else if (state === 'HIDE') consider(d(4.9, 5.0), 2.2, { kind: 'hide', label: 'hide' });
        else if (state === 'REALITY') {
            if (!holding) consider(d(kid.group.position.x, kid.group.position.z), 2.3, { kind: 'hand', label: 'take his hand' });
            if (!blindsOpen) consider(d(4, -5.3), 2.6, { kind: 'blinds', label: 'open the blinds' });
            consider(d(-6.6, 0.5), 2.0, { kind: 'drawing', label: 'look at the drawing' });
            consider(d(0, -4.5), 2.2, { kind: 'laptop', label: 'log back in' });
            consider(d(-3.0, -4.5), 1.8, { kind: 'bed', label: 'lie down. five more minutes.' });
            consider(d(6.6, -4.5), 2.3, { kind: 'door', label: 'open the door' });
        }
    }
    focus = f;
    if (f) { if (lastLabel !== f.label) { interactBtn.innerHTML = `<kbd>E</kbd>${esc(f.label)}`; lastLabel = f.label; } interactBtn.classList.add('show'); }
    else { interactBtn.classList.remove('show'); lastLabel = ''; }
}

function tryInteract() {
    if (isInteracting || !focus || cutscene) return;
    const f = focus; hidePrompt();
    switch (f.kind) {
        case 'memory': startMemory(f.key); break;
        case 'call': startCall(); break;
        case 'hide': startCloset(); break;
        case 'hand': takeHand(); break;
        case 'blinds': openBlinds(); break;
        case 'drawing': say([{ who: 'real', t: 'MY FAMLY. he spelled it wrong. mom kept it on the fridge for a whole year anyway.' }, { who: 'real', t: 'it\'s still here. it\'s faded, but it\'s still here.' }], null, { title: 'drawing.jpg' }); break;
        case 'laptop': endingLoop(); break;
        case 'bed': endingLoop(true); break;
        case 'door': holding ? endingCarpe() : endingWake(); break;
    }
}

/* =====================================================================
   LOGIN SCREEN
   ===================================================================== */
function avatar(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    if (kind === 'kid') {
        const gr = g.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, '#9fd2ff'); gr.addColorStop(1, '#f6d9b0'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
        R(g, '#d23c3c', 6, 27, 20, 5); R(g, '#ffe0c8', 5, 7, 22, 21); R(g, '#2a1d1a', 4, 4, 24, 7); R(g, '#2a1d1a', 4, 6, 3, 9); R(g, '#2a1d1a', 25, 6, 3, 9);
        R(g, '#2a1d1a', 15, 1, 2, 3); R(g, '#2a1d1a', 17, 0, 2, 2);
        g.save(); g.translate(0, 2); drawFaceInto(g, 'kid'); g.restore();
    } else {
        R(g, '#8a95b0', 0, 0, 32, 32); R(g, '#3a3e4a', 7, 24, 18, 8); R(g, '#222630', 8, 6, 16, 18); R(g, '#222630', 15, 2, 2, 4); R(g, '#222630', 17, 1, 2, 2);
        g.fillStyle = '#c8d0e0'; g.font = 'bold 12px monospace'; g.fillText('?', 13, 20);
    }
    return c;
}
function drawFaceInto(g, kind) { const c = document.createElement('canvas'); c.width = c.height = 32; drawFace(c.getContext('2d'), kind); g.drawImage(c, 0, 0); }

function buildLogin() {
    const users = $('users'); users.innerHTML = '';
    const mk = (kind, name, sub, locked) => {
        const u = document.createElement('div'); u.className = 'user' + (locked ? ' locked' : '');
        u.appendChild(avatar(kind)); const tx = document.createElement('div'); tx.innerHTML = `<div class="nm">${esc(name)}</div><div class="sub">${esc(sub)}</div>`; u.appendChild(tx);
        users.appendChild(u); return u;
    };
    const kidU = mk('kid', 'kiddo', LOOPS ? `logged in ${LOOPS + 1} times` : 'age 8 · december 2004', false);
    const youU = mk('you', 'you', LOOPS ? `password hint: today` : 'this account is locked', true);
    kidU.addEventListener('click', login);
    youU.addEventListener('click', () => {
        youU.classList.remove('shake'); void youU.offsetWidth; youU.classList.add('shake'); Sfx.init(); Sfx.blip();
        loginDialog('This account is locked.', LOOPS ? 'Password hint: it only happens once.' : 'You have to remember everything first.');
    });
    $('power').onclick = () => { Sfx.init(); Sfx.blip(); loginDialog('Turn off memory', 'You can\'t turn it off. You can only wake up.'); };
}
function loginDialog(title, text) {
    const host = $('login-dialog'); host.innerHTML = '';
    const win = document.createElement('div'); win.className = 'xpwin dlg';
    win.innerHTML = tbHTML(title, 'ic-q') + `<div class="dbody"><div class="big-ico info"></div><p>${esc(text)}</p></div><div class="dbtns"><button class="xpbtn focus">OK</button></div>`;
    host.appendChild(win);
    const close = () => win.remove(); win.querySelector('.xpbtn').onclick = close; win.querySelector('.cls').onclick = close;
}
buildLogin();

async function login() {
    if (state !== 'LOGIN') return;
    state = 'BOOT';
    Sfx.init(); Sfx.startup();
    $('login-dialog').innerHTML = '';
    $('login').classList.add('welcome');
    $('welcome-sub').textContent = LOOPS ? 'restoring your previous session...' : 'loading your personal memories...';
    await wait(2600);
    $('login').classList.add('hide');
    $('taskbar').classList.add('show');
    setChapter('i · evening'); state = 'INTRO'; retarget();
    await wait(1400);
    playExt('norm');
    const intro = LOOPS > 0 ? [
        '...mom?',
        'i had the dream again. the grey one, where i\'m big and everything is quiet.',
        { who: 'slip', t: `this is the ${ordinal(LOOPS + 1)} time you've woken up here.` },
        'doesn\'t matter. it\'s warm. it\'s always warm here.'
    ] : [
        '...mom? i had the weirdest dream.',
        'i was big. like, grown-up big. and everything was grey and really, really quiet.',
        'doesn\'t matter. i\'m home. the lights are on. it\'s almost christmas.',
        'i want to remember everything.'
    ];
    await sayP(intro, { title: 'WAKE_UP.TXT' });
    state = 'EXPLORE'; retarget();
    setObjective('remember (0/5)');
    balloon('New memories found', '5 memories are waiting in this room. Walk up to the glowing ones and press E.');
}

/* =====================================================================
   ACT I — EVENING
   ===================================================================== */
function startMemory(key) {
    const m = MEM[key]; if (m.done) return;
    m.done = true; activeMem = m; retarget();
    if (m.onStart) m.onStart();
    if (m.kidAt) { kid.group.position.set(m.kidAt.pos[0], 0, m.kidAt.pos[1]); kid.group.rotation.y = m.kidAt.ry; kid.pose = m.kidAt.pose; }
    (m.echo || []).forEach(e => { const c = e.c(); c.group.position.set(...e.pos); c.group.rotation.y = e.ry; c.pose = e.pose; c.target = 1; c.chill = 0; c.group.visible = true; });
    const lines = m.lines.map(l => {
        const o = typeof l === 'string' ? { t: l } : { ...l };
        if (o.who === 'slip') { const prev = o.onShow; o.onShow = () => { echoes.forEach(c => { if (c.target > 0) c.chill = 1; }); if (prev) prev(); }; }
        return o;
    });
    say(lines, () => {
        echoes.forEach(c => c.target = 0);
        activeMem = null; kid.pose = 'stand'; if (m.onEnd) m.onEnd();
        afterMemory(exploredCount());
    }, { title: m.title, who: 'kid' });
}

function afterMemory(n) {
    setObjective(`remember (${n}/5)`);
    if (n === 1) { Sfx.whisper(); kick(0.3, 0.05); setTimeout(() => { setClock(21, 58); toast('...wasn\'t it 7:42 a second ago?', 3200); }, 800); }
    if (n === 2) {
        if (tvMode === 'off') tvMode = 'static';
        closetOpenTarget = Math.max(closetOpenTarget, 0.18); Sfx.creak(); kick(0.5, 0.12);
        setTimeout(() => toast(tvMode === 'static' ? 'the tv turned itself on.' : 'the closet creaked open.', 3200), 600);
    }
    if (n === 3) {
        setClock(3, 0); $('clock').classList.add('glitch'); clockMode = 'spin';
        lurkerOn = true; lurkerOutside = 14; placeLurker(true);
        Sfx.stinger(0.5); kick(0.7, 0.2);
        setTimeout(() => toast('someone is standing outside in the snow.', 3600, 'slip'), 500);
        flipCalendar();
    }
    if (n === 4) {
        Sfx.stinger(0.7); kick(0.9, 0.3); tvMode = 'stay'; isInteracting = true; hidePrompt();
        setTimeout(() => say([{
            who: 'room', title: 'memory.exe', t: 'You have been here for a very long time. Would you like to stay?', btns: ['Yes', 'Yes'],
            onChoose: () => { setTimeout(() => toast('good.', 2400, 'slip'), 300); }
        }]), 900);
    }
    if (n >= 5) { startNight(); return; }
    retarget();
}

async function flipCalendar() {
    let m = 11, y = 2004;
    for (let i = 0; i < 26; i++) { m++; if (m > 11) { m = 0; y++; } drawCalendar(m, y, 0, 0); await wait(90); }
    const g = calTex.userData.g; R(g, '#c0392b', 0, 0, 48, 14); g.fillStyle = '#fff'; g.font = 'bold 9px monospace'; g.fillText('???', 3, 11); calTex.needsUpdate = true;
}

const LURK_SPOTS = [[-6.6, 6.8], [6.4, -6.9], [-2.6, 7.0], [-1.0, -2.0], [5.2, 7.0]];
function placeLurker(outsideSpot = false) {
    adult.group.visible = true; adult.setFace('void'); adult.pose = 'hunt'; adult.headTilt = 0.32; lurkerTimer = 0;
    if (outsideSpot) { adult.group.position.set(7.6, 0, -14.4); adult.group.rotation.y = 0.2; return; }
    const p = player.group.position; let best = LURK_SPOTS[0], bd = -1;
    for (const s of LURK_SPOTS) { const d = Math.hypot(s[0] - p.x, s[1] - p.z); if (d > bd && d < 13) { bd = d; best = s; } }
    adult.group.position.set(best[0], 0, best[1]);
}

/* =====================================================================
   ACT II — NIGHT
   ===================================================================== */
async function startNight() {
    state = 'NIGHT_IN'; isInteracting = true; hidePrompt(); setObjective(''); lurkerOn = false; adult.group.visible = false;
    Sfx.stopSong(); stopExt('norm'); tvMode = 'off';
    await wait(1200);
    for (let i = 0; i < bulbs.length; i++) { bulbs[i].dead = true; if (i % 4 === 0) Sfx.pop(); await wait(38); }
    Sfx.pop(); Sfx.boom(); pendantDead = true; kick(1, 0.45); setFlash(0.6);
    retarget();
    $('taskbar').classList.add('dead'); setClock(3, 0); setChapter('ii · night');
    drawMonitor('off');
    await wait(1800);
    await sayP(['...', 'mom?', 'the lights went out. all of them at once.'], { title: 'DARK.TXT' });
    state = 'STALK_INTRO'; retarget(); lantern.visible = true; kid.armHold[1] = -0.9;
    await sayP(['good thing i still have my star light.'], { title: 'DARK.TXT' });
    isInteracting = true;
    doorTarget = -1.3; Sfx.creak();
    adult.group.visible = true; adult.setFace('void'); adult.pose = 'hunt'; adult.headTilt = 0.32;
    adult.group.position.set(10.2, 0, -4.5); adult.group.rotation.y = -Math.PI / 2;
    cutsceneActor = { c: adult, x: 6.6, z: -4.5, speed: 1.1 };
    await wait(3600);
    await sayP([{ who: 'slip', t: 'someone came in.' }]);
    await sayP([{ who: 'room', title: 'memory.exe', t: 'Some things in this room do not belong here. Find them and hide them, and the room can stay warm forever.', btns: ['OK'] }]);
    startStalk();
}
let cutsceneActor = null;

function startStalk() {
    state = 'STALK'; retarget(); cutsceneActor = null; isInteracting = false;
    ITEMS.forEach(it => { if (!it.got) { it.mesh.visible = true; it.glow.visible = true; } });
    playExt('scary');
    lungeTimer = 8; whisperCd = 6; stamina = 1; $('stamina').classList.add('show');
    setObjective(`hide the things that don't belong (${itemCount}/3)`);
    balloon('It is in the room', 'Hold SHIFT to run (on touch: drag far). Don\'t let it reach you.', 7000, true);
}

function collectItem(it) {
    it.got = true; it.mesh.visible = false; it.glow.visible = false; it.light.intensity = 0;
    itemCount++; Sfx.chime(); setFlash(0.25); kick(0.4, 0.1);
    say(it.lines, () => {
        if (itemCount >= 3) {
            ringing = true; ringTimer = 0; drawMonitor('ring', 0);
            setObjective('the computer is ringing. answer it.');
            balloon('Incoming call', 'sis <3 wants to start a conversation.', 6000);
        } else setObjective(`hide the things that don't belong (${itemCount}/3)`);
    }, { title: it.title });
}

function caught() {
    if (state === 'CAUGHT') return;
    const prev = state; state = 'CAUGHT'; Sfx.boom(); Sfx.stinger(1); setFlash(1); kick(1, 0.6); hidePrompt();
    setTimeout(() => showBlack(prev === 'HIDE' ? 'not like this.' : 'not yet.'), 220);
    setTimeout(() => { $('ending-text').textContent = 'it was too bright out there.'; }, 1300);
    setTimeout(() => {
        hideBlack(); kid.group.position.set(-1, 0, 2.5); stamina = 1;
        adult.group.position.set(6.8, 0, -4.5); lungeTimer = 9; state = prev; retarget();
        toast('it keeps coming back.', 2500, 'slip');
    }, 3000);
}

/* ---------- the call ---------- */
async function startCall() {
    state = 'CALL'; ringing = false; isInteracting = true; hidePrompt(); setObjective(''); retarget();
    $('stamina').classList.remove('show');
    cutscene = { x: -0.4, z: -4.45, face: Math.PI };
    drawMonitor('msn', 0); monitorMode = 'msn';
    await wait(2200);
    await runChat();
    monitorMode = 'lost'; drawMonitor('lost'); $('net-ico').classList.add('off'); kick(1, 0.4); Sfx.whisper();
    const pleas = ['Nothing has to change.', 'It\'s warm here. You remember warm.', 'Nobody is waiting for you out there.', 'You\'ll be cold.', 'STAY.'];
    for (const p of pleas) {
        const w = spamWindow(p, { theme: 'olive', icon: 'q', title: 'memory.exe', btns: ['Yes', 'Yes'] });
        w.style.left = (innerWidth / 2 - 215 + rand(-160, 160)) + 'px'; w.style.top = (innerHeight * 0.22 + rand(-40, 120)) + 'px';
        kick(0.7, 0.2); Sfx.heart(1); await wait(1300);
    }
    $('taskbar').classList.add('red');
    for (let i = 0; i < 28; i++) {
        const g = 'STAY STAY WARM DONT GO STAY'.split('').map(c => Math.random() > 0.45 ? c : pick(GLYPHS)).join('');
        spamWindow(g, { scale: rand(0.6, 1.5) }); kick(1, 0.45); if (i % 4 === 0) { setFlash(0.5); Sfx.heart(1); }
        await wait(110);
    }
    stopExt('scary'); ui.innerHTML = ''; $('taskbar').classList.remove('red');
    showBlack('...');
    await wait(1800); $('ending-text').textContent = 'you know what to do.'; await wait(2600);
    $('ending-text').textContent = 'you were always good at hiding.'; await wait(2800);
    hideBlack(); cutscene = null;
    startHide();
}

function runChat() {
    return new Promise(done => {
        const win = document.createElement('div'); win.className = 'xpwin msn';
        win.innerHTML = tbHTML('sis <3 - Conversation', 'ic-msn') +
            `<div class="msn-head"><div class="buddy"></div><div><b>sis &lt;3</b><br>To: kiddo &lt;kiddo@memos.net&gt;</div></div>` +
            `<div class="msn-log"></div><div class="msn-status"></div><div class="msn-input"></div>`;
        ui.appendChild(win); setTask('sis <3 - Conversation');
        const log = win.querySelector('.msn-log'), status = win.querySelector('.msn-status'), input = win.querySelector('.msn-input');
        const lines = [
            ['sis', 'hey'],
            ['sis', 'it\'s me. i know you\'re in there. i can see your light under the door.'],
            ['you', 'who is this?'],
            ['sis', 'it\'s your sister, dummy.'],
            ['you', 'my sister is eleven. she\'s downstairs.'],
            ['sis', '...i\'m 33.'],
            ['sis', 'you haven\'t answered in three weeks. i\'m sitting outside your door.'],
            ['sis', 'i found mom\'s old tapes. the music box song is on one of them. the whole thing.'],
            ['sis', 'it has an ending. it\'s really pretty.'],
            ['you', 'i don\'t want it to end.'],
            ['sis', 'i know. me neither. but it already did. and we\'re still here.'],
            ['sis', 'please open the door.'],
            ['room', 'don\'t. it\'s warm in here. nothing has to change.'],
            ['sys', 'sis <3 may not reply because you appear to be offline.']
        ];
        let i = 0;
        const add = (who, txt) => {
            const d = document.createElement('div'); d.className = 'msn-line ' + who;
            const name = { sis: 'sis <3 says:', you: 'kiddo says:', room: 'memory.exe says:', sys: '' }[who];
            d.innerHTML = (name ? `<span class="n">${esc(name)}</span>` : '') + `<span class="m">${esc(txt)}</span>`;
            log.appendChild(d); log.scrollTop = log.scrollHeight;
        };
        const next = async () => {
            if (i >= lines.length) { await wait(2200); win.remove(); setTask(null); done(); return; }
            const [who, txt] = lines[i++];
            if (who === 'you') {
                for (let k = 1; k <= txt.length; k++) { input.textContent = txt.slice(0, k); Sfx.tick(); await wait(55); }
                await wait(350); input.textContent = ''; add('you', txt); Sfx.blip(); await wait(1500);
            } else if (who === 'sis') {
                status.textContent = 'sis <3 is typing a message...'; await wait(900 + txt.length * 22);
                status.textContent = ''; add('sis', txt); Sfx.ding(); await wait(1500 + txt.length * 18);
            } else if (who === 'room') {
                kick(1, 0.35); Sfx.stinger(0.6); add('room', txt); win.classList.add('wshake'); await wait(2600); win.classList.remove('wshake');
            } else { add('sys', txt); await wait(1600); }
            next();
        };
        next();
    });
}

/* =====================================================================
   ACT III — HIDE
   ===================================================================== */
function startHide() {
    state = 'HIDE'; retarget(); isInteracting = false; setChapter('iii · hide');
    $('taskbar').classList.remove('dead');
    lantern.visible = true; kid.armHold[1] = -0.9;
    kid.group.position.set(-0.4, 0, -3.6); kid.group.rotation.y = 0;
    adult.group.visible = true; adult.group.position.set(-1.5, 0, 3.5); adult.pose = 'hunt'; adult.headTilt = 0.32;
    closetOpenTarget = 0.4; closetGlowOn = true;
    setObjective('hide.');
    toast('it\'s between you and the closet.', 3200, 'slip');
}
let closetGlowOn = false;

async function startCloset() {
    state = 'CLOSET'; isInteracting = true; hidePrompt(); setObjective(''); retarget();
    closetGlowOn = false; kid.group.visible = false; lantern.visible = false; droppedStar.visible = true;
    closetOpenTarget = 0.07; Sfx.creak();
    adult.group.position.set(-0.5, 0, 2.5); adult.group.visible = true; adult.pose = 'hunt'; adult.headTilt = 0.32;
    camOverride = { pos: new THREE.Vector3(7.35, 2.3, 5.75), look: new THREE.Vector3(0, 1.55, 5.75), fov: 52 };
    await wait(1500);
    await sayP(['shh. shh. nobody ever finds me in here.'], { title: 'HIDE_N_SEEK.TXT' });
    isInteracting = true;
    // footsteps. it walks right up to the door.
    cutsceneActor = { c: adult, x: 3.5, z: 5.75, speed: 0.75, steps: true };
    for (let w = 0; w < 120 && Math.hypot(adult.group.position.x - 3.5, adult.group.position.z - 5.75) > 0.1; w++) await wait(100);
    cutsceneActor = null; adult.group.position.set(3.5, 0, 5.75); adult.group.rotation.y = Math.PI / 2;
    await wait(1600);
    Sfx.knock(); kick(0.3, 0.1); await wait(1800);
    closetOpenTarget = 1.25; Sfx.creak(); await wait(1500);
    adult.pose = 'crouch'; adult.headTilt = 0; faceLightOn = 0.6;
    await wait(1200);
    const A = (t, extra = {}) => ({ who: 'adult', title: '???', t, ...extra });
    const K = (t) => ({ who: 'kid', title: 'HIDE_N_SEEK.TXT', t });
    await sayP([
        A('found you.'),
        K('...you\'re not supposed to find me. nobody ever finds me in here.'),
        A('i know. it\'s the best spot in the whole house.'),
        A('i used to wait in here until everyone stopped looking.'),
        K('...used to?'),
        A('hey, kiddo.', { onShow: () => { revealStart = true; } }),
    ]);
    await wait(400);
    await sayP([
        A('it\'s me. it\'s you.', { title: 'you' }),
        K('you\'re old. you look really tired.'),
        A('yeah. i haven\'t been sleeping. i keep coming back here instead.', { title: 'you' }),
        A('this room is the last place where nothing had changed yet. mom was here. the snow was still magic.', { title: 'you' }),
        K('then stay! we can both stay. it\'s warm here.'),
        A('i tried. for a really long time. it isn\'t warm anymore. look around.', { title: 'you' }),
        A('if i stay here with you, you never get to grow up. and i never get to live.', { title: 'you' }),
        A('i wasn\'t chasing you to hurt you. i was trying to reach you. to bring you with me.', { title: 'you' }),
        K('...will it be warm out there?'),
        A('no. not always. but it\'ll be real. and it\'ll be today.', { title: 'you' }),
        K('...okay. can you hold my hand? it\'s dark.'),
    ]);
    adult.pose = 'reach';
    await wait(1600);
    setFlash(1); Sfx.pad([261.63, 329.63, 392]);
    showBlack('');
    await wait(1600);
    $('ending-text').textContent = 'the snow stopped.'; await wait(2600);
    $('ending-text').textContent = 'you open your eyes.'; await wait(2600);
    setReality();
    hideBlack();
}
let revealStart = false, faceLightOn = 0;

/* =====================================================================
   ACT IV — TODAY
   ===================================================================== */
function setReality() {
    state = 'REALITY'; camOverride = null; cutscene = null; cutsceneActor = null; isInteracting = true; droppedStar.visible = false;
    setChapter('iv · today'); $('taskbar').classList.add('silver'); $('net-ico').classList.remove('off');
    realClock(); drawCalendar(new Date().getMonth(), new Date().getFullYear(), 0, new Date().getDate());
    // the room as it really is
    wallMatP.map = wallRealP; wallMatS.map = wallRealS; wallMatP.needsUpdate = wallMatS.needsUpdate = true;
    floorMat.color.set(0x8a8a92);
    toys.visible = false; poster.visible = false; rug.visible = false; blanket.visible = false; messyBed.visible = true; clutter.visible = true;
    crtG.visible = false; laptopG.visible = true; monitorMode = 'laptop'; drawMonitor('laptop'); hoodieOnChair.visible = true;
    curtains.forEach(c => c.visible = false); blinds.visible = true; patchMat.map = patchBlindTex;
    bulbs.forEach(b => { b.dead = true; }); pendant.visible = false; starMat.opacity = 0.03; tvMode = 'off';
    skyMat.map = skyDayTex; snowGround.color.set(0x9aa0a8); snowman.visible = false; snowMat.opacity = 0;
    teddy.position.set(-3.0, 0, -0.2); teddy.rotation.set(0, 0.8, 0);
    closetOpenTarget = 0; doorTarget = 0; closetEyes.visible = false;
    ITEMS.forEach(it => { it.mesh.visible = false; it.glow.visible = false; });
    Object.values(MEM).forEach(m => m.sprite.visible = false);
    feet.visible = true;
    // you, as you are
    tintAdult(1); adult.setFace('adult'); adult.pose = 'stand'; adult.headTilt = 0; adultEyeGlow.visible = false; faceLightOn = 0;
    adult.group.visible = true; adult.group.position.set(4.6, 0, 4.6); adult.group.rotation.y = -2.4;
    player = adult;
    // him, as he was
    kid.group.visible = true; kid.group.position.set(-1.6, 0, 0.6); kid.group.rotation.y = 0.9; kid.pose = 'reach';
    kid.armHold = [null, null]; lantern.visible = false; kid.setFace('kid');
    Object.values(kidMats).forEach(m => m.emissive.copy(m.color).multiplyScalar(0.36));
    retarget(); Object.assign(cur, { ceil: 0, lights: 0, lantern: 0, real: 1, dread: 0.2, cold: 0.5 });
    knockTimer = 4; realityTime = 0;
    setTimeout(() => say([
        { who: 'real', t: 'it\'s so cold in here.' },
        { who: 'real', t: 'the room is smaller than i remember. it was always this small.' },
        { who: 'real', t: 'he\'s still here. he\'s waiting for me.' },
        { who: 'real', t: 'someone is knocking.' }
    ], () => {
        setObjective(`it's ${fmtClock(new Date().getHours() * 60 + new Date().getMinutes())}. it's today.`);
        balloon('Someone is at the door', 'There are a few things you could do. Take your time. Not too much time.', 7000);
    }, { title: 'today.txt' }), 1200);
}

function takeHand() {
    holding = true; kid.pose = 'stand'; Sfx.chime();
    adult.armHold[0] = -0.25; kid.armHold[1] = -0.6;
    say([
        { who: 'kid', t: 'your hand is cold.', title: 'kiddo.txt' },
        { who: 'real', t: 'sorry. it\'ll warm up.', title: 'today.txt' },
        { who: 'kid', t: 'you\'re not gonna leave me in here, right?', title: 'kiddo.txt' },
        { who: 'real', t: 'no. you\'re coming with me. you were always supposed to.', title: 'today.txt' }
    ], () => setObjective('take him with you.'));
}
const isDay = () => { const h = new Date().getHours(); return h >= 6 && h < 18; };
function openBlinds() {
    blindsOpen = true; Sfx.pad([392, 493.88, 587.33], 0.05); patchMat.map = patchTex;
    const day = isDay(), h = new Date().getHours();
    skyMat.map = day ? skyDayTex : skyTex; sunLight.color.set(day ? 0xffd6a0 : 0xffb070);
    streetLight.intensity = day ? 0 : 30; streetGlow.visible = !day;
    retarget();
    say(day ? [
        { who: 'real', t: h < 12 ? 'it\'s morning. it\'s been morning for hours.' : 'it\'s the middle of the afternoon. the sun is out.' },
        { who: 'real', t: 'the snow melted weeks ago. i didn\'t even notice.' }
    ] : [
        { who: 'real', t: 'it\'s night out there. a normal, quiet night. the streetlights are on.' },
        { who: 'real', t: 'the snow melted weeks ago. i didn\'t even notice the days go by.' }
    ], null, { title: 'today.txt' });
}

/* ---------- endings ---------- */
function markEnding(id) {
    store.set('cm2_end_' + id, '1');
    return ['loop', 'wake', 'carpe'].filter(k => store.get('cm2_end_' + k, null)).length;
}
async function runEnding(lines, opts) {
    state = 'ENDED'; isInteracting = true; hidePrompt(); setObjective(''); ui.innerHTML = '';
    $('stamina').classList.remove('show'); $('taskbar').classList.remove('show');
    showBlack('', !!opts.dawn);
    const tEl = $('ending-text'), sub = $('ending-sub'), lab = $('ending-label'), btns = $('ending-btns');
    sub.classList.remove('show'); lab.classList.remove('show'); btns.classList.remove('show'); btns.innerHTML = '';
    await wait(1600);
    for (const l of lines) {
        tEl.classList.add('fade'); await wait(450);
        tEl.textContent = l; tEl.classList.remove('fade');
        await wait(Math.max(2600, l.length * 55));
    }
    if (opts.finale) await opts.finale(tEl, sub);
    lab.textContent = opts.label; lab.classList.add('show');
    if (opts.sub) { sub.textContent = opts.sub; sub.classList.add('show'); }
    (opts.buttons || []).forEach(([txt, fn]) => { const b = document.createElement('button'); b.className = 'xpbtn'; b.textContent = txt; b.onclick = fn; btns.appendChild(b); });
    await wait(1200); btns.classList.add('show');
}
const restart = (loop) => { if (loop) store.set('cm2_loops', String(LOOPS + 1)); location.hash = ''; location.reload(); };

function endingLoop(bed = false) {
    const n = markEnding('loop'); Sfx.whisper(); kick(0.6, 0.1);
    runEnding(bed ? [
        'you lie down. just for five minutes.',
        'the sheets smell like the old house. they never did. you know that.',
        'it\'s easier here. it\'s always easier here.',
        '(the knocking gets quieter. then it stops.)'
    ] : [
        'you sit back down.',
        'the screen is warm as bathwater.',
        'just one more time. just until it stops hurting.',
        '(the knocking gets quieter. then it stops.)'
    ], { label: `ENDING · THE LOOP   ·   found ${n}/3`, buttons: [['log in again', () => restart(true)]] });
}
function endingWake() {
    const n = markEnding('wake'); setFlash(1); Sfx.pad([261.63, 329.63, 392, 493.88]);
    runEnding([
        'the lock is stiff. it hasn\'t turned in weeks.',
        'the hallway light is so bright it hurts.',
        'she looks older. so do you. she doesn\'t say anything. she just holds on.',
        'behind you, in the dark room, a little boy is still waiting for someone to come back for him.'
    ], { label: `ENDING · WAKE UP   ·   found ${n}/3`, sub: '(you left him behind. maybe he could have come with you.)', buttons: [['try again', () => restart(false)]] });
}
function endingCarpe() {
    const n = markEnding('carpe'); setFlash(1); Sfx.pad([261.63, 329.63, 392, 523.25]);
    const d = new Date();
    const day = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toLowerCase();
    runEnding([
        'the lock is stiff. it hasn\'t turned in weeks.',
        'a small hand squeezes yours. "it\'s cold out here."',
        '"i know. it\'s real, though."',
        'she\'s crying. she\'s laughing. she\'s holding a shoebox full of mom\'s old tapes.',
        'that night you play the one with the music box song.',
        'it has an ending. it\'s beautiful.',
        'you\'ll miss the old days. you\'re allowed to. you just can\'t live there.'
    ], {
        dawn: true,
        finale: async (tEl, sub) => {
            Sfx.songWithEnding();
            tEl.classList.add('fade'); await wait(500);
            tEl.textContent = `it's ${day}, ${date}.`; tEl.classList.remove('fade'); await wait(3400);
            tEl.classList.add('fade'); await wait(500);
            tEl.textContent = 'this day only happens once.'; tEl.classList.remove('fade'); await wait(3600);
            tEl.classList.add('fade'); await wait(700);
            tEl.textContent = 'CARPE DIEM'; tEl.classList.add('big'); tEl.classList.remove('fade'); await wait(3200);
        },
        label: `ENDING · CARPE DIEM   ·   found ${n}/3`,
        sub: 'now close this tab, open a window, and call someone you miss.',
        buttons: [['play again', () => restart(false)]]
    });
}

/* =====================================================================
   PER-FRAME
   ===================================================================== */
const camPos = new THREE.Vector3(0, 9, 14), camLook = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
let camFov = 40, monitorMode = 'desk', screenT = 0;

function updateCamera(dt, t) {
    const a = 1 - Math.exp(-3 * dt);
    let fov = 40;
    if (state === 'LOGIN' || state === 'BOOT') { tmpV.set(Math.sin(t * 0.15) * 4, 7.5, 12 + Math.cos(t * 0.12) * 1.5); tmpV2.set(0, 1.5, -1); }
    else if (camOverride) { tmpV.copy(camOverride.pos); tmpV2.copy(camOverride.look); fov = camOverride.fov || 40; }
    else if (activeMem && activeMem.cam) { tmpV.set(...activeMem.cam.pos); tmpV2.set(...activeMem.cam.look); fov = 44; }
    else {
        const p = player.group.position;
        let H = 6.6, D = 8.4, ly = 1.4;
        if (state === 'CALL') { H = 4.8; D = 4.4; ly = 2.8; }
        else if (state === 'STALK' || state === 'HIDE') { H = 7.0; D = 8.8; }
        else if (state === 'REALITY' || state === 'ENDED') { H = 6.4; D = 8.4; ly = 2.0; }
        tmpV.set(p.x * 0.78, H, p.z + D);
        tmpV2.set(p.x * 0.88, ly, p.z - (state === 'CALL' ? 2.4 : 0.6));
    }
    camPos.lerp(tmpV, a); camLook.lerp(tmpV2, a); camFov = lerp(camFov, fov, a);
    camera.position.copy(camPos);
    if (shake > 0.001) camera.position.add(tmpV.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(shake));
    camera.lookAt(camLook);
    const portrait = camera.aspect < 1 ? clamp(1 / camera.aspect, 1, 2.1) * 0.75 + 0.25 : 1; // keep the room in frame on phones
    camera.fov = camFov * portrait - pulse * 1.2; camera.updateProjectionMatrix();
}

const moveDir = new THREE.Vector2();
function updatePlayer(dt, t) {
    const c = player;
    let moving = false, k = 1;
    if (cutscene) {
        const p = c.group.position, dx = cutscene.x - p.x, dz = cutscene.z - p.z, d = Math.hypot(dx, dz);
        if (d > 0.06) { const s = Math.min(d, 2.0 * dt); p.x += dx / d * s; p.z += dz / d * s; turnTo(c.group, Math.atan2(dx, dz), dt * 8); moving = true; }
        else turnTo(c.group, cutscene.face, dt * 6);
        poseChibi(c, dt, t, moving, 0.75); return;
    }
    const canMove = !isInteracting && ['EXPLORE', 'STALK', 'HIDE', 'REALITY'].includes(state);
    if (canMove) {
        moveDir.set(0, 0);
        if (keys['w'] || keys['arrowup']) moveDir.y -= 1; if (keys['s'] || keys['arrowdown']) moveDir.y += 1;
        if (keys['a'] || keys['arrowleft']) moveDir.x -= 1; if (keys['d'] || keys['arrowright']) moveDir.x += 1;
        let joyMag = 0;
        if (joy.active && Math.hypot(joy.x, joy.z) > 0.18) { moveDir.set(joy.x, joy.z); joyMag = moveDir.length(); }
        if (moveDir.lengthSq() > 0) {
            moveDir.normalize(); moving = true;
            let speed = state === 'REALITY' ? 2.3 : 3.4;
            const wantRun = (keys['shift'] || joyMag > 0.92) && (state === 'STALK' || state === 'HIDE') && stamina > 0.02;
            if (wantRun) { speed = 5.6; stamina = Math.max(0, stamina - dt / 3.6); k = 1.45; } else stamina = Math.min(1, stamina + dt / 6);
            if (state === 'REALITY') k = 0.6;
            const p = c.group.position;
            const nx = clamp(p.x + moveDir.x * speed * dt, -7.3, 7.3), nz = clamp(p.z + moveDir.y * speed * dt, -7.3, 7.3);
            if (!collides(nx, p.z)) p.x = nx; if (!collides(p.x, nz)) p.z = nz;
            turnTo(c.group, Math.atan2(moveDir.x, moveDir.y), dt * 10);
            stepTimer -= dt; if (stepTimer <= 0) { Sfx.step(state === 'REALITY' ? 1.4 : 1); stepTimer = 0.34 / k; }
        } else stamina = Math.min(1, stamina + dt / 4);
    }
    poseChibi(c, dt, t, moving, k);
    $('stamina').firstElementChild.style.width = (stamina * 100) + '%';
}
function turnTo(obj, target, k) { obj.rotation.y += Math.atan2(Math.sin(target - obj.rotation.y), Math.cos(target - obj.rotation.y)) * Math.min(1, k); }

const COLLIDERS = [
    { x: -5.5, z: -4, w: 4, d: 7 }, { x: 0, z: -6.5, w: 5, d: 2.5 }, { x: 1.5, z: -4.4, w: 1.0, d: 1.0 },
    { x: -7.4, z: 3, w: 1, d: 3.6 }, { x: 7, z: 5, w: 2, d: 3.4 }, { x: 7.2, z: 0.8, w: 1.5, d: 2.7 }
];
function collides(x, z) {
    const r = player === adult ? 0.42 : 0.32;
    for (const c of COLLIDERS) if (Math.abs(x - c.x) < c.w / 2 + r && Math.abs(z - c.z) < c.d / 2 + r) return true;
    return false;
}

function updateAdult(dt, t) {
    if (player === adult) return;
    const a = adult, p = kid.group.position, ap = a.group.position;
    if (cutsceneActor && cutsceneActor.c === a) {
        const dx = cutsceneActor.x - ap.x, dz = cutsceneActor.z - ap.z, d = Math.hypot(dx, dz);
        let moving = false;
        if (d > 0.06) {
            const s = Math.min(d, cutsceneActor.speed * dt); ap.x += dx / d * s; ap.z += dz / d * s; turnTo(a.group, Math.atan2(dx, dz), dt * 6); moving = true;
            if (cutsceneActor.steps) { adultStepT -= dt; if (adultStepT <= 0) { Sfx.heavyStep(clamp(-dz * 0.2, -1, 1)); adultStepT = 0.85; pulse = 0.6; } }
        }
        poseChibi(a, dt, t, moving, 0.45); return;
    }
    if (!a.group.visible) return;
    if (state === 'EXPLORE' && lurkerOn) {
        if (lurkerOutside > 0) { lurkerOutside -= dt; a.group.lookAt(p.x, 0, p.z); if (lurkerOutside <= 0) { a.group.visible = false; lurkerTimer = 6; } poseChibi(a, dt, t, false); return; }
        if (lurkerTimer > 0) { a.group.visible = false; lurkerTimer -= dt; if (lurkerTimer <= 0) placeLurker(); return; }
        a.group.visible = true; turnTo(a.group, Math.atan2(p.x - ap.x, p.z - ap.z), dt * 4);
        if (!isInteracting && Math.hypot(p.x - ap.x, p.z - ap.z) < 4.4) {
            lurkerTimer = rand(5, 9); a.group.visible = false; Sfx.whisper(); kick(0.6, 0.15);
            toast(pick(['it was right there.', 'it looked like it wanted to say something.', 'it was wearing a scarf.', 'don\'t look away.']), 2400, 'slip');
        }
        poseChibi(a, dt, t, false); return;
    }
    if (state === 'STALK' || state === 'HIDE') {
        const dx = p.x - ap.x, dz = p.z - ap.z, dist = Math.hypot(dx, dz) || 0.001;
        if (!isInteracting) {
            const speed = state === 'HIDE' ? 0.55 : 1.75 + itemCount * 0.42;
            ap.x += dx / dist * speed * dt; ap.z += dz / dist * speed * dt;
            lungeTimer -= dt;
            if (state === 'STALK' && lungeTimer < 0) {
                lungeTimer = Math.max(4, rand(7, 11) - itemCount * 1.2); kick(1, 0.35); flickUntil = t + 0.35; Sfx.stinger(0.4);
                if (dist > 5) { const nd = Math.max(4, dist * 0.7); ap.x = p.x - dx / dist * nd; ap.z = p.z - dz / dist * nd; }
            }
            whisperCd -= dt;
            if (whisperCd < 0 && dist < 7) {
                whisperCd = rand(8, 13); Sfx.whisper();
                toast(pick(['found you.', 'come here.', 'please stop running.', 'we have to go.', 'it\'s time to wake up.', 'it\'s okay. it\'s me.']), 2400, 'slip');
            }
            if (dist < 1.2) caught();
            const kk = clamp(1 - dist / 12, 0, 1); heartTimer -= dt;
            if (heartTimer <= 0) { Sfx.heart(kk); pulse = 0.4 + kk * 0.6; heartTimer = lerp(1.1, 0.4, kk); }
        }
        a.group.lookAt(p.x, 0, p.z);
        ap.y = Math.sin(t * 2) * 0.04;
        poseChibi(a, dt, t, false);
        return;
    }
    if (state === 'CALL') {
        const tx = p.x + 0.3, tz = p.z + 3.0, dx = tx - ap.x, dz = tz - ap.z, d = Math.hypot(dx, dz);
        if (d > 0.05) { ap.x += dx / d * Math.min(d, 0.7 * dt); ap.z += dz / d * Math.min(d, 0.7 * dt); }
        a.group.lookAt(p.x, 0, p.z); poseChibi(a, dt, t, false); return;
    }
    poseChibi(a, dt, t, false);
}

function updateKidNPC(dt, t) {
    if (player === kid) return;
    if (!kid.group.visible) return;
    const kp = kid.group.position, ap = adult.group.position;
    let moving = false;
    if (holding) {
        const side = tmpV.set(-0.95, 0, 0.25).applyAxisAngle(THREE.Object3D.DEFAULT_UP, adult.group.rotation.y);
        const tx = ap.x + side.x, tz = ap.z + side.z, dx = tx - kp.x, dz = tz - kp.z, d = Math.hypot(dx, dz);
        if (d > 0.08) { const s = Math.min(d, Math.max(2.4, d * 3) * dt); kp.x += dx / d * s; kp.z += dz / d * s; moving = d > 0.2; }
        turnTo(kid.group, adult.group.rotation.y, dt * 6);
    } else {
        turnTo(kid.group, Math.atan2(ap.x - kp.x, ap.z - kp.z), dt * 3);
    }
    poseChibi(kid, dt, t, moving, 0.9);
    kidLight.position.set(kp.x, 1.6, kp.z + 0.4);
}

function updateEchoes(dt, t) {
    for (const c of echoes) {
        c.alpha = lerp(c.alpha, c.target, 1 - Math.exp(-(c.target ? 1.6 : 2.6) * dt));
        const flicker = c.chill > 0.5 ? (Math.random() < 0.25 ? 0.2 : 1) : 1;
        c.mat.opacity = c.alpha * 0.5 * flicker; c.faceLit.opacity = c.alpha * 0.9 * flicker;
        c.mat.color.set(0xffc98a).lerp(COLD, c.chill);
        c.group.visible = c.alpha > 0.01;
        if (c.group.visible) poseChibi(c, dt, t, false);
    }
}

function updateItems(dt, t) {
    if (state !== 'STALK') { ITEMS.forEach(it => it.light.intensity = 0); return; }
    const p = kid.group.position;
    ITEMS.forEach(it => {
        if (it.got) return;
        it.glow.position.y = 0.6 + Math.sin(t * 2 + it.ph) * 0.12; it.glow.scale.setScalar(1.5 + Math.sin(t * 4 + it.ph) * 0.15);
        it.light.intensity = 5 + Math.sin(t * 3 + it.ph) * 1.5;
        if (!isInteracting && Math.hypot(p.x - it.pos[0], p.z - it.pos[2]) < 1.15) collectItem(it);
    });
    if (ringing) { ringTimer -= dt; if (ringTimer <= 0) { Sfx.ring(); ringTimer = 1.6; } }
}

function updateScreens(dt, t) {
    screenT -= dt; if (screenT > 0) return; screenT = 1 / 12;
    if (tvMode !== 'off' || drawTV.last !== 'off') { drawTV(tvMode, t); drawTV.last = tvMode; }
    if (ringing) drawMonitor('ring', t);
    else if (monitorMode === 'msn') drawMonitor('msn', t);
}

function updateClocks(dt, t) {
    if (clockMode === 'real') {
        const d = new Date(); clockMin = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
        const s = fmtClock(Math.floor(clockMin)); if ($('clock').textContent !== s) $('clock').textContent = s;
    } else if (clockMode === 'spin') {
        clockSpin += dt; clockMin -= dt * 40;
        if (Math.random() < 0.05) $('clock').textContent = Math.random() < 0.5 ? '3:00 AM' : '--:--';
    } else if (state === 'EXPLORE' || state === 'INTRO') clockMin += dt / 6;
    hourHand.rotation.z = -((clockMin / 60) % 12) / 12 * Math.PI * 2;
    minHand.rotation.z = -(clockMin % 60) / 60 * Math.PI * 2;
}

function updateAtmos(dt, t) {
    const rate = (k, r) => { cur[k] = lerp(cur[k], T[k], 1 - Math.exp(-r * dt)); };
    ['amb', 'ceil', 'lamp', 'tv', 'win', 'lantern', 'door', 'sun', 'lights', 'kidglow', 'fogFar', 'vig', 'expo'].forEach(k => rate(k, 2.2));
    rate('dread', 0.8); rate('cold', 0.8); rate('warm', 0.8); rate('real', 1.5);

    if (t > nextFlick) { flickUntil = t + rand(0.06, 0.25); nextFlick = t + rand(3, 9) * (1.3 - cur.dread); }
    const flick = t < flickUntil ? 0.15 + Math.random() * 0.3 : 1;

    ceilLight.intensity = pendantDead ? 0 : 90 * cur.ceil * flick;
    ceilLight.color.lerpColors(WARM, COLD, clamp(cur.cold * 1.1, 0, 1));
    bulbMat.color.copy(WARM).multiplyScalar(pendantDead ? 0.05 : 0.2 + cur.ceil * 0.8 * flick);
    hemi.intensity = 0.75 * cur.amb;
    hemi.color.set(0xffe2b0).lerp(tmpColor.set(0x8098c8), cur.cold).lerp(tmpColor.set(0xb8c0cc), cur.real * (1 - cur.sun));
    hemi.color.lerp(tmpColor.set(0xffd8a8), cur.sun * 0.6);
    deskLamp.intensity = 8 * cur.lamp * (t < flickUntil ? 0.3 : 1); lampBulbMat.color.setScalar(0.12 + cur.lamp * 0.88);
    const tvOn = tvMode !== 'off';
    tvLight.intensity = tvOn ? (tvMode === 'cartoon' ? 4 : 2.5) * (0.8 + Math.random() * 0.25) : 0;
    tvLight.color.set(tvMode === 'stay' ? 0xff5050 : 0x9fd0ff);
    winLight.intensity = 6 * cur.win; winLight.color.copy(COLD);
    patchMat.opacity = 0.35 * cur.win + 0.75 * cur.sun + (state === 'REALITY' && !blindsOpen ? 0.3 : 0);
    patchMat.color.set(0x8fb4ff).lerp(tmpColor.set(0xffd6a0), clamp(cur.sun + cur.real * 0.3, 0, 1));
    sunLight.intensity = (isDay() ? 260 : 120) * cur.sun;
    doorLight.intensity = 9 * cur.door * (0.85 + Math.sin(t * 2.3) * 0.15); doorGlowMat.opacity = cur.door * 0.6;
    screenLight.intensity = state === 'CALL' || ringing ? 4 : (state === 'REALITY' ? 3 : 1.2 * (1 - cur.dread * 0.6));
    screenLight.color.set(state === 'REALITY' ? 0x9fb8ff : (ringing ? 0x9be36b : 0x9fc8ff));
    kidLight.intensity = 2.4 * cur.kidglow;
    keyLight.intensity = 9 * clamp(cur.amb, 0.15, 1); keyLight.color.set(0xffe2c0).lerp(tmpColor2.set(0xc8d4ff), cur.cold);
    keyLight.position.set(player.group.position.x, 3.0, player.group.position.z + 2.6);
    // string lights
    const sl = cur.lights;
    bulbs.forEach((b, i) => {
        const tw = 0.75 + 0.25 * Math.sin(t * 2 + b.ph);
        const v = b.dead ? 0.08 : sl * tw * (Math.random() < cur.dread * 0.01 ? 0.1 : 1);
        b.mat.color.copy(b.base).multiplyScalar(Math.max(0.08, v));
    });
    strLightA.intensity = 5 * sl * (bulbs[0].dead ? 0 : 1); strLightB.intensity = 4 * sl * (bulbs[0].dead ? 0 : 1);
    starMat.opacity = state === 'REALITY' ? 0.04 : clamp(0.12 + (1 - cur.lights) * 0.7, 0, 0.85);
    // lantern
    const lp = kid.group.position;
    lanternLight.intensity = (lantern.visible ? 17 : 0) * cur.lantern * (t < flickUntil && state === 'STALK' ? 0.35 : 1);
    lanternLight.position.set(lp.x + 0.3, 2.7, lp.z + 0.9);
    lanternGlow.material.opacity = 0.8 * cur.lantern;
    // closet
    closetOpen = lerp(closetOpen, closetOpenTarget, 1 - Math.exp(-1.8 * dt)); closetPivot.rotation.y = closetOpen;
    closetGlow.intensity = closetGlowOn ? 5 + Math.sin(t * 3) * 1 : 0;
    // door
    doorAngle = lerp(doorAngle, doorTarget, 1 - Math.exp(-1.2 * dt)); doorPivot.rotation.y = doorAngle;
    if (state === 'REALITY') {
        knockTimer -= dt;
        if (knockTimer <= 0) {
            Sfx.knock(); knockTimer = rand(7, 11); doorPivot.userData.shake = 0.6;
            if (Math.random() < 0.6 && !isInteracting) toast(pick(['"i\'m not leaving."', isDay() ? '"i brought breakfast."' : '"i brought dinner. it\'s getting cold."', '"you don\'t have to be okay. just open the door."', '"it\'s me."']), 3000, 'real');
        }
        const s = (doorPivot.userData.shake = Math.max(0, (doorPivot.userData.shake || 0) - dt * 2)); doorPivot.position.x = 7.95 + Math.sin(t * 60) * 0.012 * s;
        footL.position.x = 7.8 + Math.sin(t * 0.7) * 0.05; footR.position.x = 7.8 + Math.sin(t * 0.7 + 1) * 0.05;
        realityTime += dt;
        if (!askedLogin && realityTime > 40 && !isInteracting) {
            askedLogin = true;
            say([{ who: 'room', title: 'memory.exe', t: 'Your memories are still running. Log back in?', btns: ['Yes', 'Not now'], focus: 1, onChoose: (i) => { if (i === 0) setTimeout(() => endingLoop(), 300); } }]);
        }
        // blinds
        slats.forEach((s, i) => { s.rotation.x = lerp(s.rotation.x, blindsOpen ? 1.35 : 0, 1 - Math.exp(-2 * dt)); });
    }
    // fog + surface tint
    scene.fog.far = cur.fogFar; scene.fog.near = cur.fogFar * 0.4;
    scene.fog.color.set(0x0a0710).lerp(tmpColor.set(0x05070d), cur.cold).lerp(tmpColor.set(0x1a1c22), cur.real).lerp(tmpColor.set(0x3a3024), cur.sun);
    scene.background.copy(scene.fog.color);
    if (state !== 'REALITY' && state !== 'ENDED') {
        const wc = tmpColor.set(0xffffff).lerp(tmpColor2.set(0x8fa2c8), cur.cold);
        wallMatP.color.copy(wc); wallMatS.color.copy(wc);
        floorMat.color.set(0xffffff).lerp(tmpColor2.set(0x7a8cb0), cur.cold * 0.7);
    } else { wallMatP.color.setScalar(1); wallMatS.color.setScalar(1); }
    frostMat.opacity = clamp(Math.pow(cur.cold, 1.4) * 0.9, 0, 0.92) * (state === 'REALITY' ? 0 : 1);
    // outside
    const sp = snowGeo.attributes.position, fall = 0.7 + cur.cold * 2.0;
    for (let i = 0; i < SNOW_N; i++) { let y = sp.getY(i) - fall * dt * (0.6 + (i % 5) * 0.2); let x = sp.getX(i) + Math.sin(t + i) * dt * 0.4; if (y < -1) { y = 11; x = rand(-6, 16); } sp.setY(i, y); sp.setX(i, x); }
    sp.needsUpdate = true;
    snowman.scale.setScalar(lerp(snowman.scale.x, snowmanTarget, 1 - Math.exp(-0.7 * dt)) || 0.001);
    houseWinMat.color.set(0xffc46a).multiplyScalar(state === 'REALITY' ? 0.35 : clamp(1 - cur.dread * 0.8, 0.2, 1));
    if (state !== 'REALITY') { streetLight.intensity = 30; streetGlow.visible = true; }
    else if (!blindsOpen) { streetLight.intensity = 0; streetGlow.visible = false; }
    // inside snow (the dream is breaking)
    isnowMat.opacity = (state === 'REALITY' || state === 'CLOSET' || state === 'ENDED') ? 0 : clamp((cur.cold - 0.55) * 2.2, 0, 0.7);
    if (isnowMat.opacity > 0) { const ip = isnowGeo.attributes.position; for (let i = 0; i < ISNOW_N; i++) { let y = ip.getY(i) - dt * (0.5 + (i % 4) * 0.15); if (y < 0) y = 8; ip.setY(i, y); } ip.needsUpdate = true; }
    // dust
    const dp = dustGeo.attributes.position;
    for (let i = 0; i < DUST_N; i++) { dp.setY(i, dp.getY(i) + Math.sin(t * 0.3 + i) * dt * 0.05); dp.setX(i, dp.getX(i) + Math.cos(t * 0.2 + i) * dt * 0.05); }
    dp.needsUpdate = true; dustMat.opacity = 0.22 * (1 - cur.cold) + 0.4 * cur.sun;
    // memory orbs
    for (const m of Object.values(MEM)) {
        const show = (state === 'EXPLORE' || state === 'INTRO') && !m.done;
        m.fade = lerp(m.fade, show ? 1 : 0, 1 - Math.exp(-3 * dt)); m.sprite.visible = m.fade > 0.02;
        m.sprite.position.y = m.orb[1] + Math.sin(t * 1.6 + m.ph) * 0.18;
        m.sprite.scale.setScalar((1.0 + Math.sin(t * 3 + m.ph) * 0.12) * m.fade);
        m.sprite.material.color.set(0xffe0a0).lerp(tmpColor.set(0x9ec4ff), clamp(cur.cold * 1.3, 0, 1));
    }
    // breath puffs when cold
    puffTimer -= dt;
    const pc = player.group;
    if (cur.cold > 0.3 && puffTimer <= 0 && pc.visible && ['EXPLORE', 'STALK', 'HIDE', 'REALITY'].includes(state)) {
        puffTimer = lerp(2.4, 1.3, cur.cold); const pf = puffs.find(p => p.life <= 0);
        if (pf) { const h = player === kid ? 1.55 : 2.95; pf.life = 1.3; pf.s.visible = true; pf.s.position.set(pc.position.x + Math.sin(pc.rotation.y) * 0.7, h, pc.position.z + Math.cos(pc.rotation.y) * 0.7); }
    }
    puffs.forEach(p => { if (p.life > 0) { p.life -= dt; p.s.position.y += dt * 0.3; p.s.scale.setScalar(0.25 + (1.3 - p.life) * 0.6); p.s.material.opacity = clamp(p.life / 1.3, 0, 1) * 0.3; if (p.life <= 0) p.s.visible = false; } });
    // the reveal: light finds his face
    if (revealStart && revealK < 1) {
        tintAdult(Math.min(1, revealK + dt * 0.45));
        if (adult.faceKind === 'void' && revealK > 0.25) { adult.setFace('adult'); adultEyeGlow.visible = false; Sfx.pad([220, 277.18, 329.63], 0.05); setFlash(0.25); }
    }
    faceLight.intensity = faceLightOn * 22; faceLight.position.set(adult.group.position.x + 1.1, 1.4, adult.group.position.z + 0.1);
    adultEyeGlow.material.opacity = adult.faceKind === 'void' ? 0.22 + Math.sin(t * 3) * 0.06 : 0;
}
const tmpColor = new THREE.Color(), tmpColor2 = new THREE.Color();

function updatePost(dt, t) {
    glitch = Math.max(0, glitch - dt * 1.8); shake = Math.max(0, shake - dt * 1.2); pulse = Math.max(0, pulse - dt * 2.5);
    flashV = Math.max(0, flashV - dt * 1.4);
    const u = post.uniforms;
    u.uTime.value = t;
    u.uGlitch.value = glitch + (cur.dread > 0.8 && Math.random() < 0.02 ? 0.5 : 0);
    u.uCold.value = cur.cold; u.uWarm.value = cur.warm; u.uReal.value = cur.real;
    u.uVig.value = clamp(cur.vig + pulse * 0.2, 0, 1.3);
    u.uAberr.value = 0.4 + cur.dread * 1.2 + glitch * 2.5;
    u.uGrain.value = 0.03 + cur.dread * 0.07;
    u.uExpo.value = 1.12 + cur.sun * 0.15;
    $('flash').style.opacity = flashV;
    $('frost').style.opacity = state === 'REALITY' ? 0 : clamp((cur.cold - 0.2) * 0.9, 0, 0.75);
    $('noise-overlay').style.opacity = clamp(cur.dread * 0.24 + glitch * 0.5, 0, 1);
    Sfx.mood(cur.dread, cur.cold, cur.warm, dt);
    if (state === 'EXPLORE' || state === 'INTRO') Sfx.musicBox(cur.dread, dt);
}

const nctx = $('noise-overlay').getContext('2d'), nimg = nctx.createImageData(160, 90); let noiseT = 0;
function drawNoise(dt) {
    noiseT -= dt; if (noiseT > 0) return; noiseT = 0.07;
    const d = nimg.data; for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    nctx.putImageData(nimg, 0, 0);
}

/* =====================================================================
   LOOP
   ===================================================================== */
const clock = new THREE.Clock();
function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    updateAtmos(dt, t);
    updatePlayer(dt, t);
    updateAdult(dt, t);
    updateKidNPC(dt, t);
    updateEchoes(dt, t);
    updateItems(dt, t);
    updateScreens(dt, t);
    updateClocks(dt, t);
    updateFocus();
    updateCamera(dt, t);
    updatePost(dt, t);
    drawNoise(dt);
    renderer.setRenderTarget(lowRT); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}
frame();

/* =====================================================================
   DEV: jump straight to a chapter with #night, #call, #hide, #closet, #today
   ===================================================================== */
if (JUMP) {
    (async () => {
        $('login').classList.add('hide'); $('taskbar').classList.add('show'); Sfx.init();
        Object.values(MEM).forEach(m => { m.done = true; });
        if (JUMP === 'evening') { Object.values(MEM).forEach(m => { m.done = false; }); state = 'EXPLORE'; retarget(); setChapter('i · evening'); setObjective('remember (0/5)'); return; }
        if (JUMP === 'night') { state = 'EXPLORE'; startNight(); return; }
        pendantDead = true; bulbs.forEach(b => b.dead = true); setClock(3, 0);
        if (JUMP === 'call') { state = 'STALK'; retarget(); lantern.visible = true; kid.armHold[1] = -0.9; adult.group.visible = true; adult.group.position.set(6, 0, 5); ITEMS.forEach(i => i.got = true); itemCount = 3; ringing = true; setObjective('the computer is ringing. answer it.'); setChapter('ii · night'); return; }
        if (JUMP === 'hide') { startHide(); return; }
        if (JUMP === 'closet') { startHide(); await wait(200); startCloset(); return; }
        if (JUMP === 'today') { setReality(); return; }
    })();
}

// test hook (only with ?test in the URL)
if (location.search.includes('test')) window.__cm = {
    get state() { return state; }, get logOpen() { return !!activeLog; }, get interacting() { return isInteracting; },
    get player() { return player; }, kid, adult, MEM, ITEMS, tp(x, z) { player.group.position.set(x, 0, z); }
};
