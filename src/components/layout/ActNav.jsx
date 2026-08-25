import { nav } from '../../data/content';

/** 우측 고정 인디케이터. 현재 막을 표시하고, 누르면 그 막으로 이동한다. */
export function ActNav({ active }) {
  const go = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      aria-label={nav.label}
      className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 sm:block"
    >
      <ul className="flex flex-col items-end gap-5">
        {nav.items.map((item, i) => {
          const isActive = i === active;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => go(item.id)}
                aria-current={isActive ? 'true' : undefined}
                className="group flex items-center gap-2.5 py-1 pl-3 pr-1"
              >
                <span
                  className={`text-[11px] tracking-wide transition-opacity duration-500 ${
                    isActive ? 'text-soft opacity-100' : 'text-faint opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`block rounded-full transition-all duration-500 ${
                    isActive
                      ? 'h-2.5 w-2.5 bg-accent'
                      : 'h-1.5 w-1.5 bg-current opacity-30 group-hover:opacity-60'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default ActNav;
