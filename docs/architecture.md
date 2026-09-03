# CCNA Study Platform — Architecture & Documentation

## 1. What this app is

A Laravel 10 web application that turns raw CCNA course transcripts (spoken video
scripts) into structured, interactive study material rendered entirely in the
browser: explanations, diagrams, animated step-throughs, and quizzes — no video,
no external book.

The core idea: **the transcript is a raw material, not the final content.** The
video's original slides/diagrams no longer exist — only Jeremy's spoken
description of them survives in the text ("here's a switch," "watch this
exchange between two PCs"). So every transcript goes through a **conversion
step** that turns spoken narration into structured lesson data, before anything
is rendered.

```
Raw transcript (.txt)
        │
        ▼
 Conversion pass (manual/AI-assisted, one-time per script)
        │
        ▼
 Structured lesson JSON  ──seed/import──▶  MySQL/SQLite tables
        │
        ▼
 Laravel Blade + Alpine.js + SVG components render it in-browser
```

This means adding transcript #7 later is: run it through the same conversion
shape → import → it appears in the app. No new Blade pages, no new routes.


## 2. Tech stack

- **Laravel 10** (PHP 8.1+) — routing, Eloquent models, Blade views
- **Alpine.js** — lightweight interactivity (step-through controls, quiz state,
  toggles) without a heavy SPA framework. Fits Blade-rendered pages well.
- **Native SVG** (hand-built or generated components) — all diagrams. SVG is
  ideal here: crisp at any zoom, easy to animate with CSS/JS, easy to make
  data-driven (a topology is just a list of nodes + links).
- **Tailwind CSS** — utility styling, consistent design tokens across lesson
  types.
- **SQLite for local dev / MySQL for production** — content is small and
  relational, no need for anything heavier.
- **Filament (optional, phase 2)** — admin panel for importing/editing lesson
  JSON without touching code.

No React/Vue needed. The interactivity required (step through an animation,
click a device to reveal info, answer a quiz) is well within what Alpine.js
handles cleanly inside Blade templates, and keeps the stack simple to maintain
as one person adding content over time.


## 3. Database schema

```
domains
├── id
├── code            e.g. "1.0"
├── title           e.g. "Network Fundamentals"
├── order

topics
├── id
├── domain_id       FK → domains
├── slug            e.g. "network-devices"
├── title           e.g. "Network Devices"
├── order

lessons
├── id
├── topic_id        FK → topics
├── slug
├── title
├── summary         short study-guide-style summary (1-2 sentences)
├── source_ref      e.g. "transcript_1.txt" (traceability back to source)
├── order

sections
├── id
├── lesson_id       FK → lessons
├── order
├── type            enum: explanation | diagram | animation | interactive | table | callout
├── title           nullable, section heading
├── content         JSON — shape depends on `type` (see §4)

quizzes
├── id
├── lesson_id       FK → lessons  (one quiz per lesson, matches source material)

quiz_questions
├── id
├── quiz_id         FK → quizzes
├── order
├── question        text
├── explanation     text — shown after answering (extracted from transcript's
                     own answer-walkthrough, which is already high quality)

quiz_options
├── id
├── quiz_question_id  FK → quiz_questions
├── label             "A", "B", "C", "D"
├── text
├── is_correct        boolean

user_progress   (phase 2 — not needed for v1, but planned)
├── id
├── lesson_id
├── completed_at
├── quiz_score
```

Why sections are polymorphic-by-`type` with a JSON `content` column, rather
than separate tables per visual type: the *set* of visual types will grow as
we hit new kinds of topics (e.g. a subnetting calculator is a very different
shape than a device-icon diagram). A flexible `content` JSON keeps the schema
stable while the renderer grows. Each `type` has its own documented JSON
shape (§4), so it's still structured, just not rigidly tabular.


## 4. Section `content` JSON shapes

### `explanation`
```json
{
  "body": "Markdown-formatted study text. Short, direct, textbook-style — not spoken narration."
}
```

### `diagram`
A static, labeled SVG-driven diagram, e.g. device icons or a topology.
```json
{
  "diagram_type": "device_gallery",
  "nodes": [
    { "id": "router", "label": "Router", "icon": "router",
      "description": "Forwards traffic between different networks." },
    { "id": "switch", "label": "Switch", "icon": "switch",
      "description": "Connects many end hosts within the same LAN." }
  ]
}
```
or, for a topology:
```json
{
  "diagram_type": "topology",
  "nodes": [
    { "id": "pc1", "label": "PC1", "icon": "pc", "x": 100, "y": 150 },
    { "id": "pc2", "label": "PC2", "icon": "pc", "x": 400, "y": 150 }
  ],
  "links": [ { "from": "pc1", "to": "pc2", "kind": "ethernet" } ]
}
```

### `animation`
A step-through sequence, rendered with "Next / Back" controls (Alpine.js
manages the current-step index; each step highlights/animates part of the
same SVG).
```json
{
  "diagram_type": "topology",
  "nodes": [ ... ],
  "links": [ ... ],
  "steps": [
    { "narration": "PC1 requests the file image.jpg from PC2.",
      "animate": { "packet_from": "pc1", "packet_to": "pc2", "label": "request: image.jpg" } },
    { "narration": "PC2 responds and sends the file. PC2 is acting as the server here.",
      "animate": { "packet_from": "pc2", "packet_to": "pc1", "label": "image.jpg", "highlight": "pc2" } }
  ]
}
```

### `interactive` (used sparingly — see §6)
```json
{
  "widget": "click_to_reveal | drag_topology | config_sim | subnet_calc",
  "config": { "...": "widget-specific" }
}
```

### `table`
```json
{
  "headers": ["Cable Type", "Max Length", "Use Case"],
  "rows": [ ["Cat5e", "100m", "Basic Ethernet"], ["Cat6", "100m (10G at 55m)", "Higher speed"] ]
}
```

### `callout`
```json
{ "style": "note | warning | exam_tip", "body": "Cisco exams often test edge cases like this..." }
```


## 5. Conversion pipeline (transcript → lesson JSON)

This is the actual content-authoring work, done once per transcript:

1. **Segment** the transcript into concepts, ignoring `[mm:ss]` timestamps
   (they're a transcription artifact, not structure).
2. **Rewrite** spoken narration into concise explanation-section prose —
   textbook tone, not "Let's ask our friends at Wikipedia."
3. **Detect implied visuals** — every place the speaker references something
   visual ("here's a switch," "watch this exchange," "I'll zoom in") becomes
   an explicit `diagram` or `animation` section instead of prose.
4. **Extract the embedded quiz** — these transcripts already contain full
   quiz questions, options, correct answers, and explanations near the end.
   This is high-value, ready-made content — pull it directly into
   `quiz_questions` / `quiz_options` rather than rewriting it.
5. **Save as lesson JSON**, matching the schema in §4, ready to seed.

I did this for transcript 1 already — see `/lesson-1-network-devices.json`
and the rendered preview, as the worked example.


## 6. Where real interactivity is worth building

Given the content type, most lessons only need explanation + diagram +
animation + quiz. A small number of topics justify a true interactive
widget, because *doing* is how those specific concepts are learned:

- Subnetting / VLSM practice → subnet calculator / practice widget
- VLAN & trunk configuration → click-to-configure switch port simulator
- Routing table / longest-prefix-match → interactive lookup demo
- OSPF/STP state machines → clickable state-transition diagram

These will be flagged topic-by-topic as we convert more scripts, not built
speculatively.


## 7. Laravel project structure (planned)

```
app/
  Models/ (Domain, Topic, Lesson, Section, Quiz, QuizQuestion, QuizOption)
  Http/Controllers/LessonController.php
resources/
  views/
    lessons/show.blade.php          — dispatches sections by type
    components/sections/
      explanation.blade.php
      diagram.blade.php
      animation.blade.php
      interactive.blade.php
      table.blade.php
      callout.blade.php
    components/quiz.blade.php
    components/svg/                 — reusable device icons (router, switch, pc, server, firewall, cloud)
database/
  migrations/
  seeders/LessonSeeder.php          — reads lesson JSON files and imports
storage/content/lessons/*.json      — the converted lesson content files (source of truth, version-controlled)
```

Content lives as JSON files in the repo (not hand-entered via admin UI at
first) so each new script you provide just drops in as a new file + a seeder
run — simple and diffable while the library is still small.


## 8. Roadmap

1. ✅ Architecture, schema, conversion process (this document)
2. ✅ One fully worked example lesson (Network Devices) — data + rendered preview
3. Scaffold actual Laravel app: migrations, models, Blade components, seeder
4. Convert remaining provided scripts (2–6) into lesson JSON
5. Build the reusable SVG icon set (router, switch, firewall, server, client, cloud) once, used everywhere
6. Basic navigation shell: domain → topic → lesson list, progress indicator
7. (Later) Admin import UI, interactive widgets for flagged topics, flashcard export
