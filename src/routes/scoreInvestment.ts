import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { IntakeSchema } from '../schemas/intake';
import { scoreDeal } from '../services/llmScorer';
import { putJSON } from '../services/blobStore';
import { notifyScoringComplete } from '../services/slackNotifier';

export const scoreInvestmentRouter = Router();

scoreInvestmentRouter.post('/', async (req, res) => {
  const requestId = uuidv4();
  const timestamp = new Date().toISOString();

  let intake: { startup_name: string; founder_email: string; industry: string; stage: string; location: string; one_liner: string; problem: string; solution: string; traction: string; revenue: string; team_background: string; deck_url: string; };

  try {
    intake = IntakeSchema.parse(req.body);

    const basePath = `requests/${timestamp}_${requestId}`;
    const inputKey = `${basePath}/raw_input.json`;

    // Persist raw input immediately
    await putJSON(inputKey, {
      request_id: requestId,
      received_at: timestamp,
      intake
    });

    // Score deal
    const score = await scoreDeal(intake);

    const outputKey = `${basePath}/score.json`;

    // Persist score
    await putJSON(outputKey, {
      request_id: requestId,
      scored_at: new Date().toISOString(),
      score
    });

    res.json({
      success: true,
      request_id: requestId,
      blob_paths: {
        input: inputKey,
        output: outputKey
      },
      score
    });

    setImmediate(() => {
        notifyScoringComplete({
            requestId,
            startupName: intake.startup_name,
            overallScore: score.overall_score,
            pass: score.pass,
            confidence: score.confidence,
            summary: score.summary
        });
    });

  } catch (err: any) {
    console.error('Scoring failed', {
      requestId,
      error: err.message
    });

    res.status(400).json({
      success: false,
      request_id: requestId,
      error: err.message
    });
  }
});
