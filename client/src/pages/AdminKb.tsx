import { useEffect, useState } from 'react';
import { Upload, Link2, FileText, Trash2, Loader2 } from 'lucide-react';
import { AdminShell } from '../components/admin/AdminShell';
import { HoloCard } from '../components/ui/HoloCard';
import { GlowButton } from '../components/ui/GlowButton';
import { SelfLearningPanel } from '../components/admin/SelfLearningPanel';
import { apiGet, apiSend, apiUpload } from '../api/client';

type KbDoc = {
  id: string;
  title: string;
  source_type: string;
  status: string;
  chunk_count: number;
  error?: string | null;
  created_at: number;
};

export default function AdminKb() {
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<'pdf' | 'markdown' | 'url'>('markdown');
  const [mdTitle, setMdTitle] = useState('');
  const [mdContent, setMdContent] = useState('');
  const [url, setUrl] = useState('');

  const load = () => apiGet<KbDoc[]>('/kb').then(setDocs).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const after = (ok: string, err?: unknown) => {
    setBusy(false);
    if (err) setMsg(`⚠️ ${err instanceof Error ? err.message : String(err)}`);
    else {
      setMsg(ok);
      setMdContent('');
      setMdTitle('');
      setUrl('');
      load();
    }
  };

  const submitMarkdown = async () => {
    if (!mdContent.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      await apiSend('/ingest', 'POST', { type: 'markdown', title: mdTitle || undefined, content: mdContent });
      after('✓ Markdown ingested and indexed.');
    } catch (e) {
      after('', e);
    }
  };

  const submitUrl = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      await apiSend('/ingest', 'POST', { type: 'url', url });
      after('✓ URL ingested and indexed.');
    } catch (e) {
      after('', e);
    }
  };

  const submitPdf = async (file: File) => {
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      await apiUpload('/ingest', form);
      after('✓ PDF ingested and indexed.');
    } catch (e) {
      after('', e);
    }
  };

  const remove = async (id: string) => {
    await apiSend(`/kb/${id}`, 'DELETE');
    load();
  };

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted">
          Ingest PDFs, markdown, or URLs. New content is queryable within seconds — no re-index.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HoloCard title="Add Content">
          <div className="mb-4 flex gap-2">
            {(['markdown', 'pdf', 'url'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs uppercase tracking-wide transition-colors ${
                  tab === t ? 'bg-cyan/15 text-cyan' : 'text-muted hover:text-ink'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'markdown' && (
            <div className="space-y-3">
              <input
                value={mdTitle}
                onChange={(e) => setMdTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full rounded-lg border border-hairline bg-black/20 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-cyan/40 focus:outline-none"
              />
              <textarea
                value={mdContent}
                onChange={(e) => setMdContent(e.target.value)}
                placeholder="# Paste markdown content here…"
                rows={8}
                className="w-full resize-none rounded-lg border border-hairline bg-black/20 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-cyan/40 focus:outline-none"
              />
              <GlowButton onClick={submitMarkdown} disabled={busy || !mdContent.trim()}>
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                Ingest markdown
              </GlowButton>
            </div>
          )}

          {tab === 'pdf' && (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-hairline bg-black/20 py-12 text-muted transition-colors hover:border-cyan/40 hover:text-ink">
              {busy ? <Loader2 className="animate-spin" size={28} /> : <FileText size={28} />}
              <span className="text-sm">{busy ? 'Ingesting…' : 'Click to upload a PDF'}</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={busy}
                onChange={(e) => e.target.files?.[0] && submitPdf(e.target.files[0])}
              />
            </label>
          )}

          {tab === 'url' && (
            <div className="space-y-3">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/docs/article"
                className="w-full rounded-lg border border-hairline bg-black/20 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-cyan/40 focus:outline-none"
              />
              <GlowButton onClick={submitUrl} disabled={busy || !url.trim()}>
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Link2 size={16} />}
                Ingest URL
              </GlowButton>
            </div>
          )}

          {msg && <p className="mt-3 text-sm text-muted">{msg}</p>}
        </HoloCard>

        <HoloCard title={`Documents (${docs.length})`}>
          <div className="space-y-2">
            {docs.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">No documents yet.</p>
            )}
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-ink">{d.title}</span>
                    <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted">
                      {d.source_type}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted">
                    {d.status === 'ready'
                      ? `${d.chunk_count} chunks`
                      : d.status === 'failed'
                        ? `failed: ${d.error ?? 'error'}`
                        : 'ingesting…'}
                  </div>
                </div>
                <button
                  onClick={() => remove(d.id)}
                  className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:text-danger"
                  aria-label="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </HoloCard>
      </div>

      {/* Self-Learning KB — the startup flywheel */}
      <div className="mt-6">
        <SelfLearningPanel onPublished={load} />
      </div>
    </AdminShell>
  );
}
