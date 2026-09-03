# 5. Conversion Pipeline (transcript → lesson JSON)

← [Section Content Shapes](04-section-content-shapes.md) | Next: [Interactivity Guidelines](06-interactivity-guidelines.md) →

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

5. **Save as lesson JSON**, matching the shapes in section 4, ready to seed.

I did this for transcript 1 already — see `lesson-1-network-devices.json`
and the rendered preview, as the worked example.
