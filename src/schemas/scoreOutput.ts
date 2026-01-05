import { z } from 'zod';

// Define the shape of a single category's evaluation
const CategoryEvaluationSchema = z.object({
  score: z.number().int().min(0).max(5),
  reasoning: z.string().describe("A 1-2 sentence explanation of why this score was given."),
  evidence: z.array(z.string()).describe("Direct quotes or specific facts from the deck/input that support this score.")
});

export const ScoreOutputSchema = z.object({
  overall_score: z.number().int().min(0).max(20),
  
  // Update: Categories are now objects, not just numbers
  category_scores: z.object({
    market: CategoryEvaluationSchema,
    financials: CategoryEvaluationSchema,
    team: CategoryEvaluationSchema,
    product: CategoryEvaluationSchema
  }),
  
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  key_risks: z.array(z.string()),
  recommended_next_step: z.enum(['no', 'follow-up', 'diligence']),
  pass: z.boolean()
});

export type ScoreOutput = z.infer<typeof ScoreOutputSchema>;