# Export workspace brand settings

Use this workflow for a Brand guidelines screen with separate Design guide, Image style, Brand colours, Heading font and Body font fields. The supplied screen shows limits of **12,000** for the design guide and **600** for image style. This exporter prepares local files for those fields; it does not connect to, edit or save settings in the target app.

## Source files in each brand package

| Source | Responsibility |
| --- | --- |
| `design.md` | Full brand guide, visual references, evidence and workflow. May include pictures. |
| `workspace-design.md` | Self-contained, paste-ready text summary of this brand's rules, at most 12,000 units. |
| `image-style.txt` | Image direction only, at most 600 units. |
| `workspace-settings.json` | Source file paths and deliberate palette order. |
| `brand.json` | Colour values and heading/body font families. |
| `assets/` and the asset manifest | Original transparent marks, visual elements and provenance. |

The export summary should keep tone, identity, colour, typography, composition, publication families/formats, imagery, cross-media use and review rules clearly separated. Preserve the exact approved rules that matter most; do not fill the limit just because space is available. Describe image lighting, composition, subject treatment and exclusions in the image-style field. Keep factual evidence and referenced images in the full guide. A Markdown image reference does not transfer an image into a settings text box.

`init-brand` creates all the starter sources. They are explicitly provisional. For an existing v2 package, add the three workspace files using `_template` as a structural reference, then replace their content and token names with that brand's own rules. Do not copy Studio Demo's identity into an unrelated brand.

Example `workspace-settings.json` structure:

```json
{
  "schema_version": 1,
  "design_guide_file": "workspace-design.md",
  "image_style_file": "image-style.txt",
  "colours": [
    {"name": "Main colour", "token": "primary", "role": "primary"},
    {"name": "Canvas", "token": "background", "role": "background"}
  ]
}
```

The referenced tokens must exist in this brand's `brand.json`; the example names are not built-in tokens. The first entry is the single primary colour. Other roles are secondary, accent, background or text. Order is preserved. Only opaque `#RGB` or `#RRGGBB` colours are exported; short HEX values expand to six digits. Unresolved colours must be established from evidence or explicitly recorded as proposed choices before export.

Set `typography.heading` and `typography.body` in `brand.json`. Either falls back to `typography.family` when omitted. Text layers use these through `font_role: "heading"` or `"body"`; an omitted role keeps the existing default family. A temporary `DESIGNER_FONT` override affects rendering only, never the exported brand settings. Check font installation, licensing and language coverage on the destination machine.

## Generate and paste

```bash
node src/cli.cjs export-workspace studio-demo --id v01
```

Use your own brand ID for real work. Output goes to `exports/<brand-id>/<revision>/`, ignored by Git by default. Choose a new revision to regenerate; existing output is preserved.

| Output | Destination |
| --- | --- |
| `DESIGN.md` | Copy the complete raw text into Design guide. |
| `IMAGE_STYLE.txt` | Copy the complete raw text into Image style. |
| `BRAND_COLOURS.txt` | Add the HEX values individually, in listed order. |
| `FONTS.txt` | Enter the heading and body family in their separate fields. |
| `workspace-settings.json` | Portable bot record with counts, status, provenance and text hashes. |
| `README.md` | Per-export paste instructions and review notes. |

Review the fields and save in the target app. The JSON is this repository's export contract, not a claimed native import format. The exporter does not verify how a particular app resolves fonts or interprets the guide.

The text counts include whitespace and use UTF-16 code units, a conservative browser-input convention; the screenshot does not establish its exact counting implementation. An emoji can count as two units. Over-limit content fails with its measured length. The exporter never truncates text. Edit the source summary while preserving meaningful rules, then export again. Embedded image and active markup are rejected in paste-ready text; ordinary Markdown headings and lists are permitted.

## Keep assets and references usable

Keep source marks as transparent SVG and/or genuine transparent PNG assets, separated from photography, panels and text. Keep representative publication images and annotations in the full guide's reference library. Make those assets available through the target tool's supported controls when needed; pasting text alone does not upload them. Avoid embedding large image payloads or local file paths in the workspace fields.

The exporter deliberately does not infer official fonts, identify logos or derive a palette from the screenshot. Those values belong to the selected brand package. The bundled example remains fictional and pending review.
