// Agent Session Memory — speichert/laedt Zusammenfassungen vergangener Runs

const MEMORY_LIMIT = 5  // Letzte N Runs als Kontext laden

async function saveMemory(supabaseAdmin, { task, summary, files, branch, prUrl, prNumber, agentSlug, provider, stepsUsed, userId }) {
  try {
    await supabaseAdmin.from('mmos_agent_memory').insert({
      task:       String(task).slice(0, 500),
      summary:    String(summary).slice(0, 2000),
      files:      Array.isArray(files) ? files.slice(0, 20) : [],
      branch:     String(branch || 'main'),
      pr_url:     prUrl  || null,
      pr_number:  prNumber || null,
      agent_slug: agentSlug || null,
      provider:   provider || null,
      steps_used: stepsUsed || null,
      user_id:    userId || null
    })
  } catch (e) {
    console.error('agentMemoryService.saveMemory:', e.message)
  }
}

// userId optional: scopt das Gedaechtnis auf einen bestimmten Admin (sonst global).
async function getRecentMemory(supabaseAdmin, limit = MEMORY_LIMIT, userId = null) {
  try {
    let q = supabaseAdmin
      .from('mmos_agent_memory')
      .select('task, summary, files, branch, pr_url, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (userId) q = q.eq('user_id', userId)
    const { data, error } = await q
    if (error || !data?.length) return null
    return data.reverse()  // chronologisch, aeltestes zuerst
  } catch {
    return null
  }
}

// Formatiert Memory als kompakten Kontext-Block fuer den System-Prompt
function formatMemoryBlock(entries) {
  if (!entries?.length) return null
  const lines = entries.map(e => {
    const date  = new Date(e.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    const files = e.files?.length ? ` [${e.files.slice(0, 3).join(', ')}${e.files.length > 3 ? ', …' : ''}]` : ''
    return `• ${date} — ${e.task.slice(0, 80)}: ${e.summary.slice(0, 200)}${files}`
  })
  return `## Letzte Agent-Runs (Gedaechtnis)\n\n${lines.join('\n')}\n\nNutze diesen Kontext falls relevant fuer die aktuelle Aufgabe.`
}

module.exports = { saveMemory, getRecentMemory, formatMemoryBlock }
