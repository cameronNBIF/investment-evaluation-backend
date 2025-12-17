// src/routes/scoreInvestment.ts
import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { IntakeSchema } from '../schemas/intake';
import { scoreDeal } from '../services/llmScorer';
import { putJSON, readJSON, uploadBlob } from '../services/blobStore';
import { notifyScoringComplete } from '../services/slackNotifier';
import { extractAndStoreDeckTextSafe } from '../services/pdfExtractor';
import { summarizeDeck } from '../services/summarizeDeck';

export const scoreInvestmentRouter = Router();
const upload = multer(); // memory storage for Buffer uploads

scoreInvestmentRouter.post(
  '/',
  upload.single('pitchDeck'),
  async (req, res) => {
    const requestId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      // -------------------------
      // 1. Parse & validate intake
      // -------------------------
      const intake = IntakeSchema.parse(req.body);

      const basePath = `requests/${timestamp}_${requestId}`;
      const inputKey = `${basePath}/raw_input.json`;

      // Save raw input
      await putJSON(inputKey, {
        request_id: requestId,
        received_at: timestamp,
        intake,
      });

      // -------------------------
      // 2. Upload the PDF deck
      // -------------------------
      let deckBlobPath: string | null = null;
      let deckTextKey: string | null = null;

      if (req.file) {
        deckBlobPath = `${basePath}/raw_deck.pdf`;

        // ⬅ REAL binary upload using your existing uploadBlob()
        await uploadBlob(deckBlobPath, req.file.buffer, 'application/pdf');

        console.log(`✔ Uploaded pitch deck to Azure: ${deckBlobPath}`);

        // Extract PDF text → deck_text.json
        deckTextKey = await extractAndStoreDeckTextSafe(basePath);
        await summarizeDeck(basePath);
      }

      let deckSummary: string | undefined;

      if (deckTextKey) {
        try {
          const summaryPath = `${basePath}/deck_summary.json`;
          const summaryBlob = await readJSON<{ summary: string }>(summaryPath);
          deckSummary = summaryBlob.summary;
        } catch (err) {
          console.warn("⚠️ Deck summary not found, scoring without it");
        }
      }


      // -------------------------
      // 3. Score the deal using Gemini
      // -------------------------
      const score = await scoreDeal(intake);

      const outputKey = `${basePath}/score.json`;

      await putJSON(outputKey, {
        request_id: requestId,
        scored_at: new Date().toISOString(),
        score,
      });

      // -------------------------
      // 4. Build API response
      // -------------------------
      const responseObj = {
        success: true,
        request_id: requestId,
        submitted_at: timestamp,
        blob_paths: {
          input: inputKey,
          output: outputKey,
          ...(deckBlobPath ? { deck: deckBlobPath } : {}),
          ...(deckTextKey ? { deck_text: deckTextKey } : {}),
        },
        score,
      };

      res.json(responseObj);

      // -------------------------
      // 5. Async Slack notification
      // -------------------------
      setImmediate(() => {
        notifyScoringComplete({
          requestId,
          startupName: intake.startup_name,
          overallScore: score.overall_score,
          pass: score.pass,
          confidence: score.confidence,
          summary: score.summary,
        });
      });

    } catch (err: any) {
      console.error('Scoring failed', {
        requestId,
        error: err.message,
      });

      res.status(400).json({
        success: false,
        request_id: requestId,
        error: err.message,
      });
    }
  }
);
