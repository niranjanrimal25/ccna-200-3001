# 2. Tech Stack

← [Overview](01-overview.md) | Next: [Database Schema](03-database-schema.md) →

- **Laravel 10** (PHP 8.1+) — routing, Eloquent models, Blade views.

- **Alpine.js** — lightweight interactivity (step-through controls, quiz
  state, toggles) without a heavy SPA framework. Fits Blade-rendered pages
  well, and keeps the mental model close to plain HTML.

- **Native SVG** (hand-built or generated components) — all diagrams. SVG is
  ideal here: crisp at any zoom, easy to animate with CSS/JS, easy to make
  data-driven (a topology is just a list of nodes + links).

- **Tailwind CSS** — utility styling, consistent design tokens across lesson
  types.

- **SQLite for local dev / MySQL for production** — content is small and
  relational, no need for anything heavier.

- **Filament (optional, phase 2)** — admin panel for importing/editing lesson
  JSON without touching code.

**No React/Vue needed.** The interactivity required (step through an
animation, click a device to reveal info, answer a quiz) is well within what
Alpine.js handles cleanly inside Blade templates, and keeps the stack simple
to maintain as one person adding content over time.
