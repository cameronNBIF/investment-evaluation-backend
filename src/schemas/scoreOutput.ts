import { z } from 'zod';

export const ScoreOutputSchema = z.object({
  overall_score: z.number().int().min(0).max(20),
  category_scores: z.object({
    market: z.number().int().min(0).max(5),
    financials: z.number().int().min(0).max(5),
    team: z.number().int().min(0).max(5),
    product: z.number().int().min(0).max(5)
  }),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  key_risks: z.array(z.string()),
  recommended_next_step: z.enum(['no', 'follow-up', 'diligence']),
  pass: z.boolean()
});

export type ScoreOutput = z.infer<typeof ScoreOutputSchema>;
