// Admin AI Routes — Chat, Agent (SSE), GitHub-Integration, PDF, Keywords.
//
// Registration in server.js:
//   const adminAiRoutes = require('./routes/adminAiRoutes')
//   app.use('/api/admin/ai', authMiddleware, requireAdmin, adminAiRoutes(supabaseAdmin))
//
// requireAdmin prueft req.user.role === 'admin' (oder entsprechendes Flag).

const express = require('express')
const { randomUUID } = require('crypto')
const rateLimit = require('express-rate-limit')
const adminAiService       = require('../services/adminAiService')
const agentService         = require('../services/agentService')
const agentRegistryService = require('../services/agentRegistryService')
const agentMemoryService   = require('../services/agentMemoryService')
const githubService        = require('../services/githubService')
const pdfReportService     = require('../services/pdfReportService')
const mcpClientService     = require('../services/mcpClientService')

const adminAiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.ADMIN_AI_RATE_LIMIT_PER_MIN || 30),
  standardHeaders: true, legacyHeaders: false,
  message: { ok: false, error: 'Zu viele Anfragen. Bitte kurz warten.' }
})

// Bestaetigungs-Map: `userId::requestId` → { resolve, reject }
// Scoped pro User-ID — verhindert dass User A die Confirmation von User B abfangen kann.
const pendingConfirmations = new Map()

function makePendingKey(userId, requestId) {
  return `${String(userId)}::${requestId}`
}

function makeWaitForConfirmation(userId, timeoutMs = 120_000) {
  return function waitForConfirmation(requestId) {
    const key = makePendingKey(userId, requestId)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingConfirmations.delete(key)
        reject(new Error('Bestaetigungs-Timeout (120s) — Operation abgebrochen'))
      }, timeoutMs)
      pendingConfirmations.set(key, {
        resolve: (v) => { clearTimeout(timer); pendingConfirmations.delete(key); resolve(v) },
        reject:  (e) => { clearTimeout(timer); pendingConfirmations.delete(key); reject(e) }
      })
    })
  }
}

function cleanupUserConfirmations(userId) {
  const prefix = `${String(userId)}::`
  for (const key of pendingConfirmations.keys()) {
    if (key.startsWith(prefix)) {
      pendingConfirmations.get(key)?.reject(new Error('Verbindung getrennt'))
      pendingConfirmations.delete(key)
    }
  }
}

// Strengeres Limit fuer Agent-Runs (teuer, da viele API-Calls)
const agentRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 Stunde
  limit: Number(process.env.AGENT_RUNS_PER_HOUR || 10),
  standardHeaders: true, legacyHeaders: false,
  message: { ok: false, error: 'Agent-Limit erreicht. Pro Stunde sind max 10 Laeufe erlaubt.' }
})

const fileReadRateLimit = rateLimit({
  windowMs: 60 * 1000, limit: 120,
  standardHeaders: true, legacyHeaders: false,
  message: { ok: false, error: 'Zu viele Datei-Anfragen.' }
})

