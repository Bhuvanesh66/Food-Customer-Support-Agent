import { motion } from 'framer-motion';

const QUESTIONS = [
  'How do refunds work?',
  'How do I report a missing item?',
  'How much is FoodAssist Plus?',
];

/** Example questions that fetch answers from the knowledge base. */
export function SuggestedQuestions({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="mb-3">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        Try asking
      </div>
      <div className="flex flex-wrap gap-2">
        {QUESTIONS.map((q, i) => (
          <motion.button
            key={q}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3 }}
            onClick={() => onPick(q)}
            className="rounded-full border border-cyan/25 bg-cyan/5 px-3.5 py-2 text-sm text-cyan transition-colors hover:border-cyan/50 hover:bg-cyan/10"
          >
            {q}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
