// src/server/utils/roleToDept.ts
import type { Department } from "@prisma/client"

export function roleToDept(role?: string): Department | null {
  if (!role) return null
  const r = role.toLowerCase()
  if (/(^|\W)(1st|2nd|3rd|tad|ad)(\W|$)/.test(r)) return "AD"
  if (/(dop|d\.?p|camera|ac|dit|stills)/.test(r)) return "CAMERA"
  if (/(gaffer|lx|lamp|grip|dolly)/.test(r)) return "GRIP_ELECTRIC"
  if (/(location|alm)/.test(r)) return "LOCATIONS"
  if (/(art|props|set dec|set dresser|prod des)/.test(r)) return "ART"
  if (/(wardrobe|costume)/.test(r)) return "WARDROBE"
  if (/(hair|make.?up|hmu)/.test(r)) return "HMU"
  if (/(sound|mixer|boom)/.test(r)) return "SOUND"
  if (/(spfx|special effects|snow team)/.test(r)) return "SPFX"
  if (/(stunt)/.test(r)) return "STUNTS"
  if (/(vfx|compositor|cg)/.test(r)) return "VFX"
  if (/(post|editor|post coord|post sup)/.test(r)) return "POST"
  if (/(transport|driver|capt|coord)/.test(r)) return "TRANSPORT"
  if (/(catering|craft)/.test(r)) return "CATERING"
  if (/(first aid|facs|safety|med)/.test(r)) return "MED_SAFETY"
  if (/(actor|cast|stand in|double)/.test(r)) return "CAST"
  return "MISC"
}
