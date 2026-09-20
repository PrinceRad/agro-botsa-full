import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { add, getAll } from '../data/store.js';
import { getRecommendation } from '../recommendations.js';
import { cleanupUploadsIfNeeded } from '../data/photoCleanup.js';
import { remove } from '../data/store.js';
import path from 'path';

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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

function createDiagnosisExport(record) {
  const date = new Date(record.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  let photoMarkup = '<p class="missing-photo">No photo is available for this diagnosis.</p>';

  if (record.photoUrl) {
    const filename = path.basename(record.photoUrl);
    const photoPath = path.join('server', 'uploads', filename);
    if (fs.existsSync(photoPath)) {
      const extension = path.extname(filename).toLowerCase();
      const mimeType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
      const imageBase64 = fs.readFileSync(photoPath).toString('base64');
      photoMarkup = `<img src="data:${mimeType};base64,${imageBase64}" alt="Plant photo for this diagnosis">`;
    }
  }

  const recommendationMarkup = record.recommendation
    ? `<h2>Treatment guidance</h2><p>${escapeHtml(record.recommendation)}</p>`
    : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Agro-Botsa diagnosis record</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:36px auto;padding:0 20px;color:#1c2b20;line-height:1.5}h1{margin-bottom:0}h2{margin-top:28px;font-size:1.1rem}.muted{color:#617066}.label{font-size:.76rem;letter-spacing:.08em;text-transform:uppercase;color:#617066;font-weight:bold;margin-bottom:2px}.missing-photo{margin-top:24px;padding:18px;background:#f1f4ed;color:#617066}img{display:block;width:100%;max-height:560px;object-fit:contain;background:#f1f4ed;margin-top:28px}@media print{body{margin:0;max-width:none}}</style></head><body><h1>${escapeHtml(record.disease)}</h1><p class="muted">Diagnosis record · ${escapeHtml(date)}</p><p class="label">Confidence</p><p>${Math.round((record.confidence ?? 0) * 100)}%</p><p class="label">Assessment</p><p>${record.lowConfidence ? 'Needs a closer look' : 'Likely diagnosis'}</p>${recommendationMarkup}${photoMarkup}</body></html>`;
}

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

// GET /api/diagnose/:id/export — downloads a printable, self-contained diagnosis record.
router.get('/:id/export', async (req, res) => {
  const items = await getAll('diagnoses');
  const record = items.find((item) => item.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Diagnosis not found' });

  const safeDisease = String(record.disease || 'diagnosis')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Disposition': `attachment; filename="${safeDisease || 'diagnosis'}-record.html"`,
  });
  return res.send(createDiagnosisExport(record));
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

