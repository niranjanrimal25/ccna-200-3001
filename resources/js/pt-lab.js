// pt-lab.js — interactive 3D practice lab (Packet-Tracer style) built on
// Three.js + the pure pt-engine/pt-cli modules. Exported as an Alpine
// component via `practiceLabData`.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as E from './pt-engine.js';
import * as C from './pt-cli.js';

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
    const idx = dev.ports.findIndex((p) => E.normalizePort(p.name) === E.normalizePort(portName));
    const n = dev.ports.length;
    const i = idx < 0 ? 0 : idx;
    const t = dev.type;
    let x = 0;
    let y = 0;
    let z = 0;
    if (t === 'router') {
        const span = n <= 1 ? 0 : Math.min(2.2, (n - 1) * 0.75);
        x = n <= 1 ? 0 : -span / 2 + i * (span / (n - 1));
        y = 1.06;
        z = -1.02;
    } else if (t === 'switch') {
        const span = n <= 1 ? 0 : Math.min(2.0, (n - 1) * 0.6);
        x = n <= 1 ? 0 : -span / 2 + i * (span / (n - 1));
        y = 0.98;
        z = -0.92;
    } else if (t === 'pc') {
        x = 0; y = 0.9; z = -0.32;
    } else { // server
        x = 0; y = 1.32; z = -0.62;
    }
    return new THREE.Vector3(x, y, z);
}

// ---------------------------------------------------------------------------
// Device 3D models
// ---------------------------------------------------------------------------

function ledStrip(parent, x0, y, z, count, color) {
    for (let k = 0; k < count; k++) {
        const led = box(0.06, 0.06, 0.02, 0x0b0e12);
        led.position.set(x0 + k * 0.18, y, z);
        parent.add(led);
    }
}

function buildRouterMesh() {
    const g = new THREE.Group();
    const body = box(3.2, 0.62, 2.0, 0x23272f);
    body.position.y = 0.62;
    g.add(body);
    const lid = box(3.05, 0.26, 1.9, 0x3a414d);
    lid.position.y = 1.06;
    g.add(lid);
    // vent ridges on lid
    for (let k = -2; k <= 2; k++) {
        const vent = box(2.4, 0.04, 0.06, 0x1a1e24);
        vent.position.set(0, 1.21, k * 0.3);
        g.add(vent);
    }
    // front face
    const face = box(3.2, 0.22, 0.04, 0x171a20);
    face.position.set(0, 0.84, 1.0);
    g.add(face);
    ledStrip(g, -1.3, 0.95, 1.03, 8, 0x2dd4bf);
    // brand
    const brand = box(0.9, 0.12, 0.02, 0x0ea5e9);
    brand.position.set(1.0, 0.62, 1.01);
    g.add(brand);
    g.userData.bodyCenterY = 0.62;
    return g;
}

function buildSwitchMesh() {
    const g = new THREE.Group();
    const body = box(2.6, 0.58, 1.7, 0x243349);
    body.position.y = 0.56;
    g.add(body);
    const lid = box(2.46, 0.22, 1.6, 0x33465e);
    lid.position.y = 0.96;
    g.add(lid);
    const face = box(2.6, 0.2, 0.04, 0x141b26);
    face.position.set(0, 0.78, 0.86);
    g.add(face);
    ledStrip(g, -1.0, 0.88, 0.89, 10, 0x22d3ee);
    return g;
}

function buildPcMesh() {
    const g = new THREE.Group();
    // tower
    const tower = box(0.5, 1.05, 0.55, 0x2c313a);
    tower.position.set(0, 0.53, 0);
    g.add(tower);
    const power = box(0.1, 0.1, 0.02, 0x22c55e);
    power.position.set(0, 0.95, 0.28);
    g.add(power);
    // monitor stand + panel
    const stand = box(0.12, 0.35, 0.12, 0x20242b);
    stand.position.set(0.32, 1.22, -0.05);
    g.add(stand);
    const screen = box(1.05, 0.66, 0.06, 0x0b0e12);
    screen.position.set(0.32, 1.62, -0.08);
    g.add(screen);
    const glow = box(0.93, 0.54, 0.02, 0x134e4a);
    glow.position.set(0.32, 1.62, -0.05);
    g.add(glow);
    return g;
}

