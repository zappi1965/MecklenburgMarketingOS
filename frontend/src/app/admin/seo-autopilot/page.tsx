'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Sparkles, KeyRound, FileText, Check, RefreshCw, Trash2, Wand2, Globe, Clock, EyeOff, Image as ImageIcon } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { seoAutopilotClient, type SeoBrandProfile, type SeoKeyword, type SeoArticle, type SeoSchedule } from '@/lib/seoAutopilotClient'

type Step = 'brand' | 'keywords' | 'articles' | 'autopilot'

const STEPS: Array<{ key: Step; label: string; icon: any }> = [
  { key: 'brand', label: 'Brand-DNA', icon: Sparkles },
  { key: 'keywords', label: 'Keywords', icon: KeyRound },
  { key: 'articles', label: 'Artikel', icon: FileText },
  { key: 'autopilot', label: 'Autopilot', icon: Clock }
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-zinc-700 text-zinc-200',
    approved: 'bg-emerald-700 text-emerald-50',
    published: 'bg-violet-700 text-violet-50'
  }
  const label: Record<string, string> = { draft: 'Entwurf', approved: 'Freigegeben', published: 'Veröffentlicht' }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || map.draft}`}>{label[status] || status}</span>
}

export default function SeoAutopilotPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [lang, setLang] = useState('de')
  const [step, setStep] = useState<Step>('brand')
  const [provider, setProvider] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Brand-DNA
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [brand, setBrand] = useState<SeoBrandProfile | null>(null)

  // Keywords
  const [keywords, setKeywords] = useState<SeoKeyword[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  // Artikel
  const [articles, setArticles] = useState<SeoArticle[]>([])
  const [editing, setEditing] = useState<SeoArticle | null>(null)

  // Autopilot-Schedule
  const [schedule, setSchedule] = useState<SeoSchedule>({ enabled: false, cadence: 'weekly', auto_publish: false })

  useEffect(() => {
    getCurrentUserProfile()
      .then((p) => setAuthorized(['admin', 'super_admin'].includes(String(p?.role || '').toLowerCase())))
      .catch(() => setAuthorized(false))
  }, [])

  function note(msg: string) { setInfo(msg); setError(''); setTimeout(() => setInfo(''), 4000) }
  function fail(e: any) { setError(e?.message || String(e)); }

  async function loadAll(cid: string) {
    if (!cid) return
    setBusy(true); setError('')
    try {
      const [bp, kw, ar, sc] = await Promise.all([
        seoAutopilotClient.getBrandProfile(cid).catch(() => ({ profile: null } as any)),
        seoAutopilotClient.listKeywords(cid).catch(() => ({ keywords: [] } as any)),
        seoAutopilotClient.listArticles(cid).catch(() => ({ articles: [] } as any)),
        seoAutopilotClient.getSchedule(cid).catch(() => ({ schedule: null } as any))
      ])
      setBrand(bp.profile || null)
      setKeywords(kw.keywords || [])
      setArticles(ar.articles || [])
      if (sc.schedule) setSchedule(sc.schedule)
    } catch (e) { fail(e) } finally { setBusy(false) }
  }

  // --- Brand-DNA ---
  async function genBrand() {
    if (!customerId) return fail(new Error('Bitte zuerst eine Kunden-ID eingeben.'))
    setBusy(true); setError('')
    try {
      const r = await seoAutopilotClient.generateBrandProfile({ customer_id: customerId, website_url: websiteUrl, notes, language: lang })
      setProvider(r.provider)
      setBrand({ ...r.profile, customer_id: customerId, website_url: websiteUrl, provider: r.provider })
      note(`Brand-DNA generiert (${r.provider}).`)
    } catch (e) { fail(e) } finally { setBusy(false) }
  }
  async function saveBrand() {
    if (!brand || !customerId) return
    setBusy(true); setError('')
    try {
      const r = await seoAutopilotClient.saveBrandProfile({ ...brand, customer_id: customerId })
      setBrand(r.profile); note('Brand-DNA gespeichert.')
    } catch (e) { fail(e) } finally { setBusy(false) }
  }

  // --- Keywords ---
  async function genKeywords() {
    if (!customerId) return fail(new Error('Bitte zuerst eine Kunden-ID eingeben.'))
    setBusy(true); setError('')
    try {
      const r = await seoAutopilotClient.generateKeywords({ customer_id: customerId, count: 12, language: lang })
      setProvider(r.provider)
      setKeywords(r.keywords)
      const sel: Record<string, boolean> = {}
      r.keywords.forEach((k) => { sel[k.keyword] = k.priority >= 4 })
      setSelected(sel)
      note(`${r.keywords.length} Keyword-Ideen generiert (${r.provider}).`)
    } catch (e) { fail(e) } finally { setBusy(false) }
  }
  async function saveKeywords() {
    const chosen = keywords.filter((k) => selected[k.keyword])
    if (!chosen.length) return fail(new Error('Keine Keywords ausgewählt.'))
    setBusy(true); setError('')
    try {
      const r = await seoAutopilotClient.saveKeywords(customerId, chosen)
      setKeywords(r.keywords); note(`${r.keywords.length} Keywords gespeichert.`)
    } catch (e) { fail(e) } finally { setBusy(false) }
  }

  // --- Artikel ---
  async function genArticle(keyword: string) {
    if (!customerId) return
    setBusy(true); setError('')
    try {
      const r = await seoAutopilotClient.generateArticle({ customer_id: customerId, keyword, language: lang })
      setProvider(r.provider)
      setArticles((prev) => [r.article, ...prev])
      setEditing(r.article)
      setStep('articles')
      note(`Artikel generiert (${r.provider}).`)
    } catch (e) { fail(e) } finally { setBusy(false) }
  }
  async function saveArticleEdits() {
    if (!editing) return
    setBusy(true); setError('')
    try {
      const r = await seoAutopilotClient.updateArticle(editing.id, {
        title: editing.title, meta_description: editing.meta_description, body_markdown: editing.body_markdown
      })
      setArticles((prev) => prev.map((a) => (a.id === r.article.id ? r.article : a)))
      setEditing(r.article); note('Artikel gespeichert.')
    } catch (e) { fail(e) } finally { setBusy(false) }
  }
  async function approveArticle(a: SeoArticle) {
    setBusy(true); setError('')
    try {
      const r = await seoAutopilotClient.updateArticle(a.id, { status: 'approved' })
      setArticles((prev) => prev.map((x) => (x.id === r.article.id ? r.article : x)))
      if (editing?.id === a.id) setEditing(r.article)
      note('Artikel freigegeben.')
    } catch (e) { fail(e) } finally { setBusy(false) }
  }
  async function removeArticle(a: SeoArticle) {
    setBusy(true); setError('')
    try {
      await seoAutopilotClient.deleteArticle(a.id)
      setArticles((prev) => prev.filter((x) => x.id !== a.id))
      if (editing?.id === a.id) setEditing(null)
    } catch (e) { fail(e) } finally { setBusy(false) }
  }
  async function publishArticle(a: SeoArticle) {
    setBusy(true); setError('')
    try {
      const r = await seoAutopilotClient.publishArticle(a.id)
      setArticles((prev) => prev.map((x) => (x.id === r.article.id ? r.article : x)))
      if (editing?.id === a.id) setEditing(r.article)
      note(`Veröffentlicht unter ${r.article.published_url}`)
    } catch (e) { fail(e) } finally { setBusy(false) }
  }
  async function unpublishArticle(a: SeoArticle) {
    setBusy(true); setError('')
    try {
      const r = await seoAutopilotClient.unpublishArticle(a.id)
      setArticles((prev) => prev.map((x) => (x.id === r.article.id ? r.article : x)))
      if (editing?.id === a.id) setEditing(r.article)
      note('Artikel zurückgezogen.')
    } catch (e) { fail(e) } finally { setBusy(false) }
  }
  async function genCover(a: SeoArticle) {
    setBusy(true); setError('')
    try {
      const r = await seoAutopilotClient.generateCover(a.id)
      setArticles((prev) => prev.map((x) => (x.id === r.article.id ? r.article : x)))
      if (editing?.id === a.id) setEditing(r.article)
      note(`Titelbild generiert (${r.provider}).`)
    } catch (e) { fail(e) } finally { setBusy(false) }
  }

  // Autopilot-Schedule
  async function saveSchedule() {
    if (!customerId) return fail(new Error('Bitte zuerst eine Kunden-ID eingeben.'))
    setBusy(true); setError('')
    try {
      const r = await seoAutopilotClient.saveSchedule({ ...schedule, customer_id: customerId })
      setSchedule(r.schedule); note('Autopilot-Einstellungen gespeichert.')
    } catch (e) { fail(e) } finally { setBusy(false) }
  }

  if (authorized === null) return <div className="p-8 text-zinc-400">Lade…</div>
  if (!authorized) return <div className="p-8 text-rose-400">Kein Zugriff. Diese Seite ist nur für Admins.</div>

  return (
    <div className="mx-auto max-w-5xl p-6 text-zinc-100">
      <header className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Wand2 className="h-6 w-6 text-violet-400" /> SEO-Autopilot</h1>
        <p className="mt-1 text-sm text-zinc-400">
          KI-gestützte SEO-Inhalte pro Kunde: Brand-DNA, Keyword-Ideen und vollständige Artikel.
          {provider && <> Aktueller Modus: <b className="text-zinc-200">{provider === 'mock' ? 'Mock (ohne API-Key)' : provider}</b>.</>}
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
        <label className="flex-1 min-w-[260px] text-sm">
          <span className="mb-1 block text-zinc-400">Kunden-ID</span>
          <input value={customerId} onChange={(e) => setCustomerId(e.target.value.trim())}
            placeholder="UUID des Kunden"
            className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-500" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-400">Sprache</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)}
            className="rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-500">
            <option value="de">Deutsch</option>
            <option value="en">English</option>
            <option value="pl">Polski</option>
            <option value="fr">Français</option>
          </select>
        </label>
        <button onClick={() => loadAll(customerId)} disabled={!customerId || busy}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm font-semibold hover:bg-zinc-700 disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Laden
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-rose-700 bg-rose-950/50 px-4 py-2 text-sm text-rose-200">{error}</div>}
      {info && <div className="mb-4 rounded-lg border border-emerald-700 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-200">{info}</div>}

      <nav className="mb-5 flex gap-2">
        {STEPS.map((s) => {
          const Icon = s.icon
          return (
            <button key={s.key} onClick={() => setStep(s.key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${step === s.key ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
              <Icon className="h-4 w-4" /> {s.label}
            </button>
          )
        })}
      </nav>

      {/* Brand-DNA */}
      {step === 'brand' && (
        <section className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/40 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm"><span className="mb-1 block text-zinc-400">Website (optional)</span>
              <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://…"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-500" /></label>
            <label className="text-sm"><span className="mb-1 block text-zinc-400">Zusatzinfos (optional)</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Besonderheiten, Schwerpunkte…"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-500" /></label>
          </div>
          <div className="flex gap-2">
            <button onClick={genBrand} disabled={busy || !customerId}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40">
              <Sparkles className="h-4 w-4" /> Brand-DNA generieren
            </button>
            {brand && <button onClick={saveBrand} disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm font-semibold hover:bg-zinc-700 disabled:opacity-40">
              <Check className="h-4 w-4" /> Speichern
            </button>}
          </div>
          {brand && (
            <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-950/60 p-4 text-sm">
              <label className="block"><span className="mb-1 block text-zinc-400">Zielgruppe</span>
                <textarea value={brand.audience || ''} onChange={(e) => setBrand({ ...brand, audience: e.target.value })}
                  rows={2} className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 outline-none focus:border-violet-500" /></label>
              <label className="block"><span className="mb-1 block text-zinc-400">Markenton</span>
                <input value={brand.tone || ''} onChange={(e) => setBrand({ ...brand, tone: e.target.value })}
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 outline-none focus:border-violet-500" /></label>
              <div><span className="mb-1 block text-zinc-400">Themen</span>
                <div className="flex flex-wrap gap-2">{(brand.topics || []).map((t, i) => <span key={i} className="rounded-full bg-zinc-800 px-2 py-1 text-xs">{t}</span>)}</div></div>
              <div><span className="mb-1 block text-zinc-400">Kernnutzen</span>
                <div className="flex flex-wrap gap-2">{(brand.value_props || []).map((t, i) => <span key={i} className="rounded-full bg-violet-900/50 px-2 py-1 text-xs">{t}</span>)}</div></div>
            </div>
          )}
        </section>
      )}

      {/* Keywords */}
      {step === 'keywords' && (
        <section className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/40 p-5">
          <div className="flex gap-2">
            <button onClick={genKeywords} disabled={busy || !customerId}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40">
              <KeyRound className="h-4 w-4" /> Keyword-Ideen generieren
            </button>
            {keywords.length > 0 && <button onClick={saveKeywords} disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm font-semibold hover:bg-zinc-700 disabled:opacity-40">
              <Check className="h-4 w-4" /> Auswahl speichern
            </button>}
          </div>
          <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-700">
            {keywords.length === 0 && <div className="p-4 text-sm text-zinc-500">Noch keine Keywords. Generiere Ideen oder lade gespeicherte.</div>}
            {keywords.map((k) => (
              <div key={k.keyword} className="flex items-center gap-3 p-3 text-sm">
                <input type="checkbox" checked={!!selected[k.keyword]} onChange={(e) => setSelected({ ...selected, [k.keyword]: e.target.checked })}
                  className="h-4 w-4 accent-violet-500" />
                <span className="flex-1 font-medium">{k.keyword}</span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{k.intent}</span>
                <span className="text-xs text-zinc-400">Prio {k.priority}</span>
                <button onClick={() => genArticle(k.keyword)} disabled={busy}
                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs font-semibold hover:bg-zinc-700 disabled:opacity-40">
                  <FileText className="h-3.5 w-3.5" /> Artikel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Artikel */}
      {step === 'articles' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-zinc-700 bg-zinc-900/40 p-4">
            <h2 className="text-sm font-semibold text-zinc-300">Artikel ({articles.length})</h2>
            {articles.length === 0 && <div className="text-sm text-zinc-500">Noch keine Artikel. Generiere einen über die Keyword-Liste.</div>}
            {articles.map((a) => (
              <div key={a.id} className={`rounded-lg border p-3 text-sm ${editing?.id === a.id ? 'border-violet-500 bg-violet-950/20' : 'border-zinc-700 bg-zinc-950/40'}`}>
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => setEditing(a)} className="flex-1 text-left font-medium hover:text-violet-300">{a.title}</button>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                  <span>{a.keyword}</span><span>·</span><span>{a.provider}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {a.status === 'draft' && <button onClick={() => approveArticle(a)} disabled={busy}
                    className="inline-flex items-center gap-1 rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-emerald-50 hover:bg-emerald-600 disabled:opacity-40">
                    <Check className="h-3.5 w-3.5" /> Freigeben
                  </button>}
                  {a.status === 'approved' && <button onClick={() => publishArticle(a)} disabled={busy}
                    className="inline-flex items-center gap-1 rounded bg-violet-700 px-2 py-1 text-xs font-semibold text-violet-50 hover:bg-violet-600 disabled:opacity-40">
                    <Globe className="h-3.5 w-3.5" /> Veröffentlichen
                  </button>}
                  {a.status === 'published' && <>
                    {a.published_url && <a href={a.published_url} target="_blank" rel="noopener"
                      className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-violet-300 hover:bg-zinc-700">
                      <Globe className="h-3.5 w-3.5" /> Live ansehen
                    </a>}
                    <button onClick={() => unpublishArticle(a)} disabled={busy}
                      className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-40">
                      <EyeOff className="h-3.5 w-3.5" /> Zurückziehen
                    </button>
                  </>}
                  <button onClick={() => removeArticle(a)} disabled={busy}
                    className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300 hover:bg-rose-900 disabled:opacity-40">
                    <Trash2 className="h-3.5 w-3.5" /> Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-zinc-700 bg-zinc-900/40 p-4">
            {!editing && <div className="text-sm text-zinc-500">Wähle links einen Artikel zum Bearbeiten/Vorschau.</div>}
            {editing && (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-zinc-400">Titelbild</span>
                    <button onClick={() => genCover(editing)} disabled={busy}
                      className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs font-semibold hover:bg-zinc-700 disabled:opacity-40">
                      <ImageIcon className="h-3.5 w-3.5" /> {editing.cover_image_url ? 'Neu generieren' : 'Generieren'}
                    </button>
                  </div>
                  {editing.cover_image_url
                    ? <img src={editing.cover_image_url} alt="" className="w-full rounded-lg border border-zinc-700" />
                    : <div className="rounded-lg border border-dashed border-zinc-700 px-3 py-6 text-center text-xs text-zinc-500">Noch kein Titelbild</div>}
                </div>
                <label className="block"><span className="mb-1 block text-zinc-400">Titel ({(editing.title || '').length} Zeichen)</span>
                  <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 outline-none focus:border-violet-500" /></label>
                <label className="block"><span className="mb-1 block text-zinc-400">Meta-Description ({(editing.meta_description || '').length} Zeichen)</span>
                  <textarea value={editing.meta_description || ''} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })}
                    rows={2} className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 outline-none focus:border-violet-500" /></label>
                <label className="block"><span className="mb-1 block text-zinc-400">Inhalt (Markdown)</span>
                  <textarea value={editing.body_markdown} onChange={(e) => setEditing({ ...editing, body_markdown: e.target.value })}
                    rows={16} className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 font-mono text-xs outline-none focus:border-violet-500" /></label>
                {!!(editing.internal_link_ideas || []).length && (
                  <div><span className="mb-1 block text-zinc-400">Interne Link-Ideen</span>
                    <div className="flex flex-wrap gap-2">{(editing.internal_link_ideas || []).map((t, i) => <span key={i} className="rounded-full bg-zinc-800 px-2 py-1 text-xs">{t}</span>)}</div></div>
                )}
                <div className="flex gap-2">
                  <button onClick={saveArticleEdits} disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40">
                    <Check className="h-4 w-4" /> Speichern
                  </button>
                  {editing.status === 'draft' && <button onClick={() => approveArticle(editing)} disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-600 disabled:opacity-40">
                    <Check className="h-4 w-4" /> Freigeben
                  </button>}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Autopilot */}
      {step === 'autopilot' && (
        <section className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/40 p-5">
          <p className="text-sm text-zinc-400">
            Der Autopilot erzeugt automatisch neue Artikel aus den gespeicherten Keywords dieses Kunden.
            Ein Cron-Worker prüft fällige Pläne und legt Entwürfe an – oder veröffentlicht direkt, wenn „Auto-Publish“ aktiv ist.
          </p>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={schedule.enabled} onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })}
              className="h-4 w-4 accent-violet-500" />
            <span className="font-semibold">Autopilot aktiv</span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Takt</span>
            <select value={schedule.cadence} onChange={(e) => setSchedule({ ...schedule, cadence: e.target.value as 'daily' | 'weekly' })}
              className="rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-500">
              <option value="weekly">Wöchentlich</option>
              <option value="daily">Täglich</option>
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={schedule.auto_publish} onChange={(e) => setSchedule({ ...schedule, auto_publish: e.target.checked })}
              className="h-4 w-4 accent-violet-500" />
            <span>
              <span className="font-semibold">Auto-Publish</span>
              <span className="ml-2 text-zinc-400">– Artikel direkt live stellen (sonst nur Entwurf zur Freigabe).</span>
            </span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Veröffentlichungs-Ziel</span>
            <select value={schedule.target_type || 'in_app'} onChange={(e) => setSchedule({ ...schedule, target_type: e.target.value as 'in_app' | 'wordpress' })}
              className="rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-500">
              <option value="in_app">In-House-Blog (/blog)</option>
              <option value="wordpress">WordPress (REST API)</option>
            </select>
          </label>
          {schedule.target_type === 'wordpress' && (
            <div className="grid gap-3 rounded-lg border border-zinc-700 bg-zinc-950/50 p-4 sm:grid-cols-3">
              <label className="text-sm sm:col-span-3"><span className="mb-1 block text-zinc-400">WordPress-URL</span>
                <input value={schedule.target_config?.wp_url || ''} placeholder="https://kunde.de"
                  onChange={(e) => setSchedule({ ...schedule, target_config: { ...schedule.target_config, wp_url: e.target.value } })}
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 outline-none focus:border-violet-500" /></label>
              <label className="text-sm"><span className="mb-1 block text-zinc-400">Benutzer</span>
                <input value={schedule.target_config?.wp_user || ''}
                  onChange={(e) => setSchedule({ ...schedule, target_config: { ...schedule.target_config, wp_user: e.target.value } })}
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 outline-none focus:border-violet-500" /></label>
              <label className="text-sm sm:col-span-2"><span className="mb-1 block text-zinc-400">Application Password {schedule.target_config?.wp_app_password_set && <span className="text-emerald-400">· gespeichert</span>}</span>
                <input type="password" value={schedule.target_config?.wp_app_password || ''}
                  placeholder={schedule.target_config?.wp_app_password_set ? '•••••••• (leer lassen = behalten)' : ''}
                  onChange={(e) => setSchedule({ ...schedule, target_config: { ...schedule.target_config, wp_app_password: e.target.value } })}
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 outline-none focus:border-violet-500" /></label>
              <p className="text-xs text-zinc-500 sm:col-span-3">Verschlüsselt gespeichert (AES-256-GCM, sofern SEO_SECRET_KEY gesetzt). Ohne vollständige Zugangsdaten läuft die Veröffentlichung im Mock-Modus.</p>
            </div>
          )}
          {schedule.next_run_at && <div className="text-xs text-zinc-500">Nächster Lauf: {new Date(schedule.next_run_at).toLocaleString('de-DE')}</div>}
          {schedule.last_run_at && <div className="text-xs text-zinc-500">Letzter Lauf: {new Date(schedule.last_run_at).toLocaleString('de-DE')}</div>}
          <button onClick={saveSchedule} disabled={busy || !customerId}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40">
            <Check className="h-4 w-4" /> Speichern
          </button>
        </section>
      )}
    </div>
  )
}
