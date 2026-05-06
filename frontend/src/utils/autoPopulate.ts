import type { Program, YearPlan, Course, PoolItem, RequirementBlock } from '../types';

const EMPTY_YEAR_PLAN: YearPlan = {
  year1: { fall: [], jan: [], spring: [] },
  year2: { fall: [], jan: [], spring: [] },
  year3: { fall: [], jan: [], spring: [] },
  year4: { fall: [], jan: [], spring: [] },
};

const MAX_COURSES_PER_SEMESTER = 4;
const TERM_ORDER = ['fall', 'jan', 'spring'];

function getCourseLevel(number: string): number {
  const match = number.match(/^(\d)/);
  return match ? parseInt(match[1]) : 1;
}

function getValidTerms(course: Course): string[] {
  const terms = course.offered_terms;
  if (terms.length === 0) return ['fall', 'spring'];
  return terms;
}

function pickDefaultSequence(pool: PoolItem[]): string[] {
  for (const item of pool) {
    if (item.type === 'sequence') return item.sequence;
  }
  return [];
}

function getQualifyingCoursesForAttribute(catalog: Record<string, Course>, attr: string): string[] {
  return Object.values(catalog)
    .filter(c => c.distributions.includes(attr) || c.attributes.includes(attr))
    .map(c => c.id);
}

function getQualifyingCoursesForLevel(catalog: Record<string, Course>, level: number): string[] {
  return Object.values(catalog)
    .filter(c => getCourseLevel(c.number) >= level)
    .map(c => c.id);
}

function countAttributeInPlan(attribute: string, plan: YearPlan, catalog: Record<string, Course>): number {
  let count = 0;
  for (let year = 1; year <= 4; year++) {
    const yk = `year${year}` as keyof YearPlan;
    for (const term of TERM_ORDER) {
      for (const courseId of (plan[yk] as any)[term]) {
        const c = catalog[courseId];
        if (c?.distributions.includes(attribute) || c?.attributes.includes(attribute)) count++;
      }
    }
  }
  return count;
}

function countLevelInPlan(level: number, plan: YearPlan, catalog: Record<string, Course>): number {
  let count = 0;
  for (let year = 1; year <= 4; year++) {
    const yk = `year${year}` as keyof YearPlan;
    for (const term of TERM_ORDER) {
      for (const courseId of (plan[yk] as any)[term]) {
        const c = catalog[courseId];
        if (c && getCourseLevel(c.number) >= level) count++;
      }
    }
  }
  return count;
}

function tryMatchFilter(filter: Record<string, any>, catalog: Record<string, Course>): string | null {
  for (const c of Object.values(catalog)) {
    if (filter.subject && c.subject !== filter.subject) continue;
    if (filter.departments && !filter.departments.includes(c.department.toLowerCase())) continue;
    if (filter.level) {
      const level = getCourseLevel(c.number);
      if (Array.isArray(filter.level)) {
        if (!filter.level.includes(level)) continue;
      } else if (typeof filter.level === 'number') {
        if (level !== filter.level) continue;
      }
    }
    if (filter.level_min && getCourseLevel(c.number) < filter.level_min) continue;
    if (filter.level_max && getCourseLevel(c.number) > filter.level_max) continue;
    if (filter.minimum_level && getCourseLevel(c.number) < filter.minimum_level) continue;
    return c.id;
  }
  return null;
}

