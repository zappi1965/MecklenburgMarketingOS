// PDF-Report-Generator im MMOS-Stil.
//
// Nutzt PDFKit (pdfkit 0.18.0 — bereits im Projekt vorhanden).
// Farben und Typo orientieren sich an MMOS Brand: Dunkelblau + Rot-Akzent.

const PDFDocument = require('pdfkit')

const C = {
  primary: '#1a1a2e',
  accent: '#e94560',
  text: '#333333',
  light: '#666666',
  bg: '#f8f9fa',
  white: '#ffffff',
  border: '#e0e0e0',
  rowAlt: '#f0f4f8'
}

// ── Seiten-Elemente ───────────────────────────────────────────────────────────

function header(doc, { title, subtitle, date }) {
  // Dunkler Kopfbereich
  doc.rect(0, 0, doc.page.width, 76).fill(C.primary)
  doc.fillColor(C.white).fontSize(20).font('Helvetica-Bold')
    .text('MecklenburgMarketingOS', 40, 18)
  doc.fillColor(C.white).fontSize(9).font('Helvetica')
    .text('Marketing Intelligence Platform', 40, 44)

  // Roter Akzentstreifen
  doc.rect(0, 76, doc.page.width, 3).fill(C.accent)

  // Report-Titel
  const titleY = 92
  doc.fillColor(C.primary).fontSize(16).font('Helvetica-Bold')
    .text(title, 40, titleY, { width: doc.page.width - 80 })
  let y = titleY + 22
  if (subtitle) {
    doc.fillColor(C.light).fontSize(9).font('Helvetica').text(subtitle, 40, y)
    y += 14
  }
  const dateStr = date || new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  doc.fillColor(C.light).fontSize(8).text(`Erstellt am ${dateStr}`, 40, y)

  doc.moveDown(3.5)
}

function sectionTitle(doc, title) {
  const y = doc.y + 6
  doc.rect(40, y, doc.page.width - 80, 24).fill(C.primary)
  doc.fillColor(C.white).fontSize(11).font('Helvetica-Bold')
    .text(title, 52, y + 7, { width: doc.page.width - 104, lineBreak: false })
  doc.y = y + 32
}

function bulletList(doc, items) {
  for (const item of items) {
    const y = doc.y
    doc.fillColor(C.accent).fontSize(10).text('▸', 48, y, { lineBreak: false, width: 12 })
    doc.fillColor(C.text).fontSize(9).font('Helvetica')
      .text(String(item), 62, y, { width: doc.page.width - 102 })
    doc.moveDown(0.3)
  }
  doc.moveDown(0.5)
}

function keywordTable(doc, rows, columns) {
  const cols = columns || [
    { label: 'Keyword', width: 190, key: 'keyword' },
    { label: 'Intention', width: 100, key: 'intent' },
    { label: 'Schwierigkeit', width: 90, key: 'difficulty' },
    { label: 'Volumen', width: 80, key: 'volume' }
  ]
  const totalWidth = cols.reduce((s, c) => s + c.width, 0)
  const startX = 40
  let y = doc.y

  // Tabellenkopf
  doc.rect(startX, y, totalWidth, 20).fill(C.accent)
  doc.fillColor(C.white).fontSize(8).font('Helvetica-Bold')
  let x = startX
  for (const col of cols) {
    doc.text(col.label, x + 4, y + 6, { width: col.width - 8, lineBreak: false })
    x += col.width
  }
  y += 20

  // Zeilen
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowH = 16
    doc.rect(startX, y, totalWidth, rowH).fill(i % 2 === 0 ? C.white : C.rowAlt)
    doc.fillColor(C.text).fontSize(8).font('Helvetica')
    x = startX
    for (const col of cols) {
      const val = String(row[col.key] || '—')
      doc.text(val, x + 4, y + 4, { width: col.width - 8, lineBreak: false })
      x += col.width
    }
    y += rowH

    // Seitenumbruch pruefen
    if (y > doc.page.height - 80) {
      doc.addPage()
      y = 50
    }
  }

  // Rahmen um die Tabelle
  doc.rect(startX, doc.y, totalWidth, y - doc.y).stroke(C.border)
  doc.y = y + 8
}

