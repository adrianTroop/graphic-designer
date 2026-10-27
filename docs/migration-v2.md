# Migrating to schema version 2

Version 2 removes fixed event fields and built-in visual families. The current distribution contains a fictional neutral demo instead of a real client package. Earlier commits remain in Git history; this migration does not rewrite history.

| Version 1 | Version 2 |
| --- | --- |
| `family` from three fixed choices | `template` names defined by each brand |
| `language` from a fixed list | `locales` using BCP 47 tags |
| `headline`, `event`, `notice` | Arbitrary `content` keys defined by template fields |
| Top-level logo and geometry conventions | Optional asset layers with explicit boxes |
| Fixed frame/panel/icon slots | Ordered text, shape and asset layers |
| Brand-specific renderer branches | Configuration-driven rendering |

Create a new package with `init-brand`, then bring across approved rules and assets deliberately. Register asset IDs and provenance; configure the needed fields and templates; create a schema-v2 brief and inspect its render. There is no silent v1 conversion because automatically guessing typography, field mapping or placement could change an existing design.

Old rendered exports are still valid files. Preserve their provenance and source project separately if needed. The new generic core does not require any legacy client material.
