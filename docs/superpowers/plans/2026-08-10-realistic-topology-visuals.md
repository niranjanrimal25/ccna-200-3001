# Realistic Topology Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace minimalist SVG line-art icons with Cisco Packet Tracer-style filled icons (plus one isometric 3D router) and upgrade the topology canvas with a dot-grid background, bezier cables, status LEDs, and pill-badge packet labels — all within the existing dark theme, touching only three Blade files.

**Architecture:** The SVG sprite moves to `layouts/app.blade.php` so one symbol set is shared globally. `sprite.blade.php` gets completely redrawn icons. `animation.blade.php` and `topology.blade.php` each get the canvas upgrades (dot-grid `<pattern>`, bezier `<path>` cables, LED circles, pill `<rect>` badges). A final `docs/visual-system.md` documents the conventions for future developers.

**Tech Stack:** SVG symbols, Blade templates, Tailwind CSS. No PHP logic changes, no JS changes, no JSON or DB changes.

## Global Constraints
- All SVG symbols must fit `viewBox="0 0 64 48"` — no layout changes to calling code
- Symbol IDs stay `dev-router`, `dev-switch`, `dev-pc`, `dev-server`, `dev-firewall`, `dev-cloud`
- `<use>` elements must carry `width="64" height="48"` attributes (CSS classes do not reliably size `<use>` referencing `<symbol>`)
- Dark palette: canvas dot-grid `#1e293b` on `#0f172a`; cable green `#22c55e`; WAN amber `#f59e0b`; crossover orange `#f97316`
- No changes to: JSON files, migrations, models, controllers, routes, Alpine.js data functions

---

## File Map

| File | Change |
|------|--------|
| `resources/views/layouts/app.blade.php` | Add `<x-svg.sprite />` just inside `<body>` |
| `resources/views/components/svg/sprite.blade.php` | Full rewrite: gradient defs + PT-style symbols + isometric router |
| `resources/views/components/sections/animation.blade.php` | Remove `<x-svg.sprite />`, add dot-grid, bezier cables, LEDs, pill badges |
| `resources/views/components/svg/topology.blade.php` | Remove inline symbols, add dot-grid, bezier cables, LEDs |
| `docs/visual-system.md` | New developer reference |

---

### Task 1: Move Sprite to Global Layout

**Files:**
- Modify: `resources/views/layouts/app.blade.php`
- Modify: `resources/views/components/sections/animation.blade.php`

**Why:** The sprite must exist in the DOM before any `<use href="#dev-...">`. Moving it to the layout makes symbols available to both `animation.blade.php` and `topology.blade.php` without duplication.

**Interfaces:**
- Produces: `#dev-router`, `#dev-switch`, `#dev-pc`, `#dev-server`, `#dev-firewall`, `#dev-cloud` globally on every page

- [ ] **Step 1: Add sprite to layout**

In `resources/views/layouts/app.blade.php`, insert `<x-svg.sprite />` immediately after the opening `<body>` tag:

```blade
    <body class="bg-slate-950 text-slate-200 antialiased">
        <x-svg.sprite />
        <div class="min-h-screen lg:flex">
```

- [ ] **Step 2: Remove sprite from animation component**

