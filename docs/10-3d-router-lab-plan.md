# 3D Router Lab Implementation Plan — Cisco 2911 ISR (Three.js)

## Executive Summary

Replace the current 2D SVG router panel with an interactive **Three.js WebGL 3D scene** featuring:
- Photorealistic Cisco 2911 ISR model with accurate port layout
- Orbit controls for 360° inspection
- Raycasting-based port interaction (click to select, drag to connect cables)
- Real-time LED status synchronization with CLI simulator
- Cable physics simulation with visual feedback

---

## Technical Architecture

### New Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  router.blade.php (Layout)                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  x-lab.router-3d (Three.js Scene)                         │  │
│  │  - Canvas renderer (WebGL)                                │  │
│  │  - OrbitControls for camera                               │  │
│  │  - Cisco 2911 GLTF model + procedural details             │  │
│  │  - Interactive port meshes with raycasting                │  │
│  │  - Cable connection system (Bezier curves + physics)      │  │
│  │  - LED material animation (emissive intensity)            │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  x-lab.cli-terminal (Existing Alpine.js CLI)              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow (Extended)

```
┌──────────────────┐     Alpine.js Reactive State      ┌──────────────────┐
│  router-sim.js   │ ◄─────────────────────────────────► │  router-3d.js    │
│  (CLI Logic)     │     interfaces[], routes[],       │  (Three.js Scene)│
│                  │     mode, hostname, etc.          │                  │
└──────────────────┘                                    └──────────────────┘
         │                                                      │
         │              Custom Events / Alpine $watch           │
         ▼                                                      ▼
┌──────────────────┐                                    ┌──────────────────┐
│  CLI Terminal    │                                    │  3D Scene        │
│  (Output/Input)  │                                    │  - Port LEDs     │
└──────────────────┘                                    │  - Cable meshes  │
                                                        │  - Tooltip labels│
                                                        └──────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Three.js integrated, basic scene rendering

| Task | Details |
|------|---------|
| **1.1 Install Three.js** | `npm install three @types/three` + Vite config for WASM/GLTF loaders |
| **1.2 Create `router-3d.js`** | New Alpine component: `Alpine.data('router3d', ...)` |
| **1.3 Basic Scene Setup** | Renderer, camera (PerspectiveCamera), scene, OrbitControls, lighting (HemisphereLight + DirectionalLight) |
| **1.4 Responsive Canvas** | Full-width, aspect-ratio container, resize handler |
| **1.5 Replace router-panel** | New `<x-lab.router-3d />` component in `router.blade.php` |

**Deliverable:** Blank dark scene with orbit controls working

---

### Phase 2: Cisco 2911 3D Model (Week 1-2)
**Goal:** Accurate router geometry

#### Option A: GLTF Model (Recommended)
- Source: Cisco 3D models from [Cisco 3D Models](https://www.cisco.com/c/en/us/support/docs/routers/2900-series-integrated-services-routers-isr/118374-3d-models.html) or create in Blender
- Export as `.glb` (binary GLTF) with:
  - Chassis as single mesh
  - Each port as separate named mesh (`port_Gi0_0`, `port_Gi0_1`, `port_Gi0_2`, `port_console`, `port_aux`, `port_usb`)
  - LED meshes as separate objects for material animation
  - NM slot as separate mesh
  - Rack ears as separate meshes

#### Option B: Procedural Generation (Fallback)
```javascript
// In router-3d.js - createCisco2911() function
function createCisco2911() {
  const group = new THREE.Group();
  
  // Chassis: BoxGeometry(90, 12, 25) - scaled to match 900x120 SVG proportions
  // Bevels, rack ears, NM slot, ports as child meshes
  // Each port: cylinder (RJ45) + ring (LED) + label sprite
  
  return group;
}
```

**Port Positions (matching SVG coordinates, scaled to 3D):**
| Port | 3D Position (x, y, z) | Mesh Name |
|------|----------------------|-----------|
| Gi0/0 | (-28, 0, 12) | `port_Gi0_0` |
| Gi0/1 | (-10, 0, 12) | `port_Gi0_1` |
| Gi0/2 | (8, 0, 12) | `port_Gi0_2` |
| Console | (28, 0, 12) | `port_console` |
| AUX | (38, 0, 12) | `port_aux` |
| USB | (46, 0, 12) | `port_usb` |

**Deliverable:** Recognizable Cisco 2911 model with all ports as clickable meshes

---

### Phase 3: Port Interaction & Raycasting (Week 2)
**Goal:** Click ports, see tooltips, initiate cable drag

#### 3.1 Raycasting System
```javascript
// In router-3d.js
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onPointerMove(event) {
  // Convert to normalized device coordinates
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(portMeshes, true);
  
  if (intersects.length > 0) {
    const portMesh = intersects[0].object;
    highlightPort(portMesh);
    showTooltip(portMesh.userData.portKey, event.clientX, event.clientY);
  } else {
    clearHighlight();
    hideTooltip();
  }
}
```

#### 3.2 Port Highlighting
- **Hover:** Emissive material glow (`material.emissive.set(0x00ff00)`)
- **Selected:** Outline effect (post-processing `OutlinePass` or scaled duplicate mesh)
- **Tooltip:** HTML overlay positioned at port (reuses existing tooltip design)

#### 3.3 Cable Drag Initiation
```javascript
function onPointerDown(event) {
  const intersects = raycaster.intersectObjects(portMeshes, true);
  if (intersects.length > 0) {
    startCableDrag(intersects[0].object.userData.portKey, event.clientX, event.clientY);
  }
}
```

**Deliverable:** Hover highlights, click selects, tooltip shows interface config

---

### Phase 4: Cable Connection System (Week 2-3)
**Goal:** Drag cables between ports, visual physics

#### 4.1 Cable Representation
```javascript
class Cable {
  constructor(startPort, endPort, cableType = 'cat6') {
    this.startPort = startPort;  // {mesh, position, portKey}
    this.endPort = endPort;      // {mesh, position, portKey} or null (dangling)
    this.type = cableType;       // 'cat6', 'crossover', 'console', 'fiber'
    this.curve = new THREE.CubicBezierCurve3();
    this.mesh = this.createMesh();
    this.physics = { tension: 0.8, slack: 0.15 };
  }
  
