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

        investments.push({
        request_id: requestId,
        startup_name: input.startup_name,
        submitted_at: timestamp,
        overall_score: score.overall_score,
        pass: score.pass
        });

    } catch (err: any) {
        console.warn(
        '[GET /investments] Skipping incomplete deal:',
        folder,
        err.code || err.message
        );
    }
    }

    res.json(investments);

  } catch (err) {
    console.error('[GET /investments] ERROR:', err);
    res.status(500).json({ error: 'Failed to list investments' });
  }
});

export default router;
