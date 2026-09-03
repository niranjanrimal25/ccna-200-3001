# CCNA Study Platform — Documentation Index

This documentation is split section-wise so each part can be read, updated, or
referenced on its own as the app grows.

| # | Section | What's in it |
|---|---------|---------------|
| 1 | [Overview](01-overview.md) | What the app is, the core idea (script → structured data → render), the pipeline diagram |
| 2 | [Tech Stack](02-tech-stack.md) | Laravel 10, Alpine.js, SVG, Tailwind, SQLite/MySQL — and why each was chosen |
| 3 | [Database Schema](03-database-schema.md) | Every table: domains, topics, lessons, sections, quizzes, quiz_questions, quiz_options |
| 4 | [Section Content Shapes](04-section-content-shapes.md) | The JSON shape for each section `type`: explanation, diagram, animation, interactive, table, callout |
| 5 | [Conversion Pipeline](05-conversion-pipeline.md) | The 5-step process for turning a raw transcript into lesson JSON |
| 6 | [Interactivity Guidelines](06-interactivity-guidelines.md) | Which topics deserve a real interactive widget vs. animation-only |
| 7 | [Project Structure](07-project-structure.md) | Laravel folder layout — models, views, seeders, content storage |
| 8 | [Roadmap](08-roadmap.md) | Build order from here |

**Worked example:** `lesson-1-network-devices.json` (data) and
`lesson-1-network-devices.html` (rendered preview) — built from transcript
`1.txt`, referenced throughout these docs.
