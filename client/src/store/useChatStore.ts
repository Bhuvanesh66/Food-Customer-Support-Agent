import { create } from 'zustand';
import { apiGet, apiSend, streamChat, type SSEEvent } from '../api/client';
import { useUIStore } from './useUIStore';
import type {
  ChatMessage,
  Conversation,
  ConversationStatus,
  Source,
} from '../types';

type HandoffSummary = {
  userIssue: string;
  conversationSummary: string;
  attemptedAnswer: string;
  retrievedSources: Source[];
  confidence: number;
  suggestedNextSteps: string[];
  sentiment?: string;
};

export type Sentiment = 'positive' | 'neutral' | 'frustrated' | 'angry';
export type Urgency = 'low' | 'normal' | 'high';

type ChatStore = {
  conversationId: string | null;
  status: ConversationStatus;
  messages: ChatMessage[];
  streaming: boolean;
  stateDetail: string;
  lastEscalation: HandoffSummary | null;
  satisfactionGiven: boolean;
  turnCount: number; // assistant answers so far (gates the satisfaction prompt)
  sentiment: Sentiment; // latest detected customer sentiment
  urgency: Urgency; // latest detected urgency

  init: () => Promise<void>;
  send: (text: string, imageDataUrl?: string) => Promise<void>;
  setFeedback: (messageId: string, rating: 1 | -1) => Promise<void>;
  submitSatisfaction: (rating: number, comment?: string) => Promise<void>;
  reset: () => Promise<void>;
};

function uid() {
  return `local_${Math.random().toString(36).slice(2)}`;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversationId: null,
  status: 'ai',
  messages: [],
  streaming: false,
  stateDetail: '',
  lastEscalation: null,
  satisfactionGiven: false,
  turnCount: 0,
  sentiment: 'neutral',
  urgency: 'normal',

  async init() {
    if (get().conversationId) return;
    const conv = await apiSend<Conversation>('/conversations', 'POST', {});
    set({
      conversationId: conv.id,
      status: conv.status,
      messages: [
        {
          id: uid(),
          role: 'assistant',
          content:
            "Hi! I'm Synapse AI, your FoodAssist assistant. Ask me anything — orders, delivery, payments, refunds, or your account. I'll search our help center to sort it out.",
          createdAt: Date.now(),
        },
      ],
    });
  },

  async send(text, imageDataUrl) {
    const { conversationId, streaming } = get();
    if (!conversationId || streaming || (!text.trim() && !imageDataUrl)) return;

    // Split a data URL (data:image/jpeg;base64,XXXX) into mime + base64.
    let image: { data: string; mimeType: string } | undefined;
    if (imageDataUrl) {
      const m = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (m) image = { mimeType: m[1], data: m[2] };
    }

    const ui = useUIStore.getState();
    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text || (image ? '📷 Photo of the issue' : ''),
      createdAt: Date.now(),
      imageUrl: imageDataUrl,
    };
    // Placeholder assistant message we stream into.
    const assistantId = uid();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      pending: true,
    };
    set((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      streaming: true,
      stateDetail: 'Thinking',
    }));
    ui.setAgentState('thinking');

    let streamedSources: Source[] = [];
    let confidence: number | undefined;

    const onEvent = (ev: SSEEvent) => {
      switch (ev.type) {
        case 'state': {
          const st = String(ev.state);
          ui.setAgentState(
            st === 'retrieving' ? 'retrieving' : st === 'escalating' ? 'escalating' : 'thinking',
          );
          set({ stateDetail: String(ev.detail ?? '') });
          break;
        }
        case 'sources':
          streamedSources = (ev.sources as Source[]) ?? [];
          break;
        case 'sentiment':
          set({
            sentiment: (ev.sentiment as Sentiment) ?? 'neutral',
            urgency: (ev.urgency as Urgency) ?? 'normal',
          });
          break;
        case 'confidence':
          confidence = ev.confidence as number;
          break;
        case 'token': {
          ui.setAgentState('answering');
          const delta = String(ev.delta ?? '');
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + delta } : m,
            ),
          }));
          break;
        }
        case 'final': {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    id: String(ev.messageId ?? assistantId),
                    content: String(ev.text ?? m.content),
                    confidence: (ev.confidence as number) ?? confidence,
                    sources: (ev.sources as Source[]) ?? streamedSources,
                    provider: ev.provider as string,
                    pending: false,
                  }
                : m,
            ),
            turnCount: s.turnCount + 1,
          }));
          break;
        }
        case 'escalated': {
          ui.setAgentState('escalating');
          set((s) => ({
            status: 'awaiting_human',
            lastEscalation: ev.summary as HandoffSummary,
            messages: s.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    id: String(ev.messageId ?? assistantId),
                    content:
                      "I want to make sure you get the best help, so I'm connecting you with a human agent — they'll have our full conversation context.",
                    pending: false,
                  }
                : m,
            ),
          }));
          break;
        }
        case 'error': {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId
                ? { ...m, content: `⚠️ ${String(ev.message)}`, pending: false }
                : m,
            ),
          }));
          break;
        }
      }
    };

    try {
      await streamChat({ conversationId, message: text, image }, onEvent);
    } catch (err) {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantId && m.pending
            ? { ...m, content: '⚠️ Connection interrupted. Please try again.', pending: false }
            : m,
        ),
      }));
    } finally {
      set({ streaming: false, stateDetail: '' });
      const finalStatus = get().status;
      ui.setAgentState(finalStatus === 'awaiting_human' || finalStatus === 'human' ? 'human' : 'idle');
    }
  },

  async setFeedback(messageId, rating) {
    set((s) => ({
      messages: s.messages.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m)),
    }));
    try {
      await apiSend('/feedback', 'POST', { messageId, rating });
    } catch {
      /* non-fatal */
    }
  },

  async submitSatisfaction(rating, comment) {
    set({ satisfactionGiven: true });
    try {
      await apiSend('/feedback/satisfaction', 'POST', {
        conversationId: get().conversationId ?? undefined,
        rating,
        comment: comment || undefined,
      });
    } catch {
      /* non-fatal */
    }
  },

  async reset() {
    set({
      conversationId: null,
      messages: [],
      status: 'ai',
      lastEscalation: null,
      satisfactionGiven: false,
      turnCount: 0,
      sentiment: 'neutral',
      urgency: 'normal',
    });
    useUIStore.getState().setAgentState('idle');
    await get().init();
  },
}));
