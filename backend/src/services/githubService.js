// GitHub REST API Integration fuer den MMOS Admin AI Assistant.
//
// Umgebungsvariablen (in backend/.env setzen):
//   GITHUB_TOKEN        — Personal Access Token (Berechtigungen: repo, pull_requests, issues)
//   GITHUB_REPO_OWNER   — GitHub Username / Org (z.B. "zappi1965")
//   GITHUB_REPO_NAME    — Repository-Name (z.B. "MecklenburgMarketingOS")

const GITHUB_API = 'https://api.github.com'

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN nicht konfiguriert')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }
}

function repoBase() {
  const owner = process.env.GITHUB_REPO_OWNER
  const repo = process.env.GITHUB_REPO_NAME
  if (!owner || !repo) throw new Error('GITHUB_REPO_OWNER und GITHUB_REPO_NAME muessen gesetzt sein')
  return `${GITHUB_API}/repos/${owner}/${repo}`
}

async function githubFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${repoBase()}${path}`
  const res = await fetch(url, { ...options, headers: { ...githubHeaders(), ...(options.headers || {}) } })
  const text = await res.text().catch(() => '')
  if (!res.ok) throw new Error(`GitHub API ${res.status} ${path}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}

// ── Dateien lesen ──────────────────────────────────────────────────────────────

// Einzelne Datei aus dem Repo lesen (gibt Text-Inhalt zurueck)
async function getFile(filePath, ref = 'main') {
  const data = await githubFetch(`/contents/${filePath}?ref=${encodeURIComponent(ref)}`)
  if (!data || !data.content) throw new Error(`Datei nicht gefunden: ${filePath}`)
  // GitHub liefert Base64-kodierten Inhalt
  return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8')
}

// Verzeichnis-Inhalt lesen
async function getDirectory(dirPath, ref = 'main') {
  const data = await githubFetch(`/contents/${dirPath || ''}?ref=${encodeURIComponent(ref)}`)
  return Array.isArray(data) ? data : []
}

// Kompletten Repo-Dateibaum laden (rekursiv, gefiltert auf Quellcode-Dateien)
// ref: Branch-Name oder 'main'
async function getRepoTree(ref = 'main') {
  // Zuerst den aktuellen Commit-SHA des Branches holen
  const refData = await githubFetch(`/git/refs/heads/${ref}`)
  const treeSha = refData.object.sha

  // Rekursiven Baum laden
  const tree = await githubFetch(`/git/trees/${treeSha}?recursive=1`)

  // Nur relevante Quellcode-Dateien zurueckgeben
  const SOURCE_EXTENSIONS = /\.(js|ts|tsx|jsx|css|json|md|sql|env\.example)$/
  const IGNORED_DIRS = /^(node_modules|\.git|dist|build|\.next|coverage|\.mmos-patch-backups)\//

  return (tree.items || tree.tree || [])
    .filter(item =>
      item.type === 'blob' &&
      SOURCE_EXTENSIONS.test(item.path) &&
      !IGNORED_DIRS.test(item.path)
    )
    .map(item => ({ path: item.path, size: item.size || 0 }))
}

// Code im Repo durchsuchen (GitHub Code Search API)
async function searchCode(query, ref = 'main') {
  const owner = process.env.GITHUB_REPO_OWNER
  const repo = process.env.GITHUB_REPO_NAME
  if (!owner || !repo) throw new Error('GITHUB_REPO_OWNER und GITHUB_REPO_NAME muessen gesetzt sein')

  // GitHub Code Search braucht den Accept-Header mit spezieller Version
  const url = `${GITHUB_API}/search/code?q=${encodeURIComponent(query)}+repo:${owner}/${repo}&per_page=20`
  const res = await fetch(url, {
    headers: {
      ...githubHeaders(),
      Accept: 'application/vnd.github.text-match+json'
    }
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`GitHub Search ${res.status}: ${t.slice(0, 200)}`)
  }
  const data = await res.json()
  return (data.items || []).map(item => ({
    path: item.path,
    url: item.html_url,
    matches: (item.text_matches || []).map(m => m.fragment).slice(0, 2)
  }))
}

