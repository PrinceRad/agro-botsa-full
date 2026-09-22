import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import feedbackRoutes from './routes/feedback.js';

import weatherRoutes from './routes/weather.js';
import diagnoseRoutes from './routes/diagnose.js';
import activityRoutes from './routes/activity.js';
import exportRoutes from './routes/export.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('server/uploads'));

app.use('/api/weather', weatherRoutes);
app.use('/api/diagnose', diagnoseRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/export', exportRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve the frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`Agro-Botsa (full build) running on http://localhost:${PORT}`);
});
