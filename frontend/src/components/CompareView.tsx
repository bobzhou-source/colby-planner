import { useStore } from '../store';

export default function CompareView() {
  const { data, plans } = useStore();
  if (!data || plans.length < 2) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-4xl mb-3">📊</div>
        <div className="font-semibold mb-1">Need at least 2 plans to compare</div>
        <div className="text-sm">Click the + button next to your plan tabs to create a "What If?" plan.</div>
      </div>
    );
  }

  const [planA, planB] = [plans[0], plans[1]];
  const progA = data.programs.find(p => p.id === planA.program_id);
  const progB = data.programs.find(p => p.id === planB.program_id);

  function getAllCourses(plan: typeof planA) {
    const set = new Set<string>();
    Object.values(plan.years).forEach(y => {
      y.fall.forEach((id: string) => set.add(id));
      y.jan.forEach((id: string) => set.add(id));
      y.spring.forEach((id: string) => set.add(id));
    });
    return set;
  }

  const coursesA = getAllCourses(planA);
  const coursesB = getAllCourses(planB);
  const shared = Array.from(coursesA).filter(id => coursesB.has(id));
  const onlyA = Array.from(coursesA).filter(id => !coursesB.has(id));
  const onlyB = Array.from(coursesB).filter(id => !coursesA.has(id));

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold mb-1">Compare Plans</h2>
        <p className="text-sm text-gray-500">See what changes between your paths.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Plan A */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
            <div className="font-bold">{planA.name}: {progA?.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{coursesA.size} courses planned</div>
          </div>
          <div className="p-4 space-y-4">
            {shared.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Shared</div>
                <div className="space-y-1.5">
                  {shared.map(id => {
                    const c = data.catalog.courses[id];
                    return (
                      <div key={id} className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                        <span className="text-green-600">✓</span>
                        <span className="font-medium">{id}</span>
                        <span className="text-gray-500 text-xs truncate flex-1">{c?.title}</span>
                        <span className="text-green-700 text-[10px] font-bold uppercase bg-green-100 px-2 py-0.5 rounded-full">Both</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {onlyA.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Only in {planA.name}</div>
                <div className="space-y-1.5">
                  {onlyA.map(id => {
                    const c = data.catalog.courses[id];
                    return (
                      <div key={id} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <span className="font-medium">{id}</span>
                        <span className="text-gray-500 text-xs truncate flex-1">{c?.title}</span>
                        <span className="text-blue-700 text-[10px] font-bold uppercase bg-blue-100 px-2 py-0.5 rounded-full">A</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Plan B */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
            <div className="font-bold">{planB.name}: {progB?.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{coursesB.size} courses planned</div>
          </div>
          <div className="p-4 space-y-4">
            {shared.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Shared</div>
                <div className="space-y-1.5">
                  {shared.map(id => {
                    const c = data.catalog.courses[id];
                    return (
                      <div key={id} className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                        <span className="text-green-600">✓</span>
                        <span className="font-medium">{id}</span>
                        <span className="text-gray-500 text-xs truncate flex-1">{c?.title}</span>
                        <span className="text-green-700 text-[10px] font-bold uppercase bg-green-100 px-2 py-0.5 rounded-full">Both</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {onlyB.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Only in {planB.name}</div>
                <div className="space-y-1.5">
                  {onlyB.map(id => {
                    const c = data.catalog.courses[id];
                    return (
                      <div key={id} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                        <span className="font-medium">{id}</span>
                        <span className="text-gray-500 text-xs truncate flex-1">{c?.title}</span>
                        <span className="text-amber-700 text-[10px] font-bold uppercase bg-amber-100 px-2 py-0.5 rounded-full">B</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
