const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const SUPABASE_URL = 'https://hlohdnjxemwpnnkxnhqx.supabase.co';
// Service role key - bypasses RLS, only use locally never in frontend
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsb2hkbmp4ZW13cG5ua3huaHF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjEzNTk3NiwiZXhwIjoyMDk3NzExOTc2fQ.q_zTRNm9DZDqSqWKJmky4prnnya2j4SQwG9shyIpdtw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Clearing existing data...');
  const { error: delError } = await supabase.from('recommendations').delete().gte('id', 0);
  if (delError) { console.error('Delete error:', delError.message); process.exit(1); }
  console.log('Cleared.');

  const csv = fs.readFileSync('recommendations_categorized.csv', 'utf8');
  const records = parse(csv, { columns: true, skip_empty_lines: true });
  console.log(`Uploading ${records.length} records...`);

  let success = 0, errors = 0;
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
    if (error) { console.error(`\nBatch error:`, error.message); errors += batch.length; }
    else { success += batch.length; }
    process.stdout.write(`\r${success + errors}/${records.length} (${success} ok, ${errors} errors)`);
  }
  console.log(`\nDone! ${success} uploaded, ${errors} errors.`);
}

run();
