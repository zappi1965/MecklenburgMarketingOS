export default function WhatsAppCenter(){
  return (
    <div>
      <h1>WhatsApp Automationen</h1>

      <div className="card">
        <h3>Bewertungsanfrage</h3>

        <textarea
          className="input"
          placeholder="Nachricht"
          defaultValue="Vielen Dank für deinen Besuch. Bitte bewerte uns."
        />

        <button className="btn">
          Kampagne senden
        </button>
      </div>
    </div>
  )
}