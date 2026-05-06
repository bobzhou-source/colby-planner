import { useState } from 'react';
import { useStore } from '../store';
import type { Rule, PoolItem, Course } from '../types';

function getCourseLevel(number: string): number {
  const match = number.match(/^(\d)/);
  return match ? parseInt(match[1]) : 1;
}

function filterToText(filter: Record<string, any>): string {
  const parts: string[] = [];
  if (filter.subject) parts.push(`${filter.subject} courses`);
  else if (filter.departments) parts.push(`${filter.departments.join(', ')} department courses`);
  else parts.push('Any courses');

  if (filter.level) {
    if (Array.isArray(filter.level)) parts.push(`at ${filter.level.join('/')} level`);
    else if (typeof filter.level === 'string') parts.push(`at ${filter.level}`);
    else parts.push(`at ${filter.level} level`);
  }
  if (filter.level_min && filter.level_max) {
    parts.push(`at ${filter.level_min}-${filter.level_max} level`);
  } else if (filter.level_min) {
    parts.push(`at ${filter.level_min}+ level`);
  } else if (filter.level_max) {
    parts.push(`at ${filter.level_max} or below`);
  }
  if (filter.type) {
    if (Array.isArray(filter.type)) parts.push(`(${filter.type.join(' or ')})`);
    else parts.push(`(${filter.type})`);
  }
  if (filter.attributes) parts.push(`with ${filter.attributes.join(', ')}`);
  if (filter.exclude_course_ids) parts.push(`(excluding ${filter.exclude_course_ids.join(', ')})`);
  if (filter.include_only_course_ids) parts.push(`(only ${filter.include_only_course_ids.join(', ')})`);
  if (filter.focus_areas) parts.push(`focused on ${filter.focus_areas.join(', ')}`);
  if (filter.medium) parts.push(`medium: ${filter.medium.join(', ')}`);
  if (filter.period) parts.push(`period: ${filter.period}`);
  if (filter.field) parts.push(`field: ${filter.field}`);
  if (filter.disciplines) parts.push(`disciplines: ${filter.disciplines.join(', ')}`);
  if (filter.approved_list) parts.push(`(approved list: ${filter.approved_list})`);

  return parts.join(' ');
}

function getQualifyingCourses(rule: Rule, catalogCourses: Record<string, Course>): string[] {
  if (rule.type === 'minimum_attribute' && rule.attribute) {
    const attr = rule.attribute;
    return Object.values(catalogCourses)
      .filter(c => c.distributions.includes(attr) || c.attributes.includes(attr))
      .map(c => c.id);
  }
  if (rule.type === 'minimum_level' && rule.level) {
    return Object.values(catalogCourses)
      .filter(c => getCourseLevel(c.number) >= rule.level!)
      .map(c => c.id);
  }
  return [];
}

function countSatisfied(rule: Rule, planCourseIds: Set<string>, catalogCourses: Record<string, Course>): { done: boolean; partial: boolean; count: string; isLimit: boolean } {
  if (rule.type === 'fixed') {
    const pool = rule.pool || [];
    const total = pool.length;
    const satisfied = pool.filter((item: PoolItem) => {
      if (item.type === 'course') return planCourseIds.has(item.course_id);
      return false;
    }).length;
    return { done: satisfied === total && total > 0, partial: satisfied > 0 && satisfied < total, count: `${satisfied}/${total}`, isLimit: false };
  }
  if (rule.type === 'choice' || rule.type === 'sequence_choice') {
    const select = rule.select || 1;
    const pool = rule.pool || [];
    const satisfied = pool.filter((item: PoolItem) => {
      if (item.type === 'course') return planCourseIds.has(item.course_id);
      if (item.type === 'sequence') return item.sequence.every((id: string) => planCourseIds.has(id));
      return false;
    }).length;
    return { done: satisfied >= select, partial: satisfied > 0 && satisfied < select, count: `${satisfied}/${select}`, isLimit: false };
  }
  if (rule.type === 'minimum_attribute') {
    const attr = rule.attribute || '';
    const min = rule.minimum_count || 0;
    const satisfied = Array.from(planCourseIds).filter(id => {
      const c = catalogCourses[id];
      return c?.attributes?.includes(attr) || c?.distributions?.includes(attr);
    }).length;
    return { done: satisfied >= min, partial: satisfied > 0 && satisfied < min, count: `${satisfied}/${min}`, isLimit: false };
  }
  if (rule.type === 'minimum_level') {
    const level = rule.level || 0;
    const min = rule.minimum_count || 0;
    const satisfied = Array.from(planCourseIds).filter(id => {
      const num = parseInt(catalogCourses[id]?.number);
      return num >= level;
    }).length;
    return { done: satisfied >= min, partial: satisfied > 0 && satisfied < min, count: `${satisfied}/${min}`, isLimit: false };
  }
  if (rule.type === 'limit') {
    return { done: true, partial: false, count: '', isLimit: true };
  }
  if (rule.type === 'distribution') {
    const select = rule.select || 0;
    return { done: false, partial: false, count: `0/${select}`, isLimit: false };
  }
  return { done: false, partial: false, count: '', isLimit: false };
}

