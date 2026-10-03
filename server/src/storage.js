// Image storage. Uses Supabase Storage when configured, otherwise the local /uploads folder.
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config, useSupabase } from './config.js';
import { db } from './db/index.js';
import { id, fail } from './lib.js';

const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => cb(null, Boolean(ALLOWED[file.mimetype])),
});

export async function saveImage(file, folder) {
  if (!file) return null;
  const ext = ALLOWED[file.mimetype];
  if (!ext) fail(400, 'Images must be JPG, PNG, WEBP or AVIF.');
  const name = `${folder}/${id()}.${ext}`;

  if (useSupabase) {
    const bucket = db.client.storage.from(config.supabase.bucket);
    const { error } = await bucket.upload(name, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) fail(500, 'Image upload failed.');
    return bucket.getPublicUrl(name).data.publicUrl;
  }

  const target = path.join(config.uploadDir, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, file.buffer);
  return `/uploads/${name}`;
}
