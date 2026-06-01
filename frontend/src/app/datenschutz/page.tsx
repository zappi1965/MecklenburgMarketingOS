import type { ReactNode } from "react";

type SectionProps = {
  title: string;
  children: ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <section className="space-y-4 border-b border-slate-200 pb-8">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      <div className="space-y-4 text-base leading-7 text-slate-700">
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-6 text-slate-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function Datenschutz() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10 lg:p-12">
        <header className="mb-10 space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
            Mecklenburg Marketing
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Datenschutzerklärung
          </h1>

          <p className="text-slate-600">
            Stand: 25.05.2026
          </p>

          <p className="text-base leading-7 text-slate-700">
            Wir freuen uns über Ihr Interesse an unserer Website und unseren
            Leistungen. Der Schutz Ihrer personenbezogenen Daten ist uns
            wichtig. Nachfolgend informieren wir Sie darüber, welche Daten wir
            erheben, zu welchen Zwecken wir diese verarbeiten und welche Rechte
            Ihnen zustehen.
          </p>
        </header>

        <div className="space-y-10">
          <Section title="1. Verantwortlicher">
            <p>
              Verantwortlich für die Datenverarbeitung auf dieser Website ist:
            </p>

            <div className="rounded-2xl bg-slate-50 p-5 text-slate-700">
              <p className="font-semibold text-slate-900">
                MecklenburgMarketing GbR
              </p>
              <p>Inhaber / Betreiber: Dominique Zapf, Janne Dickmann</p>
              <p>Zum Petersberg 19b</p>
              <p>19065 Pinnow</p>
              <p>Deutschland</p>
              <br />
              <p>E-Mail: zapf@mecklenburgmarketing.de</p>
              <p>Telefon: 01627533619</p>
            </div>

            <p>
              Sofern Mecklenburg Marketing als GbR betrieben wird:
            </p>

            <div className="rounded-2xl bg-slate-50 p-5 text-slate-700">
              <p className="font-semibold text-slate-900">
                MecklenburgMarketing GbR
              </p>
              <p>Vertreten durch die Gesellschafter: Dominique Zapf, Janne Dickmann</p>
            </div>
          </Section>

          <Section title="2. Allgemeine Hinweise zur Datenverarbeitung">
            <p>
              Wir verarbeiten personenbezogene Daten nur, soweit dies zur
              Bereitstellung unserer Website, zur Bearbeitung von Anfragen, zur
              Durchführung vorvertraglicher und vertraglicher Maßnahmen, zur
              Erfüllung gesetzlicher Pflichten oder zur Wahrung berechtigter
              Interessen erforderlich ist.
            </p>

            <p>
              Personenbezogene Daten sind alle Informationen, die sich auf eine
              identifizierte oder identifizierbare natürliche Person beziehen,
              zum Beispiel Name, E-Mail-Adresse, Telefonnummer, IP-Adresse oder
              Nutzungsdaten.
            </p>

            <p>Rechtsgrundlagen der Verarbeitung können insbesondere sein:</p>

            <List
              items={[
                "Art. 6 Abs. 1 lit. a DSGVO – Einwilligung",
                "Art. 6 Abs. 1 lit. b DSGVO – Vertragserfüllung oder vorvertragliche Maßnahmen",
                "Art. 6 Abs. 1 lit. c DSGVO – rechtliche Verpflichtung",
                "Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse",
              ]}
            />
          </Section>

          <Section title="3. Zugriff auf unsere Website / Server-Logfiles">
            <p>
              Beim Aufruf unserer Website werden automatisch Informationen durch
              den Server erfasst. Dazu können gehören:
            </p>

            <List
              items={[
                "IP-Adresse",
                "Datum und Uhrzeit des Zugriffs",
                "aufgerufene Seite oder Datei",
                "Referrer-URL",
                "verwendeter Browser",
                "verwendetes Betriebssystem",
                "übertragene Datenmenge",
                "Meldung über erfolgreichen Abruf",
              ]}
            />

            <p>
              Diese Daten sind technisch erforderlich, um die Website anzuzeigen,
              die Stabilität und Sicherheit zu gewährleisten und Fehler zu
              analysieren.
            </p>

            <p>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO
              <br />
              <strong>Berechtigtes Interesse:</strong> sichere, stabile und
              fehlerfreie Bereitstellung unserer Website.
            </p>

            <p>
              Die Server-Logfiles werden nur so lange gespeichert, wie dies zur
              Erreichung der vorgenannten Zwecke erforderlich ist, und
              anschließend gelöscht oder anonymisiert, sofern keine gesetzlichen
              Aufbewahrungspflichten entgegenstehen.
            </p>
          </Section>

          <Section title="4. Hosting und technische Dienstleister">
            <p>
              Unsere Website und technische Infrastruktur können über externe
              Dienstleister betrieben werden. Dazu können insbesondere gehören:
            </p>

            <List
              items={[
                "Vercel Inc. – Hosting / Frontend-Bereitstellung",
                "Railway Corp. – Backend-Hosting / Server-Infrastruktur",
                "Supabase Inc. – Datenbank, Authentifizierung, Speicherung technischer Daten",
                "Resend – E-Mail-Kommunikation",
              ]}
            />

            <p>
              Im Rahmen des Hostings können personenbezogene Daten verarbeitet
              werden, insbesondere IP-Adressen, technische Zugriffsdaten,
              Kontaktanfragen und sonstige Daten, die über unsere Website
              eingegeben werden.
            </p>

            <p>
              Soweit diese Dienstleister personenbezogene Daten in unserem
              Auftrag verarbeiten, schließen wir mit ihnen Verträge zur
              Auftragsverarbeitung nach Art. 28 DSGVO.
            </p>

            <p>
              Bei Dienstleistern mit Sitz außerhalb der Europäischen Union oder
              des Europäischen Wirtschaftsraums kann eine Übermittlung in ein
              Drittland stattfinden. In solchen Fällen achten wir darauf, dass
              geeignete Garantien bestehen, zum Beispiel
              EU-Standardvertragsklauseln oder Angemessenheitsbeschlüsse.
            </p>
          </Section>

          <Section title="5. Kontaktaufnahme">
            <p>
              Wenn Sie uns per E-Mail, Telefon, Kontaktformular oder über andere
              Kommunikationswege kontaktieren, verarbeiten wir die von Ihnen
              mitgeteilten Daten.
            </p>

            <p>Dazu können gehören:</p>

            <List
              items={[
                "Name",
                "Unternehmen",
                "E-Mail-Adresse",
                "Telefonnummer",
                "Inhalt der Anfrage",
                "Zeitpunkt der Kontaktaufnahme",
                "sonstige freiwillige Angaben",
              ]}
            />

            <p>
              Die Verarbeitung erfolgt zur Bearbeitung Ihrer Anfrage, zur
              Kommunikation mit Ihnen und gegebenenfalls zur Anbahnung oder
              Durchführung eines Vertrags.
            </p>

            <p>
              <strong>Rechtsgrundlage:</strong>
              <br />
              Art. 6 Abs. 1 lit. b DSGVO, sofern die Anfrage mit einem Vertrag
              oder vorvertraglichen Maßnahmen zusammenhängt.
              <br />
              Art. 6 Abs. 1 lit. f DSGVO, sofern es sich um allgemeine
              Kommunikation handelt.
            </p>

            <p>
              Die Daten werden gelöscht, sobald sie für die Bearbeitung nicht
              mehr erforderlich sind, sofern keine gesetzlichen
              Aufbewahrungspflichten entgegenstehen.
            </p>
          </Section>

          <Section title="6. Angebots-, Kunden- und Vertragsdaten">
            <p>
              Wenn Sie bei uns ein Angebot anfragen, eine Leistung buchen oder
              Kunde werden, verarbeiten wir die hierfür erforderlichen Daten.
            </p>

            <p>Dazu können gehören:</p>

            <List
              items={[
                "Name und Kontaktdaten",
                "Unternehmensdaten",
                "Rechnungsanschrift",
                "Leistungsumfang",
                "Vertragsdaten",
                "Zahlungsinformationen",
                "Kommunikationsverlauf",
                "Projektinformationen",
                "Angaben zu Ihrem Google-Unternehmensprofil",
                "Angaben zu QR-Kampagnen, Bewertungsseiten, Slug-Seiten oder Kundenaktionen",
              ]}
            />

            <p>
              Die Verarbeitung erfolgt zur Angebotserstellung,
              Vertragsdurchführung, Kundenbetreuung, Rechnungsstellung und
              Dokumentation.
            </p>

            <p>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
              <br />
              Soweit gesetzliche Aufbewahrungspflichten bestehen, erfolgt die
              Verarbeitung zusätzlich auf Grundlage von Art. 6 Abs. 1 lit. c
              DSGVO.
            </p>
          </Section>

          <Section title="7. Google Business Profile / Google-Unternehmensprofil">
            <p>
              Im Rahmen unserer Dienstleistungen können wir Daten verarbeiten,
              die mit Ihrem Google-Unternehmensprofil zusammenhängen.
            </p>

            <p>Dazu können gehören:</p>

            <List
              items={[
                "Unternehmensname",
                "Adresse",
                "Telefonnummer",
                "Öffnungszeiten",
                "Website",
                "Branchenangaben",
                "Bilder",
                "Leistungsbeschreibungen",
                "Bewertungen",
                "öffentlich sichtbare Informationen Ihres Unternehmensprofils",
                "Optimierungsvorschläge und Auswertungen",
              ]}
            />

            <p>
              Diese Verarbeitung erfolgt, um Ihr Google-Unternehmensprofil
              einzurichten, zu optimieren, zu pflegen oder auszuwerten.
            </p>

            <p>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
            </p>

            <p>
              Soweit wir personenbezogene Daten Ihrer Kunden oder Nutzer
              verarbeiten, geschieht dies nur im Rahmen der vereinbarten Leistung
              und nach Maßgabe der geltenden Datenschutzvorschriften.
            </p>
          </Section>

          <Section title="8. Bewertungs- und QR-Code-Kampagnen">
            <p>
              Wir können Bewertungsseiten, QR-Code-Kampagnen oder sogenannte
              Slug-Seiten bereitstellen, über die Nutzer Feedback abgeben oder
              zu externen Bewertungsplattformen weitergeleitet werden.
            </p>

            <p>Dabei können folgende Daten verarbeitet werden:</p>

            <List
              items={[
                "abgegebene Bewertung",
                "Freitext-Feedback",
                "Zeitpunkt der Abgabe",
                "technische Zugriffsdaten",
                "gegebenenfalls Name oder Kontaktdaten, sofern freiwillig angegeben",
                "Zuordnung zu einem bestimmten Kundenunternehmen oder Standort",
              ]}
            />

            <p>
              Je nach Bewertung kann eine Weiterleitung auf externe Plattformen,
              zum Beispiel Google, erfolgen. Bei einer Weiterleitung gelten
              zusätzlich die Datenschutzbestimmungen des jeweiligen
              Drittanbieters.
            </p>

            <p>
              <strong>Rechtsgrundlage:</strong>
              <br />
              Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung zur
              Durchführung der gebuchten Kampagne erforderlich ist.
              <br />
              Art. 6 Abs. 1 lit. f DSGVO, soweit wir ein berechtigtes Interesse
              an der Auswertung und Verbesserung unserer Leistungen haben.
              <br />
              Art. 6 Abs. 1 lit. a DSGVO, sofern eine ausdrückliche Einwilligung
              eingeholt wird.
            </p>
          </Section>

          <Section title="9. Kundenbereich / Dashboard">
            <p>
              Sofern wir einen Kundenbereich, ein Dashboard oder ein
              Verwaltungssystem bereitstellen, verarbeiten wir die für die
              Nutzung erforderlichen Daten.
            </p>

            <p>Dazu können gehören:</p>

            <List
              items={[
                "Login-Daten",
                "Name und E-Mail-Adresse des Nutzers",
                "Unternehmenszuordnung",
                "Rollen und Berechtigungen",
                "Kundendaten",
                "Kampagnendaten",
                "Bewertungsdaten",
                "Leads",
                "Termine",
                "Rechnungs- und Leistungsdaten",
                "Nutzungs- und Aktivitätsdaten",
              ]}
            />

            <p>
              Die Verarbeitung erfolgt zur Bereitstellung des Kundenbereichs, zur
              Verwaltung der gebuchten Leistungen, zur Darstellung von
              Auswertungen und zur technischen Sicherheit.
            </p>

            <p>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
              <br />
              Für Sicherheits- und Protokolldaten zusätzlich Art. 6 Abs. 1 lit.
              f DSGVO.
            </p>
          </Section>

          <Section title="10. Cookies und vergleichbare Technologien">
            <p>
              Unsere Website kann Cookies oder vergleichbare Technologien
              verwenden. Cookies sind kleine Textdateien, die auf Ihrem Endgerät
              gespeichert werden.
            </p>

            <h3 className="text-xl font-semibold text-slate-900">
              Technisch notwendige Cookies
            </h3>

            <p>
              Diese Cookies sind erforderlich, damit die Website funktioniert.
              Dazu können zum Beispiel Session-Cookies, Sicherheits-Cookies oder
              Cookies zur Speicherung technischer Einstellungen gehören.
            </p>

            <p>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO sowie
              § 25 Abs. 2 TDDDG.
            </p>

            <h3 className="text-xl font-semibold text-slate-900">
              Nicht notwendige Cookies / Tracking
            </h3>

            <p>
              Soweit wir Analyse-, Marketing- oder Tracking-Technologien
              einsetzen, geschieht dies nur auf Grundlage Ihrer Einwilligung.
            </p>

            <p>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO sowie
              § 25 Abs. 1 TDDDG.
            </p>

            <p>
              Sie können eine erteilte Einwilligung jederzeit mit Wirkung für die
              Zukunft widerrufen.
            </p>

            <p className="rounded-2xl bg-amber-50 p-4 text-amber-900">
              Hinweis: Falls aktuell kein Tracking und keine nicht notwendigen
              Cookies genutzt werden, kann dieser Abschnitt entsprechend
              verkürzt werden.
            </p>
          </Section>

          <Section title="11. Analyse-Tools">
            <p>
              Optional – nur verwenden, wenn tatsächlich Analyse-Tools eingesetzt
              werden:
            </p>

            <p>
              Wir können Analyse-Tools einsetzen, um die Nutzung unserer Website
              auszuwerten und unser Angebot zu verbessern.
            </p>

            <p>Dabei können insbesondere folgende Daten verarbeitet werden:</p>

            <List
              items={[
                "aufgerufene Seiten",
                "Verweildauer",
                "Klickverhalten",
                "Herkunft der Besucher",
                "verwendetes Gerät",
                "Browserinformationen",
                "gekürzte oder pseudonymisierte IP-Adresse",
              ]}
            />

            <p>
              Der Einsatz erfolgt nur, soweit hierfür eine wirksame Einwilligung
              vorliegt.
            </p>

            <p>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO.
            </p>

            <p>
              Eingesetzte Anbieter: [z. B. Google Analytics / Plausible / Matomo
              / Umami eintragen]
            </p>

            <p className="rounded-2xl bg-amber-50 p-4 text-amber-900">
              Wenn kein Analyse-Tool eingesetzt wird, sollte dieser Abschnitt
              entfernt werden.
            </p>
          </Section>

          <Section title="12. Google Maps, Google Fonts und Google-Dienste">
            <p>
              Unsere Website kann Dienste von Google verwenden, zum Beispiel
              Google Maps, Google Fonts, Google Business Profile, Google Review
              Links oder andere Google-Schnittstellen.
            </p>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="font-semibold text-slate-900">
                Google Ireland Limited
              </p>
              <p>Gordon House, Barrow Street</p>
              <p>Dublin 4, Irland</p>
            </div>

            <p>
              Bei Nutzung von Google-Diensten können personenbezogene Daten,
              insbesondere IP-Adressen und technische Nutzungsdaten, an Google
              übermittelt werden. Eine Übermittlung an Google LLC in den USA
              kann nicht ausgeschlossen werden.
            </p>

            <p>
              Soweit Google-Dienste nicht technisch erforderlich sind, werden sie
              nur nach Ihrer Einwilligung geladen.
            </p>

            <p>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO sowie
              § 25 Abs. 1 TDDDG.
            </p>

            <p>
              Soweit Google-Dienste zur Vertragserfüllung oder zur Umsetzung
              gebuchter Leistungen erforderlich sind, kann die Verarbeitung auch
              auf Art. 6 Abs. 1 lit. b DSGVO gestützt werden.
            </p>

            <p className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
              Wichtig: Google Fonts sollten nach Möglichkeit lokal eingebunden
              werden. Wenn Fonts lokal eingebunden sind, findet beim Laden der
              Schriftarten keine Verbindung zu Google-Servern statt.
            </p>
          </Section>

          <Section title="13. Social-Media-Profile">
            <p>
              Wir können Profile auf sozialen Netzwerken betreiben, zum Beispiel
              auf Instagram, Facebook, LinkedIn oder TikTok.
            </p>

            <p>
              Wenn Sie unsere Social-Media-Profile besuchen, können
              personenbezogene Daten durch den jeweiligen Plattformbetreiber
              verarbeitet werden. Auf diese Datenverarbeitung haben wir nur
              begrenzten Einfluss.
            </p>

            <p>
              Wir verarbeiten Daten, die Sie uns über soziale Netzwerke
              mitteilen, zum Beispiel Nachrichten, Kommentare oder Interaktionen,
              zur Kommunikation und Außendarstellung.
            </p>

            <p>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO
              <br />
              Unser berechtigtes Interesse liegt in der Kommunikation mit
              Interessenten, Kunden und Nutzern sowie in der Außendarstellung
              unseres Unternehmens.
            </p>

            <p>
              Es gelten zusätzlich die Datenschutzbestimmungen der jeweiligen
              Plattformen.
            </p>
          </Section>

          <Section title="14. Newsletter, Werbeeinwilligungen und Reminder-Mails">
            <p>
              Wenn Sie sich für werbliche Informationen, Newsletter, Bonusprogramm-
              Erinnerungen oder vergleichbare Kundenbindungsnachrichten anmelden,
              verarbeiten wir Ihre E-Mail-Adresse und gegebenenfalls weitere
              freiwillige Angaben, um Ihnen die gewünschten Informationen zuzusenden.
            </p>

            <p>
              Bei Bonus-, Loyalty- oder Slug-Seiten kann eine gesonderte
              Einwilligung abgefragt werden, damit der jeweilige Anbieter Sie per
              E-Mail zu Bonuspunkten, Rewards, Coupons, Reaktivierungsaktionen
              oder ähnlichen Kundenbindungsmaßnahmen kontaktieren darf. Diese
              Einwilligung ist freiwillig und nicht Voraussetzung für die
              Teilnahme am Bonusprogramm.
            </p>

            <p>
              Die Anmeldung erfolgt über ein Double-Opt-in-Verfahren. Das bedeutet,
              dass nach dem Ankreuzen der Einwilligung zunächst eine
              Bestätigungs-E-Mail versendet wird. Erst nach Klick auf den
              Bestätigungslink wird die Werbeeinwilligung aktiv.
            </p>

            <p>Dabei können insbesondere folgende Daten verarbeitet werden:</p>

            <List
              items={[
                "E-Mail-Adresse",
                "Name oder Anzeigename, sofern angegeben",
                "zugehöriges Bonusprogramm oder Kundenunternehmen",
                "Zeitpunkt der Einwilligungsanfrage",
                "Zeitpunkt der Double-Opt-in-Bestätigung",
                "Version und Text der Einwilligung",
                "Zwecke der Einwilligung, z. B. Rewards, Coupons oder Reaktivierung",
                "technische Nachweisdaten, insbesondere IP-Hash und User-Agent",
                "Widerrufs- und Abmeldestatus",
              ]}
            />

            <p>
              Jede werbliche E-Mail oder Reminder-Mail enthält einen Abmeldelink.
              Eine erteilte Einwilligung kann jederzeit mit Wirkung für die
              Zukunft widerrufen werden.
            </p>

            <p>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO.
            </p>
          </Section>

          <Section title="15. E-Mail-Dienstleister Resend">
            <p>
              Für den Versand von System-, Double-Opt-in-, Benachrichtigungs-
              und Reminder-E-Mails kann der Dienstleister Resend eingesetzt
              werden.
            </p>

            <p>
              Beim E-Mail-Versand können insbesondere Empfängeradresse,
              Betreff, Nachrichteninhalt, Versandzeitpunkt, Zustellstatus und
              technische Versanddaten verarbeitet werden.
            </p>

            <p>
              Soweit Resend personenbezogene Daten in unserem Auftrag verarbeitet,
              erfolgt dies auf Grundlage eines Vertrags zur Auftragsverarbeitung
              nach Art. 28 DSGVO.
            </p>

            <p>
              <strong>Rechtsgrundlage:</strong>
              <br />
              Art. 6 Abs. 1 lit. b DSGVO für vertrags- und servicebezogene
              E-Mails.
              <br />
              Art. 6 Abs. 1 lit. a DSGVO für Werbe-, Reminder- und
              Kundenbindungs-E-Mails.
              <br />
              Art. 6 Abs. 1 lit. f DSGVO für technische Versandprotokolle und
              Missbrauchsschutz.
            </p>
          </Section>

          <Section title="16. Bonusprogramm, Kundenbindung und Reaktivierung">
            <p>
              Im Rahmen eines Bonus- oder Loyalty-Programms können Daten genutzt
              werden, um Punkte, Rewards, Coupons, VIP-Level, Kundenbindungs-
              Aktionen oder Reaktivierungsvorschläge bereitzustellen.
            </p>

            <p>
              Das System kann erkennen, wenn ein Bonusmitglied über einen
              längeren Zeitraum inaktiv war oder Rewards nicht genutzt wurden.
              Daraus können interne Vorschläge oder Entwürfe für
              Reaktivierungsmaßnahmen entstehen. Eine werbliche Kontaktaufnahme
              erfolgt nur, wenn eine hierfür geeignete Rechtsgrundlage,
              insbesondere eine bestätigte Einwilligung, vorliegt.
            </p>

            <p>Dabei können insbesondere folgende Daten verarbeitet werden:</p>

            <List
              items={[
                "Bonusmitglied-ID",
                "E-Mail-Adresse, sofern angegeben",
                "Punktestand",
                "Reward- und Coupon-Nutzung",
                "letzte Aktivität",
                "Kampagnen- und Reaktivierungsvorschläge",
                "Einwilligungs- und Widerrufsnachweise",
              ]}
            />

            <p>
              <strong>Rechtsgrundlage:</strong>
              <br />
              Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung zur
              Durchführung des Bonusprogramms erforderlich ist.
              <br />
              Art. 6 Abs. 1 lit. a DSGVO, soweit werbliche Kontaktaufnahmen oder
              Reminder-Mails erfolgen.
              <br />
              Art. 6 Abs. 1 lit. f DSGVO für interne Auswertungen,
              Missbrauchsschutz und technische Sicherheit.
            </p>
          </Section>

          <Section title="17. Datenübermittlung in Drittländer">
            <p>
              Bei Nutzung bestimmter Dienstleister kann eine Verarbeitung
              personenbezogener Daten außerhalb der Europäischen Union oder des
              Europäischen Wirtschaftsraums stattfinden, insbesondere in den USA.
            </p>

            <p>
              Eine solche Übermittlung erfolgt nur, wenn die
              datenschutzrechtlichen Voraussetzungen erfüllt sind, zum Beispiel
              durch:
            </p>

            <List
              items={[
                "einen Angemessenheitsbeschluss der EU-Kommission",
                "EU-Standardvertragsklauseln",
                "zusätzliche Schutzmaßnahmen",
                "oder eine ausdrückliche Einwilligung",
              ]}
            />
          </Section>

          <Section title="18. Speicherdauer">
            <p>
              Wir speichern personenbezogene Daten nur so lange, wie es für die
              jeweiligen Zwecke erforderlich ist.
            </p>

            <p>
              Daten aus Kontaktanfragen werden gelöscht, sobald die Anfrage
              abschließend bearbeitet wurde, sofern keine gesetzlichen
              Aufbewahrungspflichten bestehen.
            </p>

            <p>
              Vertrags-, Rechnungs- und Buchhaltungsdaten werden entsprechend
              gesetzlicher Aufbewahrungsfristen gespeichert.
            </p>

            <p>
              Technische Daten und Logfiles werden nur so lange gespeichert, wie
              dies zur Sicherheit und Stabilität der Website erforderlich ist.
            </p>
          </Section>

          <Section title="19. Ihre Rechte">
            <p>
              Sie haben nach der DSGVO insbesondere folgende Rechte:
            </p>

            <List
              items={[
                "Recht auf Auskunft",
                "Recht auf Berichtigung",
                "Recht auf Löschung",
                "Recht auf Einschränkung der Verarbeitung",
                "Recht auf Datenübertragbarkeit",
                "Recht auf Widerspruch gegen bestimmte Verarbeitungen",
                "Recht auf Widerruf einer erteilten Einwilligung",
                "Recht auf Beschwerde bei einer Datenschutzaufsichtsbehörde",
              ]}
            />

            <p>
              Zur Ausübung Ihrer Rechte können Sie sich jederzeit an uns wenden:
            </p>

            <p className="font-semibold text-slate-900">
              [E-Mail-Adresse eintragen]
            </p>
          </Section>

          <Section title="20. Widerspruchsrecht nach Art. 21 DSGVO">
            <p>
              Wenn wir personenbezogene Daten auf Grundlage von Art. 6 Abs. 1
              lit. f DSGVO verarbeiten, haben Sie das Recht, aus Gründen, die
              sich aus Ihrer besonderen Situation ergeben, jederzeit Widerspruch
              gegen diese Verarbeitung einzulegen.
            </p>

            <p>
              Legen Sie Widerspruch ein, verarbeiten wir die betreffenden
              personenbezogenen Daten nicht mehr, es sei denn, wir können
              zwingende schutzwürdige Gründe für die Verarbeitung nachweisen oder
              die Verarbeitung dient der Geltendmachung, Ausübung oder
              Verteidigung von Rechtsansprüchen.
            </p>
          </Section>

          <Section title="21. Widerruf von Einwilligungen">
            <p>
              Wenn eine Verarbeitung auf Ihrer Einwilligung beruht, können Sie
              diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.
            </p>

            <p>
              Die Rechtmäßigkeit der Verarbeitung, die bis zum Widerruf erfolgt
              ist, bleibt unberührt.
            </p>
          </Section>

          <Section title="22. Beschwerderecht bei einer Aufsichtsbehörde">
            <p>
              Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde zu
              beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer
              personenbezogenen Daten gegen Datenschutzrecht verstößt.
            </p>

            <p>
              Zuständig kann insbesondere die Datenschutzaufsichtsbehörde Ihres
              Wohnortes, Ihres Arbeitsplatzes oder des Ortes des mutmaßlichen
              Verstoßes sein.
            </p>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="font-semibold text-slate-900">
                Der Landesbeauftragte für Datenschutz und Informationsfreiheit
                Mecklenburg-Vorpommern
              </p>
              <p>[aktuelle Anschrift / Website prüfen und eintragen]</p>
            </div>
          </Section>

          <Section title="23. Datensicherheit">
            <p>
              Wir treffen technische und organisatorische Maßnahmen, um
              personenbezogene Daten gegen Verlust, Missbrauch, unbefugten
              Zugriff, Veränderung oder Offenlegung zu schützen.
            </p>

            <p>Dazu gehören je nach eingesetzter Infrastruktur insbesondere:</p>

            <List
              items={[
                "SSL-/TLS-Verschlüsselung",
                "Zugriffsbeschränkungen",
                "rollenbasierte Berechtigungen",
                "sichere Passwörter und Authentifizierung",
                "regelmäßige Updates",
                "Protokollierung sicherheitsrelevanter Vorgänge",
                "Backups",
                "sorgfältige Auswahl von Dienstleistern",
              ]}
            />
          </Section>

          <Section title="24. Änderungen dieser Datenschutzerklärung">
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, wenn
              sich unsere Website, unsere Leistungen, eingesetzte Dienstleister
              oder rechtliche Anforderungen ändern.
            </p>

            <p>
              Die jeweils aktuelle Datenschutzerklärung ist jederzeit auf dieser
              Website abrufbar.
            </p>
          </Section>

          <Section title="25. Kurzfassung für Besucher">
            <p>
              Wir verarbeiten personenbezogene Daten insbesondere, wenn Sie
              unsere Website besuchen, uns kontaktieren, ein Angebot anfragen,
              Kunde werden oder unsere QR-, Bewertungs- oder
              Kundenportal-Funktionen nutzen.
            </p>

            <p>
              Wir nutzen Daten nur für nachvollziehbare Zwecke, insbesondere zur
              Bereitstellung unserer Website, zur Kommunikation, zur
              Vertragserfüllung, zur technischen Sicherheit und zur Verbesserung
              unserer Leistungen.
            </p>

            <p>
              Nicht notwendige Cookies, Tracking-Tools oder externe Dienste
              werden nur eingesetzt, soweit hierfür eine Einwilligung erforderlich
              ist und diese vorliegt.
            </p>
          </Section>
        </div>

        <footer className="mt-12 rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-200">
        </footer>
      </div>
    </main>
  );
}