# Template and brand contract · schema version 2

The core interprets ordered layers. All visual decisions belong to a brand package. A package can define any template names, field names, palette and supported canvas dimensions without adding a renderer branch.

## Brand configuration

`brand.json` contains:

| Key | Purpose |
| --- | --- |
| `schema_version`, `id`, `name` | Version `2`, folder-matching ID and display name. |
| `status` | Official, evidence-derived or provisional status in plain language. |
| `design_guide` | Relative path to the brand's written guide. |
| `asset_manifest` | Relative path to the asset registry. An empty `assets` array is valid. |
| `typography` | `family` and a `status` explaining the source/substitute. |
| `tokens` | Named colours. Hex values (`#RGB`, `#RRGGBB`, `#RRGGBBAA`) or `none`. |
| `templates` | Map of arbitrary lowercase hyphenated template names. |

Use `$token_name` in a colour field to resolve a token. The core does not define any brand colours. `DESIGNER_FONT` overrides the configured font for a run; the resolved family is recorded in the manifest. Fonts must be available locally and reviewed for actual glyph coverage.

## Template structure

Each template has `description`, `canvas: [width, height]`, `background`, `evidence`, `fields`, `layers` and `review_label`.

- Canvas dimensions are integers from 200 to 8000 pixels. These are renderer constraints, not platform standards.
- `evidence` is a nonempty array of source-record identifiers or a declared proposed-design reference. Do not invent observed evidence.
- `fields` maps names to `{ "required": true, "max_length": 140 }`. Field names use lowercase letters, digits and underscores. Every declared field must be used by a text layer.
- `layers` is an ordered array; later layers appear above earlier layers. Layer IDs are unique lowercase hyphenated names. `background`, `review-label` and `review-label-background` are reserved.
- `review_label` supplies `box`, `fill`, `colour` and `font_size`. Reserve a readable position in the layout. The engine writes DESIGN SAMPLE or DRAFT / REVIEW.

## Layer types

Every layer has `id`, `type` and `box: [x, y, width, height]`, entirely inside its canvas. Positions use pixels. Optional `when_field` omits the entire layer when that content field is absent or empty.

| Type | Settings |
| --- | --- |
| `rect` | `fill`, optional `stroke`, `stroke_width`, `radius`, `opacity` |
| `ellipse` | Bounding box, `fill`, optional `stroke`, `stroke_width`, `opacity` |
| `line` | Box start and end define the line; `stroke`, `stroke_width`, optional `opacity`. Width or height can be zero. |
| `text` | Exactly one of `field` or static `text`; required `font_size`, `min_font_size`, `fill`; optional `weight`, `align`, `valign`, `direction`, `line_height` |
| `asset` | Exactly one fixed `asset` ID or `asset_field` binding; optional `optional: true` and `opacity`. Images use proportional contain placement. |

Text alignment: `left`, `center`, `right`. Vertical alignment: `top`, `middle`, `bottom`. Direction: `ltr` or `rtl`. Line height is a multiplier from 1 to 2. The renderer segments words and graphemes using the brief's first locale; complex script shaping still requires suitable fonts and visual review. Minimum font sizes are template decisions, with an engine floor of 10px.

Example layer:

```json
{
  "id": "product-name",
  "type": "text",
  "field": "product",
  "box": [80, 240, 920, 250],
  "font_size": 96,
  "min_font_size": 56,
  "fill": "$ink",
  "weight": 700,
  "align": "left"
}
```

## Asset registry

```json
{
  "assets": [
    {
      "id": "primary-mark",
      "kind": "logo",
      "status": "source original",
      "source": "Approved brand handoff, version/date recorded in design.md",
      "files": ["primary-mark.svg", "primary-mark.png"]
    }
  ]
}
```

Kinds: `logo`, `icon`, `photo`, `graphic`. File paths are relative to the manifest directory and must stay inside it. Supported source formats are SVG, PNG, JPEG and WebP. SVG is preferred when available; a PNG duplicate is not required. External/active SVG content is rejected. Reused vector IDs are namespaced per placement.

Logos require transparent canvas pixels. Raster logos cannot be enlarged beyond native dimensions; original raster images remain raster inside the editable SVG. Photos may be opaque. A title or note can record additional provenance. Do not reconstruct an unavailable source mark and label it original.

## Coverage

The generic layer interpreter supports many static layouts, not every possible drawing feature. Use a self-contained vector asset or extend the engine with tests when a design requires another primitive. Photo editing, arbitrary crop tools, multiframe motion, CMYK conversion and publishing are not implemented by this renderer.
