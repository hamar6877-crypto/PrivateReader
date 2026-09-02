# Private Book Reader

A small private Sorani Kurdish online PDF reader. PDFs are stored outside the public web root and served through an authorized, byte-range capable endpoint so PDF.js can request only what it needs.

The reader is designed for a very slow connection: PDF.js requests PDF byte ranges, the first visible page is rendered first, and only the current page plus nearby pages are kept in the page area. The friend does not need to click a download button or wait for the complete PDF before reading.

## Requirements

- Node.js 20+
- A writable server directory

## Local development

```bash
npm install
copy .env.example .env
npm run dev
```

Open `http://localhost:5173` for the reader library and `http://localhost:5173/admin` for the administrator. Set `ADMIN_PASSWORD` in `.env` before using the admin page. The default value is intentionally only for local setup.

These are routes in one website, not two websites. In production the Express server serves the client and API from one domain and one port. The friend only receives a private `/read/<random-token>` link; the administrator uses `/admin` on that same domain.

## Uploading and sharing

1. Open `/admin`.
2. Choose **زیادکردنی کتێب**, enter a title and paste a direct PDF URL. The form includes the supplied Internet Archive link as a one-click preset.
3. Use the copy icon on the book row. The resulting `/read/<random-token>` URL is the private reading link to send to your friend.
4. Deleting a book removes both its metadata and private file.

## Production

```bash
npm run build
node --env-file=.env dist-server/server.js
```

Use a reverse proxy (HTTPS recommended) to forward the public host to port 4000. Persist `.private-data` between deploys and keep it outside any static/public directory. Set a long random `ADMIN_PASSWORD`, restrict server filesystem permissions, and use an HTTPS-only deployment. The reader never includes a download button; the server supports `Range` requests and PDF.js renders only the current page plus two nearby pages.

## Notes

This is deliberately a small personal app. The private link is an access token, not DRM: a reader can still screenshot or copy content. The token should be rotated by deleting and re-uploading a book if it is shared too broadly.
