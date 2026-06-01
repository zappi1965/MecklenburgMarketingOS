const DEFAULT_MARKETING_CONSENT_TEXT = 'Ich möchte per E-Mail zu Bonuspunkten, Rewards, Coupons und Reaktivierungsaktionen dieses Anbieters kontaktiert werden. Ich kann die Einwilligung jederzeit widerrufen.'

function includesAny(text, terms = []) {
  const t = String(text || '').toLowerCase()
  return terms.some((term) => t.includes(String(term).toLowerCase()))
}

function inspectMarketingConsentWording({ text = DEFAULT_MARKETING_CONSENT_TEXT, checkbox_preselected = false, participation_coupled = false, double_opt_in_enabled = true, unsubscribe_link_enabled = true } = {}) {
  const checks = [
    {
      key: 'clear_purpose',
      ok: includesAny(text, ['bonuspunkten', 'rewards', 'coupons', 'reaktivierungsaktionen', 'werbe']),
      severity: 'critical',
      hint: 'Zwecke der Kontaktaufnahme müssen klar benannt sein.'
    },
    {
      key: 'channel_email',
      ok: includesAny(text, ['e-mail', 'email', 'mail']),
      severity: 'critical',
      hint: 'Kontaktkanal muss klar benannt sein.'
    },
    {
      key: 'withdrawal_notice',
      ok: includesAny(text, ['widerrufen', 'widerruf', 'abmelden']),
      severity: 'critical',
      hint: 'Widerruf muss erwähnt werden.'
    },
    {
      key: 'not_preselected',
      ok: checkbox_preselected === false,
      severity: 'critical',
      hint: 'Checkbox darf nicht vorausgewählt sein.'
    },
    {
      key: 'not_coupled_to_participation',
      ok: participation_coupled === false,
      severity: 'critical',
      hint: 'Bonusprogramm-Teilnahme darf nicht unnötig an Werbeeinwilligung gekoppelt werden.'
    },
    {
      key: 'double_opt_in',
      ok: double_opt_in_enabled === true,
      severity: 'warning',
      hint: 'Double-Opt-in ist für belastbaren Nachweis empfohlen.'
    },
    {
      key: 'unsubscribe_link',
      ok: unsubscribe_link_enabled === true,
      severity: 'critical',
      hint: 'Jede Werbe-/Reminder-Mail sollte einen Abmeldelink enthalten.'
    },
    {
      key: 'plain_language',
      ok: String(text || '').length <= 420 && String(text || '').length >= 60,
      severity: 'info',
      hint: 'Text sollte knapp, verständlich und ausreichend konkret sein.'
    }
  ]
  return {
    ok: !checks.some((c) => c.severity === 'critical' && !c.ok),
    status: 'technical_wording_check',
    text,
    checks,
    recommended_text: DEFAULT_MARKETING_CONSENT_TEXT,
    note: 'Technische Plausibilitätsprüfung, keine anwaltliche Rechtsberatung oder finale juristische Freigabe.'
  }
}

module.exports = { DEFAULT_MARKETING_CONSENT_TEXT, inspectMarketingConsentWording }
