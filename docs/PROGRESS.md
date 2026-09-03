# CCNA 200-301 Study Platform — Build Progress

Last updated: 2026-08-11

---

## What This Is

A Laravel 12 web application that converts CCNA course transcripts (Jeremy's IT Lab) into structured, interactive study material — explanations, animated topology diagrams, quizzes, and a Cisco IOS CLI simulator — rendered entirely in the browser.

---

## Completed Work

### 1. Content Pipeline — All 6 Scripts Converted

Six raw transcript files (`1.txt` – `6 part 2.txt`) converted into structured lesson JSON stored in `storage/content/lessons/`:

| File | Lesson | Sections | Quiz |
|------|--------|----------|------|
| `network-devices.json` | Network Devices | 10 | 5 questions |
| `interfaces-and-cables.json` | Interfaces and Cables | 13 | 5 questions |
| `tcp-ip-model.json` | The TCP/IP Model | 10 | 5 questions |
| `cisco-ios-cli.json` | The Cisco IOS CLI | 10 | 5 questions |
| `ethernet-lan-switching-part-1.json` | Ethernet LAN Switching (Part 1) | 10 | 5 questions |
| `ethernet-lan-switching-part-2.json` | Ethernet LAN Switching (Part 2) | 8 | 5 questions |

Each lesson JSON contains: `slug`, `title`, `summary`, `source_ref`, `order`, `sections[]`, `quiz{}`.

---

### 2. Laravel App — Full Stack

**Database (SQLite for local dev):**
- `domains` — e.g. "1.0 Network Fundamentals"
- `topics` — e.g. "Ethernet LAN Switching"
- `lessons` — slug, title, summary, source_ref, order
- `sections` — type (explanation/diagram/animation/interactive/table/callout), content (JSON)
- `quizzes`, `quiz_questions`, `quiz_options`

**Models:** `Domain`, `Topic`, `Lesson`, `Section`, `Quiz`, `QuizQuestion`, `QuizOption`, `UserProgress`

**Seeder:** `LessonSeeder` reads all JSON files from `storage/content/lessons/`, upserts domain/topic/lesson/sections/quiz. Re-run anytime content changes:
```bash
php artisan db:seed --class=LessonSeeder
```

**Routes:**
```
GET /                                          → home (lesson index)
GET /topics/{topic}/lessons/{lesson}           → lesson show
GET /labs/router                               → router lab
```

**Controllers:** `LessonController` (index, show), `LabController` (router)

---

### 3. Section Renderer — All 6 Types

Blade components in `resources/views/components/sections/`:

| Type | Component | What it renders |
|------|-----------|-----------------|
| `explanation` | `explanation.blade.php` | Markdown prose via `Str::markdown()` |
| `diagram` | `diagram.blade.php` | Dispatches to sub-components by `diagram_type` |
| `animation` | `animation.blade.php` | Step-through topology with Alpine.js controls |
| `table` | `table.blade.php` | Responsive table with styled header |
| `callout` | `callout.blade.php` | Coloured callout box (note/warning/exam_tip) |
| `interactive` | `interactive.blade.php` | Placeholder for future widgets |

**Diagram sub-types** (`resources/views/components/svg/diagrams/`):
- `device-gallery` — grid of device icon cards
- `topology` — static node/link diagram
- `layer-stack` — TCP/IP layer visualization
- `frame-fields` — Ethernet frame field breakdown (horizontally scrollable)
- `fiber-comparison` — fiber cable comparison
- `mode-transition` — IOS CLI mode diagram

---

### 4. SVG Icon System — PT-Style + Isometric 3D Router

All icons defined as SVG symbols in `resources/views/components/svg/sprite.blade.php`, loaded once globally via `layouts/app.blade.php`.

| Symbol | Style | Colors |
|--------|-------|--------|
| `#dev-router` | **Isometric 3D Cisco chassis** | Cisco blue `#0d5fa6`, top `#1a7bc4`, side `#0a4a82` |
| `#dev-switch` | PT flat chassis, 2×8 port rows | Slate blue `#3b5270` |
| `#dev-pc` | Monitor + stand + base, screen glow | Steel blue `#2e4a6e` |
| `#dev-server` | 1U rack slab, 3 drive bays | Dark grey `#2d3a4a` |
| `#dev-firewall` | Grid grille chassis + port panel | Amber-brown `#4a3d2a` |
| `#dev-cloud` | Filled gradient cloud, dashed ground | Indigo `#3d3a5c` |

**Using icons in SVG:** always use `width="64" height="48"` as attributes (CSS classes don't reliably size `<use>` elements).

---

### 5. Topology Canvas Conventions

Both `animation.blade.php` and `topology.blade.php` share:

- **Dot-grid background** — `#1e293b` dots on `#0f172a`, 20-unit grid
- **Bezier cables** — cubic curves (`M x1 y1 C cp1x cp1y cp2x cp2y x2 y2`), control points +60 units perpendicular to link direction
- **Cable colors** — ethernet `#22c55e` (green), WAN `#f59e0b` amber dashed, crossover `#f97316` orange
- **Status LEDs** — green glow halo + solid dot at top-right of each device icon
- **Pill badges** — monospace label on animated packet dots
- **Dynamic viewBox** — automatically expands to fit all node positions (prevents right-edge clipping)

Full reference: [`visual-system.md`](visual-system.md)

---

### 6. Quiz Component

`resources/views/components/quiz.blade.php` + `Alpine.data('quizApp')` in `app.js`:

- Shows one question at a time
- Click an option → immediate feedback (correct/wrong highlighting)
- Explanation text shown after answering
- Score tracked across all questions
- "Finish" → score summary → "Retake quiz" resets

---

### 7. Navigation Shell

- **Sidebar** — sticky left panel (desktop), top bar (mobile); shows all domains → topics → lessons with active-lesson highlight
- **Home page** — lesson card grid showing section count + quiz indicator
- **Lesson page** — breadcrumb, prev/next lesson navigation, section list, quiz at bottom
- **Labs section** — sidebar entry linking to `/labs/router`

Active lesson detection uses `request()->route('lesson')?->is($navLesson)` (not `request('lesson')` which doesn't read route params).

---

### 8. Router Lab — `/labs/router`

**URL:** `http://localhost:8000/labs/router`

**Front panel:** Cisco 2911 SVG (`viewBox="0 0 900 120"`) with:
- Rack ears, top/bottom bezel
- PWR (green), SYS (green), ACT (amber) system LEDs
- NM Slot 0 (empty, decorative)
- 3× GigabitEthernet ports (G0/0, G0/1, G0/2) — link LEDs turn green on `no shutdown`
- Console port (blue), AUX, USB
- Cisco 2911 branding
- Click any GigE port → tooltip showing IP, status, description

**IOS CLI Simulator** (`resources/js/router-sim.js` — `Alpine.data('routerLab')`):

Modes: `Router>` → `Router#` → `Router(config)#` → `Router(config-if)#`

Full command set:

| Mode | Commands |
|------|----------|
| User EXEC | `enable`, `show version`, `show ip interface brief`, `ping`, `logout` |
| Privileged EXEC | `disable`, `configure terminal`, `show running-config`, `show startup-config`, `show interfaces`, `show ip route`, `copy running-config startup-config`, `write memory`, `reload`, `ping` |
| Global config | `hostname`, `interface`, `ip route`, `no ip route`, `enable secret`, `banner motd`, `no hostname`, `exit`, `end` |
| Interface config | `ip address`, `no ip address`, `no shutdown`, `shutdown`, `description`, `clock rate`, `duplex`, `speed`, `exit`, `end` |

Terminal features:
- `↑` / `↓` — command history (last 20)
- `Tab` — context-sensitive completion
- `?` — help listing for current mode
- `Ctrl+C` — break back to privileged EXEC
- `enable secret` — password prompt before entering privileged mode
- `reload` — full router state reset

---

## Bug Fixes Applied

| Bug | Fix |
|-----|-----|
| Callout `style` field lost during seeding | Moved `style` from section level into `content` object in all 6 JSONs, re-seeded |
| TCP/IP Model had no quiz | Added 5 quiz questions covering PDUs, ports, hops, IEEE/IETF, router forwarding |
| Sidebar active-lesson never highlighted | Changed `request('lesson')` → `request()->route('lesson')?->is($navLesson)` |
| SVG `<use>` icons rendering huge | Added `width="64" height="48"` attributes to all `<use>` elements (CSS classes don't size `<use>`) |
| SRV1 clipping on right edge of topology | Dynamic viewBox: `max(1000, maxNodeX + 100)` calculated per animation section |
| Frame-fields diagram cut off | Changed `overflow-hidden` to `overflow-x-auto`, proportional widths from byte counts |
| Prev/next nav N+1 query | Added `with('topic')` eager load on prev/next queries |
| Device gallery showing old icons | Updated to use `<svg><use href="#dev-...">` from global sprite |

---

## How to Run

```bash
# Start dev server (PHP)
php artisan serve

# Build frontend (first time or after JS/CSS changes)
npm run build

# Re-seed content (after editing lesson JSON files)
php artisan db:seed --class=LessonSeeder

# Re-seed from scratch
php artisan migrate:fresh && php artisan db:seed --class=LessonSeeder
```

App runs at: `http://localhost:8000`

---

## File Structure (Key Files)

```
app/
  Http/Controllers/
    LessonController.php       — index(), show()
    LabController.php          — router()
  Models/
    Domain, Topic, Lesson, Section, Quiz, QuizQuestion, QuizOption

database/
  migrations/
    2026_01_01_000001_create_content_tables.php
    2026_01_01_000002_create_quiz_tables.php
  seeders/LessonSeeder.php

resources/
  js/
    app.js                     — Alpine.data registrations + Alpine.start()
    router-sim.js              — routerLabData() — full IOS CLI simulator
  views/
    layouts/app.blade.php      — sidebar nav, sprite injection
    lessons/
      index.blade.php          — home page (lesson card grid)
      show.blade.php           — lesson page (sections + quiz)
    labs/
      router.blade.php         — router lab page
    components/
      sections/                — explanation, diagram, animation, table, callout, interactive
      svg/
        sprite.blade.php       — all #dev-* SVG symbols + gradients
        topology.blade.php     — static topology diagram
        diagrams/              — device-gallery, frame-fields, layer-stack, fiber-comparison, mode-transition
      lab/
        router-panel.blade.php — Cisco 2911 SVG front panel
        cli-terminal.blade.php — IOS terminal UI
      quiz.blade.php           — quiz component

storage/content/lessons/       — 6 lesson JSON files (source of truth)

docs/
  PROGRESS.md                  — this file
  visual-system.md             — SVG icon system + canvas conventions reference
  08-roadmap.md                — project roadmap
  superpowers/
    specs/                     — design specs
    plans/                     — implementation plans
```

---

## What's Next (Sprint 2)

- **Multi-device lab canvas** — add switch + PC alongside the router, drag cables to connect
- **Port connection state** — cable between router G0/0 and switch updates both devices' line protocol
- **More interactive section types** — subnet calculator, VLAN config sim
- **Admin import UI** — Filament panel for importing new lesson JSON without touching code
- **User progress tracking** — mark lessons complete, quiz scores persisted