  createMesh() {
    // TubeGeometry along curve
    // Color by type: Cat6=blue, Crossover=orange, Console=light-blue, Fiber=yellow
    // Subtle animation for activity (flowing texture or pulse)
  }
  
  updateCurve() {
    // Bezier from start port center to end port center (or mouse position while dragging)
    // Control points create natural cable sag
  }
}
```

#### 4.2 Cable Types & Validation
| Cable Type | Color | Valid Connections | Use Case |
|------------|-------|-------------------|----------|
| **Straight-through (Cat6)** | Blue | Router Gi ↔ Switch/PC | Standard Ethernet |
| **Crossover** | Orange | Router Gi ↔ Router Gi | Direct router-to-router |
| **Console (Rollover)** | Light Blue | Router Console ↔ PC/Terminal | Management |
| **Fiber (SFP)** | Yellow | Router SFP ↔ Switch SFP | Future: add SFP ports |

#### 4.3 Connection Logic
```javascript
function completeCableDrag(endPortKey, mouseX, mouseY) {
  if (endPortKey && isValidConnection(draggingCable.type, startPortKey, endPortKey)) {
    // Create permanent cable
    cables.push(new Cable(startPort, endPort, cableType));
    
    // Update CLI simulator state
    alpineRouterLab.$data.interfaces[startPortKey].connectedTo = endPortKey;
    alpineRouterLab.$data.interfaces[endPortKey].connectedTo = startPortKey;
    
    // Trigger link-up animation on both ports
    animateLinkUp(startPortKey);
    animateLinkUp(endPortKey);
  } else {
    // Snap back animation
    animateCableReturn();
  }
  draggingCable = null;
}
```

#### 4.4 Cable Physics (Visual Only)
- **Bezier curve** with control points offset by gravity vector
- **Subtle sway** animation using `Math.sin(time * frequency)`
- **Tension visualization** - cable straightens when taut

**Deliverable:** Drag from port → cable follows mouse → drop on valid port → permanent connection with link lights

---

### Phase 5: CLI Integration & State Sync (Week 3)
**Goal:** 3D scene ↔ Alpine.js CLI simulator bidirectional sync

#### 5.1 Alpine → 3D (State Changes)
```javascript
// In router-3d.js - watch Alpine state
alpineRouterLab = document.querySelector('[x-data="routerLab"]')._x_dataStack[0];

// Watch interface changes
const originalSubmitCommand = alpineRouterLab.submitCommand;
alpineRouterLab.submitCommand = function(...args) {
  const result = originalSubmitCommand.apply(this, args);
  sync3DFromCLI(); // Update LEDs, cables, tooltips
  return result;
};

