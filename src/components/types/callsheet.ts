// src/types/callsheet.ts  (optional helper type for TS hinting)
export type CallSheetDetails = {
  // S1 — header
  company?: {
    name?: string
    office?: { address?: string; email?: string; payrollEmail?: string; apEmail?: string }
    execProducers?: string[]
    producers?: string[]
    director?: string
    writers?: string[]
  }
  title?: { name?: string; logoUrl?: string; advisories?: string[] }  // up to 3 advisories
  day?: {
    dateISO?: string // yyyy-mm-dd
    crewCall?: string // ISO datetime
    shootCall?: string // ISO datetime
    amCurfew?: string // "02:00"
    tailLights?: string // "24:00"
  }
  weather?: { sunrise?: string; sunset?: string; hi?: string; lo?: string; summary?: string }
  meals?: { circusHot?: string; breakfast?: string; lunch?: string; driverLunch?: string }

  // S2 — schedule + locations
  scenes?: Array<{ no?: string; heading?: string; description?: string; cast?: string; dn?: 'D'|'N'; pgs?: string }>
  locations?: {
    set?: string; trucks?: string; lunch?: string; circus?: string; crewPark?: string; bge?: string
    notes?: string; totalPages?: string
  }

  // S3 — cast
  cast?: Array<{ no?: string; name?: string; character?: string; status?: string; puLv?: string; hmu?: string; rehBlk?: string; set?: string; comments?: string }>

  // S4 — bg / notes / paperwork
  background?: Array<{ isNew?: boolean; name?: string; call?: string; onSet?: string; remarks?: string }>
  notes?: string
  paperwork?: string

  // S5 — next day (advanced)
  nextDay?: {
    dateISO?: string
    cast?: Array<{ no?: string; name?: string; character?: string; status?: string; puLv?: string; hmu?: string; rehBlk?: string; set?: string; comments?: string }>
  }

  // S6 — contacts + safety
  contacts?: {
    pm?: { name?: string; phone?: string; email?: string }
    firstAD?: { name?: string; phone?: string; email?: string }
    secondAD?: { name?: string; phone?: string; email?: string }
    thirdAD?: { name?: string; phone?: string; email?: string }
    locMgr?: { name?: string; phone?: string; email?: string }
    asstLocMgr?: { name?: string; phone?: string; email?: string }
    transportCoord?: { name?: string; phone?: string; email?: string }
    transportCapt?: { name?: string; phone?: string; email?: string }
  }
  hospital?: { name?: string; address?: string; phone?: string }
  emergency?: string
  hotlines?: { dgc?: string; worksafeBc?: string }
  firstAid?: { info?: string }
}