// src/app/api/projects/[id]/callsheet/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/server/utils/prisma'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export const runtime = 'nodejs'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const p = await prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        orderBy: { createdAt: 'asc' },
        include: { profile: { select: { displayName: true } } },
      },
    },
  })
  if (!p) return new NextResponse('Not found', { status: 404 })

  const details = (p.details || {}) as any

  // --- PDF bootstrap
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontB = await pdf.embedFont(StandardFonts.HelveticaBold)
  const pageSize: [number, number] = [612, 792] // Letter
  const margin = 36
  let page = pdf.addPage(pageSize)
  let y = page.getHeight() - margin

  // helpers
  const sizes = { h1: 16, h2: 12, body: 10, small: 9 }
  const lineGap = 3

  const draw = (text: string, x: number, yy: number, size = sizes.body, bold = false) =>
    page.drawText(text ?? '', { x, y: yy, size, font: bold ? fontB : font, color: rgb(0, 0, 0) })

  const widthOf = (text: string, size = sizes.body, bold = false) =>
    (bold ? fontB : font).widthOfTextAtSize(text ?? '', size)

  const ensure = (need = sizes.body + lineGap) => {
    if (y - need < margin) {
      page = pdf.addPage(pageSize)
      y = page.getHeight() - margin
    }
  }

  const wrapLines = (text: string, maxWidth: number, size = sizes.body, bold = false) => {
    const words = (text || '').split(/\s+/)
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      const trial = cur ? cur + ' ' + w : w
      if (widthOf(trial, size, bold) > maxWidth && cur) {
        lines.push(cur)
        cur = w
      } else {
        cur = trial
      }
    }
    if (cur) lines.push(cur)
    return lines
  }

  const paragraph = (text: string, x: number, maxWidth: number, size = sizes.body, bold = false) => {
    const lines = wrapLines(text, maxWidth, size, bold)
    for (const ln of lines) {
      ensure(size + lineGap)
      draw(ln, x, y, size, bold)
      y -= size + lineGap
    }
  }

  const labelVal = (label: string, val: string, x: number, wLabel: number, wVal: number) => {
    ensure()
    draw(label, x, y, sizes.body, true)
    paragraph(val || '—', x + wLabel + 4, wVal)
  }

  const sectionTitle = (name: string) => {
    ensure(sizes.h2 + 8)
    draw(name, margin, y, sizes.h2, true)
    y -= sizes.h2 + 6
  }

  const hhmm = (d?: Date | null) => (d ? new Date(d).toLocaleString() : '—')

  // ========= S1 (Header in 3 columns) =========
  {
    const colGap = 12
    const leftW = 200
    const midW = 210
    const rightW = page.getWidth() - margin * 2 - leftW - midW - colGap * 2
    const xL = margin
    const xM = margin + leftW + colGap
    const xR = xM + midW + colGap
    const top = y

    // Left column
    let yL = top
    draw(details?.company?.name || 'COMPANY', xL, yL, sizes.h2, true); yL -= sizes.h2 + 6
    draw('PRODUCTION OFFICE', xL, yL, sizes.small, true); yL -= sizes.small + 4
    paragraph(details?.office?.address || '', xL, leftW)
    labelVal('Email:', details?.office?.email || '', xL, 40, leftW - 50)
    labelVal('Payroll:', details?.office?.payrollEmail || '', xL, 50, leftW - 56)
    labelVal('AP:', details?.office?.apEmail || '', xL, 20, leftW - 26)
    labelVal('Exec Producers:', details?.crew?.execProducersCsv || '', xL, 104, leftW - 110)
    labelVal('Producer:', details?.crew?.producer || '', xL, 60, leftW - 66)
    labelVal('Director:', details?.crew?.director || '', xL, 58, leftW - 64)
    labelVal('Writers:', details?.crew?.writersCsv || '', xL, 54, leftW - 60)

    // Mid column
    let yM = top
    draw(p.name || 'Title', xM, yM, sizes.h1, true); yM -= sizes.h1 + 6
    for (let i = 0; i < 3; i++) {
      const t = details?.header?.advisories?.[i] || ''
      if (t) paragraph('• ' + t, xM, midW, sizes.body, true)
      else { ensure(); draw('•', xM, yM, sizes.body, true); yM -= sizes.body + lineGap }
    }

    // Right column
    let yR = top
    labelVal('CREW CALL:', hhmm(p.crewCall), xR, 70, rightW - 76)
    labelVal('SHOOT CALL:', hhmm(p.shootCall), xR, 76, rightW - 82)
    labelVal('AM Curfew:', details?.times?.amCurfew || '', xR, 70, rightW - 76)
    labelVal('Tail Lights:', details?.times?.tailLights || '', xR, 76, rightW - 82)

    yR -= 6
    draw(`Sunrise: ${details?.weather?.sunrise || '—'}   Sunset: ${details?.weather?.sunset || '—'}   Hi: ${details?.weather?.hi || '—'}   Lo: ${details?.weather?.lo || '—'}`, xR, yR, sizes.small); 
    yR -= sizes.small + 8

    labelVal('Circus Hot:', details?.meals?.circusHot || '', xR, 72, rightW - 78)
    labelVal('Breakfast:', details?.meals?.breakfast || '', xR, 72, rightW - 78)
    labelVal('Lunch:', details?.meals?.lunch || '', xR, 52, rightW - 58)
    labelVal('Driver Lunch:', details?.meals?.driverLunch || '', xR, 86, rightW - 92)

    // advance y below the tallest column
    y = Math.min(yL, yM, yR) - 12
  }

  // ========= S2 (Schedule + Locations) =========
  sectionTitle('SCHEDULE')
  {
    const rows: any[] = Array.isArray(details?.schedule) ? details.schedule : []
    const widths = [60, 260, 80, 40, 40]
    const [xScene, xDesc, xCast, xDN, xPGS] = [margin, margin + widths[0], margin + widths[0] + widths[1], margin + widths[0] + widths[1] + widths[2], margin + widths[0] + widths[1] + widths[2] + widths[3]]
    // header
    ensure(sizes.body + 6)
    draw('Scene', xScene, y, sizes.small, true)
    draw('Set / Description', xDesc, y, sizes.small, true)
    draw('Cast', xCast, y, sizes.small, true)
    draw('D/N', xDN, y, sizes.small, true)
    draw('PGS', xPGS, y, sizes.small, true)
    y -= sizes.small + 4
    // rows
    for (const r of rows) {
      const descLines = wrapLines(r?.description || '', widths[1] - 6)
      const heightNeeded = Math.max(descLines.length, 1) * (sizes.body + lineGap)
      ensure(heightNeeded)
      draw(String(r?.scene ?? ''), xScene, y, sizes.body)
      // description (wrapped)
      let yy = y
      for (const ln of descLines.length ? descLines : ['']) {
        draw(ln, xDesc, yy, sizes.body)
        yy -= sizes.body + lineGap
      }
      draw(String(r?.cast ?? ''), xCast, y, sizes.body)
      draw(String(r?.dayNight ?? ''), xDN, y, sizes.body)
      draw(String(r?.pgs ?? ''), xPGS, y, sizes.body)
      y -= heightNeeded
    }

    y -= 8
    sectionTitle('LOCATION / NOTES')
    const loc = details?.locations || {}
    const block = (label: string, text: string) => { draw(label, margin, y, sizes.small, true); y -= sizes.small + 2; paragraph(text || '—', margin, page.getWidth() - margin * 2); y -= 6 }
    block('SET', loc.set)
    block('TRUCKS', loc.trucks)
    block('LUNCH', loc.lunch)
    block('CIRCUS', loc.circus)
    block('CREW PARK', loc.crewPark)
    block('BGE', loc.bge)
    block('NOTES', loc.notes)
    paragraph(`TOTAL PAGES: ${details?.scheduleTotalPages || '—'}`, margin, 200)
    y -= 6
  }

  // ========= S3 (Cast) =========
  sectionTitle('CAST')
  {
    const rows: any[] = Array.isArray(details?.cast) ? details.cast : []
    const widths = [28, 120, 100, 60, 45, 45, 55, 45, 0]
    const xs = widths.reduce<number[]>((acc, w, i) => [...acc, (acc[i] ?? margin) + (i ? widths[i - 1] : 0)], [margin]).slice(0, -1)
    const headers = ['#','Cast','Character','Status','PU/LV','HMU','REH/BLCK','SET','Comments']
    ensure(sizes.small + 6)
    headers.forEach((h, i) => draw(h, xs[i], y, sizes.small, true))
    y -= sizes.small + 4

    for (const r of rows) {
      const commentLines = wrapLines(r?.comments || '', page.getWidth() - margin - xs[8] - 2)
      const need = Math.max(1, commentLines.length) * (sizes.body + lineGap)
      ensure(need)
      const vals = [r?.no, r?.cast, r?.character, r?.status, r?.pulv, r?.hmu, r?.rehblk, r?.setTime]
      vals.forEach((v, i) => draw(String(v ?? ''), xs[i], y, sizes.body))
      let yy = y
      for (const ln of commentLines.length ? commentLines : ['']) { draw(ln, xs[8], yy, sizes.body); yy -= sizes.body + lineGap }
      y -= need
    }
  }

  // ========= S4 (Atmosphere & Stand-ins + Notes + Paperwork) =========
  sectionTitle('ATMOSPHERE & STAND-INS')
  {
    const rows: any[] = Array.isArray(details?.atmosphere) ? details.atmosphere : []
    const headers = ['#New','Name','Call','On Set','Remarks']
    const widths = [36, 210, 70, 70, page.getWidth() - margin * 2 - (36 + 210 + 70 + 70)]
    const xs = [margin, margin + 36, margin + 36 + 210, margin + 36 + 210 + 70, margin + 36 + 210 + 70 + 70]
    ensure(sizes.small + 6)
    headers.forEach((h, i) => draw(h, xs[i], y, sizes.small, true))
    y -= sizes.small + 4
    for (const r of rows) {
      const remarksLines = wrapLines(r?.remarks || '', widths[4] - 4)
      const need = Math.max(1, remarksLines.length) * (sizes.body + lineGap)
      ensure(need)
      draw(String(r?.new ?? ''), xs[0], y)
      draw(String(r?.name ?? ''), xs[1], y)
      draw(String(r?.call ?? ''), xs[2], y)
      draw(String(r?.onSet ?? ''), xs[3], y)
      let yy = y
      for (const ln of remarksLines.length ? remarksLines : ['']) { draw(ln, xs[4], yy); yy -= sizes.body + lineGap }
      y -= need
    }

    y -= 6
    draw('NOTES', margin, y, sizes.small, true); y -= sizes.small + 2
    paragraph(details?.notes || '', margin, page.getWidth() - margin * 2)
    y -= 6
    draw('CURRENT PAPERWORK', margin, y, sizes.small, true); y -= sizes.small + 2
    paragraph(details?.paperwork || '', margin, page.getWidth() - margin * 2)
  }

  // ========= S5 (Advanced schedule: next day cast-style) =========
  sectionTitle('ADVANCED SHOOTING SCHEDULE (NEXT DAY)')
  {
    const rows: any[] = Array.isArray(details?.advancedSchedule) ? details.advancedSchedule : []
    const widths = [28, 120, 100, 60, 45, 45, 55, 45, 0]
    const xs = widths.reduce<number[]>((acc, w, i) => [...acc, (acc[i] ?? margin) + (i ? widths[i - 1] : 0)], [margin]).slice(0, -1)
    const headers = ['#','Cast','Character','Status','PU/LV','HMU','REH/BLCK','SET','Comments']
    ensure(sizes.small + 6)
    headers.forEach((h, i) => draw(h, xs[i], y, sizes.small, true))
    y -= sizes.small + 4

    for (const r of rows) {
      const commentLines = wrapLines(r?.comments || '', page.getWidth() - margin - xs[8] - 2)
      const need = Math.max(1, commentLines.length) * (sizes.body + lineGap)
      ensure(need)
      const vals = [r?.no, r?.cast, r?.character, r?.status, r?.pulv, r?.hmu, r?.rehblk, r?.setTime]
      vals.forEach((v, i) => draw(String(v ?? ''), xs[i], y, sizes.body))
      let yy = y
      for (const ln of commentLines.length ? commentLines : ['']) { draw(ln, xs[8], yy, sizes.body); yy -= sizes.body + lineGap }
      y -= need
    }
  }

  // ========= S6 (Key contacts + safety) =========
  sectionTitle('KEY CONTACTS & SAFETY')
  {
    const contacts = details?.contacts || {}
    const pairs: string[] = [
      'PM','1st AD','2nd AD','3rd AD',
      'Location Manager','Asst. Loc. Manager',
      'Transport Coord','Transport Capt.'
    ]
    const colW = (page.getWidth() - margin * 2 - 12) / 2
    let x = margin
    let colY = y

    for (let i = 0; i < pairs.length; i++) {
      const role = pairs[i]
      const text = contacts?.[role]?.text || ''
      ensure(sizes.small + 12)
      draw(role + ':', x, colY, sizes.small, true)
      draw(text || '—', x, colY - sizes.small - 2, sizes.body)
      colY -= sizes.small + 18

      // second column
      if ((i % 2) === 1) { x = margin; y = Math.min(y, colY) - 4; colY = y }
      else if (i % 2 === 0) { x = margin + colW + 12 }
    }
    y = Math.min(y, colY) - 8

    const safety = details?.safety || {}
    draw('Nearest Hospital:', margin, y, sizes.small, true); y -= sizes.small + 2
    paragraph(safety?.hospital || '', margin, page.getWidth() - margin * 2)
    draw('Emergency Notes:', margin, y, sizes.small, true); y -= sizes.small + 2
    paragraph(safety?.emergencyNotes || '', margin, page.getWidth() - margin * 2)
    ensure()
    draw(`DGC ANONYMOUS HOTLINE: ${safety?.dgcHotline || '—'}`, margin, y); y -= sizes.body + 2
    draw(`WORKSAFE BC HOTLINE: ${safety?.worksafeHotline || '—'}`, margin, y); y -= sizes.body + 6
    draw(`First Aid: ${safety?.firstAid || '—'}`, margin, y)
    y -= sizes.body
  }

  // (Optional) short crew list at end
  y -= 10
  sectionTitle('CREW (summary)')
  for (const m of p.members) {
    ensure()
    const who = m.profile?.displayName || m.externalName || '—'
    const bits = [m.role || m.department, who, m.email, m.phone].filter(Boolean).join('  •  ')
    draw(bits, margin, y); y -= sizes.body + 2
  }

  const bytes = await pdf.save()
  return new NextResponse(bytes, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="callsheet-${p.id}.pdf"`,
      'cache-control': 'no-store',
    },
  })
}