# Content Workflow

## Admin Dashboard

Open the admin dashboard locally:

```text
http://127.0.0.1:8000/Admin.html
```

The current local admin PIN is defined in `js/admin.js`:

```text
angle-admin
```

Use the dashboard to manage:

- Posts and article drafts
- Authors
- Tags
- Homepage headline settings
- Podcast/video entries
- PDF and image-backed posts

## Saving Content

The dashboard always saves to browser storage first. When the Node server is running, posts are also persisted to:

```text
data/admin-posts.json
```

If the dashboard shows a browser-only or file-mode warning, start the local server and open the admin page through `http://127.0.0.1:8000/Admin.html` instead of opening `Admin.html` directly from File Explorer.

## Publishing Posts

Published posts must include the required fields enforced by `js/admin.js`, including:

- Title
- Slug
- Author
- Category
- Publish date
- Excerpt
- Body content
- Featured image
- Featured image alt text
- Meta title
- Meta description

Draft posts can be saved with fewer fields.

## Public Rendering

Public pages only render posts with:

```text
status: "published"
```

Published content is injected by `js/admin-content.js` into elements such as:

```html
<div data-admin-content="featured"></div>
<div data-admin-content="articles"></div>
<div data-admin-content="podcasts"></div>
```

Article detail pages use:

```text
Article.html?slug=example-slug
```

or:

```text
Article.html?id=post-id
```

## Export and Backup

Before major edits:

1. Open `Admin.html`.
2. Export posts from the dashboard.
3. Keep the exported JSON as a backup.
4. Commit the updated `data/*.json` files to Git.

Recommended Git flow after content changes:

```powershell
git status
git add data js css *.html assets
git commit -m "Update site content"
git push
```

## Image and PDF Notes

The admin dashboard accepts SVG, PNG, JPG, WEBP, GIF, and PDF uploads. Browser-stored uploads are encoded into JSON as data URLs, so large files can make `data/admin-posts.json` very large.

Recommended practice:

- Use compressed images.
- Prefer SVG for icons and simple graphics.
- Use raster formats for real photography.
- Keep PDFs small.
- For large media, host the file separately and paste the URL when possible.

## Known Persistence Gap

Posts persist through the local API.

Authors, tags, and homepage settings currently fall back to static JSON files and browser storage because `server.js` does not yet implement writable endpoints for:

```text
/api/authors
/api/tags
/api/homepage
```

Until those endpoints are added, verify changes in these files before deploy:

```text
data/admin-authors.json
data/admin-tags.json
data/homepage-settings.json
```
