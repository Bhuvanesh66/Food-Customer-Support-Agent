import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Check } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * General satisfaction prompt — "How satisfied are you with the service?" with a
 * 1–5 star rating and an optional comment. Low scores feed the admin review queue.
 */
export function SatisfactionPrompt({
  onSubmit,
}: {
  onSubmit: (rating: number, comment?: string) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);

  const submit = () => {
    if (!rating) return;
    setDone(true);
    onSubmit(rating, comment.trim() || undefined);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm text-emerald"
      >
        <Check size={16} /> Thanks for your feedback!
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass mx-auto max-w-md rounded-2xl p-4"
    >
      <div className="mb-3 text-center text-sm text-ink">
        How satisfied are you with the service?
      </div>

      <div className="mb-3 flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              size={26}
              className={clsx(
                'transition-colors',
                (hover || rating) >= n ? 'fill-warning text-warning' : 'text-muted',
              )}
            />
          </button>
        ))}
      </div>

      <input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us more (optional)…"
        className="mb-3 w-full rounded-lg border border-hairline bg-black/20 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-cyan/40 focus:outline-none"
      />

      <button
        onClick={submit}
        disabled={!rating}
        className={clsx(
          'w-full rounded-lg py-2.5 text-sm font-medium transition-all',
          rating
            ? 'bg-gradient-to-r from-cyan to-blue text-bg shadow-glow-sm'
            : 'cursor-not-allowed bg-white/5 text-muted',
        )}
      >
        Submit feedback
      </button>
    </motion.div>
  );
}
