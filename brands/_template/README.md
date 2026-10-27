# New brand package

Create `brands/<brand-id>/` with:

```text
brand.json                  Machine-readable tokens and supported layout geometry
design.md                   Evidence-backed design and publication rules
assets/asset-manifest.json   Asset IDs, paths, sources, status and dimensions
assets/...                  Original and adapted production assets
references/source-index.json
references/...              Publication evidence and analysis material
```

Use the Kai Tak files as structural examples, not as generic brand styling. An empty package is not a working brand.

`brand.json` must include `schema_version: 1`, matching `id`, `name`, `design_guide`, `asset_manifest`, a CJK-capable `font_family` when needed, `font_status`, `logo`, `logo_width`, `logo_position`, `tokens` and `templates`. The current renderer understands the three template names in `docs/brief-contract.md` and the box geometry used by the Kai Tak package. New layout families require code and visual verification.

An asset manifest has an `assets` array. Each record uses a stable `id`, `title`, `category`, `status`, `source`, `note`, relative `files` and dimensions. The current renderer requires a transparent PNG export for used assets and preserves an SVG source when present. Referenced files must remain inside the package.

Separate official specifications from sampled values, substitute fonts and reconstructed motifs. Record missing masters as gaps rather than silently creating replacements.
