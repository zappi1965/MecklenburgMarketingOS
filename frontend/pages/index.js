import React from "react";
import { useEffect, useState } from "react";

const tools = [
  ["dashboard", "Dashboard", "⌂"],
  ["clients", "Kunden", "♙"],
  ["employees", "Mitarbeiter", "👥"],
  ["lead-scraper", "Lead Scraper", "🔎"],
  ["crm", "CRM", "▣"],
  ["outreach", "Cold Outreach", "✉"],
  ["reviews", "Reviews", "☆"],
  ["reputation", "Reputation Shield", "🛡"],
  ["booking", "Booking", "▦"],
  ["social", "Social Scheduler", "📅"],
  ["chatbot", "Chatbot", "◎"],
  ["whatsapp", "WhatsApp", "◉"],
  ["seo", "SEO", "⌘"],
  ["websites", "Webseiten", "▤"],
  ["analytics", "Analytics", "↗"],
  ["reports", "Reporting", "▥"],
  ["qr", "QR Kampagnen", "▦"],
  ["onboarding", "Onboarding", "✓"],
  ["sales-assistant", "AI Sales", "A"],
  ["proposals", "Angebote", "◫"],
  ["portal", "Kundenportal", "▧"],
  ["suite", "Local Suite", "★"],
  ["invoices", "Rechnungen", "€"],
  ["automations", "Automationen", "⚙"]
];

function Kpi({ icon, label, value, trend }) {
  return (
    <div className="card kpi">
      <div className="kpiIcon">{icon}</div>
      <div>
        <div className="kpiLabel">{label}</div>
        <div className="kpiValue">{value}</div>
        <div className="trend">{trend}</div>
      </div>
    </div>
  );
}

