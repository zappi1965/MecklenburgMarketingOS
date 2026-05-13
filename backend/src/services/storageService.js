
const BUCKETS={invoices:'invoices',contracts:'contracts',media:'media',reports:'reports',documents:'documents'}
function safeFileName(name='file'){return String(name).replace(/[^\w.\-äöüÄÖÜß ]+/g,'').replace(/\s+/g,'_').slice(0,140)}
class StorageService{
 constructor(supabase){this.supabase=supabase}
 bucket(t='documents'){return BUCKETS[t]||'documents'}
 folder(t='documents'){return t==='invoices'?'rechnungen':t==='contracts'?'vertraege':t==='reports'?'reports':t==='media'?'media':'dokumente'}
 async upload({customer_id,file_type='documents',ref_table=null,ref_id=null,file}) {
  if(!customer_id)throw new Error('customer_id fehlt'); if(!file)throw new Error('Datei fehlt')
  const bucket=this.bucket(file_type), folder=this.folder(file_type), date=new Date().toISOString().slice(0,10)
  const storage_path=`${customer_id}/${folder}/${date}/${Date.now()}_${safeFileName(file.originalname)}`
  const {error:upErr}=await this.supabase.storage.from(bucket).upload(storage_path,file.buffer,{contentType:file.mimetype||'application/octet-stream',upsert:false})
  if(upErr)throw upErr
  const {data:signed,error:sigErr}=await this.supabase.storage.from(bucket).createSignedUrl(storage_path,3600)
  if(sigErr)throw sigErr
  const {data:prev}=await this.supabase.from('file_versions').select('version').eq('customer_id',customer_id).eq('original_name',file.originalname).order('version',{ascending:false}).limit(1)
  const version=prev?.[0]?.version?Number(prev[0].version)+1:1
  const metadata={customer_id,name:file.originalname,original_name:file.originalname,file_type,bucket,storage_path,mime_type:file.mimetype,size_bytes:file.size,ref_table,ref_id,version,url:signed.signedUrl,actor_name:'DominiqueMM'}
  const {data,error}=await this.supabase.from('customer_files').insert(metadata).select().single()
  if(error)throw error
  await this.supabase.from('file_versions').insert({customer_id,file_id:data.id,original_name:file.originalname,name:file.originalname,bucket,storage_path,mime_type:file.mimetype,size_bytes:file.size,version,ref_table,ref_id,signed_url:signed.signedUrl}).catch(()=>null)
  return data
 }
 async list(customer_id){const {data,error}=await this.supabase.from('customer_files').select('*').eq('customer_id',customer_id).order('created_at',{ascending:false});if(error)throw error;return data||[]}
 async signedUrl(body){const {data,error}=await this.supabase.storage.from(body.bucket).createSignedUrl(body.storage_path,Number(body.expires_in)||3600);if(error)throw error;return data}
}
module.exports=StorageService
