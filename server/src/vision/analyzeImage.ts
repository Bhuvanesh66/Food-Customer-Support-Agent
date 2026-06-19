import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { extractJsonObject } from '../agent/toolProtocol.js';

let client: GoogleGenAI | null = null;
function genai(): GoogleGenAI {
  if (!env.gemini.apiKey) throw new Error('GEMINI_API_KEY is not set (required for image analysis).');
  if (!client) client = new GoogleGenAI({ apiKey: env.gemini.apiKey });
  return client;
}

export type ComplaintAnalysis = {
  issue: string; // what's wrong, described plainly
  severity: 'low' | 'medium' | 'high';
  itemsAffected: string[]; // e.g. ["pizza", "drink"]
  suggestedResolution: string; // refund | replacement | partial refund | none
  isFoodRelated: boolean; // false if the image is irrelevant
};

const VISION_PROMPT = `You are a food-delivery support vision assistant. Look at the customer's
photo of their order and assess any problem (burnt/undercooked food, spilled/leaking drink,
missing or wrong items, damaged packaging, foreign object, melted dessert, etc.).

Reply with EXACTLY ONE JSON object, no prose, no markdown fences:
{
  "issue": "<one concise sentence describing what's wrong>",
  "severity": "low" | "medium" | "high",
  "itemsAffected": ["<item>", ...],
  "suggestedResolution": "<full refund | partial refund | replacement | no action needed>",
  "isFoodRelated": true | false
}
If the image is not of a food/grocery order or shows no problem, set isFoodRelated accordingly and
issue to a short explanation.`;

/**
 * Analyze a complaint photo with Gemini (multimodal, free tier). Returns a
 * structured complaint assessment the agent can act on (draft a resolution /
 * create a ticket). Mirrors the existing @google/genai usage in embeddings.
 */
export async function analyzeComplaintImage(
  imageBase64: string,
  mimeType: string,
  userText?: string,
): Promise<ComplaintAnalysis> {
  const ai = genai();
  const res = await ai.models.generateContent({
    model: env.gemini.chatModel, // gemini-2.5-flash is multimodal
    contents: [
      {
        role: 'user',
        parts: [
          { text: VISION_PROMPT + (userText ? `\n\nCustomer note: "${userText}"` : '') },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      },
    ],
    config: { temperature: 0.2 },
  });

  const text = res.text ?? '';
  const json = extractJsonObject(text);
  if (!json) {
    return {
      issue: 'Could not read the image clearly.',
      severity: 'low',
      itemsAffected: [],
      suggestedResolution: 'no action needed',
      isFoodRelated: false,
    };
  }
  try {
    const o = JSON.parse(json) as Partial<ComplaintAnalysis>;
    return {
      issue: typeof o.issue === 'string' ? o.issue : 'Image analyzed.',
      severity: o.severity === 'high' || o.severity === 'medium' ? o.severity : 'low',
      itemsAffected: Array.isArray(o.itemsAffected) ? o.itemsAffected.map(String) : [],
      suggestedResolution:
        typeof o.suggestedResolution === 'string' ? o.suggestedResolution : 'no action needed',
      isFoodRelated: o.isFoodRelated !== false,
    };
  } catch {
    return {
      issue: 'Could not interpret the image.',
      severity: 'low',
      itemsAffected: [],
      suggestedResolution: 'no action needed',
      isFoodRelated: false,
    };
  }
}
