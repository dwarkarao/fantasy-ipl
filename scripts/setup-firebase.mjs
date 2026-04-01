// scripts/setup-firebase.mjs
// Run once: node scripts/setup-firebase.mjs
// Creates all 20 participant accounts + admin account in Firebase

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// ── Config ────────────────────────────────────────────────────────────────────
// Download your service account key from:
// Firebase Console → Project Settings → Service Accounts → Generate new private key
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';

const USERS = Array.from({ length: 20 }, (_, i) => ({
  email:    `user${i + 1}@fantasyipl.com`,
  password: 'demo123',
  name:     `Player ${i + 1}`,
}));

const ADMIN = {
  email:    'admin@fantasyipl.com',
  password: 'admin123',   // ← Change this!
  name:     'Admin',
};
// ─────────────────────────────────────────────────────────────────────────────

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
} catch {
  console.error('❌  serviceAccountKey.json not found.');
  console.error('    Download it from Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db   = getFirestore();

async function createUser({ email, password, name }) {
  try {
    const existing = await auth.getUserByEmail(email).catch(() => null);
    if (existing) {
      console.log(`  ⚠  Already exists: ${email}`);
      // Still upsert Firestore doc
      await db.collection('users').doc(existing.uid).set({ email, name }, { merge: true });
      return;
    }
    const u = await auth.createUser({ email, password, displayName: name });
    await db.collection('users').doc(u.uid).set({ email, name, createdAt: new Date().toISOString() });
    console.log(`  ✓  Created: ${email}`);
  } catch (err) {
    console.error(`  ✗  Failed ${email}: ${err.message}`);
  }
}

console.log('\n🏏  Fantasy IPL — Firebase Setup\n');
console.log('Creating admin account…');
await createUser(ADMIN);

console.log('\nCreating 20 participant accounts…');
for (const u of USERS) await createUser(u);

console.log('\n✅  Done! All accounts created.');
console.log('   Participants log in with their email + password: demo123');
console.log('   Admin logs in with admin@fantasyipl.com + admin123\n');
process.exit(0);
