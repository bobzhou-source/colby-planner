import { useStore } from '../store';
import { encodePlan } from '../utils/planEncoder';
import { autoPopulatePlan } from '../utils/autoPopulate';

export default function Header() {
  const { data, plans, activePlanIndex, toggleSearch, toggleCompare, compareMode } = useStore();
  const plan = plans[activePlanIndex];
  const program = data?.programs.find(p => p.id === plan?.program_id);
  const secondary = plan?.secondary_program_id ? data?.programs.find(p => p.id === plan.secondary_program_id) : null;

  const totalCourses = plan ? Object.values(plan.years).reduce((sum, year) => {
    return sum + year.fall.length + year.jan.length + year.spring.length;
  }, 0) : 0;
  const totalCredits = plan ? Object.values(plan.years).reduce((sum, year) => {
    const allCourses = [...year.fall, ...year.jan, ...year.spring];
    return sum + allCourses.reduce((c, id) => c + (data?.catalog.courses[id]?.credits || 0), 0);
  }, 0) : 0;

  const primaryUnit = program?.total.unit;
  const primaryTarget = program?.total.count || 0;
  const primaryProgress = primaryTarget > 0 && primaryUnit === 'credit_hours'
    ? Math.min(100, (totalCredits / primaryTarget) * 100)
    : primaryTarget > 0 && primaryUnit === 'courses'
    ? Math.min(100, (totalCourses / primaryTarget) * 100)
    : 0;

  const secUnit = secondary?.total.unit;
  const secTarget = secondary?.total.count || 0;
  const secProgress = secTarget > 0 && secUnit === 'credit_hours'
    ? Math.min(100, (totalCredits / secTarget) * 100)
    : secTarget > 0 && secUnit === 'courses'
    ? Math.min(100, (totalCourses / secTarget) * 100)
    : 0;

  function handleShare() {
    if (!plan) return;
    const hash = encodePlan(plan);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Plan link copied to clipboard!');
    });
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 shrink-0 z-10">
      <div className="font-extrabold text-lg tracking-tight whitespace-nowrap">
        Colby <span className="text-blue-600">Pathfinder</span>
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {program && (
        <div className="flex items-center gap-1">
          <select
            className="text-sm font-medium bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500"
            value={program.id}
            onChange={(e) => {
              if (!data) return;
              const pid = e.target.value;
              const newProgram = data.programs.find(p => p.id === pid);
              if (!newProgram) return;
              const graduation = data.programs.find(p => p.id === 'colby_graduation');
              const sec = plan?.secondary_program_id ? data.programs.find(p => p.id === plan.secondary_program_id) : undefined;
              const result = autoPopulatePlan(newProgram, data.catalog.courses, undefined, graduation, sec);
              useStore.getState().updatePlan(activePlanIndex, p => ({
                ...p,
                program_id: pid,
                concentration_id: undefined,
                years: result.years,
                requirements: result.requirements,
              }));
            }}
          >
            {data?.programs
            .filter(p => p.degree_type === 'major')
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {secondary && (
            <>
              <span className="text-xs text-gray-400">+</span>
              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">{secondary.name}</span>
            </>
          )}
        </div>
      )}

      <div className="flex-1 flex items-center gap-3 min-w-0">
        {/* Primary program progress */}
        <div className="flex-1 max-w-[140px]">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-gray-400 truncate">{program?.name?.replace(/ Major| Minor/g, '')}</span>
            <span className="text-[10px] text-gray-500">
              {primaryUnit === 'credit_hours' ? `${Math.round(totalCredits)}/${primaryTarget} cr` : `${totalCourses}/${primaryTarget}`}
            </span>
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${primaryProgress}%` }} />
          </div>
        </div>

        {/* Secondary program progress */}
        {secondary && (
          <div className="flex-1 max-w-[140px]">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-gray-400 truncate">{secondary.name?.replace(/ Major| Minor/g, '')}</span>
              <span className="text-[10px] text-gray-500">
                {secUnit === 'credit_hours' ? `${Math.round(totalCredits)}/${secTarget} cr` : `${totalCourses}/${secTarget}`}
              </span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${secProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleSearch}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          🔍 Search
        </button>
        <button
          onClick={toggleCompare}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
            compareMode
              ? 'bg-blue-50 text-blue-700 border-blue-300'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {compareMode ? 'Back to Plan' : 'Compare'}
        </button>
        <button
          onClick={handleShare}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Share
        </button>
      </div>
    </header>
  );
}
