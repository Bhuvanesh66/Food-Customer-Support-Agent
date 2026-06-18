import { FileText } from 'lucide-react';
import type { Source } from '../../types';

export function SourceCitations({ sources }: { sources?: Source[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.slice(0, 4).map((s) => (
        <span
          key={s.documentId}
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan/25 bg-cyan/5 px-2.5 py-1 text-[11px] text-cyan"
          title={`Relevance ${(s.score * 100).toFixed(0)}%`}
        >
          <FileText size={11} />
          {s.title}
        </span>
      ))}
    </div>
  );
}