function footer(doc) {
  const pageCount = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1
  const y = doc.page.height - 36
  doc.rect(0, y, doc.page.width, 36).fill(C.primary)
  doc.fillColor(C.white).fontSize(7).font('Helvetica')
    .text('© MecklenburgMarketingOS — Vertraulich. Nur fuer interne Nutzung.', 40, y + 8)
    .text(`Seite ${pageCount}`, doc.page.width - 60, y + 8, { width: 50, align: 'right' })
}

function checkPageBreak(doc, minSpace = 120) {
  if (doc.y > doc.page.height - minSpace) {
    doc.addPage()
  }
}

// ── Oeffentliche Report-Funktionen ────────────────────────────────────────────

// Keyword-Analyse Report (aus adminAiService.analyzeKeywords Output)
async function generateKeywordReport({ analysis, businessType, location }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    header(doc, {
      title: 'Keyword-Analyse Report',
      subtitle: [businessType, location || 'Mecklenburg-Vorpommern'].filter(Boolean).join(' · ')
    })

    if (analysis.summary) {
      sectionTitle(doc, 'Strategische Zusammenfassung')
      doc.fillColor(C.text).fontSize(9).font('Helvetica')
        .text(analysis.summary, 40, doc.y, { width: doc.page.width - 80, align: 'justify' })
      doc.moveDown(1.2)
    }

    if (analysis.primaryKeywords?.length) {
      checkPageBreak(doc)
      sectionTitle(doc, 'Primaere Keywords')
      keywordTable(doc, analysis.primaryKeywords)
    }

    if (analysis.longTailKeywords?.length) {
      checkPageBreak(doc)
      sectionTitle(doc, 'Long-Tail Keywords')
      keywordTable(doc, analysis.longTailKeywords.map(k => ({
        keyword: k.keyword, intent: k.intent, difficulty: '—', volume: '—'
      })))
    }

    if (analysis.localKeywords?.length) {
      checkPageBreak(doc)
      sectionTitle(doc, 'Lokale Keywords')
      keywordTable(doc, analysis.localKeywords.map(k => ({
        keyword: k.keyword, intent: k.district || 'Regional', difficulty: '—', volume: '—'
      })))
    }

    if (analysis.contentIdeas?.length) {
      checkPageBreak(doc)
      sectionTitle(doc, 'Content-Ideen')
      bulletList(doc, analysis.contentIdeas)
    }

    if (analysis.quickWins?.length) {
      checkPageBreak(doc)
      sectionTitle(doc, 'Quick Wins')
      bulletList(doc, analysis.quickWins)
    }

    footer(doc)
    doc.end()
  })
}

// Allgemeiner Marketing-Report mit flexiblen Sektionen
// sections: [{ title, text?, bullets?, table?: [{key: value}] }]
async function generateMarketingReport({ title, sections, author = 'MMOS Admin' }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    header(doc, {
      title: title || 'Marketing Report',
      subtitle: `Autor: ${author}`
    })

    for (const section of (sections || [])) {
      checkPageBreak(doc)
      sectionTitle(doc, section.title || 'Abschnitt')

      if (section.text) {
        doc.fillColor(C.text).fontSize(9).font('Helvetica')
          .text(section.text, 40, doc.y, { width: doc.page.width - 80, align: 'justify' })
        doc.moveDown(1)
      }

      if (Array.isArray(section.bullets) && section.bullets.length) {
        bulletList(doc, section.bullets)
      }

      if (Array.isArray(section.table) && section.table.length) {
        const firstRow = section.table[0]
        const cols = Object.keys(firstRow).map((k, i) => ({
          label: k.charAt(0).toUpperCase() + k.slice(1),
          key: k,
          width: i === 0 ? 200 : Math.floor((doc.page.width - 80 - 200) / (Object.keys(firstRow).length - 1))
        }))
        keywordTable(doc, section.table, cols)
      }
    }

    footer(doc)
    doc.end()
  })
}

module.exports = {
  generateKeywordReport,
  generateMarketingReport
}
