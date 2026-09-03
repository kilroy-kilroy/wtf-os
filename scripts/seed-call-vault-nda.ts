// Seeds the Call Vault NDA as a contract_templates row.
//   npx tsx scripts/seed-call-vault-nda.ts
// Idempotent — upserts on `slug`. Requires NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY in the env (e.g. from .env.local).

import { createClient } from '@supabase/supabase-js';
import {
  CALL_VAULT_NDA_SLUG, CALL_VAULT_NDA_NAME, CALL_VAULT_NDA_HTML, CALL_VAULT_NDA_VARIABLES,
} from '../apps/web/lib/call-vault/nda-template';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { error } = await db.from('contract_templates').upsert({
    slug: CALL_VAULT_NDA_SLUG,
    name: CALL_VAULT_NDA_NAME,
    body_html: CALL_VAULT_NDA_HTML,
    variables: CALL_VAULT_NDA_VARIABLES,
    signer_config: { roles: [{ role: 'client', label: 'Client', order: 1 }] },
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'slug' });

  if (error) throw new Error(`seed failed: ${error.message}`);
  console.log(`Seeded contract template: ${CALL_VAULT_NDA_SLUG}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
