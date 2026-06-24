// Admin AI Service — Chat, Code-Review, Code-Generierung, Keyword-Analyse,
// und vollstaendige Code-Task-Loesung mit Datei-Kontext (wie Claude Code).
//
// Identisches Provider-Muster wie chatbotService / aiSocialPostService:
//   AI_PROVIDER=anthropic (Default) | openai | mock

const PROVIDERS   = ['groq', 'ollama', 'anthropic', 'openai', 'mock']
const GROQ_MODEL   = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile'
const OLLAMA_HOST  = process.env.OLLAMA_HOST  || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b'

function provider() {
  const p = String(process.env.AI_PROVIDER || 'ollama').toLowerCase()
  if (!PROVIDERS.includes(p)) return 'ollama'
  if (p === 'groq'      && !process.env.GROQ_API_KEY)      return 'ollama'
  if (p === 'anthropic' && !process.env.ANTHROPIC_API_KEY) return 'ollama'
  if (p === 'openai'    && !process.env.OPENAI_API_KEY)    return 'ollama'
  return p
}

// Baut multimodalen Content-Block auf (Text + optionale Bilder)
// images: [{ data: base64, mediaType: 'image/jpeg' }]
function buildUserContent(text, images = []) {
  if (!images.length) return text
  // Anthropic-Format: content-Array mit image + text blocks
  return [
    ...images.map(img => ({
      type:   'image',
      source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.data }
    })),
    { type: 'text', text }
  ]
}

// OpenAI-Format fuer Bilder (Groq + OpenAI)
function buildOpenAiMessages(system, messages, images = []) {
  const msgs = [{ role: 'system', content: system }]
  const last  = messages[messages.length - 1]
  for (let i = 0; i < messages.length - 1; i++) msgs.push(messages[i])
  if (!images.length) {
    msgs.push(last)
  } else {
    // Letztes User-Nachricht mit Bildern anreichern
    const content = [
      ...images.map(img => ({
        type:      'image_url',
        image_url: { url: `data:${img.mediaType || 'image/jpeg'};base64,${img.data}` }
      })),
      { type: 'text', text: typeof last.content === 'string' ? last.content : JSON.stringify(last.content) }
    ]
    msgs.push({ ...last, content })
  }
  return msgs
}

