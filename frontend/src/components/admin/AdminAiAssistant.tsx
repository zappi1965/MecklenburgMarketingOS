'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ── Typen ─────────────────────────────────────────────────────────────────────

type Tab = 'agent' | 'registry' | 'chat' | 'github' | 'keywords' | 'pdf'
type IssueType = 'bug' | 'feature' | 'chore' | 'security'

interface ChatMessage { role: 'user' | 'assistant'; content: string }
interface TreeFile { path: string; size: number }

interface MmosAgent {
  id: string; name: string; slug: string; description?: string
  icon: string; system_prompt: string; allowed_tools?: string[]
  model: string; provider: string; is_builtin: boolean; is_active: boolean
}
interface MmosSkill {
  id: string; name: string; slug: string; description?: string
  icon: string; category: string; prompt_template: string
  agent_slug?: string; is_builtin: boolean; is_active: boolean
  mmos_agents?: { name: string; icon: string; slug: string }
}

// SSE Events vom Backend
type AgentEventType =
  | 'thinking' | 'tool_call' | 'tool_result' | 'tool_error'
  | 'file_changed' | 'complete' | 'max_steps' | 'creating_pr'
  | 'pr_created' | 'no_changes' | 'error' | 'done' | 'file_diff'
  | 'todo_update' | 'confirmation_request' | 'confirmation_denied'

interface AgentEvent {
  type: AgentEventType
  text?: string       // thinking
  tool?: string       // tool_call / tool_result / tool_error
  input?: Record<string, unknown>  // tool_call
  result?: string     // tool_result
  error?: string      // tool_error / error
  path?: string       // file_changed
  isNew?: boolean     // file_changed
  summary?: string    // complete
  prTitle?: string    // complete
  prBody?: string     // complete
  filesChanged?: number
  pr?: { url: string; number: number; title: string }
  branch?: string
  filesCommitted?: number
  message?: string    // no_changes / error
  oldContent?: string  // file_diff
  newContent?: string  // file_diff
  stepsUsed?: number  // max_steps
  todos?: string[]       // todo_update
  requestId?: string    // confirmation_request
  op?: string           // confirmation_request
  preview?: string      // confirmation_request
}

interface GitHubIssue { number: number; title: string; html_url: string; labels: { name: string }[] }
interface GitHubPR { number: number; title: string; html_url: string; state: string; draft: boolean; user: { login: string } }

interface KeywordAnalysis {
  summary?: string
  primaryKeywords?: { keyword: string; intent: string; difficulty: string; volume: string }[]
  longTailKeywords?: { keyword: string; intent: string; suggestion: string }[]
  contentIdeas?: string[]
  quickWins?: string[]
  provider?: string
}

interface AdminAiAssistantProps {
  apiBase?: string
  userName?: string
}

// ── Design-System ─────────────────────────────────────────────────────────────

const C = {
  primary: '#1a1a2e', accent: '#e94560', bg: '#f4f6f9',
  card: '#ffffff', border: '#e2e8f0', text: '#1e293b', muted: '#64748b',
  terminal: '#0d1117', terminalText: '#e6edf3', terminalMuted: '#8b949e'
}

// Tool-Icon + Farbe fuer den Live-Feed
const TOOL_META: Record<string, { icon: string; color: string; label: string }> = {
  think:            { icon: '💭', color: '#8b949e', label: 'Denkt nach' },
  get_repo_tree:    { icon: '🌳', color: '#10b981', label: 'Repo-Baum' },
  list_directory:   { icon: '📁', color: '#64748b', label: 'Liste' },
  get_file_outline: { icon: '🗂️', color: '#06b6d4', label: 'Struktur' },
  read_file:        { icon: '📖', color: '#3b82f6', label: 'Lese' },
  read_file_lines:  { icon: '🔎', color: '#3b82f6', label: 'Zeilen' },
  grep_files:       { icon: '⚡', color: '#f59e0b', label: 'Grep' },
  search_code:      { icon: '🔍', color: '#f59e0b', label: 'Suche' },
  check_syntax:     { icon: '✔️', color: '#10b981', label: 'Syntax' },
  get_git_log:      { icon: '📜', color: '#a78bfa', label: 'Git-Log' },
  patch_file:       { icon: '✏️', color: '#8b5cf6', label: 'Editiere' },
  write_file:       { icon: '📝', color: '#8b5cf6', label: 'Schreibe' },
  run_node:         { icon: '▶', color: '#06b6d4',  label: 'Node.js' },
  read_files:       { icon: '📚', color: '#0ea5e9', label: 'Lese (parallel)' },
  todo:             { icon: '☑', color: '#a78bfa',  label: 'TODO' },
  task_complete:    { icon: '✅', color: '#16a34a', label: 'Fertig' },
  fetch_url:        { icon: '🌐', color: '#0ea5e9', label: 'URL laden' }
}

function apiPost(url: string, body: unknown) {
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

function Spinner({ size = 14, color = C.accent }: { size?: number; color?: string }) {
  return <span style={{ display: 'inline-block', width: size, height: size, border: `2px solid ${color}33`, borderTopColor: color, borderRadius: '50%', animation: 'mmos-spin 0.7s linear infinite', flexShrink: 0, verticalAlign: 'middle' }} />
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, ...style }}>{children}</div>
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{children}</div>
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style, ...rest } = props
  return <input style={{ width: '100%', border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '7px 11px', fontSize: 13, outline: 'none', background: '#fff', color: C.text, boxSizing: 'border-box' as const, ...style }} {...rest} />
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { style, ...rest } = props
  return <textarea style={{ width: '100%', border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '7px 11px', fontSize: 13, outline: 'none', background: '#fff', color: C.text, resize: 'vertical' as const, boxSizing: 'border-box' as const, ...style }} {...rest} />
}

function Btn({ children, onClick, disabled, variant = 'primary', style }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'; style?: React.CSSProperties
}) {
  const vs = { primary: { background: C.accent, color: '#fff', border: 'none' }, secondary: { background: C.primary, color: '#fff', border: 'none' }, ghost: { background: 'transparent', color: C.muted, border: `1px solid ${C.border}` } }
  return <button onClick={onClick} disabled={disabled} style={{ borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s', ...vs[variant], ...style }}>{children}</button>
}

function ErrBox({ msg }: { msg: string }) {
  return <div style={{ background: '#fff3f5', color: C.accent, padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontSize: 12 }}>{msg}</div>
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: color + '22', color, border: `1px solid ${color}44` }}>{children}</span>
}

// ── Diff-View (Myers-ähnlicher Zeilenvergleich) ────────────────────────────────

function computeLineDiff(oldText: string, newText: string) {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: { type: 'ctx' | 'add' | 'del'; line: string; num?: number }[] = []

  // Einfacher LCS-basierter Diff (O(n*m) — für typische Dateigrößen ausreichend)
  const m = oldLines.length, n = newLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = oldLines[i-1] === newLines[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1])
  }

  // Backtrack
  const hunks: { type: 'ctx'|'add'|'del'; ol?: number; nl?: number; line: string }[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i-1] === newLines[j-1]) {
      hunks.unshift({ type: 'ctx', ol: i, nl: j, line: oldLines[i-1] }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      hunks.unshift({ type: 'add', nl: j, line: newLines[j-1] }); j--
    } else {
      hunks.unshift({ type: 'del', ol: i, line: oldLines[i-1] }); i--
    }
  }

  // Kontext: nur 3 Zeilen um Änderungen, Rest ausblenden
  const CONTEXT = 3
  const changed = new Set(hunks.map((h, idx) => h.type !== 'ctx' ? idx : -1).filter(x => x >= 0))
  const shown   = new Set<number>()
  changed.forEach(ci => { for (let k = Math.max(0, ci - CONTEXT); k <= Math.min(hunks.length - 1, ci + CONTEXT); k++) shown.add(k) })

  let lastShown = -1
  for (let idx = 0; idx < hunks.length; idx++) {
    if (!shown.has(idx)) { if (lastShown !== idx - 1 || idx === 0) result.push({ type: 'ctx', line: '…' }); lastShown = idx; continue }
    result.push({ type: hunks[idx].type as 'ctx'|'add'|'del', line: hunks[idx].line, num: hunks[idx].nl ?? hunks[idx].ol })
    lastShown = idx
  }
  return result
}

