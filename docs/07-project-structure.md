# 7. Laravel Project Structure (planned)

← [Interactivity Guidelines](06-interactivity-guidelines.md) | Next: [Roadmap](08-roadmap.md) →

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