async function callAI({ system, messages, maxTokens = 2500, images = [] }) {
  const p = provider()

  if (p === 'mock') {
    const last = messages[messages.length - 1]?.content || ''
    const imgNote = images.length ? ` [${images.length} Bild(er) erkannt]` : ''
    return `[Mock] "${String(last).slice(0, 80)}..."${imgNote} — Ollama starten oder GROQ_API_KEY setzen.`
  }

  if (p === 'groq') {
    // Groq Vision: llama-3.2-11b-vision-preview oder llava
    const model = images.length ? (process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview') : GROQ_MODEL
    // Groq zaehlt reservierte Completion-Tokens (max_tokens) zur TPM-Grenze. Auf dem
    // Free-Tier (12000 TPM) fuehrt ein grosses max_tokens (z.B. 8000) sonst zu 413.
    const groqMaxTokens = Math.min(maxTokens, parseInt(process.env.GROQ_MAX_TOKENS || '2048', 10))
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model,
        messages:   buildOpenAiMessages(system, messages, images),
        temperature: 0.3,
        max_tokens:  groqMaxTokens
      })
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`Groq ${res.status}: ${t.slice(0, 200)}`)
    }
    const payload = await res.json()
    return payload?.choices?.[0]?.message?.content || ''
  }

  if (p === 'ollama') {
    // Ollama Vision: llava oder bakllava
    const model = images.length ? (process.env.OLLAMA_VISION_MODEL || 'llava') : OLLAMA_MODEL
    const lastMsg = messages[messages.length - 1]
    const ollamaMessages = images.length
      ? [...messages.slice(0, -1), {
          ...lastMsg,
          images: images.map(img => img.data)  // Ollama: rohe Base64-Strings
        }]
      : messages

    const res = await fetch(`${OLLAMA_HOST}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, ...ollamaMessages],
        stream: false,
        options: { num_ctx: 16384, temperature: 0.3 }
      })
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      if (res.status === 404) throw new Error(`Ollama-Modell nicht gefunden. Terminal: ollama pull ${model}`)
      throw new Error(`Ollama ${res.status}: ${t.slice(0, 200)}`)
    }
    const payload = await res.json()
    return payload?.choices?.[0]?.message?.content || ''
  }

  if (p === 'anthropic') {
    // Anthropic Claude Vision — nativ unterstuetzt
    const anthMessages = messages.map((m, idx) => {
      if (m.role === 'user' && idx === messages.length - 1 && images.length) {
        return { ...m, content: buildUserContent(typeof m.content === 'string' ? m.content : JSON.stringify(m.content), images) }
      }
      return m
    })
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system,
        messages:   anthMessages
      })
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`)
    }
    const payload = await res.json()
    return payload?.content?.[0]?.text || ''
  }

  if (p === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model:      process.env.OPENAI_MODEL || 'gpt-4o-mini',
        max_tokens: maxTokens,
        messages:   buildOpenAiMessages(system, messages, images)
      })
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`)
    }
    const payload = await res.json()
    return payload?.choices?.[0]?.message?.content || ''
  }
}

// ── Code-Task mit Datei-Kontext (Kern-Feature) ─────────────────────────────────
//
// fileContents: [{ path: 'backend/src/routes/xyz.js', content: '// vollst. Inhalt' }]
// task: Aufgabenbeschreibung auf Deutsch
//
// Gibt zurueck:
// {
//   analysis: string,              // Was die AI verstanden hat
//   changes: [                     // Welche Dateien geaendert werden
//     { file: 'pfad', content: 'vollstaendiger neuer Inhalt', isNew: bool }
//   ],
//   prTitle: string,
//   prBody: string,
//   description: string            // Commit-Message
// }

async function solveCodeTask({ task, fileContents = [], additionalContext = '' }) {
  // Datei-Kontext aufbauen (exakt wie Claude Code Dateien liest und versteht)
  const fileContext = fileContents.map(f =>
    `### ${f.path}\n\`\`\`${fileExtToLang(f.path)}\n${f.content}\n\`\`\``
  ).join('\n\n')

  const system = [
    'Du bist ein Senior Full-Stack Developer fuer das MecklenburgMarketingOS (MMOS).',
    '',
    '## Technischer Stack',
    '- Backend: Node.js + Express 5, CommonJS (require/module.exports)',
    '- Frontend: Next.js 16, TypeScript, React 19, App Router',
    '- Datenbank: Supabase PostgreSQL via getSupabaseAdmin() aus ../lib/supabaseAdmin',
    '- AI: Provider-Pattern (anthropic/openai/mock) via AI_PROVIDER env',
    '- Sicherheit: express-rate-limit, authMiddleware, Helmet',
    '- Route-Pattern: module.exports = (supabaseAdmin) => { const router = express.Router(); ...; return router }',
    '',
    '## Aufgabe',
    'Analysiere die bereitgestellten Dateien und loesung die Aufgabe praezise.',
    'Aendere NUR was noetig ist. Behalte Stil, Patterns und Kommentare der bestehenden Dateien.',
    'Erstelle keine TODOs oder Platzhalter — liefere vollstaendigen, produktionsreifen Code.',
    '',
    '## Antwort-Format',
    'Antworte AUSSCHLIESSLICH als JSON-Objekt (kein Text davor oder danach):',
    '{',
    '  "analysis": "Was du verstanden hast und was du aenderst (1-3 Saetze)",',
    '  "changes": [',
    '    {',
    '      "file": "genauer/pfad/zur/datei.js",',
    '      "content": "// vollstaendiger neuer Dateiinhalt...",',
    '      "isNew": false',
    '    }',
    '  ],',
    '  "prTitle": "feat/fix/refactor: kurzer Titel max 70 Zeichen",',
    '  "prBody": "## Aenderungen\\n\\n- Punkt 1\\n\\n## Getestet\\n\\n- [ ] Lokal getestet\\n\\n_Generiert von MMOS Admin AI_",',
    '  "description": "commit message kurz"',
    '}'
  ].join('\n')

  const userContent = [
    `## Aufgabe\n${task}`,
    additionalContext ? `## Zusaetzlicher Kontext\n${additionalContext}` : '',
    fileContext ? `## Bereitgestellte Dateien\n\n${fileContext}` : '(Keine Dateien ausgewaehlt — erstelle neue Dateien nach MMOS-Patterns)'
  ].filter(Boolean).join('\n\n')

  const text = await callAI({
    system,
    messages: [{ role: 'user', content: userContent }],
    // Groesseres Token-Limit fuer vollstaendige Datei-Inhalte
    maxTokens: 8000
  })

  try {
    // Robustes JSON-Parsing (AI gibt manchmal Markdown-Bloecke zurueck)
    const m = text.match(/\{[\s\S]*\}/)
    if (m) {
      const parsed = JSON.parse(m[0])
      return { ...parsed, provider: provider() }
    }
  } catch (_) {}

  // Fallback: roher Text
  return { analysis: text, changes: [], provider: provider() }
}

