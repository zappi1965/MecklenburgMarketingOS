import { deflateRawSync } from 'zlib'
import { resolveLevelBadge, resolveStatusBadge } from './badgeLibrary'
import type { MiniAuditResult } from './types'

const SLIDE_W = 7562088
const SLIDE_H = 10698480
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'

type FileEntry = { name: string; data: Buffer }

type ShapeOptions = {
  id: number
  name: string
  x: number
  y: number
  w: number
  h: number
  fill?: string
  line?: string
  radius?: boolean
  text?: string
  fontSize?: number
  color?: string
  bold?: boolean
  align?: 'l' | 'ctr' | 'r'
  valign?: 't' | 'mid' | 'b'
}

const colors = {
  navy: '0F172A',
  slate: '475569',
  muted: '64748B',
  blue: '2563EB',
  blueSoft: 'DBEAFE',
  purple: '7C3AED',
  purpleSoft: 'EDE9FE',
  green: '10B981',
  greenSoft: 'D1FAE5',
  amber: 'F59E0B',
  amberSoft: 'FEF3C7',
  rose: 'E11D48',
  roseSoft: 'FCE7EE',
  line: 'D9E2EC',
  card: 'F8FAFC',
  white: 'FFFFFF'
}

function emu(inches: number) {
  return Math.round(inches * 914400)
}

function xmlEscape(input: unknown) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function color(value?: string) {
  return String(value || '').replace('#', '').toUpperCase() || colors.navy
}

function fillXml(fill?: string) {
  return fill ? `<a:solidFill><a:srgbClr val="${color(fill)}"/></a:solidFill>` : '<a:noFill/>'
}

function lineXml(line?: string) {
  if (!line) return '<a:ln><a:noFill/></a:ln>'
  return `<a:ln w="9525"><a:solidFill><a:srgbClr val="${color(line)}"/></a:solidFill></a:ln>`
}

function textParagraph(text: string, options: ShapeOptions) {
  const align = options.align || 'l'
  const fontSize = Math.round((options.fontSize || 12) * 100)
  const bold = options.bold ? ' b="1"' : ''
  const textColor = color(options.color || colors.navy)
  return `<a:p><a:pPr algn="${align}"/><a:r><a:rPr lang="de-DE" sz="${fontSize}"${bold}><a:solidFill><a:srgbClr val="${textColor}"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>${xmlEscape(text)}</a:t></a:r></a:p>`
}

function shape(options: ShapeOptions) {
  const prst = options.radius ? 'roundRect' : 'rect'
  const txBody = options.text !== undefined ? `<p:txBody><a:bodyPr wrap="square" anchor="${options.valign || 'mid'}"/><a:lstStyle/>${String(options.text).split('\n').map((line) => textParagraph(line, options)).join('')}</p:txBody>` : ''
  return `<p:sp><p:nvSpPr><p:cNvPr id="${options.id}" name="${xmlEscape(options.name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${options.x}" y="${options.y}"/><a:ext cx="${options.w}" cy="${options.h}"/></a:xfrm><a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>${fillXml(options.fill)}${lineXml(options.line)}</p:spPr>${txBody}</p:sp>`
}

function oval(options: ShapeOptions) {
  const txBody = options.text !== undefined ? `<p:txBody><a:bodyPr anchor="${options.valign || 'mid'}"/><a:lstStyle/>${String(options.text).split('\n').map((line) => textParagraph(line, options)).join('')}</p:txBody>` : ''
  return `<p:sp><p:nvSpPr><p:cNvPr id="${options.id}" name="${xmlEscape(options.name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${options.x}" y="${options.y}"/><a:ext cx="${options.w}" cy="${options.h}"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom>${fillXml(options.fill)}${lineXml(options.line)}</p:spPr>${txBody}</p:sp>`
}

