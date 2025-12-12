import { z } from 'zod';

export const IntakeSchema = z.object({
  startup_name: z.string(),
  founder_email: z.string().email(),
  industry: z.string(),
  stage: z.string(),
  location: z.string(),
  one_liner: z.string(),
  problem: z.string(),
  solution: z.string(),
  traction: z.string(),
  revenue: z.string(),
  team_background: z.string(),
  deck_url: z.string().url()
});

export type IntakeInput = z.infer<typeof IntakeSchema>;
