# Architecture

## System Overview

The project is a static website served by a lightweight Node.js HTTP server.

```text
Browser
  |
  | requests HTML, CSS, JS, images, JSON
  v
Node local server: server.js
  |
  | reads/writes selected JSON files
  v
data/*.json
```

There is no framework build step, database, or backend application server. The site can be edited and previewed locally, then deployed as static files.

## Main Runtime Parts

### Static Pages

The root HTML files are the main public pages:

- `index.html`: home page
- `Articles.html`: article listing page
- `Article.html`: dynamic article detail shell
- `Admin.html`: local admin dashboard
- `Elections.html`, `Perspectives.html`, `Podcast.html`, `about-us.html`: section pages

The section folders contain older or fixed article pages:

- `Elections/`
- `Perspectives/`
- `Podcast/`

### Styling

Responsive styling is mainly in:

- `css/responsive.css`

Many pages also contain inline page-specific styles. When changing shared behavior, prefer the shared CSS file first; only use page-level styles when the change is unique to that page.

### Client JavaScript

- `js/mobile.js`: opens and closes the mobile navigation.
- `js/admin.js`: powers the admin dashboard, login session, post form, author form, tag form, homepage form, imports, exports, and local persistence.
- `js/admin-content.js`: reads published content and injects admin-managed articles into public pages.

### Local Server

`server.js` uses Node core modules only:

- `http`
- `fs`
- `path`

It serves files from the project root and currently supports this writable API:

```text
GET /api/posts
PUT /api/posts
```

The API persists posts to:

```text
data/admin-posts.json
```

The server also protects against path traversal by resolving requested paths and ensuring they remain inside the project root.

### Data Files

The `data/` folder is the lightweight content store:

- `admin-posts.json`: articles, podcast entries, uploaded image data, PDF data, status, SEO fields, and author snapshot fields.
- `admin-authors.json`: reusable author records.
- `admin-tags.json`: reusable tag records.
- `homepage-settings.json`: home page headline and section text settings.
- `image-format-notes.json`: notes about preferred image formats and asset handling.

## Content Flow

### Public Reading Flow

1. A visitor opens a public page such as `index.html` or `Articles.html`.
2. The page loads `js/admin-content.js`.
3. The script tries to read content from the local API first.
4. If the API is not available, it falls back to the JSON files in `data/`.
5. Published posts are rendered into cards, podcast embeds, tag sections, or the `Article.html` detail page.

### Admin Editing Flow

1. An editor opens `Admin.html`.
2. `js/admin.js` asks for the admin PIN.
3. After login, it loads posts, authors, tags, and homepage settings.
4. Edits are saved to browser `localStorage` first.
5. Posts are also saved through `PUT /api/posts` when the local Node server is running.
6. If the API is unavailable, the admin dashboard keeps the content in the browser and allows export.

## Current Backend Limitation

The browser code is prepared to call these APIs:

```text
/api/posts
/api/authors
/api/tags
/api/homepage
```

The current root `server.js` only implements `/api/posts`. Authors, tags, and homepage settings are read from static JSON files or browser storage, but they are not persisted through the server API yet.

Recommended future improvement:

- Add matching `GET` and `PUT` handlers for `/api/authors`, `/api/tags`, and `/api/homepage`.
- Keep the same JSON-file persistence pattern already used by `/api/posts`.

## Deployment Model

The project is suitable for static hosting because the public site can read `data/*.json` directly.

Recommended deployable files:

- Root HTML files
- `css/`
- `js/`
- `assets/`
- `data/`
- `Elections/`
- `Perspectives/`
- `Podcast/`

Local-only files that usually should not be deployed:

- `server.out.log`
- `server.err.log`
- `node_modules/`
- `.git/`

`server.js` is needed for local editing. It is not required by a static host unless the host supports Node.js and you intentionally run it there.

## Security Notes

- The admin PIN is stored in front-end JavaScript, so it is only a lightweight local editing gate.
- Do not treat `Admin.html` as a secure production CMS without adding real authentication.
- Uploaded images and PDFs can be stored as data URLs in JSON, which can make `admin-posts.json` large.
- Validate large content before committing or deploying.

## Suggested Future Architecture

Short-term improvements:

- Add API support for authors, tags, and homepage settings.
- Add a small backup/export process before editing `data/admin-posts.json`.
- Move repeated inline styles into shared CSS.

Long-term improvements:

- Replace the front-end PIN with real authentication.
- Move content storage to a database or hosted CMS if multiple editors need to work at the same time.
- Add automated checks for broken links and malformed JSON.
- Add a deployment pipeline from GitHub to the hosting provider.
