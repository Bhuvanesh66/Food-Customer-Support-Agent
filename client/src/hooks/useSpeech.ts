import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal typings for the browser Web Speech API (not in lib.dom by default).
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Voice-first support (Feature 1). Wraps the browser Web Speech API:
 *  - STT: SpeechRecognition (Chrome/Edge). Feature-detected → `sttSupported`.
 *  - TTS: speechSynthesis. Feature-detected → `ttsSupported`.
 * Falls back gracefully (the UI hides controls when unsupported) so typing always works.
 */
export function useSpeech(opts: { lang?: string } = {}) {
  const lang = opts.lang ?? 'en-US';
  const sttSupported = typeof window !== 'undefined' && getRecognitionCtor() !== null;
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [listening, setListening] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);

  const startListening = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;
      const recog = new Ctor();
      recog.lang = lang;
      recog.interimResults = false;
      recog.continuous = false;
      recog.onresult = (e) => {
        const transcript = e.results?.[0]?.[0]?.transcript ?? '';
        if (transcript) onFinal(transcript);
      };
      recog.onend = () => setListening(false);
      recog.onerror = () => setListening(false);
      recogRef.current = recog;
      setListening(true);
      try {
        recog.start();
      } catch {
        setListening(false);
      }
    },
    [lang],
  );

  const stopListening = useCallback(() => {
    recogRef.current?.stop();
    setListening(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported || !text) return;
      try {
        window.speechSynthesis.cancel(); // don't overlap
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = 1.02;
        window.speechSynthesis.speak(u);
      } catch {
        /* ignore */
      }
    },
    [lang, ttsSupported],
  );

  const cancelSpeech = useCallback(() => {
    if (ttsSupported) window.speechSynthesis.cancel();
  }, [ttsSupported]);

  // Stop any speech on unmount.
  useEffect(() => () => cancelSpeech(), [cancelSpeech]);

  return { sttSupported, ttsSupported, listening, startListening, stopListening, speak, cancelSpeech };
}
