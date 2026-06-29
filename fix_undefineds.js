const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const ANTHROPIC_KEY = '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';

const MAIN_CATEGORIES = {
  'Trades & Contractors': [
    'Plumbing', 'Electrical', 'HVAC', 'Roofing', 'Handyman', 'Painting',
    'Flooring', 'Windows & Doors', 'Masonry', 'Fencing & Decking',
    'Pool & Spa', 'Pest Control', 'Solar & Energy', 'Gutters', 'Waterproofing'
  ],
  'Construction & Design': [
    'General Contracting', 'Renovation & Remodeling', 'Interior Design',
    'Architecture', 'Structural Engineering', 'Inspection & Surveying',
    'Landscaping', 'Cleaning', 'Power Washing'
  ],
  'Professional & Financial': [
    'Legal', 'Accounting & Tax', 'Insurance', 'Mortgage & Lending',
    'Financial Planning', 'Real Estate', 'Staffing & Recruiting',
    'Marketing & Advertising', 'Graphic Design', 'Photography',
    'Videography', 'Printing & Signage'
  ],
  'Automotive & Logistics': [
    'Auto Repair', 'Auto Body', 'Car Sales', 'Moving', 'Delivery & Trucking',
    'Storage', 'Towing'
  ],
  'Technology & Business': [
    'Web Development', 'Software & Apps', 'IT Support',
    'Cybersecurity', 'AV & Security Systems'
  ],
  'Community & Lifestyle': [
    'Catering & Food', 'Event Planning', 'Medical', 'Dental',
    'Mental Health', 'Tutoring', 'Childcare', 'Locksmith',
    'Senior Care', 'Apparel & Uniforms'
  ]
};

const ALL_SUBCATS = Object.values(MAIN_CATEGORIES).flat();
const SUBCAT_TO_MAIN = {};
for (const [main, subs] of Object.entries(MAIN_CATEGORIES)) {
  for (const sub of subs) SUBCAT_TO_MAIN[sub] = main;
}

// Also map old category names to new ones
const OLD_TO_NEW = {
  'Handyman': { cat: 'Trades & Contractors', sub: 'Handyman' },
  'Plumbing': { cat: 'Trades & Contractors', sub: 'Plumbing' },
  'Legal': { cat: 'Professional & Financial', sub: 'Legal' },
  'Catering & Food': { cat: 'Community & Lifestyle', sub: 'Catering & Food' },
  'Engineering & Inspection': { cat: 'Construction & Design', sub: 'Inspection & Surveying' },
  'Automotive': { cat: 'Automotive & Logistics', sub: 'Auto Repair' },
  'Technology & IT': { cat: 'Technology & Business', sub: 'IT Support' },
  'Windows & Doors': { cat: 'Trades & Contractors', sub: 'Windows & Doors' },
  'HVAC': { cat: 'Trades & Contractors', sub: 'HVAC' },
  'Roofing': { cat: 'Trades & Contractors', sub: 'Roofing' },
  'Cleaning': { cat: 'Construction & Design', sub: 'Cleaning' },
  'Moving & Delivery': { cat: 'Automotive & Logistics', sub: 'Moving' },
  'Electrical': { cat: 'Trades & Contractors', sub: 'Electrical' },
  'Storage & Warehousing': { cat: 'Automotive & Logistics', sub: 'Storage' },
  'Energy & Utilities': { cat: 'Trades & Contractors', sub: 'Solar & Energy' },
  'Flooring': { cat: 'Trades & Contractors', sub: 'Flooring' },
  'Events & Catering': { cat: 'Community & Lifestyle', sub: 'Event Planning' },
  'Landscaping': { cat: 'Construction & Design', sub: 'Landscaping' },
  'Masonry': { cat: 'Trades & Contractors', sub: 'Masonry' },
  'Marketing & PR': { cat: 'Professional & Financial', sub: 'Marketing & Advertising' },
  'Printing & Signage': { cat: 'Professional & Financial', sub: 'Printing & Signage' },
  'Contracting & Construction': { cat: 'Construction & Design', sub: 'General Contracting' },
  'Other Services': { cat: 'Community & Lifestyle', sub: null },
};

