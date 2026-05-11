const express = require('express')
const router = express.Router()

router.post('/send', async(req,res)=>{
  // Hier später Twilio oder Meta API
  res.json({
    success:true,
    status:'queued'
  })
})

module.exports = router