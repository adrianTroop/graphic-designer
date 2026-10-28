# Onboard any brand

## 1. Resolve the brief and source material

Identify the business, audience, objective, placements and languages. Use an approved guide and master assets when available. If deriving a system from social presence, inspect actual publications and distinguish repeated families from isolated campaigns. Save source URLs, inspection dates, visible content and access gaps.

## 2. Create a separate package

```bash
node src/cli.cjs init-brand my-brand --name "My Brand"
```

The command creates a working neutral scaffold and a sample brief, and refuses to overwrite an existing package. It does not infer a client's identity. New brand directories remain local through `.gitignore` until intentionally shared.

## 3. Write the design rules

Complete `design.md`: identity, colours, fonts, composition, imagery, motifs, publication families, formats, copy, localisation, workflows and gaps. Label each rule official, observed, inferred or proposed. Only include dimensions, font identifications and recurring patterns supported by the evidence or an explicit design decision.

## 4. Register assets

Use original marks and photographs. Keep logos, icons, frames, panels and motifs separate. Record source, ownership, adaptation status and native resolution. Transparent assets need real alpha; screenshots are references rather than masters. Logos are optional if none is supplied or needed.

## 5. Define templates and fields

Choose the composition for the communication job. The template names, canvas sizes, content fields, palettes and layer order are yours. Product price, publication credit, event date or recruitment CTA are all ordinary configurable fields. Do not reuse another client's house style by default.

Use the [template contract](template-contract.md) and fictional demo as implementation examples. Replace their tokens and geometry to match the client.

## 6. Render and review

```bash
node src/cli.cjs validate-brand my-brand
node src/cli.cjs validate brands/my-brand/example-brief.json
node src/cli.cjs render brands/my-brand/example-brief.json
```

Inspect the actual PNG, edit the composition if needed, and retain the SVG and provenance. Check visual hierarchy, language rendering, facts, legibility and asset permissions. Do not mark a package approved merely because it renders.

## 7. Maintain

When the destination uses workspace Brand guidelines, also complete `workspace-design.md`, `image-style.txt` and `workspace-settings.json`, then export with `node src/cli.cjs export-workspace my-brand --id v01`. Use the [workspace settings guide](workspace-brand-settings.md). Keep the full guide's pictures and transparent assets available separately. The starter summary and palette are provisional until adapted to this brand.

Keep variants and languages linked to the same authoritative facts. Use unique job revisions. Update brand rules only from new evidence or a user decision. Sharing a package is an explicit choice; the universal repository needs no private client material.
