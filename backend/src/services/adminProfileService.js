// Admin-AI-Profil — pro Admin-User hinterlegtes Dauergedaechtnis (CLAUDE.md-artig),
// bevorzugter Agent/Provider und aktivierte Skills. Wird beim Agent-Run automatisch
// geladen und in den System-Prompt injiziert (siehe agentService.runAgent).

const PROFILE_FIELDS   = ['display_name', 'memory_md', 'default_agent_slug', 'default_provider', 'enabled_skill_slugs', 'preferences']
const VALID_PROVIDERS  = ['default', 'anthropic', 'groq', 'ollama']
const MAX_MEMORY_CHARS = 20000
const MAX_SKILLS       = 50

// Leeres Default-Profil (wird zurueckgegeben wenn noch keins angelegt ist)
function emptyProfile(userId) {
  return {
    user_id:             userId || null,
    display_name:        null,
    memory_md:           '',
    default_agent_slug:  null,
    default_provider:    'default',
    enabled_skill_slugs: [],
    preferences:         {}
  }
}

async function getProfile(supabaseAdmin, userId) {
  if (!userId) return null
  const { data, error } = await supabaseAdmin
    .from('mmos_admin_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`getProfile: ${error.message}`)
  return data || null
}

// Legt das Profil an oder aktualisiert es (1 Datensatz pro user_id).
async function upsertProfile(supabaseAdmin, userId, fields = {}) {
  if (!userId) throw new Error('userId ist Pflicht')

  const update = {}
  for (const k of PROFILE_FIELDS) {
    if (!(k in fields)) continue
    if (k === 'memory_md') {
      update[k] = String(fields[k] ?? '').slice(0, MAX_MEMORY_CHARS)
    } else if (k === 'enabled_skill_slugs') {
      update[k] = Array.isArray(fields[k]) ? fields[k].map(String).slice(0, MAX_SKILLS) : []
    } else if (k === 'preferences') {
      update[k] = (fields[k] && typeof fields[k] === 'object' && !Array.isArray(fields[k])) ? fields[k] : {}
    } else if (k === 'default_provider') {
      const p = String(fields[k] || 'default').toLowerCase()
      update[k] = VALID_PROVIDERS.includes(p) ? p : 'default'
    } else {
      update[k] = fields[k] == null ? null : String(fields[k]).slice(0, 200)
    }
  }

  update.user_id    = userId
  update.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('mmos_admin_profiles')
    .upsert(update, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw new Error(`upsertProfile: ${error.message}`)
  return data
}

// Formatiert das gepflegte Profil-Gedaechtnis als System-Prompt-Block.
function formatProfileBlock(profile) {
  const md = profile?.memory_md?.trim()
  if (!md) return null
  return `## Admin-Profil-Gedaechtnis (im Panel gepflegt — gilt dauerhaft)\n\n${md}`
}

// Formatiert die aktivierten Skills als Referenz-Block fuer den System-Prompt.
function formatSkillsBlock(skills = []) {
  const active = (skills || []).filter(s => s && s.prompt_template)
  if (!active.length) return null
  const blocks = active.slice(0, 20).map(s =>
    `### ${s.icon || '⚡'} ${s.name} (${s.slug})${s.description ? ` — ${s.description}` : ''}\n${String(s.prompt_template).slice(0, 1200)}`
  )
  return `## Hinterlegte Skills (Referenz — bei passender Aufgabe anwenden)\n\n${blocks.join('\n\n')}`
}

module.exports = { getProfile, upsertProfile, formatProfileBlock, formatSkillsBlock, emptyProfile }
