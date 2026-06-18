import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { clsx } from 'clsx';

type Props = {
  disabled: boolean;
  onSend: (text: string) => void;
  placeholder?: string;
};

export function Composer({ disabled, onSend, placeholder }: Props) {
  const [value, setValue] = useState('');

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={submit} className="glass flex items-end gap-2 rounded-2xl p-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder={placeholder ?? 'Ask Synapse AI about your FoodAssist order…'}
        className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-ink placeholder:text-muted focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send"
        className={clsx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all',
          disabled || !value.trim()
            ? 'bg-white/5 text-muted'
            : 'bg-gradient-to-br from-cyan to-blue text-bg shadow-glow-sm hover:shadow-glow',
        )}
      >
        <Send size={17} />
      </button>
    </form>
  );
}
