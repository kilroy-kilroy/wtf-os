/**
 * One-time Copper CRM setup script.
 *
 * Run with: npx tsx scripts/copper-setup.ts
 *
 * Requires env vars: COPPER_API_KEY, COPPER_API_EMAIL
 * Optional: COPPER_WEBHOOK_SECRET (generates one if not set)
 *
 * Creates custom fields on Opportunity + registers webhook.
 * Prints env vars to add to Vercel.
 */

import { randomBytes } from 'crypto';

const COPPER_API_BASE = 'https://api.copper.com/developer_api/v1';

async function copperFetch(path: string, options: RequestInit = {}) {
  const apiKey = process.env.COPPER_API_KEY;
  const apiEmail = process.env.COPPER_API_EMAIL;
  if (!apiKey || !apiEmail) {
    throw new Error('Set COPPER_API_KEY and COPPER_API_EMAIL env vars');
  }

  const res = await fetch(`${COPPER_API_BASE}${path}`, {
    ...options,
    headers: {
      'X-PW-AccessToken': apiKey,
      'X-PW-UserEmail': apiEmail,
      'X-PW-Application': 'developer_api',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Copper API ${path} failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function createCustomField(name: string, dataType: string, options?: string[]) {
  const body: any = {
    name,
    data_type: dataType,
    available_on: ['opportunity'],
  };
  if (options) {
    body.options = options.map(o => ({ name: o }));
  }
  const result = await copperFetch('/custom_field_definitions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  console.log(`Created field "${name}" (ID: ${result.id})`);
  return result;
}

async function main() {
  console.log('=== Copper CRM Setup ===\n');

  // 1. Create custom fields
  console.log('Creating custom fields on Opportunity...\n');

  const briefField = await createCustomField('Discovery Brief', 'Text');
  const contactsField = await createCustomField('Key Contacts', 'Text');
  const startersField = await createCustomField('Conversation Starters', 'Text');
  const statusField = await createCustomField('Discovery Status', 'Dropdown', [
    'Pending', 'Running', 'Complete', 'Error',
  ]);
  const dateField = await createCustomField('Discovery Run Date', 'Date');

  // Extract dropdown option IDs
  const statusOptions = statusField.options || [];
  const pendingId = statusOptions.find((o: any) => o.name === 'Pending')?.id;
  const runningId = statusOptions.find((o: any) => o.name === 'Running')?.id;
  const completeId = statusOptions.find((o: any) => o.name === 'Complete')?.id;
  const errorId = statusOptions.find((o: any) => o.name === 'Error')?.id;

  // 2. Register webhook
  console.log('\nRegistering webhook...\n');

  const secret = process.env.COPPER_WEBHOOK_SECRET || randomBytes(32).toString('hex');
  const webhookUrl = 'https://app.timkilroy.com/api/webhooks/copper';

  const webhook = await copperFetch('/webhooks', {
    method: 'POST',
    body: JSON.stringify({
      target: webhookUrl,
      type: 'opportunity',
      event: 'new',
      secret: { key: secret },
    }),
  });

  console.log(`Webhook registered (ID: ${webhook.id})`);

  // 3. Print env vars
  console.log('\n=== Add these env vars to Vercel ===\n');
  console.log(`COPPER_FIELD_DISCOVERY_BRIEF=${briefField.id}`);
  console.log(`COPPER_FIELD_KEY_CONTACTS=${contactsField.id}`);
  console.log(`COPPER_FIELD_CONVERSATION_STARTERS=${startersField.id}`);
  console.log(`COPPER_FIELD_DISCOVERY_STATUS=${statusField.id}`);
  console.log(`COPPER_FIELD_DISCOVERY_DATE=${dateField.id}`);
  console.log(`COPPER_STATUS_PENDING=${pendingId}`);
  console.log(`COPPER_STATUS_RUNNING=${runningId}`);
  console.log(`COPPER_STATUS_COMPLETE=${completeId}`);
  console.log(`COPPER_STATUS_ERROR=${errorId}`);
  console.log(`COPPER_WEBHOOK_SECRET=${secret}`);
  console.log('\nDone! Add these to Vercel then deploy.');
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
