import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send, ImagePlus, X, Mic, MicOff } from 'lucide-react';
import { clsx } from 'clsx';
import { useSpeech } from '../../hooks/useSpeech';

type Props = {
  disabled: boolean;
  onSend: (text: string, imageDataUrl?: string) => void;
  placeholder?: string;
};

export function Composer({ disabled, onSend, placeholder }: Props) {
  const [value, setValue] = useState('');
  const [image, setImage] = useState<string | null>(null); // data URL preview
  const fileRef = useRef<HTMLInputElement>(null);
  const { sttSupported, listening, startListening, stopListening } = useSpeech();

  const toggleMic = () => {
    if (listening) {
      stopListening();
      return;
    }
    startListening((transcript) => {
      // Auto-send the spoken question (voice-first feel).
      setValue('');
      onSend(transcript, image ?? undefined);
      setImage(null);
    });
  };

  const canSend = (value.trim().length > 0 || !!image) && !disabled;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    onSend(value.trim(), image ?? undefined);
    setValue('');
    setImage(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const pickImage = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-2">
      {/* Image preview chip */}
      {image && (
        <div className="mb-2 flex items-center gap-2 px-1">
          <div className="relative">
            <img src={image} alt="attachment" className="h-16 w-16 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => setImage(null)}
              aria-label="Remove image"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white"
            >
              <X size={12} />
            </button>
          </div>
          <span className="text-xs text-muted">Photo attached — describe the issue or just send.</span>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attach image */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          aria-label="Attach photo"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:text-cyan disabled:opacity-40"
        >
          <ImagePlus size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickImage(e.target.files?.[0])}
        />

        {/* Voice input (hidden if the browser lacks Web Speech) */}
        {sttSupported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={disabled}
            aria-label={listening ? 'Stop listening' : 'Speak'}
            className={clsx(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40',
              listening ? 'bg-danger/20 text-danger animate-pulse' : 'text-muted hover:text-cyan',
            )}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}

        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={placeholder ?? 'Ask Synapse AI — or attach a photo of the issue…'}
          className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] text-ink placeholder:text-muted focus:outline-none"
        />

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all',
            !canSend
              ? 'bg-white/5 text-muted'
              : 'bg-gradient-to-br from-cyan to-blue text-bg shadow-glow-sm hover:shadow-glow',
          )}
        >
          <Send size={17} />
        </button>
      </div>
    </form>
  );
}
