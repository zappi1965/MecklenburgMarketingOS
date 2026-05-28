export const V45_DEMO_CUSTOMER_IDS = {
  cafe: 'demo_customer_cafe_kuestenblick',
  salon: 'demo_customer_friseur_hansekamm'
}

export const V45_DEMO_REFERRAL_CODE = 'DEMO-HANSE'
export const V45_DEMO_PAYMENT_ID = 'pay_demo_kuestenblick_001'

type DemoTableName =
  | 'customers'
  | 'appointments'
  | 'tickets'
  | 'review_feedback'
  | 'prospect_leads'
  | 'qr_campaigns'
  | 'loyalty_rewards'
  | 'loyalty_customers'
  | 'loyalty_transactions'
  | 'invoices'
  | 'seo_snapshots'
  | 'integrations'
  | 'competitor_benchmarks'
  | 'local_listings'
  | 'booking_slots'
  | 'booking_waitlist'
  | 'rebooking_reminders'
  | 'unified_messages'
  | 'payment_links'
  | 'voucher_products'
  | 'referral_campaigns'
  | 'referral_events'

const now = '2026-05-28T10:00:00.000Z'

const cafe = V45_DEMO_CUSTOMER_IDS.cafe
const salon = V45_DEMO_CUSTOMER_IDS.salon

