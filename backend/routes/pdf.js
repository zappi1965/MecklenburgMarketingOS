const express = require('express')
const router = express.Router()

router.post('/invoice', async(req,res)=>{
  res.json({
    success:true,
    pdf:'/pdfs/invoice-demo.pdf'
  })
})

module.exports = router