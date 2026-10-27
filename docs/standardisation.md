# Standardisation model

Three independent layers make the project reusable:

| Layer | Location | Responsibility |
| --- | --- | --- |
| Designer method | `.hermes.md`, root `design.md`, workflow skill and optional persona | Intake, evidence, art direction, review and delivery |
| Brand package | `brands/<id>/` | Identity, source assets, rules, template definitions and content contracts |
| Production engine | `src/`, tests and technical contracts | Generic validation, layer composition, text fitting, exports and traceability |

No client, sector, palette or field set is a core default. The fictional demo uses no external assets and illustrates portrait, square and landscape canvases. These recipes are starter examples, not standards imposed on new brands.

## Versioning

Project v0.2.0 uses brief and brand schema version 2. This is a deliberate breaking change from the event-shaped v1 format; use [migration guidance](migration-v2.md). New brand IDs and job IDs are explicit. Changes to an existing approved export require a new job revision.

## Repeatable quality

Each package records which rules are official, observed or proposed. Each imported asset has provenance. Each template declares evidence or a proposed-design source. Validate layout bounds and required fields, inspect every exported placement, and check actual facts and translations separately.

Testing includes a second brand with different template names, content fields, font, palette, locale and dimensions, without renderer edits. This is the key independence check.

## Implementation boundaries

The engine supports static editable SVG and PNG compositions with text, basic shapes and local assets. Other design work can use tools available to Hermes, with honest reporting of completed outputs. Motion production, automated social analytics, scheduling, publishing and specialist print certification are separate capabilities.

Client brand folders are local by default. Share selected packages deliberately; do not commit private sources, credentials or client deliverables simply to use the bot.
