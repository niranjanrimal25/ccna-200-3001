# Visual System — CCNA Study Platform

Reference for anyone adding new device types, modifying topology diagrams, or changing the canvas conventions. Written after the August 2026 PT-style visual redesign.

---

## Architecture

```
layouts/app.blade.php
  └─ <x-svg.sprite />              ← hidden SVG, loaded once per page
       ├─ #dev-router              ← isometric 3D Cisco chassis
       ├─ #dev-switch              ← PT-style flat chassis with port rows
       ├─ #dev-pc                  ← monitor + stand + base
       ├─ #dev-server              ← 1U rack slab with drive bays
       ├─ #dev-firewall            ← chassis with grid grille
       └─ #dev-cloud               ← filled gradient cloud

animation.blade.php                ← step-through animated topologies
  └─ <use href="#dev-...">         ← references global sprite

topology.blade.php                 ← static topology diagrams
  └─ <use href="#dev-...">         ← references global sprite
```

The sprite lives in `resources/views/components/svg/sprite.blade.php` and is injected once in the layout body. Both topology components reference it via `<use href="#dev-{icon}">`. Adding a new symbol to the sprite makes it available everywhere with no other file changes.

---

## Device Icon Inventory

| Symbol ID       | Style            | Main fill   | Accent / Detail                        |
|-----------------|------------------|-------------|----------------------------------------|
| `#dev-router`   | Isometric 3D     | `#0d5fa6`   | Top `#1a7bc4`, side `#0a4a82`, LEDs    |
| `#dev-switch`   | PT flat chassis  | `#3b5270`   | 2×8 port rows, green LEDs, label strip |
| `#dev-pc`       | Monitor + base   | `#2e4a6e`   | Screen glow `#38bdf8`, power LED       |
| `#dev-server`   | 1U rack slab     | `#2d3a4a`   | 3 drive bays, right-panel LEDs         |
| `#dev-firewall` | Grille chassis   | `#4a3d2a`   | Amber grid grille, port panel          |
| `#dev-cloud`    | Filled cloud     | `#3d3a5c`   | Dashed ground line, drop lines         |

All symbols use `viewBox="0 0 64 48"`. The `<use>` element **must** carry `width="64" height="48"` as SVG presentational attributes — CSS classes (`h-12 w-16`) do not reliably size `<use>` elements referencing `<symbol>` across browsers.

---

## Adding a New Device Type

1. Open `resources/views/components/svg/sprite.blade.php`.
2. Inside the `<defs>` block, add a gradient (optional but recommended):
   ```svg
   <linearGradient id="grad-yourtype" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stop-color="#rrggbb"/>
       <stop offset="100%" stop-color="#rrggbb"/>
   </linearGradient>
   ```
3. Add the symbol:
   ```svg
   <symbol id="dev-yourtype" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
       <!-- draw your icon here, keep within the 64×48 bounding box -->
   </symbol>
   ```
4. Use it in any lesson JSON by setting `"icon": "yourtype"` on a node.

No Blade template changes needed. Both `animation.blade.php` and `topology.blade.php` resolve icons dynamically via `#dev-{{ $node['icon'] }}`.

---

## Canvas Conventions

### Dot-Grid Background

Both topology components define a local SVG `<pattern>` in their `<defs>`:

```svg
<pattern id="anim-dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
    <circle cx="1" cy="1" r="1" fill="#1e293b"/>
</pattern>
<rect width="1000" height="420" fill="url(#anim-dot-grid)"/>
```

| Component             | Pattern ID        |
|-----------------------|-------------------|
| `animation.blade.php` | `anim-dot-grid`   |
| `topology.blade.php`  | `topo-dot-grid`   |

IDs are kept separate to prevent collisions when both components appear on the same page.

---

### Cable Colors

Cables are cubic bezier `<path>` elements — not straight `<line>` elements. Color and dash style are determined by `link.kind`:

| `link.kind`  | Stroke      | Dash    | Meaning                    |
|--------------|-------------|---------|----------------------------|
| `ethernet`   | `#22c55e`   | solid   | UTP / straight-through     |
| `wan`        | `#f59e0b`   | `8 4`   | Serial / WAN / cloud link  |
| `crossover`  | `#f97316`   | solid   | Crossover cable            |

**Control point formula** (PHP, inside Blade `@php` block):

```php
$isVert = abs($to['y'] - $from['y']) > abs($to['x'] - $from['x']);
$cp1x   = $isVert ? $from['x'] + 60 : $from['x'];
$cp1y   = $isVert ? $from['y']      : $from['y'] + 60;
$cp2x   = $isVert ? $to['x'] + 60   : $to['x'];
$cp2y   = $isVert ? $to['y']        : $to['y'] + 60;
// Path: M {from.x} {from.y} C {cp1x} {cp1y} {cp2x} {cp2y} {to.x} {to.y}
```

- **Horizontal links** (`dx > dy`): control points drop `+60` units below each endpoint → gentle downward arc.
- **Vertical links** (`dy > dx`): control points shift `+60` units to the right → gentle rightward arc.

---

### Status LEDs

