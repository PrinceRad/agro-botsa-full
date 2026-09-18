import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { add, getAll } from '../data/store.js';
import { getRecommendation } from '../recommendations.js';
import { cleanupUploadsIfNeeded } from '../data/photoCleanup.js';
import { remove } from '../data/store.js';

const router = express.Router();
const storage = multer.diskStorage({
  destination: 'server/uploads/',
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1000)}.${ext}`);
  },
});
const upload = multer({ storage });

const LOW_CONFIDENCE_THRESHOLD = 0.5;

// POST /api/diagnose  (multipart/form-data, field name: "photo")
router.post('/', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo uploaded (expected field name "photo")' });
  }

  const apiKey = process.env.PLANT_ID_API_KEY;

  let result;
  if (!apiKey) {
    // Placeholder result so the flow is fully testable before a real API key is wired in.
    result = {
      placeholder: true,
      disease: 'Early Blight',
      confidence: 0.82,
    };
  } else {
    try {
      const imageBase64 = fs.readFileSync(req.file.path, { encoding: 'base64' });

      // Confirmed against Kindwise's official docs/examples (crop.health product) —
      // this is the real request/response shape, not a guess.
      const response = await fetch('https://crop.kindwise.com/api/v1/identification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': apiKey,
        },
        body: JSON.stringify({ images: [imageBase64] }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return res.status(response.status).json({ error: 'Plant-ID provider error', details: errorBody });
      }

      const data = await response.json();
      const topResult = data?.result?.disease?.suggestions?.[0];
      result = {
        placeholder: false,
        disease: topResult?.name ?? 'Unknown',
        confidence: topResult?.probability ?? 0,
      };
    } catch (err) {
      return res.status(500).json({ error: 'Failed to reach plant-ID service', details: err.message });
    }
  }

  const lowConfidence = result.confidence < LOW_CONFIDENCE_THRESHOLD;
  const recommendationResult = lowConfidence
    ? null
    : getRecommendation(result.disease);

  const record = await add('diagnoses', {
    disease: result.disease,
    confidence: result.confidence,
    lowConfidence,
    recommendation: recommendationResult?.text ?? null,
    recommendationMatch: recommendationResult?.matchType ?? null,
    placeholder: result.placeholder,
    photoUrl: `/uploads/${req.file.filename}`,
  });

  // Runs in the background — doesn't make the farmer wait for a cleanup check.
  cleanupUploadsIfNeeded().catch((err) => console.error('Upload cleanup failed:', err));

  return res.json(record);
});
// GET /api/diagnose  — history of past diagnoses
router.get('/', async (req, res) => {
  const items = await getAll('diagnoses');
  res.json(items);
});

// DELETE /api/diagnose/:id — remove a single diagnosis and its photo
router.delete('/:id', async (req, res) => {
  const items = await getAll('diagnoses');
  const record = items.find((item) => item.id === req.params.id);

  if (!record) {
    return res.status(404).json({ error: 'Diagnosis not found' });
  }

  if (record.photoUrl) {
    const filename = record.photoUrl.split('/').pop();
    const filePath = path.join('server/uploads', filename);
    fs.unlink(filePath, () => {}); // ignore errors — file may already be gone
  }

  await remove('diagnoses', req.params.id);
  return res.json({ success: true });
});

// DELETE /api/diagnose — clear all diagnosis history and their photos
router.delete('/', async (req, res) => {
  const items = await getAll('diagnoses');

  for (const record of items) {
    if (record.photoUrl) {
      const filename = record.photoUrl.split('/').pop();
      const filePath = path.join('server/uploads', filename);
      fs.unlink(filePath, () => {});
    }
  }

  for (const record of items) {
    await remove('diagnoses', record.id);
  }

  return res.json({ success: true, deletedCount: items.length });
});

export default router;

