import { useEffect, useState } from 'react'

export default function DarkModeToggle(){
  const [dark, setDark] = useState(false)

  useEffect(()=>{
    document.body.classList.toggle('darkmode', dark)
  }, [dark])

  return (
    <button className="darkToggle" onClick={()=>setDark(!dark)}>
      {dark ? '☀️' : '🌙'}
    </button>
  )
}