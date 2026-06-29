const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const SUPABASE_URL = 'https://hlohdnjxemwpnnkxnhqx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsb2hkbmp4ZW13cG5ua3huaHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzU5NzYsImV4cCI6MjA5NzcxMTk3Nn0.WcwZ3VpLwwo4aDUMyrz4pwQBN1jBkKQrLBLp7mKFA-U';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Clearing existing data...');
  const { error: delError } = await supabase.from('recommendations').delete().neq('id', 0);
  if (delError) { console.error('Delete error:', delError.message); process.exit(1); }
  console.log('Cleared.');

  const csv = fs.readFileSync('recommendations_categorized.csv', 'utf8');
  const records = parse(csv, { columns: true, skip_empty_lines: true });
  console.log(`Uploading ${records.length} records...`);

  let success = 0;
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100).map(r => ({
      name:        r.name        || null,
      service:     r.service     || null,
      category:    r.category    || null,
      subcategory: r.subcategory || null,
      contact:     r.contact     || null,
      notes:       r.notes       || null,
      date_added:  r.date_added  || null,
    }));
    const { error } = await supabase.from('recommendations').insert(batch);
    if (error) { console.error(`Batch error:`, error.message); }
    else { success += batch.length; process.stdout.write(`\r${success}/${records.length}`); }
  }
  console.log(`\nDone! ${success} records uploaded.`);
}

run();
