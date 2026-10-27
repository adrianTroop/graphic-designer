---
name: brand-designer
description: Create branded social artwork from briefs and evidence.
metadata:
  hermes:
    tags: [design, branding, social, production]
    category: design
---

# Brand Designer

## When to use

Use for social artwork, publication packages, brand-consistent design adaptation and production handoffs in this repository. Also use when onboarding a new brand into this system. This is a repository workflow; installing only this SKILL.md without the project does not install the renderer or brand data.

## Procedure

1. Resolve the project root containing `package.json`, `.hermes.md` and `brands/`. Select the requested brand. Read `brands/<id>/design.md` and `brand.json`; inspect the relevant publication images and asset catalogue before choosing a layout. Read `docs/brief-contract.md` when making a brief.
2. Identify the communication job, family, role, placement and languages. Extract provided facts and their sources. Ask for missing event facts that block a real campaign; clearly labelled demo content can proceed without them. Do not describe a review draft as fact-checked.
3. For `operational`, `guide` or `monthly-cover`, create a brief JSON using the examples and validate it with `node src/cli.cjs validate <path>`. Run `node src/cli.cjs render <path>`. These are single-cover templates. For other formats, follow the family's guide and create the actual requested editable deliverables using available tools; the renderer must not be presented as supporting them.
4. Open the output PNG and compare it with the relevant source reference. Check visual hierarchy, CJK glyphs, bilingual wrapping, contrast, logo sharpness and final-size legibility. If a mechanical fit check fails, shorten or restructure the copy with the user’s meaning preserved; do not reduce it to unreadable microtype. Inspect every page in a package.
5. Provide the editable SVG, PNG, caption draft, alt text, job manifest and QA report. Renderer outputs start with `review_state: pending`; record actual human visual/fact review separately. Flag genuine missing masters or unsupported deliverables specifically. Exporting a file does not publish it.

## Brand onboarding

Use `brands/_template/README.md` and `docs/standardisation.md`. Collect accessible source publications, record evidence gaps, identify distinct families, inventory original assets, and author design rules before connecting a renderer template. Do not copy Kai Tak's red/purple system into another brand without evidence.

## Pitfalls

- A thumbnail is not proof of motion design; a gallery crop is not an export-size specification.
- The Kai Tak primary white logo is only 302px wide. Preserve its source pixels and size limit.
- The supplied service icons and frames are labelled redraws. Campaign and promoter artwork may require separate assets.
- The three automatic layouts do not include inner carousel pages, event-card grids, maps, monthly calendars, documents or video.
- Keep TC/SC/EN variants explicit. The renderer places supplied text; it does not verify translation or generate authoritative event facts.
- A job ID is immutable. A revision uses a new ID; the CLI refuses to overwrite an existing job.

## Verification

Run validation, inspect the exported artwork, read `qa.json` and disclose unresolved checks. For code changes, run `npm test` and rerender affected examples. Consult `docs/hermes-setup.md` for project-skill discovery and optional persona setup; do not alter a user's global Hermes profile merely to use this project.
