
'use client'

export default function BrandHero(){
  return (
    <section className="card hero-gradient" style={{
      padding:'28px',
      marginBottom:'18px',
      position:'relative'
    }}>
      <div style={{position:'relative',zIndex:2}}>
        <div className="badge purple" style={{marginBottom:'10px'}}>MMOS Enterprise Suite</div>
        <h1 style={{
          margin:0,
          fontSize:'clamp(36px,5vw,64px)',
          lineHeight:.92
        }}>
          Intelligent Business<br/>Operations Platform
        </h1>
        <p className="sub" style={{
          maxWidth:'780px',
          marginTop:'14px',
          fontSize:'15px'
        }}>
          Unified CRM, KPI Intelligence, Workflow Automation, Billing, SEO, Analytics and Enterprise Operations in one platform.
        </p>
      </div>
    </section>
  )
}
