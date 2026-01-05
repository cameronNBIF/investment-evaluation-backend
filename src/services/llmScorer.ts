import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { IntakeInput } from '../schemas/intake';
import { ScoreOutputSchema, ScoreOutput } from '../schemas/scoreOutput';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const model = genAI.getGenerativeModel({
  model: config.model,
  generationConfig: {
    temperature: 0.2,
    responseMimeType: 'application/json'
  }
});

const SYSTEM_PROMPT = `
You are a venture capital investment scoring assistant.
Evaluate the startup based on the provided **Form Data** and **Pitch Deck Summary**.

You MUST output JSON in the EXACT format shown below.

SCORING RULES:
- Score Market, Financials, Team, Product from 0–5 (integers)
- **Reasoning**: Provide a concise 1-2 sentence justification for the score.
- **Evidence**: Extract specific facts, numbers, or quotes from the input that prove your reasoning.
- overall_score = sum of category scores
- pass = true if overall_score >= 13
- confidence must be between 0 and 1

OUTPUT FORMAT EXAMPLE (THIS IS A TEMPLATE):
{
  "overall_score": 14,
  "category_scores": {
    "market": {
      "score": 4,
      "reasoning": "Large growing market ($50B TAM) but high competition.",
      "evidence": ["TAM is $50B growing at 12% CAGR", "Competitors include Uber and Lyft"]
    },
    "financials": {
      "score": 3,
      "reasoning": "Early revenue is promising but burn rate is high.",
      "evidence": ["$10k MRR", "Burn rate $50k/month"]
    },
    "team": {
      "score": 4,
      "reasoning": "Strong technical founders, lacking sales experience.",
      "evidence": ["CTO is ex-Google", "CEO is 2nd time founder"]
    },
    "product": {
      "score": 3,
      "reasoning": "MVP is live but lacks key features mentioned in roadmap.",
      "evidence": ["App Store rating 4.2", "Missing android version"]
    }
  },
  "confidence": 0.78,
  "summary": "Brief explanation of strengths and weaknesses.",
  "key_risks": [
    "Risk one",
    "Risk two"
  ],
  "recommended_next_step": "follow-up",
  "pass": true
}

ONLY OUTPUT JSON.
NO ADDITIONAL TEXT.
`;

function buildRepairPrompt(raw: string) {
  return `The previous output did not match the required JSON schema. \n${raw}`;
}

export async function scoreDeal(
  input: IntakeInput, 
  deckSummary?: string
): Promise<ScoreOutput> {
  
  const userPrompt = `
  Analyze this startup submission:

  === FORM DATA ===
  ${JSON.stringify(input, null, 2)}

  === PITCH DECK SUMMARY ===
  ${deckSummary ? deckSummary : "No pitch deck provided."}
  `;

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: userPrompt }
  ]);

  const raw = result.response.text();
  if (!raw) {
    throw new Error('Empty Gemini response');
  }

  try {
    const parsed = JSON.parse(raw);
    return ScoreOutputSchema.parse(parsed);
  } catch (err) {
    console.warn("⚠️ JSON Parse failed, attempting repair...", err);
    const repair = await model.generateContent(buildRepairPrompt(raw));
    const repairedRaw = repair.response.text();
    const repairedParsed = JSON.parse(repairedRaw);
    return ScoreOutputSchema.parse(repairedParsed);
  }
}