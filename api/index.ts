import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 4000);
const adminPassword = process.env.ADMIN_PASSWORD || 'change-this-password';
const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(root, '../.private-data');
const booksDir = path.join(dataDir, 'books');
const dbPath = path.join(dataDir, 'books.json');
const adminSessions = new Set<string>();
fs.mkdirSync(booksDir, { recursive: true });
const route = (pathname: string) => {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return normalized.startsWith('/api/') ? [normalized, normalized.slice(4)] : [`/api${normalized}`, normalized];
};

type Book = { id: string; title: string; fileName: string; size: number; pages: number; uploadedAt: string; token: string };
const readDb = (): Book[] => fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf8')) : [];
const writeDb = (books: Book[]) => fs.writeFileSync(dbPath, JSON.stringify(books, null, 2));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 }, fileFilter: (_, file, cb) => cb(null, file.mimetype === 'application/pdf') });
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const sessionToken = req.headers.authorization?.replace(/^Bearer\s+/, '');
  if (!sessionToken || !adminSessions.has(sessionToken)) return res.status(401).json({ error: 'unauthorized' });
  next();
};
app.use(express.json());
app.get(route('/health'), (_, res) => res.json({ ok: true }));
app.post(route('/admin/login'), (req, res) => {
  if (req.body.password !== adminPassword) return res.status(401).json({ error: 'wrong-password' });
  const sessionToken = crypto.randomBytes(32).toString('base64url');
  adminSessions.add(sessionToken);
  res.json({ token: sessionToken });
});
app.get(route('/admin/books'), requireAdmin, (_, res) => res.json(readDb()));
app.post(route('/admin/books'), requireAdmin, upload.single('book'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'pdf-required' });
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(18).toString('base64url');
  const detectedPages = (req.file.buffer.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
  const book: Book = { id, title: String(req.body.title || req.file.originalname.replace(/\.pdf$/i, '')), fileName: `${id}.pdf`, size: req.file.size, pages: Number(req.body.pages || detectedPages), uploadedAt: new Date().toISOString(), token };
  fs.writeFileSync(path.join(booksDir, book.fileName), req.file.buffer);
  const books = [...readDb(), book]; writeDb(books); res.status(201).json(book);
});
app.delete(route('/admin/books/:id'), requireAdmin, (req, res) => {
  const books = readDb(); const book = books.find(item => item.id === req.params.id);
  if (!book) return res.sendStatus(404);
  fs.rmSync(path.join(booksDir, book.fileName), { force: true }); writeDb(books.filter(item => item.id !== book.id)); res.sendStatus(204);
});
app.get(route('/public/:token'), (req, res) => {
  const book = readDb().find(item => item.token === req.params.token);
  if (!book) return res.status(404).json({ error: 'invalid-link' });
  res.json({ books: readDb().map(({ id, title, size, pages, uploadedAt, token }) => ({ id, title, size, pages, uploadedAt, token })) });
});
app.get(route('/books/:bookId/read'), (req, res) => {
  const book = readDb().find(item => item.id === req.params.bookId);
  if (!book || req.query.token !== book.token) return res.status(404).json({ error: 'book-unavailable' });
  const filePath = path.join(booksDir, book.fileName); const size = fs.statSync(filePath).size; const range = req.headers.range;
  res.setHeader('Accept-Ranges', 'bytes'); res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', 'inline'); res.setHeader('Cache-Control', 'private, max-age=3600'); res.setHeader('Vary', 'Range');
  if (!range) { res.setHeader('Content-Length', size); return fs.createReadStream(filePath).pipe(res); }
  const [startText, endText] = range.replace(/bytes=/, '').split('-'); const start = Number(startText); const end = endText ? Number(endText) : size - 1;
  if (start >= size || end >= size) return res.status(416).end();
  res.status(206).set({ 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 }); fs.createReadStream(filePath, { start, end }).pipe(res);
});
const clientDist = path.resolve(root, '../dist');
if (fs.existsSync(clientDist)) { app.use(express.static(clientDist)); app.get(/.*/, (_, res) => res.sendFile(path.join(clientDist, 'index.html'))); }
app.listen(port, () => console.log(`Private Book Reader server running on http://localhost:${port}`));

export default app;
