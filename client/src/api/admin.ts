import { apiGet } from './client';

export type Analytics = {
  totals: {
    totalQueries: number;
    answered: number;
    escalated: number;
    resolutionRate: number;
    escalationRate: number;
    avgConfidence: number;
    ticketsCreated: number;
    negativeFeedback: number;
    positiveFeedback: number;
  };
  volume: Array<{ day: number; n: number }>;
  escalationByTopic: Array<{ topic: string; n: number }>;
  unanswered: Array<{ query: string; n: number }>;
  providerUsage: Array<{ provider: string; n: number }>;
  providers: {
    active: string[];
    health: Array<{
      id: string;
      model: string;
      coolingDown: boolean;
      cooldownMsRemaining: number;
      callsInWindow: number;
      rpmLimit: number;
      supportsNativeTools: boolean;
    }>;
  };
  knowledgeBase: { documents: number; chunks: number };
};

export function fetchAnalytics() {
  return apiGet<Analytics>('/admin/analytics');
}
