
'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="landing">
      <section className="card" style={{ maxWidth: 720, margin: '80px auto' }}>
        <h1>Etwas ist schiefgelaufen</h1>
        <p className="sub">{error.message}</p>
        <button className="btn" onClick={reset}>Erneut versuchen</button>
      </section>
    </main>
  )
}
