#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const warnings = []

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel) => fs.existsSync(path.join(root, rel))
const fail = (msg) => failures.push(msg)
const warn = (msg) => warnings.push(msg)

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    const rel = path.relative(root, full).replaceAll(path.sep, '/')
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'dist', 'coverage'].includes(entry.name)) continue
      walk(full, files)
    } else files.push(rel)
  }
  return files
}

function duplicateObjectKeys(source, marker) {
  const start = source.indexOf(marker)
  if (start < 0) return []
  const open = source.indexOf('{', start)
  if (open < 0) return []
  let depth = 0, end = -1
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    if (source[i] === '}') depth--
    if (depth === 0) { end = i; break }
  }
  if (end < 0) return []
  const keys = [...source.slice(open + 1, end).matchAll(/\b([A-Za-z0-9_]+)\s*:/g)].map((m) => m[1])
  const seen = new Set(), dupes = new Set()
  for (const key of keys) { if (seen.has(key)) dupes.add(key); seen.add(key) }
  return [...dupes]
}

function duplicateArrayEntries(source, marker) {
  const start = source.indexOf(marker)
  if (start < 0) return []
  const open = source.indexOf('[', start)
  const close = source.indexOf(']', open)
  if (open < 0 || close < 0) return []
  const values = [...source.slice(open, close).matchAll(/'([^']+)'/g)].map((m) => m[1])
  const seen = new Set(), dupes = new Set()
  for (const value of values) { if (seen.has(value)) dupes.add(value); seen.add(value) }
  return [...dupes]
}

const forbiddenPatterns = [
  ['cat > /mnt/data/', 'repo_files'].join(''),
  ['\\nTS\\n\\n', 'cat >'].join(''),
  ['\\nTSX\\n\\n', 'cat >'].join('')
]

for (const rel of walk(root).filter((rel) => /\.(tsx|ts|jsx|js|css|json|md|mjs)$/.test(rel))) {
  if (rel === 'scripts/quality-guard.mjs') continue
  const text = read(rel)
  if (forbiddenPatterns.some((pattern) => text.includes(pattern))) {
    fail(`Shell-/Heredoc-Rest gefunden: ${rel}`)
  }
}

if (!exists('frontend/src/app/page.tsx')) fail('frontend/src/app/page.tsx fehlt')
if (!exists('frontend/src/lib/adminKnowledgeQuiz.ts')) fail('Quiz-Datei fehlt')
if (!exists('frontend/src/components/admin/AdminKnowledgeQuizPanel.tsx')) fail('Quiz-Panel fehlt')

if (exists('frontend/src/app/page.tsx')) {
  const page = read('frontend/src/app/page.tsx')
  const labelDupes = duplicateObjectKeys(page, 'const labels:any=')
  const adminDupes = duplicateArrayEntries(page, 'const admin=')
  if (labelDupes.length) fail(`Doppelte labels-Keys: ${labelDupes.join(', ')}`)
  if (adminDupes.length) fail(`Doppelte admin-Einträge: ${adminDupes.join(', ')}`)
  if (!page.includes("view==='sales_workflow'") || !page.includes('SalesWorkflowCenter')) fail('Verkaufsworkflow ist nicht gerendert')
  if (!page.includes('Backoffice öffnen')) fail('Backoffice-Einstieg fehlt')
  if (page.includes('Neu & wichtig')) fail('Alter Begriff "Neu & wichtig" ist in der Haupt-App noch vorhanden')
  if (!page.includes('sales_workflows') || !page.includes('sales_workflow_events')) warn('Workflow-Historie wird nicht vollständig im Frontend verwendet')
  if (!page.includes('ProductionCoreFinalization') || !page.includes("view==='production_core'")) fail('Production Core Finalization fehlt')
  if (!page.includes('ProductionHealthDashboardV2') || !page.includes("view==='production_health'")) fail('Production Health 2.0 fehlt')
  if (!page.includes('AdminActionLogCenter') || !page.includes("view==='action_log'")) fail('Admin-Aktionslog fehlt')
  if (!page.includes('SmokeTestCenter') || !page.includes("view==='smoke_test'")) fail('Smoke-Test Center fehlt')
  if (!page.includes('ProductionValidationCenter') || !page.includes("view==='production_validation'")) fail('Production Validation fehlt')
}

if (exists('frontend/src/components/admin/AdminKnowledgeQuizPanel.tsx')) {
  const quizPanel = read('frontend/src/components/admin/AdminKnowledgeQuizPanel.tsx')
  if (!quizPanel.includes('const reveal = finished')) fail('Quiz verrät Antworten vor der Auswertung')
  if (quizPanel.includes("mode === 'training' && isAnswered")) fail('Training zeigt Erklärungen vor Auswertung')
  if (!quizPanel.includes('if (finished) return')) fail('Quiz erlaubt Änderungen nach Auswertung')
}

if (exists('frontend/src/lib/adminKnowledgeQuiz.ts')) {
  const quiz = read('frontend/src/lib/adminKnowledgeQuiz.ts')
  if (!quiz.includes('normalizeQuizQuestion') || !quiz.includes('shuffleArray')) fail('Quiz-Antworten werden nicht sichtbar gemischt')
}

if (exists('frontend/src/middleware.ts') && read('frontend/src/middleware.ts').includes('NextResponse.redirect')) {
  fail('Middleware enthält wieder Login-Redirects')
}

if (exists('frontend/src/components/security/ToolAccessGate.tsx') && !read('frontend/src/components/security/ToolAccessGate.tsx').includes('mmos_tool_access_cache_v1')) {
  warn('ToolAccessGate Tool-Cache fehlt')
}

console.log(JSON.stringify({ ok: failures.length === 0, failures, warnings, checkedAt: new Date().toISOString() }, null, 2))
if (failures.length) process.exit(1)
