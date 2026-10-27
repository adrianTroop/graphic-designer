# Brief contract · schema version 2

A brief selects a **brand** and one of that brand's **templates**. No event, venue, date, industry or language pair is assumed. The renderer places supplied text; Hermes interprets the request and assembles the brief.

```json
{
  "schema_version": 2,
  "job_id": "launch-v01",
  "brand": "acme",
  "template": "product-launch",
  "locales": ["en"],
  "content_status": "demo",
  "content": {"product": "A useful idea", "price": "Details to follow", "cta": "Explore"},
  "assets": {},
  "fact_sources": []
}
```

The selected template must define those field names. The sample is a structural example; `init-brand` supplies a runnable announcement brief.

| Field | Rule |
| --- | --- |
| `schema_version` | `2`; v1 is rejected with migration guidance. |
| `job_id` | Unique lowercase hyphenated ID, at most 80 characters. Existing jobs are preserved. |
| `brand` | Explicit brand-folder ID. |
| `template` | Any template name defined in that brand's configuration. |
| `locales` | 1–8 BCP 47 tags, such as `en`, `es`, `fr-FR` or `zh-Hant`. They describe supplied content; translation is not automatic. The first tag guides text segmentation. |
| `content_status` | `demo` or `provided-facts`. Both produce review drafts. |
| `content` | String values keyed by template-defined field names. Required fields and length limits come from the template. Unknown fields are rejected. |
| `assets` | Optional mapping of template asset-binding names to local manifest asset IDs. Fixed assets can instead live in the template. |
| `fact_sources` | HTTP(S) URLs without credentials; at least one for `provided-facts`. URLs are recorded, not automatically verified. |
| `caption`, `alt_text` | Optional draft text. If absent, a basic draft is assembled from the supplied content; review it before use. |

No logo, photograph or secondary language is mandatory. Optional empty text fields are omitted. A shape or asset can also be conditional on a field through `when_field`.

## Delivery

Each job has eight files: `artwork.svg`, `artwork.png`, `brief.json`, `manifest.json`, `qa.json`, `caption.txt`, `alt-text.txt` and `review.html`. The manifest records the brand, template, locales, fonts, asset hashes and source/evidence references. Mechanical QA checks dimensions and text fit; visual and factual review remains pending.

A fit failure stops generation instead of clipping text or shrinking it below the template's chosen minimum. Change the composition or copy while preserving meaning. A successful render does not approve or publish the work.
