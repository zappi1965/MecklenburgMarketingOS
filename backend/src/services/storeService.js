const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
const { writeCriticalAudit } = require('./criticalAuditService')
const ALLOWLIST = {
  landing_page_settings:{scope:'admin'}, public_landing_pages:{scope:'admin'}, user_profiles:{scope:'admin'}, customer_users:{scope:'admin'}, customer_invites:{scope:'admin'}, customer_registrations:{scope:'admin'}, oauth_tokens:{scope:'admin'},
  qr_campaigns:{scope:'customer'}, loyalty_programs:{scope:'customer'}, loyalty_rewards:{scope:'customer'}, loyalty_reward_rules:{scope:'customer'}, loyalty_security_settings:{scope:'customer'}, staff_codes:{scope:'customer'},
  customer_notes:{scope:'customer'}, customer_files:{scope:'customer_readonly'}, customer_service_categories:{scope:'customer'}, ticket_messages:{scope:'customer'}, customer_seo_metrics:{scope:'customer_readonly'}, review_funnel_stats:{scope:'customer_readonly'}, invoices:{scope:'customer_readonly'}, review_feedback:{scope:'customer'}, social_posts:{scope:'customer_readonly'},
  sales_workflows:{scope:'admin'}, sales_workflow_events:{scope:'admin'}, sales_workflow_documents:{scope:'admin'}, production_health_checks:{scope:'admin'}, production_smoke_tests:{scope:'admin'}, customer_access_audits:{scope:'admin'}, admin_action_logs:{scope:'admin'}, production_readiness_checks:{scope:'admin'}, backup_runs:{scope:'admin'}, workflow_rules:{scope:'admin'}, automations:{scope:'admin'}, acquisition_campaigns:{scope:'admin'}, prospect_leads:{scope:'admin'}, generated_offers:{scope:'customer_readonly'}, generated_contracts:{scope:'customer_readonly'}, mini_audits:{scope:'admin'}, google_business_audits:{scope:'customer_readonly'}, competitor_benchmarks:{scope:'customer_readonly'}, seo_snapshots:{scope:'customer_readonly'},
  dunning_cases:{scope:'customer_readonly'}, retention_intelligence:{scope:'admin'}, consent_center:{scope:'admin'}, segment_campaigns:{scope:'admin'}, churn_prevention:{scope:'admin'}, sumup_revenue_connection:{scope:'admin'}, customer_health_scores:{scope:'customer_readonly'}, monthly_reports:{scope:'customer_readonly'}, onboarding_checklists:{scope:'customer_readonly'}, approval_requests:{scope:'customer'}, output_documents:{scope:'customer_readonly'}, dsar_requests:{scope:'customer'}, loyalty_member_security_scores:{scope:'customer_readonly'},
  knowledge_articles:{scope:'admin'}, api_usage_cache:{scope:'admin'}, data_integrity_checks:{scope:'admin'}, security_events:{scope:'admin'}, activity_logs:{scope:'admin'}, integrations:{scope:'customer_readonly'},
  tickets:{scope:'customer'}, offers:{scope:'customer_readonly'}, customer_clients:{scope:'customer'}, notifications:{scope:'customer'}, package_requests:{scope:'customer'}, client_success_events:{scope:'customer_readonly'}, loyalty_customers:{scope:'customer_readonly'}, loyalty_transactions:{scope:'customer_readonly'}, loyalty_reward_redemptions:{scope:'customer_readonly'}, customer_tool_access:{scope:'customer_readonly'}, customer_reactivation_settings:{scope:'customer'}, customer_reactivation_links:{scope:'customer'}, customer_reactivation_events:{scope:'customer_readonly'}, v47_tool_access_rules:{scope:'customer_readonly'},
  customers:{scope:'admin'}, customer_subscriptions:{scope:'admin'}, workflow_runs:{scope:'admin'}, demo_customers:{scope:'admin'}, demo_invoices:{scope:'admin'}, demo_contracts:{scope:'admin'}, demo_notes:{scope:'admin'}, demo_appointments:{scope:'admin'}, demo_files:{scope:'admin'}, demo_notifications:{scope:'admin'}, demo_workflow_runs:{scope:'admin'}, demo_qr_campaigns:{scope:'admin'}, demo_mail_jobs:{scope:'admin'},
  booking_services:{scope:'customer_readonly'}, booking_resources:{scope:'customer_readonly'}, booking_resource_services:{scope:'admin'}, booking_business_hours:{scope:'customer_readonly'}, booking_blackouts:{scope:'customer_readonly'}, booking_settings:{scope:'customer_readonly'}, appointments:{scope:'customer_readonly'}
}
const TABLES = Object.keys(ALLOWLIST)
const CRITICAL_TABLES = new Set(['qr_campaigns','loyalty_programs','loyalty_rewards','loyalty_reward_rules','staff_codes','customer_tool_access','invoices','output_documents','customer_files','user_profiles','customer_users','dsar_requests'])

