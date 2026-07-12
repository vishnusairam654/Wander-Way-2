import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount as never)
    });
  }
} catch (error) {
  console.warn("Failed to initialize Firebase Admin SDK. Make sure firebase-service-account.json exists in the root directory.", error);
}

export const getAuth = () => getAdminAuth();
