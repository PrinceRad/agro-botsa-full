import express from 'express';
import { add, getAll, remove } from '../data/store.js';

const router = express.Router();

const ALLOWED_TYPES = ['watered', 'sprayed', 'planted', 'harvested', 'other'];

// GET /api/activity
router.get('/', async (req, res) => {
  const items = await getAll('activities');
  res.json(items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// POST /api/activity  { type, notes }
router.post('/', async (req, res) => {
  const { type, notes } = req.body;

  if (!type || !ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${ALLOWED_TYPES.join(', ')}` });
  }

  const record = await add('activities', { type, notes: notes || '' });
  res.status(201).json(record);
});

// DELETE /api/activity/:id
router.delete('/:id', async (req, res) => {
  const deleted = await remove('activities', req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;
