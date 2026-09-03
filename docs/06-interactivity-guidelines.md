# 6. Where Real Interactivity Is Worth Building

← [Conversion Pipeline](05-conversion-pipeline.md) | Next: [Project Structure](07-project-structure.md) →

Given the content type, most lessons only need explanation + diagram +
animation + quiz. A small number of topics justify a true interactive
widget, because *doing* is how those specific concepts are learned:

- **Subnetting / VLSM practice** → subnet calculator / practice widget
- **VLAN & trunk configuration** → click-to-configure switch port simulator
- **Routing table / longest-prefix-match** → interactive lookup demo
- **OSPF/STP state machines** → clickable state-transition diagram

These will be flagged topic-by-topic as we convert more scripts, not built
speculatively — building full simulations for every topic up front would be
slow and mostly wasted effort on topics that don't need it (e.g. "what is a
router" doesn't need a drag-and-drop simulator, an animated request/response
already replaces what the video showed).
