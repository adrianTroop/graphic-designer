# Studio Demo

This is a fictional, neutral demonstration of the renderer. It is not a real client identity and has no relationship to a sports venue or other company. The package intentionally has **no logo and no external assets**, proving that neither is mandatory.

## Proposed starter layouts

All visual decisions here are original implementation examples, not recovered brand rules. The light paper, dark ink and lime accent are demonstration tokens only. The system uses a generic sans-serif family with platform-dependent substitution.

- `announcement`: 1080 × 1350 portrait with eyebrow, headline, body, details and CTA.
- `square-card`: 1080 × 1080 square composition using the same optional fields.
- `landscape`: 1600 × 900 dark composition, adapted to a wide surface.

Only `headline` is required. CTA panels are conditional on CTA content. All templates carry a visible draft/sample label. Each text block and shape is a separate layer. Canvas sizes are proposed working examples, not platform specifications.

The fields, templates, colours, sizes, alignment and geometry can all be changed in `brand.json`. Fonts and layout still need visual review on the target machine. Use a real client's own source material when creating its package.

## Workspace settings

The separate `workspace-design.md` and `image-style.txt` provide paste-ready summaries. `workspace-settings.json` defines colour order; values and font roles come from `brand.json`. Export them with `node src/cli.cjs export-workspace studio-demo --id v01`. Full visual references and any future transparent assets stay in the brand library.
