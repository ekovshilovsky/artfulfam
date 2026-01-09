/**
 * Printful catalog sync script
 *
 * This script fetches the Printful catalog and syncs it to the database.
 *
 * Usage: pnpm pod:sync:printful
 */

import { PrintfulAdapter } from '@repo/pod';

async function main() {
  const apiKey = process.env.PRINTFUL_API_KEY;

  if (!apiKey) {
    console.error('Error: PRINTFUL_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('Starting Printful catalog sync...');

  const adapter = new PrintfulAdapter({ apiKey });
  const result = await adapter.syncCatalog();

  console.log(`Sync completed:`);
  console.log(`  Provider: ${result.provider}`);
  console.log(`  Templates: ${result.templatesCount}`);
  console.log(`  Variants: ${result.variantsCount}`);
  console.log(`  Synced at: ${result.syncedAt.toISOString()}`);

  if (result.errors.length > 0) {
    console.error(`  Errors:`);
    result.errors.forEach((error) => console.error(`    - ${error}`));
    process.exit(1);
  }

  // TODO: Upsert to database
  // const db = await getDatabase();
  // for (const template of templates) {
  //   await db.template.upsert({
  //     where: { providerKey_providerTemplateId: { ... } },
  //     create: template,
  //     update: template,
  //   });
  // }

  console.log('Sync complete!');
}

main().catch((error) => {
  console.error('Sync failed:', error);
  process.exit(1);
});
