const express = require('express')
const router = express.Router()

router.post('/create-checkout-session', async(req,res)=>{
  res.json({
    success:true,
    checkoutUrl:'https://checkout.stripe.com/dummy'
  })
})

module.exports = router