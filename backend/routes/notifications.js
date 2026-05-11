const express = require('express')
const router = express.Router()

router.get('/', async(req,res)=>{
  res.json([
    {
      title:'Neue negative Bewertung',
      body:'Friseur Profi hat eine 2 Sterne Bewertung erhalten.'
    }
  ])
})

module.exports = router