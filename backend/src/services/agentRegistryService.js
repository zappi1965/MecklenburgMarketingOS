// Agent & Skill Registry — CRUD fuer mmos_agents und mmos_skills Tabellen

// ── Agents ─────────────────────────────────────────────────────────────────────

async function listAgents(supabaseAdmin, { includeInactive = false } = {}) {
  let q = supabaseAdmin.from('mmos_agents').select('*').order('is_builtin', { ascending: false }).order('name')
  if (!includeInactive) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw new Error(`listAgents: ${error.message}`)
  return data || []
}

async function getAgent(supabaseAdmin, slug) {
  const { data, error } = await supabaseAdmin.from('mmos_agents').select('*').eq('slug', slug).single()
  if (error) throw new Error(`getAgent: ${error.message}`)
  return data
}

async function createAgent(supabaseAdmin, { name, slug, description, icon, system_prompt, allowed_tools, model, provider }) {
  if (!name || !slug || !system_prompt) throw new Error('name, slug und system_prompt sind Pflichtfelder')
  if (!/^[a-z0-9-]+$/.test(slug))      throw new Error('slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten')
  const { data, error } = await supabaseAdmin.from('mmos_agents').insert({
    name, slug: slug.toLowerCase(), description, icon: icon || '🤖',
    system_prompt, allowed_tools: allowed_tools || null,
    model: model || 'default', provider: provider || 'default',
    is_builtin: false, is_active: true
  }).select().single()
  if (error) throw new Error(`createAgent: ${error.message}`)
  return data
}

async function updateAgent(supabaseAdmin, id, fields) {
  const allowed = ['name', 'description', 'icon', 'system_prompt', 'allowed_tools', 'model', 'provider', 'is_active']
  const update  = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))
  update.updated_at = new Date().toISOString()
  const { data, error } = await supabaseAdmin.from('mmos_agents').update(update).eq('id', id).select().single()
  if (error) throw new Error(`updateAgent: ${error.message}`)
  return data
}

async function deleteAgent(supabaseAdmin, id) {
  // Builtin-Agents nicht loeschen
  const { data: existing } = await supabaseAdmin.from('mmos_agents').select('is_builtin').eq('id', id).single()
  if (existing?.is_builtin) throw new Error('Vorinstallierte Agents koennen nicht geloescht werden')
  const { error } = await supabaseAdmin.from('mmos_agents').delete().eq('id', id)
  if (error) throw new Error(`deleteAgent: ${error.message}`)
  return { ok: true }
}

// ── Skills ─────────────────────────────────────────────────────────────────────

async function listSkills(supabaseAdmin, { category, includeInactive = false } = {}) {
  let q = supabaseAdmin.from('mmos_skills').select('*, mmos_agents(name, icon, slug)')
    .order('category').order('name')
  if (!includeInactive) q = q.eq('is_active', true)
  if (category)         q = q.eq('category', category)
  const { data, error } = await q
  if (error) throw new Error(`listSkills: ${error.message}`)
  return data || []
}

async function getSkill(supabaseAdmin, slug) {
  const { data, error } = await supabaseAdmin.from('mmos_skills').select('*, mmos_agents(name, icon, slug)').eq('slug', slug).single()
  if (error) throw new Error(`getSkill: ${error.message}`)
  return data
}

async function createSkill(supabaseAdmin, { name, slug, description, icon, category, prompt_template, agent_slug }) {
  if (!name || !slug || !prompt_template) throw new Error('name, slug und prompt_template sind Pflichtfelder')
  if (!/^[a-z0-9-]+$/.test(slug))        throw new Error('slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten')
  const { data, error } = await supabaseAdmin.from('mmos_skills').insert({
    name, slug: slug.toLowerCase(), description, icon: icon || '⚡',
    category: category || 'general', prompt_template,
    agent_slug: agent_slug || null, is_builtin: false, is_active: true
  }).select().single()
  if (error) throw new Error(`createSkill: ${error.message}`)
  return data
}

async function updateSkill(supabaseAdmin, id, fields) {
  const allowed = ['name', 'description', 'icon', 'category', 'prompt_template', 'agent_slug', 'is_active']
  const update  = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))
  const { data, error } = await supabaseAdmin.from('mmos_skills').update(update).eq('id', id).select().single()
  if (error) throw new Error(`updateSkill: ${error.message}`)
  return data
}

async function deleteSkill(supabaseAdmin, id) {
  const { data: existing } = await supabaseAdmin.from('mmos_skills').select('is_builtin').eq('id', id).single()
  if (existing?.is_builtin) throw new Error('Vorinstallierte Skills koennen nicht geloescht werden')
  const { error } = await supabaseAdmin.from('mmos_skills').delete().eq('id', id)
  if (error) throw new Error(`deleteSkill: ${error.message}`)
  return { ok: true }
}

// Skill-Prompt mit Variablen befuellen ({{VARIABLE}} → Wert)
function renderSkillPrompt(template, variables = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `[${key}]`)
}

// ── URL-Install ────────────────────────────────────────────────────────────────

// Erlaubte Domains fuer Package-Download (kein SSRF auf interne Adressen)
const ALLOWED_HOSTS = new Set(['raw.githubusercontent.com', 'gist.githubusercontent.com', 'api.github.com'])

