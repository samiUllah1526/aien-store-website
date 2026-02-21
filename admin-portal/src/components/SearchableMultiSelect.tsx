import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../hooks/useDebounce';

export interface SearchableMultiSelectOption {
  id: string;
  label: string;
}

export interface SearchableMultiSelectProps {
  label: string;
  placeholder?: string;
  emptyMessage?: string;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  /** Returns items for the given search and page. Page 1-based. hasMore = true if more pages exist. */
  fetchItems: (params: {
    search: string;
    page: number;
  }) => Promise<{ items: SearchableMultiSelectOption[]; hasMore: boolean }>;
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400';

export function SearchableMultiSelect({
  label,
  placeholder = 'Search…',
  emptyMessage = 'No options',
  selectedIds,
  onSelectedIdsChange,
  fetchItems,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [items, setItems] = useState<SearchableMultiSelectOption[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchInput.trim(), 300);

  const loadPage = async (search: string, pageNum: number, append: boolean) => {
    const setter = pageNum === 1 ? setLoading : setLoadMoreLoading;
    setter(true);
    try {
      const result = await fetchItems({ search, page: pageNum });
      setItems((prev) => (append ? [...prev, ...result.items] : result.items));
      setHasMore(result.hasMore);
      setPage(pageNum);
    } catch {
      if (!append) setItems([]);
    } finally {
      setter(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadPage(debouncedSearch, 1, false);
  }, [open, debouncedSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLoadMore = () => {
    if (!loading && !loadMoreLoading && hasMore) {
      loadPage(debouncedSearch, page + 1, true);
    }
  };

  const toggle = (id: string) => {
    onSelectedIdsChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${inputClass} w-full text-left flex items-center justify-between`}
      >
        <span className="truncate">
          {selectedIds.length === 0 ? 'Select…' : `${selectedIds.length} selected`}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-300 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
          <div className="border-b border-slate-200 p-2 dark:border-slate-700">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={placeholder}
              className={`${inputClass} text-sm`}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {loading ? (
              <p className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {emptyMessage}
              </p>
            ) : (
              <>
                {items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggle(item.id)}
                      className="rounded border-slate-300 text-slate-800 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-700"
                    />
                    <span className="text-sm text-slate-900 dark:text-slate-100 truncate">
                      {item.label}
                    </span>
                  </label>
                ))}
                {hasMore && (
                  <div ref={listEndRef} className="px-3 pb-2">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadMoreLoading}
                      className="w-full rounded border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {loadMoreLoading ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