function DiffView({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const lines = computeLineDiff(oldContent, newContent)
  const added   = lines.filter(l => l.type === 'add').length
  const removed = lines.filter(l => l.type === 'del').length
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5 }}>
      <div style={{ padding: '5px 12px', borderBottom: '1px solid #30363d', color: C.terminalMuted, fontSize: 10 }}>
        <span style={{ color: '#3fb950' }}>+{added}</span> <span style={{ color: '#f85149' }}>−{removed}</span> Zeilen
      </div>
      {lines.map((l, i) => {
        if (l.line === '…') return <div key={i} style={{ padding: '2px 12px', color: '#4d5566', fontSize: 10, borderTop: '1px dashed #21262d', borderBottom: '1px dashed #21262d' }}>⋮</div>
        const bg    = l.type === 'add' ? '#0d4429' : l.type === 'del' ? '#3d1f1e' : 'transparent'
        const color = l.type === 'add' ? '#3fb950' : l.type === 'del' ? '#f85149' : C.terminalText
        const prefix = l.type === 'add' ? '+ ' : l.type === 'del' ? '− ' : '  '
        return (
          <div key={i} style={{ display: 'flex', background: bg }}>
            <span style={{ width: 20, flexShrink: 0, textAlign: 'right', color: '#4d5566', fontSize: 10, padding: '1px 6px', userSelect: 'none' }}>{l.type !== 'del' ? l.num : ''}</span>
            <span style={{ color, padding: '1px 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', flex: 1 }}>{prefix}{l.line}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Tab: Agent (Haupt-Feature) ────────────────────────────────────────────────

function AgentTab({ apiBase, initialTask = '', initialAgentSlug }: { apiBase: string; initialTask?: string; initialAgentSlug?: string }) {
  const [task, setTask] = useState(initialTask)
  const [agentSlug, setAgentSlug] = useState(initialAgentSlug || '')
  const [branch, setBranch] = useState('main')
  const [running, setRunning] = useState(false)
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [changedFiles, setChangedFiles] = useState<string[]>([])
  const [fileDiffs, setFileDiffs] = useState<Record<string, { old: string; new: string }>>({})
  const [prResult, setPrResult] = useState<{ url: string; number: number; title: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [stepCount, setStepCount] = useState(0)
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [todos, setTodos] = useState<{ index: number; text: string; done: boolean }[]>([])
  const [viewMode, setViewMode] = useState<'diff' | 'full'>('diff')
  const [confirmationMode, setConfirmationMode] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState<{ requestId: string; op: string; path: string; preview: string } | null>(null)
  const [recentRuns, setRecentRuns] = useState<{ task: string; summary: string; created_at: string }[]>([])
  const [agentConfig, setAgentConfig] = useState<{ model?: string; provider?: string } | null>(null)
  const [mcpServers, setMcpServers] = useState<{ name: string; status: string; toolCount: number; url: string }[]>([])

  useEffect(() => {
    fetch(`${apiBase}/api/admin/ai/agent/status`).then(r => r.json()).then(d => {
      if (d.ok) setAgentConfig({ model: d.config.model, provider: d.config.provider })
    }).catch(() => {})
    fetch(`${apiBase}/api/admin/ai/agent/memory`).then(r => r.json()).then(d => {
      if (d.ok && d.runs) setRecentRuns(d.runs.slice().reverse())
    }).catch(() => {})
    fetch(`${apiBase}/api/admin/ai/mcp/status`).then(r => r.json()).then(d => {
      if (d.ok) setMcpServers(d.servers || [])
    }).catch(() => {})
  }, [apiBase])

  // Skill-Prompt von außen übernehmen (Registry-Tab → Agent-Tab)
  useEffect(() => { if (initialTask) { setTask(initialTask); reset() } }, [initialTask])
  useEffect(() => { if (initialAgentSlug !== undefined) setAgentSlug(initialAgentSlug || '') }, [initialAgentSlug])

  const feedEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  function reset() {
    setEvents([]); setChangedFiles([]); setFileDiffs({}); setPrResult(null); setError(null); setDone(false); setStepCount(0); setActiveFile(null); setFileContents({}); setTodos([]); setPendingConfirmation(null)
  }

  async function respondConfirmation(approved: boolean) {
    if (!pendingConfirmation) return
    const { requestId } = pendingConfirmation
    setPendingConfirmation(null)
    try {
      await fetch(`${apiBase}/api/admin/ai/agent/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, approved })
      })
    } catch { /* ignore — agent-timeout handles it */ }
  }

  async function runAgent() {
    if (!task.trim() || running) return
    reset()
    setRunning(true)

    abortRef.current = new AbortController()

    try {
      const res = await fetch(`${apiBase}/api/admin/ai/agent/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: task.trim(), branch, createPR: true, agentSlug: agentSlug || undefined, confirmationMode }),
        signal: abortRef.current.signal
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || `HTTP ${res.status}`)
        return
      }

      // SSE-Stream lesen
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let steps = 0

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event: AgentEvent = JSON.parse(line.slice(6))

            if (event.type === 'done') { setDone(true); break }
            if (event.type === 'error') setError(event.message || event.error || 'Unbekannter Fehler')
            if (event.type === 'pr_created' && event.pr) setPrResult(event.pr)
            if (event.type === 'file_changed' && event.path) {
              setChangedFiles(prev => prev.includes(event.path!) ? prev : [...prev, event.path!])
            }
            if (event.type === 'file_diff' && event.path) {
              setChangedFiles(prev => prev.includes(event.path!) ? prev : [...prev, event.path!])
              setFileDiffs(prev => ({ ...prev, [event.path!]: { old: event.oldContent || '', new: event.newContent || '' } }))
              setFileContents(prev => ({ ...prev, [event.path!]: event.newContent || '' }))
            }
            if (event.type === 'todo_update' && event.todos) setTodos(event.todos)
            if (event.type === 'confirmation_request') setPendingConfirmation({ requestId: event.requestId, op: event.op, path: event.path, preview: event.preview || '' })
            if (event.type === 'confirmation_denied')  setPendingConfirmation(null)
            if (event.type === 'tool_call') steps++
            setStepCount(steps)
            if (event.type !== 'file_diff') setEvents(prev => [...prev, event])
          } catch { /* ungültiges JSON überspringen */ }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message)
    } finally {
      setRunning(false)
      setDone(true)
    }
  }

  function stopAgent() {
    abortRef.current?.abort()
    setRunning(false)
  }

  async function loadFileContent(path: string) {
    setActiveFile(path)
    if (fileContents[path]) return  // bereits vom diff-Event gecacht
    try {
      const res = await fetch(`${apiBase}/api/admin/ai/github/file?path=${encodeURIComponent(path)}&ref=${branch}`)
      const data = await res.json()
      if (data.ok) setFileContents(prev => ({ ...prev, [path]: data.content }))
    } catch { /* ignore */ }
  }

  // Event-Zeile rendern
  function renderEvent(ev: AgentEvent, i: number) {
    const meta = ev.tool ? TOOL_META[ev.tool] : null

    if (ev.type === 'thinking') {
      return (
        <div key={i} style={{ padding: '6px 12px', borderLeft: '2px solid #8b949e', marginLeft: 4, color: C.terminalMuted, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {ev.text}
        </div>
      )
    }

    if (ev.type === 'tool_call') {
      if (ev.tool === 'think') {
        const reasoning = (ev.input?.reasoning as string) || ''
        return (
          <div key={i} style={{ padding: '6px 12px 6px 28px', borderLeft: '2px solid #8b949e44', marginLeft: 8, color: C.terminalMuted, fontSize: 11, fontStyle: 'italic', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            💭 {reasoning.slice(0, 300)}{reasoning.length > 300 ? '…' : ''}
          </div>
        )
      }
      const label = meta?.label || ev.tool || ''
      const detail = ev.input
        ? (ev.input.path ? String(ev.input.path) : ev.input.query ? `"${ev.input.query}"` : ev.input.filter ? `filter: "${ev.input.filter}"` : ev.input.reasoning ? '' : '')
        : ''
      return (
        <div key={i} style={{ padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>{meta?.icon || '🔧'}</span>
          <span style={{ color: meta?.color || C.accent, fontWeight: 700, fontSize: 12 }}>{label}</span>
          {detail && <span style={{ color: C.terminalText, fontSize: 11, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{detail}</span>}
        </div>
      )
    }

    if (ev.type === 'tool_result') {
      const txt     = ev.result || ''
      // run_node: zeige stdout/stderr farbig
      if (ev.tool === 'run_node') {
        const isErr = txt.startsWith('FEHLER')
        return (
          <div key={i} style={{ padding: '4px 12px 8px 34px' }}>
            <pre style={{ margin: 0, background: '#0d1117', border: `1px solid ${isErr ? '#f8514944' : '#30363d'}`, borderRadius: 6, padding: '6px 10px', color: isErr ? '#f85149' : '#3fb950', fontSize: 10, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5, maxHeight: 160, overflowY: 'auto' }}>
              {txt.slice(0, 1500)}{txt.length > 1500 ? '\n[...gekürzt]' : ''}
            </pre>
          </div>
        )
      }
      // todo: nicht als Ergebnis anzeigen (todo_update Event übernimmt das)
      if (ev.tool === 'todo') return null
      const isErr        = txt.startsWith('FEHLER') || txt.startsWith('SYNTAX-FEHLER')
      const isOk         = txt.startsWith('OK:')
      const isSyntaxWarn = txt.startsWith('SYNTAX-WARNUNG')
      const color        = isErr ? '#f85149' : isSyntaxWarn ? '#f0883e' : isOk ? '#3fb950' : C.terminalMuted
      return (
        <div key={i} style={{ padding: '2px 12px 6px 34px', color, fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
          {txt.slice(0, 300)}{txt.length > 300 ? '…' : ''}
        </div>
      )
    }

    if (ev.type === 'tool_error') {
      return (
        <div key={i} style={{ padding: '4px 12px 4px 34px', color: '#f85149', fontSize: 11, fontFamily: 'monospace' }}>
          ⚠ {ev.error}
        </div>
      )
    }

    if (ev.type === 'file_changed') {
      return (
        <div key={i} style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6, color: '#3fb950', fontSize: 11 }}>
          <span>{ev.isNew ? '➕' : '✏️'}</span>
          <span style={{ fontFamily: 'monospace' }}>{ev.path}</span>
        </div>
      )
    }

    if (ev.type === 'complete') {
      return (
        <div key={i} style={{ padding: '8px 12px', borderLeft: `3px solid #3fb950`, marginLeft: 4, color: '#3fb950', fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>✅ {ev.prTitle}</div>
          <div style={{ color: C.terminalMuted, fontStyle: 'italic' }}>{ev.summary}</div>
        </div>
      )
    }

    if (ev.type === 'creating_pr') {
      return <div key={i} style={{ padding: '5px 12px', color: '#f0883e', fontSize: 12 }}>🔀 Erstelle Draft-PR mit {ev.filesCount} Datei{ev.filesCount !== 1 ? 'en' : ''}…</div>
    }

    if (ev.type === 'pr_created') {
      return (
        <div key={i} style={{ padding: '5px 12px', color: '#3fb950', fontSize: 12 }}>
          🎉 PR <a href={ev.pr?.url} target="_blank" rel="noreferrer" style={{ color: '#58a6ff', textDecoration: 'none' }}>#{ev.pr?.number}</a> erstellt — {ev.filesCommitted} Datei{ev.filesCommitted !== 1 ? 'en' : ''} committed
        </div>
      )
    }

    if (ev.type === 'max_steps') {
      return <div key={i} style={{ padding: '5px 12px', color: '#f0883e', fontSize: 12 }}>⚠ Maximale Schritte ({ev.stepsUsed}) erreicht — {ev.filesChanged} Datei{ev.filesChanged !== 1 ? 'en' : ''} geändert</div>
    }

    if (ev.type === 'error') {
      return <div key={i} style={{ padding: '5px 12px', color: '#f85149', fontSize: 12 }}>❌ {ev.message || ev.error}</div>
    }

    if (ev.type === 'no_changes') {
      return <div key={i} style={{ padding: '5px 12px', color: C.terminalMuted, fontSize: 12 }}>ℹ {ev.message}</div>
    }

    return null
  }

  const exampleTasks = [
    'Füge Rate-Limiting (50 req/15min) zu den Auth-Endpunkten hinzu und logge failed login attempts in Supabase',
    'Erstelle einen neuen Express-Route-Handler für Newsletter-Abonnements mit Double-Opt-in',
    'Refaktoriere den chatbotService.js um den Mock-Provider zu verbessern',
    'Füge einen Health-Check-Endpunkt /api/health/db hinzu der die Supabase-Verbindung prüft'
  ]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Linke Spalte: Input */}
      <div style={{ width: 260, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden' }}>
        <div style={{ padding: 12, overflowY: 'auto', flex: 1 }}>
          <Label>Aufgabe</Label>
          <Textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            rows={6}
            placeholder="Beschreibe was der Agent tun soll — er liest selbst alle nötigen Dateien…"
            disabled={running}
            style={{ marginBottom: 10, fontSize: 12 }}
          />

          <Label>Branch</Label>
          <Input value={branch} onChange={e => setBranch(e.target.value)} disabled={running} style={{ marginBottom: 8, fontSize: 12 }} />

          <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, cursor: 'pointer', fontSize: 11, color: C.muted }}>
            <input type="checkbox" checked={confirmationMode} onChange={e => setConfirmationMode(e.target.checked)} disabled={running} style={{ cursor: 'pointer' }} />
            Bestätigungs-Modus (vor jedem Edit fragen)
          </label>

          {running ? (
            <Btn onClick={stopAgent} variant="ghost" style={{ width: '100%', justifyContent: 'center', color: C.accent, borderColor: C.accent }}>
              ⏹ Stoppen
            </Btn>
          ) : (
            <Btn onClick={runAgent} disabled={!task.trim()} style={{ width: '100%', justifyContent: 'center' }}>
              ▶ Agent starten
            </Btn>
          )}

          {stepCount > 0 && (
            <div style={{ marginTop: 10, fontSize: 11, color: C.muted, textAlign: 'center' }}>
              {stepCount} Tool-Aufrufe
              {running && <><br /><Spinner size={10} /> läuft…</>}
            </div>
          )}

          {/* Beispiel-Aufgaben */}
          {!running && events.length === 0 && (
            <div style={{ marginTop: 14 }}>
              <Label>Beispiel-Aufgaben</Label>
              {exampleTasks.map((t, i) => (
                <div key={i} onClick={() => setTask(t)} style={{ fontSize: 11, color: C.muted, padding: '5px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', lineHeight: 1.4 }}>
                  {t.slice(0, 70)}…
                </div>
              ))}
            </div>
          )}

          {/* Letzte Runs (Memory) */}
          {recentRuns.length > 0 && !running && events.length === 0 && (
            <div style={{ marginTop: 14 }}>
              <Label>Letzte Runs</Label>
              {recentRuns.slice(-3).map((r, i) => (
                <div key={i} onClick={() => setTask(r.task)} style={{ fontSize: 10, color: C.muted, padding: '4px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', lineHeight: 1.4 }} title={r.summary}>
                  <span style={{ color: C.text, fontWeight: 500 }}>{r.task.slice(0, 55)}{r.task.length > 55 ? '…' : ''}</span><br />
                  <span>{new Date(r.created_at).toLocaleDateString('de-DE')}</span>
                </div>
              ))}
            </div>
          )}

          {/* MCP-Server-Status */}
          {mcpServers.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <Label>MCP-Server</Label>
              {mcpServers.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0', fontSize: 10, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.status === 'connected' ? '#16a34a' : '#f85149', flexShrink: 0 }} />
                  <span style={{ flex: 1, color: C.text, fontWeight: 500 }}>{s.name}</span>
                  <span style={{ color: C.muted }}>{s.toolCount} Tools</span>
                </div>
              ))}
            </div>
          )}

          {/* TODO-Liste */}
          {todos.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <Label>Plan ({todos.filter(t => t.done).length}/{todos.length} erledigt)</Label>
              {todos.map(t => (
                <div key={t.index} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', padding: '3px 0', fontSize: 11, color: t.done ? C.muted : C.text, textDecoration: t.done ? 'line-through' : 'none', lineHeight: 1.4 }}>
                  <span style={{ color: t.done ? '#3fb950' : C.muted, flexShrink: 0, marginTop: 1 }}>{t.done ? '✓' : '○'}</span>
                  <span>{t.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Geänderte Dateien */}
          {changedFiles.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <Label>Geänderte Dateien ({changedFiles.length})</Label>
              {changedFiles.map(f => (
                <div key={f} onClick={() => { setActiveFile(f); if (!fileContents[f]) loadFileContent(f) }} style={{
                  fontSize: 10, fontFamily: 'monospace', padding: '4px 6px', borderRadius: 4, marginBottom: 3,
                  background: activeFile === f ? C.accent + '20' : '#fff',
                  color: activeFile === f ? C.accent : C.text,
                  cursor: 'pointer', wordBreak: 'break-all', lineHeight: 1.4,
                  border: `1px solid ${activeFile === f ? C.accent : C.border}`
                }}>
                  {f.split('/').pop()}<br />
                  <span style={{ color: C.muted, fontSize: 9 }}>{f.split('/').slice(0, -1).join('/')}</span>
                </div>
              ))}
            </div>
          )}

          {prResult && (
            <div style={{ marginTop: 12, background: '#f0fff4', border: '1px solid #86efac', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>✅ Draft-PR erstellt</div>
              <a href={prResult.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#16a34a', display: 'block' }}>
                #{prResult.number} auf GitHub →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Rechte Spalte: Terminal-Feed oder Datei-Vorschau */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {/* Tab-Leiste: Feed / Datei-Vorschau */}
        {changedFiles.length > 0 && (
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.card }}>
            <button onClick={() => setActiveFile(null)} style={{ padding: '7px 14px', fontSize: 11, border: 'none', background: activeFile === null ? C.bg : 'transparent', color: activeFile === null ? C.accent : C.muted, cursor: 'pointer', fontWeight: activeFile === null ? 700 : 500 }}>
              📡 Live-Feed
            </button>
            {changedFiles.slice(0, 4).map(f => (
              <button key={f} onClick={() => { setActiveFile(f); if (!fileContents[f]) loadFileContent(f) }} style={{ padding: '7px 12px', fontSize: 10, border: 'none', fontFamily: 'monospace', background: activeFile === f ? C.bg : 'transparent', color: activeFile === f ? C.accent : C.muted, cursor: 'pointer', fontWeight: activeFile === f ? 700 : 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                {f.split('/').pop()}{fileDiffs[f] && <span style={{ fontSize: 8, background: C.accent + '33', color: C.accent, padding: '0 3px', borderRadius: 3 }}>diff</span>}
              </button>
            ))}
          </div>
        )}

        {/* Live-Feed */}
        {activeFile === null && (
          <div style={{ flex: 1, overflowY: 'auto', background: C.terminal, padding: '10px 0', fontFamily: 'monospace' }}>
            {events.length === 0 && !running && (
              <div style={{ padding: 24, textAlign: 'center', color: C.terminalMuted, fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🤖</div>
                <div style={{ fontWeight: 700, color: C.terminalText, marginBottom: 6 }}>MMOS Dev-Agent bereit</div>
                {agentConfig && (
                  <div style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#161b22', padding: '4px 10px', borderRadius: 20, border: '1px solid #30363d' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3fb950', display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: C.terminalText, fontFamily: 'monospace' }}>
                      {agentConfig.provider === 'groq' ? '⚡ Groq' : agentConfig.provider === 'ollama' ? '🦙 Ollama' : '🤖 Anthropic'} · {agentConfig.model}
                    </span>
                  </div>
                )}
                <div style={{ lineHeight: 1.7, color: C.terminalMuted, maxWidth: 320, margin: '0 auto', fontSize: 12 }}>
                  Der Agent exploriert selbstständig den Codebase, denkt laut nach, liest Dateien, macht gezielte Edits und erstellt einen Draft-PR.
                </div>
              </div>
            )}
            {events.map((ev, i) => renderEvent(ev, i))}
            {running && (
              <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, color: C.terminalMuted, fontSize: 12 }}>
                <Spinner size={12} color={C.accent} /> Agent arbeitet…
              </div>
            )}
            <div ref={feedEndRef} />
          </div>
        )}

        {/* Datei-Vorschau mit Diff */}
        {activeFile !== null && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Diff / Full Toggle */}
            <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, background: '#161b22', flexShrink: 0, alignItems: 'center', padding: '4px 12px', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.terminalMuted }}>{activeFile}</span>
              <div style={{ display: 'flex', gap: 0, background: '#0d1117', borderRadius: 6, overflow: 'hidden', border: `1px solid #30363d` }}>
                {(['diff', 'full'] as const).map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{ padding: '3px 10px', fontSize: 10, border: 'none', cursor: 'pointer', background: viewMode === m ? C.accent : 'transparent', color: viewMode === m ? '#fff' : C.terminalMuted, fontWeight: viewMode === m ? 700 : 400 }}>
                    {m === 'diff' ? '± Diff' : '📄 Voll'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', background: C.terminal }}>
              {!fileContents[activeFile] ? (
                <div style={{ padding: 24, textAlign: 'center', color: C.terminalMuted }}><Spinner color={C.accent} /> Lade…</div>
              ) : viewMode === 'full' || !fileDiffs[activeFile] ? (
                <pre style={{ margin: 0, padding: 14, color: C.terminalText, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {fileContents[activeFile]}
                </pre>
              ) : (
                <DiffView oldContent={fileDiffs[activeFile].old} newContent={fileDiffs[activeFile].new} />
              )}
            </div>
          </div>
        )}

        {/* Bestätigungs-Modal */}
        {pendingConfirmation && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: C.card, borderRadius: 12, padding: 18, maxWidth: 460, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: C.text }}>
                🤔 Agent möchte eine Datei ändern
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
                <strong>{pendingConfirmation.op}</strong> → <code style={{ background: C.bg, padding: '1px 5px', borderRadius: 3 }}>{pendingConfirmation.path}</code>
              </div>
              {pendingConfirmation.preview && (
                <pre style={{ background: '#0d1117', color: '#e2e8f0', padding: '8px 10px', borderRadius: 7, fontSize: 10, maxHeight: 140, overflow: 'auto', margin: '0 0 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {pendingConfirmation.preview}
                </pre>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={() => respondConfirmation(true)} style={{ flex: 1, justifyContent: 'center', background: '#166534', borderColor: '#166534' }}>✅ Übernehmen</Btn>
                <Btn onClick={() => respondConfirmation(false)} variant="ghost" style={{ flex: 1, justifyContent: 'center', color: C.accent, borderColor: C.accent }}>❌ Ablehnen</Btn>
              </div>
            </div>
          </div>
        )}

        {error && !running && (
          <div style={{ padding: '8px 12px', background: '#2d1b1b', borderTop: '1px solid #f8514933', color: '#f85149', fontSize: 12, flexShrink: 0 }}>
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab: Chat ─────────────────────────────────────────────────────────────────

interface ChatImage { data: string; mediaType: string; preview: string }
interface ChatMessage2 extends ChatMessage { images?: ChatImage[] }

function ChatTab({ apiBase, userName }: { apiBase: string; userName?: string }) {
  const [messages, setMessages] = useState<ChatMessage2[]>([{
    role: 'assistant',
    content: 'Hallo! Ich helfe bei Marketing-Strategie, Code-Fragen, SEO und GitHub. Bilder hochladen via 📎. Für Code-Aufgaben: "Agent"-Tab.'
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingImages, setPendingImages] = useState<ChatImage[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef  = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 3)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string
        const base64  = dataUrl.split(',')[1]
        const mediaType = file.type || 'image/jpeg'
        setPendingImages(prev => [...prev.slice(-2), { data: base64, mediaType, preview: dataUrl }])
      }
      reader.readAsDataURL(file)
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const msg = input.trim(); if ((!msg && !pendingImages.length) || loading) return
    const imgs = [...pendingImages]
    setInput(''); setPendingImages([])

    const userMsg: ChatMessage2 = { role: 'user', content: msg || '(Bild)', images: imgs.length ? imgs : undefined }
    const updated = [...messages, userMsg]
    setMessages(updated); setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/admin/ai/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.slice(-12).map(m => ({ role: m.role, content: m.content })),
          context:  { userName },
          images:   imgs.map(({ data, mediaType }) => ({ data, mediaType }))
        })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.ok ? data.reply : `Fehler: ${data.error}` }])
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Verbindungsfehler.' }]) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, background: C.bg }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
            {m.role === 'assistant' && <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, alignSelf: 'flex-end' }}>🤖</div>}
            <div style={{ maxWidth: '80%' }}>
              {m.images?.length ? (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 4 }}>
                  {m.images.map((img, j) => (
                    <img key={j} src={img.preview} alt="" style={{ maxWidth: 140, maxHeight: 100, borderRadius: 8, objectFit: 'cover', border: `2px solid ${C.accent}` }} />
                  ))}
                </div>
              ) : null}
              {m.content && <div style={{ padding: '9px 13px', borderRadius: 14, background: m.role === 'user' ? C.accent : C.card, color: m.role === 'user' ? '#fff' : C.text, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderBottomRightRadius: m.role === 'user' ? 4 : 14, borderBottomLeftRadius: m.role === 'assistant' ? 4 : 14 }}>{m.content}</div>}
            </div>
          </div>
        ))}
        {loading && <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}><div style={{ width: 28, height: 28, borderRadius: '50%', background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🤖</div><div style={{ background: C.card, borderRadius: '14px 14px 14px 4px', padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}><Spinner /></div></div>}
        <div ref={endRef} />
      </div>

      {/* Bild-Vorschau (pending) */}
      {pendingImages.length > 0 && (
        <div style={{ padding: '6px 10px', background: '#f8fafc', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {pendingImages.map((img, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={img.preview} alt="" style={{ width: 52, height: 52, borderRadius: 7, objectFit: 'cover', border: `1.5px solid ${C.border}` }} />
              <button onClick={() => setPendingImages(p => p.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: '50%', background: C.accent, border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          ))}
          <span style={{ fontSize: 10, color: C.muted }}>{pendingImages.length} Bild(er) bereit</span>
        </div>
      )}

      <form onSubmit={send} style={{ padding: 10, background: C.card, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
        <button type="button" onClick={() => fileRef.current?.click()} title="Bild hochladen" style={{ background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '7px 10px', cursor: 'pointer', fontSize: 16, color: C.muted, flexShrink: 0 }}>📎</button>
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Frage, Aufgabe oder Bild senden…" disabled={loading} style={{ flex: 1 }} />
        <Btn disabled={loading || (!input.trim() && !pendingImages.length)} style={{ minWidth: 70 }}>{loading ? <Spinner color="#fff" /> : 'Senden'}</Btn>
      </form>
    </div>
  )
}

// ── Tab: GitHub ───────────────────────────────────────────────────────────────

function GitHubTab({ apiBase }: { apiBase: string }) {
  const [view, setView] = useState<'list' | 'issue' | 'review'>('list')
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [prs, setPRs] = useState<GitHubPR[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [issueDesc, setIssueDesc] = useState(''); const [issueType, setIssueType] = useState<IssueType>('bug')
  const [reviewPrNum, setReviewPrNum] = useState(''); const [reviewText, setReviewText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [i, p] = await Promise.all([fetch(`${apiBase}/api/admin/ai/github/issues`), fetch(`${apiBase}/api/admin/ai/github/prs`)])
      const [id, pd] = await Promise.all([i.json(), p.json()])
      if (id.ok) setIssues(id.issues || [])
      if (pd.ok) setPRs(pd.prs || [])
    } catch { setError('Laden fehlgeschlagen') }
    finally { setLoading(false) }
  }, [apiBase])

  useEffect(() => { load() }, [load])

  async function submitIssue() {
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await apiPost(`${apiBase}/api/admin/ai/github/issue/ai`, { description: issueDesc, type: issueType })
      const data = await res.json()
      if (data.ok) { setResult(`Issue #${data.issue.number}: ${data.issue.url}`); setIssueDesc(''); load() }
      else setError(data.error)
    } catch { setError('Verbindungsfehler') } finally { setLoading(false) }
  }

  async function submitReview() {
    setLoading(true); setError(null); setReviewText('')
    try {
      const res = await apiPost(`${apiBase}/api/admin/ai/github/review`, { prNumber: Number(reviewPrNum) })
      const data = await res.json()
      if (data.ok) { setReviewText(data.review) } else { setError(data.error) }
    } catch { setError('Verbindungsfehler') } finally { setLoading(false) }
  }

  const nav = (v: typeof view, l: string) => <button onClick={() => setView(v)} style={{ padding: '6px 11px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: 6, background: view === v ? C.primary : 'transparent', color: view === v ? '#fff' : C.muted }}>{l}</button>

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: C.bg, padding: 4, borderRadius: 8 }}>
        {nav('list', '📋 Übersicht')}{nav('issue', '🐛 Issue')}{nav('review', '👁 Review')}
      </div>
      {error && <ErrBox msg={error} />}
      {result && <div style={{ background: '#f0fff4', color: '#166534', padding: '7px 10px', borderRadius: 7, marginBottom: 10, fontSize: 12, wordBreak: 'break-all' }}>{result}</div>}

      {view === 'list' && <>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><strong style={{ fontSize: 13 }}>Issues ({issues.length})</strong><Btn variant="ghost" onClick={load} disabled={loading} style={{ fontSize: 11, padding: '4px 10px' }}>🔄</Btn></div>
        {issues.slice(0, 8).map(i => <Card key={i.number} style={{ marginBottom: 5, padding: 9 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><a href={i.html_url} target="_blank" rel="noreferrer" style={{ color: C.primary, fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>#{i.number} {i.title}</a><div style={{ display: 'flex', gap: 3 }}>{i.labels?.map(l => <Badge key={l.name} color={C.accent}>{l.name}</Badge>)}</div></div></Card>)}
        <strong style={{ fontSize: 13, display: 'block', margin: '10px 0 6px' }}>PRs ({prs.length})</strong>
        {prs.slice(0, 8).map(p => <Card key={p.number} style={{ marginBottom: 5, padding: 9 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><a href={p.html_url} target="_blank" rel="noreferrer" style={{ color: C.primary, fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>#{p.number} {p.title}</a><div style={{ display: 'flex', gap: 3 }}>{p.draft && <Badge color="#8b5cf6">Draft</Badge>}<Badge color="#16a34a">{p.state}</Badge></div></div></Card>)}
      </>}

      {view === 'issue' && <Card>
        <h3 style={{ margin: '0 0 10px', fontSize: 13 }}>KI-Issue erstellen</h3>
        <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
          {(['bug', 'feature', 'chore', 'security'] as IssueType[]).map(t => <button key={t} onClick={() => setIssueType(t)} style={{ padding: '3px 9px', fontSize: 11, borderRadius: 6, border: `1.5px solid ${issueType === t ? C.accent : C.border}`, background: issueType === t ? '#fff3f5' : 'transparent', color: issueType === t ? C.accent : C.muted, cursor: 'pointer', fontWeight: 600 }}>{t}</button>)}
        </div>
        <Textarea value={issueDesc} onChange={e => setIssueDesc(e.target.value)} rows={4} placeholder="Beschreibe das Problem informell…" style={{ marginBottom: 10 }} />
        <Btn onClick={submitIssue} disabled={loading || !issueDesc}>{loading ? <Spinner color="#fff" /> : '🤖 Erstellen'}</Btn>
      </Card>}

      {view === 'review' && <Card>
        <h3 style={{ margin: '0 0 10px', fontSize: 13 }}>PR Code-Review</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Input value={reviewPrNum} onChange={e => setReviewPrNum(e.target.value)} placeholder="PR #" type="number" style={{ width: 100 }} />
          <Btn onClick={submitReview} disabled={loading || !reviewPrNum}>{loading ? <Spinner color="#fff" /> : '🔍 Analysieren'}</Btn>
        </div>
        {reviewText && <div style={{ background: C.bg, borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 380, overflowY: 'auto' }}>{reviewText}</div>}
      </Card>}
    </div>
  )
}

// ── Tab: Keywords ─────────────────────────────────────────────────────────────

function KeywordsTab({ apiBase }: { apiBase: string }) {
  const [businessType, setBusinessType] = useState(''); const [location, setLocation] = useState('')
  const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(null)
  const [loading, setLoading] = useState(false); const [dl, setDl] = useState(false); const [error, setError] = useState<string | null>(null)

  async function analyze() {
    if (!businessType) return; setLoading(true); setError(null); setAnalysis(null)
    try {
      const res = await apiPost(`${apiBase}/api/admin/ai/keywords`, { businessType, location: location || 'Mecklenburg-Vorpommern', language: 'de', competitors: [] })
      const d = await res.json(); if (d.ok) setAnalysis(d.analysis); else setError(d.error)
    } catch { setError('Verbindungsfehler') } finally { setLoading(false) }
  }

  async function downloadPDF() {
    if (!analysis) return; setDl(true)
    try {
      const res = await apiPost(`${apiBase}/api/admin/ai/pdf/keywords`, { analysis, businessType, location })
      if (!res.ok) { setError('PDF fehlgeschlagen'); return }
      const blob = await res.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `keyword-analyse-${Date.now()}.pdf`; a.click(); URL.revokeObjectURL(url)
    } catch { setError('Download fehlgeschlagen') } finally { setDl(false) }
  }

  function KwTable({ rows, cols }: { rows: Record<string, string>[]; cols: { key: string; label: string }[] }) {
    return <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}><thead><tr>{cols.map(c => <th key={c.key} style={{ background: C.accent, color: '#fff', padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : C.bg }}>{cols.map(c => <td key={c.key} style={{ padding: '5px 8px', borderBottom: `1px solid ${C.border}` }}>{r[c.key] || '—'}</td>)}</tr>)}</tbody></table></div>
  }

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      <Card style={{ marginBottom: 10 }}>
        <Label>Branche *</Label><Input value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="z.B. Friseursalon, Restaurant…" style={{ marginBottom: 8 }} />
        <Label>Standort</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="z.B. Rostock" style={{ marginBottom: 10 }} />
        <Btn onClick={analyze} disabled={loading || !businessType}>{loading ? <Spinner color="#fff" /> : '🔍 Analysieren'}</Btn>
      </Card>
      {error && <ErrBox msg={error} />}
      {analysis && <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}><Btn onClick={downloadPDF} disabled={dl} variant="secondary" style={{ fontSize: 11 }}>{dl ? <Spinner color="#fff" /> : '⬇ PDF'}</Btn></div>
        {analysis.summary && <Card style={{ marginBottom: 8 }}><Label>Zusammenfassung</Label><p style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>{analysis.summary}</p></Card>}
        {analysis.primaryKeywords?.length ? <Card style={{ marginBottom: 8 }}><Label>Primäre Keywords</Label><KwTable rows={analysis.primaryKeywords} cols={[{ key: 'keyword', label: 'Keyword' }, { key: 'intent', label: 'Intention' }, { key: 'difficulty', label: 'Schwierigkeit' }, { key: 'volume', label: 'Volumen' }]} /></Card> : null}
        {analysis.contentIdeas?.length ? <Card style={{ marginBottom: 8 }}><Label>Content-Ideen</Label><ul style={{ margin: 0, padding: '0 0 0 14px' }}>{analysis.contentIdeas.map((x, i) => <li key={i} style={{ fontSize: 12, marginBottom: 3 }}>{x}</li>)}</ul></Card> : null}
      </>}
    </div>
  )
}

// ── Tab: PDF ──────────────────────────────────────────────────────────────────

function PDFTab({ apiBase }: { apiBase: string }) {
  const [title, setTitle] = useState(''); const [author, setAuthor] = useState('')
  const [sections, setSections] = useState([{ title: '', text: '' }])
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true); setError(null)
    try {
      const res = await apiPost(`${apiBase}/api/admin/ai/pdf/report`, { title, author, sections: sections.filter(s => s.title) })
      if (!res.ok) { setError('Fehlgeschlagen'); return }
      const blob = await res.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `report-${Date.now()}.pdf`; a.click(); URL.revokeObjectURL(url)
    } catch { setError('Verbindungsfehler') } finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      <Card>
        <Label>Titel *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Report-Titel" style={{ marginBottom: 8 }} />
        <Label>Autor</Label><Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Name" style={{ marginBottom: 10 }} />
        <Label>Sektionen</Label>
        {sections.map((s, i) => <div key={i} style={{ background: C.bg, borderRadius: 7, padding: 9, marginBottom: 7 }}><Input value={s.title} onChange={e => setSections(p => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder={`Abschnitt ${i + 1}`} style={{ marginBottom: 5 }} /><Textarea value={s.text} onChange={e => setSections(p => p.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} rows={3} placeholder="Text…" /></div>)}
        <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
          <Btn variant="ghost" onClick={() => setSections(p => [...p, { title: '', text: '' }])} style={{ fontSize: 11 }}>+ Sektion</Btn>
          {sections.length > 1 && <Btn variant="ghost" onClick={() => setSections(p => p.slice(0, -1))} style={{ fontSize: 11, color: C.accent }}>− Entfernen</Btn>}
        </div>
        {error && <ErrBox msg={error} />}
        <Btn onClick={generate} disabled={loading || !title || !sections.some(s => s.title)}>{loading ? <Spinner color="#fff" /> : '⬇ PDF generieren'}</Btn>
      </Card>
    </div>
  )
}

// ── Tab: Registry (Agents & Skills) ───────────────────────────────────────────

const CATEGORIES = ['general', 'backend', 'frontend', 'migration', 'docs']

function RegistryTab({ apiBase, onRunSkill }: { apiBase: string; onRunSkill: (prompt: string, agentSlug?: string) => void }) {
  const [agents, setAgents] = useState<MmosAgent[]>([])
  const [skills, setSkills] = useState<MmosSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'skills' | 'agents' | 'new-agent' | 'new-skill' | 'install'>('skills')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState('')

  // Formulare
  const [agentForm, setAgentForm] = useState({ name: '', slug: '', description: '', icon: '🤖', system_prompt: '', allowed_tools: '' })
  const [skillForm, setSkillForm]  = useState({ name: '', slug: '', description: '', icon: '⚡', category: 'general', prompt_template: '', agent_slug: '' })

  // URL-Install
  const [installUrl, setInstallUrl]         = useState('')
  const [installLoading, setInstallLoading] = useState(false)
  const [installResult, setInstallResult]   = useState<{ package_name: string; author?: string; installed: { agents: string[]; skills: string[] }; skipped: string[] } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ar, sr] = await Promise.all([
        fetch(`${apiBase}/api/admin/ai/registry/agents`).then(r => r.json()),
        fetch(`${apiBase}/api/admin/ai/registry/skills`).then(r => r.json())
      ])
      if (ar.ok) setAgents(ar.agents || [])
      if (sr.ok) setSkills(sr.skills || [])
    } catch { setError('Laden fehlgeschlagen') }
    finally { setLoading(false) }
  }, [apiBase])

  useEffect(() => { load() }, [load])

  async function saveAgent() {
    setError(null)
    try {
      const res = await apiPost(`${apiBase}/api/admin/ai/registry/agents`, {
        ...agentForm,
        allowed_tools: agentForm.allowed_tools ? agentForm.allowed_tools.split(',').map(s => s.trim()).filter(Boolean) : null
      })
      const d = await res.json()
      if (!d.ok) { setError(d.error); return }
      setSuccess(`Agent "${d.agent.name}" installiert`)
      setView('agents'); load()
    } catch (e) { setError((e as Error).message) }
  }

  async function saveSkill() {
    setError(null)
    try {
      const res = await apiPost(`${apiBase}/api/admin/ai/registry/skills`, skillForm)
      const d = await res.json()
      if (!d.ok) { setError(d.error); return }
      setSuccess(`Skill "${d.skill.name}" installiert`)
      setView('skills'); load()
    } catch (e) { setError((e as Error).message) }
  }

  async function installFromUrl() {
    if (!installUrl.trim() || installLoading) return
    setInstallLoading(true); setError(null); setInstallResult(null)
    try {
      const res = await apiPost(`${apiBase}/api/admin/ai/registry/install`, { url: installUrl.trim() })
      const d = await res.json()
      if (!d.ok) { setError(d.error || 'Fehler beim Installieren'); return }
      setInstallResult(d)
      setInstallUrl('')
      load()
    } catch (e) { setError((e as Error).message) }
    finally { setInstallLoading(false) }
  }

  async function deleteItem(type: 'agents' | 'skills', id: string, name: string) {
    if (!confirm(`"${name}" wirklich löschen?`)) return
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/admin/ai/registry/${type}/${id}`, { method: 'DELETE' })
      const d = await res.json()
      if (!d.ok) { setError(d.error || 'Fehler'); return }
      load()
    } catch (e) { setError((e as Error).message) }
  }

  async function toggleActive(type: 'agents' | 'skills', id: string, current: boolean) {
    try {
      await fetch(`${apiBase}/api/admin/ai/registry/${type}/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current })
      })
      load()
    } catch {}
  }

  const filteredSkills = catFilter ? skills.filter(s => s.category === catFilter) : skills
  const navBtn = (v: typeof view, label: string) => (
    <button onClick={() => { setView(v); setError(null); setSuccess(null) }} style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: 6, background: view === v ? C.primary : 'transparent', color: view === v ? '#fff' : C.muted }}>{label}</button>
  )

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      {/* Nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: C.bg, padding: 4, borderRadius: 8, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {navBtn('skills', `⚡ Skills (${skills.length})`)}
          {navBtn('agents', `🤖 Agents (${agents.length})`)}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {navBtn('install', '📦 Install')}
          {navBtn('new-skill', '+ Skill')}
          {navBtn('new-agent', '+ Agent')}
          <button onClick={load} style={{ padding: '5px 8px', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, background: 'transparent', cursor: 'pointer', color: C.muted }}>🔄</button>
        </div>
      </div>

      {error   && <ErrBox msg={error} />}
      {success && <div style={{ background: '#f0fff4', color: '#166534', padding: '7px 10px', borderRadius: 7, marginBottom: 10, fontSize: 12 }}>✅ {success}</div>}
      {loading && <div style={{ textAlign: 'center', padding: 20, color: C.muted }}><Spinner /> Lade…</div>}

      {/* Skills-Liste */}
      {view === 'skills' && !loading && (
        <>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
            {['', ...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{ padding: '3px 8px', fontSize: 10, fontWeight: 600, borderRadius: 99, border: `1.5px solid ${catFilter === cat ? C.accent : C.border}`, background: catFilter === cat ? '#fff3f5' : 'transparent', color: catFilter === cat ? C.accent : C.muted, cursor: 'pointer' }}>
                {cat || 'Alle'}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {filteredSkills.map(skill => (
              <div key={skill.id} style={{ background: skill.is_active ? C.card : '#f8f8f8', border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, opacity: skill.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{skill.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: C.text, lineHeight: 1.3 }}>{skill.name}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{skill.description}</div>
                  </div>
                </div>
                {skill.mmos_agents && (
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>
                    Agent: {skill.mmos_agents.icon} {skill.mmos_agents.name}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <Btn onClick={() => onRunSkill(skill.prompt_template, skill.agent_slug || undefined)} style={{ fontSize: 10, padding: '4px 10px', flex: 1 }}>▶ Ausführen</Btn>
                  {!skill.is_builtin && (
                    <button onClick={() => deleteItem('skills', skill.id, skill.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.muted, padding: 2 }} title="Löschen">🗑</button>
                  )}
                  <button onClick={() => toggleActive('skills', skill.id, skill.is_active)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.muted, padding: 2 }} title={skill.is_active ? 'Deaktivieren' : 'Aktivieren'}>
                    {skill.is_active ? '⏸' : '▶'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filteredSkills.length === 0 && <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: 24 }}>Keine Skills{catFilter ? ` in "${catFilter}"` : ''}</div>}
        </>
      )}

      {/* Agents-Liste */}
      {view === 'agents' && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {agents.map(agent => (
            <div key={agent.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, opacity: agent.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{agent.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{agent.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{agent.description}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    {agent.provider !== 'default' ? agent.provider : 'Standard-Provider'} · {agent.allowed_tools ? `${agent.allowed_tools.length} Tools` : 'Alle Tools'}
                    {agent.is_builtin && <Badge color={C.muted}>Built-in</Badge>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {!agent.is_builtin && (
                    <button onClick={() => deleteItem('agents', agent.id, agent.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.muted }} title="Löschen">🗑</button>
                  )}
                  <button onClick={() => toggleActive('agents', agent.id, agent.is_active)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.muted }} title={agent.is_active ? 'Deaktivieren' : 'Aktivieren'}>
                    {agent.is_active ? '⏸' : '▶'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {agents.length === 0 && <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: 24 }}>Keine Agents installiert</div>}
        </div>
      )}

      {/* Von URL installieren */}
      {view === 'install' && (
        <Card>
          <h3 style={{ margin: '0 0 6px', fontSize: 13 }}>📦 Von GitHub installieren</h3>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
            GitHub-Repo-URL oder direkte JSON-URL eingeben.<br />
            Das Paket muss eine <code style={{ background: '#f0f4f8', padding: '1px 4px', borderRadius: 3 }}>mmos-package.json</code> enthalten.
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Input
              value={installUrl}
              onChange={e => setInstallUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              onKeyDown={e => e.key === 'Enter' && installFromUrl()}
              style={{ flex: 1 }}
            />
            <Btn onClick={installFromUrl} disabled={!installUrl.trim() || installLoading}>
              {installLoading ? <Spinner color="#fff" /> : '⬇ Install'}
            </Btn>
          </div>

          {installResult && (
            <div style={{ background: '#f0fff4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#166534', marginBottom: 8 }}>
                ✅ {installResult.package_name}{installResult.author ? ` — von ${installResult.author}` : ''}
              </div>
              {installResult.installed.agents.length > 0 && (
                <div style={{ fontSize: 12, color: '#166534', marginBottom: 4 }}>
                  🤖 Agents: {installResult.installed.agents.join(', ')}
                </div>
              )}
              {installResult.installed.skills.length > 0 && (
                <div style={{ fontSize: 12, color: '#166534', marginBottom: 4 }}>
                  ⚡ Skills: {installResult.installed.skills.join(', ')}
                </div>
              )}
              {installResult.skipped.length > 0 && (
                <div style={{ fontSize: 11, color: '#92400e', marginTop: 6, background: '#fffbeb', padding: '6px 8px', borderRadius: 6 }}>
                  ⚠ Übersprungen: {installResult.skipped.join(' · ')}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 16, padding: '10px 12px', background: C.bg, borderRadius: 8, fontSize: 11, color: C.muted }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Unterstützte URL-Formate:</div>
            <code style={{ display: 'block', marginBottom: 3 }}>https://github.com/user/repo</code>
            <code style={{ display: 'block', marginBottom: 3 }}>https://github.com/user/repo/blob/main/my-agent.json</code>
            <code style={{ display: 'block' }}>https://gist.github.com/user/hash</code>
            <div style={{ marginTop: 8, fontWeight: 700, marginBottom: 4 }}>Format der mmos-package.json:</div>
            <pre style={{ fontSize: 10, background: '#1e293b', color: '#e2e8f0', padding: 8, borderRadius: 6, overflow: 'auto', margin: 0 }}>{`{
  "mmos_package": "1.0",
  "name": "Mein Agent Pack",
  "author": "dein-github-name",
  "agents": [{
    "name": "Mein Agent",
    "slug": "mein-agent",
    "icon": "🚀",
    "system_prompt": "Du bist..."
  }],
  "skills": [{
    "name": "Mein Skill",
    "slug": "mein-skill",
    "category": "backend",
    "prompt_template": "Erstelle..."
  }]
}`}</pre>
          </div>
        </Card>
      )}

      {/* Neuen Agent installieren */}
      {view === 'new-agent' && (
        <Card>
          <h3 style={{ margin: '0 0 12px', fontSize: 13 }}>Neuen Agent installieren</h3>
          {(['name', 'slug', 'icon', 'description'] as const).map(f => (
            <div key={f} style={{ marginBottom: 8 }}>
              <Label>{f}</Label>
              <Input value={agentForm[f]} onChange={e => setAgentForm(p => ({ ...p, [f]: e.target.value }))} placeholder={f === 'slug' ? 'z.B. mein-agent' : f === 'icon' ? '🤖' : ''} />
            </div>
          ))}
          <Label>System-Prompt *</Label>
          <Textarea value={agentForm.system_prompt} onChange={e => setAgentForm(p => ({ ...p, system_prompt: e.target.value }))} rows={5} placeholder="Du bist ein Spezialist für…" style={{ marginBottom: 8 }} />
          <Label>Erlaubte Tools (kommagetrennt, leer = alle)</Label>
          <Input value={agentForm.allowed_tools} onChange={e => setAgentForm(p => ({ ...p, allowed_tools: e.target.value }))} placeholder="think, read_file, patch_file, task_complete" style={{ marginBottom: 12 }} />
          <Btn onClick={saveAgent} disabled={!agentForm.name || !agentForm.slug || !agentForm.system_prompt}>💾 Installieren</Btn>
        </Card>
      )}

      {/* Neuen Skill installieren */}
      {view === 'new-skill' && (
        <Card>
          <h3 style={{ margin: '0 0 12px', fontSize: 13 }}>Neuen Skill installieren</h3>
          {(['name', 'slug', 'icon', 'description'] as const).map(f => (
            <div key={f} style={{ marginBottom: 8 }}>
              <Label>{f}</Label>
              <Input value={skillForm[f]} onChange={e => setSkillForm(p => ({ ...p, [f]: e.target.value }))} placeholder={f === 'slug' ? 'z.B. mein-skill' : f === 'icon' ? '⚡' : ''} />
            </div>
          ))}
          <Label>Kategorie</Label>
          <select value={skillForm.category} onChange={e => setSkillForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', padding: '7px 11px', borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 13, marginBottom: 8, background: '#fff' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Label>Agent (optional)</Label>
          <select value={skillForm.agent_slug} onChange={e => setSkillForm(p => ({ ...p, agent_slug: e.target.value }))} style={{ width: '100%', padding: '7px 11px', borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 13, marginBottom: 8, background: '#fff' }}>
            <option value="">Standard-Agent</option>
            {agents.filter(a => a.is_active).map(a => <option key={a.slug} value={a.slug}>{a.icon} {a.name}</option>)}
          </select>
          <Label>Prompt-Template * (nutze {'{{VARIABLE}}'} für Platzhalter)</Label>
          <Textarea value={skillForm.prompt_template} onChange={e => setSkillForm(p => ({ ...p, prompt_template: e.target.value }))} rows={6} placeholder={'Erstelle einen neuen {{AUFGABE}} nach MMOS-Pattern…'} style={{ marginBottom: 12 }} />
          <Btn onClick={saveSkill} disabled={!skillForm.name || !skillForm.slug || !skillForm.prompt_template}>💾 Installieren</Btn>
        </Card>
      )}
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export function AdminAiAssistant({ apiBase = '', userName }: AdminAiAssistantProps) {
  const [activeTab, setActiveTab] = useState<Tab>('agent')
  const [minimized, setMinimized] = useState(false)
  // Skill → Agent Handoff: wenn Skill geklickt, Task + AgentSlug in AgentTab übertragen
  const [pendingSkillTask, setPendingSkillTask] = useState('')
  const [pendingAgentSlug, setPendingAgentSlug] = useState<string | undefined>(undefined)

  function handleRunSkill(prompt: string, agentSlug?: string) {
    setPendingSkillTask(prompt)
    setPendingAgentSlug(agentSlug)
    setActiveTab('agent')
  }

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'agent',    icon: '🤖', label: 'Agent' },
    { id: 'registry', icon: '⚡', label: 'Skills' },
    { id: 'chat',     icon: '💬', label: 'Chat' },
    { id: 'github',   icon: '🐙', label: 'GitHub' },
    { id: 'keywords', icon: '🔍', label: 'SEO' },
    { id: 'pdf',      icon: '📄', label: 'PDF' }
  ]

  return (
    <>
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9990,
        width: minimized ? 'auto' : 720,
        height: minimized ? 'auto' : 640,
        maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)',
        background: C.card, borderRadius: 14,
        boxShadow: '0 12px 60px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}>
        {/* Header */}
        <div style={{ background: C.primary, color: '#fff', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>MMOS Admin AI</div>
            {!minimized && <div style={{ fontSize: 10, opacity: 0.55 }}>{userName ? `Admin: ${userName}` : 'MecklenburgMarketingOS'}</div>}
          </div>
          <button onClick={() => setMinimized(m => !m)} style={{ background: 'none', border: 'none', color: '#fff9', cursor: 'pointer', fontSize: 15, padding: 4 }}>
            {minimized ? '⬆' : '⬇'}
          </button>
        </div>

        {!minimized && <>
          {/* Tab-Bar */}
          <div style={{ display: 'flex', background: '#f0f4f8', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer',
                background: activeTab === t.id ? C.card : 'transparent',
                color: activeTab === t.id ? C.accent : C.muted,
                fontWeight: activeTab === t.id ? 700 : 500, fontSize: 11,
                borderBottom: activeTab === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
                transition: 'all 0.15s'
              }}>
                <div style={{ fontSize: 14 }}>{t.icon}</div>
                <div>{t.label}</div>
              </button>
            ))}
          </div>

          {/* Inhalt */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'agent'    && <AgentTab apiBase={apiBase} initialTask={pendingSkillTask} initialAgentSlug={pendingAgentSlug} />}
            {activeTab === 'registry' && <RegistryTab apiBase={apiBase} onRunSkill={handleRunSkill} />}
            {activeTab === 'chat'     && <ChatTab apiBase={apiBase} userName={userName} />}
            {activeTab === 'github'   && <GitHubTab apiBase={apiBase} />}
            {activeTab === 'keywords' && <KeywordsTab apiBase={apiBase} />}
            {activeTab === 'pdf'      && <PDFTab apiBase={apiBase} />}
          </div>
        </>}
      </div>
      <style>{`@keyframes mmos-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
