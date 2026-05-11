
export default function Toast({message,type='success'}){
  return (
    <div
      style={{
        position:'fixed',
        top:20,
        right:20,
        background:type==='success'?'#16a34a':'#ef4444',
        color:'white',
        padding:'14px 18px',
        borderRadius:14,
        zIndex:9999
      }}
    >
      {message}
    </div>
  )
}
