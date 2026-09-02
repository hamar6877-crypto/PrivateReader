import { FormEvent, useEffect, useState } from 'react';
import { BookOpen, Copy, Moon, Plus, Sun, Trash2, X } from 'lucide-react';
import { api, Book } from '../App';

const archivePdfUrl = 'https://ia600700.us.archive.org/32/items/2_20260902_20260902_1733/%D8%AE%D8%A7%DA%A9%DB%8C%20%D8%B2%DB%8C%DA%A9%DB%86%D9%84%D8%A7%202%20%D8%A6%DB%95%D9%85%D8%A7%D8%B1%DB%8C%D8%AA%D8%A7.pdf';

export function Admin({ theme, onTheme }: { theme: string; onTheme: () => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    api('/api/books').then(setBooks).catch(() => setStatus('کتێبەکان بار نەکران')).finally(() => setIsLoading(false));
  }, []);

  const addBook = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !pdfUrl.trim()) return;
    setStatus('لە زیادکردندایە...');
    try {
      const book = await api('/api/books', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), pdfUrl: pdfUrl.trim() }) });
      setBooks([...books, book]);
      setModal(false);
      setTitle('');
      setPdfUrl('');
      setStatus('کتێبەکە زیاد کرا');
    } catch {
      setStatus('لینکی PDF دروست نییە یان کتێبەکە زیاد نەکرا');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('ئەم کتێبە بسڕینەوە؟')) return;
    try {
      await api(`/api/books/${id}`, { method: 'DELETE' });
      setBooks(currentBooks => currentBooks.filter(book => book.id !== id));
      setStatus('کتێبەکە سڕایەوە');
    } catch {
      setStatus('کتێبەکە نەسڕایەوە، تکایە دووبارە هەوڵبدەوە');
    }
  };

  return <div className="admin-page"><header className="topbar admin-top"><a className="brand" href="/"><span className="brand-mark"><BookOpen size={20}/></span><span><b>بەڕێوەبردن</b><small>Private Book Reader</small></span></a><button className="icon-button" onClick={onTheme}>{theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}</button></header><main className="admin-content"><div className="admin-heading"><div><p className="eyebrow">ناوچەی بەڕێوەبەر</p><h1>کتێبەکانت</h1></div><button className="primary-button" onClick={() => setModal(true)}><Plus size={18}/> زیادکردنی کتێب</button></div>{status && <p className="notice">{status}</p>}<div className="admin-list">{isLoading ? <div className="empty-state"><div className="spinner"/><p>لە بارکردندایە...</p></div> : books.length ? books.map(book => <div className="admin-row" key={book.id}><div className="mini-cover">{book.title.slice(0, 1)}</div><div className="row-title"><strong>{book.title}</strong><span>بەستەری PDF · {book.pages || '—'} پەڕە</span></div><span className="complete">تەواو بوو</span><div className="row-actions"><button title="کۆپی لینک" onClick={() => navigator.clipboard?.writeText(`${location.origin}/read/${book.token}`)}><Copy size={17}/></button><a href={`/read/${book.token}`} title="خوێندنەوە"><BookOpen size={17}/></a><button className="danger" title="سڕینەوە" onClick={() => remove(book.id)}><Trash2 size={17}/></button></div></div>) : <div className="empty-state"><BookOpen size={28}/><h3>هێشتا کتێبت نییە</h3><p>یەکەم بەستەری PDF ـەکەت زیاد بکە بۆ دەستپێکردن.</p></div>}</div></main>{modal && <div className="modal-backdrop"><form className="upload-modal" onSubmit={addBook}><button type="button" className="modal-close" onClick={() => setModal(false)}><X size={18}/></button><p className="eyebrow">کتێبی نوێ</p><h2>کتێبەکە زیاد بکە</h2><button type="button" className="preset-button" onClick={() => { setTitle('خاکی زیکۆلا ٢ ئەماریەتا'); setPdfUrl(archivePdfUrl); }}>بەکارهێنانی لینکی Internet Archive</button><label>ناونیشان<input required value={title} onChange={e => setTitle(e.target.value)} placeholder="ناوی کتێب" /></label><label>بەستەری ڕاستەوخۆی PDF<input required type="url" value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} placeholder="https://example.com/book.pdf" /></label><p className="form-hint">بەستەرەکە دەبێت ڕاستەوخۆ بۆ فایلەکە بێت و Range Request پشتگیری بکات.</p><button className="primary-button" disabled={!title.trim() || !pdfUrl.trim()}><Plus size={17}/> زیادکردنی کتێب</button></form></div>}</div>;
}
