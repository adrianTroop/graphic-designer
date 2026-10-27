# Brief contract · version 1

The renderer places supplied text. Hermes interprets the user's request and prepares the brief. Neither the renderer nor its mechanical QA establishes that an event fact, translation or permission is correct.

Use an example in `examples/` as the starting point. Unknown fields and unsupported families are rejected so the system cannot silently ignore a requested output.

| Field | Meaning |
| --- | --- |
| `schema_version` | `1` |
| `job_id` | Unique lowercase hyphenated identifier, at most 80 characters; include a revision suffix. Existing jobs cannot be overwritten. |
| `brand` | ID of a folder under `brands/`. |
| `family` | `operational`, `guide` or `monthly-cover`; single covers only in v0.1. |
| `language` | `TC-EN`, `SC-EN` or `EN`; describes supplied copy, not an automatic translation service. |
| `content_status` | `demo` or `provided-facts`. Demo artwork is visibly labelled DESIGN SAMPLE. Other artwork remains DRAFT / REVIEW PENDING. |
| `headline.primary` | Primary headline, at most 110 characters. Actual fit is checked at render time. |
| `headline.secondary` | Supporting/English headline, at most 180 characters. |
| `event.name` | Event or package header, at most 120 characters. |
| `event.date_display` | Explicit display wording including relevant time/timezone if needed, at most 120 characters. |
| `event.venue` | Explicit venue wording, at most 120 characters. |
| `notice` | Footer wording, at most 240 characters. |
| `fact_sources` | HTTP(S) source URLs. At least one for `provided-facts`; URLs are recorded but not fetched or fact-checked by the renderer. |
| `icon` | Optional asset-manifest ID for an operational cover. Must resolve to a known local asset. |

Each rendered job contains:

- `artwork.svg`: editable text and grouped components; original raster logos remain raster; supplied vector components remain paths.
- `artwork.png`: rendered full-size graphic.
- `brief.json`: exact normalized input object supplied to the renderer.
- `manifest.json`: brand, template evidence IDs, dimensions, font, asset provenance and SHA-256 digests.
- `qa.json`: mechanical checks plus the manual checks that remain pending.
- `caption.txt` and `alt-text.txt`: drafts derived from the supplied brief, for review.
- `review.html`: local visual review page with downloads.

There is no automatic transition to approved/published. The review label is intentional in this starter; preparing an approved campaign export requires a subsequent, explicit production step. No scheduler or social publishing API is implemented.

Fit failures stop generation. Shorten or restructure copy, or author a suitable new layout; do not make a dense notice unreadable just to satisfy the template.
