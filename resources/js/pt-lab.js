// pt-lab.js — interactive 3D practice lab (Packet-Tracer style) built on
// Three.js + the pure pt-engine/pt-cli modules. Exported as an Alpine
// component via `practiceLabData`.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as E from './pt-engine.js';
import * as C from './pt-cli.js';

// Alpine wraps component data in a reactive Proxy (Vue-style). Three.js and
// the simulation engine store objects with read-only getters
// (matrixWorld, modelViewMatrix, …) and live internal state that break under
// a Proxy. Mark them with __v_skip so Alpine's reactivity leaves them
// untouched and they stay plain objects.
function raw(value) {
    if (value && (typeof value === 'object' || typeof value === 'function')) {
        try { Object.defineProperty(value, '__v_skip', { value: true }); } catch (e) { /* frozen */ }
    }
    return value;
}

// ---------------------------------------------------------------------------
// Small 3D helpers
// ---------------------------------------------------------------------------

function box(w, h, d, color, opts = {}) {
    const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.35, ...opts }),
    );
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}

function cyl(r, h, color, opts = {}) {
    const m = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, h, 20),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.4, ...opts }),
    );
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}

// Local-space position of a device port (used for cable anchors + markers).
function portLocalPos(dev, portName) {
    const key = E.normalizePort(portName);
    let p = dev.ports.find((pp) => E.normalizePort(pp.name) === key);
    if (p && p.kind === 'subinterface') {
        p = dev.ports.find((pp) => E.normalizePort(pp.name) === E.normalizePort(p.parent)) || p;
    }
    const kind = p ? p.kind : 'ethernet';
    const idx = p ? Math.max(0, dev.ports.filter((pp) => pp.kind === kind).findIndex((pp) => pp === p)) : 0;
    const name = p ? E.normalizePort(p.name) : key;
    const t = dev.type;

    if (t === 'router') {
        // Cisco ISR-style face: 3 x GE jacks + 2 x serial (WIC) jacks, front-facing.
        if (kind === 'serial') return new THREE.Vector3(0.82 + idx * 0.30, 0.30, 0.83);
        if (kind === 'loopback') return new THREE.Vector3(0, 0.30, 0.83);
        return new THREE.Vector3(-0.45 + idx * 0.40, 0.30, 0.83); // G0/0..2
    }
    if (t === 'switch') {
        // Catalyst-style face: 2 x 12 access ports + 2 x SFP uplinks, front-facing.
        const n = parseInt((name.match(/\d+$/) || ['0'])[0], 10) || 0;
        if (/^f/i.test(name)) {
            const col = (n - 1) % 12;
            const row = n <= 12 ? 0 : 1;
            return new THREE.Vector3(-0.82 + col * 0.15, row === 0 ? 0.16 : 0.34, 0.88);
        }
        if (/^g/i.test(name)) {
            return new THREE.Vector3(0.99 + idx * 0.15, 0.25, 0.88);
        }
        return new THREE.Vector3(0, 0.25, 0.88); // Vlan1 (virtual)
    }
    if (t === 'pc') {
        return new THREE.Vector3(-0.18, 0.42, -0.26); // NIC at the tower's rear
    }
    return new THREE.Vector3(0.12, 0.20, -0.67); // server NIC at the rear
}

// ---------------------------------------------------------------------------
// Device 3D models -- stylised Cisco hardware: ISR router, Catalyst switch,
// desktop PC, and a 1U rack server. Ports sit on the faces defined in
// portLocalPos() above, so cable anchors and pick markers follow automatically.
// ---------------------------------------------------------------------------

function rounded(w, h, d, color, radius, opts = {}) {
    const geo = new RoundedBoxGeometry(w, h, d, 4, radius);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.45, ...opts }));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}

// Thin flat panel used for face plates and bezels.
function plate(w, h, color, opts = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3, ...opts }));
    m.receiveShadow = true;
    return m;
}

// Unlit glowing dot (LED) -- stays bright regardless of scene lighting.
function led(r, color) {
    return new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color }));
}

// Recessed socket: dark opening inside a thin metallic surround.
function jack(w, h, d, color = 0x05090a, rim = 0x3a4146) {
    const g = new THREE.Group();
    const rimMesh = box(w + 0.05, h + 0.05, d + 0.02, rim);
    const hole = box(w, h, d + 0.03, color);
    rimMesh.add(hole);
    g.add(rimMesh);
    return g;
}

function canvasTexture(w, h, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
}