function sync3DFromCLI() {
  Object.entries(alpineRouterLab.interfaces).forEach(([key, iface]) => {
    const portMesh = portMeshesMap[key];
    if (!portMesh) return;
    
    // LED: adminState up = green emissive, down = dark
    const ledMesh = portMesh.getObjectByName('led');
    ledMesh.material.emissive.set(iface.adminState === 'up' ? 0x22c55e : 0x111111);
    ledMesh.material.emissiveIntensity = iface.adminState === 'up' ? 1.5 : 0;
    
    // Line protocol: blink on activity
    if (iface.lineProtocol === 'up') {
      startActivityBlink(ledMesh);
    } else {
      stopActivityBlink(ledMesh);
    }
    
    // Tooltip data updated automatically via Alpine reactivity
  });
}
```

#### 5.2 3D → Alpine (Cable Connections)
```javascript
// When cable connected in 3D
function onCableConnected(portA, portB, cableType) {
  // Update CLI simulator interface state
  alpineRouterLab.interfaces[portA].connectedTo = portB;
  alpineRouterLab.interfaces[portA].cableType = cableType;
  alpineRouterLab.interfaces[portA].adminState = 'up'; // Auto-up on connect
  alpineRouterLab.interfaces[portA].lineProtocol = 'up';
  
  alpineRouterLab.interfaces[portB].connectedTo = portA;
  alpineRouterLab.interfaces[portB].cableType = cableType;
  alpineRouterLab.interfaces[portB].adminState = 'up';
  alpineRouterLab.interfaces[portB].lineProtocol = 'up';
  
  // Trigger CLI output
  alpineRouterLab.print(`%LINK-3-UPDOWN: Interface ${portA}, changed state to up`);
  alpineRouterLab.print(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${portA}, changed state to up`);
  
  alpineRouterLab.$forceUpdate(); // Ensure reactivity
}
```

#### 5.3 Shared State Events
```javascript
// Custom events for decoupled communication
window.addEventListener('router3d:cable-connected', (e) => {
  alpineRouterLab.handle3DCableConnect(e.detail);
});

window.addEventListener('router3d:cable-disconnected', (e) => {
  alpineRouterLab.handle3DCableDisconnect(e.detail);
});

// CLI commands that affect 3D
alpineRouterLab.handle3DCableConnect = ({portA, portB, cableType}) => {
  // Already handled above
};

alpineRouterLab.handle3DCableDisconnect = ({port}) => {
  this.interfaces[port].connectedTo = null;
  this.interfaces[port].adminState = 'down';
  this.interfaces[port].lineProtocol = 'down';
  this.print(`%LINK-3-UPDOWN: Interface ${port}, changed state to down`);
};
```

**Deliverable:** CLI commands (`shutdown`, `no shutdown`, `interface Gi0/0`) update 3D LEDs; cable connections in 3D update CLI interface state

---

### Phase 6: Polish & Advanced Features (Week 3-4)
**Goal:** Production-ready experience

| Feature | Implementation |
|---------|----------------|
| **Port Labels** | `THREE.Sprite` with `CanvasTexture` - always face camera |
| **Activity Blink** | `gsap.to(material, {emissiveIntensity: 2, duration: 0.1, yoyo: true, repeat: 1})` on packet simulation |
| **Cable Management** | Right-click cable → context menu (Disconnect, Change Type, Show Info) |
| **Multi-Device Topology** | Add `Switch` and `PC` 3D models; drag cables between devices |
| **Save/Load Topology** | Serialize cable connections + device positions to JSON; restore on load |
| **Keyboard Shortcuts** | `C` = cable mode, `V` = select mode, `Delete` = remove cable |
| **Mobile/Touch Support** | Touch events for orbit, long-press for cable drag |
| **Performance** | `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`, frustum culling, instanced meshes for repeated elements |

---

## File Structure Changes

### New Files
```
resources/
├── js/
│   ├── router-3d.js           # Three.js Alpine component (main)
│   ├── router-3d-model.js     # Procedural model generator (fallback)
│   ├── router-3d-cables.js    # Cable class + connection logic
│   └── router-3d-sync.js      # CLI ↔ 3D state synchronization
├── vendor/
│   └── three/                 # If using local copy (or node_modules)
public/
├── models/
│   └── cisco-2911.glb         # GLTF model (if using Option A)
└── build/
    └── manifest.json          # Updated by Vite
```

### Modified Files
```
resources/
├── views/
│   ├── labs/
│   │   └── router.blade.php   # Replace router-panel with router-3d
│   └── components/
│       └── lab/
│           └── router-3d.blade.php  # New component (canvas container)
routes/
└── web.php                    # No changes needed
```

### Package.json Additions
```json
{
  "dependencies": {
    "three": "^0.165.0",
    "gsap": "^3.12.5"
  },
  "devDependencies": {
    "@types/three": "^0.165.0"
  }
}
```

---

## Vite Configuration Updates

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
  plugins: [
    laravel({
      input: [
        'resources/css/app.css',
        'resources/js/app.js',
        'resources/js/router-sim.js',
        'resources/js/router-3d.js',  // Add new entry
      ],
      refresh: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          'router-3d': ['resources/js/router-3d.js'],
        },
      },
    },
  },
  // Allow GLTF/GLB imports
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr', '**/*.exr'],
});
```

---

## Cisco 2911 Model Specifications

### Physical Dimensions (Real World)
- **Chassis:** 1.72" H × 17.25" W × 18.5" D (1RU)
- **Weight:** ~18 lbs (8.2 kg)

### 3D Scale (Arbitrary Units)
```
Chassis:     width=90, height=12, depth=25
Port spacing: 18 units between port centers
Port depth:   4 units (RJ45 protrusion)
LED ring:     radius=1.2 units
```

### Materials
| Part | Material | Properties |
|------|----------|------------|
| Chassis | MeshStandardMaterial | color: 0x1c1c1c, roughness: 0.8, metalness: 0.2 |
| Bezel | MeshStandardMaterial | color: 0x252525, roughness: 0.7 |
| Port Housing | MeshStandardMaterial | color: 0x0a0a0a, roughness: 0.9 |
| RJ45 Socket | MeshStandardMaterial | color: 0x050505, roughness: 1.0 |
| LED Ring (off) | MeshBasicMaterial | color: 0x2d2d2d |
| LED Ring (on) | MeshStandardMaterial | emissive: 0x22c55e, emissiveIntensity: 1.5 |
| Console Port | MeshStandardMaterial | color: 0x0a0a0a, roughness: 0.8, edge glow: 0x0ea5e9 |
| Cisco Logo | Sprite/CanvasTexture | "CISCO" text, 2911 model badge |

---

## Cable Connection Rules (CCNA Accurate)

### Valid Connections Matrix
| From \ To | Router Gi | Switch Gi | PC NIC | Router Console | Router AUX |
|-----------|-----------|-----------|--------|----------------|------------|
| **Router Gi** | Crossover | Straight | Straight | ❌ | ❌ |
| **Switch Gi** | Straight | Straight* | Straight | ❌ | ❌ |
| **PC NIC** | Straight | Straight | Crossover | ❌ | ❌ |
| **Router Console** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Router AUX** | ❌ | ❌ | ❌ | ❌ | ❌ |

*Switch-to-Switch uses Straight-through (modern switches auto-MDIX)

### Cable Type Auto-Detection
```javascript
function determineCableType(portA, portB) {
  const typeA = getPortCategory(portA); // 'ethernet' | 'console' | 'aux'
  const typeB = getPortCategory(portB);
  
  if (typeA === 'console' || typeB === 'console') return 'console';
  if (typeA === 'aux' || typeB === 'aux') return 'console'; // AUX uses same cable
  
  // Both Ethernet
  const deviceA = getDeviceType(portA); // 'router' | 'switch' | 'pc'
  const deviceB = getDeviceType(portB);
  
  if (deviceA === deviceB) return 'crossover'; // Router-Router, PC-PC, Switch-Switch
  return 'straight'; // Router-Switch, Router-PC, Switch-PC
}
```

---

## Integration with Existing CLI Commands

### New CLI Commands for 3D Control
```javascript
// In router-sim.js - add to dispatchPrivileged/dispatchGlobal
'cable connect': (args) => {
  // cable connect Gi0/0 Gi0/1 [straight|crossover|console]
  // Programmatically create cable in 3D
},
'cable disconnect': (args) => {
  // cable disconnect Gi0/0
},
'cable show': () => {
  // List all cable connections
},
'topology save': (filename) => {
  // Save current 3D topology to localStorage/file
},
'topology load': (filename) => {
  // Load topology
},
```

### Enhanced Show Commands
```
Router# show interfaces 3d
  GigabitEthernet0/0: Connected to Switch1:Gi1/0/1 (Straight-through, Up/Up)
  GigabitEthernet0/1: Not connected
  GigabitEthernet0/2: Connected to Router2:Gi0/0 (Crossover, Up/Up)
  Console: Connected to Terminal (Console cable)
```

---

## Testing Checklist

### Functional Tests
- [ ] Scene loads without errors (no WebGL context lost)
- [ ] Orbit controls: rotate, zoom, pan work smoothly
- [ ] All 6 ports clickable, tooltips show correct data
- [ ] Cable drag: starts on port, follows mouse, snaps to valid target
- [ ] Invalid drop: cable animates back to origin
- [ ] Valid connection: cable stays, both ports show link up
- [ ] CLI `shutdown` → 3D LED turns off, line protocol down
- [ ] CLI `no shutdown` → 3D LED turns green, line protocol up
- [ ] 3D cable connect → CLI interface state updates
- [ ] 3D cable disconnect → CLI interface state updates
- [ ] Ping works across 3D-connected interfaces
- [ ] `reload` command resets 3D scene (cables removed, LEDs off)

### Visual Tests
- [ ] Model proportions match Cisco 2911 reference images
- [ ] Port positions match SVG layout (Gi0/0, Gi0/1, Gi0/2 left-to-right)
- [ ] LED colors: Green=up, Amber=activity, Off=down
- [ ] Cable colors: Blue=straight, Orange=crossover, LightBlue=console
- [ ] Cable sag looks natural (not straight line)
- [ ] Tooltips don't overlap, position correctly on resize
- [ ] No z-fighting on port meshes
- [ ] Performance: 60fps on typical laptop, 30fps on mobile

### Edge Cases
- [ ] Rapid cable connect/disconnect doesn't leak meshes
- [ ] Window resize maintains camera aspect ratio
- [ ] Tab away/back doesn't break animation loops
- [ ] Multiple cables from same port prevented
- [ ] Console cable only works on Console port
- [ ] Cable type validation prevents invalid connections

---

## Performance Budget

| Metric | Target |
|--------|--------|
| Initial load (Three.js + model) | < 2s on 3G |
| First frame (interactive) | < 100ms |
| Frame rate (desktop) | 60 fps |
| Frame rate (mobile) | 30 fps |
| Memory (scene + model) | < 100 MB |
| Bundle size (router-3d chunk) | < 500 KB gzipped |

### Optimization Strategies
- **Lazy load** Three.js and model only when `/labs/router` visited
- **DRACO compression** for GLTF model
- **Texture atlasing** for any baked textures
- **InstancedMesh** for repeated elements (screws, LED rings)
- **Level of Detail (LOD)** for distant viewing
- **Frustum culling** enabled by default
- **RequestAnimationFrame** only when tab visible

---

## Future Extensions (Post-MVP)

| Feature | Effort | Value |
|---------|--------|-------|
| **Switch 2960 3D Model** | Medium | Multi-device labs |
| **PC/Laptop 3D Model** | Low | End-to-end ping visualization |
| **Packet Animation** | Medium | Visual ping/traceroute packets flowing on cables |
| **Rack View** | High | Multiple devices in 19" rack |
| **VR/WebXR Support** | High | Immersive lab experience |
| **Collaborative Multi-user** | Very High | Instructor-led labs |
| **Physical Simulation** | Medium | Cable gravity, port stress relief |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Three.js bundle too large | Medium | High | Code splitting, lazy load, tree shaking |
| WebGL not supported | Low | High | Fallback to 2D SVG (current implementation) |
| Model creation time | Medium | Medium | Use procedural fallback first, GLTF later |
| Mobile performance | High | Medium | Reduce pixel ratio, simplify shaders |
| State sync bugs | Medium | High | Comprehensive integration tests, event-driven architecture |
| Cable math complexity | Medium | Medium | Start simple (straight lines), add Bezier later |

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Foundation | 3-4 days | 1 week |
| Phase 2: 3D Model | 4-5 days | 2 weeks |
| Phase 3: Port Interaction | 3-4 days | 2.5 weeks |
| Phase 4: Cable System | 4-5 days | 3.5 weeks |
| Phase 5: CLI Integration | 3-4 days | 4 weeks |
| Phase 6: Polish | 3-4 days | 5 weeks |
| **Total** | **~5 weeks** | **~5 weeks** |

---

## Decision Required

Before starting, confirm:

1. **Model Approach:** GLTF model (Option A) vs Procedural (Option B)?
2. **Scope:** Single router only, or include Switch/PC for multi-device?
3. **Persistence:** Save topology to localStorage, database, or file?
4. **Mobile:** Must work on tablets, or desktop-only?
5. **Timeline:** 5 weeks acceptable, or need MVP sooner?

---

## Appendix: Three.js Learning Resources

- [Three.js Journey](https://threejs-journey.com/) - Comprehensive course
- [Three.js Docs](https://threejs.org/docs/) - Official documentation
- [GLTF Loader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) - Model loading
- [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls) - Camera controls
- [Raycasting](https://threejs.org/docs/#api/en/core/Raycaster) - Mouse interaction
- [Post-processing](https://threejs.org/docs/#manual/en/introduction/Post-processing) - Outline effects
- [GSAP + Three.js](https://gsap.com/resources/threejs/) - Animation integration