function fileExtToLang(path) {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript'
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript'
  if (path.endsWith('.css')) return 'css'
  if (path.endsWith('.json')) return 'json'
  if (path.endsWith('.sql')) return 'sql'
  if (path.endsWith('.md')) return 'markdown'
  return ''
}

// ── Allgemeiner Admin-Chat ──────────────────────────────────────────────────────

async function adminChat({ messages, context = {}, images = [] }) {
  const system = [
    'Du bist ein KI-Assistent fuer das MecklenburgMarketingOS (MMOS) Admin-Panel.',
    'Du hilfst bei: Marketing-Strategie, Content-Planung, Code-Analyse, SEO, GitHub-Issues/PRs, PDF-Reports.',
    'Stack: Node.js + Express 5 (CommonJS) Backend, Next.js 16 + TypeScript Frontend, Supabase PostgreSQL.',
    context.userName ? `Aktueller Admin: ${context.userName}` : '',
    context.currentPage ? `Aktuelle Seite: ${context.currentPage}` : '',
    images.length ? `Der Nutzer hat ${images.length} Bild(er) hochgeladen — beschreibe und analysiere sie.` : '',
    'Antworte auf Deutsch. Bei Code: produktionsreif, sicher, nach bestehenden Projekt-Patterns.'
  ].filter(Boolean).join('\n')

  return { reply: await callAI({ system, messages, maxTokens: 3000, images }), provider: provider() }
}

// ── PR-Code-Review ──────────────────────────────────────────────────────────────

async function reviewPRContent({ prTitle, prBody, files }) {
  const filesSummary = (files || []).slice(0, 12).map(f =>
    `### ${f.filename} (+${f.additions || 0}/-${f.deletions || 0})\n\`\`\`diff\n${(f.patch || '(kein Patch)').slice(0, 600)}\n\`\`\``
  ).join('\n\n')

  const system = [
    'Du bist ein erfahrener Code-Reviewer fuer das MecklenburgMarketingOS.',
    'Pruefe auf: Sicherheit (DSGVO, Auth, Injection), Performance, Codequalitaet, MMOS-Pattern-Konsistenz.',
    'Antworte auf Deutsch. Sei praezise und konstruktiv.'
  ].join('\n')

  const messages = [{
    role: 'user',
    content: `## PR: "${prTitle}"\n${prBody ? `Beschreibung: ${prBody}\n` : ''}\n${filesSummary}\n\nGib ein strukturiertes Review mit:\n1. **Zusammenfassung**\n2. **Positives**\n3. **Verbesserungsvorschlaege** (mit Codebeispielen)\n4. **Empfehlung:** Approve / Request Changes / Comment`
  }]

  return { review: await callAI({ system, messages, maxTokens: 2500 }), provider: provider() }
}

