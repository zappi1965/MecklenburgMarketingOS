
const { createClient } = require("@supabase/supabase-js");
const jsonDb = require("./db");

const useSupabase = process.env.DB_MODE === "supabase" && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = useSupabase
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })
  : null;

function camelClient(row) {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerEmail: row.owner_email || row.ownerEmail,
    demoRevenue: row.demo_revenue || row.demoRevenue || 0,
    subscriptionStatus: row.subscription_status || row.subscriptionStatus || "trial",
    googleReviewLink: row.google_review_link || row.googleReviewLink,
    modules: row.modules || {},
    createdAt: row.created_at || row.createdAt
  };
}

async function list(table) {
  if (!supabase) return jsonDb.read()[table] || [];
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return table === "clients" ? data.map(camelClient) : data;
}

async function findClientBySlug(slug) {
  if (!supabase) return jsonDb.read().clients.find(c => c.slug === slug);
  const { data, error } = await supabase.from("clients").select("*").eq("slug", slug).single();
  if (error) return null;
  return camelClient(data);
}

async function insert(table, item) {
  if (!supabase) {
    const db = jsonDb.read();
    db[table] = db[table] || [];
    db[table].push(item);
    jsonDb.write(db);
    return item;
  }
  const payload = normalizeForSupabase(table, item);
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function patch(table, id, patch) {
  if (!supabase) {
    const db = jsonDb.read();
    const row = (db[table] || []).find(x => x.id === id);
    if (row) Object.assign(row, patch, { updatedAt: new Date().toISOString() });
    jsonDb.write(db);
    return row;
  }
  const { data, error } = await supabase.from(table).update(normalizeForSupabase(table, patch)).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

async function remove(table, id) {
  if (!supabase) {
    const db = jsonDb.read();
    db[table] = (db[table] || []).filter(x => x.id !== id);
    jsonDb.write(db);
    return { ok: true };
  }
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
}

function normalizeForSupabase(table, item) {
  const x = { ...item };
  if (x.clientId) { x.client_id = x.clientId; delete x.clientId; }
  if (x.ownerEmail) { x.owner_email = x.ownerEmail; delete x.ownerEmail; }
  if (x.googleReviewLink) { x.google_review_link = x.googleReviewLink; delete x.googleReviewLink; }
  if (x.subscriptionStatus) { x.subscription_status = x.subscriptionStatus; delete x.subscriptionStatus; }
  if (x.demoRevenue) { x.demo_revenue = x.demoRevenue; delete x.demoRevenue; }
  if (x.createdAt) { x.created_at = x.createdAt; delete x.createdAt; }
  if (x.updatedAt) { x.updated_at = x.updatedAt; delete x.updatedAt; }
  return x;
}

module.exports = { supabase, useSupabase, list, insert, patch, remove, findClientBySlug };
