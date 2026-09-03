# 3. Database Schema

← [Tech Stack](02-tech-stack.md) | Next: [Section Content Shapes](04-section-content-shapes.md) →

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
├── content         JSON — shape depends on `type` (see section 4)

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

## Why `sections` is polymorphic-by-`type` with a JSON `content` column

Rather than separate tables per visual type, the *set* of visual types will
grow as we hit new kinds of topics (e.g. a subnetting calculator is a very
different shape than a device-icon diagram). A flexible `content` JSON keeps
the schema stable while the renderer grows. Each `type` has its own
documented JSON shape (see section 4), so it's still structured, just not
rigidly tabular.
