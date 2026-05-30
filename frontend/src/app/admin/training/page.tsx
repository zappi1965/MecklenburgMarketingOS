'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ADMIN_KNOWLEDGE_QUESTIONS,
  CATEGORY_LABELS,
  buildQuestionSet,
  scoreQuiz,
  type QuizCategory,
  type QuizQuestion
} from '@/lib/adminKnowledgeQuiz'

type Mode = 'training' | 'exam'

const STORAGE_KEY = 'mmos_admin_knowledge_quiz_results_v2'
const CATEGORIES = Object.keys(CATEGORY_LABELS) as QuizCategory[]

export default function AdminTrainingPage() {
  const [mode, setMode] = useState<Mode>('training')
  const [selectedCategories, setSelectedCategories] = useState<QuizCategory[]>(CATEGORIES)
  const [questionCount, setQuestionCount] = useState(30)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, number[]>>({})
  const [finished, setFinished] = useState(false)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    startQuiz('training')
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setHistory(JSON.parse(raw))
    } catch {}
  }, [])

  const result = useMemo(() => scoreQuiz(questions, answers), [questions, answers])
  const answeredCount = questions.filter((q) => (answers[q.id] || []).length > 0).length
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0

  function startQuiz(nextMode = mode) {
    const set = buildQuestionSet(questionCount, selectedCategories)
    setQuestions(set)
    setAnswers({})
    setFinished(false)
    setMode(nextMode)
  }

  function toggleCategory(cat: QuizCategory) {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        const next = prev.filter((c) => c !== cat)
        return next.length ? next : prev
      }
      return [...prev, cat]
    })
  }

  function toggleAnswer(q: QuizQuestion, optionIndex: number) {
    if (finished && mode === 'exam') return
    setAnswers((prev) => {
      const current = prev[q.id] || []
      if (q.correctIndices.length === 1) {
        return { ...prev, [q.id]: [optionIndex] }
      }
      const exists = current.includes(optionIndex)
      return {
        ...prev,
        [q.id]: exists ? current.filter((i) => i !== optionIndex) : [...current, optionIndex]
      }
    })
  }

  function finishQuiz() {
    const payload = {
      id: crypto.randomUUID?.() || String(Date.now()),
      createdAt: new Date().toISOString(),
      mode,
      score: result.percent,
      correct: result.correct,
      total: result.total,
      passed: result.passed,
      byCategory: result.byCategory
    }

    const next = [payload, ...history].slice(0, 12)
    setHistory(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
    setFinished(true)
  }

  function retryWrongOnly() {
    const wrong = questions.filter((q) => {
      const given = [...(answers[q.id] || [])].sort((a, b) => a - b)
      const expected = [...q.correctIndices].sort((a, b) => a - b)
      return given.length !== expected.length || !given.every((v, i) => v === expected[i])
    })
    setQuestions(wrong.length ? wrong : buildQuestionSet(15, selectedCategories))
    setAnswers({})
    setFinished(false)
    setMode('training')
  }

  return (
    <main className="knowledgePage">
      <section className="hero">
        <div>
          <p className="eyebrow">Admin Academy</p>
          <h1>MMOS All-Tools Wissenstest</h1>
          <p className="lead">
            Vollständiger Multiple-Choice-Test zu allen MMOS-Bereichen: CRM, Pipeline,
            Sales, Google, Reviews, Automation, Content, Loyalty, Reports, Finanzen,
            Betrieb, Datenschutz und Sicherheit.
          </p>
        </div>
        <div className="scoreCard">
          <span>{ADMIN_KNOWLEDGE_QUESTIONS.length} Fragen im Pool</span>
          <strong>{finished ? `${result.percent}%` : `${progress}%`}</strong>
          <small>{finished ? (result.passed ? 'Bestanden' : 'Noch nicht bestanden') : `${answeredCount}/${questions.length} beantwortet`}</small>
        </div>
      </section>

      <section className="panel controls">
        <div>
          <label>Modus</label>
          <div className="segmented">
            <button className={mode === 'training' ? 'active' : ''} onClick={() => startQuiz('training')}>Training</button>
            <button className={mode === 'exam' ? 'active' : ''} onClick={() => startQuiz('exam')}>Prüfung</button>
          </div>
        </div>

        <div>
          <label>Fragen</label>
          <select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))}>
            <option value={10}>10 Fragen</option>
            <option value={20}>20 Fragen</option>
            <option value={30}>30 Fragen</option>
            <option value={50}>50 Fragen</option>
            <option value={ADMIN_KNOWLEDGE_QUESTIONS.length}>Alle Fragen</option>
          </select>
        </div>

        <div className="categoryPicker">
          <label>Kategorien</label>
          <div className="chips">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={selectedCategories.includes(cat) ? 'chip active' : 'chip'}
                onClick={() => toggleCategory(cat)}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <button className="primaryBtn" onClick={() => startQuiz(mode)}>Test neu starten</button>
      </section>

      <section className="progressOuter" aria-label="Fortschritt">
        <div className="progressInner" style={{ width: `${finished ? result.percent : progress}%` }} />
      </section>

      {finished && (
        <section className={result.passed ? 'resultBox passed' : 'resultBox failed'}>
          <div>
            <h2>{result.passed ? 'Bestanden' : 'Noch nicht bestanden'}</h2>
            <p>{result.correct} von {result.total} Fragen korrekt · {result.percent}% · Bestehensgrenze 80%</p>
          </div>
          <div className="resultActions">
            <button onClick={retryWrongOnly}>Falsche wiederholen</button>
            <button onClick={() => startQuiz(mode)}>Neuer Test</button>
          </div>
        </section>
      )}

      <section className="questionList">
        {questions.map((q, index) => {
          const selected = answers[q.id] || []
          const isMulti = q.correctIndices.length > 1
          const isAnswered = selected.length > 0
          const given = [...selected].sort((a, b) => a - b)
          const expected = [...q.correctIndices].sort((a, b) => a - b)
          const correct = given.length === expected.length && given.every((v, i) => v === expected[i])

          return (
            <article key={q.id} className="questionCard">
              <div className="questionMeta">
                <span>{index + 1}</span>
                <b>{CATEGORY_LABELS[q.category]}</b>
                <em>{q.difficulty}</em>
                {isMulti && <em>Mehrfachantwort</em>}
              </div>
              <h3>{q.question}</h3>

              <div className="options">
                {q.options.map((option, optionIndex) => {
                  const active = selected.includes(optionIndex)
                  const reveal = finished || mode === 'training'
                  const shouldBe = q.correctIndices.includes(optionIndex)
                  const className = [
                    'optionBtn',
                    active ? 'selected' : '',
                    reveal && shouldBe ? 'correct' : '',
                    reveal && active && !shouldBe ? 'wrong' : ''
                  ].filter(Boolean).join(' ')

                  return (
                    <button key={option} className={className} onClick={() => toggleAnswer(q, optionIndex)}>
                      <span>{isMulti ? (active ? '☑' : '☐') : (active ? '●' : '○')}</span>
                      {option}
                    </button>
                  )
                })}
              </div>

              {(mode === 'training' && isAnswered || finished) && (
                <div className={correct ? 'explanation good' : 'explanation bad'}>
                  <strong>{correct ? 'Richtig.' : 'Merken:'}</strong>
                  <p>{q.explanation}</p>
                </div>
              )}
            </article>
          )
        })}
      </section>

      {!finished && (
        <div className="stickyActions">
          <span>{answeredCount}/{questions.length} beantwortet</span>
          <button className="primaryBtn" disabled={answeredCount < questions.length} onClick={finishQuiz}>
            Auswerten
          </button>
        </div>
      )}

      {history.length > 0 && (
        <section className="panel">
          <h2>Letzte Ergebnisse</h2>
          <div className="historyGrid">
            {history.map((item) => (
              <div key={item.id} className="historyItem">
                <strong>{item.score}%</strong>
                <span>{new Date(item.createdAt).toLocaleString('de-DE')}</span>
                <small>{item.correct}/{item.total} · {item.passed ? 'bestanden' : 'offen'}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
        .knowledgePage { display: grid; gap: 22px; color: #eaf0ff; }
        .hero { display: flex; justify-content: space-between; gap: 24px; padding: 30px; border-radius: 28px; background: radial-gradient(circle at top left, rgba(72,111,255,.25), transparent 32%), linear-gradient(135deg, #0d1424, #070a12); border: 1px solid rgba(255,255,255,.09); box-shadow: 0 20px 70px rgba(0,0,0,.35); }
        .eyebrow { color: #94a3b8; text-transform: uppercase; letter-spacing: .16em; font-size: 12px; margin: 0 0 10px; }
        h1 { font-size: clamp(30px, 4vw, 56px); line-height: .95; margin: 0 0 14px; }
        .lead { max-width: 820px; color: #aab6ca; font-size: 16px; line-height: 1.65; margin: 0; }
        .scoreCard { min-width: 210px; border-radius: 24px; padding: 22px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); display: grid; align-content: center; gap: 4px; }
        .scoreCard span, .scoreCard small { color: #94a3b8; }
        .scoreCard strong { font-size: 44px; }
        .panel, .questionCard, .resultBox { border: 1px solid rgba(255,255,255,.09); background: rgba(10, 16, 29, .88); border-radius: 22px; padding: 20px; box-shadow: 0 16px 50px rgba(0,0,0,.22); }
        .controls { display: grid; grid-template-columns: auto auto 1fr auto; gap: 18px; align-items: end; }
        label { display: block; color: #94a3b8; font-size: 12px; margin-bottom: 8px; }
        select, button { font: inherit; }
        select { background: #0f172a; color: #eaf0ff; border: 1px solid rgba(255,255,255,.14); border-radius: 14px; padding: 12px 14px; }
        .segmented, .chips, .resultActions { display: flex; flex-wrap: wrap; gap: 8px; }
        .segmented button, .chip, .resultActions button { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: #dbe7ff; border-radius: 999px; padding: 10px 14px; cursor: pointer; }
        .segmented button.active, .chip.active { background: #eaf0ff; color: #07101f; }
        .primaryBtn { border: 0; border-radius: 16px; padding: 13px 18px; background: linear-gradient(135deg, #7dd3fc, #a7f3d0); color: #06111e; font-weight: 800; cursor: pointer; }
        .primaryBtn:disabled { opacity: .4; cursor: not-allowed; }
        .progressOuter { height: 10px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
        .progressInner { height: 100%; background: linear-gradient(90deg, #7dd3fc, #a7f3d0); transition: width .25s ease; }
        .resultBox { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .resultBox h2 { margin: 0 0 6px; }
        .resultBox p { margin: 0; color: #aab6ca; }
        .resultBox.passed { border-color: rgba(74,222,128,.35); }
        .resultBox.failed { border-color: rgba(251,191,36,.35); }
        .questionList { display: grid; gap: 16px; }
        .questionMeta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; color: #94a3b8; }
        .questionMeta span { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; background: rgba(255,255,255,.08); color: #fff; }
        .questionMeta b, .questionMeta em { border: 1px solid rgba(255,255,255,.1); border-radius: 999px; padding: 6px 9px; font-size: 12px; font-style: normal; }
        .questionCard h3 { margin: 0 0 16px; font-size: 20px; }
        .options { display: grid; gap: 10px; }
        .optionBtn { text-align: left; display: flex; gap: 10px; width: 100%; border-radius: 16px; padding: 14px; border: 1px solid rgba(255,255,255,.11); color: #eaf0ff; background: rgba(255,255,255,.045); cursor: pointer; }
        .optionBtn.selected { border-color: rgba(125,211,252,.55); background: rgba(125,211,252,.11); }
        .optionBtn.correct { border-color: rgba(74,222,128,.55); }
        .optionBtn.wrong { border-color: rgba(248,113,113,.65); background: rgba(248,113,113,.1); }
        .explanation { margin-top: 14px; border-radius: 16px; padding: 14px; border: 1px solid rgba(255,255,255,.1); color: #cbd5e1; }
        .explanation p { margin: 6px 0 0; line-height: 1.55; }
        .explanation.good { background: rgba(74,222,128,.08); }
        .explanation.bad { background: rgba(251,191,36,.08); }
        .stickyActions { position: sticky; bottom: 18px; z-index: 5; display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 16px; border-radius: 18px; background: rgba(7,10,18,.9); backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,.12); }
        .historyGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
        .historyItem { display: grid; gap: 4px; border-radius: 16px; padding: 14px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); }
        .historyItem strong { font-size: 26px; }
        .historyItem span, .historyItem small { color: #94a3b8; }
        @media (max-width: 900px) { .hero, .resultBox { flex-direction: column; align-items: stretch; } .controls { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  )
}