// "CISCO" branding plate (+ optional model line) drawn to a canvas texture.
function brandPlate(w, h, title, subtitle, opts = {}) {
    const tex = canvasTexture(256, 96, (ctx) => {
        ctx.clearRect(0, 0, 256, 96);
        ctx.textAlign = 'center';
        ctx.fillStyle = opts.fg || '#22d3ee';
        ctx.font = 'bold 46px Arial, Helvetica, sans-serif';
        ctx.fillText(title, 128, 48);
        if (subtitle) {
            ctx.fillStyle = opts.subFg || '#7c868d';
            ctx.font = '20px Arial, Helvetica, sans-serif';
            ctx.fillText(subtitle, 128, 76);
        }
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

// Rack-mount flange with two screw holes (side: -1 left, +1 right).
function rackEar(side, w, h, d, y = 0, color = 0x23272a) {
    const g = new THREE.Group();
    const flange = box(0.06, h, d, color);
    flange.position.set(side * (w / 2 + 0.05), y, 0);
    g.add(flange);
    for (const yy of [-h * 0.22, h * 0.22]) {
        const screw = led(0.018, 0x8a9298);
        screw.position.set(side * (w / 2 + 0.085), y + yy, 0);
        g.add(screw);
    }
    return g;
}

// Row of recessed vent slots along the top of a chassis.
function ventRow(parent, x0, y, z, count, w = 0.10, gap = 0.05, depth = 0.3, color = 0x161a1d) {
    for (let k = 0; k < count; k++) {
        const slot = box(w, 0.015, depth, color);
        slot.position.set(x0 + k * (w + gap), y, z);
        parent.add(slot);
    }
}

// Small link/activity LED above a port; its colour is kept live in _refreshLeds().
function portLed(name, x, y, z) {
    const m = led(0.028, 0x1b2023);
    m.position.set(x, y, z);
    m.userData.portName = name;
    return m;
}

function buildRouterMesh() {
    const g = new THREE.Group();
    const portLeds = [];

    // 1U chassis (ISR 2911-style) + rack ears
    const chassis = rounded(2.5, 0.5, 1.6, 0x2a2e31, 0.05);
    chassis.position.y = 0.28;
    g.add(chassis);
    g.add(rackEar(-1, 2.5, 0.5, 1.6, 0.28));
    g.add(rackEar(1, 2.5, 0.5, 1.6, 0.28));

    // top vents
    ventRow(g, -0.95, 0.535, 0, 12, 0.10, 0.05, 1.2);

    // front bezel
    const bezel = plate(2.42, 0.42, 0x1a1e21);
    bezel.position.set(0, 0.28, 0.805);
    g.add(bezel);

    // status LEDs: PWR, SYS (green) + ACT (amber)
    const status = [led(0.03, 0x22c55e), led(0.03, 0x22c55e), led(0.03, 0xf59e0b)];
    status.forEach((l, i) => { l.position.set(-1.06 + i * 0.09, 0.42, 0.815); g.add(l); });

    // branding
    const brand = brandPlate(0.72, 0.18, 'CISCO', '2911 ISR');
    brand.position.set(0.12, 0.42, 0.815);
    g.add(brand);

    // 3 x GE jacks + 2 x serial WIC jacks
    for (let i = 0; i < 3; i++) {
        const j = jack(0.16, 0.13, 0.03);
        j.position.set(-0.45 + i * 0.40, 0.24, 0.82);
        g.add(j);
        const pl = portLed('G0/' + i, -0.45 + i * 0.40, 0.335, 0.82);
        g.add(pl); portLeds.push(pl);
    }
    for (let i = 0; i < 2; i++) {
        const j = jack(0.20, 0.15, 0.04);
        j.position.set(0.82 + i * 0.30, 0.24, 0.82);
        g.add(j);
        const pl = portLed('S0/0/' + i, 0.82 + i * 0.30, 0.345, 0.82);
        g.add(pl); portLeds.push(pl);
    }

    // rear: power socket + fan grille (decorative)
    const power = jack(0.16, 0.10, 0.02, 0x05090a, 0x2f353a);
    power.position.set(-1.0, 0.22, -0.805);
    g.add(power);
    for (let i = 0; i < 6; i++) {
        const slot = box(0.02, 0.16, 0.02, 0x101417);
        slot.position.set(0.4 + i * 0.16, 0.28, -0.805);
        g.add(slot);
    }

    // feet
    for (const fx of [-0.9, 0.9]) {
        const foot = box(0.16, 0.03, 0.5, 0x0d1012);
        foot.position.set(fx, 0.015, 0);
        g.add(foot);
    }

    g.userData.portLeds = portLeds;
    return g;
}

function buildSwitchMesh() {
    const g = new THREE.Group();
    const portLeds = [];

    // 1U chassis (Catalyst 2960-style) + rack ears
    const chassis = rounded(2.5, 0.44, 1.7, 0x272b2e, 0.04);
    chassis.position.y = 0.25;
    g.add(chassis);
    g.add(rackEar(-1, 2.5, 0.44, 1.7, 0.25));
    g.add(rackEar(1, 2.5, 0.44, 1.7, 0.25));

    // front bezel
    const bezel = plate(2.42, 0.38, 0x1a1e21);
    bezel.position.set(0, 0.26, 0.855);
    g.add(bezel);

    // 24 x 10/100 access ports (2 rows of 12)
    for (let n = 1; n <= 24; n++) {
        const col = (n - 1) % 12;
        const row = n <= 12 ? 0 : 1;
        const x = -0.82 + col * 0.15;
        const y = row === 0 ? 0.16 : 0.34;
        const j = jack(0.10, 0.12, 0.02);
        j.position.set(x, y, 0.87);
        g.add(j);
        const pl = portLed('F0/' + n, x, y + 0.10, 0.87);
        g.add(pl); portLeds.push(pl);
    }

    // 2 x SFP uplinks
    for (let i = 0; i < 2; i++) {
        const x = 0.99 + i * 0.15;
        const j = jack(0.12, 0.13, 0.02, 0x04080a, 0x354048);
        j.position.set(x, 0.25, 0.87);
        g.add(j);
        const pl = portLed('G0/' + (i + 1), x, 0.36, 0.87);
        g.add(pl); portLeds.push(pl);
    }

    // left strip: mode button + status LEDs (decorative)
    const modeBtn = led(0.035, 0x22d3ee);
    modeBtn.position.set(-1.12, 0.42, 0.86);
    g.add(modeBtn);
    [0x22c55e, 0x22c55e, 0x2dd4bf, 0x22c55e].forEach((c, i) => {
        const l = led(0.024, c);
        l.position.set(-1.12, 0.34 - i * 0.07, 0.86);
        g.add(l);
    });

    const brand = brandPlate(0.44, 0.14, 'CISCO', null, { titleSize: 40 });
    brand.position.set(-1.08, 0.07, 0.86);
    g.add(brand);

    // rear vents + power
    ventRow(g, -0.95, 0.475, -0.4, 10, 0.10, 0.05, 0.5);
    const power = jack(0.16, 0.10, 0.02, 0x05090a, 0x2f353a);
    power.position.set(1.0, 0.20, -0.855);
    g.add(power);

    // feet
    for (const fx of [-0.9, 0.9]) {
        const foot = box(0.16, 0.03, 0.6, 0x0d1012);
        foot.position.set(fx, 0.015, 0);
        g.add(foot);
    }

    g.userData.portLeds = portLeds;
    return g;
}

function buildPcMesh() {
    const g = new THREE.Group();
    const portLeds = [];

    // tower case
    const tower = rounded(0.46, 0.82, 0.5, 0x272b2e, 0.03);
    tower.position.set(-0.18, 0.43, 0);
    g.add(tower);

    // front panel: power button, USB, DVD slot
    const power = led(0.025, 0x22c55e);
    power.position.set(-0.18, 0.74, 0.26);
    g.add(power);
    const usb = jack(0.10, 0.05, 0.01, 0x05090a, 0x2f353a);
    usb.position.set(-0.18, 0.56, 0.26);
    g.add(usb);
    const dvd = plate(0.30, 0.03, 0x14171a);
    dvd.position.set(-0.18, 0.62, 0.26);
    g.add(dvd);

    // NIC jack + link LED (rear)
    const nic = jack(0.14, 0.11, 0.02);
    nic.position.set(-0.18, 0.42, -0.26);
    g.add(nic);
    const pl = portLed('eth0', -0.18, 0.50, -0.26);
    g.add(pl); portLeds.push(pl);

    // monitor: bezel + glowing terminal screen
    const bezel = rounded(1.06, 0.66, 0.06, 0x14171a, 0.02);
    bezel.position.set(0.30, 1.46, -0.10);
    g.add(bezel);
    const screenTex = canvasTexture(256, 160, (ctx) => {
        ctx.fillStyle = '#0a1113';
        ctx.fillRect(0, 0, 256, 160);
        ctx.font = '15px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#7c868d';
        ctx.fillText('Microsoft Windows [Version 10.0]', 14, 30);
        ctx.fillStyle = '#2dd4bf';
        ctx.fillText('C:\\> ping 192.168.30.10', 14, 66);
        ctx.fillText('Reply from 192.168.30.10:', 14, 92);
        ctx.fillText('  bytes=32 time<1ms TTL=128', 14, 118);
        ctx.fillStyle = '#22c55e';
        ctx.fillText('C:\\> _', 14, 144);
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.58), new THREE.MeshBasicMaterial({ map: screenTex }));
    screen.position.set(0.30, 1.46, -0.065);
    g.add(screen);

    // stand + base
    const neck = box(0.06, 0.16, 0.06, 0x1c2023);
    neck.position.set(0.30, 1.08, -0.10);
    g.add(neck);
    const base = rounded(0.40, 0.04, 0.22, 0x1c2023, 0.02);
    base.position.set(0.30, 0.02, -0.10);
    g.add(base);

    // keyboard
    const kb = rounded(0.68, 0.035, 0.24, 0x1b1f22, 0.015);
    kb.position.set(0.30, 0.025, 0.18);
    g.add(kb);

    g.userData.portLeds = portLeds;
    return g;
}

function buildServerMesh() {
    const g = new THREE.Group();
    const portLeds = [];

    // 1U chassis + rack ears
    const chassis = rounded(2.0, 0.40, 1.3, 0x2b2f33, 0.04);
    chassis.position.y = 0.21;
    g.add(chassis);
    g.add(rackEar(-1, 2.0, 0.40, 1.3, 0.21));
    g.add(rackEar(1, 2.0, 0.40, 1.3, 0.21));

    // front: 8 drive bays (2 x 4) + activity/power LEDs
    const bezel = plate(1.92, 0.32, 0x1a1e21);
    bezel.position.set(0, 0.21, 0.655);
    g.add(bezel);
    for (let i = 0; i < 8; i++) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const bay = jack(0.14, 0.10, 0.02, 0x05090a, 0x32393e);
        bay.position.set(-0.62 + col * 0.20, row === 0 ? 0.14 : 0.28, 0.66);
        g.add(bay);
    }
    const hdd = led(0.026, 0x2dd4bf);
    hdd.position.set(0.52, 0.32, 0.66);
    g.add(hdd);
    const pwr = led(0.026, 0x22c55e);
    pwr.position.set(0.66, 0.32, 0.66);
    g.add(pwr);

    const brand = brandPlate(0.40, 0.12, 'CISCO', 'UCS', { titleSize: 34 });
    brand.position.set(0.76, 0.14, 0.66);
    g.add(brand);

    // rear: NIC jack + link LED, PSU (decorative)
    const nic = jack(0.14, 0.11, 0.02);
    nic.position.set(0.12, 0.20, -0.66);
    g.add(nic);
    const pl = portLed('eth0', 0.12, 0.28, -0.66);
    g.add(pl); portLeds.push(pl);
    const psu = jack(0.20, 0.12, 0.03, 0x05090a, 0x2f353a);
    psu.position.set(-0.55, 0.16, -0.66);
    g.add(psu);

    // top vents
    ventRow(g, -0.6, 0.415, 0, 9, 0.10, 0.05, 1.0);

    g.userData.portLeds = portLeds;
    return g;
}

function buildDeviceMesh(dev) {
    switch (dev.type) {
        case 'router': return buildRouterMesh();
        case 'switch': return buildSwitchMesh();
        case 'pc': return buildPcMesh();
        case 'server': return buildServerMesh();
        default: return buildPcMesh();
    }
}

export default function practiceLabData() {
    return {
        // ---- reactive UI state ----
        tool: 'select', // select | cable | delete
        deviceList: [],
        linkList: [],
        selectedId: null,
        cli: null, // { devId, mode, output: [{text,cls}], input, history, hi }
        logLines: [],
        cableSrc: null, // { devId, port }
        statusHint: 'Starting the 3D workspace…',
        selectedDetail: null, // reactive inspector snapshot for the selected device

        // ---- non-reactive three/engine state (kept off Alpine) ----
        _state: null,
        _renderer: null,
        _scene: null,
        _camera: null,
        _controls: null,
        _groups: raw(new Map()), // devId -> THREE.Group
        _markers: raw([]), // port marker meshes { devId, port, mesh }
        _cables: raw([]), // { link, mesh, curve }
        _selRing: null,
        _packets: raw([]), // { curve, t, dur, start, color, mesh }
        _lastTime: 0,
        _elapsed: 0,
        _raf: 0,
        _resizeObserver: null,
        _tickErrorReported: false,
        _dirtyCables: true,
        _pointer: { downX: 0, downY: 0, dragging: false, moved: false, dragDevId: null, grabDevId: null },
        _raycaster: raw(new THREE.Raycaster()),
        _ndc: raw(new THREE.Vector2()),
        _ground: raw(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)),

        // -------------------------------------------------------------------
        // Lifecycle
        // -------------------------------------------------------------------

        init() {
            this._state = raw(E.makeState());
            this._lastTime = performance.now();
            // IMPORTANT: defer scene construction. Alpine runs this init()
            // synchronously during the tree walk, before child `x-ref`
            // elements (like x-ref="canvas") are registered. Accessing
            // $refs.canvas here would throw and break the whole component.
            this.$nextTick(() => {
                try {
                    this._buildScene();
                    this._loadSample();
                    this.statusHint = 'Ready — drag a device to move it · drag empty space to orbit · scroll to zoom · right-drag to pan · double-click for its console.';
                    this.logEvent('✅ 3D workspace ready');
                } catch (err) {
                    console.error('[practice-lab] init failed:', err);
                    this.statusHint = '⚠️ Could not start the 3D view (WebGL unavailable?). ' + (err && err.message ? err.message : '');
                    this.logEvent('❌ 3D init failed: ' + (err && err.message ? err.message : err));
                }
            });
        },

        _buildScene() {
            const host = this.$refs.canvas;
            if (!host) throw new Error('canvas host not found');
            const w = host.clientWidth || 800;
            const h = host.clientHeight || 560;

            this._renderer = raw(new THREE.WebGLRenderer({ antialias: true }));
            this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this._renderer.setSize(w, h);
            this._renderer.outputColorSpace = THREE.SRGBColorSpace;
            host.appendChild(this._renderer.domElement);

            this._scene = raw(new THREE.Scene());
            this._scene.background = new THREE.Color(0x0a0c0d);

            this._camera = raw(new THREE.PerspectiveCamera(50, w / h, 0.1, 400));
            this._camera.position.set(14, 14, 20);

            this._controls = raw(new OrbitControls(this._camera, this._renderer.domElement));
            this._controls.target.set(0, 0.5, 0);
            this._controls.enableDamping = true;
            this._controls.dampingFactor = 0.08;
            this._controls.maxPolarAngle = Math.PI / 2 - 0.04;
            this._controls.minDistance = 6;
            this._controls.maxDistance = 80;
            this._controls.update();

            // lights
            const hemi = new THREE.HemisphereLight(0xe9f3f4, 0x1a2226, 0.95);
            this._scene.add(hemi);
            const dir = new THREE.DirectionalLight(0xffffff, 1.6);
            dir.position.set(24, 36, 18);
            dir.castShadow = true;
            dir.shadow.mapSize.set(1024, 1024);
            dir.shadow.camera.left = -40;
            dir.shadow.camera.right = 40;
            dir.shadow.camera.top = 40;
            dir.shadow.camera.bottom = -40;
            this._scene.add(dir);
            this._scene.add(new THREE.AmbientLight(0x1a2226, 0.5));

            // floor
            const floor = new THREE.Mesh(
                new THREE.PlaneGeometry(240, 240),
                new THREE.MeshStandardMaterial({ color: 0x0e1113, roughness: 0.95, metalness: 0.05 }),
            );
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            this._scene.add(floor);

            const grid = new THREE.GridHelper(60, 60, 0x2a3436, 0x171c1e);
            grid.position.y = 0.01;
            this._scene.add(grid);

            // selection ring (flat halo under the selected device)
            this._selRing = raw(new THREE.Mesh(
                new THREE.RingGeometry(1.5, 2.0, 48),
                new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
            ));
            this._selRing.rotation.x = -Math.PI / 2;
            this._selRing.position.y = 0.03;
            this._selRing.visible = false;
            this._scene.add(this._selRing);

            // events
            const dom = this._renderer.domElement;
            dom.addEventListener('pointerdown', (e) => this._onPointerDown(e));
            dom.addEventListener('pointermove', (e) => this._onPointerMove(e));
            dom.addEventListener('pointerup', (e) => this._onPointerUp(e));
            dom.addEventListener('pointercancel', (e) => this._onPointerUp(e));
            dom.addEventListener('dblclick', (e) => this._onDblClick(e));
            window.addEventListener('resize', () => this._onResize());

            // keep the renderer sized to its container (e.g. when the CLI
            // console opens/closes and resizes the canvas area)
            if (window.ResizeObserver) {
                this._resizeObserver = raw(new ResizeObserver(() => this._onResize()));
                this._resizeObserver.observe(host);
            }

            const loop = () => {
                this._raf = requestAnimationFrame(loop);
                try {
                    this._tick();
                } catch (err) {
                    // Report a render-loop crash once instead of throwing every frame.
                    if (!this._tickErrorReported) {
                        this._tickErrorReported = true;
                        console.error('[practice-lab] render error:', err);
                        this.logEvent('❌ render error: ' + (err && err.message ? err.message : err));
                        this.statusHint = '⚠️ Render error: ' + (err && err.message ? err.message : err);
                    }
                }
            };
            loop();
        },

        _onResize() {
            const host = this.$refs.canvas;
            if (!host || !this._renderer || !this._camera) return;
            const w = host.clientWidth || 800;
            const h = host.clientHeight || 560;
            this._camera.aspect = w / h;
            this._camera.updateProjectionMatrix();
            this._renderer.setSize(w, h);
        },

        _setNdc(e) {
            const rect = this._renderer.domElement.getBoundingClientRect();
            this._ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this._ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        },

        _raycast(objects, recursive, e) {
            this._setNdc(e);
            this._raycaster.setFromCamera(this._ndc, this._camera);
            return this._raycaster.intersectObjects(objects, recursive);
        },

        // -------------------------------------------------------------------
        // Pointer interaction
        // -------------------------------------------------------------------

        _onPointerDown(e) {
            const p = this._pointer;
            p.downX = e.clientX;
            p.downY = e.clientY;
            p.moved = false;
            p.dragging = false;
            p.dragDevId = null;
            p.grabDevId = null;

            // In select mode, if the press starts on a device, remember it so
            // a drag moves the device instead of orbiting the camera.
            if (this.tool === 'select' && e.button === 0) {
                const hit = this._raycast(this._deviceGroups(), true, e);
                const id = hit.length ? this._deviceIdFromHit(hit[0].object) : null;
                if (id) {
                    p.grabDevId = id;
                    // Take the pointer over from OrbitControls for this drag.
                    if (this._controls) this._controls.enabled = false;
                }
            }
        },

        _onPointerMove(e) {
            const p = this._pointer;
            if (e.buttons & 1) {
                const dx = e.clientX - p.downX;
                const dy = e.clientY - p.downY;
                if (!p.moved && Math.hypot(dx, dy) > 4) p.moved = true;

                // Dragging a device (grab started on it) moves it; dragging
                // empty space is left to OrbitControls for camera rotation.
                if (p.grabDevId) {
                    if (!p.dragging && p.moved) {
                        p.dragging = true;
                        p.dragDevId = p.grabDevId;
                        this.selectDevice(p.dragDevId);
                    }
                    if (p.dragging && p.dragDevId) {
                        this._dragDevice(p.dragDevId, e);
                    }
                }
            }
        },

        _onPointerUp(e) {
            const p = this._pointer;
            const wasDrag = p.moved && p.dragging;

            // Give the camera back to OrbitControls.
            if (this._controls) this._controls.enabled = true;

            if (wasDrag) {
                p.dragging = false;
                p.dragDevId = null;
                p.grabDevId = null;
                return;
            }

            // plain click
            if (this.tool === 'delete') {
                const hit = this._raycast(this._deviceGroups(), true, e);
                const id = hit.length ? this._deviceIdFromHit(hit[0].object) : null;
                if (id) this.deleteDevice(id);
            } else if (this.tool === 'cable') {
                this._pickCableEnd(e);
            } else {
                const hit = this._raycast(this._deviceGroups(), true, e);
                const id = hit.length ? this._deviceIdFromHit(hit[0].object) : null;
                if (id) this.selectDevice(id);
            }
            p.grabDevId = null;
        },

        _onDblClick(e) {
            const hit = this._raycast(this._deviceGroups(), true, e);
            const id = hit.length ? this._deviceIdFromHit(hit[0].object) : null;
            if (id) {
                this.selectDevice(id);
                this.openConsole(id);
            }
        },

        _deviceGroups() {
            return Array.from(this._groups.values());
        },

        // Walk up the hit object's ancestors to find the device group id.
        _deviceIdFromHit(obj) {
            let o = obj;
            while (o) {
                if (o.userData && o.userData.deviceId) return o.userData.deviceId;
                o = o.parent;
            }
            return null;
        },

        _groundPoint(e) {
            this._setNdc(e);
            this._raycaster.setFromCamera(this._ndc, this._camera);
            const out = new THREE.Vector3();
            return this._raycaster.ray.intersectPlane(this._ground, out) ? out : null;
        },

        _dragDevice(devId, e) {
            const pos = this._groundPoint(e);
            if (!pos) return;
            const dev = E.getDevice(this._state, devId);
            dev.x = pos.x;
            dev.z = pos.z;
            const g = this._groups.get(devId);
            if (g) g.position.set(dev.x, 0, dev.z);
            this._dirtyCables = true;
        },

        // -------------------------------------------------------------------
        // Cable picking
        // -------------------------------------------------------------------

        _pickCableEnd(e) {
            this._setNdc(e);
            this._raycaster.setFromCamera(this._ndc, this._camera);
            const visibleMarkers = this._markers.filter((m) => m.mesh.visible);
            const hits = this._raycaster.intersectObjects(visibleMarkers.map((m) => m.mesh), false);
            if (!hits.length) return;
            const data = hits[0].object.userData;

            if (!this.cableSrc) {
                this.cableSrc = { devId: data.deviceId, port: data.portName };
                this._refreshMarkers();
                this.statusHint = `Cable source: ${this._devLabel(data.deviceId)} port ${data.portName} — now click the target port.`;
                return;
            }

            // completing a cable
            const src = this.cableSrc;
            this.cableSrc = null;
            if (src.devId === data.deviceId) {
                this.statusHint = 'A cable needs two different devices.';
                this._refreshMarkers();
                return;
            }
            const ok = E.addLink(this._state, src.devId, src.port, data.deviceId, data.portName);
            if (ok) {
                this.logEvent(`🔌 cable connected: ${this._devLabel(src.devId)}[${src.port}] ⇄ ${this._devLabel(data.deviceId)}[${data.portName}]`);
                this.statusHint = 'Cable added. Switch ports come up; router/PC ports need `no shutdown`.';
            }
            this._syncAfterStateChange();
        },

        // -------------------------------------------------------------------
        // Device management
        // -------------------------------------------------------------------

        addDevice(type) {
            // place at a pseudo-random free spot near the center
            const spread = 6;
            const x = (Math.random() * 2 - 1) * spread;
            const z = (Math.random() * 2 - 1) * spread;
            const dev = E.makeDevice(type, { router: 'Router', switch: 'Switch', pc: 'PC', server: 'Server' }[type]);
            dev.x = x;
            dev.z = z;
            this._state.devices.push(dev);
            this._addDeviceMesh(dev);
            this._syncAfterStateChange();
            this.selectDevice(dev.id);
            this.logEvent(`➕ added ${dev.name} (${dev.id.toUpperCase()})`);
        },

        deleteDevice(devId) {
            const dev = E.getDevice(this._state, devId);
            if (!dev) return;
            E.removeDevice(this._state, devId);
            const g = this._groups.get(devId);
            if (g) {
                this._scene.remove(g);
                this._disposeGroup(g);
                this._groups.delete(devId);
            }
            this._markers = raw(this._markers.filter((m) => m.devId !== devId));
            if (this.selectedId === devId) this.selectedId = null;
            this.logEvent(`🗑 deleted ${dev.name} (${devId.toUpperCase()})`);
            this._syncAfterStateChange();
        },

        selectDevice(devId) {
            this.selectedId = devId;
            const g = this._groups.get(devId);
            if (g && this._selRing) {
                this._selRing.visible = true;
                this._selRing.position.set(g.position.x, 0.03, g.position.z);
            } else if (this._selRing) {
                this._selRing.visible = false;
            }
            this._refreshDetail();
        },

        _devLabel(devId) {
            const d = E.getDevice(this._state, devId);
            return d ? `${d.hostname || d.name}` : devId;
        },

        _addDeviceMesh(dev) {
            const mesh = buildDeviceMesh(dev);
            mesh.userData.deviceId = dev.id;
            mesh.position.set(dev.x, 0, dev.z);
            // port markers (for cable mode) — hidden by default; virtual
            // interfaces (loopback / SVI / subinterface) have no physical jack.
            for (const p of dev.ports) {
                if (p.kind === 'loopback' || p.kind === 'svi' || p.kind === 'subinterface') continue;
                const pos = portLocalPos(dev, p.name);
                const marker = new THREE.Mesh(
                    new THREE.SphereGeometry(0.16, 16, 12),
                    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85 }),
                );
                marker.position.copy(pos);
                marker.userData.deviceId = dev.id;
                marker.userData.portName = p.name;
                marker.visible = false;
                mesh.add(marker);
                this._markers.push({ devId: dev.id, port: p.name, mesh: marker });
            }
            this._scene.add(mesh);
            this._groups.set(dev.id, mesh);
        },

        _disposeGroup(g) {
            g.traverse((o) => {
                if (o.geometry) o.geometry.dispose();
                if (o.material) {
                    if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
                    else o.material.dispose();
                }
            });
        },

        _rebuildScene() {
            // remove all device groups + cables, then re-add from state
            for (const g of this._groups.values()) {
                this._scene.remove(g);
                this._disposeGroup(g);
            }
            this._groups.clear();
            this._markers = raw([]);
            for (const dev of this._state.devices) this._addDeviceMesh(dev);
            this._dirtyCables = true;
        },

        // -------------------------------------------------------------------
        // Cables
        // -------------------------------------------------------------------

        _linkCurve(link) {
            const ga = this._groups.get(link.a.devId);
            const gb = this._groups.get(link.b.devId);
            const da = E.getDevice(this._state, link.a.devId);
            const db = E.getDevice(this._state, link.b.devId);
            if (!ga || !gb || !da || !db) return null;
            ga.updateWorldMatrix(true, false);
            gb.updateWorldMatrix(true, false);
            const pa = ga.localToWorld(portLocalPos(da, link.a.port).clone());
            const pb = gb.localToWorld(portLocalPos(db, link.b.port).clone());
            const mid = pa.clone().add(pb).multiplyScalar(0.5);
            mid.y += Math.min(3.5, pa.distanceTo(pb) * 0.18 + 0.5);
            return new THREE.QuadraticBezierCurve3(pa, mid, pb);
        },

        _cableColor(link) {
            const up = E.linkUp(this._state, link);
            const a = E.getPort(E.getDevice(this._state, link.a.devId), link.a.port);
            const b = E.getPort(E.getDevice(this._state, link.b.devId), link.b.port);
            if (up) return 0x22c55e;
            if (a && b && (!a.up || !b.up)) return 0xf59e0b; // administratively down
            return 0xef4444;
        },

        _rebuildCables() {
            for (const c of this._cables) {
                this._scene.remove(c.mesh);
                c.mesh.geometry.dispose();
                c.mesh.material.dispose();
            }
            this._cables = raw([]);
            for (const link of this._state.links) {
                const curve = this._linkCurve(link);
                if (!curve) continue;
                const geo = new THREE.TubeGeometry(curve, 24, 0.055, 8, false);
                const mat = new THREE.MeshBasicMaterial({ color: this._cableColor(link) });
                const mesh = new THREE.Mesh(geo, mat);
                this._scene.add(mesh);
                this._cables.push({ link, mesh, curve });
            }
            this._dirtyCables = false;
        },

        _refreshMarkers() {
            for (const m of this._markers) {
                m.mesh.visible = this.tool === 'cable';
                const isSrc = this.cableSrc && this.cableSrc.devId === m.devId
                    && E.normalizePort(this.cableSrc.port) === E.normalizePort(m.port);
                m.mesh.material.color.set(isSrc ? 0x22c55e : 0x22d3ee);
            }
        },

        // -------------------------------------------------------------------
        // Packets
        // -------------------------------------------------------------------

        spawnPackets(result) {
            const pushPath = (path, color) => {
                for (let i = 0; i < path.length - 1; i++) {
                    const link = E.findLink(this._state, path[i], path[i + 1]);
                    if (!link) continue;
                    const curve = this._linkCurve(link);
                    if (!curve) continue;
                    const mesh = new THREE.Mesh(
                        new THREE.SphereGeometry(0.16, 16, 12),
                        new THREE.MeshBasicMaterial({ color }),
                    );
                    this._scene.add(mesh);
                    this._packets.push({
                        curve, mesh, color, t: 0,
                        dur: 0.34, start: this._elapsed + this._packets.length * 0.16,
                    });
                }
            };
            pushPath(result.trace.request, 0xffd166);
            pushPath(result.trace.reply, 0x5eead4);
        },

        _tickPackets(dt) {
            const now = this._elapsed;
            const keep = [];
            for (const p of this._packets) {
                if (now < p.start) { keep.push(p); continue; }
                p.t += dt / p.dur;
                if (p.t >= 1) {
                    this._scene.remove(p.mesh);
                    p.mesh.geometry.dispose();
                    p.mesh.material.dispose();
                    continue;
                }
                const pt = p.curve.getPoint(Math.min(1, p.t));
                p.mesh.position.copy(pt);
                keep.push(p);
            }
            this._packets = raw(keep);
        },

        // -------------------------------------------------------------------
        // Console (CLI)
        // -------------------------------------------------------------------

        openConsole(devId) {
            const dev = E.getDevice(this._state, devId);
            if (!dev) return;
            const mode = dev.type === 'pc' || dev.type === 'server' ? 'pc' : 'user';
            this.cli = {
                devId,
                mode,
                input: '',
                history: [],
                hi: -1,
                prompt: null,
                output: this._greeting(dev, mode),
            };
            this.$nextTick(() => this.$refs.cliInput?.focus());
        },

        closeConsole() {
            this.cli = null;
        },

        _greeting(dev, mode) {
            const name = dev.hostname || dev.name;
            if (mode === 'pc') {
                return [
                    { text: 'Microsoft Windows [Version 10.0.19045]', cls: 'text-zinc-300' },
                    { text: '(c) Microsoft Corporation. All rights reserved.', cls: 'text-zinc-500' },
                    { text: '', cls: '' },
                    { text: 'C:\\>', cls: 'text-green-400' },
                ];
            }
            return [
                { text: `Cisco IOS Software, Practice Lab Simulator`, cls: 'text-zinc-300' },
                { text: `${name} con0 is now available`, cls: 'text-zinc-500' },
                { text: '', cls: '' },
                { text: `${name}>`, cls: 'text-green-400' },
            ];
        },

        get cliPrompt() {
            if (!this.cli) return '';
            const dev = E.getDevice(this._state, this.cli.devId);
            const name = dev ? dev.hostname || dev.name : '?';
            if (dev && (dev.type === 'pc' || dev.type === 'server')) return 'C:\\>';
            // interactive prompts take over the prompt line
            if (this.cli.prompt) {
                if (this.cli.prompt.kind === 'password') return 'Password: ';
                if (this.cli.prompt.kind === 'confirm') return 'Continue? [confirm] ';
                return '';
            }
            return C.promptFor(dev, this.cli.mode);
        },

        // Echo the in-progress input; masks password prompts.
        get cliInputEcho() {
            if (!this.cli) return '';
            if (this.cli.prompt && this.cli.prompt.kind === 'password') {
                return '•'.repeat(this.cli.input.length);
            }
            return this.cli.input;
        },

        get cliTitle() {
            if (!this.cli) return 'Console';
            const d = this.deviceList.find((x) => x.id === this.cli.devId);
            return 'Console — ' + (d ? d.name : this.cli.devId);
        },

        cliSubmit() {
            if (!this.cli) return;
            const raw = this.cli.input;
            this.cli.input = '';
            const dev = E.getDevice(this._state, this.cli.devId);
            const promptText = this.cliPrompt;
            const isPassword = this.cli.prompt && this.cli.prompt.kind === 'password';
            const echo = isPassword ? '•'.repeat(Math.min(raw.length, 12)) : raw;

            this.cli.output.push({ text: promptText + ' ' + echo, cls: 'text-zinc-200' });
            if (raw.trim()) {
                this.cli.history.push(raw);
                this.cli.hi = this.cli.history.length;
            }

            const res = this.cli.prompt
                ? C.executePrompt(this._state, dev, this.cli.mode, this.cli.prompt, raw)
                : C.execute(this._state, dev, this.cli.mode, raw);
            for (const line of res.lines) {
                if (line === '\u0000CLEAR') {
                    this.cli.output = [];
                    continue;
                }
                this.cli.output.push({ text: line, cls: this._cliClass(line) });
            }
            this.cli.mode = res.mode;
            this.cli.prompt = res.prompt || null;

            for (const ev of res.events) {
                if (ev.type === 'ping') {
                    this.spawnPackets(ev.result);
                    this.logPing(ev.result);
                } else if (ev.type === 'config-changed') {
                    this._dirtyCables = true;
                } else if (ev.type === 'reload') {
                    this.logEvent('🔁 ' + this._devLabel(ev.devId) + ' reloaded');
                }
            }
            this._refreshLists();
            this.$nextTick(() => this._scrollCli());
        },

        _cliClass(line) {
            if (/no route|unreachable|expired|dropped|timeout|not recognized|Invalid|down/.test(line)) return 'text-rose-400';
            if (/delivered|OK|complete|reply/.test(line)) return 'text-emerald-400';
            if (line.startsWith('%')) return 'text-amber-400';
            return 'text-zinc-300';
        },

        cliKeydown(e) {
            if (!this.cli) return;
            if (e.key === 'Enter') { e.preventDefault(); this.cliSubmit(); }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.cli.hi > 0) {
                    this.cli.hi -= 1;
                    this.cli.input = this.cli.history[this.cli.hi] || '';
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.cli.hi < this.cli.history.length - 1) {
                    this.cli.hi += 1;
                    this.cli.input = this.cli.history[this.cli.hi] || '';
                } else {
                    this.cli.hi = this.cli.history.length;
                    this.cli.input = '';
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
            } else if (e.key === 'c' && e.ctrlKey) {
                this.cli.input = '';
            }
        },

        _scrollCli() {
            const el = this.$refs.cliScroll;
            if (el) el.scrollTop = el.scrollHeight;
        },

        // -------------------------------------------------------------------
        // Log
        // -------------------------------------------------------------------

        logEvent(text) {
            this.logLines.unshift(`[${this._time()}] ${text}`);
            if (this.logLines.length > 200) this.logLines.length = 200;
        },

        logPing(result) {
            if (result.ok) {
                this.logEvent(`✅ ping succeeded (${result.trace.request.length - 1} hop${result.trace.request.length - 1 === 1 ? '' : 's'})`);
            } else {
                const last = result.log[result.log.length - 1] || 'ping failed';
                this.logEvent(`❌ ${last}`);
            }
        },

        _time() {
            const d = new Date();
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        },

        // -------------------------------------------------------------------
        // Sync helpers
        // -------------------------------------------------------------------

        _refreshLists() {
            this.deviceList = this._state.devices.map((d) => ({
                id: d.id,
                name: d.hostname || d.name,
                type: d.type,
                icon: { router: '🖧', switch: '🔀', pc: '🖥', server: '🗄' }[d.type] || '▪',
                upPorts: d.ports.filter((p) => p.up).length,
                totalPorts: d.ports.length,
            }));
            this.linkList = this._state.links.map((l) => ({
                id: l.id,
                up: E.linkUp(this._state, l),
                a: `${this._devLabel(l.a.devId)} · ${l.a.port}`,
                b: `${this._devLabel(l.b.devId)} · ${l.b.port}`,
            }));
            this._refreshDetail();
        },

        // Snapshot of the selected device: interfaces, routing table, VLANs, neighbours.
        _refreshDetail() {
            if (!this.selectedId) { this.selectedDetail = null; return; }
            const dev = E.getDevice(this._state, this.selectedId);
            if (!dev) { this.selectedDetail = null; return; }
            const isL3 = dev.type === 'router' || dev.type === 'pc' || dev.type === 'server';
            const ports = dev.ports.filter((p) => {
                if (dev.type === 'switch') {
                    if (p.kind === 'svi') return Boolean(p.ip);
                    if (p.mode === 'trunk') return true;
                    return p.up || (p.accessVlan && p.accessVlan !== 1);
                }
                return true;
            });
            this.selectedDetail = {
                id: dev.id,
                name: dev.hostname || dev.name,
                type: dev.type,
                icon: { router: '🖧', switch: '🔀', pc: '🖥', server: '🗄' }[dev.type] || '▪',
                interfaces: ports.map((p) => {
                    const ip = p.ip
                        ? p.ip + '/' + E.prefixLen(p.mask)
                        : (p.ipv6 ? p.ipv6 + '/' + (p.ipv6Prefix || 64) : '—');
                    const up = Boolean(p.up) && E.lineProtocolUp(this._state, dev, p);
                    let tag = '';
                    if (p.kind === 'subinterface') tag = '802.1Q ' + p.dot1q;
                    else if (p.mode === 'trunk') tag = 'trunk';
                    else if (p.kind === 'serial' && p.clockRate) tag = 'DCE';
                    return { name: C.portLongName(p.name), ip, up, tag };
                }),
                routes: (isL3 ? E.routesOf(dev) : []).map((r) => ({
                    code: r.type,
                    prefix: r.net + '/' + r.prefix,
                    via: r.nextHop || (r.egress ? C.portLongName(r.egress) : '—'),
                })),
                vlans: dev.type === 'switch' && dev.vlans
                    ? dev.vlans.map((v) => ({ id: v.id, name: v.name }))
                    : [],
                neighbors: (E.cdpNeighbors(this._state, dev) || []).map((n) => n.deviceId + ' via ' + C.portLongName(n.localInterface)),
            };
        },

        _syncAfterStateChange() {
            E.bindState(this._state);
            this._refreshMarkers();
            this._rebuildCables();
            this._refreshLists();
            if (this.selectedId) this.selectDevice(this.selectedId);
        },

        // -------------------------------------------------------------------
        // Toolbar actions
        // -------------------------------------------------------------------

        setTool(tool) {
            this.tool = tool;
            this.cableSrc = null;
            this._refreshMarkers();
            this.statusHint = {
                select: 'Drag a device to move it · drag empty space to orbit · scroll to zoom · right-drag to pan · double-click to open console.',
                cable: 'Click a port on the first device, then a port on the second device to connect them.',
                delete: 'Click a device to delete it (its cables are removed too).',
            }[tool];
        },

        loadSample() {
            this._loadSample();
        },

        // A realistic CCNA topology: two VLANs on a trunk to a router-on-a-stick,
        // a serial WAN link (DCE), OSPF area 0, and an end-to-end ping path.
        _loadSample() {
            this._state = raw(E.makeState());
            this._rebuildScene();
            this.logLines = [];
            this.selectedId = null;
            this.cableSrc = null;
            this.selectedDetail = null;
            this.cli = null;

            const S = this._state;
            const mk = (t, n, x, z) => {
                const d = E.makeDevice(t, n);
                d.x = x; d.z = z;
                S.devices.push(d);
                return d;
            };
            const setIp = (dev, port, ip, mask) => {
                const p = E.getPort(dev, port);
                p.ip = ip; p.mask = mask; p.up = true;
            };

            const PC1 = mk('pc', 'PC1', -10, 1.6);
            const PC2 = mk('pc', 'PC2', -10, -2.2);
            const SW1 = mk('switch', 'SW1', -6.5, 0);
            const R1 = mk('router', 'R1', -2.2, 0);
            const R2 = mk('router', 'R2', 2.2, 0);
            const SRV = mk('server', 'Server1', 6.5, 0);

            // ---- VLANs on SW1 ----
            E.ensureVlan(SW1, 10, 'SALES');
            E.ensureVlan(SW1, 20, 'ENGINEERING');
            const swF1 = E.getPort(SW1, 'F0/1'); swF1.mode = 'access'; swF1.accessVlan = 10; swF1.up = true;
            const swF2 = E.getPort(SW1, 'F0/2'); swF2.mode = 'access'; swF2.accessVlan = 20; swF2.up = true;
            const swG1 = E.getPort(SW1, 'G0/1'); swG1.mode = 'trunk'; swG1.up = true;

            // ---- Router-on-a-stick on R1 ----
            E.getPort(R1, 'G0/1').up = true;
            for (const [sub, vlan, ip] of [['G0/1.10', 10, '192.168.10.1'], ['G0/1.20', 20, '192.168.20.1']]) {
                const p = E.addSubinterface(R1, sub, vlan);
                p.encapsulation = 'dot1q';
                p.ip = ip; p.mask = '255.255.255.0'; p.up = true;
            }
            const r1s = E.getPort(R1, 'S0/0/0');
            r1s.ip = '10.0.12.1'; r1s.mask = '255.255.255.252'; r1s.clockRate = 64000; r1s.up = true;

            // ---- R2 + server LAN ----
            const r2s = E.getPort(R2, 'S0/0/0');
            r2s.ip = '10.0.12.2'; r2s.mask = '255.255.255.252'; r2s.up = true;
            setIp(R2, 'G0/0', '192.168.30.1', '255.255.255.0');

            // ---- OSPF area 0 ----
            R1.ospf = { pid: 1, routerId: '1.1.1.1', networks: [
                { net: '192.168.10.0', wildcard: '0.0.0.255', area: '0' },
                { net: '192.168.20.0', wildcard: '0.0.0.255', area: '0' },
                { net: '10.0.12.0', wildcard: '0.0.0.3', area: '0' },
            ], passive: [] };
            R2.ospf = { pid: 1, routerId: '2.2.2.2', networks: [
                { net: '10.0.12.0', wildcard: '0.0.0.3', area: '0' },
                { net: '192.168.30.0', wildcard: '0.0.0.255', area: '0' },
            ], passive: [] };

            // ---- end hosts ----
            setIp(PC1, 'eth0', '192.168.10.10', '255.255.255.0'); PC1.gateway = '192.168.10.1';
            setIp(PC2, 'eth0', '192.168.20.10', '255.255.255.0'); PC2.gateway = '192.168.20.1';
            setIp(SRV, 'eth0', '192.168.30.10', '255.255.255.0'); SRV.gateway = '192.168.30.1';

            E.addLink(S, PC1.id, 'eth0', SW1.id, 'F0/1');
            E.addLink(S, PC2.id, 'eth0', SW1.id, 'F0/2');
            E.addLink(S, SW1.id, 'G0/1', R1.id, 'G0/1');
            E.addLink(S, R1.id, 'S0/0/0', R2.id, 'S0/0/0');
            E.addLink(S, R2.id, 'G0/0', SRV.id, 'eth0');

            E.bindState(S);
            this._rebuildScene();
            this._syncAfterStateChange();
            this.logEvent('🏗 Loaded sample: PC1/PC2 (VLANs 10+20) ⇄ SW1 trunk ⇄ R1 (802.1Q) ⇄ serial ⇄ R2 ⇄ Server1 — OSPF area 0');
            this.logEvent('💡 Try: open PC1 and type  ping 192.168.30.10');
        },

        clearAll() {
            this._state = raw(E.makeState());
            this._rebuildScene();
            this._syncAfterStateChange();
            this.selectedId = null;
            this.selectedDetail = null;
            this.cli = null;
            this.cableSrc = null;
            this.logLines = [];
            this.logEvent('🧹 Workspace cleared.');
            this.statusHint = 'Add devices from the palette to start building.';
        },

        // Update per-port link LEDs: green when the port's line protocol is up.
        _refreshLeds() {
            for (const g of this._groups.values()) {
                const leds = g.userData.portLeds;
                const dev = E.getDevice(this._state, g.userData.deviceId);
                if (!leds || !dev) continue;
                for (const m of leds) {
                    const port = E.getPort(dev, m.userData.portName);
                    const up = port ? E.lineProtocolUp(this._state, dev, port) : false;
                    m.material.color.set(up ? 0x22c55e : 0x1b2023);
                }
            }
        },

        // -------------------------------------------------------------------
        // Render loop
        // -------------------------------------------------------------------

        _tick() {
            const now = performance.now();
            const dt = Math.min((now - this._lastTime) / 1000, 0.1);
            this._lastTime = now;
            this._elapsed += dt;
            if (this._dirtyCables) this._rebuildCables();
            this._tickPackets(dt);
            this._refreshLeds();
            this._controls.update();

            // keep selection ring glued to the selected device
            if (this._selRing.visible && this.selectedId) {
                const g = this._groups.get(this.selectedId);
                if (g) this._selRing.position.set(g.position.x, 0.03, g.position.z);
            }
            // tiny idle pulse on device LEDs? (kept simple)

            this._renderer.render(this._scene, this._camera);
        },

        destroy() {
            cancelAnimationFrame(this._raf);
            if (this._resizeObserver) this._resizeObserver.disconnect();
            if (this._renderer) this._renderer.dispose();
        },
    };
}