function Shell({ active, children }) {
  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="logo">M</div>
          <div>
            <b>MECKLENBURG</b><br />
            <span className="sideMuted">MARKETING OS</span>
          </div>
        </div>

        <div className="navTitle">Admin Tools</div>
        <nav className="nav">
          {tools.map(([key, label, icon]) => (
            <a key={key} className={active === key ? "active" : ""} href={`/?tool=${key}`}>
              <span>{icon}</span>
              {label}
            </a>
          ))}
        </nav>

        <div className="sideFooter">
          <a href="/review/friseur-profi">Review Demo</a>
          <a href="/client/friseur-profi/dashboard">Kundenansicht</a>
        </div>
      </aside>

      <main className="main">
        <div className="top">
          <input className="search" placeholder="Suche nach Kunden, Leads, Kampagnen..." />
          <div className="actions">
            <a className="btn secondary" href="/client/friseur-profi/dashboard">Kundenansicht</a>
            <a className="btn" href="/review/friseur-profi">Review Demo</a>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

function Head({ title, sub, action }) {
  return (
    <div className="head">
      <div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {action}
    </div>
  );
}

export default function Home() {
  const [tool, setTool] = useState("dashboard");

  useEffect(() => {
    const current = new URLSearchParams(window.location.search).get("tool");
    if (current) setTool(current);
  }, []);

  return (
    <Shell active={tool}>
      <Tool tool={tool} />
    </Shell>
  );
}

function Tool({ tool }) {
  const titles = {
    dashboard: "Dashboard",
    clients: "Kundenverwaltung",
    employees: "Mitarbeiter",
    crm: "CRM Pipeline",
    reviews: "Reviews Übersicht",
    booking: "Booking Kalender",
    social: "Social Media Scheduler",
    outreach: "Cold Outreach",
    reputation: "Reputation Shield",
    reports: "Reporting Generator",
    qr: "QR Code Kampagnen",
    onboarding: "Kunden Onboarding",
    "sales-assistant": "AI Sales Assistant",
    proposals: "Angebotssoftware",
    portal: "Kundenportal",
    suite: "Full Local Business Suite",
    whatsapp: "WhatsApp",
    seo: "SEO Dashboard",
    websites: "Webseiten",
    analytics: "Analytics",
    invoices: "Rechnungen",
    automations: "Automationen",
    chatbot: "Chatbot",
    "lead-scraper": "Lead Scraper"
  };

  if (tool === "dashboard") return <Dashboard />;
  if (tool === "crm") return <CRM />;
  if (tool === "booking") return <Booking />;
  if (tool === "reviews") return <Reviews />;
  if (tool === "whatsapp") return <WhatsApp />;
  if (tool === "qr") return <QR />;
  if (tool === "automations" || tool === "chatbot") return <Flow title={titles[tool]} />;
  if (tool === "suite") return <Suite />;
  if (tool === "portal") return <Portal />;
  return <Generic title={titles[tool] || tool} />;
}

function Dashboard() {
  return (
    <>
      <Head title="Dashboard" sub="Admin-Übersicht für alle Kunden und Tools" action={<button className="btn">＋ Neuer Kunde</button>} />
      <div className="grid">
        <Kpi icon="€" label="Monatsumsatz" value="12.450€" trend="+12,5%" />
        <Kpi icon="👥" label="Leads" value="324" trend="+24,3%" />
        <Kpi icon="★" label="Reviews" value="4.8" trend="+0,3" />
        <Kpi icon="▣" label="Aktive Module" value="24" trend="alle aktiv" />
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Umsatzentwicklung</h2>
          <div className="chart"><div className="line" /></div>
        </div>
        <div className="card">
          <h2>Kanalverteilung</h2>
          <div className="donut" />
          <p className="muted">Google 45%, Website 25%, Social 20%, Referral 10%</p>
        </div>
      </div>

      <div className="card">
        <h2>Alle Tools</h2>
        <div className="landingGrid">
          {tools.map(([key, label, icon]) => (
            <a className="card toolCard" key={key} href={`/?tool=${key}`}>
              <b>{icon} {label}</b>
              <p className="muted small">Dummy-Funktion aktiv</p>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

function CRM() {
  const stages = ["Neu", "Kontakt", "Angebot", "Verhandlung", "Gewonnen"];
  return (
    <>
      <Head title="CRM Pipeline" sub="Leads und Deals verwalten" action={<button className="btn">＋ Lead erstellen</button>} />
      <div className="pipeline">
        {stages.map((stage, idx) => (
          <div className="lane" key={stage}>
            <div className="laneHead"><span>{stage}</span><span>{idx + 1}</span></div>
            {["Autohaus Schmidt", "Restaurant Hafenblick", "Salon Schönhaar"].slice(0, (idx % 3) + 1).map((deal, i) => (
              <div className="deal" key={deal}>
                <b>{deal}</b>
                <p className="muted">Kontaktperson #{i + 1}</p>
                <b>{(i + 1) * 990}€</b><br />
                <span className="badge warn">Hoch</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function Reviews() {
  return (
    <>
      <Head title="Reviews Übersicht" sub="Bewertungen, Antworten und Reputation" action={<button className="btn">Review anfordern</button>} />
      <div className="grid">
        <Kpi icon="☆" label="Durchschnitt" value="4.8" trend="+0.2" />
        <Kpi icon="💬" label="Bewertungen" value="128" trend="+18" />
        <Kpi icon="↩" label="Antwortquote" value="89%" trend="+12%" />
      </div>
      <div className="grid2">
        <div className="card">
          <h2>Neue Bewertungen</h2>
          <table className="table">
            <tbody>
              {["Anna Müller: Super Service!", "Markus Becker: Lange Wartezeit", "Kevin Müller: Top Barber"].map((item, i) => (
                <tr key={item}>
                  <td>{item}</td>
                  <td><span className={i === 1 ? "badge warn" : "badge"}>{i === 1 ? "Intern" : "Google"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Bewertungsverteilung</h2>
          <div className="donut" />
        </div>
      </div>
    </>
  );
}

function Booking() {
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  return (
    <>
      <Head title="Booking Kalender" sub="Termine und Services planen" action={<button className="btn">＋ Termin</button>} />
      <div className="calendar">
        <div className="cell headCell" />
        {days.map(day => <div className="cell headCell" key={day}>{day}</div>)}
        {["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "16:00"].map((hour, row) => (
          <React.Fragment key={hour}>
            <div className="cell">{hour}</div>
            {days.map((day, col) => (
              <div className="cell" key={hour + day}>
                {(row + col) % 5 === 0 && <div className="event">Fade Cut<br /><b>Tim</b></div>}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

function WhatsApp() {
  return (
    <>
      <Head title="WhatsApp" sub="Nachrichten, Kontakte und Kampagnen" action={<button className="btn">Kampagne starten</button>} />
      <div className="grid">
        <Kpi icon="👥" label="Kontakte" value="1.248" trend="+32" />
        <Kpi icon="💬" label="Nachrichten" value="4.782" trend="+18%" />
        <Kpi icon="✓" label="Zugestellt" value="94%" trend="stabil" />
      </div>
      <div className="phone">
        <div className="phoneTop">Friseur Profi</div>
        <div className="bubble">Hallo, ich hätte gerne einen Termin.</div>
        <div className="bubble me">Gerne! Wann passt es Ihnen?</div>
        <div className="bubble">Morgen 14 Uhr?</div>
        <div className="bubble me">Ist gebucht ✅</div>
      </div>
    </>
  );
}

function QR() {
  return (
    <>
      <Head title="QR Code Kampagnen" sub="QR-Codes erzeugen und Scans tracken" action={<button className="btn">QR erstellen</button>} />
      <div className="grid">
        {["Review QR", "Coupon QR", "Landingpage QR"].map((item, i) => (
          <div className="card" key={item}>
            <h2>{item}</h2>
            <div className="qrMock" />
            <p><span className="badge">{(i + 1) * 42} Scans</span></p>
          </div>
        ))}
      </div>
    </>
  );
}

function Flow({ title }) {
  return (
    <>
      <Head title={title} sub="Workflow-Builder mit Dummy-Aktionen" />
      <div className="flow">
        <div className="node green" style={{ left: 40, top: 170 }}><b>Start</b><p>Trigger ausgelöst</p></div>
        <div className="node" style={{ left: 310, top: 170 }}><b>AI Antwort</b><p>Text generieren</p></div>
        <div className="node orange" style={{ left: 580, top: 170 }}><b>Aktion</b><p>Senden / Speichern</p></div>
      </div>
    </>
  );
}

function Suite() {
  return (
    <>
      <Head title="Full Local Business Suite" sub="Alle Module für lokale Unternehmen" />
      <div className="grid">
        {["Reviews", "CRM", "Booking", "WhatsApp", "SEO", "Webseiten", "Reporting", "QR Codes", "AI Sales", "Angebote", "Reputation", "Automationen"].map(item => (
          <div className="card" key={item}>
            <h2>{item}</h2>
            <p className="muted">Aktiv und als Dummy-Demo nutzbar.</p>
            <span className="badge">bereit</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Portal() {
  return (
    <>
      <div className="portalHero">
        <h1>Kundenportal</h1>
        <p>Aus Kundensicht: Reports, Termine, Bewertungen und Dokumente auf einen Blick.</p>
      </div>
      <div className="grid">
        <Kpi icon="📊" label="Reports" value="4" trend="aktuell" />
        <Kpi icon="🧾" label="Rechnungen" value="2" trend="1 offen" />
        <Kpi icon="📅" label="Termine" value="23" trend="8 diese Woche" />
      </div>
    </>
  );
}

function Generic({ title }) {
  return (
    <>
      <Head title={title} sub="Mockup-nahe Demo mit Dummy-Daten" action={<button className="btn">Aktion ausführen</button>} />
      <div className="grid">
        <Kpi icon="↗" label="Performance" value="+18%" trend="positiv" />
        <Kpi icon="👥" label="Einträge" value="128" trend="+12" />
        <Kpi icon="✓" label="Status" value="Aktiv" trend="online" />
      </div>
      <div className="grid2">
        <div className="card">
          <h2>{title} Tabelle</h2>
          <table className="table">
            <thead><tr><th>Name</th><th>Status</th><th>Wert</th></tr></thead>
            <tbody>
              {["Eintrag A", "Eintrag B", "Eintrag C", "Eintrag D"].map((item, i) => (
                <tr key={item}>
                  <td>{item}</td>
                  <td><span className={i === 1 ? "badge warn" : "badge"}>{i === 1 ? "Geplant" : "Aktiv"}</span></td>
                  <td>{(i + 1) * 42}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Auswertung</h2>
          <div className="chart"><div className="line" /></div>
        </div>
      </div>
    </>
  );
}
