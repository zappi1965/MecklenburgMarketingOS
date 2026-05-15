
const express=require('express')
const multer=require('multer')
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024}})
function storageRoutes(storageService){
 const router=express.Router()
 router.post('/upload',upload.single('file'),async(req,res,next)=>{try{const data=await storageService.upload({customer_id:req.body.customer_id,file_type:req.body.file_type||'documents',ref_table:req.body.ref_table||null,ref_id:req.body.ref_id||null,file:req.file});res.json({ok:true,data})}catch(e){next(e)}})
 router.get('/customer/:customer_id',async(req,res,next)=>{try{res.json({ok:true,data:await storageService.list(req.params.customer_id)})}catch(e){next(e)}})
 router.post('/signed-url',async(req,res,next)=>{try{res.json({ok:true,data:await storageService.signedUrl(req.body)})}catch(e){next(e)}})
 return router
}
module.exports=storageRoutes