In `resources/views/components/sections/animation.blade.php`, delete this line (it's inside the `<div x-data="topologyAnimation...">` container):

```blade
        <x-svg.sprite />
```

- [ ] **Step 3: Verify sprite renders once from layout**

```bash
curl -s http://localhost:8000/topics/network-devices/lessons/network-devices | grep -c 'id="dev-router"'
```
Expected output: `1`

- [ ] **Step 4: Commit**

```bash
git add resources/views/layouts/app.blade.php resources/views/components/sections/animation.blade.php
git commit -m "feat: move svg sprite to global layout for shared symbol access"
```

---

### Task 2: Redesign Sprite — PT-Style Icons + Isometric Router

**Files:**
- Modify: `resources/views/components/svg/sprite.blade.php`

**Interfaces:**
- Produces: redesigned symbols — `#dev-router` (isometric 3D), `#dev-switch` (PT chassis), `#dev-pc` (monitor+base), `#dev-server` (1U rack), `#dev-firewall` (grille chassis), `#dev-cloud` (filled gradient cloud)
- Gradients defined in outer `<defs>`: `#grad-switch`, `#grad-pc`, `#grad-server`, `#grad-firewall`, `#grad-cloud`

- [ ] **Step 1: Replace sprite.blade.php entirely**

```blade
<svg class="hidden" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <defs>

        {{-- ── Gradients ──────────────────────────────────────────────── --}}
        <linearGradient id="grad-switch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3b5270"/>
            <stop offset="100%" stop-color="#2a3d56"/>
        </linearGradient>
        <linearGradient id="grad-pc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2e4a6e"/>
            <stop offset="100%" stop-color="#1e3352"/>
        </linearGradient>
        <linearGradient id="grad-server" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2d3a4a"/>
            <stop offset="100%" stop-color="#1e2a38"/>
        </linearGradient>
        <linearGradient id="grad-firewall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4a3d2a"/>
            <stop offset="100%" stop-color="#332b1e"/>
        </linearGradient>
        <linearGradient id="grad-cloud" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3d3a5c"/>
            <stop offset="100%" stop-color="#2a2840"/>
        </linearGradient>

        {{-- ── ROUTER — Isometric 3D Cisco chassis ────────────────────── --}}
        <symbol id="dev-router" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {{-- Right side face (darkest — gives depth) --}}
            <polygon points="48,28 56,20 56,33 48,41" fill="#0a4a82"/>
            {{-- Top face --}}
            <polygon points="8,28 48,28 56,20 16,20" fill="#1a7bc4"/>
            {{-- Front face --}}
            <rect x="8" y="28" width="40" height="13" fill="#0d5fa6"/>
            {{-- Edge highlights --}}
            <line x1="8" y1="28" x2="48" y2="28" stroke="#2a8ad4" stroke-width="0.6"/>
            <polyline points="8,28 16,20 56,20 48,28" stroke="#2a8ad4" stroke-width="0.6" fill="none"/>
            <polyline points="48,28 56,20 56,33 48,41" stroke="#0d6aaf" stroke-width="0.6" fill="none"/>
            {{-- Port openings on front face --}}
            <rect x="11" y="30" width="5" height="3" rx="0.5" fill="#041e3d"/>
            <rect x="18" y="30" width="5" height="3" rx="0.5" fill="#041e3d"/>
            <rect x="25" y="30" width="5" height="3" rx="0.5" fill="#041e3d"/>
            <rect x="32" y="30" width="5" height="3" rx="0.5" fill="#041e3d"/>
            {{-- Status LEDs --}}
            <circle cx="11" cy="37" r="1.5" fill="#22c55e"/>
            <circle cx="15" cy="37" r="1.5" fill="#22c55e"/>
            <circle cx="19" cy="37" r="1.5" fill="#f59e0b"/>
            {{-- Cisco branding lines (right side of front face) --}}
            <line x1="39" y1="30" x2="46" y2="30" stroke="#1a7bc4" stroke-width="0.8"/>
            <line x1="39" y1="32" x2="46" y2="32" stroke="#1a7bc4" stroke-width="0.8"/>
            <line x1="39" y1="34" x2="46" y2="34" stroke="#1a7bc4" stroke-width="0.8"/>
            {{-- Ventilation slots on right face --}}
            <line x1="49" y1="23" x2="55" y2="23" stroke="#0d6aaf" stroke-width="0.6"/>
            <line x1="49" y1="26" x2="55" y2="26" stroke="#0d6aaf" stroke-width="0.6"/>
            <line x1="49" y1="29" x2="55" y2="29" stroke="#0d6aaf" stroke-width="0.6"/>
        </symbol>

        {{-- ── SWITCH — PT flat chassis with 2×8 port rows ────────────── --}}
        <symbol id="dev-switch" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {{-- Chassis body --}}
            <rect x="4" y="15" width="56" height="20" rx="2" fill="url(#grad-switch)" stroke="#4a6a8a" stroke-width="0.5"/>
            {{-- Top sheen --}}
            <rect x="4" y="15" width="56" height="2.5" rx="1" fill="#4a7aa0" fill-opacity="0.35"/>
            {{-- Port row 1 --}}
            <rect x="7"  y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="13" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="19" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="25" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="31" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="37" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="43" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="49" y="19" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            {{-- Port row 2 --}}
            <rect x="7"  y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="13" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="19" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="25" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="31" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="37" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="43" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            <rect x="49" y="24" width="4" height="3.5" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            {{-- Status LEDs (top-right) --}}
            <circle cx="57" cy="19" r="1.2" fill="#22c55e"/>
            <circle cx="57" cy="22.5" r="1.2" fill="#22c55e" fill-opacity="0.5"/>
            {{-- Console port --}}
            <rect x="54" y="27" width="5" height="4" rx="0.4" fill="#071526" stroke="#1e3a5f" stroke-width="0.3"/>
            {{-- Label strip --}}
            <rect x="4" y="36" width="56" height="5" rx="1" fill="#071526" fill-opacity="0.5"/>
        </symbol>

        {{-- ── PC — Monitor + stand + base ────────────────────────────── --}}
        <symbol id="dev-pc" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {{-- Monitor bezel --}}
            <rect x="8" y="4" width="48" height="30" rx="3" fill="url(#grad-pc)" stroke="#3a5a8a" stroke-width="0.5"/>
            {{-- Screen --}}
            <rect x="12" y="8" width="40" height="22" rx="1" fill="#0a1628"/>
            {{-- Screen content lines (terminal/CLI feel) --}}
            <rect x="14" y="10" width="36" height="18" rx="0.5" fill="#0d2040" fill-opacity="0.8"/>
            <line x1="16" y1="13" x2="35" y2="13" stroke="#38bdf8" stroke-width="0.8" stroke-opacity="0.5"/>
            <line x1="16" y1="16" x2="42" y2="16" stroke="#38bdf8" stroke-width="0.8" stroke-opacity="0.3"/>
            <line x1="16" y1="19" x2="38" y2="19" stroke="#38bdf8" stroke-width="0.8" stroke-opacity="0.3"/>
            <line x1="16" y1="22" x2="40" y2="22" stroke="#38bdf8" stroke-width="0.8" stroke-opacity="0.2"/>
            {{-- Power LED --}}
            <circle cx="32" cy="32" r="1.2" fill="#22c55e"/>
            {{-- Stand neck --}}
            <rect x="28" y="34" width="8" height="5" rx="1" fill="#1e3352"/>
            {{-- Base --}}
            <rect x="20" y="39" width="24" height="4" rx="2" fill="#1e3352" stroke="#3a5a8a" stroke-width="0.3"/>
        </symbol>

        {{-- ── SERVER — 1U rack slab with drive bays ───────────────────── --}}
        <symbol id="dev-server" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {{-- Rack chassis --}}
            <rect x="4" y="8" width="56" height="32" rx="2" fill="url(#grad-server)" stroke="#3a4a5a" stroke-width="0.5"/>
            {{-- Top sheen --}}
            <rect x="4" y="8" width="56" height="2" rx="1" fill="#3a4a5a" fill-opacity="0.5"/>
            {{-- Drive bay 1 --}}
            <rect x="8" y="12" width="38" height="6" rx="1" fill="#0f1a24" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="14" y1="12" x2="14" y2="18" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="20" y1="12" x2="20" y2="18" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="26" y1="12" x2="26" y2="18" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="32" y1="12" x2="32" y2="18" stroke="#2a3a4a" stroke-width="0.3"/>
            {{-- Drive bay 2 --}}
            <rect x="8" y="20" width="38" height="6" rx="1" fill="#0f1a24" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="14" y1="20" x2="14" y2="26" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="20" y1="20" x2="20" y2="26" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="26" y1="20" x2="26" y2="26" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="32" y1="20" x2="32" y2="26" stroke="#2a3a4a" stroke-width="0.3"/>
            {{-- Drive bay 3 --}}
            <rect x="8" y="28" width="38" height="6" rx="1" fill="#0f1a24" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="14" y1="28" x2="14" y2="34" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="20" y1="28" x2="20" y2="34" stroke="#2a3a4a" stroke-width="0.3"/>
            <line x1="26" y1="28" x2="26" y2="34" stroke="#2a3a4a" stroke-width="0.3"/>
            {{-- Right panel LEDs --}}
            <circle cx="52" cy="14" r="1.5" fill="#22c55e"/>
            <circle cx="56" cy="14" r="1.5" fill="#22c55e" fill-opacity="0.4"/>
            <circle cx="52" cy="22" r="1.5" fill="#22c55e"/>
            <circle cx="52" cy="30" r="1.5" fill="#f59e0b"/>
            {{-- Power button --}}
            <circle cx="54" cy="34" r="2.5" fill="#0f1a24" stroke="#3a4a5a" stroke-width="0.5"/>
            <circle cx="54" cy="34" r="1" fill="#22c55e"/>
        </symbol>

        {{-- ── FIREWALL — Chassis with grid grille + port panel ────────── --}}
        <symbol id="dev-firewall" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {{-- Chassis body --}}
            <rect x="4" y="10" width="56" height="28" rx="2" fill="url(#grad-firewall)" stroke="#6a5a3a" stroke-width="0.5"/>
            {{-- Top sheen --}}
            <rect x="4" y="10" width="56" height="2.5" rx="1" fill="#7a6a4a" fill-opacity="0.3"/>
            {{-- Grille area --}}
            <rect x="8" y="14" width="34" height="18" rx="1" fill="#1a1208" fill-opacity="0.6"/>
            <line x1="8"  y1="17" x2="42" y2="17" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="8"  y1="20" x2="42" y2="20" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="8"  y1="23" x2="42" y2="23" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="8"  y1="26" x2="42" y2="26" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="8"  y1="29" x2="42" y2="29" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="12" y1="14" x2="12" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="16" y1="14" x2="16" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="20" y1="14" x2="20" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="24" y1="14" x2="24" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="28" y1="14" x2="28" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="32" y1="14" x2="32" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="36" y1="14" x2="36" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            <line x1="40" y1="14" x2="40" y2="32" stroke="#6a5030" stroke-width="0.5"/>
            {{-- Port panel (right) --}}
            <rect x="44" y="14" width="14" height="18" rx="1" fill="#1a1208" fill-opacity="0.4"/>
            <rect x="46" y="16" width="10" height="4" rx="0.5" fill="#0a0804" stroke="#6a5030" stroke-width="0.3"/>
            <rect x="46" y="22" width="10" height="4" rx="0.5" fill="#0a0804" stroke="#6a5030" stroke-width="0.3"/>
            {{-- Status LEDs --}}
            <circle cx="52" cy="28" r="1.2" fill="#f59e0b"/>
            <circle cx="56" cy="28" r="1.2" fill="#22c55e"/>
        </symbol>

        {{-- ── CLOUD — Filled gradient cloud with dashed ground line ───── --}}
        <symbol id="dev-cloud" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {{-- Cloud body --}}
            <path d="M20 36a10 10 0 0 1-2-19.8A13 13 0 0 1 43 18a9 9 0 0 1 4 17z"
                  fill="url(#grad-cloud)" stroke="#5a5880" stroke-width="0.5"/>
            {{-- Inner highlight --}}
            <path d="M22 30a7 7 0 0 1-1-13.8A10 10 0 0 1 39 18a6 6 0 0 1 3 12z"
                  fill="#4a4870" fill-opacity="0.3"/>
            {{-- Ground line --}}
            <line x1="6" y1="38" x2="58" y2="38" stroke="#5a5880" stroke-width="1.5" stroke-dasharray="4 3"/>
            {{-- Drop lines --}}
            <line x1="18" y1="36" x2="18" y2="38" stroke="#5a5880" stroke-width="1"/>
            <line x1="28" y1="36" x2="28" y2="38" stroke="#5a5880" stroke-width="1"/>
            <line x1="38" y1="36" x2="38" y2="38" stroke="#5a5880" stroke-width="1"/>
            <line x1="46" y1="35" x2="46" y2="38" stroke="#5a5880" stroke-width="1"/>
        </symbol>

    </defs>
</svg>
```

- [ ] **Step 2: Verify all 6 symbols and 5 gradients in rendered HTML**

```bash
curl -s http://localhost:8000/topics/network-devices/lessons/network-devices | python3 -c "
import sys, re
html = sys.stdin.read()
syms = sorted(set(re.findall(r'id=\"(dev-[^\"]+)\"', html)))
grads = sorted(set(re.findall(r'id=\"(grad-[^\"]+)\"', html)))
print('Symbols:', syms)
print('Gradients:', grads)
"
```
Expected:
```
Symbols: ['dev-cloud', 'dev-firewall', 'dev-pc', 'dev-router', 'dev-server', 'dev-switch']
Gradients: ['grad-cloud', 'grad-firewall', 'grad-pc', 'grad-server', 'grad-switch']
```

- [ ] **Step 3: Commit**

```bash
git add resources/views/components/svg/sprite.blade.php
git commit -m "feat: redesign svg icons - pt-style flat + isometric 3d router"
```

---

### Task 3: Canvas Upgrades — animation.blade.php

Dot-grid background, color-coded bezier cables, status LEDs, pill-badge packet labels.

**Files:**
- Modify: `resources/views/components/sections/animation.blade.php`

**Interfaces:**
- Consumes: `$links` (array with `from`, `to`, `kind`), `$nodes` (array with `x`, `y`, `id`, `icon`, `label`), `$nodeById` (PHP array keyed by node id), `$packetSlots` (PHP array of precomputed packet positions)
- Produces: upgraded SVG canvas with dot-grid, bezier cables, LEDs, pill badges

- [ ] **Step 1: Replace the SVG opening + links block**

Find this block in `animation.blade.php` (inside the `<div class="p-4">` wrapper):

```blade
                <svg viewBox="0 0 1000 420" class="w-full h-auto select-none" role="img">
                    <g class="text-slate-600">
                        @foreach ($links as $link)
                            @php
                                $from = $nodeById[$link['from']] ?? null;
                                $to = $nodeById[$link['to']] ?? null;
                            @endphp
                            @if ($from && $to)
                                <line x1="{{ $from['x'] }}" y1="{{ $from['y'] }}" x2="{{ $to['x'] }}" y2="{{ $to['y'] }}"
                                      stroke="currentColor" stroke-width="2"
                                      :stroke-dasharray="'{{ $link['kind'] }}' === 'wan' ? '6 4' : ''"
                                      :class="'{{ $link['kind'] }}' === 'crossover' ? 'text-amber-600' : ''" />
                            @endif
                        @endforeach
                    </g>
```

Replace it with:

```blade
                <svg viewBox="0 0 1000 420" class="w-full h-auto select-none" role="img">
                    <defs>
                        <pattern id="anim-dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="1" cy="1" r="1" fill="#1e293b"/>
                        </pattern>
                    </defs>

                    {{-- Dot-grid canvas background --}}
                    <rect width="1000" height="420" fill="url(#anim-dot-grid)"/>

                    {{-- Bezier cables, color-coded by kind --}}
                    <g>
                        @foreach ($links as $link)
                            @php
                                $from = $nodeById[$link['from']] ?? null;
                                $to   = $nodeById[$link['to']] ?? null;
                                if (! $from || ! $to) { continue; }
                                $kind   = $link['kind'] ?? 'ethernet';
                                $isVert = abs($to['y'] - $from['y']) > abs($to['x'] - $from['x']);
                                $cp1x   = $isVert ? $from['x'] + 60 : $from['x'];
                                $cp1y   = $isVert ? $from['y']      : $from['y'] + 60;
                                $cp2x   = $isVert ? $to['x'] + 60   : $to['x'];
                                $cp2y   = $isVert ? $to['y']        : $to['y'] + 60;
                                $stroke = ['ethernet' => '#22c55e', 'wan' => '#f59e0b', 'crossover' => '#f97316'][$kind] ?? '#22c55e';
                                $dash   = $kind === 'wan' ? '8 4' : '';
                            @endphp
                            <path d="M {{ $from['x'] }} {{ $from['y'] }} C {{ $cp1x }} {{ $cp1y }} {{ $cp2x }} {{ $cp2y }} {{ $to['x'] }} {{ $to['y'] }}"
                                  fill="none" stroke="{{ $stroke }}" stroke-width="2"
                                  stroke-opacity="0.7" stroke-dasharray="{{ $dash }}"/>
                        @endforeach
                    </g>
```

- [ ] **Step 2: Add status LED after each `<use>` in the node loop**

Find the node rendering block. After the `<use href>` line add two LED circles:

```blade
                                <g transform="translate(-32, -24)">
                                    <use href="#dev-{{ $n['icon'] ?? 'pc' }}" width="64" height="48" />
                                </g>
                                {{-- Status LED: glow halo + solid dot --}}
                                <circle cx="30" cy="-28" r="4" fill="#22c55e" fill-opacity="0.2"/>
                                <circle cx="30" cy="-28" r="2" fill="#22c55e"/>
```

- [ ] **Step 3: Replace packet label text with pill badge**

Find the packet rendering section:

```blade
                                <g x-show="step === {{ $i }}" :transform="packetTransform({{ $i }}, {{ $j }})">
                                    <circle r="5" fill="{{ $p['color'] }}" />
                                    <text text-anchor="middle" y="-10" class="fill-slate-200 text-[12px] font-medium" stroke="none">{{ $p['label'] }}</text>
                                </g>
```

Replace with:

```blade
                                <g x-show="step === {{ $i }}" :transform="packetTransform({{ $i }}, {{ $j }})">
                                    <circle r="6" fill="{{ $p['color'] }}" />
                                    @if ($p['label'])
                                        <rect x="-28" y="-24" width="56" height="14" rx="7"
                                              fill="#0f172a" stroke="#334155" stroke-width="0.8"/>
                                        <text text-anchor="middle" y="-13" fill="#e2e8f0"
                                              font-size="9" font-family="ui-monospace,monospace">{{ $p['label'] }}</text>
                                    @endif
                                </g>
```

- [ ] **Step 4: Verify dot-grid and bezier paths in rendered HTML**

```bash
curl -s "http://localhost:8000/topics/network-devices/lessons/network-devices" | python3 -c "
import sys, re
html = sys.stdin.read()
print('dot-grid refs:', html.count('anim-dot-grid'))
bezier = re.findall(r'M \d+ \d+ C \d+', html)
print('bezier paths found:', len(bezier))
print('sample:', bezier[0] if bezier else 'none')
"
```
Expected: `dot-grid refs: 2`, `bezier paths found: >= 1`

- [ ] **Step 5: Commit**

```bash
git add resources/views/components/sections/animation.blade.php
git commit -m "feat: add dot-grid canvas, bezier cables, status leds, pill badges to animation"
```

---

### Task 4: Canvas Upgrades — topology.blade.php

Same dot-grid, bezier cables, and status LED upgrades for static topology diagrams. Remove the now-redundant inline symbol defs (global sprite covers them).

**Files:**
- Modify: `resources/views/components/svg/topology.blade.php`

**Interfaces:**
- Consumes: global `#dev-*` symbols from layout sprite (Task 1); props `$nodes`, `$links`, `$highlights`, `$packets`, `$viewBox`

- [ ] **Step 1: Replace topology.blade.php entirely**

```blade
@props([
    'nodes'      => [],
    'links'      => [],
    'highlights' => [],
    'packets'    => [],
    'viewBox'    => '0 0 1000 420',
])

@php
    $highlights = collect($highlights)->map(fn ($id) => (string) $id)->all();
    $nodeMap    = collect($nodes)->keyBy('id');
@endphp

<svg viewBox="{{ $viewBox }}" class="w-full h-auto select-none" role="img">
    <defs>
        <pattern id="topo-dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#1e293b"/>
        </pattern>
    </defs>

    {{-- Dot-grid canvas background --}}
    <rect width="100%" height="100%" fill="url(#topo-dot-grid)"/>

    {{-- Bezier cables --}}
    <g>
        @foreach ($links as $link)
            @php
                $from = $nodeMap[$link['from']] ?? null;
                $to   = $nodeMap[$link['to']] ?? null;
                if (! $from || ! $to) { continue; }
                $kind   = $link['kind'] ?? 'ethernet';
                $isVert = abs($to['y'] - $from['y']) > abs($to['x'] - $from['x']);
                $cp1x   = $isVert ? $from['x'] + 60 : $from['x'];
                $cp1y   = $isVert ? $from['y']      : $from['y'] + 60;
                $cp2x   = $isVert ? $to['x'] + 60   : $to['x'];
                $cp2y   = $isVert ? $to['y']        : $to['y'] + 60;
                $stroke = ['ethernet' => '#22c55e', 'wan' => '#f59e0b', 'crossover' => '#f97316'][$kind] ?? '#22c55e';
                $dash   = $kind === 'wan' ? '8 4' : '';
            @endphp
            <path d="M {{ $from['x'] }} {{ $from['y'] }} C {{ $cp1x }} {{ $cp1y }} {{ $cp2x }} {{ $cp2y }} {{ $to['x'] }} {{ $to['y'] }}"
                  fill="none" stroke="{{ $stroke }}" stroke-width="2"
                  stroke-opacity="0.7" stroke-dasharray="{{ $dash }}"/>
        @endforeach
    </g>

    {{-- Device nodes --}}
    <g>
        @foreach ($nodes as $node)
            <g transform="translate({{ $node['x'] }}, {{ $node['y'] }})">
                <rect x="-40" y="-34" width="80" height="56" rx="6" fill="none"
                    @if (in_array((string) $node['id'], $highlights, true))
                        stroke="#60a5fa" stroke-width="2.5" stroke-dasharray="5 3"
                    @else
                        stroke="transparent" stroke-width="0"
                    @endif
                />
                <g transform="translate(-32, -24)">
                    <use href="#dev-{{ $node['icon'] ?? 'pc' }}" width="64" height="48"/>
                </g>
                {{-- Status LED --}}
                <circle cx="30" cy="-28" r="4" fill="#22c55e" fill-opacity="0.2"/>
                <circle cx="30" cy="-28" r="2" fill="#22c55e"/>
                <text text-anchor="middle" y="34" fill="#cbd5e1" font-size="13" font-weight="500">
                    {{ $node['label'] }}
                </text>
            </g>
        @endforeach
    </g>

    {{-- Optional static packets --}}
    @if (count($packets))
        <g class="pointer-events-none">
            @foreach ($packets as $packet)
                <g transform="translate({{ $packet['x'] }}, {{ $packet['y'] }})">
                    <circle r="6" fill="{{ $packet['color'] ?? '#3b82f6' }}"/>
                    @if (! empty($packet['label']))
                        <rect x="-28" y="-24" width="56" height="14" rx="7"
                              fill="#0f172a" stroke="#334155" stroke-width="0.8"/>
                        <text text-anchor="middle" y="-13" fill="#e2e8f0"
                              font-size="9" font-family="ui-monospace,monospace">{{ $packet['label'] }}</text>
                    @endif
                </g>
            @endforeach
        </g>
    @endif
</svg>
```

- [ ] **Step 2: Verify no inline symbol defs remain**

```bash
grep -c "<symbol" resources/views/components/svg/topology.blade.php
```
Expected: `0`

- [ ] **Step 3: Verify all lesson pages return 200**

```bash
for slug in network-devices interfaces-and-cables tcp-ip-model cisco-ios-cli ethernet-lan-switching-part-1 ethernet-lan-switching-part-2; do
  topic=$(php artisan tinker --execute="echo App\Models\Lesson::where('slug','$slug')->first()?->topic?->slug;" 2>/dev/null | tail -1)
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/topics/$topic/lessons/$slug")
  echo "$slug: $code"
done
```
Expected: all lines end with `200`

- [ ] **Step 4: Commit**

```bash
git add resources/views/components/svg/topology.blade.php
git commit -m "feat: upgrade static topology canvas - bezier cables, dot-grid, status leds"
```

---

### Task 5: Developer Documentation

**Files:**
- Create: `docs/visual-system.md`

- [ ] **Step 1: Write docs/visual-system.md**

```markdown
# Visual System — CCNA Study Platform

Reference for anyone adding new device types, modifying topology diagrams, or changing the canvas conventions.

---

## Architecture

```
layouts/app.blade.php
  └─ <x-svg.sprite />          ← hidden SVG, loaded once per page
       └─ #dev-router           ← isometric 3D
       └─ #dev-switch           ← PT flat chassis
       └─ #dev-pc               ← monitor + base
       └─ #dev-server           ← 1U rack
       └─ #dev-firewall         ← grille chassis
       └─ #dev-cloud            ← filled cloud

animation.blade.php             ← step-through animated topologies
  └─ <use href="#dev-...">      ← references global sprite

topology.blade.php              ← static topology diagrams
  └─ <use href="#dev-...">      ← references global sprite
```

The sprite is in `resources/views/components/svg/sprite.blade.php`. Both topology components reference it. Adding a new symbol here makes it available everywhere with zero other changes.

---

## Device Icon Inventory

| Symbol ID      | Style           | Main fill      | Accent                        |
|----------------|-----------------|----------------|-------------------------------|
| `#dev-router`  | Isometric 3D    | `#0d5fa6`      | Top `#1a7bc4`, side `#0a4a82` |
| `#dev-switch`  | PT flat chassis | `#3b5270`      | Port rows, green LEDs         |
| `#dev-pc`      | Monitor + base  | `#2e4a6e`      | Screen glow `#38bdf8`         |
| `#dev-server`  | 1U rack slab    | `#2d3a4a`      | Drive bays, status LEDs       |
| `#dev-firewall`| Grille chassis  | `#4a3d2a`      | Amber grille, port panel      |
| `#dev-cloud`   | Filled cloud    | `#3d3a5c`      | Dashed ground line            |

All symbols use `viewBox="0 0 64 48"`. The `<use>` element **must** carry `width="64" height="48"` as SVG presentational attributes — CSS `h-12 w-16` classes do not reliably size `<use>` elements that reference `<symbol>` elements across browsers.

---

## Adding a New Device Type

1. Open `resources/views/components/svg/sprite.blade.php`.
2. Add a `<linearGradient id="grad-yourtype">` in the outer `<defs>` block.
3. Add a `<symbol id="dev-yourtype" viewBox="0 0 64 48">` in the same `<defs>` block. Draw your icon inside it.
4. Use it in any lesson JSON: set `"icon": "yourtype"` on any node.

No Blade template changes needed. Both `animation.blade.php` and `topology.blade.php` resolve icons via `#dev-{{ $node['icon'] }}` dynamically.

---

## Canvas Conventions

### Dot-Grid Background

Both topology components define a local SVG `<pattern>`:

```svg
<pattern id="anim-dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
    <circle cx="1" cy="1" r="1" fill="#1e293b"/>
</pattern>
<rect width="1000" height="420" fill="url(#anim-dot-grid)"/>
```

Pattern ID: `anim-dot-grid` in animation, `topo-dot-grid` in topology (kept separate to avoid ID collisions when both appear on the same page).

### Cable Colors

Cables are cubic bezier `<path>` elements, not straight `<line>` elements.

| `link.kind`  | Stroke     | Dash    | Meaning                   |
|--------------|------------|---------|---------------------------|
| `ethernet`   | `#22c55e`  | none    | UTP / straight-through    |
| `wan`        | `#f59e0b`  | `8 4`   | Serial / WAN / cloud link |
| `crossover`  | `#f97316`  | none    | Crossover cable           |

**Control point formula:**
- Horizontal links (`dx > dy`): control points drop `+60` SVG units below each endpoint
  `M x1 y1 C x1 (y1+60) x2 (y2+60) x2 y2`
- Vertical links (`dy > dx`): control points shift `+60` SVG units to the right
  `M x1 y1 C (x1+60) y1 (x2+60) y2 x2 y2`

This produces a natural arc without hard angles in both layout orientations.

### Status LEDs

Every device node has a green "link-up" indicator at `(30, -28)` relative to node center (top-right of the 64×48 bounding box):

```svg
<circle cx="30" cy="-28" r="4" fill="#22c55e" fill-opacity="0.2"/>  <!-- glow halo -->
<circle cx="30" cy="-28" r="2" fill="#22c55e"/>                      <!-- solid dot -->
```

Static only — dynamic up/down state is not yet implemented.

### Packet Pill Badges

Animated packet labels use a pill-shaped background behind the text:

```svg
<circle r="6" fill="#22c55e"/>
<rect x="-28" y="-24" width="56" height="14" rx="7" fill="#0f172a" stroke="#334155" stroke-width="0.8"/>
<text text-anchor="middle" y="-13" fill="#e2e8f0" font-size="9" font-family="ui-monospace,monospace">
    hop 1
</text>
```

---

## Isometric Router — SVG Geometry Reference

Three-face cabinet isometric projection using `+8, -8` SVG unit depth offset:

```
Top face:    polygon points="8,28 48,28 56,20 16,20"   fill:#1a7bc4  (light)
Front face:  rect x="8" y="28" width="40" height="13"  fill:#0d5fa6  (Cisco blue)
Right face:  polygon points="48,28 56,20 56,33 48,41"  fill:#0a4a82  (dark)
```

Front face features (y=28 to y=41, x=8 to x=48):
- 4 port openings at `y=30`, `x=11,18,25,32`, each `5×3` px, fill `#041e3d`
- 3 status LEDs at `y=37`, `x=11,15,19`, radius `1.5` — 2× green, 1× amber
- 3 Cisco branding lines at `x=39–46`, `y=30,32,34`

Right face features: 3 ventilation slots at `x=49–55`, `y=23,26,29`

---

## Lesson JSON — Topology Data Format

Nodes (`sections[].content.nodes[]`):

```json
{ "id": "r1", "label": "R1", "icon": "router", "x": 420, "y": 150 }
```

- `icon`: one of `router` | `switch` | `pc` | `server` | `firewall` | `cloud`
- `x`, `y`: SVG user units within the `1000 × 420` viewBox
- `id`: referenced by `animate.packet_from`, `animate.packet_to`, `animate.highlight`

Links (`sections[].content.links[]`):

```json
{ "from": "r1", "to": "r2", "kind": "wan" }
```

- `kind`: `ethernet` | `wan` | `crossover`
```

- [ ] **Step 2: Verify file length**

```bash
wc -l docs/visual-system.md
```
Expected: `> 100` lines

- [ ] **Step 3: Commit**

```bash
git add docs/visual-system.md
git commit -m "docs: add visual-system.md - icon system, canvas conventions, geometry reference"
```

---

## Self-Review

**Spec coverage check:**
- ✅ PT-style filled icons (switch, PC, server, firewall, cloud) → Task 2
- ✅ Isometric 3D router (3 faces, ports, LEDs, ventilation slots) → Task 2
- ✅ Dot-grid dark canvas → Task 3 + 4
- ✅ Bezier color-coded cables (ethernet green, WAN amber/dashed, crossover orange) → Task 3 + 4
- ✅ Status LEDs per device (glow halo + solid dot) → Task 3 + 4
- ✅ Pill badge packet labels → Task 3
- ✅ No JSON/model/route/JS changes → confirmed across all tasks
- ✅ `docs/visual-system.md` for future developers → Task 5

**Placeholder scan:** No TBDs, TODOs, or incomplete blocks found.

**Type consistency:**
- `$nodeById` (animation) and `$nodeMap` (topology) — both `collect($nodes)->keyBy('id')`, named differently to match existing conventions in each file ✅
- `#dev-*` symbol IDs — consistent across sprite, animation, topology ✅
- Cable colors — identical hex values in Tasks 3, 4, and docs ✅
- LED position `(30, -28)` — identical in Tasks 3, 4, and docs ✅
