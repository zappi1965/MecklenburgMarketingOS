const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
const ALLOWLIST = {
  landing_page_settings:{scope:'admin'}, public_landing_pages:{scope:'admin'}, user_profiles:{scope:'admin'}, customer_users:{scope:'admin'}, customer_invites:{scope:'admin'}, customer_registrations:{scope:'admin'}, oauth_tokens:{scope:'admin'},
  qr_campaigns:{scope:'customer'}, loyalty_programs:{scope:'customer'}, loyalty_rewards:{scope:'customer'}, loyalty_reward_rules:{scope:'customer'}, loyalty_security_settings:{scope:'customer'}, staff_codes:{scope:'customer'},
  customer_notes:{scope:'customer'}, customer_files:{scope:'customer_readonly'}, customer_service_categories:{scope:'customer'}, ticket_messages:{scope:'customer'}, customer_seo_metrics:{scope:'customer_readonly'}, review_funnel_stats:{scope:'customer_readonly'}, invoices:{scope:'customer_readonly'}, review_feedback:{scope:'customer'}, social_posts:{scope:'customer_readonly'},
  workflow_rules:{scope:'admin'}, automations:{scope:'admin'}, acquisition_campaigns:{scope:'admin'}, prospect_leads:{scope:'admin'}, generated_offers:{scope:'customer_readonly'}, generated_contracts:{scope:'customer_readonly'}, mini_audits:{scope:'admin'}, google_business_audits:{scope:'customer_readonly'}, competitor_benchmarks:{scope:'customer_readonly'}, seo_snapshots:{scope:'customer_readonly'},
  dunning_cases:{scope:'customer_readonly'}, customer_health_scores:{scope:'customer_readonly'}, monthly_reports:{scope:'customer_readonly'}, onboarding_checklists:{scope:'customer_readonly'}, approval_requests:{scope:'customer'}, output_documents:{scope:'customer_readonly'}, dsar_requests:{scope:'customer'}, loyalty_member_security_scores:{scope:'customer_readonly'},
  knowledge_articles:{scope:'admin'}, api_usage_cache:{scope:'admin'}, data_integrity_checks:{scope:'admin'}, security_events:{scope:'admin'}, activity_logs:{scope:'admin'}, integrations:{scope:'customer_readonly'},
  tickets:{scope:'customer'}, offers:{scope:'customer_readonly'}, customer_clients:{scope:'customer'}, notifications:{scope:'customer'}, package_requests:{scope:'customer'}, client_success_events:{scope:'customer_readonly'}, loyalty_customers:{scope:'customer_readonly'}, loyalty_transactions:{scope:'customer_readonly'}, loyalty_reward_redemptions:{scope:'customer_readonly'}, customer_tool_access:{scope:'customer_readonly'}, v47_tool_access_rules:{scope:'customer_readonly'},
  customers:{scope:'admin'}, customer_subscriptions:{scope:'admin'}, workflow_runs:{scope:'admin'}, demo_customers:{scope:'admin'}, demo_invoices:{scope:'admin'}, demo_contracts:{scope:'admin'}, demo_notes:{scope:'admin'}, demo_appointments:{scope:'admin'}, demo_files:{scope:'admin'}, demo_notifications:{scope:'admin'}, demo_workflow_runs:{scope:'admin'}, demo_qr_campaigns:{scope:'admin'}, demo_mail_jobs:{scope:'admin'},
  booking_services:{scope:'customer_readonly'}, booking_resources:{scope:'customer_readonly'}, booking_resource_services:{scope:'admin'}, booking_business_hours:{scope:'customer_readonly'}, booking_blackouts:{scope:'customer_readonly'}, booking_settings:{scope:'customer_readonly'}, appointments:{scope:'customer_readonly'}
}
const TABLES = Object.keys(ALLOWLIST)
function tableConfig(table){return ALLOWLIST[String(table||'').toLowerCase()]||null}
function isCustomerScoped(cfg){return cfg?.scope==='customer'||cfg?.scope==='customer_readonly'}
function isCustomerReadOnly(cfg){return cfg?.scope==='customer_readonly'}
const TABLE_TOOL_ACCESS_MAP={
  invoices:'finance',
  customer_files:'media',
  output_documents:'reports',
  tickets:'tickets',
  ticket_messages:'tickets',
  appointments:'booking',
  monthly_reports:'reports',
  approval_requests:'approvals',
  qr_campaigns:'qr',
  public_landing_pages:'public_landing',
  loyalty_programs:'loyalty',
  loyalty_rewards:'loyalty_rewards',
  loyalty_reward_rules:'loyalty_rules',
  staff_codes:'staff_codes',
  review_feedback:'reviews',
  seo_snapshots:'seo',
  customer_seo_metrics:'seo',
  integrations:'integrations',
  customer_health_scores:'customer_health',
  package_requests:'packages',
  customer_tool_access:'packages'
}
function toolForTable(table){return TABLE_TOOL_ACCESS_MAP[String(table||'').toLowerCase()]||null}
async function userHasToolAccess(supabase,customer_id,tool_key){
  if(!customer_id||!tool_key)return true
  try{
    const{data}=await supabase.from('customer_tool_access').select('id, enabled').eq('customer_id',String(customer_id)).eq('tool_key',tool_key).eq('enabled',true).maybeSingle()
    return Boolean(data)
  }catch(_){
    return true
  }
}
async function requireCustomerToolAccessIfMapped({supabase,table,customer_id,userRole}){
  if(userRole==='admin')return
  const tool=toolForTable(table)
  if(!tool)return
  const ok=await userHasToolAccess(supabase,customer_id,tool)
  if(!ok)throw permissionError(`Tool '${tool}' ist für diesen Kunden nicht freigeschaltet`)
}
async function userHasCustomerAccess(supabase,user_id,customer_id){if(!customer_id)return false;try{const{data}=await supabase.from('customer_users').select('id, role, status').eq('auth_user_id',user_id).eq('customer_id',String(customer_id)).eq('status','active').maybeSingle();return Boolean(data)}catch(_){return false}}
function permissionError(message){const e=new Error(message);e.status=403;e.code='FORBIDDEN';return e}
function badRequest(message,code='BAD_REQUEST'){const e=new Error(message);e.status=400;e.code=code;return e}
function notFound(message){const e=new Error(message);e.status=404;e.code='NOT_FOUND';return e}
function isMissingColumnError(error,columnNames=[]){const msg=String(error?.message||error?.details||error?.hint||'').toLowerCase();const code=String(error?.code||'').toUpperCase();if(code==='PGRST204')return columnNames.some((c)=>msg.includes(String(c).toLowerCase()))||columnNames.length===0;if(!msg.includes('column')&&!msg.includes('schema cache')&&!msg.includes('could not find'))return false;return columnNames.some((c)=>msg.includes(String(c).toLowerCase()))}
function isDuplicateKeyError(error){const msg=String(error?.message||error?.details||'').toLowerCase();const code=String(error?.code||'').toUpperCase();return code==='23505'||msg.includes('duplicate key value')||msg.includes('violates unique constraint')}
async function existingRowForDuplicate(supabase,table,payload){if(!payload?.id)return null;try{const{data,error}=await supabase.from(table).select('*').eq('id',payload.id).maybeSingle();if(error)return null;if(data&&payload.customer_id&&data.customer_id&&String(data.customer_id)!==String(payload.customer_id))return null;return data||null}catch(_){return null}}
async function insertWithTimestampRetry(supabase,table,payload){let result=await supabase.from(table).insert(payload).select('*').maybeSingle();if(!result.error)return result;if(isMissingColumnError(result.error,['updated_at','created_at'])){const fallback={...payload};delete fallback.updated_at;delete fallback.created_at;result=await supabase.from(table).insert(fallback).select('*').maybeSingle()}return result}
async function updateWithTimestampRetry(supabase,table,id,patch){let result=await supabase.from(table).update(patch).eq('id',id).select('*').maybeSingle();if(!result.error)return result;if(isMissingColumnError(result.error,['updated_at'])){const fallback={...patch};delete fallback.updated_at;result=await supabase.from(table).update(fallback).eq('id',id).select('*').maybeSingle()}return result}
async function authorizeWrite({supabase,table,row,user,userRole}){const cfg=tableConfig(table);if(!cfg)throw permissionError(`Tabelle '${table}' ist nicht erlaubt`);const isAdmin=userRole==='admin';if(cfg.scope==='admin'&&!isAdmin)throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`);if(isCustomerReadOnly(cfg)&&!isAdmin)throw permissionError(`Tabelle '${table}' ist fuer Kunden nur lesbar. Erstellung/Aenderung erfolgt intern.`);if(cfg.scope==='customer'&&!isAdmin){const customerId=row?.customer_id||row?.customerId;if(!customerId)throw badRequest('customer_id im Payload fehlt');const ok=await userHasCustomerAccess(supabase,user.id,customerId);if(!ok)throw permissionError('Kein Zugriff auf diesen Customer');await requireCustomerToolAccessIfMapped({supabase,table,customer_id:customerId,userRole})}}
async function listRows({table,query={},user,userRole}){const supabase=getSupabaseAdmin();if(!supabase)throw new Error('Supabase nicht konfiguriert');const cfg=tableConfig(table);if(!cfg)throw permissionError(`Tabelle '${table}' ist nicht erlaubt`);const isAdmin=userRole==='admin';if(cfg.scope==='admin'&&!isAdmin)throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`);if(isCustomerScoped(cfg)&&!isAdmin){const cid=query.customer_id;if(!cid)throw badRequest('customer_id Filter erforderlich');const ok=await userHasCustomerAccess(supabase,user.id,cid);if(!ok)throw permissionError('Kein Zugriff auf diesen Customer');await requireCustomerToolAccessIfMapped({supabase,table,customer_id:cid,userRole})}const limit=Math.min(1000,Number(query.limit)||200);let q=supabase.from(table).select('*').limit(limit);if(query.customer_id)q=q.eq('customer_id',String(query.customer_id));if(query.order_by)q=q.order(String(query.order_by),{ascending:query.order_dir!=='desc'});const{data,error}=await q;if(error)throw error;return data||[]}
async function getRow({table,id,user,userRole}){const supabase=getSupabaseAdmin();if(!supabase)throw new Error('Supabase nicht konfiguriert');const cfg=tableConfig(table);if(!cfg)throw permissionError(`Tabelle '${table}' ist nicht erlaubt`);if(!id)throw badRequest('id fehlt');const{data,error}=await supabase.from(table).select('*').eq('id',id).maybeSingle();if(error)throw error;if(!data)throw notFound('Datensatz nicht gefunden');if(cfg.scope==='admin'&&userRole!=='admin')throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`);if(isCustomerScoped(cfg)&&userRole!=='admin'){const ok=await userHasCustomerAccess(supabase,user.id,data.customer_id);if(!ok)throw permissionError('Kein Zugriff auf diesen Customer');await requireCustomerToolAccessIfMapped({supabase,table,customer_id:data.customer_id,userRole})}return data}
async function createRow({table,row,user,userRole}){const supabase=getSupabaseAdmin();if(!supabase)throw new Error('Supabase nicht konfiguriert');await authorizeWrite({supabase,table,row,user,userRole});const payload={...row,updated_at:new Date().toISOString()};if(!payload.created_at)payload.created_at=new Date().toISOString();const{data,error}=await insertWithTimestampRetry(supabase,table,payload);if(error){if(isDuplicateKeyError(error)){const existing=await existingRowForDuplicate(supabase,table,payload);if(existing)return existing}throw error}return data}
async function updateRow({table,id,row,user,userRole}){const supabase=getSupabaseAdmin();if(!supabase)throw new Error('Supabase nicht konfiguriert');if(!id)throw badRequest('id fehlt');const cfg=tableConfig(table);if(!cfg)throw permissionError(`Tabelle '${table}' ist nicht erlaubt`);if(isCustomerReadOnly(cfg)&&userRole!=='admin')throw permissionError(`Tabelle '${table}' ist fuer Kunden nur lesbar. Aenderung erfolgt intern.`);if(cfg.scope==='customer'&&userRole!=='admin'){const{data:existing}=await supabase.from(table).select('customer_id').eq('id',id).maybeSingle();if(!existing)throw notFound('Datensatz nicht gefunden');const ok=await userHasCustomerAccess(supabase,user.id,existing.customer_id);if(!ok)throw permissionError('Kein Zugriff auf diesen Customer');await requireCustomerToolAccessIfMapped({supabase,table,customer_id:existing.customer_id,userRole});if(row&&row.customer_id&&String(row.customer_id)!==String(existing.customer_id))throw permissionError('customer_id darf nicht umgehaengt werden')}else if(cfg.scope==='admin'&&userRole!=='admin')throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`);const patch={...row,updated_at:new Date().toISOString()};const{data,error}=await updateWithTimestampRetry(supabase,table,id,patch);if(error)throw error;if(!data)throw notFound('Datensatz nicht gefunden');return data}
async function deleteRow({table,id,user,userRole}){const supabase=getSupabaseAdmin();if(!supabase)throw new Error('Supabase nicht konfiguriert');if(!id)throw badRequest('id fehlt');const cfg=tableConfig(table);if(!cfg)throw permissionError(`Tabelle '${table}' ist nicht erlaubt`);if(isCustomerReadOnly(cfg)&&userRole!=='admin')throw permissionError(`Tabelle '${table}' ist fuer Kunden nur lesbar. Loeschung erfolgt intern.`);if(cfg.scope==='customer'&&userRole!=='admin'){const{data:existing}=await supabase.from(table).select('customer_id').eq('id',id).maybeSingle();if(!existing)throw notFound('Datensatz nicht gefunden');const ok=await userHasCustomerAccess(supabase,user.id,existing.customer_id);if(!ok)throw permissionError('Kein Zugriff auf diesen Customer');await requireCustomerToolAccessIfMapped({supabase,table,customer_id:existing.customer_id,userRole})}else if(cfg.scope==='admin'&&userRole!=='admin')throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`);const{error}=await supabase.from(table).delete().eq('id',id);if(error)throw error;return{ok:true}}
module.exports={ALLOWLIST,TABLES,tableConfig,listRows,getRow,createRow,updateRow,deleteRow,userHasCustomerAccess,userHasToolAccess,toolForTable,TABLE_TOOL_ACCESS_MAP}