export function autoPopulatePlan(
  program: Program,
  catalog: Record<string, Course>,
  concentrationId?: string,
  graduationProgram?: Program,
  secondaryProgram?: Program,
): { years: YearPlan; requirements: RequirementBlock[] } {
  const plan: YearPlan = JSON.parse(JSON.stringify(EMPTY_YEAR_PLAN));
  const requirements: RequirementBlock[] = [];

  const allRules = [...program.rules];
  if (concentrationId && program.concentrations) {
    const conc = program.concentrations.options.find(c => c.id === concentrationId);
    if (conc) allRules.push(...conc.adds_rules);
  }
  if (secondaryProgram) {
    allRules.push(...secondaryProgram.rules);
  }

  // Collect all courses to place
  const toPlace: { courseId: string; level: number; terms: string[]; prereqs: string[] }[] = [];

  for (const rule of allRules) {
    if (rule.type === 'fixed' && rule.pool) {
      for (const item of rule.pool) {
        if (item.type === 'course') {
          const c = catalog[item.course_id];
          if (c) toPlace.push({ courseId: item.course_id, level: getCourseLevel(c.number), terms: getValidTerms(c), prereqs: c.prerequisites });
        } else if (item.type === 'sequence') {
          for (const cid of item.sequence) {
            const c = catalog[cid];
            if (c) toPlace.push({ courseId: cid, level: getCourseLevel(c.number), terms: getValidTerms(c), prereqs: c.prerequisites });
          }
        }
      }
    } else if (rule.type === 'choice' && rule.pool) {
      const select = rule.select || 1;
      let placed = 0;
      for (const item of rule.pool) {
        if (placed >= select) break;
        if (item.type === 'course') {
          const c = catalog[item.course_id];
          if (c) {
            toPlace.push({ courseId: item.course_id, level: getCourseLevel(c.number), terms: getValidTerms(c), prereqs: c.prerequisites });
            placed++;
          }
        } else if (item.type === 'sequence') {
          for (const cid of item.sequence) {
            const c = catalog[cid];
            if (c) toPlace.push({ courseId: cid, level: getCourseLevel(c.number), terms: getValidTerms(c), prereqs: c.prerequisites });
          }
          placed++;
        } else if (item.type === 'filter') {
          // Try to find a matching course for filter-based choices
          const matched = tryMatchFilter(item.filter, catalog);
          if (matched) {
            const c = catalog[matched];
            toPlace.push({ courseId: matched, level: getCourseLevel(c.number), terms: getValidTerms(c), prereqs: c.prerequisites });
            placed++;
          }
        }
      }
    } else if (rule.type === 'sequence_choice' && rule.pool) {
      const seq = pickDefaultSequence(rule.pool);
      for (const cid of seq) {
        const c = catalog[cid];
        if (c) toPlace.push({ courseId: cid, level: getCourseLevel(c.number), terms: getValidTerms(c), prereqs: c.prerequisites });
      }
    }
  }

  // Deduplicate by courseId
  const uniqueToPlace = toPlace.filter((p, i, arr) => arr.findIndex(x => x.courseId === p.courseId) === i);

  // Sort by level, then by whether it's a prereq for others (topo sort)
  const prereqOf = new Map<string, string[]>();
  for (const p of uniqueToPlace) {
    for (const prereq of p.prereqs) {
      if (!prereqOf.has(prereq)) prereqOf.set(prereq, []);
      prereqOf.get(prereq)!.push(p.courseId);
    }
  }
  uniqueToPlace.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    const aIsPrereq = prereqOf.has(a.courseId) ? 1 : 0;
    const bIsPrereq = prereqOf.has(b.courseId) ? 1 : 0;
    return bIsPrereq - aIsPrereq;
  });

  // Track per-year placement count
  const yearPlacementCount: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

  function countInSem(year: number, term: string): number {
    const yk: keyof YearPlan = `year${year}` as keyof YearPlan;
    return plan[yk][term as keyof typeof plan['year1']].length;
  }

  function totalYearLoad(year: number): number {
    return countInSem(year, 'fall') + countInSem(year, 'jan') + countInSem(year, 'spring');
  }

  // Place each course
  const placement = new Map<string, { year: number; term: string }>();

  for (const p of uniqueToPlace) {
    const minYear = Math.min(p.level, 4);

    // Check prereqs: must be placed in earlier semester
    let earliestYear = minYear;
    let earliestTermIdx = 0;
    for (const prereqId of p.prereqs) {
      const prereqPlacement = placement.get(prereqId);
      if (prereqPlacement) {
        const termIdx = TERM_ORDER.indexOf(prereqPlacement.term);
        if (prereqPlacement.year > earliestYear || (prereqPlacement.year === earliestYear && termIdx >= earliestTermIdx)) {
          earliestYear = prereqPlacement.year;
          earliestTermIdx = termIdx + 1;
          if (earliestTermIdx >= TERM_ORDER.length) {
            earliestYear++;
            earliestTermIdx = 0;
          }
        }
      }
    }

    // Find the best year to place this course, preferring less-loaded years
    let slot: { year: number; term: string } | null = null;

    // Build candidate years sorted by total load
    const candidateYears: { year: number; load: number }[] = [];
    for (let year = earliestYear; year <= 4; year++) {
      candidateYears.push({ year, load: totalYearLoad(year) });
    }
    candidateYears.sort((a, b) => a.load - b.load);

    for (const { year } of candidateYears) {
      const candidates = TERM_ORDER
        .map((term, idx) => ({ term, idx }))
        .filter(({ idx }) => !(year === earliestYear && idx < earliestTermIdx))
        .filter(({ term }) => p.terms.includes(term))
        .map(({ term }) => ({ term, load: countInSem(year, term) }))
        .filter(c => c.load < MAX_COURSES_PER_SEMESTER);

      if (candidates.length > 0) {
        const minLoad = Math.min(...candidates.map(c => c.load));
        const tied = candidates.filter(c => c.load === minLoad);
        const yearCount = yearPlacementCount[year] || 0;
        const prefersSpring = (yearCount % 2) === 1;
        tied.sort((a, b) => {
          const aIsSpring = a.term === 'spring' ? 1 : 0;
          const bIsSpring = b.term === 'spring' ? 1 : 0;
          if (prefersSpring) return bIsSpring - aIsSpring;
          return aIsSpring - bIsSpring;
        });

        slot = { year, term: tied[0].term };
        break;
      }
    }

    // Overflow
    if (!slot) {
      for (let year = earliestYear; year <= 4; year++) {
        for (const term of TERM_ORDER) {
          if (!p.terms.includes(term)) continue;
          if (countInSem(year, term) < MAX_COURSES_PER_SEMESTER + 2) {
            slot = { year, term };
            break;
          }
        }
        if (slot) break;
      }
    }

    if (slot) {
      const yk: keyof YearPlan = `year${slot.year}` as keyof YearPlan;
      plan[yk][slot.term as keyof typeof plan['year1']].push(p.courseId);
      placement.set(p.courseId, slot);
      yearPlacementCount[slot.year] = (yearPlacementCount[slot.year] || 0) + 1;
    }
  }

  // --- Place requirement blocks for open-ended rules ---
  // First, collect all minimum_attribute/minimum_level rules
  const reqRules: { rule_id: string; name: string; count: number; qualifying: string[]; alreadySatisfied: number }[] = [];

  function addReqRules(rules: typeof allRules) {
    for (const rule of rules) {
      if (rule.type === 'minimum_attribute' && rule.attribute) {
        const min = rule.minimum_count || 1;
        const already = countAttributeInPlan(rule.attribute, plan, catalog);
        const qualifying = getQualifyingCoursesForAttribute(catalog, rule.attribute);
        if (qualifying.length > 5 && already < min) {
          for (let i = 0; i < min - already; i++) {
            reqRules.push({ rule_id: rule.id, name: rule.name || rule.attribute, count: min, qualifying, alreadySatisfied: already });
          }
        }
      } else if (rule.type === 'minimum_level' && rule.level) {
        const min = rule.minimum_count || 1;
        const already = countLevelInPlan(rule.level, plan, catalog);
        const qualifying = getQualifyingCoursesForLevel(catalog, rule.level);
        if (qualifying.length > 5 && already < min) {
          for (let i = 0; i < min - already; i++) {
            reqRules.push({ rule_id: rule.id, name: `${rule.level}-level course`, count: min, qualifying, alreadySatisfied: already });
          }
        }
      }
    }
  }

  addReqRules(allRules);
  if (graduationProgram) {
    addReqRules(graduationProgram.rules);
  }

  // Place requirement blocks evenly across Fall/Spring, skipping Jan Plan
  const reqLoad: Record<string, number> = {};
  function getReqLoad(year: number, term: string): number {
    return reqLoad[`${year}-${term}`] || 0;
  }
  function totalLoad(year: number, term: string): number {
    return countInSem(year, term) + getReqLoad(year, term);
  }

  for (const req of reqRules) {
    let slot: { year: number; term: string } | null = null;
    const isJanPlanReq = req.name.toLowerCase().includes('jan');

    if (isJanPlanReq) {
      for (let year = 1; year <= 4; year++) {
        if (totalLoad(year, 'jan') < MAX_COURSES_PER_SEMESTER) {
          slot = { year, term: 'jan' };
          break;
        }
      }
    } else {
      const mainTerms = ['fall', 'spring'];
      // Prefer less-loaded years for req blocks too
      const candidateYears: { year: number; load: number }[] = [];
      for (let year = 1; year <= 4; year++) {
        candidateYears.push({ year, load: totalYearLoad(year) });
      }
      candidateYears.sort((a, b) => a.load - b.load);

      for (const { year } of candidateYears) {
        const candidates = mainTerms
          .map(term => ({ term, load: totalLoad(year, term) }))
          .filter(c => c.load < MAX_COURSES_PER_SEMESTER);

        if (candidates.length > 0) {
          const minLoad = Math.min(...candidates.map(c => c.load));
          const tied = candidates.filter(c => c.load === minLoad);
          const prefersSpring = (yearPlacementCount[year] + getReqLoad(year, 'fall') + getReqLoad(year, 'spring')) % 2 === 1;
          tied.sort((a, b) => {
            const aIsSpring = a.term === 'spring' ? 1 : 0;
            const bIsSpring = b.term === 'spring' ? 1 : 0;
            if (prefersSpring) return bIsSpring - aIsSpring;
            return aIsSpring - bIsSpring;
          });

          slot = { year, term: tied[0].term };
          break;
        }
      }

      if (!slot) {
        for (let year = 1; year <= 4; year++) {
          for (const term of TERM_ORDER) {
            if (totalLoad(year, term) < MAX_COURSES_PER_SEMESTER + 2) {
              slot = { year, term };
              break;
            }
          }
          if (slot) break;
        }
      }
    }

    if (slot) {
      requirements.push({
        id: crypto.randomUUID(),
        rule_id: req.rule_id,
        name: req.name,
        year: slot.year,
        term: slot.term,
        qualifying_courses: req.qualifying,
      });
      reqLoad[`${slot.year}-${slot.term}`] = (reqLoad[`${slot.year}-${slot.term}`] || 0) + 1;
      yearPlacementCount[slot.year] = (yearPlacementCount[slot.year] || 0) + 1;
    }
  }

  return { years: plan, requirements };
}
