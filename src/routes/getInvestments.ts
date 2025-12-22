import { Router } from 'express';
import { listRequestFolders, readJSON } from '../services/blobStore';

const router = Router();

router.get('/investments', async (_req, res) => {
  try {
    console.log('[GET /investments] Listing request folders...');

    const folders = await listRequestFolders();

    console.log('[GET /investments] Found folders:', folders);

    const investments = [];

    for (const folder of folders) {
      try {
        console.log('[GET /investments] Processing folder:', folder);

        const trimmed = folder.replace('requests/', '').replace(/\/$/, '');
        const [timestamp, requestId] = trimmed.split('_');

        const scorePath = `${folder}score.json`;
        const inputPath = `${folder}raw_input.json`;

        const score = await readJSON<any>(scorePath);
        const input = await readJSON<any>(inputPath);

        // ✅ FIX: Access fields inside 'input.intake'
        investments.push({
          request_id: requestId,
          // Use optional chaining (?.) just in case old data has a different structure
          startup_name: input.intake?.startup_name || "Unknown Startup",
          industry: input.intake?.industry || "N/A",  // <-- NEW FIELD
          submitted_at: timestamp,
          overall_score: score.score?.overall_score ?? score.overall_score ?? 0,
          pass: score.score?.pass ?? score.pass ?? false
        });

      } catch (err: any) {
        console.warn(
          '[GET /investments] Skipping incomplete deal:',
          folder,
          err.code || err.message
        );
      }
    }

    // Sort by newest first (optional, but helpful for the table)
    investments.sort((a, b) => 
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );

    res.json(investments);

  } catch (err) {
    console.error('[GET /investments] ERROR:', err);
    res.status(500).json({ error: 'Failed to list investments' });
  }
});

export default router;