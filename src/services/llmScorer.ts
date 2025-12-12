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

You MUST output JSON in the EXACT format shown below.
Do NOT change field names.
Do NOT add or remove fields.

SCORING RULES:
- Score Market, Financials, Team, Product from 0–5 (integers)
- overall_score = sum of category scores
- pass = true if overall_score >= 13
- confidence must be between 0 and 1
- recommended_next_step must be one of: "no", "follow-up", "diligence"
- Be conservative if information is missing

OUTPUT FORMAT EXAMPLE (THIS IS A TEMPLATE):

{
  "overall_score": 14,
  "category_scores": {
    "market": 4,
    "financials": 3,
    "team": 4,
    "product": 3
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
  return `
The previous output did not match the required JSON schema.

Here is the REQUIRED JSON FORMAT:
{
  "overall_score": number,
  "category_scores": {
    "market": number,
    "financials": number,
    "team": number,
    "product": number
  },
  "confidence": number,
  "summary": string,
  "key_risks": [string],
  "recommended_next_step": "no" | "follow-up" | "diligence",
  "pass": boolean
}

Here is your previous output:
${raw}

Rewrite the output to EXACTLY match the required format.
ONLY OUTPUT JSON.
`;
}

export async function scoreDeal(input: IntakeInput): Promise<ScoreOutput> {
  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    {
      text: `Startup submission:\n${JSON.stringify(input, null, 2)}`
    }
  ]);

  const raw = result.response.text();
  if (!raw) {
    throw new Error('Empty Gemini response');
  }

  try {
        const parsed = JSON.parse(raw);
        return ScoreOutputSchema.parse(parsed);
    } catch {
        const repair = await model.generateContent(
            buildRepairPrompt(raw)
        );
        const repairedRaw = repair.response.text();
        const repairedParsed = JSON.parse(repairedRaw);
        return ScoreOutputSchema.parse(repairedParsed);
    }
}