function QualifyingCourseList({ rule, catalogCourses, planCourseIds }: {
  rule: Rule;
  catalogCourses: Record<string, Course>;
  planCourseIds: Set<string>;
}) {
  const [showAll, setShowAll] = useState(false);
  const qualifying = getQualifyingCourses(rule, catalogCourses);
  if (qualifying.length === 0) return null;

  const display = showAll ? qualifying : qualifying.slice(0, 5);
  const remaining = qualifying.length - display.length;

  return (
    <div className="px-3 pb-2.5 pl-10 space-y-1">
      {display.map(id => {
        const c = catalogCourses[id];
        const satisfied = planCourseIds.has(id);
        return (
          <div
            key={id}
            className={`text-[11px] ${satisfied ? 'text-green-700 font-medium' : 'text-gray-500'}`}
          >
            {satisfied ? '✓ ' : '○ '}
            {id} — {c?.title || 'Unknown'}
          </div>
        );
      })}
      {remaining > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
        >
          {showAll ? 'Show less' : `Show ${remaining} more`}
        </button>
      )}
    </div>
  );
}

function RuleList({ rules, planCourseIds, catalogCourses }: {
  rules: Rule[];
  planCourseIds: Set<string>;
  catalogCourses: Record<string, Course>;
}) {
  const [openRules, setOpenRules] = useState<Set<string>>(new Set());

  function toggleRule(id: string) {
    setOpenRules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {rules.map(rule => {
        const status = countSatisfied(rule, planCourseIds, catalogCourses);
        const isOpen = openRules.has(rule.id);
        const hasQualifying = ['minimum_attribute', 'minimum_level'].includes(rule.type);
        const hasPool = rule.pool && rule.pool.length > 0;
        const hasExplicitCourses = hasPool && rule.pool!.some((i: PoolItem) => i.type === 'course' || i.type === 'sequence');
        const hasFilters = hasPool && rule.pool!.some((i: PoolItem) => i.type === 'filter');

        if (status.isLimit) {
          return (
            <div key={rule.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-xs font-medium text-gray-600">{rule.name}</div>
              {rule.note && <div className="text-[11px] text-gray-400 mt-0.5">{rule.note}</div>}
            </div>
          );
        }

        return (
          <div
            key={rule.id}
            className={`rounded-lg border overflow-hidden transition-colors ${
              status.done
                ? 'border-green-300 bg-green-50'
                : status.partial
                ? 'border-amber-300 bg-amber-50'
                : 'border-gray-200'
            }`}
          >
            <button
              onClick={() => toggleRule(rule.id)}
              className="w-full px-3 py-2.5 flex items-center gap-2 text-left"
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] shrink-0 ${
                  status.done
                    ? 'bg-green-500 border-green-500 text-white'
                    : status.partial
                    ? 'border-amber-400 bg-amber-100'
                    : 'border-gray-300'
                }`}
              >
                {status.done ? '✓' : ''}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{rule.name}</div>
              </div>
              {status.count && (
                <div className="text-[11px] text-gray-400 font-medium">{status.count}</div>
              )}
            </button>

            {isOpen && (
              <div className="px-3 pb-2.5 pl-10 space-y-1">
                {/* Explicit courses/sequences */}
                {hasExplicitCourses && rule.pool!.map((item, i) => {
                  if (item.type === 'course') {
                    const course = catalogCourses[item.course_id];
                    const satisfied = planCourseIds.has(item.course_id);
                    return (
                      <div key={i} className={`text-[11px] ${satisfied ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                        {satisfied ? '✓ ' : '○ '}
                        {item.course_id} — {course?.title || 'Unknown'}
                      </div>
                    );
                  }
                  if (item.type === 'sequence') {
                    const allSat = item.sequence.every((id: string) => planCourseIds.has(id));
                    return (
                      <div key={i} className="text-[11px] text-gray-500">
                        {allSat ? '✓ ' : '○ '}
                        Sequence: {item.sequence.join(' → ')}
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Filter descriptions */}
                {hasFilters && rule.pool!.map((item, i) => {
                  if (item.type === 'filter') {
                    return (
                      <div key={i} className="text-[11px] text-gray-500 italic">
                        ○ Any course: {filterToText(item.filter)}
                      </div>
                    );
                  }
                  return null;
                })}

                {/* No pool at all — show note */}
                {!hasPool && rule.note && (
                  <div className="text-[11px] text-gray-500">{rule.note}</div>
                )}

                {/* Qualifying courses for min_attribute/min_level */}
                {hasQualifying && (
                  <QualifyingCourseList rule={rule} catalogCourses={catalogCourses} planCourseIds={planCourseIds} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function RequirementSidebar() {
  const { data, plans, activePlanIndex, toggleSidebar } = useStore();
  const [tab, setTab] = useState<'primary' | 'secondary' | 'graduation'>('primary');
  const plan = plans[activePlanIndex];
  if (!plan || !data) return null;

  const program = data.programs.find(p => p.id === plan.program_id);
  const secondary = plan.secondary_program_id ? data.programs.find(p => p.id === plan.secondary_program_id) : null;
  const graduation = data.programs.find(p => p.id === 'colby_graduation');

  // Gather all course IDs from plan
  const planCourseIds = new Set<string>();
  Object.values(plan.years).forEach(year => {
    year.fall.forEach((id: string) => planCourseIds.add(id));
    year.jan.forEach((id: string) => planCourseIds.add(id));
    year.spring.forEach((id: string) => planCourseIds.add(id));
  });

  const primaryRules = program ? [...program.rules] : [];
  if (plan.concentration_id && program?.concentrations) {
    const conc = program.concentrations.options.find(c => c.id === plan.concentration_id);
    if (conc) primaryRules.push(...conc.adds_rules);
  }

  const secondaryRules = secondary ? [...secondary.rules] : [];

  const tabs: { key: 'primary' | 'secondary' | 'graduation'; label: string; enabled: boolean }[] = [
    { key: 'primary', label: program?.name?.replace(/ Major| Minor/g, '') || 'Major', enabled: !!program },
    { key: 'secondary', label: secondary?.name?.replace(/ Major| Minor/g, '') || '2nd Program', enabled: !!secondary },
    { key: 'graduation', label: 'Graduation', enabled: !!graduation },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Requirements</span>
        <button onClick={toggleSidebar} className="text-gray-400 hover:text-gray-600 text-xs">←</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {tabs.filter(t => t.enabled).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-xs font-semibold text-center transition-colors truncate px-1 ${
              tab === t.key
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'primary' && program && (
          <RuleList rules={primaryRules} planCourseIds={planCourseIds} catalogCourses={data.catalog.courses} />
        )}
        {tab === 'secondary' && secondary && (
          <RuleList rules={secondaryRules} planCourseIds={planCourseIds} catalogCourses={data.catalog.courses} />
        )}
        {tab === 'graduation' && graduation && (
          <RuleList rules={graduation.rules} planCourseIds={planCourseIds} catalogCourses={data.catalog.courses} />
        )}
      </div>
    </aside>
  );
}
