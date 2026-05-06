import { useState, useMemo, useEffect } from 'react';
import Fuse from 'fuse.js';
import { useStore } from '../store';

export default function SearchDrawer() {
  const { data, searchOpen, toggleSearch, plans, activePlanIndex, updatePlan, searchTarget } = useStore();
  const [query, setQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(searchTarget.year);
  const [selectedTerm, setSelectedTerm] = useState(searchTarget.term);

  useEffect(() => {
    setSelectedYear(searchTarget.year);
    setSelectedTerm(searchTarget.term);
  }, [searchTarget]);

  const plan = plans[activePlanIndex];

  const fuse = useMemo(() => {
    if (!data) return null;
    const courses = Object.values(data.catalog.courses).filter(c => c.status !== 'catalog_only');
    return new Fuse(courses, {
      keys: ['id', 'title', 'subject', 'department'],
      threshold: 0.3,
    });
  }, [data]);

  const results = useMemo(() => {
    if (!fuse || !query.trim()) return [];
    return fuse.search(query).slice(0, 12);
  }, [fuse, query]);

  function addCourse(courseId: string) {
    if (!plan) return;
    updatePlan(activePlanIndex, p => {
      const years = { ...p.years };
      const y = { ...years[selectedYear as keyof typeof years] } as Record<string, string[]>;
      if (!y[selectedTerm].includes(courseId)) {
        y[selectedTerm] = [...y[selectedTerm], courseId];
      }
      years[selectedYear as keyof typeof years] = y;
      return { ...p, years };
    });
  }

  if (!data) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
        searchOpen ? 'translate-y-0' : 'translate-y-[calc(100%-56px)]'
      }`}
      style={{ maxHeight: '50vh' }}
    >
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <input
          autoFocus={searchOpen}
          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500"
          placeholder="Search courses... (e.g. BI 279, genetics)"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="flex gap-1">
          {[
            { key: 'year1', label: 'Y1' },
            { key: 'year2', label: 'Y2' },
            { key: 'year3', label: 'Y3' },
            { key: 'year4', label: 'Y4' },
          ].map(y => (
            <button
              key={y.key}
              onClick={() => setSelectedYear(y.key)}
              className={`px-2 py-1 rounded text-xs font-medium ${
                selectedYear === y.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {y.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[
            { key: 'fall', label: 'F' },
            { key: 'jan', label: 'J' },
            { key: 'spring', label: 'S' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setSelectedTerm(t.key)}
              className={`px-2 py-1 rounded text-xs font-medium ${
                selectedTerm === t.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={toggleSearch} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {query.trim() === '' && (
          <div className="col-span-full text-center text-sm text-gray-400 py-8">
            Type to search courses...
          </div>
        )}
        {results.map(({ item }) => (
          <button
            key={item.id}
            onClick={() => addCourse(item.id)}
            className="text-left p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-bold">{item.id}</span>
              <span className="text-xs text-gray-400">{item.credits} cr</span>
            </div>
            <div className="text-xs text-gray-600 line-clamp-2">{item.title}</div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {item.offered_terms.map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 bg-white rounded text-gray-500 border border-gray-200">
                  {t}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
