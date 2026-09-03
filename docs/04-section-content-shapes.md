# 4. Section `content` JSON Shapes

← [Database Schema](03-database-schema.md) | Next: [Conversion Pipeline](05-conversion-pipeline.md) →

## `explanation`
```json
{
  "body": "Markdown-formatted study text. Short, direct, textbook-style — not spoken narration."
}
```

## `diagram`
A static, labeled SVG-driven diagram, e.g. device icons or a topology.

Device gallery:
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

Topology:
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

## `animation`
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

## `interactive` (used sparingly — see section 6)
```json
{
  "widget": "click_to_reveal | drag_topology | config_sim | subnet_calc",
  "config": { "...": "widget-specific" }
}
```

## `table`
```json
{
  "headers": ["Cable Type", "Max Length", "Use Case"],
  "rows": [ ["Cat5e", "100m", "Basic Ethernet"], ["Cat6", "100m (10G at 55m)", "Higher speed"] ]
}
```

## `callout`
```json
{ "style": "note | warning | exam_tip", "body": "Cisco exams often test edge cases like this..." }
```
