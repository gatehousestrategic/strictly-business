const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

function normalize(str) {
  return (str || '').toLowerCase().trim()
    .replace(/[''`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\bthe\b|\binc\b|\bllc\b|\bco\b/g, '')
    .trim();
}

const csv = fs.readFileSync('recommendations_categorized.csv', 'utf8');
let recs = parse(csv, { columns: true, skip_empty_lines: true });
console.log(`Loaded ${recs.length} records`);

const byName = new Map();

for (const r of recs) {
  const key = normalize(r.name);
  if (!key || key.length < 2) continue;

  if (byName.has(key)) {
    const existing = byName.get(key);

    existing._services.add(r.service.trim());

    if (!existing.contact && r.contact) {
      existing.contact = r.contact;
    } else if (r.contact && r.contact.replace(/\D/g,'').length > (existing.contact||'').replace(/\D/g,'').length) {
      existing.contact = r.contact;
    }

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

const out = stringify(merged, { header: true, columns: ['name','service','category','contact','notes','date_added'] });
fs.writeFileSync('recommendations_categorized.csv', out);
console.log('Saved recommendations_categorized.csv');
