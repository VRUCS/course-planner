# Data ownership

- `sources/` contains public Golestan exports and curriculum source documents.
- `canonical/` contains authoritative, reviewable JSON consumed by tools.

Neither directory is deployed to GitHub Pages. Browser-compatible files under
`apps/web/generated/` are derived artifacts and must be regenerated through
`tools/data_pipeline/`, never edited manually.
