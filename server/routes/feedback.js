import express from 'express';
import { add, getAll } from '../data/store.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { rating, comment, screen } = req.body;
  const record = await add('feedback', { rating: rating || null, comment: comment || '', screen: screen || null });
  return res.json(record);
});

router.get('/', async (req, res) => {
  const items = await getAll('feedback');
  res.json(items);
});

export default router;