const UUID_LIKE_FIELDS = new Set(['id','customer_id','workflow_id','source_id','audit_id','ticket_id','auth_user_id','user_id','converted_customer_id','target_customer_id','related_customer_id','owner_customer_id','client_customer_id','qr_campaign_id'])
function isBlankUuidValue(v){return v === '' || (typeof v === 'string' && v.trim() === '')}
function sanitizeUuidPayload(row={}){
  const payload={...(row||{})}
  for(const key of Object.keys(payload)){
    const k=String(key)
    if(UUID_LIKE_FIELDS.has(k) || k.endsWith('_id')){
      if(isBlankUuidValue(payload[key])) payload[key]=null
    }
  }
  return payload
}
function sanitizeListQuery(query={}){
  const next={...(query||{})}
  for(const key of Object.keys(next)){
    if(isBlankUuidValue(next[key])) delete next[key]
  }
  return next
}
function sanitizeLandingPageSettingsPayload(row={}, mode='full'){
  const payload={...(row||{})}
  if(payload.packages && typeof payload.packages !== 'object'){
    try{payload.packages=JSON.parse(payload.packages)}catch(_){payload.packages={}}
  }
  if(mode==='packages_only'){
    const safe={}
    if(payload.id!=null)safe.id=payload.id
    if(payload.scope!=null)safe.scope=payload.scope
    if(payload.packages!=null)safe.packages=payload.packages
    if(payload.updated_at!=null)safe.updated_at=payload.updated_at
    return safe
  }
  return payload
}
function stripMissingColumnFromPayload(payload,error){
  const msg=String(error?.message||error?.details||error?.hint||'')
  const m=msg.match(/'([^']+)' column/i)||msg.match(/column "([^"]+)"/i)
  if(!m)return null
  const col=m[1]
  if(!col||!(col in payload))return null
  const next={...payload}
  delete next[col]
  return next
}
const CUSTOMER_CASCADE_TABLES = [
  'loyalty_reward_redemptions','loyalty_transactions','loyalty_member_security_scores','security_events','loyalty_customers','loyalty_rewards','loyalty_reward_rules','staff_codes','loyalty_programs','public_landing_pages','qr_campaigns','review_feedback',
  'monthly_reports','output_documents','approval_requests','onboarding_checklists','customer_files','invoices','tickets','ticket_messages','appointments','customer_clients','offers','workflow_runs','activity_logs','integrations','oauth_tokens','seo_snapshots','notifications',
  'customer_notes','customer_service_categories','customer_seo_metrics','review_funnel_stats','client_success_events','competitor_benchmarks','google_business_audits','mini_audits','prospect_leads','generated_offers','generated_contracts','dunning_cases','customer_health_scores','acquisition_campaigns',
  'sales_workflow_documents','sales_workflow_events','sales_workflows','customer_reactivation_events','customer_reactivation_links','customer_reactivation_settings','customer_tool_access','customer_invites','customer_registrations','customer_users','customer_subscriptions'
]
async function safeDeleteByCustomerId(supabase,table,customerId){
  try{
    const { error } = await supabase.from(table).delete().eq('customer_id', String(customerId))
    if(error && !isMissingColumnError(error,['customer_id'])) return false
    return !error
  }catch(_){return false}
}
async function cascadeDeleteCustomerRows(supabase,customerId){
  for(const t of CUSTOMER_CASCADE_TABLES){ await safeDeleteByCustomerId(supabase,t,customerId) }
}
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
  customer_tool_access:'packages',
  customer_reactivation_settings:'Rückholaktionen',
  customer_reactivation_links:'Rückholaktionen',
  customer_reactivation_events:'Rückholaktionen',
  retention_intelligence:'retention_intelligence',
  consent_center:'consent_center',
  segment_campaigns:'segment_campaigns',
  churn_prevention:'churn_prevention',
  sumup_revenue_connection:'sumup_revenue_connection',
  sales_workflows:'sales_workflow',
  sales_workflow_events:'sales_workflow',
  sales_workflow_documents:'sales_workflow',
  production_health_checks:'production_health',
  production_smoke_tests:'smoke_test',
  admin_action_logs:'action_log',
  customer_access_audits:'security_center',
  production_readiness_checks:'production_readiness',
  backup_runs:'production_readiness'
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
function isDeletedOrArchivedRow(row){const status=String(row?.status||'').toLowerCase();return row?.is_deleted===true||row?.deleted===true||row?.archived===true||Boolean(row?.deleted_at||row?.archived_at||row?.removed_at)||['deleted','gelöscht','geloescht','archived','archiviert','removed'].includes(status)}
async function insertWithTimestampRetry(supabase,table,payload){let result=await supabase.from(table).insert(payload).select('*').maybeSingle();if(!result.error)return result;if(String(table).toLowerCase()==='landing_page_settings'){let fallback=stripMissingColumnFromPayload(payload,result.error)||sanitizeLandingPageSettingsPayload(payload,'packages_only');result=await supabase.from(table).insert(fallback).select('*').maybeSingle();if(!result.error)return result}if(isMissingColumnError(result.error,['updated_at','created_at'])){const fallback={...payload};delete fallback.updated_at;delete fallback.created_at;result=await supabase.from(table).insert(fallback).select('*').maybeSingle()}return result}
async function updateWithTimestampRetry(supabase,table,id,patch){let result=await supabase.from(table).update(patch).eq('id',id).select('*').maybeSingle();if(!result.error)return result;if(String(table).toLowerCase()==='landing_page_settings'){let fallback=stripMissingColumnFromPayload(patch,result.error)||sanitizeLandingPageSettingsPayload(patch,'packages_only');result=await supabase.from(table).update(fallback).eq('id',id).select('*').maybeSingle();if(!result.error)return result}if(isMissingColumnError(result.error,['updated_at'])){const fallback={...patch};delete fallback.updated_at;result=await supabase.from(table).update(fallback).eq('id',id).select('*').maybeSingle()}return result}
async function authorizeWrite({supabase,table,row,user,userRole}){const cfg=tableConfig(table);if(!cfg)throw permissionError(`Tabelle '${table}' ist nicht erlaubt`);const isAdmin=userRole==='admin';if(cfg.scope==='admin'&&!isAdmin)throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`);if(isCustomerReadOnly(cfg)&&!isAdmin)throw permissionError(`Tabelle '${table}' ist fuer Kunden nur lesbar. Erstellung/Aenderung erfolgt intern.`);if(cfg.scope==='customer'&&!isAdmin){const customerId=row?.customer_id||row?.customerId;if(!customerId)throw badRequest('customer_id im Payload fehlt');const ok=await userHasCustomerAccess(supabase,user.id,customerId);if(!ok)throw permissionError('Kein Zugriff auf diesen Customer');await requireCustomerToolAccessIfMapped({supabase,table,customer_id:customerId,userRole})}}
async function listRows({table,query={},user,userRole}){query=sanitizeListQuery(query);const supabase=getSupabaseAdmin();if(!supabase)throw new Error('Supabase nicht konfiguriert');const cfg=tableConfig(table);if(!cfg)throw permissionError(`Tabelle '${table}' ist nicht erlaubt`);const isAdmin=userRole==='admin';if(cfg.scope==='admin'&&!isAdmin)throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`);if(isCustomerScoped(cfg)&&!isAdmin){const cid=query.customer_id;if(!cid)throw badRequest('customer_id Filter erforderlich');const ok=await userHasCustomerAccess(supabase,user.id,cid);if(!ok)throw permissionError('Kein Zugriff auf diesen Customer');await requireCustomerToolAccessIfMapped({supabase,table,customer_id:cid,userRole})}const limit=Math.min(1000,Number(query.limit)||200);let q=supabase.from(table).select('*').limit(limit);if(query.customer_id)q=q.eq('customer_id',String(query.customer_id));if(query.order_by)q=q.order(String(query.order_by),{ascending:query.order_dir!=='desc'});const{data,error}=await q;if(error)throw error;return (data||[]).filter((row)=>query.include_deleted==='true'||!isDeletedOrArchivedRow(row))}
async function getRow({table,id,user,userRole}){const supabase=getSupabaseAdmin();if(!supabase)throw new Error('Supabase nicht konfiguriert');const cfg=tableConfig(table);if(!cfg)throw permissionError(`Tabelle '${table}' ist nicht erlaubt`);if(!id)throw badRequest('id fehlt');const{data,error}=await supabase.from(table).select('*').eq('id',id).maybeSingle();if(error)throw error;if(!data||isDeletedOrArchivedRow(data))throw notFound('Datensatz nicht gefunden');if(cfg.scope==='admin'&&userRole!=='admin')throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`);if(isCustomerScoped(cfg)&&userRole!=='admin'){const ok=await userHasCustomerAccess(supabase,user.id,data.customer_id);if(!ok)throw permissionError('Kein Zugriff auf diesen Customer');await requireCustomerToolAccessIfMapped({supabase,table,customer_id:data.customer_id,userRole})}return data}
async function createRow({table,row,user,userRole}){row=sanitizeUuidPayload(row);if(String(table).toLowerCase()==='landing_page_settings')row=sanitizeLandingPageSettingsPayload(row);const supabase=getSupabaseAdmin();if(!supabase)throw new Error('Supabase nicht konfiguriert');await authorizeWrite({supabase,table,row,user,userRole});const payload={...row,updated_at:new Date().toISOString()};if(!payload.created_at)payload.created_at=new Date().toISOString();const{data,error}=await insertWithTimestampRetry(supabase,table,payload);if(error){if(isDuplicateKeyError(error)){const existing=await existingRowForDuplicate(supabase,table,payload);if(existing)return existing}throw error}if(CRITICAL_TABLES.has(String(table).toLowerCase()))await writeCriticalAudit(supabase,{user,userRole,customer_id:data?.customer_id||payload.customer_id,action:'create',entity_type:table,entity_id:data?.id||payload.id,after:data||payload,severity:'info'});return data}
async function updateRow({table,id,row,user,userRole}){row=sanitizeUuidPayload(row);if(String(table).toLowerCase()==='landing_page_settings')row=sanitizeLandingPageSettingsPayload(row);const supabase=getSupabaseAdmin();if(!supabase)throw new Error('Supabase nicht konfiguriert');if(!id)throw badRequest('id fehlt');const cfg=tableConfig(table);if(!cfg)throw permissionError(`Tabelle '${table}' ist nicht erlaubt`);if(isCustomerReadOnly(cfg)&&userRole!=='admin')throw permissionError(`Tabelle '${table}' ist fuer Kunden nur lesbar. Aenderung erfolgt intern.`);if(cfg.scope==='customer'&&userRole!=='admin'){const{data:existing}=await supabase.from(table).select('customer_id').eq('id',id).maybeSingle();if(!existing)throw notFound('Datensatz nicht gefunden');const ok=await userHasCustomerAccess(supabase,user.id,existing.customer_id);if(!ok)throw permissionError('Kein Zugriff auf diesen Customer');await requireCustomerToolAccessIfMapped({supabase,table,customer_id:existing.customer_id,userRole});if(row&&row.customer_id&&String(row.customer_id)!==String(existing.customer_id))throw permissionError('customer_id darf nicht umgehaengt werden')}else if(cfg.scope==='admin'&&userRole!=='admin')throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`);const patch={...row,updated_at:new Date().toISOString()};const{data,error}=await updateWithTimestampRetry(supabase,table,id,patch);if(error)throw error;if(!data)throw notFound('Datensatz nicht gefunden');if(CRITICAL_TABLES.has(String(table).toLowerCase()))await writeCriticalAudit(supabase,{user,userRole,customer_id:data?.customer_id||row?.customer_id,action:'update',entity_type:table,entity_id:id,after:data,severity:'info'});return data}
async function deleteRow({table,id,user,userRole}){const supabase=getSupabaseAdmin();if(!supabase)throw new Error('Supabase nicht konfiguriert');if(!id)throw badRequest('id fehlt');const cfg=tableConfig(table);if(!cfg)throw permissionError(`Tabelle '${table}' ist nicht erlaubt`);if(isCustomerReadOnly(cfg)&&userRole!=='admin')throw permissionError(`Tabelle '${table}' ist fuer Kunden nur lesbar. Loeschung erfolgt intern.`);let existing=null;if(cfg.scope==='customer'&&userRole!=='admin'){const{data}=await supabase.from(table).select('*').eq('id',id).maybeSingle();existing=data||null;if(!existing)throw notFound('Datensatz nicht gefunden');const ok=await userHasCustomerAccess(supabase,user.id,existing.customer_id);if(!ok)throw permissionError('Kein Zugriff auf diesen Customer');await requireCustomerToolAccessIfMapped({supabase,table,customer_id:existing.customer_id,userRole})}else if(cfg.scope==='admin'&&userRole!=='admin')throw permissionError(`Tabelle '${table}' erlaubt nur Admin-Zugriffe`);else{const found=await supabase.from(table).select('*').eq('id',id).maybeSingle();existing=found.data||null}if(String(table).toLowerCase()==='customers'&&userRole==='admin'){await cascadeDeleteCustomerRows(supabase,id)}const now=new Date().toISOString();let softDeleted=false;try{const patch={status:'deleted',is_deleted:true,deleted_at:now,updated_at:now};const{error}=await supabase.from(table).update(patch).eq('id',id);if(!error)softDeleted=true}catch(_){}if(!softDeleted){const{error}=await supabase.from(table).delete().eq('id',id);if(error)throw error}if(CRITICAL_TABLES.has(String(table).toLowerCase()))await writeCriticalAudit(supabase,{user,userRole,customer_id:existing?.customer_id,action:'delete',entity_type:table,entity_id:id,before:existing,after:{id,status:softDeleted?'deleted':'hard_deleted'},severity:'warning'});return{ok:true,soft_deleted:softDeleted}}
module.exports={ALLOWLIST,TABLES,tableConfig,listRows,getRow,createRow,updateRow,deleteRow,userHasCustomerAccess,userHasToolAccess,toolForTable,TABLE_TOOL_ACCESS_MAP}
