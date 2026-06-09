const express = require('express')
const { AutomationEngine, DEFAULT_RULES } = require('../services/automationEngine')

// Admin-Routen fuer die Verwaltung der Cross-Modul-Workflows.
// Alle Routen werden im server.js mit requireAdmin gemountet.

function automationRoutes(supabase) {
  const router = express.Router()

  // Liste aller Regeln. Defaults werden gemergt: in-Code-Default wird
  // angezeigt, falls in workflow_rules noch kein Eintrag mit gleichem
  // name existiert.
  router.get('/rules', async (req, res, next) => {
    try {
      if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert' })
      const { data, error } = await supabase
        .from('workflow_rules')
        .select('id, name, trigger_type, conditions, actions, enabled, created_at')
        .order('name', { ascending: true })
      if (error) throw error
      const dbByName = new Map((data || []).map((r) => [r.name, r]))
      const merged = DEFAULT_RULES.map((def) => {
        const row = dbByName.get(def.name)
        return row
          ? { ...def, ...row, source: 'database' }
          : { ...def, id: null, source: 'default' }
      })
      // Zusaetzliche Regeln in der DB, die nicht in DEFAULT_RULES stehen, dranhaengen.
      for (const row of data || []) {
        if (!DEFAULT_RULES.some((d) => d.name === row.name)) {
          merged.push({ ...row, source: 'database' })
        }
      }
      res.json({ ok: true, rules: merged })
    } catch (e) { next(e) }
  })

  // Toggle enabled. Wenn die Regel noch nicht in der DB liegt (nur Default),
  // wird sie beim ersten Toggle persistiert, damit die Aenderung auch nach
  // einem Default-Update erhalten bleibt.
  router.post('/rules/:name/toggle', async (req, res, next) => {
    try {
      if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert' })
      const name = String(req.params.name || '').trim()
      if (!name) return res.status(400).json({ ok: false, error: 'name fehlt' })

      const desired = req.body?.enabled
      const enabled = typeof desired === 'boolean' ? desired : null

      const { data: existing } = await supabase
        .from('workflow_rules')
        .select('id, enabled')
        .eq('name', name)
        .maybeSingle()

      if (existing) {
        const nextEnabled = enabled === null ? !existing.enabled : enabled
        const { data, error } = await supabase
          .from('workflow_rules')
          .update({ enabled: nextEnabled })
          .eq('id', existing.id)
          .select('id, name, enabled')
          .maybeSingle()
        if (error) throw error
        return res.json({ ok: true, rule: data })
      }

      const def = DEFAULT_RULES.find((d) => d.name === name)
      if (!def) return res.status(404).json({ ok: false, error: 'Regel nicht bekannt' })
      const nextEnabled = enabled === null ? !def.enabled : enabled
      const { data, error } = await supabase
        .from('workflow_rules')
        .insert({
          name: def.name,
          trigger_type: def.trigger_type,
          conditions: def.conditions || {},
          actions: def.actions || [],
          enabled: nextEnabled
        })
        .select('id, name, enabled')
        .maybeSingle()
      if (error) throw error
      res.json({ ok: true, rule: data })
    } catch (e) { next(e) }
  })

  // Manuelles Triggern: Engine einmal jetzt laufen lassen. Praktisch fuer
  // den Admin-Button "Workflows jetzt ausfuehren".
  router.post('/run-now', async (req, res, next) => {
    try {
      if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert' })
      const engine = new AutomationEngine(supabase)
      const result = await engine.runAll()
      res.json({ ok: true, result })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = automationRoutes
