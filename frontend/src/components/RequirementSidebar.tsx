import { useState } from 'react';
import { useStore } from '../store';
import type { Rule, PoolItem } from '../types';

function countSatisfied(rule: Rule, planCourseIds: Set<string>, catalogCourses: Record<string, any>): { done: boolean; partial: boolean; count: string } {
  if (rule.type === 'fixed') {
    const pool = rule.pool || [];
    const total = pool.length;
    const satisfied = pool.filter((item: PoolItem) => {
      if (item.type === 'course') return planCourseIds.has(item.course_id);
      return false;
    }).length;
    return { done: satisfied === total && total > 0, partial: satisfied > 0 && satisfied < total, count: `${satisfied}/${total}` };
  }
  if (rule.type === 'choice' || rule.type === 'sequence_choice') {
    const select = rule.select || 1;
    const pool = rule.pool || [];
    const satisfied = pool.filter((item: PoolItem) => {
      if (item.type === 'course') return planCourseIds.has(item.course_id);
      if (item.type === 'sequence') return item.sequence.every(id => planCourseIds.has(id));
      return false;
    }).length;
    return { done: satisfied >= select, partial: satisfied > 0 && satisfied < select, count: `${satisfied}/${select}` };
  }
  if (rule.type === 'minimum_attribute') {
    const attr = rule.attribute || '';
    const min = rule.minimum_count || 0;
    const satisfied = Array.from(planCourseIds).filter(id => {
      const c = catalogCourses[id];
      return c?.attributes?.includes(attr) || c?.distributions?.includes(attr);
    }).length;
    return { done: satisfied >= min, partial: satisfied > 0 && satisfied < min, count: `${satisfied}/${min}` };
  }
  if (rule.type === 'minimum_level') {
    const level = rule.level || 0;
    const min = rule.minimum_count || 0;
    const satisfied = Array.from(planCourseIds).filter(id => {
      const num = parseInt(catalogCourses[id]?.number);
      return num >= level;
    }).length;
    return { done: satisfied >= min, partial: satisfied > 0 && satisfied < min, count: `${satisfied}/${min}` };
  }
  return { done: false, partial: false, count: '' };
}

function RuleList({ rules, planCourseIds, catalogCourses }: {
  rules: Rule[];
  planCourseIds: Set<string>;
  catalogCourses: Record<string, any>;
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

            {isOpen && rule.pool && rule.pool.length > 0 && (
              <div className="px-3 pb-2.5 pl-10 space-y-1">
                {rule.pool.map((item, i) => {
                  if (item.type === 'course') {
                    const course = catalogCourses[item.course_id];
                    const satisfied = planCourseIds.has(item.course_id);
                    return (
                      <div
                        key={i}
                        className={`text-[11px] ${satisfied ? 'text-green-700 font-medium' : 'text-gray-500'}`}
                      >
                        {satisfied ? '✓ ' : '○ '}
                        {item.course_id} — {course?.title || 'Unknown'}
                      </div>
                    );
                  }
                  if (item.type === 'sequence') {
                    const allSat = item.sequence.every(id => planCourseIds.has(id));
                    return (
                      <div key={i} className="text-[11px] text-gray-500">
                        {allSat ? '✓ ' : '○ '}
                        Sequence: {item.sequence.join(' → ')}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}

            {isOpen && rule.note && !rule.pool?.length && (
              <div className="px-3 pb-2.5 pl-10 text-[11px] text-gray-500">
                {rule.note}
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
  const [tab, setTab] = useState<'major' | 'graduation'>('major');
  const plan = plans[activePlanIndex];
  if (!plan || !data) return null;

  const program = data.programs.find(p => p.id === plan.program_id);
  const graduation = data.programs.find(p => p.id === 'colby_graduation');

  // Gather all course IDs from plan
  const planCourseIds = new Set<string>();
  Object.values(plan.years).forEach(year => {
    year.fall.forEach((id: string) => planCourseIds.add(id));
    year.jan.forEach((id: string) => planCourseIds.add(id));
    year.spring.forEach((id: string) => planCourseIds.add(id));
  });

  const majorRules = program ? [...program.rules] : [];
  if (plan.concentration_id && program?.concentrations) {
    const conc = program.concentrations.options.find(c => c.id === plan.concentration_id);
    if (conc) majorRules.push(...conc.adds_rules);
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Requirements</span>
        <button onClick={toggleSidebar} className="text-gray-400 hover:text-gray-600 text-xs">←</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab('major')}
          className={`flex-1 py-2 text-xs font-semibold text-center transition-colors ${
            tab === 'major'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Major
        </button>
        <button
          onClick={() => setTab('graduation')}
          className={`flex-1 py-2 text-xs font-semibold text-center transition-colors ${
            tab === 'graduation'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Graduation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'major' && program && (
          <RuleList rules={majorRules} planCourseIds={planCourseIds} catalogCourses={data.catalog.courses} />
        )}
        {tab === 'graduation' && graduation && (
          <RuleList rules={graduation.rules} planCourseIds={planCourseIds} catalogCourses={data.catalog.courses} />
        )}
      </div>
    </aside>
  );
}