function buildServerMesh() {
    const g = new THREE.Group();
    const body = box(0.7, 1.9, 1.1, 0x3a3f47);
    body.position.y = 0.95;
    g.add(body);
    const face = box(0.72, 1.86, 0.04, 0x1b1e23);
    face.position.set(0, 0.95, 0.56);
    g.add(face);
    ledStrip(g, -0.2, 1.6, 0.59, 3, 0x34d399);
    const badge = box(0.4, 0.14, 0.02, 0x0ea5e9);
    badge.position.set(0, 0.3, 0.59);
    g.add(badge);
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

// ---------------------------------------------------------------------------
// Alpine component
// ---------------------------------------------------------------------------

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

        // ---- non-reactive three/engine state (kept off Alpine) ----
        _state: null,
        _renderer: null,
        _scene: null,
        _camera: null,
        _controls: null,
        _groups: new Map(), // devId -> THREE.Group
        _markers: [], // port marker meshes { devId, port, mesh }
        _cables: [], // { link, mesh, curve }
        _selRing: null,
        _packets: [], // { curve, t, dur, start, color, mesh }
        _lastTime: 0,
        _elapsed: 0,
        _raf: 0,
        _resizeObserver: null,
        _tickErrorReported: false,
        _dirtyCables: true,
        _pointer: { downX: 0, downY: 0, dragging: false, moved: false, dragDevId: null },
        _raycaster: new THREE.Raycaster(),
        _ndc: new THREE.Vector2(),
        _ground: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),

        // -------------------------------------------------------------------
        // Lifecycle
        // -------------------------------------------------------------------

        init() {
            this._state = E.makeState();
            this._lastTime = performance.now();
            // IMPORTANT: defer scene construction. Alpine runs this init()
            // synchronously during the tree walk, before child `x-ref`
            // elements (like x-ref="canvas") are registered. Accessing
            // $refs.canvas here would throw and break the whole component.
            this.$nextTick(() => {
                try {
                    this._buildScene();
                    this._loadSample();
                    this.statusHint = 'Ready — drag empty space to orbit · scroll to zoom · right-drag to pan · double-click a device for its console.';
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

            this._renderer = new THREE.WebGLRenderer({ antialias: true });
            this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this._renderer.setSize(w, h);
            this._renderer.outputColorSpace = THREE.SRGBColorSpace;
            host.appendChild(this._renderer.domElement);

            this._scene = new THREE.Scene();
            this._scene.background = new THREE.Color(0x0b1220);

            this._camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 400);
            this._camera.position.set(14, 14, 20);

            this._controls = new OrbitControls(this._camera, this._renderer.domElement);
            this._controls.target.set(0, 0.5, 0);
            this._controls.enableDamping = true;
            this._controls.dampingFactor = 0.08;
            this._controls.maxPolarAngle = Math.PI / 2 - 0.04;
            this._controls.minDistance = 6;
            this._controls.maxDistance = 80;
            this._controls.update();

            // lights
            const hemi = new THREE.HemisphereLight(0xffffff, 0x223047, 0.95);
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
            this._scene.add(new THREE.AmbientLight(0x223047, 0.5));

            // floor
            const floor = new THREE.Mesh(
                new THREE.PlaneGeometry(240, 240),
                new THREE.MeshStandardMaterial({ color: 0x0d1520, roughness: 0.95, metalness: 0.05 }),
            );
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            this._scene.add(floor);

            const grid = new THREE.GridHelper(60, 60, 0x2f4058, 0x18222f);
            grid.position.y = 0.01;
            this._scene.add(grid);

            // selection ring (flat halo under the selected device)
            this._selRing = new THREE.Mesh(
                new THREE.RingGeometry(1.5, 2.0, 48),
                new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
            );
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
                this._resizeObserver = new ResizeObserver(() => this._onResize());
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
            this._pointer.downX = e.clientX;
            this._pointer.downY = e.clientY;
            this._pointer.moved = false;
            this._pointer.dragging = false;
            this._pointer.dragDevId = null;
        },

        _onPointerMove(e) {
            const p = this._pointer;
            if (e.buttons & 1) {
                const dx = e.clientX - p.downX;
                const dy = e.clientY - p.downY;
                if (!p.moved && Math.hypot(dx, dy) > 4) p.moved = true;

                // Moving a device requires Shift+drag, so plain left-drag is
                // always free for the OrbitControls camera rotation.
                if (this.tool === 'select' && e.shiftKey) {
                    if (!p.dragging) {
                        const hit = this._raycast(this._deviceGroups(), true, e);
                        const id = hit.length ? this._deviceIdFromHit(hit[0].object) : null;
                        if (id) {
                            p.dragging = true;
                            p.dragDevId = id;
                        }
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

            if (wasDrag) {
                p.dragging = false;
                p.dragDevId = null;
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
            this._markers = this._markers.filter((m) => m.devId !== devId);
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
        },

        _devLabel(devId) {
            const d = E.getDevice(this._state, devId);
            return d ? `${d.hostname || d.name}` : devId;
        },

        _addDeviceMesh(dev) {
            const mesh = buildDeviceMesh(dev);
            mesh.userData.deviceId = dev.id;
            mesh.position.set(dev.x, 0, dev.z);
            // port markers (for cable mode) — hidden by default
            for (const p of dev.ports) {
                const pos = portLocalPos(dev, p.name);
                const marker = new THREE.Mesh(
                    new THREE.SphereGeometry(0.16, 16, 12),
                    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 }),
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
            this._markers = [];
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
            this._cables = [];
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
                m.mesh.material.color.set(isSrc ? 0x22c55e : 0x38bdf8);
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
            pushPath(result.trace.reply, 0x7dd3fc);
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
            this._packets = keep;
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
                    { text: 'Microsoft Windows [Version 10.0.19045]', cls: 'text-slate-300' },
                    { text: '(c) Microsoft Corporation. All rights reserved.', cls: 'text-slate-500' },
                    { text: '', cls: '' },
                    { text: 'C:\\>', cls: 'text-green-400' },
                ];
            }
            return [
                { text: `Cisco IOS Software, Practice Lab Simulator`, cls: 'text-slate-300' },
                { text: `${name} con0 is now available`, cls: 'text-slate-500' },
                { text: '', cls: '' },
                { text: `${name}>`, cls: 'text-green-400' },
            ];
        },

        get cliPrompt() {
            if (!this.cli) return '';
            const dev = E.getDevice(this._state, this.cli.devId);
            const name = dev ? dev.hostname || dev.name : '?';
            if (dev && (dev.type === 'pc' || dev.type === 'server')) return 'C:\\>';
            switch (this.cli.mode) {
                case 'user': return `${name}>`;
                case 'priv': return `${name}#`;
                case 'config': return `${name}(config)#`;
                case 'iface': return `${name}(config-if)#`;
                default: return `${name}>`;
            }
        },

        cliSubmit() {
            if (!this.cli) return;
            const raw = this.cli.input;
            this.cli.input = '';
            const dev = E.getDevice(this._state, this.cli.devId);
            const prompt = this.cliPrompt;

            this.cli.output.push({ text: prompt + ' ' + raw, cls: 'text-slate-200' });
            if (raw.trim()) {
                this.cli.history.push(raw);
                this.cli.hi = this.cli.history.length;
            }

            const res = C.execute(this._state, dev, this.cli.mode, raw);
            for (const line of res.lines) {
                if (line === '\u0000CLEAR') {
                    this.cli.output = [];
                    continue;
                }
                this.cli.output.push({ text: line, cls: this._cliClass(line) });
            }
            this.cli.mode = res.mode;

            for (const ev of res.events) {
                if (ev.type === 'ping') {
                    this.spawnPackets(ev.result);
                    this.logPing(ev.result);
                } else if (ev.type === 'config-changed') {
                    this._dirtyCables = true;
                }
            }
            this._refreshLists();
            this.$nextTick(() => this._scrollCli());
        },

        _cliClass(line) {
            if (/no route|unreachable|expired|dropped|timeout|not recognized|Invalid|down/.test(line)) return 'text-red-400';
            if (/delivered|OK|complete|reply/.test(line)) return 'text-emerald-400';
            if (line.startsWith('%')) return 'text-amber-400';
            return 'text-slate-300';
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
        },

        _syncAfterStateChange() {
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
                select: 'Drag empty space to orbit · scroll to zoom · right-drag to pan · Shift+drag a device to move it · double-click to open console.',
                cable: 'Click a port on the first device, then a port on the second device to connect them.',
                delete: 'Click a device to delete it (its cables are removed too).',
            }[tool];
        },

        loadSample() {
            this._loadSample();
        },

        _loadSample() {
            this._state = E.makeState();
            this._rebuildScene();
            this.logLines = [];
            this.selectedId = null;
            this.cableSrc = null;

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

            const PC1 = mk('pc', 'PC1', -9, 1.5);
            const SRV = mk('server', 'Server1', -9, -2);
            const SW1 = mk('switch', 'SW1', -5.5, 0);
            const R1 = mk('router', 'R1', -1.5, 0);
            const R2 = mk('router', 'R2', 2.5, 0);
            const SW2 = mk('switch', 'SW2', 6, 0);
            const PC4 = mk('pc', 'PC4', 9.5, 0);

            setIp(PC1, 'eth0', '192.168.1.10', '255.255.255.0'); PC1.gateway = '192.168.1.1';
            setIp(SRV, 'eth0', '192.168.1.20', '255.255.255.0'); SRV.gateway = '192.168.1.1';
            setIp(R1, 'G0/0', '192.168.1.1', '255.255.255.0');
            setIp(R1, 'G0/1', '192.168.12.1', '255.255.255.0');
            setIp(R2, 'G0/0', '192.168.12.2', '255.255.255.0');
            setIp(R2, 'G0/1', '192.168.4.1', '255.255.255.0');
            setIp(PC4, 'eth0', '192.168.4.10', '255.255.255.0'); PC4.gateway = '192.168.4.1';

            E.addLink(S, PC1.id, 'eth0', SW1.id, 'F0/1');
            E.addLink(S, SRV.id, 'eth0', SW1.id, 'F0/3');
            E.addLink(S, SW1.id, 'F0/2', R1.id, 'G0/0');
            E.addLink(S, R1.id, 'G0/1', R2.id, 'G0/0');
            E.addLink(S, R2.id, 'G0/1', SW2.id, 'F0/1');
            E.addLink(S, SW2.id, 'F0/2', PC4.id, 'eth0');

            R1.staticRoutes.push({ net: '192.168.4.0', mask: '255.255.255.0', nextHop: '192.168.12.2', exit: null });
            R2.staticRoutes.push({ net: '192.168.1.0', mask: '255.255.255.0', nextHop: '192.168.12.1', exit: null });

            this._rebuildScene();
            this._syncAfterStateChange();
            this.logEvent('🏗 Loaded sample network: PC1 + Server1 ⇄ SW1 ⇄ R1 ⇄ R2 ⇄ SW2 ⇄ PC4');
            this.logEvent('💡 Try: open PC1 and type  ping 192.168.4.10');
        },

        clearAll() {
            this._state = E.makeState();
            this._rebuildScene();
            this._syncAfterStateChange();
            this.selectedId = null;
            this.cli = null;
            this.cableSrc = null;
            this.logLines = [];
            this.logEvent('🧹 Workspace cleared.');
            this.statusHint = 'Add devices from the palette to start building.';
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
