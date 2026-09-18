import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAll, update } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// "Critical point" — once the uploads folder passes this size, cleanup runs.
const MAX_UPLOADS_BYTES = 200 * 1024 * 1024; // 200 MB
// Cleanup deletes oldest photos until the folder is back down to this size,
// leaving some headroom so cleanup doesn't have to run again immediately.
const TARGET_BYTES_AFTER_CLEANUP = 150 * 1024 * 1024; // 150 MB

export async function cleanupUploadsIfNeeded() {
  let filenames;
  try {
    filenames = await fs.readdir(UPLOADS_DIR);
  } catch {
    return; // uploads folder doesn't exist yet — nothing to clean
  }

  const files = await Promise.all(
    filenames.map(async (name) => {
      const filePath = path.join(UPLOADS_DIR, name);
      const stat = await fs.stat(filePath);
      return { name, filePath, size: stat.size, mtimeMs: stat.mtimeMs };
    })
  );

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (totalBytes <= MAX_UPLOADS_BYTES) return; // under the limit — do nothing

  // Delete oldest photos first until we're back under the target size.
  const oldestFirst = files.sort((a, b) => a.mtimeMs - b.mtimeMs);
  let runningTotal = totalBytes;
  const deletedFilenames = [];

  for (const file of oldestFirst) {
    if (runningTotal <= TARGET_BYTES_AFTER_CLEANUP) break;
    try {
      await fs.unlink(file.filePath);
      runningTotal -= file.size;
      deletedFilenames.push(file.name);
    } catch {
      // if one file fails to delete, skip it and keep going
    }
  }

  if (deletedFilenames.length === 0) return;

  // Any diagnosis record pointing at a deleted photo gets flagged, so the
  // frontend can show "photo removed to save space" instead of a broken image.
  const diagnoses = await getAll('diagnoses');
  for (const record of diagnoses) {
    const filename = record.photoUrl ? record.photoUrl.split('/').pop() : null;
    if (filename && deletedFilenames.includes(filename)) {
      await update('diagnoses', record.id, { photoUrl: null, photoRemoved: true });
    }
  }
}