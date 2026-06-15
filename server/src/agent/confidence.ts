import { env } from '../config/env.js';

export type ConfidenceInput = {
  retrievalScore: number; // max cosine of top-k (0..1)
  selfAssessment: number; // LLM's self-reported confidence (0..1)
  answerable: boolean; // LLM's self-reported in-scope flag
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
 */
export function decideConfidence(input: ConfidenceInput): ConfidenceDecision {
  const combined = 0.5 * input.retrievalScore + 0.5 * input.selfAssessment;
  const { escalateThreshold, retrievalFloor } = env.agent;

  if (input.retrievalScore < retrievalFloor && !input.answerable) {
    return { combined, shouldEscalate: true, reason: 'out_of_scope' };
  }
  if (combined < escalateThreshold) {
    return { combined, shouldEscalate: true, reason: 'low_confidence' };
  }
  return { combined, shouldEscalate: false, reason: null };
}