// ── Code generieren (einfach, ohne Datei-Kontext) ─────────────────────────────

async function generateCode({ task, fileHint, context = '' }) {
  const system = [
    'Du bist ein Senior Developer fuer das MecklenburgMarketingOS.',
    'Backend: Node.js + Express 5, CommonJS. Frontend: Next.js 16, TypeScript.',
    'Antworte AUSSCHLIESSLICH als JSON.'
  ].join('\n')

  const messages = [{
    role: 'user',
    content: `Aufgabe: ${task}\n${fileHint ? `Zieldatei: ${fileHint}` : ''}\n${context ? `Kontext: ${context}` : ''}\n\nJSON: {"file": "pfad", "code": "...", "prTitle": "...", "prBody": "...", "description": "..."}`
  }]

  const text = await callAI({ system, messages, maxTokens: 4000 })
  try {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) return { ...JSON.parse(m[0]), provider: provider() }
  } catch (_) {}
  return { code: text, description: task, provider: provider() }
}

// ── Keyword-Analyse ─────────────────────────────────────────────────────────────

async function analyzeKeywords({ businessType, location, language = 'de', competitors = [] }) {
  const system = [
    'Du bist ein SEO-Experte fuer lokale Unternehmen in Deutschland, speziell Mecklenburg-Vorpommern.',
    'Antworte AUSSCHLIESSLICH als JSON-Objekt.'
  ].join('\n')

  const messages = [{
    role: 'user',
    content: `Keyword-Analyse fuer:\n- Branche: ${businessType}\n- Standort: ${location || 'Mecklenburg-Vorpommern'}\n- Sprache: ${language}\n${competitors.length ? `- Konkurrenten: ${competitors.join(', ')}` : ''}\n\nJSON:\n{\n  "summary": "...",\n  "primaryKeywords": [{"keyword":"","intent":"","difficulty":"low|medium|high","volume":""}],\n  "longTailKeywords": [{"keyword":"","intent":"","suggestion":""}],\n  "localKeywords": [{"keyword":"","district":""}],\n  "contentIdeas": ["..."],\n  "quickWins": ["..."]\n}`
  }]

  const text = await callAI({ system, messages, maxTokens: 2500 })
  try {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) return { ...JSON.parse(m[0]), provider: provider() }
  } catch (_) {}
  return { raw: text, provider: provider() }
}

// ── Issue-Inhalt generieren ─────────────────────────────────────────────────────

async function generateIssueContent({ description, type = 'bug' }) {
  const system = 'Du bist ein Projekt-Manager fuer MecklenburgMarketingOS. Erstelle ein praezises GitHub Issue auf Deutsch.'
  const typeLabels = { bug: 'bug', feature: 'enhancement', chore: 'chore', security: 'security' }
  const messages = [{
    role: 'user',
    content: `Issue-Typ: ${type}\nBeschreibung: ${description}\n\nJSON: {"title":"max 80 Zeichen","body":"## Problem\\n\\n...\\n\\n## Erwartetes Verhalten\\n\\n...","labels":["${typeLabels[type] || 'enhancement'}"]}`
  }]
  const text = await callAI({ system, messages, maxTokens: 800 })
  try {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
  } catch (_) {}
  return { title: description.slice(0, 80), body: description, labels: [typeLabels[type] || 'enhancement'] }
}

module.exports = {
  solveCodeTask,
  adminChat,
  reviewPRContent,
  generateCode,
  analyzeKeywords,
  generateIssueContent
}
