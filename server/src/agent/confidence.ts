import { env } from '../config/env.js';

export type ConfidenceInput = {
  retrievalScore: number; // max cosine of top-k (0..1)
  selfAssessment: number; // LLM's self-reported confidence (0..1)
  answerable: boolean; // LLM's self-reported in-scope flag
  /**
   * Emotion/urgency boost (0..~0.2): raises the effective escalate threshold so
   * an angry or time-critical customer is handed to a human sooner. Lets the
   * agent escalate on EMOTION, not just retrieval confidence.
   */
  urgencyBoost?: number;
};

export type ConfidenceDecision = {
  combined: number;
  shouldEscalate: boolean;
  reason: 'low_confidence' | 'out_of_scope' | null;
};

/**
 * Combine retrieval similarity with the model's self-assessment.
 * Escalate when the combined score is too low, or when the KB clearly doesn't
 * cover the question (low retrieval) AND the model says it's not answerable.
 * An angry/urgent customer raises the escalate threshold (escalates earlier).
 */
export function decideConfidence(input: ConfidenceInput): ConfidenceDecision {
  const combined = 0.5 * input.retrievalScore + 0.5 * input.selfAssessment;
  const { retrievalFloor } = env.agent;
  const escalateThreshold = env.agent.escalateThreshold + (input.urgencyBoost ?? 0);

  if (input.retrievalScore < retrievalFloor && !input.answerable) {
    return { combined, shouldEscalate: true, reason: 'out_of_scope' };
  }
  if (combined < escalateThreshold) {
    return { combined, shouldEscalate: true, reason: 'low_confidence' };
  }
  return { combined, shouldEscalate: false, reason: null };
}

/** Map sentiment+urgency to a threshold boost (higher → escalate sooner). */
export function urgencyBoost(
  sentiment: 'positive' | 'neutral' | 'frustrated' | 'angry',
  urgency: 'low' | 'normal' | 'high',
): number {
  let boost = 0;
  if (sentiment === 'frustrated') boost += 0.08;
  if (sentiment === 'angry') boost += 0.15;
  if (urgency === 'high') boost += 0.1;
  return Math.min(boost, 0.25);
}
