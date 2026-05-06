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

function pickDefaultCourse(pool: PoolItem[]): string | null {
  for (const item of pool) {
    if (item.type === 'course') return item.course_id;
    if (item.type === 'sequence' && item.sequence.length > 0) return item.sequence[0];
  }
  return null;
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

export function autoPopulatePlan(
  program: Program,
  catalog: Record<string, Course>,
  concentrationId?: string,
  graduationProgram?: Program,
): { years: YearPlan; requirements: RequirementBlock[] } {
  const plan: YearPlan = JSON.parse(JSON.stringify(EMPTY_YEAR_PLAN));
  const placed = new Set<string>();
  const requirements: RequirementBlock[] = [];

  const allRules = [...program.rules];
  if (concentrationId && program.concentrations) {
    const conc = program.concentrations.options.find(c => c.id === concentrationId);
    if (conc) allRules.push(...conc.adds_rules);
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
      for (let i = 0; i < select; i++) {
        const cid = pickDefaultCourse(rule.pool.slice(i));
        if (cid) {
          const c = catalog[cid];
          if (c) toPlace.push({ courseId: cid, level: getCourseLevel(c.number), terms: getValidTerms(c), prereqs: c.prerequisites });
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

  // Track per-year placement count for alternation
  const yearPlacementCount: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

  function countInSem(year: number, term: string): number {
    const yk: keyof YearPlan = `year${year}` as keyof YearPlan;
    return plan[yk][term as keyof typeof plan['year1']].length;
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

    // Find all valid candidates in the target year (and beyond if needed)
    let slot: { year: number; term: string } | null = null;

    for (let year = earliestYear; year <= 4; year++) {
      const candidates = TERM_ORDER
        .map((term, idx) => ({ term, idx }))
        .filter(({ idx }) => !(year === earliestYear && idx < earliestTermIdx))
        .filter(({ term }) => p.terms.includes(term))
        .map(({ term }) => ({ term, load: countInSem(year, term) }))
        .filter(c => c.load < MAX_COURSES_PER_SEMESTER);

      if (candidates.length > 0) {
        const minLoad = Math.min(...candidates.map(c => c.load));
        const tied = candidates.filter(c => c.load === minLoad);

        // Tie-breaker: alternate Fall/Spring based on how many placed in this year so far
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

    // Overflow: stuff it anywhere valid
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
  const reqRules: { rule_id: string; name: string; count: number; qualifying: string[] }[] = [];

  // Major rules
  for (const rule of allRules) {
    if (rule.type === 'minimum_attribute' && rule.attribute) {
      const min = rule.minimum_count || 1;
      const qualifying = getQualifyingCoursesForAttribute(catalog, rule.attribute);
      if (qualifying.length > 5) {
        for (let i = 0; i < min; i++) {
          reqRules.push({ rule_id: rule.id, name: rule.name || rule.attribute, count: min, qualifying });
        }
      }
    } else if (rule.type === 'minimum_level' && rule.level) {
      const min = rule.minimum_count || 1;
      const qualifying = getQualifyingCoursesForLevel(catalog, rule.level);
      if (qualifying.length > 5) {
        for (let i = 0; i < min; i++) {
          reqRules.push({ rule_id: rule.id, name: `${rule.level}-level course`, count: min, qualifying });
        }
      }
    }
  }

  // Graduation rules
  if (graduationProgram) {
    for (const rule of graduationProgram.rules) {
      if (rule.type === 'minimum_attribute' && rule.attribute) {
        const min = rule.minimum_count || 1;
        const qualifying = getQualifyingCoursesForAttribute(catalog, rule.attribute);
        if (qualifying.length > 5) {
          for (let i = 0; i < min; i++) {
            reqRules.push({ rule_id: rule.id, name: rule.name || rule.attribute, count: min, qualifying });
          }
        }
      }
    }
  }

  // Place requirement blocks evenly across Fall/Spring, skipping Jan Plan
  // Track how many reqs are already placed in each (year, term)
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
      // Jan Plan requirements go specifically into Jan Plan
      for (let year = 1; year <= 4; year++) {
        if (totalLoad(year, 'jan') < MAX_COURSES_PER_SEMESTER) {
          slot = { year, term: 'jan' };
          break;
        }
      }
    } else {
      // Prefer Fall/Spring, skip Jan Plan unless absolutely necessary
      const mainTerms = ['fall', 'spring'];
      for (let year = 1; year <= 4; year++) {
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

      // Overflow: try Jan Plan if Fall/Spring are full
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
