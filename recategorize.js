const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const ANTHROPIC_KEY = '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';

const CATEGORIES = [
  'Accounting & Tax', 'Automotive', 'Catering & Food', 'Childcare', 'Cleaning',
  'Contracting & Construction', 'Design & Architecture', 'Education & Tutoring',
  'Electrical', 'Energy & Utilities', 'Engineering & Inspection', 'Events & Catering',
  'Fencing & Decking', 'Finance & Lending', 'Flooring', 'Handyman', 'HVAC',
  'Insurance', 'Landscaping', 'Legal', 'Locksmith', 'Marketing & PR', 'Masonry',
  'Medical & Health', 'Moving & Delivery', 'Other Services', 'Painting', 'Pest Control',
  'Photography & Video', 'Plumbing', 'Pool & Spa', 'Printing & Signage', 'Real Estate',
  'Roofing', 'Security', 'Staffing & HR', 'Storage & Warehousing', 'Technology & IT',
  'Windows & Doors'
];

async function callClaude(batch) {
  const items = batch.map((r, i) =>
    `${i+1}. Name: ${r.name} | Recommended for: ${r.service.slice(0,120)} | Notes: ${(r.notes||'').slice(0,60)}`
  ).join('\n');

  const prompt = `You are categorizing business referrals from a community WhatsApp group.

For each referral, assign the single most appropriate category from this list:
${CATEGORIES.join(', ')}

Use the name, what they were recommended for, and notes together to pick the best category.
Return ONLY a JSON array of strings, one per item, in order. Example: ["Plumbing", "Legal"]

Referrals:
${items}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'API error');
  let text = data.content[0].text.trim().replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalize(str) {
  return (str || '').toLowerCase().trim()
    .replace(/[''`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\bthe\b|\binc\b|\bllc\b|\bco\b/g, '')
    .trim();
}

async function run() {
  const csv = fs.readFileSync('recommendations_categorized.csv', 'utf8');
  let recs = parse(csv, { columns: true, skip_empty_lines: true });
  console.log(`Loaded ${recs.length} records`);

  // Step 1: Merge by person/business name
  console.log('\nMerging duplicates by name...');
  const byName = new Map();

  for (const r of recs) {
    const key = normalize(r.name);
    if (!key || key.length < 2) continue;

    if (byName.has(key)) {
      const existing = byName.get(key);

      // Merge services
      existing._services.add(r.service.trim());

      // Keep best contact
      if (!existing.contact && r.contact) {
        existing.contact = r.contact;
      } else if (r.contact && r.contact.replace(/\D/g,'').length > (existing.contact||'').replace(/\D/g,'').length) {
        existing.contact = r.contact;
      }

      // Merge notes
      if (r.notes && r.notes !== r.contact && r.notes !== r.name && r.notes.length > 3) {
        existing._notes.add(r.notes.trim());
      }
    } else {
      const entry = { ...r, _services: new Set([r.service.trim()]), _notes: new Set() };
      if (r.notes && r.notes !== r.contact && r.notes !== r.name && r.notes.length > 3) {
        entry._notes.add(r.notes.trim());
      }
      byName.set(key, entry);
    }
  }

  // Flatten
  let merged = [];
  for (const r of byName.values()) {
    r.service = [...r._services].join(' · ');
    const notesArr = [...r._notes].filter(n => n && n !== r.contact && n !== r.name);
    r.notes = [...new Set(notesArr)].slice(0, 3).join(' | ');
    delete r._services;
    delete r._notes;
    merged.push(r);
  }

  console.log(`Merged ${recs.length - merged.length} duplicates. ${merged.length} unique records remaining.`);
  recs = merged;

  // Step 2: Recategorize
  console.log('\nRecategorizing with Claude...');
  const BATCH = 20;
  let updated = 0, errors = 0;

  for (let i = 0; i < recs.length; i += BATCH) {
    const batch = recs.slice(i, i + BATCH);
    try {
      const cats = await callClaude(batch);
      if (cats && cats.length === batch.length) {
        for (let j = 0; j < batch.length; j++) {
          if (CATEGORIES.includes(cats[j])) {
            recs[i+j].category = cats[j];
            updated++;
          } else { errors++; }
        }
      } else { errors += batch.length; }
    } catch(e) {
      console.error(`\n  Batch ${Math.floor(i/BATCH)+1} error:`, e.message);
      errors += batch.length;
    }
    process.stdout.write(`\r  ${Math.min(i+BATCH, recs.length)}/${recs.length} (${updated} updated, ${errors} errors)`);
    await sleep(350);
  }

  console.log(`\nDone. Updated: ${updated}, Errors: ${errors}`);

  // Step 3: Save
  const out = stringify(recs, { header: true, columns: ['name','service','category','contact','notes','date_added'] });
  fs.writeFileSync('recommendations_categorized.csv', out);
  console.log('Saved recommendations_categorized.csv');

  // Distribution
  const dist = {};
  recs.forEach(r => { dist[r.category] = (dist[r.category]||0)+1; });
  console.log('\nCategory distribution:');
  Object.entries(dist).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
  console.log(`\nTotal unique records: ${recs.length}`);
}

run().catch(console.error);
