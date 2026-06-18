import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { clsx } from 'clsx';

type Props = {
  feedback?: 1 | -1 | null;
  onRate: (rating: 1 | -1) => void;
};

export function FeedbackButtons({ feedback, onRate }: Props) {
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <button
        aria-label="Helpful"
        onClick={() => onRate(1)}
        className={clsx(
          'rounded-md p-1.5 transition-colors',
          feedback === 1 ? 'text-emerald' : 'text-muted hover:text-emerald',
        )}
      >
        <ThumbsUp size={14} />
      </button>
      <button
        aria-label="Not helpful"
        onClick={() => onRate(-1)}
        className={clsx(
          'rounded-md p-1.5 transition-colors',
          feedback === -1 ? 'text-danger' : 'text-muted hover:text-danger',
        )}
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}
