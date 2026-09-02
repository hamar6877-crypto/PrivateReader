import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Check, Copy, Moon, Sun } from 'lucide-react';
import { Admin } from './pages/Admin';
import { Library } from './pages/Library';
import { Reader } from './pages/Reader';

export type Book = { id: string; title: string; size: number; pages: number; uploadedAt: string; token: string };
export const formatSize = (bytes: number) => bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
export const api = async (url: string, options?: RequestInit) => { const response = await fetch(url, options); if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'request-failed'); return response.status === 204 ? null : response.json(); };

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [copied, setCopied] = useState(false);
  const path = window.location.pathname;
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme); }, [theme]);
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
  const copyCurrent = () => { navigator.clipboard?.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  if (path.startsWith('/admin')) return <Admin theme={theme} onTheme={toggleTheme} />;
  if (path.startsWith('/read/')) return <Reader token={path.split('/')[2]} theme={theme} onTheme={toggleTheme} />;
  return <Admin theme={theme} onTheme={toggleTheme} />;
}
function Header({ theme, onTheme, onCopy, copied }: { theme: string; onTheme: () => void; onCopy: () => void; copied: boolean }) {
  return <header className="topbar"><a className="brand" href="/"><span className="brand-mark"><BookOpen size={20}/></span><span><b>کتێبخانەکەم</b><small>Private Book Reader</small></span></a><div className="header-actions"><a className="text-button" href="/admin">بەڕێوەبردن</a><button className="icon-button" onClick={onCopy} title="کۆپی لینک">{copied ? <Check size={18}/> : <Copy size={18}/>}</button><button className="mode-button" onClick={onTheme}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>} {theme === 'light' ? 'تاریک' : 'ڕووناک'}</button></div></header>;
}
export const Back = () => <a className="back-link" href="/"><ArrowLeft size={18}/> گەڕانەوە بۆ کتێبەکان</a>;
