import '../src/config/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { migrate, getDb } from '../src/db/client.js';
import { SEED_DIR } from '../src/config/env.js';
import { extractMarkdown, extractPdf } from '../src/rag/ingest.js';
import { ingestDocument } from '../src/rag/store.js';
import { createTicket } from '../src/db/repo/tickets.js';
import { listDocuments } from '../src/db/repo/kb.js';
import { makeTextPdf } from './lib/makePdf.js';
import { env } from '../src/config/env.js';

async function main() {
  migrate();
  const db = getDb();

  // `--if-empty` (used at deploy startup): skip seeding when the KB already has
  // content, so restarts are fast and don't re-embed (saves Gemini quota).
  if (process.argv.includes('--if-empty')) {
    const n = (db.prepare('SELECT COUNT(*) c FROM kb_chunks').get() as { c: number }).c;
    if (n > 0) {
      console.log(`• KB already seeded (${n} chunks) — skipping.`);
      process.exit(0);
    }
  }

  if (!env.gemini.apiKey) {
    console.error('\n✗ GEMINI_API_KEY is not set. Seeding needs it to embed the knowledge base.');
    console.error('  Add it to .env (free at https://aistudio.google.com/apikey) and re-run `npm run seed`.\n');
    process.exit(1);
  }

  // Reset KB + tickets so seeding is idempotent.
  db.exec('DELETE FROM kb_chunks; DELETE FROM kb_documents; DELETE FROM tickets;');
  console.log('• Cleared existing knowledge base + tickets');

  // 1) Markdown docs
  const docsDir = path.join(SEED_DIR, 'docs');
  for (const file of fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'))) {
    const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
    const doc = extractMarkdown(content);
    const rec = await ingestDocument(doc);
    console.log(`  ✓ ${rec.title} (${rec.chunk_count} chunks)`);
  }

  // 2) FAQs
  const faqs = fs.readFileSync(path.join(SEED_DIR, 'faqs.md'), 'utf8');
  const faqDoc = extractMarkdown(faqs, 'FoodAssist AI FAQs');
  const faqRec = await ingestDocument(faqDoc);
  console.log(`  ✓ ${faqRec.title} (${faqRec.chunk_count} chunks)`);

  // 3) Generate + ingest a sample PDF (exercises the PDF path)
  const pdfBody = [
    'FoodAssist AI Quick Reference Guide',
    '',
    'This guide summarizes the most common FoodAssist AI food delivery support topics.',
    '',
    'ORDERS: Track your order under the Orders tab (Confirmed > Preparing > Picked up > On the',
    'way > Delivered). For missing or wrong items, use Get help > Report an issue. Cancel free',
    'only before the restaurant starts preparing the order.',
    '',
    'DELIVERY: Times are estimates and vary with prep time, traffic, and weather. Message your',
    'courier in-app once the order is picked up. If marked delivered but not received, report it',
    'under Get help > Order never arrived and we review the courier GPS drop-off.',
    '',
    'PAYMENTS: We accept cards, Apple Pay, Google Pay, and gift cards. A temporary authorization',
    'hold may appear and clears within a few days. Refunds go to FoodAssist AI credit (instant) or your',
    'card (3-5 business days). Declined? Update your card under Account > Payment.',
    '',
    'MEMBERSHIP: FoodAssist Plus is $9.99/month for free delivery on orders over $15. Cancel anytime',
    'under Account > FoodAssist Plus; benefits last until the end of the billing period.',
    '',
    'SUPPORT: For issues the docs do not cover, the Synapse AI agent will connect you to a',
    'human support agent with full context.',
  ].join('\n');
  const pdfBuffer = await makeTextPdf('FoodAssist AI Quick Reference Guide', pdfBody);
  const pdfPath = path.join(SEED_DIR, 'foodassist-guide.pdf');
  fs.writeFileSync(pdfPath, pdfBuffer);
  const pdfDoc = await extractPdf(pdfBuffer, 'foodassist-guide.pdf');
  const pdfRec = await ingestDocument(pdfDoc);
  console.log(`  ✓ ${pdfRec.title} [PDF] (${pdfRec.chunk_count} chunks)`);

  // 4) Resolved tickets — both as DB rows AND as a KB document (past resolutions).
  const tickets = JSON.parse(
    fs.readFileSync(path.join(SEED_DIR, 'tickets.json'), 'utf8'),
  ) as Array<{ subject: string; topic: string; resolution: string }>;

  for (const t of tickets) {
    createTicket({
      subject: t.subject,
      body: t.resolution,
      topic: t.topic,
      status: 'resolved',
      resolvedAt: Date.now(),
    });
  }
  const ticketsMd =
    '# Resolved Support Tickets (knowledge base)\n\n' +
    tickets
      .map(
        (t) =>
          `## ${t.subject}\nTopic: ${t.topic}\nResolution: ${t.resolution}`,
      )
      .join('\n\n');
  const ticketDoc = extractMarkdown(ticketsMd, 'Resolved Support Tickets');
  const ticketRec = await ingestDocument(ticketDoc);
  console.log(`  ✓ ${ticketRec.title} (${ticketRec.chunk_count} chunks, ${tickets.length} tickets)`);

  const docs = listDocuments();
  const totalChunks = docs.reduce((n, d) => n + d.chunk_count, 0);
  console.log(`\n✓ Seed complete: ${docs.length} documents, ${totalChunks} chunks, ${tickets.length} resolved tickets.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