export const v45DemoData: Record<DemoTableName, any[]> = {
  customers: [
    {
      id: cafe,
      name: 'DEMO Café Küstenblick',
      branch: 'Gastronomie / Café',
      city: 'Schwerin',
      email: 'demo-cafe@mecklenburgmarketing.de',
      phone: '0385 000000',
      address: 'Am Markt 1, 19055 Schwerin',
      contact_person: 'Mara Beispiel',
      package_name: 'Growth',
      status: 'active',
      is_demo: true,
      created_at: now
    },
    {
      id: salon,
      name: 'DEMO Friseur Hansekamm',
      branch: 'Friseur / Beauty',
      city: 'Rostock',
      email: 'demo-salon@mecklenburgmarketing.de',
      phone: '0381 000000',
      address: 'Kröpeliner Straße 12, 18055 Rostock',
      contact_person: 'Timo Beispiel',
      package_name: 'Premium',
      status: 'active',
      is_demo: true,
      created_at: now
    }
  ],
  appointments: [
    {
      id: 'demo_appointment_001',
      customer_id: salon,
      title: 'Balayage Beratung',
      service_name: 'Balayage Beratung',
      starts_at: '2026-06-01T09:30:00.000Z',
      ends_at: '2026-06-01T10:15:00.000Z',
      status: 'Bestaetigt',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_appointment_002',
      customer_id: cafe,
      title: 'Tischreservierung 4 Personen',
      service_name: 'Reservierung',
      starts_at: '2026-06-02T17:00:00.000Z',
      ends_at: '2026-06-02T19:00:00.000Z',
      status: 'Offen',
      is_demo: true,
      created_at: now
    }
  ],
  tickets: [
    {
      id: 'demo_ticket_001',
      customer_id: cafe,
      title: 'Kunde fragt nach veganem Kuchen',
      subject: 'Anfrage über Slug-Seite',
      message: 'Gibt es am Samstag vegane Kuchen im Angebot?',
      status: 'Neu',
      priority: 'Normal',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_ticket_002',
      customer_id: salon,
      title: 'Negative Bewertung intern prüfen',
      subject: 'Review-Eskalation',
      message: 'Kunde war mit Wartezeit unzufrieden. Bitte Rueckmeldung vorbereiten.',
      status: 'In Bearbeitung',
      priority: 'Hoch',
      is_demo: true,
      created_at: now
    }
  ],
  review_feedback: [
    {
      id: 'demo_review_feedback_001',
      customer_id: cafe,
      rating: 5,
      message: 'Sehr freundliches Personal und super Frühstück.',
      status: 'Google Weiterleitung',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_review_feedback_002',
      customer_id: salon,
      rating: 3,
      message: 'Schnitt gut, aber Wartezeit war zu lang.',
      status: 'Internes Feedback',
      is_demo: true,
      created_at: now
    }
  ],
  prospect_leads: [
    {
      id: 'demo_lead_001',
      customer_id: cafe,
      name: 'DEMO Strandkiosk Warnemünde',
      branch: 'Gastronomie',
      city: 'Rostock',
      rating: 4.1,
      reviews: 28,
      score: 76,
      status: 'Neu',
      reasons: ['wenige Bewertungen', 'keine QR-Kampagne erkennbar', 'Audit empfohlen'],
      is_demo: true,
      created_at: now
    }
  ],
  qr_campaigns: [
    {
      id: 'demo_qr_campaign_001',
      customer_id: cafe,
      name: 'Frühstücks-Bewertungsaktion',
      slug: 'demo-cafe-kuestenblick',
      scans: 142,
      conversions: 31,
      status: 'Aktiv',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_qr_campaign_002',
      customer_id: salon,
      name: 'Freunde werben Freunde',
      slug: 'demo-friseur-hansekamm',
      scans: 84,
      conversions: 12,
      status: 'Aktiv',
      is_demo: true,
      created_at: now
    }
  ],
  loyalty_rewards: [
    {
      id: 'demo_reward_001',
      customer_id: cafe,
      title: 'Gratis Kaffee',
      points_required: 8,
      status: 'Aktiv',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_reward_002',
      customer_id: salon,
      title: '10 EUR Rabatt auf Pflegeprodukt',
      points_required: 12,
      status: 'Aktiv',
      is_demo: true,
      created_at: now
    }
  ],
  loyalty_customers: [
    {
      id: 'demo_loyalty_customer_001',
      customer_id: cafe,
      name: 'Anna Demo',
      points: 7,
      status: 'Aktiv',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_loyalty_customer_002',
      customer_id: salon,
      name: 'Max Demo',
      points: 11,
      status: 'Reward-ready',
      is_demo: true,
      created_at: now
    }
  ],
  loyalty_transactions: [
    {
      id: 'demo_loyalty_tx_001',
      customer_id: cafe,
      loyalty_customer_id: 'demo_loyalty_customer_001',
      points: 1,
      type: 'scan',
      status: 'gebucht',
      is_demo: true,
      created_at: now
    }
  ],
  invoices: [
    {
      id: 'demo_invoice_001',
      customer_id: cafe,
      invoice_number: 'DEMO-RE-001',
      amount: 299,
      status: 'Offen',
      due_date: '2026-06-15',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_invoice_002',
      customer_id: salon,
      invoice_number: 'DEMO-RE-002',
      amount: 499,
      status: 'Bezahlt',
      due_date: '2026-06-10',
      is_demo: true,
      created_at: now
    }
  ],
  seo_snapshots: [
    {
      id: 'demo_seo_snapshot_001',
      customer_id: cafe,
      keyword: 'café schwerin',
      position: 7,
      visibility: 68,
      city: 'Schwerin',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_seo_snapshot_002',
      customer_id: salon,
      keyword: 'friseur rostock',
      position: 5,
      visibility: 74,
      city: 'Rostock',
      is_demo: true,
      created_at: now
    }
  ],
  integrations: [
    {
      id: 'demo_integration_google_cafe',
      customer_id: cafe,
      provider: 'Google Business',
      status: 'Verbunden',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_integration_google_salon',
      customer_id: salon,
      provider: 'Google Business',
      status: 'Verbunden',
      is_demo: true,
      created_at: now
    }
  ],
  competitor_benchmarks: [
    {
      id: 'demo_competitor_001',
      customer_id: cafe,
      name: 'DEMO Konkurrenz Café Altstadt',
      rating: 4.4,
      reviews: 211,
      visibility: 82,
      profile_score: 78,
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_competitor_002',
      customer_id: salon,
      name: 'DEMO Salon Innenstadt',
      rating: 4.7,
      reviews: 134,
      visibility: 79,
      profile_score: 84,
      is_demo: true,
      created_at: now
    }
  ],
  local_listings: [
    {
      id: 'demo_listing_google_cafe',
      customer_id: cafe,
      platform: 'Google Business Profile',
      listing_url: 'https://maps.google.com/?q=demo+cafe+kuestenblick',
      status: 'Korrekt',
      nap_score: 92,
      notes: 'Name, Adresse und Öffnungszeiten konsistent.',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_listing_apple_cafe',
      customer_id: cafe,
      platform: 'Apple Maps',
      listing_url: '',
      status: 'Zu pruefen',
      nap_score: 61,
      notes: 'Apple Maps Eintrag sollte manuell geprüft werden.',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_listing_bing_salon',
      customer_id: salon,
      platform: 'Bing Places',
      listing_url: '',
      status: 'Fehlerhaft',
      nap_score: 54,
      notes: 'Telefonnummer weicht vom Google-Profil ab.',
      is_demo: true,
      created_at: now
    }
  ],
  booking_slots: [
    {
      id: 'demo_slot_salon_001',
      customer_id: salon,
      title: 'Last-Minute Slot Freitag',
      service_name: 'Haarschnitt Damen',
      starts_at: '2026-06-05T13:00:00.000Z',
      ends_at: '2026-06-05T14:00:00.000Z',
      capacity: 1,
      status: 'Frei',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_slot_cafe_001',
      customer_id: cafe,
      title: 'Tisch frei - Brunch',
      service_name: 'Reservierung',
      starts_at: '2026-06-07T09:00:00.000Z',
      ends_at: '2026-06-07T11:00:00.000Z',
      capacity: 4,
      status: 'Frei',
      is_demo: true,
      created_at: now
    }
  ],
  booking_waitlist: [
    {
      id: 'demo_waitlist_salon_001',
      customer_id: salon,
      client_name: 'Lisa Warteliste',
      request: 'Balayage Termin diese Woche',
      preferred_at: '2026-06-04T15:00:00.000Z',
      phone: '0176 000000',
      status: 'Wartet',
      is_demo: true,
      created_at: now
    }
  ],
  rebooking_reminders: [
    {
      id: 'demo_rebooking_001',
      customer_id: salon,
      client_name: 'Max Demo',
      last_appointment_at: '2026-04-15T10:00:00.000Z',
      due_at: '2026-06-01T10:00:00.000Z',
      channel: 'E-Mail',
      status: 'Offen',
      is_demo: true,
      created_at: now
    }
  ],
  unified_messages: [
    {
      id: 'demo_message_001',
      customer_id: cafe,
      channel: 'Slug',
      subject: 'Reservierung für Samstag',
      body: 'Habt ihr am Samstag noch einen Tisch fuer 4 Personen?',
      status: 'Neu',
      assigned_to: 'DominiqueMM',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_message_002',
      customer_id: salon,
      channel: 'Google',
      subject: 'Frage zu Balayage',
      body: 'Kann ich online einen Beratungstermin buchen?',
      status: 'In Bearbeitung',
      assigned_to: 'JanneMM',
      is_demo: true,
      created_at: now
    }
  ],
  payment_links: [
    {
      id: V45_DEMO_PAYMENT_ID,
      customer_id: cafe,
      invoice_id: 'demo_invoice_001',
      title: 'Anzahlung Catering-Anfrage',
      amount: 50,
      provider: 'extern',
      due_at: '2026-06-12',
      status: 'Offen',
      payment_url: '/pay/pay_demo_kuestenblick_001',
      is_demo: true,
      created_at: now
    }
  ],
  voucher_products: [
    {
      id: 'demo_voucher_cafe_001',
      customer_id: cafe,
      title: '25 EUR Frühstücksgutschein',
      amount: 25,
      validity_days: 365,
      status: 'Aktiv',
      is_demo: true,
      created_at: now
    },
    {
      id: 'demo_voucher_salon_001',
      customer_id: salon,
      title: '50 EUR Friseurgutschein',
      amount: 50,
      validity_days: 365,
      status: 'Aktiv',
      is_demo: true,
      created_at: now
    }
  ],
  referral_campaigns: [
    {
      id: 'demo_referral_salon_001',
      customer_id: salon,
      name: 'Freunde werben Freunde',
      reward: '10 EUR Rabatt für beide',
      referral_code: V45_DEMO_REFERRAL_CODE,
      public_url: '/r/DEMO-HANSE',
      status: 'Aktiv',
      is_demo: true,
      created_at: now
    }
  ],
  referral_events: [
    {
      id: 'demo_ref_event_001',
      campaign_id: 'demo_referral_salon_001',
      customer_id: salon,
      referral_code: V45_DEMO_REFERRAL_CODE,
      referrer_name: 'Max Demo',
      referred_name: 'Sophie Beispiel',
      referred_contact: 'sophie@example.com',
      status: 'Neu',
      is_demo: true,
      created_at: now
    }
  ]
}

export function getV45DemoRows(table: string): any[] {
  return (v45DemoData as Record<string, any[]>)[table] || []
}

export function isV45DemoRecord(row: any): boolean {
  return Boolean(row?.is_demo) || String(row?.name || row?.title || row?.subject || '').trim().toUpperCase().startsWith('DEMO')
}

export function mergeRowsById(...groups: any[][]): any[] {
  const map = new Map<string, any>()
  for (const group of groups) {
    for (const row of group || []) {
      const id = String(row?.id || `${row?.customer_id || 'row'}_${JSON.stringify(row).slice(0, 32)}`)
      map.set(id, { ...(map.get(id) || {}), ...row })
    }
  }
  return Array.from(map.values())
}
