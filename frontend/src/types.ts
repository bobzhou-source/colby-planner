export interface Course {
  id: string;
  subject: string;
  number: string;
  title: string;
  credits: number;
  prerequisites: string[];
  attributes: string[];
  distributions: string[];
  offered_terms: string[];
  status: string;
  department: string;
  instructional_format: string;
}

export interface CourseFilter {
  subjects?: string[];
  departments?: string[];
  level_min?: number;
  level_max?: number;
  attributes?: string[];
  focus_areas?: string[];
  exclude_course_ids?: string[];
  include_only_course_ids?: string[];
}

export interface PoolItemCourse {
  type: 'course';
  course_id: string;
  equivalent_allowed?: boolean;
  equivalent_note?: string;
}

export interface PoolItemFilter {
  type: 'filter';
  filter: CourseFilter;
}

export interface PoolItemSequence {
  type: 'sequence';
  name?: string;
  sequence: string[];
}

export type PoolItem = PoolItemCourse | PoolItemFilter | PoolItemSequence;

export interface Rule {
  id: string;
  name: string;
  description?: string;
  type: 'fixed' | 'choice' | 'sequence_choice' | 'minimum_attribute' | 'minimum_level' | 'limit' | 'distribution';
  select?: number;
  pool?: PoolItem[];
  minimum_count?: number;
  attribute?: string;
  level?: number;
  draw_from?: 'all_courses_toward_major' | 'program_pool' | 'prior_rules';
  maximum_count?: number;
  maximum_credits?: number;
  allow_double_dipping?: boolean;
  note?: string;
}

export interface Concentration {
  id: string;
  name: string;
  description?: string;
  adds_rules: Rule[];
  note?: string;
}

export interface Program {
  id: string;
  name: string;
  degree_type: 'major' | 'minor';
  total: {
    count: number;
    unit: 'credit_hours' | 'courses';
  };
  grade_policy?: {
    minimum_grade?: string;
    satisfactory_unsatisfactory_allowed?: boolean;
    applies_to?: string;
  };
  rules: Rule[];
  concentrations?: {
    selection_mode: 'pick_one' | 'pick_many' | 'none';
    options: Concentration[];
  };
  note?: string;
}

export interface Catalog {
  courses: Record<string, Course>;
}

export interface AppData {
  catalog: Catalog;
  programs: Program[];
}

export interface SemesterCourses {
  fall: string[];
  jan: string[];
  spring: string[];
  [key: string]: string[];
}

export interface YearPlan {
  year1: SemesterCourses;
  year2: SemesterCourses;
  year3: SemesterCourses;
  year4: SemesterCourses;
}

export interface RequirementBlock {
  id: string;
  rule_id: string;
  name: string;
  description?: string;
  year: number;
  term: string;
  qualifying_courses: string[];
}

export interface Plan {
  id: string;
  name: string;
  program_id: string;
  concentration_id?: string;
  years: YearPlan;
  requirements: RequirementBlock[];
}

export const EMPTY_SEMESTER: SemesterCourses = { fall: [], jan: [], spring: [] };

export const EMPTY_YEAR_PLAN: YearPlan = {
  year1: { fall: [], jan: [], spring: [] },
  year2: { fall: [], jan: [], spring: [] },
  year3: { fall: [], jan: [], spring: [] },
  year4: { fall: [], jan: [], spring: [] },
};

export function createEmptyPlan(name: string, program_id: string): Plan {
  return {
    id: crypto.randomUUID(),
    name,
    program_id,
    years: JSON.parse(JSON.stringify(EMPTY_YEAR_PLAN)),
    requirements: [],
  };
}
