/**
 * Tab list used inside the category create/edit modal. Each tab can show a small
 * red dot when the corresponding form section has validation errors, so the user
 * can find what to fix without opening every panel.
 *
 * The component is intentionally decoupled from `react-hook-form`: it accepts a
 * pre-computed `hasErrors` map keyed by tab id rather than the whole form state.
 * That keeps it reusable from any future form that wants the same pattern.
 *
 * Panel ids follow the convention `cat-panel-<id>`; the matching panels live in
 * `CategoriesManager.tsx`.
 */

export type CategoryTab = 'basics' | 'content' | 'placement' | 'products';

interface TabDef {
  id: CategoryTab;
  label: string;
}

const TABS: ReadonlyArray<TabDef> = [
  { id: 'basics', label: 'Basics' },
  { id: 'content', label: 'Content' },
  { id: 'placement', label: 'Placement' },
  { id: 'products', label: 'Products' },
];

interface CategoryTabsProps {
  activeTab: CategoryTab;
  onTabChange: (tab: CategoryTab) => void;
  /** Per-tab error indicator. True renders a small red dot next to the label. */
  hasErrors: Record<CategoryTab, boolean>;
}

export function CategoryTabs({ activeTab, onTabChange, hasErrors }: CategoryTabsProps) {
  return (
    <div
      className="mb-4 border-b border-slate-200 dark:border-slate-700"
      role="tablist"
      aria-label="Category form sections"
    >
      <div className="-mb-px flex flex-wrap gap-x-4">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`cat-tab-${t.id}`}
              aria-selected={active}
              aria-controls={`cat-panel-${t.id}`}
              onClick={() => onTabChange(t.id)}
              className={`relative flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                active
                  ? 'border-slate-800 text-slate-900 dark:border-slate-200 dark:text-slate-100'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
              {hasErrors[t.id] && (
                <span
                  aria-label="has errors"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-red-500"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
