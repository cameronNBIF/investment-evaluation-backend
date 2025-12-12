import { Router } from 'express';
import { listRequestFolders, readJSON } from '../services/blobStore';

const router = Router();

router.get('/investments/:requestId', async (req, res) => {
  const { requestId } = req.params;

  try {
    const folders = await listRequestFolders();

    const folder = folders.find((f) =>
      f.includes(`_${requestId}/`)
    );

    if (!folder) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const trimmed = folder.replace('requests/', '').replace(/\/$/, '');
    const [timestamp] = trimmed.split('_');

    const input = await readJSON<any>(
      `${folder}raw_input.json`
    );

    const score = await readJSON<any>(
      `${folder}score.json`
    );

    res.json({
      request_id: requestId,
      submitted_at: timestamp,
      input,
      ai_score: score
    });
  } catch (err) {
    console.error(`GET /investments/${requestId} failed:`, err);
    res.status(500).json({ error: 'Failed to load deal' });
  }
});

export default router;
