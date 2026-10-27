# Verification record

Checked on 27 October 2026.

## Executed

- Dependency lockfile generated and `npm ci --ignore-scripts` completed successfully.
- `npm test`: **6 tests passed** using the project's installed dependencies. Tests render all three families, check output dimensions and editable components, reject overflowing copy, protect existing jobs, reject invalid briefs/assets/paths, and escape user text in SVG.
- `node src/cli.cjs validate examples/operational.json`: passed.
- Skill creator's `quick_validate.py`: **Skill is valid**.
- All Markdown local links resolve. The brand package retains **50 asset records** and **52 publication evidence records**.

## Visual review

The three PNG examples under `examples/rendered/` were opened and inspected for hierarchy, glyph appearance, text placement, component separation and edge clipping. The operational logo was resized/repositioned to stay above its white panel. The monthly footer was moved below the court arc to remove an intersection.

These are labelled demonstrations using placeholder event information. AI visual inspection is not human brand approval or factual sign-off. The generated QA reports correctly retain pending manual checks.

## Integration limit

A live Hermes agent/model conversation was not executed. The local launcher required write access to its install-state lock, which was unavailable in this execution environment. Integration instructions were checked against the installed Hermes source and official documentation. No existing profile, credentials, gateway or global SOUL file was modified.

No live campaign, schedule or social post was created. Repository publication is separate from activating a Hermes profile or publishing campaign artwork; those integration limits remain unchanged.
