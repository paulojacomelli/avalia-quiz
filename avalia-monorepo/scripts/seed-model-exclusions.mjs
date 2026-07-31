/**
 * Seed: settings/model_exclusions
 *
 * Popula o documento com os padroes de exclusao de modelos nao-texto para o Google AI.
 * Execute: node scripts/seed-model-exclusions.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'avalia-jw-quiz';

if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore();

const EXCLUSIONS = {
  text_excluded_patterns: [
    'image',
    'imagen',
    'embed',
    'bidi',
    'realtime',
    'robotics',
    'computer-use',
    'deep-research',
    'teacher',
    'lyria',
    'veo',
    'nano-banana',
  ],
  updatedAt: new Date().toISOString(),
  description: 'Padroes de substring (lowercase) para excluir modelos nao-texto da lista de Agentes de Texto.'
};

async function seed() {
  const ref = db.collection('settings').doc('model_exclusions');
  await ref.set(EXCLUSIONS, { merge: false });
  console.log('settings/model_exclusions criado:');
  console.log(JSON.stringify(EXCLUSIONS, null, 2));
}

seed().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