// Mehrere Dateien in einem Branch committen (sequentiell, SHA-sicher)
async function commitMultipleFiles(branch, files, message) {
  const results = []
  for (const file of files) {
    // Bestehende SHA holen (fuer Update-Commit noetig)
    let existingSha = null
    try {
      const existing = await githubFetch(`/contents/${file.path}?ref=${encodeURIComponent(branch)}`)
      existingSha = existing.sha
    } catch (_) {}

    const body = {
      message: file.message || message,
      content: Buffer.from(file.content).toString('base64'),
      branch
    }
    if (existingSha) body.sha = existingSha

    const result = await githubFetch(`/contents/${file.path}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
    results.push({ path: file.path, sha: result?.content?.sha })
  }
  return results
}

// ── Branch / PR ────────────────────────────────────────────────────────────────

async function getDefaultBranchSha(baseBranch = 'main') {
  const ref = await githubFetch(`/git/refs/heads/${baseBranch}`)
  return ref.object.sha
}

async function createBranch(branchName, baseBranch = 'main') {
  const sha = await getDefaultBranchSha(baseBranch)
  return githubFetch('/git/refs', {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha })
  })
}

async function commitFile(branch, filePath, content, message) {
  let existingSha = null
  try {
    const existing = await githubFetch(`/contents/${filePath}?ref=${encodeURIComponent(branch)}`)
    existingSha = existing.sha
  } catch (_) {}

  const body = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch
  }
  if (existingSha) body.sha = existingSha

  return githubFetch(`/contents/${filePath}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  })
}

async function createPR({ title, body, head, base = 'main', draft = true }) {
  return githubFetch('/pulls', {
    method: 'POST',
    body: JSON.stringify({ title, body, head, base, draft })
  })
}

async function submitPRReview({ prNumber, body, event = 'COMMENT' }) {
  return githubFetch(`/pulls/${prNumber}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ body, event })
  })
}

async function getPRDetails(prNumber) {
  return githubFetch(`/pulls/${prNumber}`)
}

async function getPRFiles(prNumber) {
  return githubFetch(`/pulls/${prNumber}/files`)
}

async function listPRs({ state = 'open' } = {}) {
  return githubFetch(`/pulls?state=${encodeURIComponent(state)}&per_page=20`)
}

async function createIssue({ title, body, labels = [], assignees = [] }) {
  return githubFetch('/issues', {
    method: 'POST',
    body: JSON.stringify({ title, body, labels, assignees })
  })
}

async function listIssues({ state = 'open', labels = '' } = {}) {
  const params = new URLSearchParams({ state, per_page: '20' })
  if (labels) params.set('labels', labels)
  return githubFetch(`/issues?${params}`)
}

// Git-Log: letzte Commits eines Branches
async function getCommits({ branch = 'main', perPage = 15, path = '' } = {}) {
  const params = new URLSearchParams({ sha: branch, per_page: String(perPage) })
  if (path) params.set('path', path)
  const commits = await githubFetch(`/commits?${params}`)
  return (commits || []).map(c => ({
    sha:     c.sha?.slice(0, 7),
    message: c.commit?.message?.split('\n')[0].slice(0, 100),
    author:  c.commit?.author?.name,
    date:    c.commit?.author?.date?.slice(0, 10)
  }))
}

// Diff zwischen zwei Refs (Commits, Branches, Tags)
async function compareBranches(base, head) {
  return githubFetch(`/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`)
}

module.exports = {
  getFile,
  getDirectory,
  getRepoTree,
  searchCode,
  commitFile,
  commitMultipleFiles,
  createBranch,
  createPR,
  submitPRReview,
  getPRDetails,
  getPRFiles,
  listPRs,
  createIssue,
  listIssues,
  getCommits,
  compareBranches
}
