import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 4000);
const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(root, '../.private-data');
const dbPath = path.join(dataDir, 'books.json');
const route = (pathname: string) => {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return normalized.startsWith('/api/') ? [normalized, normalized.slice(4)] : [`/api${normalized}`, normalized];
};

type Book = { id: string; title: string; pdfUrl: string; size: number; pages: number; uploadedAt: string; token: string };
const readDb = (): Book[] => fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf8')) : [];
const writeDb = (books: Book[]) => fs.writeFileSync(dbPath, JSON.stringify(books, null, 2));
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
  if (!book) return res.sendStatus(404);
  writeDb(books.filter(item => item.id !== book.id)); res.sendStatus(204);
});
app.get(route('/public/:token'), (req, res) => {
  const book = readDb().find(item => item.token === req.params.token);
  if (!book) return res.status(404).json({ error: 'invalid-link' });
  res.json({ books: readDb().map(({ id, title, pdfUrl, size, pages, uploadedAt, token }) => ({ id, title, pdfUrl, size, pages, uploadedAt, token })) });
});
app.get(route('/books/:bookId/read'), (req, res) => {
  const book = readDb().find(item => item.id === req.params.bookId);
  if (!book || req.query.token !== book.token) return res.status(404).json({ error: 'book-unavailable' });
  res.redirect(book.pdfUrl);
});
const clientDist = path.resolve(root, '../dist');
if (fs.existsSync(clientDist)) { app.use(express.static(clientDist)); app.get(/.*/, (_, res) => res.sendFile(path.join(clientDist, 'index.html'))); }

if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`Private Book Reader server running on http://localhost:${port}`));
}

export default app;
