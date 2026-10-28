# Verification · v0.3.0

Checked on 28 October 2026.

## Automated checks

**Fourteen tests pass**, covering:

- Neutral portrait, square and landscape rendering with no logo or external assets.
- A second, unrelated brand with a different template name, product/price fields, French locale, serif font, blue palette and 720 × 960 canvas, without changing the renderer.
- Working new-brand onboarding and refusal to overwrite an existing package.
- Text overflow detection and preservation of existing jobs.
- Schema, locale, source-URL, required-field and unknown-field validation.
- Conditional optional layers and escaped user text.
- Layout bounds, missing tokens and package path containment.
- Reusable vector assets with per-placement IDs.
- Native raster placement, transparent-logo checks and rejection of missing/external SVG assets.
- Separate workspace export fields, exact text preservation and immutable revision output.
- Exact 12,000/600 limits, whitespace and Unicode counting, with no silent truncation.
- Failed exports producing no output, image markup separation and source path containment.
- An unrelated ordered palette, distinct heading/body fonts in both export and artwork, and legacy family fallback.
- Rejection of ambiguous primary-colour ordering, missing/duplicate tokens and unsupported colour transparency.

Brand and example brief validation pass. The Hermes skill passes the skill creator validator.

The CLI workspace export was executed successfully. The checked-in fictional example contains 4,795 UTF-16 code units in Design guide and 489 in Image style; its palette and two font fields are separate. The output JSON and exact paste files agree. These counts include whitespace and use a conservative browser-input convention; the target screen's implementation is not verified.

## Visual review

The neutral portrait, square and landscape PNGs were opened and inspected for hierarchy, text placement, contrast, spacing and clipping. The preview gallery represents only fictional original demo compositions. No client artwork is needed by the examples or core.

After adding font roles in v0.3.0, the neutral portrait was rendered again and opened for visual inspection. The unchanged demo font choice retains its layout. Distinct heading/body role assignment is covered by the independent-brand test.

Visual inspection does not certify a future brand's font coverage, claims, translation, ownership or approval. Generated jobs retain pending manual-review checks.

## Integration scope

The static renderer was executed locally. A live Hermes model conversation remains unverified: the installed launcher previously stopped because this execution environment could not write its installation-state lock. No global profile, credentials or gateway settings were modified.

No social publishing, campaign schedule, analytics integration, motion pipeline or print certification was activated. Repository updates are separate from those capabilities.

Workspace settings exports were checked as local files. No workspace settings were pasted or saved in another app. The export JSON is not claimed to be a native import format for the supplied screen.
