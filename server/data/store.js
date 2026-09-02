// Minimal file-based JSON data store.
// Not a real database — but the read/write/add interface below is written so that
// swapping this out for a real DB (e.g. MySQL/Postgres) later only means rewriting
// this one file, not anything that calls it.

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function filePathFor(collectionName) {
  return path.join(__dirname, `${collectionName}.json`);
}

async function ensureFile(collectionName) {
  const filePath = filePathFor(collectionName);
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]', 'utf-8');
  }
  return filePath;
}

export async function getAll(collectionName) {
  const filePath = await ensureFile(collectionName);
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

export async function add(collectionName, record) {
  const items = await getAll(collectionName);
  const newRecord = {
    id: Date.now().toString() + '-' + Math.round(Math.random() * 1000),
    ...record,
    createdAt: new Date().toISOString(),
  };
  items.push(newRecord);
  const filePath = filePathFor(collectionName);
  await fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf-8');
  return newRecord;
}

export async function remove(collectionName, id) {
  const items = await getAll(collectionName);
  const filtered = items.filter((item) => item.id !== id);
  const filePath = filePathFor(collectionName);
  await fs.writeFile(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
  return filtered.length !== items.length;
}