module.exports = (supabaseAdmin) => {
  const router = express.Router()

  // ──────────────────────────────────────────────────────────────────────────
  // AGENT — SSE Streaming (Kern-Feature: wie Claude Code)
  // ──────────────────────────────────────────────────────────────────────────

  // POST /api/admin/ai/agent/run
  // Body: { task, branch?, createPR? }
  // Response: text/event-stream (SSE)
  //
  // Event-Format: data: {"type":"...","...":"..."}\n\n
  // Event-Typen:  thinking | tool_call | tool_result | tool_error |
  //               file_changed | complete | max_steps | pr_created | error | done
  // GET /api/admin/ai/agent/memory — letzte Agent-Runs
  router.get('/agent/memory', async (req, res, next) => {
    try {
      const runs = await agentMemoryService.getRecentMemory(supabaseAdmin, 10)
      res.json({ ok: true, runs: runs || [] })
    } catch (e) { next(e) }
  })

  // POST /api/admin/ai/agent/confirm — Bestaetigungs-Antwort fuer laufenden Agent
  router.post('/agent/confirm', adminAiRateLimit, (req, res) => {
    const { requestId, approved } = req.body
    if (!requestId || typeof requestId !== 'string') return res.status(400).json({ ok: false, error: 'requestId fehlt' })
    const key     = makePendingKey(req.user.id, requestId)
    const pending = pendingConfirmations.get(key)
    if (!pending)  return res.json({ ok: false, error: 'Unbekannte requestId (bereits beantwortet oder abgelaufen)' })
    pending.resolve(!!approved)
    res.json({ ok: true })
  })

  const BRANCH_SAFE = /^[a-zA-Z0-9._\-/]+$/

  router.post('/agent/run', agentRateLimit, async (req, res) => {
    const { task, branch, createPR = true, agentSlug, confirmationMode = false } = req.body

    if (!task || !String(task).trim()) {
      return res.status(400).json({ ok: false, error: 'task Pflichtfeld' })
    }

    // Branch-Name validieren (verhindert Sonderzeichen in GitHub-API-URLs)
    const safeBranch = String(branch || 'main').slice(0, 100)
    if (!BRANCH_SAFE.test(safeBranch)) {
      return res.status(400).json({ ok: false, error: 'Ungültiger Branch-Name (nur Buchstaben, Zahlen, ., _, -, / erlaubt)' })
    }

    // Optionalen Custom-Agent aus Registry laden
    let agentConfig = null
    if (agentSlug) {
      try { agentConfig = await agentRegistryService.getAgent(supabaseAdmin, agentSlug) }
      catch { /* Fallback auf Default-Agent */ }
    }

    // Letzte Agent-Runs als Gedaechtnis laden
    const recentMemory  = await agentMemoryService.getRecentMemory(supabaseAdmin, req.user.id)
    const memoryBlock   = agentMemoryService.formatMemoryBlock(recentMemory)
    const waitConfirm   = confirmationMode ? makeWaitForConfirmation(req.user.id) : null

    // SSE-Headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // nginx buffering deaktivieren
    res.flushHeaders()

    function send(data) {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(data)}\n\n`)
        // Bei manchen Node-Versionen noetig fuer sofortiges Flushing
        if (typeof res.flush === 'function') res.flush()
      }
    }

    // Bei SSE-Disconnect: hängige Confirmations für diesen User aufräumen
    req.on('close', () => { if (confirmationMode) cleanupUserConfirmations(req.user.id) })

    try {
      const result = await agentService.runAgent({
        task:                String(task).trim(),
        branch:              safeBranch,
        agentConfig,
        waitForConfirmation: waitConfirm,
        memoryBlock,
        onEvent:             send
      })

      // Erfolgreichen Run im Gedaechtnis speichern
      if (result.summary) {
        await agentMemoryService.saveMemory(supabaseAdmin, {
          userId:    req.user.id,
          task:      String(task).trim(),
          summary:   result.summary,
          files:     [...(result.stagedFiles?.keys() || [])],
          branch:    safeBranch,
          prUrl:     result.prUrl,
          prNumber:  result.prNumber,
          agentSlug: agentSlug || null,
          provider:  result.provider || null,
          stepsUsed: result.stepsUsed || null
        })
      }

      // PR erstellen wenn Dateien geaendert wurden
      if (createPR && result.stagedFiles && result.stagedFiles.size > 0) {
        send({ type: 'creating_pr', filesCount: result.stagedFiles.size })
        try {
          const safeName = task.slice(0, 40).replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
          const branchName = `ai/${Date.now()}-${safeName}`

          await githubService.createBranch(branchName, safeBranch)

          const files = Array.from(result.stagedFiles.entries()).map(([path, content]) => ({ path, content }))
          await githubService.commitMultipleFiles(branchName, files, result.prTitle || `AI: ${task.slice(0, 60)}`)

          const pr = await githubService.createPR({
            title: result.prTitle || `AI: ${task.slice(0, 70)}`,
            body: result.prBody || `## Aufgabe\n\n${task}\n\n---\n_Generiert von MMOS Admin AI Agent_ 🤖`,
            head: branchName,
            base: safeBranch,
            draft: true
          })

          send({
            type: 'pr_created',
            pr: { url: pr.html_url, number: pr.number, title: pr.title },
            branch: branchName,
            filesCommitted: files.length
          })
        } catch (prErr) {
          console.error('[agent/run] PR-Erstellung fehlgeschlagen:', prErr.message, { userId: req.user?.id })
          send({ type: 'error', message: 'PR-Erstellung fehlgeschlagen. Bitte manuell erstellen.' })
        }
      } else if (result.stagedFiles && result.stagedFiles.size === 0) {
        send({ type: 'no_changes', message: 'Keine Datei-Aenderungen — kein PR erstellt.' })
      }
    } catch (e) {
      console.error('[agent/run] Fehler:', e.message, { userId: req.user?.id })
      send({ type: 'error', message: 'Agent-Fehler. Bitte erneut versuchen.' })
    } finally {
      send({ type: 'done' })
      res.end()
    }
  })

  // GET /api/admin/ai/agent/status
  // Gibt Konfiguration zurueck (max steps, rate limit etc.)
  router.get('/agent/status', async (req, res) => {
    const rawProvider = (process.env.AGENT_PROVIDER || process.env.AI_PROVIDER || 'ollama').toLowerCase()
    const provider = rawProvider === 'groq' && process.env.GROQ_API_KEY      ? 'groq'
                   : rawProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY ? 'anthropic'
                   : 'ollama'
    const model = provider === 'groq'      ? (process.env.GROQ_MODEL    || 'llama-3.3-70b-versatile')
                : provider === 'anthropic' ? (process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6')
                :                            (process.env.OLLAMA_MODEL   || 'qwen2.5-coder:7b')
    res.json({ ok: true, config: { maxSteps: agentService.MAX_STEPS, model, provider } })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // MCP — Model Context Protocol Server Verwaltung
  // ──────────────────────────────────────────────────────────────────────────

  // GET /api/admin/ai/mcp/status — Status aller konfigurierten MCP-Server
  router.get('/mcp/status', async (req, res, next) => {
    try {
      const servers = await mcpClientService.getServerStatus()
      res.json({ ok: true, servers })
    } catch (e) { next(e) }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // ADMIN CHAT (mit Bild-Support)
  // ──────────────────────────────────────────────────────────────────────────

  router.post('/chat', adminAiRateLimit, async (req, res, next) => {
    try {
      const { messages, context, images } = req.body
      if (!Array.isArray(messages) || !messages.length) {
        return res.status(400).json({ ok: false, error: 'messages Pflichtfeld' })
      }
      // images: [{ data: base64string, mediaType: 'image/jpeg' }]
      const safeImages = Array.isArray(images) ? images.slice(0, 3).map(img => ({
        data:      String(img.data || '').slice(0, 5_000_000),  // max ~5MB base64
        mediaType: ['image/jpeg','image/png','image/gif','image/webp'].includes(img.mediaType) ? img.mediaType : 'image/jpeg'
      })) : []
      const result = await adminAiService.adminChat({ messages, context: context || {}, images: safeImages })
      res.json({ ok: true, ...result })
    } catch (e) { next(e) }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // GITHUB: REPO LESEN
  // ──────────────────────────────────────────────────────────────────────────

  router.get('/github/tree', fileReadRateLimit, async (req, res, next) => {
    try {
      const tree = await githubService.getRepoTree(req.query.ref || 'main')
      res.json({ ok: true, tree })
    } catch (e) { next(e) }
  })

  router.get('/github/file', fileReadRateLimit, async (req, res, next) => {
    try {
      const { path, ref } = req.query
      if (!path) return res.status(400).json({ ok: false, error: 'path Pflichtfeld' })
      if (/(\.\.|\.env(\.[^/]*)?$|\.key$|\.pem$|\.p12$|\.pfx$)/i.test(String(path))) {
        return res.status(403).json({ ok: false, error: 'Dateityp nicht erlaubt' })
      }
      const content = await githubService.getFile(String(path), String(ref || 'main'))
      res.json({ ok: true, path, content })
    } catch (e) { next(e) }
  })

  router.post('/github/search-code', fileReadRateLimit, async (req, res, next) => {
    try {
      const { query } = req.body
      if (!query) return res.status(400).json({ ok: false, error: 'query Pflichtfeld' })
      const results = await githubService.searchCode(String(query))
      res.json({ ok: true, results })
    } catch (e) { next(e) }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // GITHUB: ISSUES & PRs
  // ──────────────────────────────────────────────────────────────────────────

  router.get('/github/issues', fileReadRateLimit, async (req, res, next) => {
    try {
      const issues = await githubService.listIssues({ state: req.query.state || 'open', labels: req.query.labels || '' })
      res.json({ ok: true, issues })
    } catch (e) { next(e) }
  })

  router.post('/github/issue', adminAiRateLimit, async (req, res, next) => {
    try {
      const { title, body, labels, assignees } = req.body
      if (!title) return res.status(400).json({ ok: false, error: 'title Pflichtfeld' })
      const issue = await githubService.createIssue({
        title: String(title).slice(0, 256), body: String(body || ''),
        labels: Array.isArray(labels) ? labels : [],
        assignees: Array.isArray(assignees) ? assignees : []
      })
      res.json({ ok: true, issue: { number: issue.number, url: issue.html_url, title: issue.title } })
    } catch (e) { next(e) }
  })

  router.post('/github/issue/ai', adminAiRateLimit, async (req, res, next) => {
    try {
      const { description, type } = req.body
      if (!description) return res.status(400).json({ ok: false, error: 'description Pflichtfeld' })
      const issueData = await adminAiService.generateIssueContent({ description, type: type || 'bug' })
      const issue = await githubService.createIssue(issueData)
      res.json({ ok: true, issue: { number: issue.number, url: issue.html_url, title: issue.title }, generated: issueData })
    } catch (e) { next(e) }
  })

  router.get('/github/prs', fileReadRateLimit, async (req, res, next) => {
    try {
      const prs = await githubService.listPRs({ state: req.query.state || 'open' })
      res.json({ ok: true, prs })
    } catch (e) { next(e) }
  })

  router.post('/github/review', adminAiRateLimit, async (req, res, next) => {
    try {
      const prNumber = Number(req.body?.prNumber)
      if (!prNumber) return res.status(400).json({ ok: false, error: 'prNumber Pflichtfeld' })
      const [pr, files] = await Promise.all([githubService.getPRDetails(prNumber), githubService.getPRFiles(prNumber)])
      const result = await adminAiService.reviewPRContent({ prTitle: pr.title, prBody: pr.body, files })
      res.json({ ok: true, ...result, pr: { title: pr.title, url: pr.html_url, number: pr.number } })
    } catch (e) { next(e) }
  })

  router.post('/github/review/submit', adminAiRateLimit, async (req, res, next) => {
    try {
      const { prNumber, body, event } = req.body
      if (!prNumber || !body) return res.status(400).json({ ok: false, error: 'prNumber und body Pflicht' })
      const review = await githubService.submitPRReview({ prNumber, body, event: event || 'COMMENT' })
      res.json({ ok: true, review: { id: review.id, state: review.state } })
    } catch (e) { next(e) }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // KEYWORD ANALYSE
  // ──────────────────────────────────────────────────────────────────────────

  router.post('/keywords', adminAiRateLimit, async (req, res, next) => {
    try {
      const { businessType, location, language, competitors } = req.body
      if (!businessType) return res.status(400).json({ ok: false, error: 'businessType Pflichtfeld' })
      const analysis = await adminAiService.analyzeKeywords({
        businessType, location, language: language || 'de',
        competitors: Array.isArray(competitors) ? competitors : []
      })
      res.json({ ok: true, analysis })
    } catch (e) { next(e) }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // PDF REPORTS
  // ──────────────────────────────────────────────────────────────────────────

  router.post('/pdf/keywords', adminAiRateLimit, async (req, res, next) => {
    try {
      const { analysis, businessType, location } = req.body
      if (!analysis) return res.status(400).json({ ok: false, error: 'analysis Pflichtfeld' })
      const buffer = await pdfReportService.generateKeywordReport({ analysis, businessType, location })
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="keyword-analyse-${Date.now()}.pdf"`, 'Content-Length': buffer.length })
      res.send(buffer)
    } catch (e) { next(e) }
  })

  router.post('/pdf/report', adminAiRateLimit, async (req, res, next) => {
    try {
      const { title, sections, author } = req.body
      if (!title || !Array.isArray(sections) || !sections.length) {
        return res.status(400).json({ ok: false, error: 'title und sections Pflicht' })
      }
      const buffer = await pdfReportService.generateMarketingReport({ title, sections, author })
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="report-${Date.now()}.pdf"`, 'Content-Length': buffer.length })
      res.send(buffer)
    } catch (e) { next(e) }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // AGENT & SKILL REGISTRY
  // ──────────────────────────────────────────────────────────────────────────

  // POST /api/admin/ai/registry/install — Package von GitHub-URL installieren
  router.post('/registry/install', adminAiRateLimit, async (req, res, next) => {
    const { url } = req.body
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ ok: false, error: 'url ist ein Pflichtfeld' })
    }
    try {
      const result = await agentRegistryService.installFromUrl(supabaseAdmin, url.trim())
      res.json({ ok: true, ...result })
    } catch (e) { next(e) }
  })

  // GET  /api/admin/ai/registry/agents
  router.get('/registry/agents', async (req, res, next) => {
    try {
      const agents = await agentRegistryService.listAgents(supabaseAdmin)
      res.json({ ok: true, agents })
    } catch (e) { next(e) }
  })

  // POST /api/admin/ai/registry/agents
  router.post('/registry/agents', adminAiRateLimit, async (req, res, next) => {
    try {
      const agent = await agentRegistryService.createAgent(supabaseAdmin, req.body)
      res.json({ ok: true, agent })
    } catch (e) { next(e) }
  })

  // PUT  /api/admin/ai/registry/agents/:id
  router.put('/registry/agents/:id', adminAiRateLimit, async (req, res, next) => {
    try {
      const agent = await agentRegistryService.updateAgent(supabaseAdmin, req.params.id, req.body)
      res.json({ ok: true, agent })
    } catch (e) { next(e) }
  })

  // DELETE /api/admin/ai/registry/agents/:id
  router.delete('/registry/agents/:id', adminAiRateLimit, async (req, res, next) => {
    try {
      await agentRegistryService.deleteAgent(supabaseAdmin, req.params.id)
      res.json({ ok: true })
    } catch (e) { next(e) }
  })

  // GET  /api/admin/ai/registry/skills
  router.get('/registry/skills', async (req, res, next) => {
    try {
      const skills = await agentRegistryService.listSkills(supabaseAdmin, { category: req.query.category })
      res.json({ ok: true, skills })
    } catch (e) { next(e) }
  })

  // POST /api/admin/ai/registry/skills
  router.post('/registry/skills', adminAiRateLimit, async (req, res, next) => {
    try {
      const skill = await agentRegistryService.createSkill(supabaseAdmin, req.body)
      res.json({ ok: true, skill })
    } catch (e) { next(e) }
  })

  // PUT  /api/admin/ai/registry/skills/:id
  router.put('/registry/skills/:id', adminAiRateLimit, async (req, res, next) => {
    try {
      const skill = await agentRegistryService.updateSkill(supabaseAdmin, req.params.id, req.body)
      res.json({ ok: true, skill })
    } catch (e) { next(e) }
  })

  // DELETE /api/admin/ai/registry/skills/:id
  router.delete('/registry/skills/:id', adminAiRateLimit, async (req, res, next) => {
    try {
      await agentRegistryService.deleteSkill(supabaseAdmin, req.params.id)
      res.json({ ok: true })
    } catch (e) { next(e) }
  })

  return router
}
