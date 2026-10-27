# Standardisation model

Separate three layers of responsibility:

| Layer | Location | Changes when |
| --- | --- | --- |
| Designer behaviour and workflow | `.hermes.md`, project skill, optional `SOUL.md` | The general production process changes. |
| Brand evidence and design rules | `brands/<id>/` | A brand, source asset or approved design decision changes. |
| Reproducible production | `src/`, tests, brief contract | Rendering, validation or supported outputs change. |

## Adding a brand

1. Create a unique folder and ID using `brands/_template/README.md`.
2. Audit accessible publications directly. Keep original post URLs, dates, what was inspected and access gaps. Retain representative artwork references separately from production assets.
3. Write `design.md` describing identities, typography, colours, publication families, formats, language, layout, workflow and gaps. Label observations, inferences and proposals.
4. Build `assets/asset-manifest.json` with IDs, relative paths, source URLs, provenance, dimensions and limitations. Preserve original masters and mark adaptations.
5. Define `brand.json` tokens and layouts only for supported automatic families. Custom brands may require renderer work; copying the folder does not magically automate every format.
6. Create a labelled sample brief for each connected layout. Run mechanical checks, render, compare visually with the references and record review outcomes.

## Evidence and asset standard

Every production asset must have an ID, source or reconstruction reference, provenance status and useful size information. Every automatic template must cite at least one evidence record or an explicit approved design decision. Keep exact source files unchanged; maintain adaptations as separate files.

Source artwork retained for analysis is not automatically licensed for redistribution or new campaigns. This repository includes client-specific reference media; keep repository visibility private by default when creating a remote unless the user chooses otherwise after considering those contents. No open-source licence is applied to third-party brand material.

## Versioning

The starter is v0.1.0. Brief and brand `schema_version` start at 1. Additive optional fields can remain version 1; meaning changes and required fields need a schema migration. Jobs use unique IDs such as `event-reminder-tc-v02`. Preserve old jobs so published references can be traced to the exact facts and assets.

## Coverage and next implementation stages

| Stage | State |
| --- | --- |
| Brand evidence, design guide, transparent assets, Hermes persona and skill | Included |
| Single red operational, purple guide and monthly covers | Automated draft rendering included |
| Inner operational cards, monthly event cards and summary calendars | Guide rules included; automated templates still to implement |
| Promoter layouts, photo selection, collage, PDF and video | Designer-led workflows documented; no automatic renderer yet |
| Live social analytics, ongoing scraping, asset-rights verification | Not implemented |
| Human approval, scheduling and publishing connectors | Not implemented |

Extend one family at a time using real briefs and visual review. Add tests for meaningful failures such as omitted facts, text overflow, wrong dimensions and destructive overwrites. Do not treat a successful render as brand approval.
