// Server component: A4 call sheet preview (HTML)
// Renders all S1–S6 sections using project.details

import { prisma } from '@/server/utils/prisma'
import { notFound } from 'next/navigation'

// Allow Prisma in this route (app router)
export const runtime = 'nodejs'

// -------- Helpers --------

type Any = Record<string, any>
const get = <T = any>(o: Any | undefined, path: string, fallback: T): T => {
  try {
    return path.split('.').reduce((a: any, k) => (a ?? {})[k], o) ?? fallback
  } catch { return fallback }
}
const fmtDate = (d?: Date | null) => (d ? new Date(d).toLocaleString() : '—')

// -------- Page --------

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await prisma.project.findUnique({
    where: { id },
    include: { members: { orderBy: { createdAt: 'asc' }, include: { profile: true } } },
  })
  if (!p) notFound()

  const d: Any = (p.details as Any) ?? {}
  const schedule: Any[] = Array.isArray(d.schedule) ? d.schedule : []
  const cast: Any[] = Array.isArray(d.cast) ? d.cast : []
  const atmos: Any[] = Array.isArray(d.atmosphere) ? d.atmosphere : []
  const advSchedule: Any[] = Array.isArray(d.advancedSchedule) ? d.advancedSchedule : []
  const advLoc: Any = d.advancedLocations ?? {}
  const advTotalPages: string = d.advancedScheduleTotalPages ?? ''

  return (
    <main className="a4">
      {/* Print styles scoped here so we don't touch the app */}
      <style>{`
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box }
        html, body { margin:0; padding:0; color:#111; }
        .a4 { width:100%; padding: 10mm; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; line-height:1.35; }

        h1,h2,h3 { margin:0 0 6px 0; }
        h1 { font-size:20px; letter-spacing:.01em; }
        h2 { font-size:13px; text-transform:uppercase; letter-spacing:.03em; }
        h3 { font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:#222; }
        .muted { color:#666 }

        .grid-3 { display:grid; grid-template-columns: 1.15fr 1fr 1fr; gap:12px; }
        .grid-2 { display:grid; grid-template-columns: 1.6fr 1fr; gap:12px; }

        .box { border:0.8px solid #111; border-radius:4px; padding:10px; background:#fff; break-inside: avoid; }
        .box + .box { margin-top:0 }

        .kv { display:grid; grid-template-columns: minmax(120px, 32%) 1fr; gap:4px 8px; font-size:11px; align-items:center; }
        .kv b { font-weight:600 }

        .chips { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
        .chip { border:0.8px solid #111; border-radius:999px; padding:2px 8px; font-size:11px; font-weight:600; background:#fff; }

        .table { width:100%; border-collapse:collapse; table-layout:fixed; }
        .table th, .table td { border:0.8px solid #111; padding:5px 6px; font-size:11px; vertical-align:top; word-break:break-word; }
        .table th { background:#f0f0f0; font-weight:700; }
        .table tbody tr:nth-child(even) { background:#fafafa; }
        .table td.numeric, .table th.numeric { text-align:center; }

        .mt8{ margin-top:8px } .mt12{ margin-top:12px } .mt16{ margin-top:16px }
        .section { break-inside: avoid; }
        .page-break-before { break-before: page; }

        @media print {
          .section { break-inside: avoid; }
          tr { break-inside: avoid; }
        }
      `}</style>

      {/* ===== S1: Header / Company / Advisories / Times / Weather / Meals ===== */}
      <section className="grid-3 section">
        {/* Left: Company / Office / Credits */}
        <div className="box">
          <h3>Company</h3>
          <div className="kv"><b>Name</b><div>{get(d,'company.name','—')}</div></div>

          <h3 className="mt8">Production Office</h3>
          <div style={{whiteSpace:'pre-wrap', fontSize:11}}>{get(d,'office.address','—')}</div>
          <div className="kv mt8"><b>Email</b><div>{get(d,'office.email','—')}</div></div>
          <div className="kv"><b>Payroll</b><div>{get(d,'office.payrollEmail','—')}</div></div>
          <div className="kv"><b>AP</b><div>{get(d,'office.apEmail','—')}</div></div>

          <h3 className="mt8">Credits</h3>
          <div className="kv"><b>Exec Producers</b><div>{get(d,'crew.execProducersCsv','—')}</div></div>
          <div className="kv"><b>Producer</b><div>{get(d,'crew.producer','—')}</div></div>
          <div className="kv"><b>Director</b><div>{get(d,'crew.director','—')}</div></div>
          <div className="kv"><b>Writers</b><div>{get(d,'crew.writersCsv','—')}</div></div>
        </div>

        {/* Middle: Title + Advisories */}
        <div className="box">
          <h1>{p.name || 'Untitled Project'}</h1>
          <div className="chips">
            {(get<string[]>(d,'header.advisories',[]) as string[])
              .filter(Boolean)
              .slice(0,3)
              .map((a,i)=><span className="chip" key={i}>{a}</span>)}
          </div>

          <h3 className="mt12">Weather</h3>
          <div className="kv">
            <b>Sunrise</b><div>{get(d,'weather.sunrise','—')}</div>
            <b>Sunset</b><div>{get(d,'weather.sunset','—')}</div>
            <b>Hi / Lo</b><div>{get(d,'weather.hi','—')} / {get(d,'weather.lo','—')}</div>
          </div>

          <h3 className="mt12">Meals</h3>
          <div className="kv">
            <b>Circus Hot</b><div>{get(d,'meals.circusHot','—')}</div>
            <b>Breakfast</b><div>{get(d,'meals.breakfast','—')}</div>
            <b>Lunch</b><div>{get(d,'meals.lunch','—')}</div>
            <b>Driver Lunch</b><div>{get(d,'meals.driverLunch','—')}</div>
          </div>
        </div>

        {/* Right: Times */}
        <div className="box">
          <h3>Day & Times</h3>
          <div className="kv">
            <b>Shoot Date</b><div>{fmtDate(p.shootDate)}</div>
            <b>Crew Call</b><div>{fmtDate(p.crewCall)}</div>
            <b>Shoot Call</b><div>{fmtDate(p.shootCall)}</div>
            <b>AM Curfew</b><div>{get(d,'times.amCurfew','—')}</div>
            <b>Tail Lights</b><div>{get(d,'times.tailLights','—')}</div>
          </div>
        </div>
      </section>

      {/* ===== S2: Schedule & Locations ===== */}
      <section className="grid-2 mt16 section">
        <div className="box">
          <h2>Schedule</h2>
          <table className="table mt8">
            <thead>
              <tr>
                <th style={{width:'12%'}} className="numeric">Scene</th>
                <th>Set / Description</th>
                <th style={{width:'14%'}}>Cast</th>
                <th style={{width:'8%'}} className="numeric">D/N</th>
                <th style={{width:'8%'}} className="numeric">PGS</th>
              </tr>
            </thead>
            <tbody>
              {schedule.length === 0 && (
                <tr><td colSpan={5}>—</td></tr>
              )}
              {schedule.map((r, i) => (
                <tr key={i}>
                  <td className="numeric">{r.scene || ''}</td>
                  <td>{r.description || ''}</td>
                  <td>{r.cast || ''}</td>
                  <td className="numeric">{r.dayNight || ''}</td>
                  <td className="numeric">{r.pgs || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="box">
          <h2>Location / Notes</h2>
          <div className="kv mt8">
            <b>SET</b><div style={{whiteSpace:'pre-wrap'}}>{get(d,'locations.set','—')}</div>
            <b>TRUCKS</b><div style={{whiteSpace:'pre-wrap'}}>{get(d,'locations.trucks','—')}</div>
            <b>LUNCH</b><div style={{whiteSpace:'pre-wrap'}}>{get(d,'locations.lunch','—')}</div>
            <b>CIRCUS</b><div style={{whiteSpace:'pre-wrap'}}>{get(d,'locations.circus','—')}</div>
            <b>CREW PARK</b><div style={{whiteSpace:'pre-wrap'}}>{get(d,'locations.crewPark','—')}</div>
            <b>BGE</b><div style={{whiteSpace:'pre-wrap'}}>{get(d,'locations.bge','—')}</div>
            <b>NOTES</b><div style={{whiteSpace:'pre-wrap'}}>{get(d,'locations.notes','—')}</div>
            <b>TOTAL PAGES</b><div>{get(d,'scheduleTotalPages','—')}</div>
          </div>
        </div>
      </section>

      {/* ===== S3: Cast ===== */}
      <section className="box mt16 section">
        <h2>Cast</h2>
        <table className="table mt8">
          <thead>
            <tr>
              <th style={{width:'7%'}} className="numeric">#</th>
              <th style={{width:'22%'}}>Cast</th>
              <th style={{width:'18%'}}>Character</th>
              <th style={{width:'10%'}}>Status</th>
              <th style={{width:'10%'}} className="numeric">PU/LV</th>
              <th style={{width:'8%'}} className="numeric">HMU</th>
              <th style={{width:'10%'}} className="numeric">REH/BLCK</th>
              <th style={{width:'8%'}} className="numeric">SET</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            {cast.length === 0 && (<tr><td colSpan={9}>—</td></tr>)}
            {cast.map((r, i) => (
              <tr key={i}>
                <td className="numeric">{r.no || ''}</td>
                <td>{r.cast || ''}</td>
                <td>{r.character || ''}</td>
                <td>{r.status || ''}</td>
                <td className="numeric">{r.pulv || ''}</td>
                <td className="numeric">{r.hmu || ''}</td>
                <td className="numeric">{r.rehblk || ''}</td>
                <td className="numeric">{r.setTime || ''}</td>
                <td>{r.comments || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ===== S4: Atmosphere & Stand-ins + Notes + Paperwork ===== */}
      <section className="box mt16 section">
        <h2>Atmosphere & Stand-ins</h2>
        <table className="table mt8">
          <thead>
            <tr>
              <th style={{width:'10%'}}>#New</th>
              <th style={{width:'30%'}}>Name</th>
              <th style={{width:'12%'}}>Call</th>
              <th style={{width:'12%'}}>On Set</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {atmos.length === 0 && (<tr><td colSpan={5}>—</td></tr>)}
            {atmos.map((r, i) => (
              <tr key={i}>
                <td>{r.new || ''}</td>
                <td>{r.name || ''}</td>
                <td>{r.call || ''}</td>
                <td>{r.onSet || ''}</td>
                <td>{r.remarks || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid-2 mt12">
          <div className="box">
            <h3>Notes</h3>
            <div style={{whiteSpace:'pre-wrap', fontSize:11}}>{get(d,'notes','—')}</div>
          </div>
          <div className="box">
            <h3>Current Paperwork</h3>
            <div style={{whiteSpace:'pre-wrap', fontSize:11}}>{get(d,'paperwork','—')}</div>
          </div>
        </div>
      </section>

      {/* ===== S5: Advanced Shooting Schedule (next day) — mirrors S2 ===== */}
      <section className="section mt16 page-break-before">
        <div className="grid-2">
          <div className="box">
            <h2>Advanced Shooting Schedule (Next Day)</h2>
            <table className="table mt8">
              <thead>
                <tr>
                  <th style={{width:'12%'}} className="numeric">Scene</th>
                  <th>Set / Description</th>
                  <th style={{width:'14%'}}>Cast</th>
                  <th style={{width:'8%'}} className="numeric">D/N</th>
                  <th style={{width:'8%'}} className="numeric">PGS</th>
                </tr>
              </thead>
              <tbody>
                {advSchedule.length === 0 && (<tr><td colSpan={5}>—</td></tr>)}
                {advSchedule.map((r, i) => (
                  <tr key={i}>
                    <td className="numeric">{r.scene || ''}</td>
                    <td>{r.description || ''}</td>
                    <td>{r.cast || ''}</td>
                    <td className="numeric">{r.dayNight || ''}</td>
                    <td className="numeric">{r.pgs || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="box">
            <h2>Advanced Locations / Notes</h2>
            <div className="kv mt8">
              <b>SET</b><div style={{whiteSpace:'pre-wrap'}}>{advLoc.set || '—'}</div>
              <b>TRUCKS</b><div style={{whiteSpace:'pre-wrap'}}>{advLoc.trucks || '—'}</div>
              <b>LUNCH</b><div style={{whiteSpace:'pre-wrap'}}>{advLoc.lunch || '—'}</div>
              <b>CIRCUS</b><div style={{whiteSpace:'pre-wrap'}}>{advLoc.circus || '—'}</div>
              <b>CREW PARK</b><div style={{whiteSpace:'pre-wrap'}}>{advLoc.crewPark || '—'}</div>
              <b>BGE</b><div style={{whiteSpace:'pre-wrap'}}>{advLoc.bge || '—'}</div>
              <b>NOTES</b><div style={{whiteSpace:'pre-wrap'}}>{advLoc.notes || '—'}</div>
              <b>TOTAL PAGES</b><div>{advTotalPages || '—'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== S6: Key Contacts & Safety ===== */}
      <section className="box mt16 section">
        <h2>Key Contacts & Safety</h2>
        <div className="grid-2 mt8">
          <div>
            <table className="table">
              <tbody>
                {[
                  'PM','1st AD','2nd AD','3rd AD',
                  'Location Manager','Asst. Loc. Manager',
                  'Transport Coord','Transport Capt.'
                ].map((role) => (
                  <tr key={role}>
                    <th style={{width:'40%'}}>{role}</th>
                    <td>{get(d,`contacts.${role}.text`, '') || [
                      get(d,`contacts.${role}.name`, ''),
                      get(d,`contacts.${role}.phone`, ''),
                      get(d,`contacts.${role}.email`, '')
                    ].filter(Boolean).join(' • ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="kv">
              <b>Nearest Hospital</b>
              <div style={{whiteSpace:'pre-wrap'}}>{get(d,'safety.hospital','—')}</div>
              <b>Emergency Notes</b>
              <div style={{whiteSpace:'pre-wrap'}}>{get(d,'safety.emergencyNotes','—')}</div>
              <b>DGC Anonymous Hotline</b>
              <div>{get(d,'safety.dgcHotline','—')}</div>
              <b>WorkSafe BC Hotline</b>
              <div>{get(d,'safety.worksafeHotline','—')}</div>
              <b>First Aid</b>
              <div>{get(d,'safety.firstAid','—')}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}