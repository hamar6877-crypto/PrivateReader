import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const app = express();
const port = Number(process.env.PORT || 4000);
const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.VERCEL ? path.join('/tmp', 'private-book-reader') : path.resolve(root, '../.private-data');
const dbPath = path.join(dataDir, 'books.json');
try {
  fs.mkdirSync(dataDir, { recursive: true });
} catch (error) {
  console.error('Unable to initialize book metadata storage', error);
}
const route = (pathname: string) => {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return normalized.startsWith('/api/') ? [normalized, normalized.slice(4)] : [`/api${normalized}`, normalized];
};

type Book = { id: string; title: string; pdfUrl: string; size: number; pages: number; uploadedAt: string; token: string };
let memoryBooks: Book[] = [];
const readDb = (): Book[] => {
  try {
    if (!fs.existsSync(dbPath)) return memoryBooks;
    memoryBooks = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    return memoryBooks;
  } catch (error) {
    console.error('Unable to read book metadata', error);
    return memoryBooks;
  }
};
const writeDb = (books: Book[]) => {
  memoryBooks = books;
  try {
    fs.writeFileSync(dbPath, JSON.stringify(books, null, 2));
  } catch (error) {
    console.error('Unable to persist book metadata', error);
  }
};
app.use(express.json());
app.get(route('/health'), (_, res) => res.json({ ok: true }));
app.get(['/api/books', '/books', '/api/admin/books'], (_, res) => res.json(readDb()));
app.post(['/api/books', '/books', '/api/admin/books'], (req, res) => {
  const title = String(req.body.title || '').trim();
  const pdfUrl = String(req.body.pdfUrl || '').trim();
  if (!title || !pdfUrl || !/^https?:\/\//i.test(pdfUrl)) return res.status(400).json({ error: 'title-and-pdf-url-required' });
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(18).toString('base64url');
  const book: Book = { id, title, pdfUrl, size: 0, pages: 0, uploadedAt: new Date().toISOString(), token };
  const books = [...readDb(), book]; writeDb(books); res.status(201).json(book);
});
app.delete(['/api/books/:id', '/books/:id', '/api/admin/books/:id'], (req, res) => {
  const books = readDb(); const book = books.find(item => item.id === req.params.id);
  if (!book) return res.sendStatus(204);
  writeDb(books.filter(item => item.id !== book.id)); res.sendStatus(204);
});
app.get(route('/public/:token'), (req, res) => {
  const book = readDb().find(item => item.token === req.params.token);
  if (!book) return res.status(404).json({ error: 'invalid-link' });
  res.json({ books: readDb().map(({ id, title, pdfUrl, size, pages, uploadedAt, token }) => ({ id, title, pdfUrl, size, pages, uploadedAt, token })) });
});
app.get(route('/books/:bookId/read'), async (req, res) => {
  const book = readDb().find(item => item.id === req.params.bookId);
  const fallbackUrl = typeof req.query.pdfUrl === 'string' ? req.query.pdfUrl : '';
  const pdfUrl = book && req.query.token === book.token ? book.pdfUrl : fallbackUrl;
  if (!pdfUrl || !/^https?:\/\//i.test(pdfUrl)) return res.status(404).json({ error: 'book-unavailable' });
  try {
    const upstream = await fetch(pdfUrl, { headers: req.headers.range ? { Range: req.headers.range } : {} });
    if (!upstream.ok && upstream.status !== 206) return res.status(upstream.status).json({ error: 'pdf-source-unavailable' });
    res.status(upstream.status);
    for (const header of ['accept-ranges', 'content-length', 'content-range', 'content-type']) {
      const value = upstream.headers.get(header);
      if (value) res.setHeader(header, value);
    }
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (!upstream.body) return res.end();
    Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream).pipe(res);
  } catch (error) {
    console.error('Unable to proxy PDF source', error);
    res.status(502).json({ error: 'pdf-source-unavailable' });
  }
});
const clientDist = path.resolve(root, '../dist');
if (fs.existsSync(clientDist)) { app.use(express.static(clientDist)); app.get(/.*/, (_, res) => res.sendFile(path.join(clientDist, 'index.html'))); }

if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`Private Book Reader server running on http://localhost:${port}`));
}

export default app;
