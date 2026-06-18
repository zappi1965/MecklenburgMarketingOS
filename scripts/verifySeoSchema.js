#!/usr/bin/env node
// Prueft, ob alle vom SEO-Autopilot erwarteten Tabellen/Spalten in Supabase
// vorhanden sind (nach dem Einspielen von SQL_V43_01 .. SQL_V43_06).
//
// Nutzung:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/verifySeoSchema.js
//
// Exit-Code 0 = alles vorhanden, 1 = etwas fehlt / nicht pruefbar.

const EXPECTED = {
  seo_brand_profiles: ['customer_id', 'audience', 'tone', 'topics', 'value_props', 'language', 'blog_slug'],
  seo_keyword_targets: ['customer_id', 'keyword', 'intent', 'priority', 'search_volume', 'difficulty', 'cpc', 'data_provider'],
  seo_articles: ['customer_id', 'title', 'slug', 'meta_description', 'body_markdown', 'status', 'published_url', 'cover_image_url', 'is_refinement', 'source_article_id'],
  seo_publishing_schedules: ['customer_id', 'enabled', 'cadence', 'auto_publish', 'target_type', 'target_config', 'next_run_at'],
  seo_article_metrics: ['article_id', 'customer_id', 'metric_date', 'impressions', 'clicks', 'position', 'ctr', 'source']
}

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.error('FEHLT: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY noetig.')
    process.exit(1)
  }
  let createClient
  try { ({ createClient } = require('@supabase/supabase-js')) }
  catch { console.error('FEHLT: @supabase/supabase-js (im backend/ ausfuehren: cd backend && node ../scripts/verifySeoSchema.js)'); process.exit(1) }

  const db = createClient(url, key)
  let missing = 0

  for (const [table, cols] of Object.entries(EXPECTED)) {
    // Ein leerer Select mit allen Spalten schlaegt fehl, wenn Tabelle/Spalte fehlt.
    const { error } = await db.from(table).select(cols.join(','), { head: true, count: 'exact' }).limit(1)
    if (error) {
      console.error(`✗ ${table}: ${error.message}`)
      missing++
    } else {
      console.log(`✓ ${table} (${cols.length} Spalten ok)`)
    }
  }

  if (missing) {
    console.error(`\n${missing} Tabelle(n) fehlerhaft – fehlende Migration(en) SQL_V43_01..06 einspielen.`)
    process.exit(1)
  }
  console.log('\nAlle SEO-Autopilot-Tabellen und -Spalten vorhanden.')
  process.exit(0)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
