import { useState, useMemo, useEffect } from 'react';
import Fuse from 'fuse.js';
import { useStore } from '../store';
import type { Course } from '../types';

function SearchResultCard({ course, onAdd }: { course: Course; onAdd: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onAdd}
        className="w-full text-left p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
      >
        <div className="flex justify-between items-start mb-1">
          <span className="text-sm font-bold">{course.id}</span>
          <span className="text-xs text-gray-400">{course.credits} cr</span>
        </div>
        <div className="text-xs text-gray-600 line-clamp-2">{course.title}</div>
        <div className="flex gap-1 mt-2 flex-wrap">
          {course.offered_terms.map(t => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-white rounded text-gray-500 border border-gray-200">
              {t}
            </span>
          ))}
        </div>
      </button>

      {hovered && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
          <div className="font-bold mb-1">{course.id} — {course.title}</div>
          {course.prerequisites.length > 0 && (
            <div className="text-gray-600 mb-1">Prereqs: {course.prerequisites.join(', ')}</div>
          )}
          {course.distributions.length > 0 && (
            <div className="text-gray-600 mb-1">Fulfills: {course.distributions.join(', ')}</div>
          )}
          <div className="text-gray-500">Typically offered: {course.offered_terms.join(', ')}</div>
        </div>
      )}
    </div>
  );
}

export default function SearchDrawer() {
  const { data, searchOpen, toggleSearch, plans, activePlanIndex, updatePlan, searchTarget, searchFilter } = useStore();
  const [query, setQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(searchTarget.year);
  const [selectedTerm, setSelectedTerm] = useState(searchTarget.term);

  useEffect(() => {
    setSelectedYear(searchTarget.year);
    setSelectedTerm(searchTarget.term);
  }, [searchTarget]);

  const plan = plans[activePlanIndex];

  const baseCourses = useMemo(() => {
    if (!data) return [];
    let courses = Object.values(data.catalog.courses).filter(c => c.status !== 'catalog_only');
    if (searchFilter && searchFilter.length > 0) {
      const filterSet = new Set(searchFilter);
      courses = courses.filter(c => filterSet.has(c.id));
    }
    return courses;
  }, [data, searchFilter]);

  const fuse = useMemo(() => {
    if (baseCourses.length === 0) return null;
    return new Fuse(baseCourses, {
      keys: ['id', 'title', 'subject', 'department'],
      threshold: 0.3,
    });
  }, [baseCourses]);

  const results = useMemo(() => {
    if (searchFilter && searchFilter.length > 0 && !query.trim()) {
      return baseCourses.slice(0, 12).map(item => ({ item }));
    }
    if (!fuse || !query.trim()) return [];
    return fuse.search(query).slice(0, 12);
  }, [fuse, query, searchFilter, baseCourses]);

  function addCourse(courseId: string) {
    if (!plan) return;
    updatePlan(activePlanIndex, p => {
      const years = { ...p.years };
      const y = { ...years[selectedYear as keyof typeof years] };
      if (!(y as any)[selectedTerm].includes(courseId)) {
        (y as any)[selectedTerm] = [...(y as any)[selectedTerm], courseId];
      }
      years[selectedYear as keyof typeof years] = y as any;
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
        {results.length === 0 && query.trim() === '' && !searchFilter && (
          <div className="col-span-full text-center text-sm text-gray-400 py-8">
            Type to search courses...
          </div>
        )}
        {results.length === 0 && query.trim() !== '' && (
          <div className="col-span-full text-center text-sm text-gray-400 py-8">
            No courses found
          </div>
        )}
        {results.map(({ item }) => (
          <SearchResultCard key={item.id} course={item} onAdd={() => addCourse(item.id)} />
        ))}
      </div>
    </div>
  );
}
