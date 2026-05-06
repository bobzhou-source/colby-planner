import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Plan, YearPlan, SemesterCourses, RequirementBlock } from '../types';

const VERSION = 'v3';

function yearToString(year: SemesterCourses): string {
  const parts: string[] = [];
  if (year.fall.length) parts.push('F:' + year.fall.join(','));
  if (year.jan.length) parts.push('J:' + year.jan.join(','));
  if (year.spring.length) parts.push('S:' + year.spring.join(','));
  return parts.join('|');
}

function stringToYear(s: string): SemesterCourses {
  const result: SemesterCourses = { fall: [], jan: [], spring: [] };
  if (!s) return result;
  for (const part of s.split('|')) {
    const [term, ids] = part.split(':');
    if (ids) {
      const list = ids.split(',').filter(Boolean);
      if (term === 'F') result.fall = list;
      if (term === 'J') result.jan = list;
      if (term === 'S') result.spring = list;
    }
  }
  return result;
}

function reqToString(reqs: RequirementBlock[]): string {
  if (!reqs.length) return '';
  return reqs.map(r => {
    const courses = r.qualifying_courses.join(',');
    return `${r.rule_id}:${encodeURIComponent(r.name)}:${r.year}:${r.term}:${courses}`;
  }).join('|');
}

function stringToReqs(s: string): RequirementBlock[] {
  if (!s) return [];
  return s.split('|').map(part => {
    const [rule_id, nameEnc, year, term, courses] = part.split(':');
    return {
      id: crypto.randomUUID(),
      rule_id: rule_id || '',
      name: decodeURIComponent(nameEnc || ''),
      year: parseInt(year) || 1,
      term: term || 'fall',
      qualifying_courses: courses ? courses.split(',').filter(Boolean) : [],
    };
  });
}

function planToCompact(plan: Plan): string {
  const y = plan.years;
  const parts = [
    VERSION,
    plan.program_id,
    plan.secondary_program_id || '',
    plan.concentration_id || '',
    yearToString(y.year1),
    yearToString(y.year2),
    yearToString(y.year3),
    yearToString(y.year4),
    reqToString(plan.requirements),
  ];
  return parts.join('~');
}

function compactToPlan(compact: string, name: string): Plan | null {
  const parts = compact.split('~');
  const version = parts[0];
  if (version !== VERSION && version !== 'v2' && version !== 'v1') return null;

  const program_id = parts[1];
  const secondary_program_id = parts[2] || undefined;
  const concentration_id = parts[3] || undefined;

  let yearIdx = 4;
  if (version === 'v1') {
    yearIdx = 3;
  }

  const years: YearPlan = {
    year1: stringToYear(parts[yearIdx] || ''),
    year2: stringToYear(parts[yearIdx + 1] || ''),
    year3: stringToYear(parts[yearIdx + 2] || ''),
    year4: stringToYear(parts[yearIdx + 3] || ''),
  };

  const requirements = (version === VERSION || version === 'v2') && parts[yearIdx + 4]
    ? stringToReqs(parts[yearIdx + 4])
    : [];

  return {
    id: crypto.randomUUID(),
    name,
    program_id,
    secondary_program_id,
    concentration_id,
    years,
    requirements,
  };
}

export function encodePlan(plan: Plan): string {
  const compact = planToCompact(plan);
  return compressToEncodedURIComponent(compact);
}

export function decodePlan(hash: string, name: string): Plan | null {
  try {
    const compact = decompressFromEncodedURIComponent(hash);
    if (!compact) return null;
    return compactToPlan(compact, name);
  } catch {
    return null;
  }
}