async function callClaude(batch) {
  const items = batch.map((r, i) =>
    `${i+1}. Name: ${r.name} | Recommended for: ${r.service.slice(0,150)} | Notes: ${(r.notes||'').slice(0,60)}`
  ).join('\n');

  const prompt = `You are categorizing business referrals from a community WhatsApp group (mix of residential and commercial).

For each referral, assign the most accurate subcategory from this list:
${ALL_SUBCATS.join(', ')}

Return ONLY a JSON array of strings, one per item, in order. No explanation, just the array.

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
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'API error');
  let text = data.content[0].text.trim().replace(/```json|```/g, '').trim();
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array: ' + text.slice(0,80));
  return JSON.parse(match[0]);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const csv = fs.readFileSync('recommendations_categorized.csv', 'utf8');
  let recs = parse(csv, { columns: true, skip_empty_lines: true });
  console.log(`Loaded ${recs.length} records`);

  // Find records needing fixing: undefined subcategory or old-style category
  const toFix = [];
  const toFixIdx = [];

  recs.forEach((r, i) => {
    const needsFix = !r.subcategory || r.subcategory === 'undefined' || r.subcategory === '';
    if (needsFix) {
      // Try simple mapping first
      const mapped = OLD_TO_NEW[r.category];
      if (mapped && mapped.sub) {
        recs[i].category = mapped.cat;
        recs[i].subcategory = mapped.sub;
      } else {
        toFix.push(r);
        toFixIdx.push(i);
      }
    }
  });

  console.log(`Simple-mapped some. ${toFix.length} still need Claude recategorization.`);

  // Recategorize remaining with Claude
  const BATCH = 20;
  let updated = 0, errors = 0;

  for (let i = 0; i < toFix.length; i += BATCH) {
    const batch = toFix.slice(i, i + BATCH);
    const idxBatch = toFixIdx.slice(i, i + BATCH);
    try {
      const cats = await callClaude(batch);
      if (cats && cats.length === batch.length) {
        for (let j = 0; j < batch.length; j++) {
          const sub = cats[j];
          const validSub = ALL_SUBCATS.includes(sub) ? sub :
            ALL_SUBCATS.find(s => s.toLowerCase() === (sub||'').toLowerCase());
          if (validSub) {
            recs[idxBatch[j]].subcategory = validSub;
            recs[idxBatch[j]].category = SUBCAT_TO_MAIN[validSub];
            updated++;
          } else {
            // fallback
            recs[idxBatch[j]].subcategory = 'Other';
            recs[idxBatch[j]].category = 'Community & Lifestyle';
            errors++;
          }
        }
      }
    } catch(e) {
      console.error(`\n  Batch error:`, e.message.slice(0,60));
      batch.forEach((_, j) => {
        recs[idxBatch[j]].subcategory = 'Other';
        recs[idxBatch[j]].category = 'Community & Lifestyle';
      });
      errors += batch.length;
    }
    process.stdout.write(`\r  ${Math.min(i+BATCH, toFix.length)}/${toFix.length} (${updated} fixed, ${errors} fallback)`);
    await sleep(400);
  }

  console.log(`\nDone. Fixed: ${updated}, Fallback: ${errors}`);

  const out = stringify(recs, {
    header: true,
    columns: ['name','service','category','subcategory','contact','notes','date_added']
  });
  fs.writeFileSync('recommendations_categorized.csv', out);
  console.log('Saved.');

  // Final distribution
  const dist = {};
  recs.forEach(r => { const k = `${r.category} > ${r.subcategory}`; dist[k]=(dist[k]||0)+1; });
  console.log('\nFinal distribution:');
  Object.entries(dist).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
  console.log(`\nTotal: ${recs.length}`);
}

run().catch(console.error);
