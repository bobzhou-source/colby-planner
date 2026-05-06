import type { Program } from '../types';
import { getProgramDepartment } from './departments';

function extractCourseIds(program: Program): Set<string> {
  const ids = new Set<string>();
  const allRules = [...program.rules];
  if (program.concentrations) {
    for (const conc of program.concentrations.options) {
      allRules.push(...conc.adds_rules);
    }
  }
  for (const rule of allRules) {
    if (rule.pool) {
      for (const item of rule.pool) {
        if (item.type === 'course') ids.add(item.course_id);
        if (item.type === 'sequence') {
          for (const cid of item.sequence) ids.add(cid);
        }
      }
    }
  }
  return ids;
}

export interface ProgramMatch {
  program: Program;
  overlap: number;
  primaryTotal: number;
  secondaryTotal: number;
}

export function findCompatiblePrograms(primary: Program, candidates: Program[]): ProgramMatch[] {
  const primaryIds = extractCourseIds(primary);
  const primaryTotal = primaryIds.size;

  const matches: ProgramMatch[] = candidates
    .filter(p => p.id !== primary.id)
    .map(p => {
      const secondaryIds = extractCourseIds(p);
      const shared = Array.from(primaryIds).filter(id => secondaryIds.has(id));
      return {
        program: p,
        overlap: shared.length,
        primaryTotal,
        secondaryTotal: secondaryIds.size,
      };
    })
    .filter(m => m.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap);

  return matches;
}

export function isLikelyForbidden(primary: Program, secondary: Program): boolean {
  const pName = primary.name.toLowerCase();
  const sName = secondary.name.toLowerCase();
  const pNote = (primary.note || '').toLowerCase();
  const sNote = (secondary.note || '').toLowerCase();

  // Same department — Colby does not allow double majoring within the same department
  const pDept = getProgramDepartment(primary.id);
  const sDept = getProgramDepartment(secondary.id);
  if (pDept && sDept && pDept === sDept) {
    return true;
  }

  // Same subject major + minor (e.g., CS major + CS minor)
  const pSubject = pName.replace(/ major| minor/g, '').trim();
  const sSubject = sName.replace(/ major| minor/g, '').trim();
  if (pSubject === sSubject && primary.degree_type !== secondary.degree_type) {
    return true;
  }

  // Note mentions prohibition
  const combinedNote = pNote + ' ' + sNote;
  const forbiddenPhrases = [
    'may not major',
    'may not minor',
    'cannot major',
    'cannot minor',
    'not major in',
    'not minor in',
    'prohibited',
    'forbidden',
  ];
  for (const phrase of forbiddenPhrases) {
    if (combinedNote.includes(phrase)) {
      if (combinedNote.includes(sSubject) || combinedNote.includes(pSubject)) {
        return true;
      }
    }
  }

  return false;
}
