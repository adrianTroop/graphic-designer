# Verification · v0.2.0

Checked on 27 October 2026.

## Automated checks

**Nine tests pass**, covering:

- Neutral portrait, square and landscape rendering with no logo or external assets.
- A second, unrelated brand with a different template name, product/price fields, French locale, serif font, blue palette and 720 × 960 canvas, without changing the renderer.
- Working new-brand onboarding and refusal to overwrite an existing package.
- Text overflow detection and preservation of existing jobs.
- Schema, locale, source-URL, required-field and unknown-field validation.
- Conditional optional layers and escaped user text.
- Layout bounds, missing tokens and package path containment.
- Reusable vector assets with per-placement IDs.
- Native raster placement, transparent-logo checks and rejection of missing/external SVG assets.

Brand and example brief validation pass. The Hermes skill passes the skill creator validator.

## Visual review

The neutral portrait, square and landscape PNGs were opened and inspected for hierarchy, text placement, contrast, spacing and clipping. The preview gallery represents only fictional original demo compositions. No client artwork is needed by the examples or core.

Visual inspection does not certify a future brand's font coverage, claims, translation, ownership or approval. Generated jobs retain pending manual-review checks.

## Integration scope

The static renderer was executed locally. A live Hermes model conversation remains unverified: the installed launcher previously stopped because this execution environment could not write its installation-state lock. No global profile, credentials or gateway settings were modified.

No social publishing, campaign schedule, analytics integration, motion pipeline or print certification was activated. Repository updates are separate from those capabilities.
