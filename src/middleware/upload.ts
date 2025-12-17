import multer from 'multer';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB limit (adjust as needed)
  },
  fileFilter: (_req, file, cb) => {
    // Accept PDFs only for pitch decks
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF pitch decks are accepted.'));
  }
});
