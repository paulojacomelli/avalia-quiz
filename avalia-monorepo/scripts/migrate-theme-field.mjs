/**
 * migrate-theme-field.mjs
 *
 * Script de migracao one-shot para normalizar o campo `theme` na colecao
 * `generated_quizzes` do Firestore.
 *
 * PROBLEMA: Ao longo do tempo, o campo `theme` foi salvo com valores
 * inconsistentes. Exemplos:
 *   - 'GENERAL'   (valor correto canonico)
 *   - 'Geral'     (label salvo por engano)
 *   - 'Academico' (enum label salvo por engano)
 *   - 'General'   (casing errado)
 *
 * PRE-REQUISITOS:
 *   1. Baixar Service Account: Firebase Console > Configuracoes > Contas de servico
 *   2. Salvar como: scripts/serviceAccount.json
 *   3. npm install firebase-admin (se nao tiver)
 *
 * USO:
 *   node scripts/migrate-theme-field.mjs            # execucao real
 *   node scripts/migrate-theme-field.mjs --dry-run  # apenas relatorio
 */

import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SERVICE_ACCOUNT_PATH = new URL('./serviceAccount.json', import.meta.url)
  .pathname.replace(/^\/([A-Z]:)/, '$1');

const COLLECTION = 'generated_quizzes';
const DRY_RUN = process.argv.includes('--dry-run');

// Mapa canônico: chave raw/antiga -> Rótulo legível oficial em português
const CANONICAL_MAP = {
  // avalia-quiz
  'GENERAL':        'Acadêmico',
  'Geral':          'Acadêmico',
  'General':        'Acadêmico',
  'Academico':      'Acadêmico',
  'Acadêmico':      'Acadêmico',
  'ACADEMIC':       'Acadêmico',

  'ENTERTAINMENT':  'Entretenimento',
  'Entretenimento': 'Entretenimento',

  'ARTS_CULTURE':   'Arte & Cultura',
  'Arte & Cultura': 'Arte & Cultura',
  'ARTS':           'Arte & Cultura',

  'GEOPOLITICS':    'Geopolítica',
  'Geopolitica':    'Geopolítica',
  'Geopolítica':    'Geopolítica',

  'ANIMALS':        'Mundo Animal',
  'Mundo Animal':   'Mundo Animal',

  'OTHER':          'Outro Assunto',
  'Outro Assunto':  'Outro Assunto',
  'Outro':          'Outro Assunto',

  // avalia-jw-quiz
  'BOOKS':               'Livros da Bíblia',
  'Livros da Biblia':    'Livros da Bíblia',
  'Livros da Bíblia':    'Livros da Bíblia',

  'HISTORY_JW':          'A História',
  'A Historia':          'A História',
  'A História':          'A História',

  // avalia-kids-quiz e outros temas
  'COLORS_SHAPES':       'Cores & Formas',
  'Cores & Formas':      'Cores & Formas',
};

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
} catch {
  console.error('\n❌ scripts/serviceAccount.json nao encontrado.');
  console.error('   Baixe em: Firebase Console > Configuracoes > Contas de servico\n');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function migrate() {
  console.log(`\n🔍 Lendo colecao "${COLLECTION}"...`);
  if (DRY_RUN) console.log('⚠️  DRY-RUN — nenhuma alteracao sera gravada.\n');

  const snapshot = await db.collection(COLLECTION).get();
  console.log(`   Total de documentos: ${snapshot.size}\n`);

  const toUpdate = [];
  const unknown  = [];

  snapshot.forEach(docSnap => {
    const current = docSnap.data().theme;
    if (!current) return;

    const canonical = CANONICAL_MAP[current];
    if (canonical === undefined) { unknown.push({ id: docSnap.id, theme: current }); return; }
    if (current === canonical) return;

    toUpdate.push({ ref: docSnap.ref, id: docSnap.id, from: current, to: canonical });
  });

  console.log(`✅ Ja corretos:         ${snapshot.size - toUpdate.length - unknown.length}`);
  console.log(`🔧 A corrigir:          ${toUpdate.length}`);
  console.log(`❓ Valores desconhecidos: ${unknown.length}\n`);

  if (toUpdate.length > 0) {
    console.log('── Correcoes a aplicar ──────────────────────────────');
    toUpdate.forEach(u => console.log(`   [${u.id}]  "${u.from}" -> "${u.to}"`));
    console.log('');
  }

  if (unknown.length > 0) {
    console.log('── Valores nao mapeados (IGNORADOS) ─────────────────');
    unknown.forEach(u => console.log(`   [${u.id}]  theme="${u.theme}"`));
    console.log('\n⚠️  Adicione os valores acima ao CANONICAL_MAP se necessario.\n');
  }

  if (DRY_RUN || toUpdate.length === 0) {
    console.log(DRY_RUN ? '🏁 Dry-run concluido.' : '🏁 Nada a migrar.');
    return;
  }

  const BATCH_SIZE = 500;
  let updated = 0;
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const chunk = toUpdate.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(({ ref, to }) => batch.update(ref, { theme: to }));
    await batch.commit();
    updated += chunk.length;
    console.log(`   Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} docs atualizados.`);
  }

  console.log(`\n🎉 Migracao concluida. ${updated} documentos atualizados.`);
}

migrate().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
