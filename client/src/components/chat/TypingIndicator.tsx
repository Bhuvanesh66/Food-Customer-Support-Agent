export function TypingIndicator({ detail }: { detail?: string }) {
  return (
    <div className="flex items-center gap-3 text-muted">
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan" />
      </div>
      {detail && <span className="font-mono text-xs tracking-wide">{detail}…</span>}
    </div>
  );
}
