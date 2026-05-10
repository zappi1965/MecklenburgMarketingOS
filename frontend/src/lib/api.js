
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export async function api(path, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("mmos_token") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Fehler");
  return data;
}

export function downloadText(filename, content) {
  const blob = new Blob([content], {type:"text/plain"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const modules = [
  ["dashboard","Dashboard","▣"],["clients","Kunden","♙"],["employees","Mitarbeiter","👥"],
  ["lead-scraper","Lead Scraper","🔎"],["crm","CRM","⚙"],["outreach","Cold Outreach","✉"],
  ["reviews","Reviews","☆"],["reputation","Reputation Shield","🛡"],["booking","Booking","▣"],
  ["social","Social Scheduler","📅"],["chatbot","Chatbot","◎"],["whatsapp","WhatsApp","◉"],
  ["seo","SEO","⌘"],["analytics","Analytics","↗"],["reports","Reports","📊"],
  ["qr","QR Kampagnen","▦"],["onboarding","Onboarding","🚀"],["sales-assistant","AI Sales","🤖"],
  ["proposals","Angebote","🧾"],["portal","Kundenportal","🏠"],["suite","Local Suite","⭐"],
  ["invoices","Rechnungen","▤"],["websites","Webseiten","▦"],["automations","Automationen","⌘"],
  ["settings","Einstellungen","⚙"]
];

export const moduleLabels = {
  reviews:"Reviews",crm:"CRM",booking:"Booking",chatbot:"Chatbot",whatsapp:"WhatsApp",
  seo:"SEO",analytics:"Analytics",invoices:"Rechnungen",websites:"Webseiten",automations:"Automationen",
  social:"Social Scheduler",outreach:"Cold Outreach",reputation:"Reputation Shield",reports:"Reporting",
  qr:"QR Kampagnen",onboarding:"Onboarding","sales-assistant":"AI Sales Assistant",proposals:"Angebote",
  portal:"Kundenportal",suite:"Local Business Suite"
};
