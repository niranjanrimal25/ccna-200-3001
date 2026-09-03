# Realistic Topology Visuals — Design Spec

**Date:** 2026-08-10
**Status:** Approved
**Scope:** SVG sprite redesign + canvas upgrades. No Blade template restructuring.

---

## Goal

Make topology diagrams feel like physical lab practice — Cisco Packet Tracer style (dark canvas, filled colored device icons, bezier cables) with one isometric 3D router for visual depth.

---

## Approach

**Option 1 — Sprite-only redesign.** Redraw SVG symbols in `sprite.blade.php`, update link rendering to bezier curves, add dot-grid canvas background. Same Blade component structure, no new files except the spec.

---

## 1. Device Icons — PT-Style Flat with Depth

All non-router devices redrawn as filled SVG symbols with subtle linear gradients. Each fits the existing `64×48` viewBox so no layout changes are needed.

| Device   | Shape                                         | Fill colors                       | Accent                   |
|----------|-----------------------------------------------|-----------------------------------|--------------------------|
| Switch   | Flat rectangular chassis, visible port row    | `#3b5270` → `#2a3d56` gradient    | Green LED row            |
| PC       | Monitor + tower, screen glow                  | `#2e4a6e` → `#1e3352` gradient    | Screen: `#38bdf8` glow   |
| Server   | 1U rack slab, drive bay lines, power LED      | `#2d3a4a` → `#1e2a38` gradient    | Power LED: `#22c55e`     |
| Firewall | Rectangular chassis with grid grille texture  | `#4a3d2a` → `#332b1e` gradient    | Amber grille lines       |
| Cloud    | Filled cloud shape with dashed underline      | `#3d3a5c` → `#2a2840` gradient    | Dashed stroke `#6366f1`  |

Each icon uses `<linearGradient>` defined in the sprite's `<defs>`. Stroke is removed on filled icons; a thin `0.5px` border stroke remains for legibility on the dark canvas.

---

## 2. Isometric Router — 3D Cisco Chassis

The router symbol is fully redrawn as an isometric perspective chassis using SVG `<polygon>` and `<path>` elements. Three visible faces:

**Top face**
- Elliptical/parallelogram lid in isometric projection
- Fill: `#1a7bc4` (lighter Cisco blue)
- Shows a thin "Cisco" label area (text or decorative lines)

**Front face**
- Tallest visible face, centered in the 64×48 box
- Fill: `#0d5fa6` (Cisco blue)
- 4 port openings: small `4×3` dark rectangles in a row
- 3 status LEDs: `4px` circles — 2× green (`#22c55e`), 1× amber (`#f59e0b`)

**Right side face**
- Darkest shade for depth illusion
- Fill: `#0a4a82`
- Ventilation slot lines (3 thin horizontal lines, `stroke: #0d5fa6`)

The three faces share edges with no gap, creating a clean isometric box. Overall bounding fits within `64×48`.

---

## 3. Topology Canvas — Dark Workspace

### 3a. Dot-Grid Background

Added as an SVG `<pattern>` in the animation/topology `<defs>`:

```
pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse"
  circle cx="1" cy="1" r="1" fill="#1e293b"
rect fill="url(#dot-grid)" width="100%" height="100%"
```

Rendered behind all nodes and links. Gives graph-paper feel matching Packet Tracer's dark workspace.

### 3b. Bezier Cable Curves

Replace straight `<line>` elements with cubic bezier `<path>` elements. Control points calculated as a vertical offset from the midpoint, so cables arc naturally between devices:

```
M x1 y1 C x1 (y1+60) x2 (y2+60) x2 y2
```

Control point offset is `+60` SVG units below each endpoint, producing a gentle downward arc. For vertical links (nodes stacked above/below each other), the offset is applied horizontally instead (`+60` on x).

Color-coded by `link.kind`:
- `ethernet`: `#22c55e` (green), `stroke-width: 2`
- `wan`: `#f59e0b` (amber), `stroke-width: 2`, `stroke-dasharray: "8 4"`
- `crossover`: `#f97316` (orange), `stroke-width: 2`

### 3c. Status LEDs on Devices

Each node gets a `4px` radius circle at position `(28, -28)` relative to the node center (top-right of the icon bounding rect):
- Fill: `#22c55e` (link-up green)
- A second `7px` radius circle at the same point, fill `#22c55e` at `opacity: 0.25` creates a soft glow halo

### 3d. Packet Label Pill Badges

Animated packet labels get a pill-shaped background:
- `<rect>` with `rx="6"`, fill `#1e293b`, `stroke: #334155`, sized to fit the label text
- Label text rendered on top in `#e2e8f0`
- Replaces the current raw floating text over cables

---

## Files Changed

| File | Change |
|------|--------|
| `resources/views/components/svg/sprite.blade.php` | Redraw all 6 device symbols (PT-style + isometric router) |
| `resources/views/components/sections/animation.blade.php` | Dot-grid background, bezier cables, status LEDs, pill badges |
| `resources/views/components/svg/topology.blade.php` | Same canvas upgrades (dot-grid, bezier, LEDs) for static topology diagrams |

No changes to: JSON content files, migrations, models, controllers, or routes.

---

## Out of Scope

- Interactive hover tooltips on devices (phase 2)
- Isometric versions of switch, PC, server, firewall (only router for now)
- Animated cable "pulse" on packet travel
- Port label overlays from JSON link data

---

## Success Criteria

1. All 6 device types render with filled PT-style icons on dark canvas
2. Router renders as isometric 3D chassis with visible ports and LEDs
3. All link types render as bezier curves with correct color coding
4. Dot-grid background visible on all topology/animation sections
5. Green status LED visible on each device node
6. Packet labels render with pill badge background
7. No layout regressions — existing JSON content unchanged, all lessons still load