function resolvePackageUrl(input) {
  let url
  try { url = new URL(input.trim()) } catch { throw new Error('Ungueltige URL') }

  const { hostname, pathname } = url

  // github.com/user/repo → raw.githubusercontent.com/user/repo/main/mmos-package.json
  if (hostname === 'github.com') {
    const parts = pathname.replace(/^\//, '').split('/')
    if (parts.length < 2) throw new Error('GitHub-URL muss user/repo enthalten')
    const [owner, repo] = parts

    // github.com/user/repo/blob/branch/file.json → raw
    if (parts[2] === 'blob' && parts.length >= 5) {
      const branch = parts[3]
      const file   = parts.slice(4).join('/')
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file}`
    }

    // github.com/user/repo → mmos-package.json auf main
    return `https://raw.githubusercontent.com/${owner}/${repo}/main/mmos-package.json`
  }

  // gist.github.com/user/hash → raw
  if (hostname === 'gist.github.com') {
    const [, gistUser, gistHash] = pathname.split('/')
    if (!gistHash) throw new Error('Gist-URL ungueltig')
    return `https://gist.githubusercontent.com/${gistUser}/${gistHash}/raw/mmos-package.json`
  }

  // Direkte raw/API-URLs
  if (ALLOWED_HOSTS.has(hostname)) return url.toString()

  throw new Error(`Nur GitHub-URLs erlaubt (github.com, raw.githubusercontent.com, gist.github.com). Erhalten: ${hostname}`)
}

function validatePackage(pkg) {
  if (!pkg || typeof pkg !== 'object') throw new Error('Paket muss ein JSON-Objekt sein')
  if (pkg.mmos_package !== '1.0')      throw new Error('Fehlendes oder falsches "mmos_package": "1.0" Feld')
  if (!Array.isArray(pkg.agents) && !Array.isArray(pkg.skills)) {
    throw new Error('Paket muss mindestens "agents" oder "skills" als Array enthalten')
  }

  const agentsOk = (pkg.agents || []).every(a => a.name && a.slug && a.system_prompt)
  if (!agentsOk) throw new Error('Jeder Agent braucht name, slug und system_prompt')

  const skillsOk = (pkg.skills || []).every(s => s.name && s.slug && s.prompt_template)
  if (!skillsOk) throw new Error('Jeder Skill braucht name, slug und prompt_template')

  // Einfache Laengenpruefung gegen riesige Payloads
  const totalLen = JSON.stringify(pkg).length
  if (totalLen > 500_000) throw new Error('Paket zu gross (max 500 KB)')

  return true
}

async function installFromUrl(supabaseAdmin, rawUrl) {
  const fetchUrl = resolvePackageUrl(rawUrl)

  let pkg
  try {
    const res = await fetch(fetchUrl, {
      headers: { 'User-Agent': 'MMOS-Registry/1.0', Accept: 'application/json, text/plain' },
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden des Pakets`)
    pkg = await res.json()
  } catch (e) {
    if (e.name === 'TimeoutError') throw new Error('Timeout: URL nicht erreichbar (10s)')
    if (e instanceof SyntaxError) throw new Error('Datei ist kein gueltiges JSON')
    throw e
  }

  validatePackage(pkg)

  const results = { agents: [], skills: [], skipped: [] }

  for (const a of (pkg.agents || [])) {
    try {
      const agent = await createAgent(supabaseAdmin, {
        name: String(a.name).slice(0, 100),
        slug: String(a.slug).slice(0, 60),
        description: a.description ? String(a.description).slice(0, 300) : undefined,
        icon: a.icon ? String(a.icon).slice(0, 10) : '🤖',
        system_prompt: String(a.system_prompt).slice(0, 20_000),
        allowed_tools: Array.isArray(a.allowed_tools) ? a.allowed_tools.map(String) : null,
        model: a.model ? String(a.model).slice(0, 80) : 'default',
        provider: a.provider ? String(a.provider).slice(0, 30) : 'default'
      })
      results.agents.push(agent.name)
    } catch (e) {
      results.skipped.push(`Agent "${a.slug}": ${e.message}`)
    }
  }

  for (const s of (pkg.skills || [])) {
    try {
      const skill = await createSkill(supabaseAdmin, {
        name: String(s.name).slice(0, 100),
        slug: String(s.slug).slice(0, 60),
        description: s.description ? String(s.description).slice(0, 300) : undefined,
        icon: s.icon ? String(s.icon).slice(0, 10) : '⚡',
        category: s.category ? String(s.category).slice(0, 30) : 'general',
        prompt_template: String(s.prompt_template).slice(0, 10_000),
        agent_slug: s.agent_slug ? String(s.agent_slug).slice(0, 60) : null
      })
      results.skills.push(skill.name)
    } catch (e) {
      results.skipped.push(`Skill "${s.slug}": ${e.message}`)
    }
  }

  return {
    package_name: pkg.name || 'Unbekanntes Paket',
    author:       pkg.author || null,
    installed:    { agents: results.agents, skills: results.skills },
    skipped:      results.skipped
  }
}

module.exports = {
  listAgents, getAgent, createAgent, updateAgent, deleteAgent,
  listSkills, getSkill, createSkill, updateSkill, deleteSkill,
  renderSkillPrompt, installFromUrl
}
