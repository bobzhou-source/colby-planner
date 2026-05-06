import { useStore } from '../store';
import CoursePill from './CoursePill';
import RequirementBlockPill from './RequirementBlockPill';

const YEAR_LABELS = [
  { label: 'Freshman Year', icon: '🎓' },
  { label: 'Sophomore Year', icon: '📚' },
  { label: 'Junior Year', icon: '🔬' },
  { label: 'Senior Year', icon: '🎓' },
];

const TERM_NAMES: Record<string, string> = {
  fall: 'Fall',
  jan: 'Jan Plan',
  spring: 'Spring',
};

export default function SemesterGrid() {
  const { data, plans, activePlanIndex, updatePlan, openSearch } = useStore();
  const plan = plans[activePlanIndex];
  if (!plan || !data) return null;

  function removeCourse(yearKey: string, term: string, courseId: string) {
    updatePlan(activePlanIndex, p => {
      const years = { ...p.years };
      const y = { ...years[yearKey as keyof typeof years] } as Record<string, string[]>;
      y[term] = y[term].filter(id => id !== courseId);
      years[yearKey as keyof typeof years] = y;
      return { ...p, years };
    });
  }

  function removeRequirement(reqId: string) {
    updatePlan(activePlanIndex, p => ({
      ...p,
      requirements: p.requirements.filter(r => r.id !== reqId),
    }));
  }

  function getCredits(yearKey: string, term: string): number {
    const y = plan.years[yearKey as keyof typeof plan.years] as Record<string, string[]>;
    return y[term].reduce((sum, id) => sum + (data.catalog.courses[id]?.credits || 0), 0);
  }

  return (
    <div className="space-y-5 pb-20">
      {(['year1', 'year2', 'year3', 'year4'] as const).map((yearKey, yi) => (
        <div key={yearKey}>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-2">
            <span>{YEAR_LABELS[yi].icon}</span>
            <span>{YEAR_LABELS[yi].label}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['fall', 'jan', 'spring'] as const).map(term => {
              const y = plan.years[yearKey] as Record<string, string[]>;
              const courses = y[term];
              const credits = getCredits(yearKey, term);
              const isNormalLoad = credits >= 12 && credits <= 18;
              const reqs = plan.requirements.filter(r => r.year === yi + 1 && r.term === term);

              return (
                <div
                  key={term}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors"
                >
                  <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase">{TERM_NAMES[term]}</span>
                    <span className={`text-xs font-semibold ${isNormalLoad ? 'text-green-600' : credits > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {credits} cr
                    </span>
                  </div>
                  <div className="p-2 space-y-1.5 min-h-[80px]">
                    {courses.map(courseId => (
                      <CoursePill
                        key={courseId}
                        courseId={courseId}
                        course={data.catalog.courses[courseId]}
                        onRemove={() => removeCourse(yearKey, term, courseId)}
                      />
                    ))}
                    {reqs.map(req => (
                      <RequirementBlockPill
                        key={req.id}
                        block={req}
                        catalog={data.catalog.courses}
                        onRemove={() => removeRequirement(req.id)}
                        onClick={() => openSearch({ year: yearKey, term })}
                      />
                    ))}
                    <button
                      onClick={() => openSearch({ year: yearKey, term })}
                      className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      + Add course
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
