# Hermes Graphic Designer

A reusable designer-bot project for **Nous Research Hermes Agent**, with Kai Tak Sports Park as the first evidence-backed brand package.

The project turns a structured brief into a **review draft**: PNG artwork, editable SVG, caption and alt-text drafts, provenance manifest and a QA report. It also carries the complete audited brand guide, publication references and transparent assets so Hermes can make informed design choices.

## What works now

- Hermes project instructions, a `brand-designer` skill and an optional designer `SOUL.md`.
- Kai Tak design rules, 52 publication records and 50 transparent asset variants.
- Three automatic single-cover layouts: red operational reminder, purple event guide and monthly programme cover.
- Bilingual text placement, wrapping and minimum-size overflow checks.
- Separate vector components, editable text and preserved source raster logos in the SVG.
- Versioned jobs that refuse destructive overwrites.
- Mechanical QA and an explicit list of human checks still pending.

This is a working v0.1 foundation, not full autonomous social management. Inner carousel pages, calendars, photo editing, collage, PDF and video production remain designer-led. It does not publish or schedule posts. The attached guide defines those workflows without claiming that the renderer implements them.

## Quick start

Requirements: Node.js 22+ and a suitable installed font. The Kai Tak working configuration uses **Arial Unicode MS**, a substitute rather than the recovered official typeface. On another machine, install a CJK-capable font and set `DESIGNER_FONT` to its family name; inspect the rendered glyphs because font substitution changes spacing.

```bash
npm install
npm test
node src/cli.cjs validate examples/operational.json
npm run demo
```

Open `jobs/demo-reminder-v01/review.html`, `jobs/demo-guide-v01/review.html` and `jobs/demo-monthly-v01/review.html`. Running a demo twice intentionally fails on the existing job IDs; use a new version in a copied brief. Prepared preview files are retained under `examples/rendered/` for immediate review.

For a different installed font:

```bash
DESIGNER_FONT="Noto Sans CJK TC" node src/cli.cjs render examples/operational.json
```

That font must actually be available. A successful font fallback is not proof that the intended font was used; visual checking remains required.

## Use with Hermes

Start Hermes from this repository. The project-level `.hermes.md` is the basic entry file; it tells Hermes to use the brand package and workflow. The optional `SOUL.md` supplies the dedicated bot's persona.

```bash
hermes skills trust
hermes chat -s brand-designer
```

Example request:

> Use the Kai Tak brand package. Create a Traditional Chinese and English operational reminder draft from examples/operational.json with job ID my-reminder-v01. Keep demo status, render it, inspect the PNG, and deliver the SVG, PNG, caption, alt text and QA report.

See [Hermes setup](docs/hermes-setup.md) for a separate profile and the current integration verification limit.

## Repository structure

```text
.hermes.md                         Project entry instructions
.hermes/skills/brand-designer/      Hermes workflow skill
profiles/graphic-designer/SOUL.md   Optional dedicated persona
brands/kai-tak/                    Design guide, tokens, assets and evidence
brands/_template/                  New-brand package contract
src/                              Validation and artwork generation
tests/                            Meaningful renderer/validation tests
examples/                         Briefs and reviewed preview renders
docs/                             Setup, brief contract and standardisation
jobs/                             Generated work; excluded from Git
```

Read [the Kai Tak design guide](brands/kai-tak/design.md), [asset catalogue](brands/kai-tak/assets/index.html), [brief contract](docs/brief-contract.md) and [standardisation plan](docs/standardisation.md).

## Review and asset limitations

All generated work remains visibly marked DESIGN SAMPLE or DRAFT / REVIEW PENDING. Mechanical checks cannot verify translation, facts, rights, legibility or brand approval. The white primary logo is a native 302px raster; this project keeps it below that width rather than manufacturing a vector master. Original, adapted and redrawn assets are labelled individually.

The repository contains third-party brand assets and reference images. No open-source licence is assigned to those materials. A remote repository has not been created or published by this handoff; visibility and destination can be chosen separately.

## Hermes compatibility sources

The integration follows the official [configuration/context documentation](https://hermes-agent.nousresearch.com/docs/user-guide/configuration), [skills documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills), and [profile documentation](https://hermes-agent.nousresearch.com/docs/user-guide/profiles), cross-checked against the local Hermes checkout on 27 October 2026. The renderer runs independently of a model provider; the natural-language bot requires a configured Hermes provider and tools.
