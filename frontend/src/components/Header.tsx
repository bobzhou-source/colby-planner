import { useStore } from '../store';
import { encodePlan } from '../utils/planEncoder';
import { autoPopulatePlan } from '../utils/autoPopulate';

export default function Header() {
  const { data, plans, activePlanIndex, toggleSearch, toggleCompare, compareMode } = useStore();
  const plan = plans[activePlanIndex];
  const program = data?.programs.find(p => p.id === plan?.program_id);

  const totalCredits = plan ? Object.values(plan.years).reduce((sum, year) => {
    const allCourses = [...year.fall, ...year.jan, ...year.spring];
    return sum + allCourses.reduce((c, id) => {
      const course = data?.catalog.courses[id];
      return c + (course?.credits || 0);
    }, 0);
  }, 0) : 0;

  const target = program?.total.count || 0;
  const unit = program?.total.unit === 'credit_hours' ? 'cr' : 'courses';
  const progress = target > 0 ? Math.min(100, (totalCredits / target) * 100) : 0;

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
        <select
          className="text-sm font-medium bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500"
          value={program.id}
          onChange={(e) => {
            const pid = e.target.value;
            const program = data?.programs.find(p => p.id === pid);
            if (!program || !data) return;
            const graduation = data.programs.find(p => p.id === 'colby_graduation');
            const result = autoPopulatePlan(program, data.catalog.courses, undefined, graduation);
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
      )}

      <div className="flex-1 flex items-center gap-3 min-w-0">
        <div className="flex-1 max-w-xs h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
          {totalCredits} / {target} {unit}
        </span>
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
