import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { clsx } from 'clsx';
import { useChatStore } from '../../store/useChatStore';
import { useSpeech } from '../../hooks/useSpeech';
import { hasWebGL } from '../../three/shared/usePerfDetect';
import { OrbAvatar } from '../../three/OrbAvatar';
import { AgentStateBadge } from './AgentStateBadge';
import { GlassBubble } from './GlassBubble';
import { Composer } from './Composer';
import { EscalationCapsule } from './EscalationCapsule';
import { SuggestedQuestions } from './SuggestedQuestions';
import { SatisfactionPrompt } from './SatisfactionPrompt';
import { MoodChip } from './MoodChip';

export function ChatScene() {
  const {
    status,
    messages,
    streaming,
    stateDetail,
    lastEscalation,
    satisfactionGiven,
    turnCount,
    sentiment,
    urgency,
    init,
    send,
    setFeedback,
    submitSatisfaction,
    reset,
  } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const webgl = hasWebGL();
  const { ttsSupported, speak, cancelSpeech } = useSpeech();
  const [voiceOn, setVoiceOn] = useState(false);
  const lastSpokenId = useRef<string | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, lastEscalation]);

  // Voice-first: read each newly-completed assistant reply aloud when enabled.
  useEffect(() => {
    if (!voiceOn || streaming) return;
    const last = messages[messages.length - 1];
    if (last && last.role === 'assistant' && !last.pending && last.id !== lastSpokenId.current) {
      lastSpokenId.current = last.id;
      speak(last.content);
    }
  }, [messages, streaming, voiceOn, speak]);

  const toggleVoice = () => {
    setVoiceOn((on) => {
      if (on) cancelSpeech();
      return !on;
    });
  };

  const humanMode = status === 'human' || status === 'awaiting_human';
  // Suggested questions while the chat is fresh (only the welcome message shown).
  const showSuggestions = messages.length <= 1 && !streaming;
  // Ask for a satisfaction rating after a couple of resolved turns.
  const showSatisfaction = turnCount >= 2 && !streaming && !satisfactionGiven && !humanMode;

  return (
    <div className="relative mx-auto flex h-screen max-w-5xl flex-col px-4 py-5">
      {/* Header */}
      <header className="mb-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-muted transition-colors hover:text-ink">
          <ArrowLeft size={18} />
          <span className="font-display text-sm">Synapse&nbsp;AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <MoodChip sentiment={sentiment} urgency={urgency} />
          <AgentStateBadge status={status} />
        </div>
        <div className="flex items-center gap-2">
          {ttsSupported && (
            <button
              onClick={toggleVoice}
              aria-label={voiceOn ? 'Mute voice' : 'Enable voice replies'}
              title={voiceOn ? 'Voice replies on' : 'Voice replies off'}
              className={clsx(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors',
                voiceOn
                  ? 'border-cyan/40 text-cyan'
                  : 'border-hairline text-muted hover:text-ink',
              )}
            >
              {voiceOn ? <Volume2 size={13} /> : <VolumeX size={13} />} Voice
            </button>
          )}
          <button
            onClick={() => void reset()}
            className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs text-muted transition-colors hover:text-ink"
          >
            <RotateCcw size={13} /> New chat
          </button>
        </div>
      </header>

      <div className="flex flex-1 gap-5 overflow-hidden">
        {/* Orb avatar column (desktop) */}
        {webgl && (
          <div className="hidden w-44 flex-col items-center pt-6 lg:flex">
            <OrbAvatar size={170} />
            <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              {streaming ? stateDetail || 'Working' : humanMode ? 'Human agent' : 'Online'}
            </div>
          </div>
        )}

        {/* Conversation */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 py-2">
            {messages.map((m) => (
              <GlassBubble
                key={m.id}
                message={m}
                streaming={streaming}
                stateDetail={stateDetail}
                onRate={(rating) => void setFeedback(m.id, rating)}
              />
            ))}

            <AnimatePresence>
              {lastEscalation && <EscalationCapsule summary={lastEscalation} />}
            </AnimatePresence>

            <AnimatePresence>
              {showSatisfaction && (
                <SatisfactionPrompt onSubmit={(r, c) => void submitSatisfaction(r, c)} />
              )}
            </AnimatePresence>
          </div>

          <div className="pt-3">
            {humanMode ? (
              <div className="glass rounded-2xl px-4 py-4 text-center text-sm text-muted">
                You're in the queue for a human agent. They'll join with full context shortly.
              </div>
            ) : (
              <>
                {showSuggestions && (
                  <SuggestedQuestions onPick={(q) => void send(q)} />
                )}
                <Composer disabled={streaming} onSend={(t, img) => void send(t, img)} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