function statusBadge(id: number, name: string, x: number, y: number, w: number, h: number, status: string) {
  const style = resolveStatusBadge(status)
  return shape({ id, name, x, y, w, h, fill: style.background, line: style.border, radius: true, text: style.label, fontSize: 8.5, color: style.text, bold: true, align: 'ctr' })
}

function levelBadge(id: number, name: string, x: number, y: number, w: number, h: number, level: string) {
  const style = resolveLevelBadge(level)
  return shape({ id, name, x, y, w, h, fill: style.background, line: style.border, radius: true, text: style.label, fontSize: 8.5, color: style.text, bold: true, align: 'ctr' })
}

function slideXml(content: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${content}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`
}

function topBar(startId = 2) {
  return [
    shape({ id: startId, name: 'TOP_BAR_NAVY', x: 0, y: 0, w: SLIDE_W, h: emu(0.04), fill: colors.navy }),
    shape({ id: startId + 1, name: 'TOP_BAR_BLUE', x: 0, y: emu(0.04), w: SLIDE_W, h: emu(0.02), fill: colors.blue }),
    shape({ id: startId + 2, name: 'TOP_BAR_PURPLE', x: 0, y: emu(0.06), w: SLIDE_W, h: emu(0.015), fill: colors.purple })
  ].join('')
}

function logo(startId: number, x: number, y: number, scale = 1) {
  return [
    shape({ id: startId, name: 'LOGO_MARK', x, y, w: emu(0.55 * scale), h: emu(0.55 * scale), fill: colors.navy, line: colors.navy, radius: true }),
    shape({ id: startId + 1, name: 'LOGO_ACCENT_BLUE', x: x + emu(0.39 * scale), y: y + emu(0.07 * scale), w: emu(0.05 * scale), h: emu(0.39 * scale), fill: colors.blue }),
    shape({ id: startId + 2, name: 'LOGO_ACCENT_PURPLE', x: x + emu(0.44 * scale), y: y + emu(0.07 * scale), w: emu(0.025 * scale), h: emu(0.39 * scale), fill: colors.purple }),
    shape({ id: startId + 3, name: 'LOGO_M', x: x + emu(0.10 * scale), y: y + emu(0.12 * scale), w: emu(0.28 * scale), h: emu(0.18 * scale), fill: undefined, text: 'M', fontSize: 19 * scale, color: colors.white, bold: true, align: 'ctr' }),
    shape({ id: startId + 4, name: 'LOGO_TEXT_MAIN', x: x + emu(0.75 * scale), y: y + emu(0.09 * scale), w: emu(2.2 * scale), h: emu(0.18 * scale), fill: undefined, text: 'Mecklenburg Marketing', fontSize: 12 * scale, color: colors.navy, bold: true }),
    shape({ id: startId + 5, name: 'LOGO_TEXT_SUB', x: x + emu(0.75 * scale), y: y + emu(0.30 * scale), w: emu(1.6 * scale), h: emu(0.14 * scale), fill: undefined, text: 'Local Growth OS', fontSize: 8 * scale, color: colors.muted })
  ].join('')
}

function makeCoverSlide(audit: MiniAuditResult) {
  const statusStyle = resolveStatusBadge(audit.overallStatus)
  const signals = audit.publicSignals
  let id = 2
  const shapes: string[] = []
  shapes.push(topBar(id)); id += 3
  shapes.push(oval({ id: id++, name: 'DECOR_CIRCLE_BLUE', x: emu(6.30), y: emu(0.95), w: emu(1.05), h: emu(1.05), fill: colors.blueSoft, line: colors.blueSoft }))
  shapes.push(oval({ id: id++, name: 'DECOR_CIRCLE_PURPLE', x: emu(6.95), y: emu(1.15), w: emu(0.62), h: emu(0.62), fill: colors.purpleSoft, line: colors.purpleSoft }))
  shapes.push(logo(id, emu(0.72), emu(0.62), 1)); id += 6
  shapes.push(shape({ id: id++, name: 'COVER_MODE_BADGE', x: emu(5.83), y: emu(0.66), w: emu(1.58), h: emu(0.34), fill: colors.purpleSoft, line: colors.purpleSoft, radius: true, text: 'Google-only · automatisch', fontSize: 9.5, color: colors.purple, bold: true, align: 'ctr' }))
  shapes.push(shape({ id: id++, name: 'COVER_AUDIT_SUBTITLE', x: emu(0.78), y: emu(1.58), w: emu(3.0), h: emu(0.25), fill: undefined, text: 'Google-Sichtbarkeitscheck', fontSize: 15, color: colors.blue, bold: true }))
  shapes.push(shape({ id: id++, name: 'COVER_AUDIT_TITLE', x: emu(0.78), y: emu(1.92), w: emu(3.9), h: emu(0.60), fill: undefined, text: 'Mini-Audit', fontSize: 33, color: colors.navy, bold: true }))
  shapes.push(shape({ id: id++, name: 'COVER_HERO_TEXT', x: emu(0.78), y: emu(2.63), w: emu(3.75), h: emu(0.62), fill: undefined, text: 'Automatisch erstellt aus öffentlich sichtbaren Google-Daten. Keine MMOS-, CRM-, QR- oder Loyalty-Daten.', fontSize: 13, color: colors.slate }))
  shapes.push(shape({ id: id++, name: 'COVER_CATEGORY_GOOGLE', x: emu(0.78), y: emu(3.38), w: emu(1.35), h: emu(0.30), fill: colors.blueSoft, line: colors.blueSoft, radius: true, text: 'Google-Profil', fontSize: 10.3, color: colors.blue, bold: true, align: 'ctr' }))
  shapes.push(shape({ id: id++, name: 'COVER_CATEGORY_REVIEWS', x: emu(2.25), y: emu(3.38), w: emu(1.25), h: emu(0.30), fill: colors.purpleSoft, line: colors.purpleSoft, radius: true, text: 'Reviews', fontSize: 10.3, color: colors.purple, bold: true, align: 'ctr' }))
  shapes.push(shape({ id: id++, name: 'COVER_CATEGORY_PROFILE', x: emu(3.62), y: emu(3.38), w: emu(1.18), h: emu(0.30), fill: colors.greenSoft, line: colors.greenSoft, radius: true, text: 'Profilqualität', fontSize: 9.5, color: colors.green, bold: true, align: 'ctr' }))

  shapes.push(shape({ id: id++, name: 'COVER_CLIENT_CARD', x: emu(4.88), y: emu(1.52), w: emu(2.55), h: emu(2.72), fill: colors.card, line: colors.line, radius: true }))
  shapes.push(shape({ id: id++, name: 'COVER_CLIENT_PRE', x: emu(5.12), y: emu(1.76), w: emu(1.18), h: emu(0.30), fill: colors.blueSoft, line: colors.blueSoft, radius: true, text: 'Analyse für', fontSize: 10, color: colors.blue, bold: true, align: 'ctr' }))
  shapes.push(shape({ id: id++, name: 'COVER_CLIENT_NAME', x: emu(5.12), y: emu(2.22), w: emu(2.02), h: emu(0.52), fill: undefined, text: audit.clientName, fontSize: 22, color: colors.navy, bold: true }))
  shapes.push(shape({ id: id++, name: 'COVER_CLIENT_META', x: emu(5.12), y: emu(2.86), w: emu(2.04), h: emu(0.45), fill: undefined, text: `${audit.branch}\n${audit.location}`, fontSize: 10.8, color: colors.slate }))
  shapes.push(statusBadge(id++, 'COVER_OVERALL_STATUS', emu(5.12), emu(3.52), emu(1.02), emu(0.30), audit.overallStatus))
  shapes.push(shape({ id: id++, name: 'COVER_SCORE', x: emu(6.26), y: emu(3.52), w: emu(0.86), h: emu(0.30), fill: statusStyle.background, line: statusStyle.border, radius: true, text: `${audit.score}/100`, fontSize: 10, color: statusStyle.text, bold: true, align: 'ctr' }))

  shapes.push(shape({ id: id++, name: 'COVER_SIGNAL_RATING', x: emu(0.78), y: emu(4.63), w: emu(1.45), h: emu(0.82), fill: colors.white, line: colors.line, radius: true, text: `Ø Rating\n${signals.rating === null ? '-' : signals.rating.toFixed(1)}`, fontSize: 12, color: colors.navy, bold: true, align: 'ctr' }))
  shapes.push(shape({ id: id++, name: 'COVER_SIGNAL_REVIEWS', x: emu(2.38), y: emu(4.63), w: emu(1.45), h: emu(0.82), fill: colors.white, line: colors.line, radius: true, text: `Reviews\n${signals.reviewCount ?? '-'}`, fontSize: 12, color: colors.navy, bold: true, align: 'ctr' }))
  shapes.push(shape({ id: id++, name: 'COVER_SIGNAL_PHOTOS', x: emu(3.98), y: emu(4.63), w: emu(1.45), h: emu(0.82), fill: colors.white, line: colors.line, radius: true, text: `Fotos\n${signals.photosCount ?? '-'}`, fontSize: 12, color: colors.navy, bold: true, align: 'ctr' }))
  shapes.push(shape({ id: id++, name: 'COVER_SIGNAL_HOURS', x: emu(5.58), y: emu(4.63), w: emu(1.45), h: emu(0.82), fill: colors.white, line: colors.line, radius: true, text: `Öffnungszeiten\n${signals.openingHoursAvailable ? 'sichtbar' : 'prüfen'}`, fontSize: 10.5, color: colors.navy, bold: true, align: 'ctr' }))

  shapes.push(shape({ id: id++, name: 'COVER_GOAL_CARD', x: emu(0.78), y: emu(6.08), w: emu(6.68), h: emu(1.28), fill: colors.card, line: colors.line, radius: true }))
  shapes.push(shape({ id: id++, name: 'COVER_GOAL_TITLE', x: emu(1.04), y: emu(6.30), w: emu(2.2), h: emu(0.20), fill: undefined, text: 'Automatische Bewertung', fontSize: 16, color: colors.navy, bold: true }))
  shapes.push(shape({ id: id++, name: 'COVER_GOAL_TEXT', x: emu(1.04), y: emu(6.70), w: emu(5.85), h: emu(0.34), fill: undefined, text: audit.overallSummary, fontSize: 11.5, color: colors.slate }))
  shapes.push(shape({ id: id++, name: 'COVER_PROCESS_1', x: emu(1.00), y: emu(7.90), w: emu(1.35), h: emu(0.35), fill: colors.blueSoft, line: colors.blueSoft, radius: true, text: '1. Google abrufen', fontSize: 9.3, color: colors.blue, bold: true, align: 'ctr' }))
  shapes.push(shape({ id: id++, name: 'COVER_PROCESS_2', x: emu(3.05), y: emu(7.90), w: emu(1.35), h: emu(0.35), fill: colors.purpleSoft, line: colors.purpleSoft, radius: true, text: '2. automatisch bewerten', fontSize: 8.4, color: colors.purple, bold: true, align: 'ctr' }))
  shapes.push(shape({ id: id++, name: 'COVER_PROCESS_3', x: emu(5.10), y: emu(7.90), w: emu(1.35), h: emu(0.35), fill: colors.greenSoft, line: colors.greenSoft, radius: true, text: '3. PPTX erzeugen', fontSize: 9.3, color: colors.green, bold: true, align: 'ctr' }))
  shapes.push(shape({ id: id++, name: 'FOOTER_COMPANY', x: emu(0.80), y: emu(10.70), w: emu(2.4), h: emu(0.18), fill: undefined, text: 'Mecklenburg Marketing', fontSize: 12, color: colors.navy, bold: true }))
  shapes.push(shape({ id: id++, name: 'FOOTER_CONTACT', x: emu(0.80), y: emu(11.00), w: emu(3.6), h: emu(0.18), fill: undefined, text: 'Dominique Zapf | zapf@mecklenburgmarketing.de | 0162 7533619', fontSize: 8.2, color: colors.slate }))
  shapes.push(shape({ id: id++, name: 'FOOTER_NOTE', x: emu(4.35), y: emu(11.00), w: emu(2.75), h: emu(0.18), fill: undefined, text: `Vorabprüfung auf Basis öffentlicher Google-Daten · Stand: ${audit.auditDate}`, fontSize: 8.2, color: colors.muted, align: 'r' }))
  shapes.push(shape({ id: id++, name: 'FOOTER_PAGE', x: emu(7.50), y: emu(11.26), w: emu(0.45), h: emu(0.12), fill: undefined, text: '1 / 2', fontSize: 8, color: colors.muted, align: 'r' }))
  return slideXml(shapes.join(''))
}

function makeAuditSlide(audit: MiniAuditResult) {
  let id = 2
  const s: string[] = []
  s.push(topBar(id)); id += 3
  s.push(logo(id, emu(0.42), emu(0.35), 0.62)); id += 6
  s.push(shape({ id: id++, name: 'AUDIT_HEADER_TITLE', x: emu(3.0), y: emu(0.42), w: emu(2.2), h: emu(0.2), fill: undefined, text: 'Google-Sichtbarkeitscheck', fontSize: 10.5, color: colors.muted, align: 'ctr' }))
  s.push(shape({ id: id++, name: 'AUDIT_DATE', x: emu(6.2), y: emu(0.42), w: emu(1.0), h: emu(0.2), fill: undefined, text: audit.auditDate, fontSize: 8.8, color: colors.muted, align: 'r' }))
  s.push(shape({ id: id++, name: 'CLIENT_NAME', x: emu(0.42), y: emu(1.08), w: emu(4.9), h: emu(0.46), fill: undefined, text: audit.clientName, fontSize: 28, color: colors.navy, bold: true }))
  s.push(shape({ id: id++, name: 'CLIENT_META', x: emu(0.43), y: emu(1.60), w: emu(4.8), h: emu(0.22), fill: undefined, text: `Branche: ${audit.branch}   ·   Standort: ${audit.location}`, fontSize: 10.8, color: colors.slate }))
  s.push(statusBadge(id++, 'OVERALL_STATUS', emu(6.03), emu(1.20), emu(1.10), emu(0.30), audit.overallStatus))
  s.push(shape({ id: id++, name: 'OVERALL_SUMMARY_CARD', x: emu(0.42), y: emu(2.04), w: emu(6.80), h: emu(0.45), fill: colors.blueSoft, line: 'BFD7F6', radius: true, text: audit.overallSummary, fontSize: 10.8, color: colors.slate, align: 'ctr' }))
  s.push(shape({ id: id++, name: 'SECTION_KURZCHECK', x: emu(0.42), y: emu(2.80), w: emu(3.0), h: emu(0.23), fill: undefined, text: '1. Kurz-Check', fontSize: 17, color: colors.navy, bold: true }))
  s.push(shape({ id: id++, name: 'KC_HEADER_BG', x: emu(0.42), y: emu(3.12), w: emu(6.80), h: emu(0.27), fill: colors.card, line: colors.line }))
  s.push(shape({ id: id++, name: 'KC_HEADER_AREA', x: emu(0.54), y: emu(3.18), w: emu(1.8), h: emu(0.11), fill: undefined, text: 'Bereich', fontSize: 8.5, color: colors.slate, bold: true }))
  s.push(shape({ id: id++, name: 'KC_HEADER_RATING', x: emu(2.80), y: emu(3.18), w: emu(1.0), h: emu(0.11), fill: undefined, text: 'Bewertung', fontSize: 8.5, color: colors.slate, bold: true, align: 'ctr' }))
  s.push(shape({ id: id++, name: 'KC_HEADER_NOTE', x: emu(4.0), y: emu(3.18), w: emu(2.7), h: emu(0.11), fill: undefined, text: 'Einschätzung', fontSize: 8.5, color: colors.slate, bold: true }))

  audit.quickCheck.slice(0, 7).forEach((item, index) => {
    const y = emu(3.39 + index * 0.31)
    s.push(shape({ id: id++, name: `KC_ROW_${index + 1}_BG`, x: emu(0.42), y, w: emu(6.80), h: emu(0.31), fill: index % 2 === 0 ? colors.white : 'F8FAFC', line: colors.line }))
    s.push(shape({ id: id++, name: `KC${index + 1}_AREA`, x: emu(0.54), y: y + emu(0.07), w: emu(1.95), h: emu(0.10), fill: undefined, text: `${index + 1}. ${item.area}`, fontSize: 7.8, color: colors.navy }))
    s.push(statusBadge(id++, `KC${index + 1}_STATUS_BADGE`, emu(2.72), y + emu(0.07), emu(0.80), emu(0.16), item.status))
    s.push(shape({ id: id++, name: `KC${index + 1}_NOTE`, x: emu(3.95), y: y + emu(0.06), w: emu(2.85), h: emu(0.11), fill: undefined, text: item.note, fontSize: 7.4, color: colors.slate }))
  })

  s.push(shape({ id: id++, name: 'SECTION_CHANCES', x: emu(0.42), y: emu(5.82), w: emu(3.4), h: emu(0.23), fill: undefined, text: '2. Die 3 größten Chancen', fontSize: 17, color: colors.navy, bold: true }))
  audit.chances.slice(0, 3).forEach((chance, index) => {
    const x = emu(0.42 + index * 2.28)
    s.push(shape({ id: id++, name: `CHANCE${index + 1}_CARD`, x, y: emu(6.22), w: emu(2.05), h: emu(1.25), fill: colors.white, line: colors.line, radius: true }))
    s.push(oval({ id: id++, name: `CHANCE${index + 1}_NUMBER_CIRCLE`, x: x + emu(0.16), y: emu(6.40), w: emu(0.28), h: emu(0.28), fill: index === 0 ? colors.blue : index === 1 ? colors.purple : colors.green, line: index === 0 ? colors.blue : index === 1 ? colors.purple : colors.green, text: String(index + 1), fontSize: 9.5, color: colors.white, bold: true, align: 'ctr' }))
    s.push(shape({ id: id++, name: `CHANCE${index + 1}_TITLE`, x: x + emu(0.55), y: emu(6.37), w: emu(1.25), h: emu(0.23), fill: undefined, text: chance.title, fontSize: 9.2, color: colors.navy, bold: true, align: 'ctr' }))
    s.push(shape({ id: id++, name: `CHANCE${index + 1}_TEXT`, x: x + emu(0.22), y: emu(6.78), w: emu(1.62), h: emu(0.28), fill: undefined, text: chance.text, fontSize: 6.8, color: colors.slate }))
    s.push(shape({ id: id++, name: `CHANCE${index + 1}_RECOMMENDATION`, x: x + emu(0.22), y: emu(7.12), w: emu(1.62), h: emu(0.25), fill: undefined, text: `Empfehlung: ${chance.recommendation}`, fontSize: 6.5, color: colors.blue }))
  })

  s.push(shape({ id: id++, name: 'SECTION_MEASURES', x: emu(0.42), y: emu(7.90), w: emu(3.1), h: emu(0.23), fill: undefined, text: '3. Sofortmaßnahmen', fontSize: 16, color: colors.navy, bold: true }))
  s.push(shape({ id: id++, name: 'SECTION_POTENTIAL', x: emu(5.0), y: emu(7.90), w: emu(1.8), h: emu(0.23), fill: undefined, text: '4. Potenzial', fontSize: 16, color: colors.navy, bold: true }))
  audit.measures.slice(0, 6).forEach((measure, index) => {
    const y = emu(8.28 + index * 0.29)
    s.push(shape({ id: id++, name: `M_ROW_${index + 1}_BG`, x: emu(0.42), y, w: emu(4.30), h: emu(0.29), fill: index % 2 === 0 ? colors.white : 'F8FAFC', line: colors.line }))
    s.push(shape({ id: id++, name: `M${index + 1}_TITLE`, x: emu(0.55), y: y + emu(0.07), w: emu(2.35), h: emu(0.10), fill: undefined, text: `${index + 1}. ${measure.title}`, fontSize: 7.2, color: colors.navy }))
    s.push(levelBadge(id++, `M${index + 1}_EFFORT_BADGE`, emu(3.04), y + emu(0.07), emu(0.58), emu(0.16), measure.effort))
    s.push(levelBadge(id++, `M${index + 1}_IMPACT_BADGE`, emu(3.88), y + emu(0.07), emu(0.68), emu(0.16), measure.impact))
  })
  s.push(shape({ id: id++, name: 'POTENTIAL_CARD', x: emu(5.0), y: emu(8.28), w: emu(2.20), h: emu(1.55), fill: colors.card, line: colors.line, radius: true }))
  audit.potential.slice(0, 4).forEach((potential, index) => {
    const y = emu(8.48 + index * 0.32)
    s.push(oval({ id: id++, name: `POTENTIAL${index + 1}_DOT`, x: emu(5.18), y, w: emu(0.07), h: emu(0.07), fill: index < 2 ? colors.blue : colors.green, line: index < 2 ? colors.blue : colors.green }))
    s.push(shape({ id: id++, name: `POTENTIAL${index + 1}`, x: emu(5.38), y: y - emu(0.04), w: emu(1.45), h: emu(0.15), fill: undefined, text: potential, fontSize: 7.5, color: colors.slate }))
  })
  s.push(shape({ id: id++, name: 'NEXT_STEP_CARD', x: emu(0.42), y: emu(10.22), w: emu(6.80), h: emu(0.48), fill: colors.purpleSoft, line: 'DDD6FE', radius: true, text: audit.nextStepCta, fontSize: 9.5, color: colors.navy, bold: true, align: 'ctr' }))
  s.push(shape({ id: id++, name: 'AUDIT_FOOTER_CONTACT', x: emu(0.42), y: emu(11.07), w: emu(3.6), h: emu(0.12), fill: undefined, text: 'Dominique Zapf | zapf@mecklenburgmarketing.de | 0162 7533619', fontSize: 7.5, color: colors.navy, bold: true }))
  s.push(shape({ id: id++, name: 'AUDIT_FOOTER_NOTE', x: emu(4.35), y: emu(11.07), w: emu(2.55), h: emu(0.12), fill: undefined, text: 'Vorabprüfung auf Basis öffentlich sichtbarer Google-Daten.', fontSize: 7.2, color: colors.muted, align: 'r' }))
  s.push(shape({ id: id++, name: 'AUDIT_FOOTER_PAGE', x: emu(7.50), y: emu(11.07), w: emu(0.45), h: emu(0.12), fill: undefined, text: '2 / 2', fontSize: 7.2, color: colors.muted, align: 'r' }))

  return slideXml(s.join(''))
}

function presentationXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/></p:sldIdLst><p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}" type="custom"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr><a:defRPr lang="de-DE"/></a:defPPr></p:defaultTextStyle></p:presentation>`
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`
}

function relsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`
}

function presentationRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>`
}

function masterXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster ${NS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`
}

function layoutXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`
}

function themeXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="MMOS"><a:themeElements><a:clrScheme name="MMOS"><a:dk1><a:srgbClr val="0F172A"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="475569"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="2563EB"/></a:accent1><a:accent2><a:srgbClr val="7C3AED"/></a:accent2><a:accent3><a:srgbClr val="10B981"/></a:accent3><a:accent4><a:srgbClr val="F59E0B"/></a:accent4><a:accent5><a:srgbClr val="E11D48"/></a:accent5><a:accent6><a:srgbClr val="64748B"/></a:accent6><a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme><a:fontScheme name="Arial"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="MMOS"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`
}

function coreXml() {
  const now = new Date().toISOString()
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>MMOS Mini Audit</dc:title><dc:creator>Mecklenburg Marketing OS</dc:creator><cp:lastModifiedBy>Mecklenburg Marketing OS</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`
}

function appXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Mecklenburg Marketing OS</Application><PresentationFormat>A4 Portrait</PresentationFormat><Slides>2</Slides><Company>Mecklenburg Marketing</Company></Properties>`
}

function slideRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`
}

function masterRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`
}

function layoutRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`
}

const CRC_TABLE = (() => {
  const table: number[] = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(buffer: Buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function dosTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const year = Math.max(1980, date.getFullYear()) - 1980
  const day = (year << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

function makeZip(files: FileEntry[]) {
  const now = dosTime()
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const source = file.data
    const compressed = deflateRawSync(source)
    const crc = crc32(source)
    const local = Buffer.alloc(30 + name.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(now.time, 10)
    local.writeUInt16LE(now.day, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(source.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    name.copy(local, 30)
    locals.push(local, compressed)

    const central = Buffer.alloc(46 + name.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt16LE(now.time, 12)
    central.writeUInt16LE(now.day, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(source.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    name.copy(central, 46)
    centrals.push(central)
    offset += local.length + compressed.length
  }

  const centralSize = centrals.reduce((sum, b) => sum + b.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)
  return Buffer.concat([...locals, ...centrals, end])
}

export function buildMiniAuditPptx(audit: MiniAuditResult): Buffer {
  const files: FileEntry[] = [
    { name: '[Content_Types].xml', data: Buffer.from(contentTypesXml(), 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(relsXml(), 'utf8') },
    { name: 'docProps/app.xml', data: Buffer.from(appXml(), 'utf8') },
    { name: 'docProps/core.xml', data: Buffer.from(coreXml(), 'utf8') },
    { name: 'ppt/presentation.xml', data: Buffer.from(presentationXml(), 'utf8') },
    { name: 'ppt/_rels/presentation.xml.rels', data: Buffer.from(presentationRelsXml(), 'utf8') },
    { name: 'ppt/slides/slide1.xml', data: Buffer.from(makeCoverSlide(audit), 'utf8') },
    { name: 'ppt/slides/slide2.xml', data: Buffer.from(makeAuditSlide(audit), 'utf8') },
    { name: 'ppt/slides/_rels/slide1.xml.rels', data: Buffer.from(slideRelsXml(), 'utf8') },
    { name: 'ppt/slides/_rels/slide2.xml.rels', data: Buffer.from(slideRelsXml(), 'utf8') },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: Buffer.from(masterXml(), 'utf8') },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: Buffer.from(masterRelsXml(), 'utf8') },
    { name: 'ppt/slideLayouts/slideLayout1.xml', data: Buffer.from(layoutXml(), 'utf8') },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: Buffer.from(layoutRelsXml(), 'utf8') },
    { name: 'ppt/theme/theme1.xml', data: Buffer.from(themeXml(), 'utf8') }
  ]
  return makeZip(files)
}

export function miniAuditFileName(clientName: string) {
  const safe = String(clientName || 'Mini-Audit')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'Mini-Audit'
  return `${safe}-Google-Mini-Audit.pptx`
}
