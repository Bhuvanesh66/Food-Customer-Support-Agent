import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../../types';
import { SourceCitations } from './SourceCitations';
import { FeedbackButtons } from './FeedbackButtons';
import { TypingIndicator } from './TypingIndicator';

type Props = {
  message: ChatMessage;
  streaming: boolean;
  stateDetail: string;
  onRate: (rating: 1 | -1) => void;
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function GlassBubble({ message, streaming, stateDetail, onRate }: Props) {
  const isUser = message.role === 'user';
  const isHumanAgent = message.role === 'human_agent';
  const showTyping = message.pending && message.content.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={clsx('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={clsx(
          'group relative max-w-[78%] rounded-2xl px-4 py-3 transition-transform duration-300',
          'hover:-translate-y-0.5',
          isUser
            ? 'bg-gradient-to-br from-blue/25 to-cyan/15 border border-cyan/25 text-ink'
            : isHumanAgent
              ? 'glass border-warning/30'
              : 'glass',
        )}
        style={{ boxShadow: isUser ? '0 8px 30px rgba(34,211,238,0.12)' : undefined }}
      >
        {!isUser && (
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-cyan/70">
            {isHumanAgent ? 'Human Agent' : 'Synapse AI'}
          </div>
        )}

        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="attached"
            className="mb-2 max-h-48 rounded-lg border border-white/10 object-cover"
          />
        )}

        {showTyping ? (
          <TypingIndicator detail={stateDetail} />
        ) : (
          <div className="prose-chat text-[15px] leading-relaxed text-ink">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {message.pending && streaming && <span className="ml-0.5 animate-pulse">▋</span>}
          </div>
        )}

        {!isUser && !message.pending && <SourceCitations sources={message.sources} />}

        <div
          className={clsx(
            'mt-1.5 flex items-center gap-3 text-[10px] text-muted',
            isUser ? 'justify-end' : 'justify-between',
          )}
        >
          <span>{formatTime(message.createdAt)}</span>
          {!isUser && typeof message.confidence === 'number' && (
            <span className="font-mono text-cyan/60">
              confidence {(message.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {!isUser && !isHumanAgent && !message.pending && message.content.length > 0 && (
          <FeedbackButtons feedback={message.feedback} onRate={onRate} />
        )}
      </div>
    </motion.div>
  );
}
