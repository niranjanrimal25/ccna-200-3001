# 1. Overview

← [Index](00-index.md) | Next: [Tech Stack](02-tech-stack.md) →

## What this app is

A Laravel 10 web application that turns raw CCNA course transcripts (spoken
video scripts) into structured, interactive study material rendered entirely
in the browser: explanations, diagrams, animated step-throughs, and quizzes —
no video, no external book.

## The core idea

**The transcript is a raw material, not the final content.** The video's
original slides/diagrams no longer exist — only Jeremy's spoken description
of them survives in the text ("here's a switch," "watch this exchange
between two PCs"). So every transcript goes through a **conversion step**
that turns spoken narration into structured lesson data, before anything is
rendered.

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