Every device node has a "link-up" LED at position `(30, -28)` relative to the node center. This places it at the top-right corner of the 64×48 bounding box:

```svg
<!-- Glow halo -->
<circle cx="30" cy="-28" r="4" fill="#22c55e" fill-opacity="0.2"/>
<!-- Solid dot -->
<circle cx="30" cy="-28" r="2" fill="#22c55e"/>
```

These are static — dynamic link-state (up/down) is not yet implemented.

---

### Packet Pill Badges

Animated packet labels use a pill-shaped background behind monospace text:

```svg
<circle r="6" fill="#22c55e"/>
<rect x="-28" y="-24" width="56" height="14" rx="7"
      fill="#0f172a" stroke="#334155" stroke-width="0.8"/>
<text text-anchor="middle" y="-13" fill="#e2e8f0"
      font-size="9" font-family="ui-monospace,monospace">hop 1</text>
```

The pill is 56 units wide — enough for labels up to ~10 characters at `font-size="9"`.

---

## Isometric Router — SVG Geometry Reference

Three-face cabinet projection using `(+8, -8)` SVG unit depth offset:

```
Top face:    polygon points="8,28 48,28 56,20 16,20"    fill: #1a7bc4  (lightest)
Front face:  rect x="8" y="28" width="40" height="13"   fill: #0d5fa6  (Cisco blue)
Right face:  polygon points="48,28 56,20 56,33 48,41"   fill: #0a4a82  (darkest)
```

**Front face features** (within `x=8–48, y=28–41`):
- 4 port openings: `5×3` dark rects at `y=30`, `x=11, 18, 25, 32`; fill `#041e3d`
- 3 status LEDs: `r=1.5` circles at `y=37`, `x=11, 15, 19`; 2× green `#22c55e`, 1× amber `#f59e0b`
- 3 Cisco branding lines: `x=39–46`, `y=30, 32, 34`; stroke `#1a7bc4`

**Right face features**:
- 3 ventilation slots: `x=49–55`, `y=23, 26, 29`; stroke `#0d6aaf`

**Edge highlights**:
- Top seam: `line x1="8" y1="28" x2="48" y2="28"` — stroke `#2a8ad4`
- Top face perimeter: `polyline points="8,28 16,20 56,20 48,28"` — stroke `#2a8ad4`
- Right face perimeter: `polyline points="48,28 56,20 56,33 48,41"` — stroke `#0d6aaf`

---

## Lesson JSON — Topology Data Format

### Node object (`sections[].content.nodes[]`)

```json
{
  "id": "r1",
  "label": "R1",
  "icon": "router",
  "x": 420,
  "y": 150
}
```

| Field   | Type   | Notes                                                                 |
|---------|--------|-----------------------------------------------------------------------|
| `id`    | string | Unique within the section. Referenced by `animate.packet_from`, `packet_to`, `highlight` |
| `label` | string | Displayed below the icon                                             |
| `icon`  | string | One of: `router` `switch` `pc` `server` `firewall` `cloud`          |
| `x`     | number | SVG user units, within the `1000 × 420` viewBox                     |
| `y`     | number | SVG user units, within the `1000 × 420` viewBox                     |

### Link object (`sections[].content.links[]`)

```json
{ "from": "r1", "to": "r2", "kind": "wan" }
```

| Field  | Type   | Notes                                          |
|--------|--------|------------------------------------------------|
| `from` | string | Node `id`                                      |
| `to`   | string | Node `id`                                      |
| `kind` | string | `ethernet` \| `wan` \| `crossover` (default: `ethernet`) |

### Animation step (`sections[].content.steps[]`)

```json
{
  "narration": "R1 forwards the packet to R2.",
  "animate": {
    "packet_from": "r1",
    "packet_to": "r2",
    "label": "hop 2",
    "highlight": ["r1", "r2"],
    "flood": false
  }
}
```

| `animate` key  | Notes                                                          |
|----------------|----------------------------------------------------------------|
| `packet_from`  | Node `id` — packet origin                                      |
| `packet_to`    | Node `id` — packet destination                                 |
| `label`        | Text shown in the pill badge above the packet dot              |
| `highlight`    | Node `id` or array of IDs — shown with dashed blue outline     |
| `flood`        | Boolean — if true, sends packet from `packet_from` to all other nodes |
| `mac_table_add`| Object `{mac, port, type}` — appends a row to the MAC table sidebar |

---

## File Reference

| File | Purpose |
|------|---------|
| `resources/views/components/svg/sprite.blade.php` | All SVG symbol definitions and gradient defs |
| `resources/views/components/svg/topology.blade.php` | Static topology diagram component |
| `resources/views/components/sections/animation.blade.php` | Animated step-through topology component |
| `resources/views/layouts/app.blade.php` | Includes `<x-svg.sprite />` once per page |
| `storage/content/lessons/*.json` | Lesson content — topology data lives here |
| `docs/visual-system.md` | This file |
| `docs/superpowers/specs/2026-08-10-realistic-topology-visuals-design.md` | Original design spec |
| `docs/superpowers/plans/2026-08-10-realistic-topology-visuals.md` | Implementation plan |
